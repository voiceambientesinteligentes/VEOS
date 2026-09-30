// Escrita VEOS -> Zoho (criar e alterar). Regras:
// - so campos permitidos por modulo (Books/Projects: lista fixa; CRM: metadados do proprio Zoho,
//   so campos editaveis e de tipos simples);
// - antes de alterar, confere se o registro mudou no Zoho depois que a tela foi aberta (409);
// - grava no Zoho, rele o registro completo e atualiza o espelho na hora;
// - toda tentativa fica na trilha zoho_escritas (append-only), com o resultado.
import { HttpError, servico } from "./banco.ts";
import { ORG_BOOKS, PORTAL_PROJECTS, zohoEnviar, zohoGet } from "./zoho.ts";
import { BOOKS } from "./zoho_sync.ts";

type Obj = Record<string, any>;
type Campo = { id: string; rotulo: string; tipo: string; opcoes?: string[]; obrigatorio?: boolean; grupo?: string };

// ---------------------------------------------------------------- Books: campos editaveis
const T = (id: string, rotulo: string, tipo = "texto", extra: Partial<Campo> = {}): Campo => ({ id, rotulo, tipo, ...extra });
export const CAMPOS_BOOKS: Record<string, Campo[]> = {
  contacts: [
    T("contact_name", "Nome de exibição", "texto", { obrigatorio: true }), T("company_name", "Empresa"), T("contact_type", "Tipo", "opcao", { opcoes: ["customer", "vendor"] }),
    T("customer_sub_type", "Pessoa", "opcao", { opcoes: ["business", "individual"] }), T("website", "Site"), T("notes", "Observações", "texto_longo"),
    T("contato.first_name", "Contato principal: nome", "texto", { grupo: "Contato principal" }), T("contato.last_name", "Contato principal: sobrenome", "texto", { grupo: "Contato principal" }),
    T("contato.email", "E-mail", "email", { grupo: "Contato principal" }), T("contato.phone", "Telefone", "telefone", { grupo: "Contato principal" }), T("contato.mobile", "Celular", "telefone", { grupo: "Contato principal" }),
    ...["attention:Aos cuidados", "address:Endereço", "street2:Complemento", "city:Cidade", "state:Estado", "zip:CEP", "country:País", "phone:Telefone do endereço"].map((x) => {
      const [k, r] = x.split(":"); return T(`billing_address.${k}`, `Cobrança: ${r}`, "texto", { grupo: "Endereço de cobrança" });
    }),
  ],
  items: [
    T("name", "Nome", "texto", { obrigatorio: true }), T("sku", "SKU"), T("product_type", "Tipo", "opcao", { opcoes: ["goods", "service"] }), T("unit", "Unidade"),
    T("rate", "Preço de venda", "dinheiro", { obrigatorio: true }), T("purchase_rate", "Preço de compra", "dinheiro"), T("description", "Descrição de venda", "texto_longo"),
    T("purchase_description", "Descrição de compra", "texto_longo"), T("brand", "Marca"), T("manufacturer", "Fabricante"),
  ],
  estimates: [
    T("customer_id", "Cliente (id do Zoho)", "texto", { obrigatorio: true }), T("date", "Data", "data"), T("expiry_date", "Validade", "data"), T("reference_number", "Referência"),
    T("discount", "Desconto do orçamento (ex.: 5% ou 1000)", "texto"), T("notes", "Observações ao cliente", "texto_longo"), T("terms", "Termos e condições", "texto_longo"),
    T("line_items", "Itens", "itens", { obrigatorio: true }),
  ],
};
const CAMPOS_TAREFA: Campo[] = [
  T("name", "Nome", "texto", { obrigatorio: true }), T("description", "Descrição", "texto_longo"), T("priority", "Prioridade", "opcao", { opcoes: ["none", "low", "medium", "high"] }),
  T("start_date", "Início", "data"), T("end_date", "Fim", "data"),
];
const CRM_TIPOS: Record<string, string> = { text: "texto", textarea: "texto_longo", email: "email", phone: "telefone", website: "texto", picklist: "opcao", date: "data", datetime: "datahora", currency: "dinheiro", double: "numero", integer: "numero", bigint: "numero", boolean: "sim_nao", percent: "numero" };

