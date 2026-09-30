// Cliente Zoho (Books, CRM, Projects) somente leitura, no servidor. OAuth "server-based":
// client id/secret nos segredos do Supabase; refresh token na tabela `integracoes` (RLS sem
// policies). Nenhum token sai para o navegador. Timeouts curtos e erros sem vazar detalhes.
import { HttpError, servico, URL_BASE } from "./banco.ts";

export const ORG_BOOKS = "782439572"; // VOICE AMBIENTES INTELIGENTES (Zoho Books)
export const PORTAL_PROJECTS = "776190049";
export const RETORNO = `${URL_BASE}/functions/v1/zoho/retorno`;
export const ESCOPOS = [
  // Books: todos os modulos, so leitura (espelho completo na aba Zoho)
  ...["contacts", "settings", "estimates", "invoices", "customerpayments", "creditnotes", "projects", "expenses", "salesorders", "purchaseorders", "bills", "debitnotes", "vendorpayments", "banking", "accountants"].map((m) => `ZohoBooks.${m}.READ`),
  // CRM: todos os modulos e metadados, so leitura
  "ZohoCRM.modules.READ", "ZohoCRM.settings.READ", "ZohoCRM.users.READ", "ZohoCRM.org.READ",
  // Projects
  ...["portals", "projects", "tasks", "tasklists", "milestones", "bugs", "timesheets", "users"].map((m) => `ZohoProjects.${m}.READ`),
  // Escrita (criar/alterar, sem excluir) nos modulos editaveis pelo VEOS
  ...["contacts", "settings", "estimates"].flatMap((m) => [`ZohoBooks.${m}.CREATE`, `ZohoBooks.${m}.UPDATE`]),
  "ZohoCRM.modules.CREATE", "ZohoCRM.modules.UPDATE", "ZohoProjects.tasks.CREATE", "ZohoProjects.tasks.UPDATE",
].join(",");

const CLIENT_ID = () => Deno.env.get("ZOHO_CLIENT_ID") ?? "";
const CLIENT_SECRET = () => Deno.env.get("ZOHO_CLIENT_SECRET") ?? "";
// So servidores oficiais do Zoho: impede que um retorno forjado mande o segredo para outro host.
const ACCOUNTS_RE = /^https:\/\/accounts\.zoho\.(com|eu|in|com\.au|jp|com\.cn|sa|ca|uk)$/;
const API_RE = /^https:\/\/www\.zohoapis\.(com|eu|in|com\.au|jp|com\.cn|sa|ca|uk)$/;
const PADRAO_ACCOUNTS = "https://accounts.zoho.com";
// Zoho Projects usa um host proprio: projectsapi.zoho.<dc> (mesmo data center do api_domain).
const projectsBase = (api: string) => api.replace("https://www.zohoapis.", "https://projectsapi.zoho.");

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

let ultimaRenovacao = 0;
async function renovar(c: Conexao) {
  ultimaRenovacao = Date.now();
  const t = await pedirToken(c.accounts_server, { grant_type: "refresh_token", refresh_token: c.refresh_token });
  const expira = new Date(Date.now() + (t.expires_in - 120) * 1000).toISOString();
  await servico("/rest/v1/integracoes?id=eq.zoho", {
    method: "PATCH",
    body: JSON.stringify({ access_token: t.access_token, expira_em: expira, atualizado_em: new Date().toISOString() }),
  });
  return t.access_token;
}

