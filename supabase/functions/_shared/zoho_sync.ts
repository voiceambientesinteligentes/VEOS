// Sincronizacao Zoho -> VEOS (espelho completo). Cada registro e guardado inteiro (jsonb).
// Books: listagem completa (detecta alteracao e exclusao) + detalhe de cada registro alterado,
// no ritmo de ate ~80 chamadas/min (limite do Books: 100/min). CRM: busca so o que mudou
// (If-Modified-Since), com todos os campos do modulo (em blocos de 50). Projects: projetos,
// tarefas e issues. Tudo com orcamento de tempo por execucao (plano gratuito: 150 s).
import { servico } from "./banco.ts";
import { ORG_BOOKS, PORTAL_PROJECTS, zohoGet, zohoGetBruto } from "./zoho.ts";

type Linha = { produto: string; modulo: string; zoho_id: string; nome: string | null; dados?: unknown; resumo?: unknown; modificado_em: string | null; completo: boolean };
type Obj = Record<string, unknown>;

// ---------------------------------------------------------------- definicao dos modulos
type ModBooks = { modulo: string; rota: string; chave: string; id: string; nome: (r: Obj) => string; detalhe?: string; params?: Record<string, string>; intervaloMin: number };
const tx = (...v: unknown[]) => v.filter((x) => x !== undefined && x !== null && x !== "").join(" · ");
export const BOOKS: ModBooks[] = [
  { modulo: "contacts", rota: "/books/v3/contacts", chave: "contacts", id: "contact_id", nome: (r) => tx(r.contact_name, r.company_name !== r.contact_name ? r.company_name : null), detalhe: "contact", params: { filter_by: "Status.All" }, intervaloMin: 15 },
  { modulo: "items", rota: "/books/v3/items", chave: "items", id: "item_id", nome: (r) => tx(r.name, r.sku), detalhe: "item", params: { filter_by: "Status.All" }, intervaloMin: 15 },
  { modulo: "estimates", rota: "/books/v3/estimates", chave: "estimates", id: "estimate_id", nome: (r) => tx(r.estimate_number, r.customer_name), detalhe: "estimate", intervaloMin: 15 },
  { modulo: "salesorders", rota: "/books/v3/salesorders", chave: "salesorders", id: "salesorder_id", nome: (r) => tx(r.salesorder_number, r.customer_name), detalhe: "salesorder", intervaloMin: 30 },
  { modulo: "invoices", rota: "/books/v3/invoices", chave: "invoices", id: "invoice_id", nome: (r) => tx(r.invoice_number, r.customer_name), detalhe: "invoice", intervaloMin: 30 },
  { modulo: "customerpayments", rota: "/books/v3/customerpayments", chave: "customerpayments", id: "payment_id", nome: (r) => tx(r.payment_number, r.customer_name), detalhe: "payment", intervaloMin: 30 },
  { modulo: "creditnotes", rota: "/books/v3/creditnotes", chave: "creditnotes", id: "creditnote_id", nome: (r) => tx(r.creditnote_number, r.customer_name), detalhe: "creditnote", intervaloMin: 60 },
  { modulo: "purchaseorders", rota: "/books/v3/purchaseorders", chave: "purchaseorders", id: "purchaseorder_id", nome: (r) => tx(r.purchaseorder_number, r.vendor_name), detalhe: "purchaseorder", intervaloMin: 30 },
  { modulo: "bills", rota: "/books/v3/bills", chave: "bills", id: "bill_id", nome: (r) => tx(r.bill_number, r.vendor_name), detalhe: "bill", intervaloMin: 30 },
  { modulo: "vendorpayments", rota: "/books/v3/vendorpayments", chave: "vendorpayments", id: "payment_id", nome: (r) => tx(r.payment_number, r.vendor_name), detalhe: "vendorpayment", intervaloMin: 60 },
  { modulo: "expenses", rota: "/books/v3/expenses", chave: "expenses", id: "expense_id", nome: (r) => tx(r.account_name, r.description, r.date), detalhe: "expense", intervaloMin: 30 },
  { modulo: "bankaccounts", rota: "/books/v3/bankaccounts", chave: "bankaccounts", id: "account_id", nome: (r) => tx(r.account_name, r.bank_name), params: { filter_by: "Status.All" }, intervaloMin: 60 },
  { modulo: "chartofaccounts", rota: "/books/v3/chartofaccounts", chave: "chartofaccounts", id: "account_id", nome: (r) => tx(r.account_name, r.account_type), params: { filter_by: "AccountType.All" }, intervaloMin: 360 },
  { modulo: "taxes", rota: "/books/v3/settings/taxes", chave: "taxes", id: "tax_id", nome: (r) => tx(r.tax_name, `${r.tax_percentage}%`), intervaloMin: 360 },
];
// Espelhos do Books dentro do CRM (CustomModule500x) ficam de fora: seriam dados duplicados.
export const CRM = ["Leads", "Contacts", "Accounts", "Deals", "Tasks", "Events", "Calls", "Products", "Vendors", "Campaigns", "Quotes", "Sales_Orders", "Purchase_Orders", "Invoices", "Price_Books", "Cases", "Solutions", "Notes"];
const CRM_INTERVALO_MIN = 30;
const PROJECTS_INTERVALO_MIN = 60;

