// Cliente Zoho (Books, CRM, Projects) somente leitura, no servidor. OAuth "server-based":
// client id/secret nos segredos do Supabase; refresh token na tabela `integracoes` (RLS sem
// policies). Nenhum token sai para o navegador. Timeouts curtos e erros sem vazar detalhes.
import { HttpError, servico, URL_BASE } from "./banco.ts";

export const ORG_BOOKS = "782439572"; // VOICE AMBIENTES INTELIGENTES (Zoho Books)
export const PORTAL_PROJECTS = "776190049";
export const RETORNO = `${URL_BASE}/functions/v1/zoho/retorno`;
export const ESCOPOS = [
  "ZohoBooks.invoices.READ", "ZohoBooks.estimates.READ", "ZohoBooks.settings.READ", "ZohoBooks.contacts.READ",
  "ZohoCRM.modules.deals.READ", "ZohoCRM.modules.leads.READ", "ZohoCRM.modules.contacts.READ", "ZohoCRM.settings.fields.READ",
  "ZohoProjects.portals.READ", "ZohoProjects.projects.READ", "ZohoProjects.tasks.READ",
].join(",");

const CLIENT_ID = () => Deno.env.get("ZOHO_CLIENT_ID") ?? "";
const CLIENT_SECRET = () => Deno.env.get("ZOHO_CLIENT_SECRET") ?? "";
// So servidores oficiais do Zoho: impede que um retorno forjado mande o segredo para outro host.
const ACCOUNTS_RE = /^https:\/\/accounts\.zoho\.(com|eu|in|com\.au|jp|com\.cn|sa|ca|uk)$/;
const API_RE = /^https:\/\/www\.zohoapis\.(com|eu|in|com\.au|jp|com\.cn|sa|ca|uk)$/;
const PADRAO_ACCOUNTS = "https://accounts.zoho.com";

export const configurado = () => Boolean(CLIENT_ID() && CLIENT_SECRET());

export function urlAutorizacao(estado: string) {
  const q = new URLSearchParams({
    scope: ESCOPOS, client_id: CLIENT_ID(), response_type: "code", access_type: "offline",
    prompt: "consent", redirect_uri: RETORNO, state: estado,
  });
  return `${PADRAO_ACCOUNTS}/oauth/v2/auth?${q}`;
}

async function pedirToken(accounts: string, params: Record<string, string>) {
  if (!ACCOUNTS_RE.test(accounts)) throw new HttpError(400, "servidor de contas do Zoho desconhecido");
  const r = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID(), client_secret: CLIENT_SECRET(), ...params }),
    signal: AbortSignal.timeout(15_000),
  });
  const t = await r.json().catch(() => ({}));
  if (!r.ok || t.error || !t.access_token) {
    console.error("zoho token", r.status, t.error ?? "sem access_token");
    throw new HttpError(502, `Zoho recusou a autorização${t.error ? ` (${t.error})` : ""}`);
  }
  return t as { access_token: string; refresh_token?: string; expires_in: number; api_domain?: string; scope?: string };
}

/** Retorno do OAuth: troca o code pelo refresh token e grava a conexao. */
export async function conectar(code: string, accounts: string, usuario: string) {
  const t = await pedirToken(accounts || PADRAO_ACCOUNTS, { grant_type: "authorization_code", code, redirect_uri: RETORNO });
  if (!t.refresh_token) throw new HttpError(502, "Zoho não devolveu refresh token (autorize de novo com consentimento)");
  const api = t.api_domain ?? "https://www.zohoapis.com";
  if (!API_RE.test(api)) throw new HttpError(502, "domínio de API do Zoho desconhecido");
  await servico("/rest/v1/integracoes", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      id: "zoho", refresh_token: t.refresh_token, access_token: t.access_token,
      expira_em: new Date(Date.now() + (t.expires_in - 120) * 1000).toISOString(),
      api_domain: api, accounts_server: accounts || PADRAO_ACCOUNTS, escopos: t.scope ?? ESCOPOS,
      conectado_por: usuario, conectado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
    }),
  });
}

type Conexao = { refresh_token: string; access_token: string | null; expira_em: string | null; api_domain: string; accounts_server: string };

async function conexao(): Promise<Conexao> {
  const [c] = await servico("/rest/v1/integracoes?id=eq.zoho&select=refresh_token,access_token,expira_em,api_domain,accounts_server");
  if (!c) throw new HttpError(409, "Zoho não conectado. A direção conecta em Integrações.");
  return c;
}

async function renovar(c: Conexao) {
  const t = await pedirToken(c.accounts_server, { grant_type: "refresh_token", refresh_token: c.refresh_token });
  const expira = new Date(Date.now() + (t.expires_in - 120) * 1000).toISOString();
  await servico("/rest/v1/integracoes?id=eq.zoho", {
    method: "PATCH",
    body: JSON.stringify({ access_token: t.access_token, expira_em: expira, atualizado_em: new Date().toISOString() }),
  });
  return t.access_token;
}