/** Campos editaveis do modulo (para o formulario da tela). */
export async function camposEditaveis(produto: string, modulo: string): Promise<Campo[]> {
  if (produto === "books") return CAMPOS_BOOKS[modulo] ?? [];
  if (produto === "projects") return modulo === "tasks" ? CAMPOS_TAREFA : [];
  if (produto === "crm") {
    const f = await zohoGet("/crm/v7/settings/fields", { module: modulo });
    return ((f.fields ?? []) as Obj[])
      .filter((x) => CRM_TIPOS[x.data_type] && !x.read_only && !x.field_read_only && x.visible !== false && !x.system_mandatory_readonly && !/^(Created_|Modified_|Last_Activity|Record_Status|Locked__s|Tag$)/.test(x.api_name))
      .map((x) => ({ id: x.api_name, rotulo: x.field_label, tipo: CRM_TIPOS[x.data_type], obrigatorio: Boolean(x.system_mandatory), opcoes: x.data_type === "picklist" ? (x.pick_list_values ?? []).map((p: Obj) => p.actual_value).filter((v: string) => v !== "-None-") : undefined }));
  }
  return [];
}

// ---------------------------------------------------------------- validacao
const MONEY_RE = /^-?\d{1,12}(\.\d{1,2})?$/;
const NUM_RE = /^-?\d{1,13}(\.\d{1,6})?$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
function valor(c: Campo, v: unknown): unknown {
  if (v === null || v === undefined || v === "") return c.tipo === "sim_nao" ? false : "";
  const s = String(v);
  switch (c.tipo) {
    case "texto": case "email": case "telefone": if (s.length > 500) throw new HttpError(400, `${c.rotulo}: até 500 caracteres`); return s.trim();
    case "texto_longo": if (s.length > 10000) throw new HttpError(400, `${c.rotulo}: texto longo demais`); return s;
    case "dinheiro": if (!MONEY_RE.test(s)) throw new HttpError(400, `${c.rotulo}: valor inválido (1234.56)`); return Number(s);
    case "numero": if (!NUM_RE.test(s)) throw new HttpError(400, `${c.rotulo}: número inválido`); return Number(s);
    case "data": if (!DATA_RE.test(s)) throw new HttpError(400, `${c.rotulo}: data inválida`); return s;
    case "datahora": if (Number.isNaN(Date.parse(s))) throw new HttpError(400, `${c.rotulo}: data e hora inválidas`); return new Date(s).toISOString().replace(".000Z", "+00:00");
    case "opcao": if (c.opcoes && !c.opcoes.includes(s)) throw new HttpError(400, `${c.rotulo}: opção inválida`); return s;
    case "sim_nao": return v === true || v === "true";
    default: return v;
  }
}

function montar(campos: Campo[], entrada: Obj, criando: boolean) {
  const out: Obj = {};
  const permitidos = new Map(campos.map((c) => [c.id, c]));
  for (const k of Object.keys(entrada)) if (!permitidos.has(k)) throw new HttpError(400, `campo não editável: ${k}`);
  for (const c of campos) {
    if (!(c.id in entrada)) { if (criando && c.obrigatorio) throw new HttpError(400, `${c.rotulo}: obrigatório`); continue; }
    if (c.tipo === "itens") { out[c.id] = entrada[c.id]; continue; }
    const v = valor(c, entrada[c.id]);
    if (c.obrigatorio && v === "") throw new HttpError(400, `${c.rotulo}: obrigatório`);
    const partes = c.id.split(".");
    if (partes.length === 2) (out[partes[0]] ??= {})[partes[1]] = v;
    else out[c.id] = v;
  }
  return out;
}