const nomeCrm = (r: Obj) => tx(r.Deal_Name ?? r.Full_Name ?? r.Account_Name ?? r.Subject ?? r.Product_Name ?? r.Vendor_Name ?? r.Campaign_Name ?? r.Price_Book_Name ?? r.Solution_Title ?? r.Note_Title ?? r.Last_Name ?? r.id);
const quando = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  const d = Date.parse(v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(d) ? null : new Date(d).toISOString();
};

// ---------------------------------------------------------------- controle de ritmo e tempo
class TempoEsgotado extends Error { constructor() { super("tempo da rodada esgotado"); } }
class Orcamento {
  chamadas = 0; gravados = 0; detalhes = 0; erros: string[] = [];
  private inicio = Date.now();
  private janela: number[] = [];
  constructor(private limiteMs: number, private porMinuto: number) {}
  get resta() { return this.limiteMs - (Date.now() - this.inicio); }
  get ms() { return Date.now() - this.inicio; }
  /** Espera o necessario para nao passar de N chamadas por minuto. */
  async vez() {
    const agora = Date.now();
    this.janela = this.janela.filter((t) => agora - t < 60_000);
    if (this.janela.length >= this.porMinuto) {
      const espera = 60_000 - (agora - this.janela[0]) + 50;
      if (espera > this.resta - 8_000) throw new TempoEsgotado();
      await new Promise((r) => setTimeout(r, espera));
    }
    this.janela.push(Date.now());
    this.chamadas++;
  }
}

async function estado(produto: string, modulo: string) {
  const [s] = await servico(`/rest/v1/zoho_sync?produto=eq.${produto}&modulo=eq.${modulo}&select=*`);
  return s ?? { produto, modulo, cursor: {}, ultima_volta_em: null };
}
async function salvarEstado(produto: string, modulo: string, campos: Obj) {
  await servico("/rest/v1/zoho_sync", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ produto, modulo, ultima_execucao_em: new Date().toISOString(), ...campos }) });
}
const vencido = (ultima: string | null, min: number) => !ultima || Date.now() - Date.parse(ultima) > min * 60_000;
async function gravar(linhas: Linha[], o: Orcamento) {
  for (let i = 0; i < linhas.length; i += 200) {
    o.gravados += await servico("/rest/v1/rpc/zoho_gravar", { method: "POST", body: JSON.stringify({ linhas: linhas.slice(i, i + 200) }) });
  }
}

// ---------------------------------------------------------------- Books
async function listarBooks(m: ModBooks, o: Orcamento, forcar: boolean) {
  const st = await estado("books", m.modulo);
  if (!forcar && !vencido(st.ultima_volta_em, m.intervaloMin)) return;
  const vistos: string[] = [];
  for (let page = 1; page <= 50; page++) {
    if (o.resta < 15_000) { o.erros.push(`books/${m.modulo}: tempo esgotado na página ${page}`); return; }
    await o.vez();
    const d = await zohoGet(m.rota, { organization_id: ORG_BOOKS, per_page: 200, page, ...(m.params ?? {}) });
    const lista = (d[m.chave] ?? []) as Obj[];
    await gravar(lista.map((r) => ({
      produto: "books", modulo: m.modulo, zoho_id: String(r[m.id]), nome: m.nome(r),
      resumo: r, dados: m.detalhe ? undefined : r, modificado_em: quando(r.last_modified_time ?? r.updated_time), completo: !m.detalhe,
    })), o);
    vistos.push(...lista.map((r) => String(r[m.id])));
    if (!d.page_context?.has_more_page) break;
  }
  await servico("/rest/v1/rpc/zoho_marcar_excluidos", { method: "POST", body: JSON.stringify({ p_produto: "books", p_modulo: m.modulo, p_ids: vistos }) });
  await salvarEstado("books", m.modulo, { estado: "ok", total: vistos.length, ultima_volta_em: new Date().toISOString(), erro: null });
}