/** GET autenticado na API do Zoho (renova o token quando preciso, uma nova tentativa em 401). */
export async function zohoGet(caminho: string, params: Record<string, string | number | undefined> = {}) {
  const c = await conexao();
  let token = c.access_token && c.expira_em && Date.parse(c.expira_em) > Date.now() ? c.access_token : await renovar(c);
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  const url = `${c.api_domain}${caminho}${q.size ? `?${q}` : ""}`;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` }, signal: AbortSignal.timeout(20_000) });
    if (r.status === 401 && tentativa === 0) { token = await renovar(c); continue; }
    if (r.status === 204) return {};
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("zoho api", caminho, r.status, JSON.stringify(d).slice(0, 300));
      throw new HttpError(502, `Zoho respondeu ${r.status}${d?.message ? `: ${d.message}` : ""}`);
    }
    return d;
  }
  throw new HttpError(502, "Zoho recusou o acesso");
}

// ---------------------------------------------------------------- leituras de negocio
const reais = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(2) : null);
const dia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * RBT12 do Simples: receita bruta dos 12 meses anteriores ao mes de apuracao (mes atual),
 * somando as faturas do Zoho Books (exceto rascunho e anuladas).
 */
export async function rbt12(hoje = new Date()) {
  const ini = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 12, 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 0));
  let centavos = 0n, faturas = 0, ignoradas = 0;
  for (let page = 1; page <= 25; page++) {
    const d = await zohoGet("/books/v3/invoices", { organization_id: ORG_BOOKS, date_start: dia(ini), date_end: dia(fim), per_page: 200, page });
    for (const f of d.invoices ?? []) {
      if (["draft", "void"].includes(f.status)) { ignoradas++; continue; }
      centavos += BigInt(Math.round(Number(f.total) * 100));
      faturas++;
    }
    if (!d.page_context?.has_more_page) {
      return { valor: `${centavos / 100n}.${String(centavos % 100n).padStart(2, "0")}`, faturas, ignoradas, inicio: dia(ini), fim: dia(fim), fonte: "Zoho Books · faturas (exceto rascunho e anuladas)", completo: true };
    }
  }
  throw new HttpError(502, "mais de 5.000 faturas no período: soma não confiável, confira no Zoho");
}

const STATUS_ORC = new Set(["draft", "sent", "accepted", "declined", "expired", "invoiced"]);

export async function orcamentos(busca: string, status: string) {
  const d = await zohoGet("/books/v3/estimates", {
    organization_id: ORG_BOOKS, per_page: 50, sort_column: "date", sort_order: "D",
    search_text: busca.slice(0, 60), filter_by: STATUS_ORC.has(status) ? `Status.${status[0].toUpperCase()}${status.slice(1)}` : undefined,
  });
  return (d.estimates ?? []).map((e: Record<string, unknown>) => ({
    id: String(e.estimate_id), numero: e.estimate_number, cliente: e.customer_name, data: e.date,
    total: reais(e.total), status: e.status, referencia: e.reference_number || null,
  }));
}

/** Orcamento com itens e custo de compra (purchase_rate do cadastro do item). */
export async function orcamento(id: string) {
  if (!/^\d{5,25}$/.test(id)) throw new HttpError(400, "orçamento inválido");
  const { estimate: e } = await zohoGet(`/books/v3/estimates/${id}`, { organization_id: ORG_BOOKS });
  const ids = [...new Set((e.line_items ?? []).map((l: Record<string, unknown>) => l.item_id).filter(Boolean))].slice(0, 60) as string[];
  const custos = new Map<string, number | null>();
  for (let i = 0; i < ids.length; i += 6) {
    await Promise.all(ids.slice(i, i + 6).map(async (itemId) => {
      try {
        const { item } = await zohoGet(`/books/v3/items/${itemId}`, { organization_id: ORG_BOOKS });
        custos.set(itemId, typeof item?.purchase_rate === "number" && item.purchase_rate > 0 ? item.purchase_rate : null);
      } catch { custos.set(itemId, null); }
    }));
  }
  const itens = (e.line_items ?? []).map((l: Record<string, unknown>) => {
    const custo = l.item_id ? custos.get(String(l.item_id)) ?? null : null;
    return {
      nome: l.name || l.description || "Item", quantidade: String(l.quantity ?? "1"),
      tipo: l.product_type === "service" ? "servico" : "produto",
      venda_unit: reais(l.rate), venda_total: reais(l.item_total), custo_unit: reais(custo),
    };
  });
  return {
    id: String(e.estimate_id), numero: e.estimate_number, cliente: e.customer_name, data: e.date, status: e.status,
    subtotal: reais(e.sub_total), total: reais(e.total), itens,
    sem_custo: itens.filter((i: { custo_unit: string | null }) => i.custo_unit === null).length,
    fonte: "Zoho Books · orçamento e cadastro de itens (preço de compra)",
  };
}

/** Etapas reais do funil (campo Stage de Deals no Zoho CRM). Nunca inventadas. */
export async function etapasCrm() {
  const d = await zohoGet("/crm/v7/settings/fields", { module: "Deals" });
  const stage = (d.fields ?? []).find((f: Record<string, unknown>) => f.api_name === "Stage");
  if (!stage) throw new HttpError(502, "campo Stage não encontrado no Zoho CRM");
  return (stage.pick_list_values ?? []).map((p: Record<string, unknown>) => ({ valor: p.actual_value, nome: p.display_value, probabilidade: p.probability ?? null, tipo: p.forecast_type ?? null }));
}