function itensOrcamento(lista: unknown) {
  if (!Array.isArray(lista) || !lista.length || lista.length > 300) throw new HttpError(400, "itens: de 1 a 300 linhas");
  return lista.map((l: Obj, i: number) => {
    const out: Obj = {};
    if (l.item_id) { if (!/^\d{5,25}$/.test(String(l.item_id))) throw new HttpError(400, `item ${i + 1}: id inválido`); out.item_id = String(l.item_id); }
    if (l.line_item_id) out.line_item_id = String(l.line_item_id);
    if (!out.item_id && !l.name) throw new HttpError(400, `item ${i + 1}: escolha um item ou informe o nome`);
    if (l.name) out.name = String(l.name).slice(0, 300);
    if (l.description !== undefined) out.description = String(l.description ?? "").slice(0, 2000);
    if (!NUM_RE.test(String(l.quantity)) || Number(l.quantity) <= 0) throw new HttpError(400, `item ${i + 1}: quantidade inválida`);
    out.quantity = Number(l.quantity);
    if (!MONEY_RE.test(String(l.rate)) || Number(l.rate) < 0) throw new HttpError(400, `item ${i + 1}: preço inválido`);
    out.rate = Number(l.rate);
    if (l.discount !== undefined && l.discount !== "") out.discount = String(l.discount).slice(0, 20);
    if (l.header_name) out.header_name = String(l.header_name).slice(0, 200);
    return out;
  });
}