async function detalharBooks(o: Orcamento) {
  const pend = await servico("/rest/v1/rpc/zoho_detalhes_pendentes", { method: "POST", body: JSON.stringify({ p_limite: 150 }) }) as { modulo: string; zoho_id: string }[];
  for (const p of pend) {
    if (o.resta < 12_000) break;
    const m = BOOKS.find((x) => x.modulo === p.modulo);
    if (!m?.detalhe) continue;
    await o.vez();
    try {
      const d = await zohoGet(`${m.rota}/${p.zoho_id}`, { organization_id: ORG_BOOKS });
      const r = d[m.detalhe] as Obj;
      if (!r) continue;
      await gravar([{ produto: "books", modulo: m.modulo, zoho_id: p.zoho_id, nome: m.nome(r), dados: r, modificado_em: quando(r.last_modified_time ?? r.updated_time), completo: true }], o);
      o.detalhes++;
    } catch (e) {
      o.erros.push(`books/${m.modulo}/${p.zoho_id}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

// ---------------------------------------------------------------- CRM
async function listarCrm(modulo: string, o: Orcamento, forcar: boolean) {
  const st = await estado("crm", modulo);
  if (!forcar && !vencido(st.ultima_volta_em, CRM_INTERVALO_MIN)) return;
  const cursor = (st.cursor ?? {}) as { campos?: string[]; campos_em?: string };
  // lista de campos do modulo, renovada 1x por dia
  let campos = cursor.campos;
  if (!campos?.length || vencido(cursor.campos_em ?? null, 24 * 60)) {
    await o.vez();
    const f = await zohoGet("/crm/v7/settings/fields", { module: modulo });
    campos = ((f.fields ?? []) as Obj[]).map((x) => String(x.api_name)).filter((n) => n && n !== "id");
  }
  const desde = forcar ? null : st.ultima_volta_em;
  const inicioVolta = new Date().toISOString();
  const blocos: string[][] = [];
  for (let i = 0; i < campos.length; i += 49) blocos.push(campos.slice(i, i + 49));
  const porId = new Map<string, Obj>();
  for (const bloco of blocos) {
    let pageToken: string | undefined;
    for (let page = 1; page <= 100; page++) {
      if (o.resta < 15_000) { o.erros.push(`crm/${modulo}: tempo esgotado`); return; }
      await o.vez();
      const r = await zohoGetBruto(`/crm/v7/${modulo}`, { fields: bloco.join(","), per_page: 200, sort_by: "Modified_Time", sort_order: "desc", ...(pageToken ? { page_token: pageToken } : { page }) },
        desde ? { "If-Modified-Since": new Date(Date.parse(desde) - 60_000).toISOString().replace(".000Z", "+00:00") } : {});
      if (r.status === 304 || r.status === 204) break;
      for (const rec of (r.dados.data ?? []) as Obj[]) porId.set(String(rec.id), { ...(porId.get(String(rec.id)) ?? {}), ...rec });
      if (!r.dados.info?.more_records) break;
      pageToken = r.dados.info?.next_page_token;
    }
  }
  await gravar([...porId.values()].map((rec) => ({ produto: "crm", modulo, zoho_id: String(rec.id), nome: nomeCrm(rec), dados: rec, modificado_em: quando(rec.Modified_Time), completo: true })), o);
  await salvarEstado("crm", modulo, { estado: "ok", cursor: { campos, campos_em: cursor.campos?.length && !vencido(cursor.campos_em ?? null, 24 * 60) ? cursor.campos_em : inicioVolta }, ultima_volta_em: inicioVolta, erro: null });
}

// ---------------------------------------------------------------- Projects
async function listarProjects(o: Orcamento, forcar: boolean) {
  const st = await estado("projects", "projects");
  if (!forcar && !vencido(st.ultima_volta_em, PROJECTS_INTERVALO_MIN)) return;
  const base = `/api/v3/portal/${PORTAL_PROJECTS}`;
  const projetos: Obj[] = [];
  for (let page = 1; page <= 20; page++) {
    await o.vez();
    const d = await zohoGet(`${base}/projects`, { page, per_page: 100 }, "projects");
    const lista = (Array.isArray(d) ? d : d.projects ?? []) as Obj[];
    projetos.push(...lista);
    if (lista.length < 100) break;
  }
  await gravar(projetos.map((p) => ({ produto: "projects", modulo: "projects", zoho_id: String(p.id), nome: tx(p.key, p.name), dados: p, modificado_em: quando(p.modified_time ?? p.updated_time), completo: true })), o);
  for (const [modulo, rota, chave] of [["tasks", "tasks", "tasks"], ["issues", "issues", "issues"]] as const) {
    const linhas: Linha[] = [];
    for (const p of projetos) {
      if (o.resta < 12_000) { o.erros.push(`projects/${modulo}: tempo esgotado`); break; }
      for (let page = 1; page <= 20; page++) {
        await o.vez();
        let d: Obj;
        try { d = await zohoGet(`${base}/projects/${p.id}/${rota}`, { page, per_page: 100 }, "projects"); } catch (e) { o.erros.push(`projects/${modulo}/${p.id}: ${e instanceof Error ? e.message : e}`); break; }
        const lista = (Array.isArray(d) ? d : d[chave] ?? []) as Obj[];
        linhas.push(...lista.map((t) => ({ produto: "projects", modulo, zoho_id: String(t.id), nome: tx(t.prefix, t.name, p.name), dados: { ...t, projeto: { id: p.id, name: p.name, key: p.key } }, modificado_em: quando(t.last_modified_time ?? t.modified_time), completo: true })));
        if (lista.length < 100) break;
      }
    }
    await gravar(linhas, o);
    await salvarEstado("projects", modulo, { estado: "ok", total: linhas.length, ultima_volta_em: new Date().toISOString(), erro: null });
  }
  // demais projetos (arquivados, modelos, fechados): a v3 os expoe por "visoes" (view_id)
  const arquivados: Obj[] = [];
  const visoes: string[] = [];
  let visoesBrutas = "";
  try {
    await o.vez();
    const cv = await zohoGet(`${base}/projects/customview`, {}, "projects");
    // resposta: { favourites: [], default_views: [{custom_view_id, name: "zp.search.allprojs"...}], custom_views: [...] }
    const lista = Object.values(cv ?? {}).filter(Array.isArray).flat() as Obj[];
    visoesBrutas = JSON.stringify(cv).slice(0, 300);
    for (const v of lista) {
      const nomeV = String(v.name ?? v.view_name ?? "");
      if (/lixeira|trash|excluid|deleted/i.test(nomeV)) continue;
      const vid = String(v.custom_view_id ?? v.id ?? v.view_id ?? "");
      if (!vid) continue;
      visoes.push(nomeV);
      for (let page = 1; page <= 20; page++) {
        if (o.resta < 12_000) break;
        await o.vez();
        const d = await zohoGet(`${base}/projects`, { view_id: vid, page, per_page: 100 }, "projects");
        const itens = (Array.isArray(d) ? d : d.projects ?? []) as Obj[];
        arquivados.push(...itens.map((p) => ({ ...p, visao: nomeV })));
        if (itens.length < 100) break;
      }
    }
  } catch (e) { o.erros.push(`projects/visoes: ${e instanceof Error ? e.message : e}`); }
  const ativos = new Set(projetos.map((p) => String(p.id)));
  const vistos = new Set<string>();
  const novosArq = arquivados.filter((p) => { const k = String(p.id_string ?? p.id); if (ativos.has(k) || vistos.has(k)) return false; vistos.add(k); return true; });
  await gravar(novosArq.map((p) => ({ produto: "projects", modulo: "projects", zoho_id: String(p.id_string ?? p.id), nome: tx(p.key, p.name, p.visao ? `(${p.visao})` : null), dados: { ...p, id: String(p.id_string ?? p.id), arquivado: true }, modificado_em: quando(p.modified_time ?? p.updated_time ?? null), completo: true })), o);
  await salvarEstado("projects", "projects", { estado: "ok", total: projetos.length + novosArq.length, cursor: { visoes, visoesBrutas: visoes.length ? undefined : visoesBrutas }, ultima_volta_em: new Date().toISOString(), erro: null });
  await tarefasArquivados(novosArq.map((p) => ({ id: String(p.id_string ?? p.id), name: p.name, key: p.key })), base, o);
}

/** Tarefas dos projetos arquivados: uma volta por dia, continuando de onde parou (cursor). */
async function tarefasArquivados(projetos: { id: string; name: string; key: string }[], base: string, o: Orcamento) {
  const st = await estado("projects", "tasks_arquivados");
  const cursor = (st.cursor ?? {}) as { pendentes?: string[] };
  let pendentes = cursor.pendentes ?? [];
  if (!pendentes.length) {
    if (!vencido(st.ultima_volta_em, 24 * 60)) return;
    pendentes = projetos.map((p) => p.id);
  }
  const porId = new Map(projetos.map((p) => [p.id, p]));
  while (pendentes.length && o.resta > 15_000) {
    const pid = pendentes[0];
    const p = porId.get(pid) ?? { id: pid, name: "", key: "" };
    const linhas: Linha[] = [];
    for (let page = 1; page <= 20; page++) {
      await o.vez();
      let d: Obj;
      try { d = await zohoGet(`${base}/projects/${pid}/tasks`, { page, per_page: 100 }, "projects"); } catch (e) { o.erros.push(`projects/tasks arquivado ${pid}: ${e instanceof Error ? e.message : e}`); break; }
      const lista = (Array.isArray(d) ? d : d.tasks ?? []) as Obj[];
      linhas.push(...lista.map((t) => ({ produto: "projects", modulo: "tasks", zoho_id: String(t.id), nome: tx(t.prefix, t.name, p.name), dados: { ...t, projeto: { id: p.id, name: p.name, key: p.key, arquivado: true } }, modificado_em: quando(t.last_modified_time ?? t.modified_time), completo: true })));
      if (lista.length < 100) break;
    }
    await gravar(linhas, o);
    pendentes = pendentes.slice(1);
  }
  await salvarEstado("projects", "tasks_arquivados", { estado: "ok", cursor: { pendentes }, total: projetos.length - pendentes.length, ...(pendentes.length ? {} : { ultima_volta_em: new Date().toISOString() }), erro: null });
}

// ---------------------------------------------------------------- execucao
/** Uma rodada de sincronizacao dentro do orcamento de tempo. */
export async function sincronizar(origem: string, { limiteMs = 120_000, forcar = false } = {}) {
  const o = new Orcamento(limiteMs, 80);
  const passo = async (nome: string, fn: () => Promise<void>) => {
    if (o.resta < 10_000) return;
    try { await fn(); } catch (e) {
      if (e instanceof TempoEsgotado) return;
      const msg = e instanceof Error ? e.message : String(e);
      o.erros.push(`${nome}: ${msg}`);
      const [produto, modulo] = nome.split("/");
      // espera o intervalo do modulo antes de tentar de novo (nao martela o Zoho com o mesmo erro)
      await salvarEstado(produto, modulo, { estado: "erro", erro: msg.slice(0, 300), ultima_volta_em: new Date().toISOString() }).catch(() => {});
    }
  };
  // listagens primeiro (baratas), detalhes do Books com o tempo que sobrar
  for (const m of BOOKS) await passo(`books/${m.modulo}`, () => listarBooks(m, o, forcar));
  for (const m of CRM) await passo(`crm/${m}`, () => listarCrm(m, o, forcar));
  await passo("projects/projects", () => listarProjects(o, forcar));
  await passo("books/detalhes", () => detalharBooks(o));
  await servico("/rest/v1/zoho_sync_log", { method: "POST", body: JSON.stringify({ origem, chamadas: o.chamadas, gravados: o.gravados, detalhes: o.detalhes, erros: o.erros.slice(0, 50), ms: o.ms }) }).catch(() => {});
  return { chamadas: o.chamadas, gravados: o.gravados, detalhes: o.detalhes, erros: o.erros, ms: o.ms };
}