/** GET autenticado na API do Zoho (renova o token quando preciso, uma nova tentativa em 401). */
export async function zohoGetBruto(caminho: string, params: Record<string, string | number | undefined> = {}, extras: Record<string, string> = {}, produto: "api" | "projects" = "api") {
  const c = await conexao();
  let token = c.access_token && c.expira_em && Date.parse(c.expira_em) > Date.now() ? c.access_token : await renovar(c);
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  const base = produto === "projects" ? projectsBase(c.api_domain) : c.api_domain;
  const url = `${base}${caminho}${q.size ? `?${q}` : ""}`;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}`, ...extras }, signal: AbortSignal.timeout(25_000) });
    // 401 so renova se o token pode ter expirado e nao houve renovacao ha pouco (o Zoho limita
    // renovacoes; 401 por falta de permissao nao se resolve renovando).
    if (r.status === 401 && tentativa === 0 && Date.now() - ultimaRenovacao > 120_000) { token = await renovar(c); continue; }
    if (r.status === 204 || r.status === 304) return { status: r.status, dados: {} as Record<string, any> };
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("zoho api", caminho, r.status, JSON.stringify(d).slice(0, 300));
      throw new HttpError(502, `Zoho respondeu ${r.status}${d?.message ? `: ${d.message}` : d?.code ? `: ${d.code}` : ""}`);
    }
    return { status: r.status, dados: d as Record<string, any> };
  }
  throw new HttpError(502, "Zoho recusou o acesso");
}

/** POST/PUT/PATCH autenticado (escrita). Nao repete em erro: escrita nunca e reenviada as cegas. */
export async function zohoEnviar(metodo: "POST" | "PUT" | "PATCH", caminho: string, params: Record<string, string> = {}, corpo: unknown = {}, produto: "api" | "projects" = "api") {
  const c = await conexao();
  const token = c.access_token && c.expira_em && Date.parse(c.expira_em) > Date.now() + 30_000 ? c.access_token : await renovar(c);
  const q = new URLSearchParams(params);
  const base = produto === "projects" ? projectsBase(c.api_domain) : c.api_domain;
  const r = await fetch(`${base}${caminho}${q.size ? `?${q}` : ""}`, {
    method: metodo, headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo), signal: AbortSignal.timeout(30_000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || (typeof d.code === "number" && d.code !== 0)) {
    console.error("zoho escrita", caminho, r.status, JSON.stringify(d).slice(0, 400));
    const det = d?.data?.[0];
    throw new HttpError(r.status === 401 ? 403 : 400, `Zoho recusou a gravação: ${d.message ?? det?.message ?? r.status}${det?.details?.api_name ? ` (${det.details.api_name})` : ""}${r.status === 401 ? ". Reconecte o Zoho em Integrações para liberar a escrita." : ""}`);
  }
  return d as Record<string, any>;
}

export async function zohoGet(caminho: string, params: Record<string, string | number | undefined> = {}, produto: "api" | "projects" = "api") {
  return (await zohoGetBruto(caminho, params, {}, produto)).dados;
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

/** Projetos do Zoho Projects (portal da VOICE). */
export async function projetosZoho() {
  const d = await zohoGet(`/api/v3/portal/${PORTAL_PROJECTS}/projects`, { per_page: 100 }, "projects");
  const lista = Array.isArray(d) ? d : d.projects ?? [];
  return lista.map((p: Record<string, unknown>) => ({ id: String(p.id), nome: p.name, status: (p.status as Record<string, unknown>)?.name ?? p.status ?? null }));
}

/**
 * Diagnostico da integracao: chama cada produto e devolve so ok/erro e contagens da 1a pagina
 * (nenhum valor, nome ou dado de cliente). Usado pela funcao "saude".
 */
export async function diagnostico() {
  const passo = async (nome: string, fn: () => Promise<number>) => {
    try { return [nome, { ok: true, itens: await fn() }] as const; } catch (e) { return [nome, { ok: false, erro: e instanceof Error ? e.message.slice(0, 160) : "falha" }] as const; }
  };
  const conta = (d: Record<string, unknown>, k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]).length : 0);
  const r = await Promise.all([
    passo("books_faturas", async () => conta(await zohoGet("/books/v3/invoices", { organization_id: ORG_BOOKS, per_page: 200 }), "invoices")),
    passo("books_orcamentos", async () => conta(await zohoGet("/books/v3/estimates", { organization_id: ORG_BOOKS, per_page: 200 }), "estimates")),
    passo("books_itens", async () => conta(await zohoGet("/books/v3/items", { organization_id: ORG_BOOKS, per_page: 200 }), "items")),
    passo("crm_etapas", async () => (await etapasCrm()).length),
    passo("crm_negocios", async () => conta(await zohoGet("/crm/v7/Deals", { fields: "id", per_page: 200 }), "data")),
    passo("projects_projetos", async () => (await projetosZoho()).length),
  ]);
  return Object.fromEntries(r);
}