// ---------------------------------------------------------------- execucao
const quando = (v: unknown) => (typeof v === "string" && v ? Date.parse(v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")) : NaN);

async function registrar(chave: string, usuario: string, produto: string, modulo: string, zohoId: string | null, acao: string, enviado: unknown, ok: boolean, resposta: string) {
  await servico("/rest/v1/zoho_escritas", { method: "POST", body: JSON.stringify({ chave, usuario, produto, modulo, zoho_id: zohoId, acao, enviado, ok, resposta: resposta.slice(0, 2000) }) });
}

/** Cria (id null) ou altera um registro no Zoho e atualiza o espelho. */
export async function escrever(p: { produto: string; modulo: string; id: string | null; campos: Obj; modificadoEm: string | null; usuario: string; chave: string }) {
  const { produto, modulo, id, usuario } = p;
  const [ja] = await servico(`/rest/v1/zoho_escritas?chave=eq.${encodeURIComponent(p.chave)}&select=zoho_id,ok`);
  if (ja?.ok) return { id: ja.zoho_id, repetido: true };
  if (ja) throw new HttpError(409, "esta tentativa já falhou antes; confira os dados e salve de novo");
  const campos = await camposEditaveis(produto, modulo);
  if (!campos.length) throw new HttpError(400, "este módulo ainda não pode ser editado pelo VEOS");
  const corpo = montar(campos, p.campos ?? {}, !id);
  const acao = id ? "alterar" : "criar";
  let novoId = id, resposta = "";
  try {
    if (produto === "books") {
      const m = BOOKS.find((x) => x.modulo === modulo)!;
      if (corpo.line_items) corpo.line_items = itensOrcamento(corpo.line_items);
      if (corpo.contato) {
        const cp: Obj = { ...corpo.contato, is_primary_contact: true };
        delete corpo.contato;
        if (id) {
          const atual = (await zohoGet(`${m.rota}/${id}`, { organization_id: ORG_BOOKS }))[m.detalhe!];
          const prim = (atual?.contact_persons ?? []).find((x: Obj) => x.is_primary_contact);
          if (prim?.contact_person_id) cp.contact_person_id = prim.contact_person_id;
        }
        corpo.contact_persons = [cp];
      }
      if (id) {
        const atual = (await zohoGet(`${m.rota}/${id}`, { organization_id: ORG_BOOKS }))[m.detalhe!];
        if (p.modificadoEm && quando(atual?.last_modified_time) > Date.parse(p.modificadoEm) + 1000) throw new HttpError(409, "este registro foi alterado no Zoho depois que você abriu a ficha. Recarregue e refaça a alteração.");
      }
      const r = await zohoEnviar(id ? "PUT" : "POST", id ? `${m.rota}/${id}` : m.rota, { organization_id: ORG_BOOKS }, corpo);
      const reg = r[m.detalhe!];
      novoId = String(reg?.[m.id] ?? id);
      resposta = r.message ?? "ok";
      await servico("/rest/v1/rpc/zoho_gravar", { method: "POST", body: JSON.stringify({ linhas: [{ produto, modulo, zoho_id: novoId, nome: m.nome(reg), dados: reg, modificado_em: new Date(quando(reg.last_modified_time) || Date.now()).toISOString(), completo: true }] }) });
    } else if (produto === "crm") {
      if (id) {
        const atual = (await zohoGet(`/crm/v7/${modulo}/${id}`)).data?.[0];
        if (p.modificadoEm && quando(atual?.Modified_Time) > Date.parse(p.modificadoEm) + 1000) throw new HttpError(409, "este registro foi alterado no Zoho depois que você abriu a ficha. Recarregue e refaça a alteração.");
      }
      const r = await zohoEnviar(id ? "PUT" : "POST", `/crm/v7/${modulo}`, {}, { data: [{ ...(id ? { id } : {}), ...corpo }] });
      const res = r.data?.[0];
      if (res?.status !== "success") throw new HttpError(400, `Zoho recusou: ${res?.message ?? "erro"}${res?.details?.api_name ? ` (${res.details.api_name})` : ""}`);
      novoId = String(res.details?.id ?? id);
      resposta = res.message ?? "ok";
      const reg = (await zohoGet(`/crm/v7/${modulo}/${novoId}`)).data?.[0];
      if (reg) await servico("/rest/v1/rpc/zoho_gravar", { method: "POST", body: JSON.stringify({ linhas: [{ produto, modulo, zoho_id: novoId, nome: reg.Full_Name ?? reg.Deal_Name ?? reg.Account_Name ?? reg.Subject ?? reg.Product_Name ?? reg.Vendor_Name ?? novoId, dados: reg, modificado_em: reg.Modified_Time ? new Date(quando(reg.Modified_Time)).toISOString() : null, completo: true }] }) });
    } else if (produto === "projects" && modulo === "tasks") {
      if (!id) throw new HttpError(400, "criar tarefa: abra o projeto e use Nova tarefa (em breve)");
      const [esp] = await servico(`/rest/v1/zoho_registros?produto=eq.projects&modulo=eq.tasks&zoho_id=eq.${id}&select=dados`);
      const proj = esp?.dados?.projeto?.id;
      if (!proj) throw new HttpError(404, "tarefa sem projeto no espelho");
      const r = await zohoEnviar("PATCH", `/api/v3/portal/${PORTAL_PROJECTS}/projects/${proj}/tasks/${id}`, {}, corpo, "projects");
      resposta = "ok";
      const t = Array.isArray(r.tasks) ? r.tasks[0] : r;
      if (t?.id) await servico("/rest/v1/rpc/zoho_gravar", { method: "POST", body: JSON.stringify({ linhas: [{ produto, modulo, zoho_id: id, nome: t.name, dados: { ...esp.dados, ...t, projeto: esp.dados.projeto }, modificado_em: new Date().toISOString(), completo: true }] }) });
    } else throw new HttpError(400, "módulo não editável");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await registrar(p.chave, usuario, produto, modulo, id, acao, corpo, false, msg).catch(() => {});
    throw e;
  }
  await registrar(p.chave, usuario, produto, modulo, novoId, acao, corpo, true, resposta);
  return { id: novoId, repetido: false };
}
