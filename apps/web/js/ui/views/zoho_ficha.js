// Ficha "como o Zoho mostra": so campos preenchidos e uteis, na ordem de leitura do Zoho.
// Documentos do Books (orcamento, pedido, fatura, compra, conta a pagar) aparecem como documento:
// cabecalho, itens, totais, observacoes e termos. O registro completo continua guardado e
// fica acessivel na secao recolhida "Todos os campos (tecnico)".
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { h } from "../dom.js";

const SITUACAO = { draft: "Rascunho", sent: "Enviado", accepted: "Aceito", declined: "Recusado", expired: "Expirado", invoiced: "Faturado", paid: "Pago", overdue: "Vencido", open: "Aberto", void: "Anulado", partially_paid: "Pago parcialmente", unpaid: "Em aberto", closed: "Fechado", billed: "Faturado", issued: "Emitido", active: "Ativo", inactive: "Inativo", customer: "Cliente", vendor: "Fornecedor", business: "Empresa", individual: "Pessoa física", goods: "Produto", service: "Serviço" };
const vazio = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !(typeof Node !== "undefined" && v instanceof Node) && !Object.values(v).some((x) => !vazio(x)));
const reais = (v) => (vazio(v) || !Number.isFinite(Number(v)) ? null : formatBRL(Number(v).toFixed(2)));
const data = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? (v.length === 10 ? formatDate(v) : formatDateTime(new Date(Date.parse(v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"))).toISOString())) : v);
const txt = (v) => (vazio(v) ? null : SITUACAO[v] ?? String(v));
const num = (v) => Number(v ?? 0);

/** Linha rotulo/valor; some sozinha se o valor estiver vazio. */
const item = (rotulo, valor) => (vazio(valor) ? null : h("div", { class: "zoho-campo" }, h("dt", null, rotulo), h("dd", null, valor)));
const grade = (...itens) => { const x = itens.filter(Boolean); return x.length ? h("dl", { class: "zoho-grade" }, x) : null; };
const bloco = (titulo, ...conteudo) => { const x = conteudo.filter(Boolean); return x.length ? h("section", { class: "stack-s zoho-secao" }, h("h3", { class: "zoho-secao-titulo" }, titulo), x) : null; };
const texto = (v) => (vazio(v) ? null : h("p", { class: "zoho-texto" }, String(v)));

function endereco(e) {
  if (!e || vazio(e)) return null;
  const partes = [e.attention, e.address, e.street2, [e.city, e.state].filter(Boolean).join(" - "), e.zip, e.country, e.phone ? `Tel. ${e.phone}` : null].filter((x) => !vazio(x));
  return partes.length ? partes.join("\n") : null;
}

function tabela(cab, linhas) {
  if (!linhas.length) return null;
  return h("div", { class: "table-wrap" }, h("table", { class: "table zoho-tabela" },
    h("thead", null, h("tr", null, cab.map(([t, a]) => h("th", { scope: "col", class: a === "r" ? "r" : null }, t)))),
    h("tbody", null, linhas.map((l) => h("tr", null, l.map((c, i) => h("td", { class: cab[i][1] === "r" ? "r num" : null }, c ?? "—")))))));
}

// ---------------------------------------------------------------- documentos do Books
const NUMERO = { estimates: "estimate_number", salesorders: "salesorder_number", invoices: "invoice_number", purchaseorders: "purchaseorder_number", bills: "bill_number", creditnotes: "creditnote_number" };
function documento(d, modulo) {
  const compra = ["purchaseorders", "bills"].includes(modulo);
  const itens = (d.line_items ?? []).map((l, i) => [
    String(i + 1),
    h("div", null, h("strong", null, l.name || "Item"), l.description ? h("div", { class: "field-hint zoho-texto" }, l.description) : null, l.header_name ? h("div", { class: "field-hint" }, `Seção: ${l.header_name}`) : null),
    `${Number(l.quantity ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}${l.unit ? ` ${l.unit}` : ""}`,
    reais(l.rate), num(l.discount) ? String(l.discount).includes("%") ? l.discount : reais(l.discount) : null, reais(l.item_total),
  ]);
  const temDesc = itens.some((l) => l[4]);
  const cab = [["Nº"], ["Item & descrição"], ["Quant.", "r"], ["Taxa", "r"], ...(temDesc ? [["Desconto", "r"]] : []), ["Montante", "r"]];
  const linhas = temDesc ? itens : itens.map((l) => [l[0], l[1], l[2], l[3], l[5]]);
  const totais = grade(
    item("Subtotal", reais(d.sub_total)),
    num(d.discount_total) ? item(`Desconto${d.discount_percent ? ` (${d.discount_percent}%)` : ""}`, reais(d.discount_total)) : null,
    num(d.shipping_charge) ? item("Frete", reais(d.shipping_charge)) : null,
    num(d.adjustment) ? item(d.adjustment_description && d.adjustment_description !== "ajuste" ? `Ajuste (${d.adjustment_description})` : "Ajuste", reais(d.adjustment)) : null,
    num(d.tax_total) ? item("Impostos", reais(d.tax_total)) : null,
    item("Total", h("strong", null, reais(d.total))),
    num(d.balance) ? item("Saldo em aberto", reais(d.balance)) : null,
    num(d.invoiced_amount) ? item("Já faturado", reais(d.invoiced_amount)) : null);
  const pessoas = (d.contact_persons_details ?? []).filter((p) => !vazio(p.email) || !vazio(p.phone) || !vazio(p.mobile));
  return [
    grade(
      item(compra ? "Número" : "Número", d[NUMERO[modulo]]), item("Situação", txt(d.status)), item("Data", data(d.date)),
      item(modulo === "estimates" ? "Validade" : "Vencimento", data(d.expiry_date ?? d.due_date ?? d.delivery_date)),
      item(compra ? "Fornecedor" : "Cliente", d.customer_name ?? d.vendor_name), item("Assunto", d.subject_content),
      item("Referência", d.reference_number), item("Vendedor", d.salesperson_name), item("Condição de pagamento", d.payment_terms_label),
      item("Negócio no CRM", d.zcrm_potential_name)),
    bloco("Itens", tabela(cab, linhas)),
    bloco("Totais", totais),
    bloco("Observações", texto(d.notes)),
    bloco("Termos e condições", texto(d.terms)),
    bloco("Endereços", grade(item("Cobrança", endereco(d.billing_address)), item("Entrega", endereco(d.shipping_address)))),
    pessoas.length ? bloco("Pessoas de contato", tabela([["Nome"], ["E-mail"], ["Telefone"], ["Celular"]], pessoas.map((p) => [[p.first_name, p.last_name].filter(Boolean).join(" ") || "—", p.email || "—", p.phone || "—", p.mobile || "—"]))) : null,
  ];
}

function contato(d) {
  const pessoas = (d.contact_persons ?? []).filter((p) => !vazio(p.first_name) || !vazio(p.email) || !vazio(p.phone) || !vazio(p.mobile));
  return [
    grade(item("Nome", d.contact_name), item("Empresa", d.company_name !== d.contact_name ? d.company_name : null), item("Tipo", txt(d.contact_type)), item("Pessoa", txt(d.customer_sub_type)),
      item("Código", d.contact_number), item("E-mail", d.email), item("Telefone", d.phone), item("Celular", d.mobile), item("Site", d.website),
      item("Condição de pagamento", d.payment_terms_label), num(d.outstanding_receivable_amount) ? item("A receber", reais(d.outstanding_receivable_amount)) : null,
      num(d.outstanding_payable_amount) ? item("A pagar", reais(d.outstanding_payable_amount)) : null, num(d.unused_credits_receivable_amount) ? item("Créditos", reais(d.unused_credits_receivable_amount)) : null,
      item("Situação", txt(d.status))),
    bloco("Endereços", grade(item("Cobrança", endereco(d.billing_address)), item("Entrega", endereco(d.shipping_address)))),
    pessoas.length ? bloco("Pessoas de contato", tabela([["Nome"], ["Cargo"], ["E-mail"], ["Telefone"], ["Celular"]], pessoas.map((p) => [[p.salutation, p.first_name, p.last_name].filter(Boolean).join(" ") || "—", p.designation || "—", p.email || "—", p.phone || "—", p.mobile || "—"]))) : null,
    bloco("Observações", texto(d.notes)),
  ];
}

function itemCatalogo(d) {
  const venda = num(d.rate), compra = num(d.purchase_rate);
  const margem = venda > 0 && compra > 0 ? `${(((venda - compra) / venda) * 100).toFixed(1).replace(".", ",")}% (sobre a venda)` : null;
  return [
    grade(item("Nome", d.name), item("SKU", d.sku), item("Tipo", txt(d.product_type)), item("Unidade", d.unit), item("Situação", txt(d.status)),
      item("Preço de venda", reais(d.rate)), compra ? item("Preço de compra", reais(d.purchase_rate)) : null, item("Margem sobre o preço", margem),
      item("Marca", d.brand), item("Fabricante", d.manufacturer), item("Fornecedor preferido", d.vendor_name),
      d.track_inventory ? item("Estoque no Zoho", String(d.stock_on_hand ?? 0)) : null, item("Conta de venda", d.account_name), item("Conta de compra", d.purchase_account_name)),
    bloco("Descrição de venda", texto(d.description)),
    bloco("Descrição de compra", texto(d.purchase_description)),
  ];
}

// ---------------------------------------------------------------- generico (CRM, Projects, demais)
// Campos internos (ids, codigos, flags, formatos, URLs) nao aparecem na ficha principal.
const TECNICO = /(^\$)|(^|_)id$|_id$|_ids$|^id_string$|^bcy_|_formatted$|url$|^page_|template|^is_|^can_|lock|hash|precision|rounding|exchange_rate|^tds_|^zcrm_|color_code|orientation|submitter|approver|journey|sub_status|photo|^layout|^smsenabled|^record_status|^locked__s|^tag$|^review|^\w+__s$|^process_flow|^approval|^orchestration|^in_merge|^pathfinder|^change_log|currency_symbol|^data_processing|^enrich/i;
function valorSimples(v) {
  if (typeof v === "boolean") return v ? "Sim" : null; // "Não" nao aparece, como no Zoho
  if (typeof v === "number") return String(v).replace(".", ",");
  if (typeof v === "string") return data(v);
  if (v && typeof v === "object" && !Array.isArray(v)) return v.name ?? v.display_value ?? v.value ?? null;
  if (Array.isArray(v) && v.every((x) => typeof x !== "object")) return v.join(", ");
  return null;
}
export function fichaLimpa(dados, rotulo, jaMostrados = new Set()) {
  const simples = [], listas = [];
  for (const [k, v] of Object.entries(dados ?? {})) {
    if (jaMostrados.has(k) || TECNICO.test(k) || vazio(v)) continue;
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === "object")) {
      const chaves = [...new Set(v.flatMap((x) => Object.keys(x)))].filter((c) => !TECNICO.test(c) && v.some((x) => !vazio(x[c]))).slice(0, 8);
      if (chaves.length) listas.push(bloco(`${rotulo(k)} (${v.length})`, tabela(chaves.map((c) => [rotulo(c)]), v.map((x) => chaves.map((c) => valorSimples(x[c]) ?? "—")))));
      continue;
    }
    const s = valorSimples(v);
    if (!vazio(s) && s !== "0") simples.push(item(rotulo(k), s));
  }
  return [grade(...simples), ...listas];
}

/** Ficha principal do registro, no estilo do Zoho. */
export function fichaZoho(produto, modulo, dados, rotulo) {
  if (produto === "books" && NUMERO[modulo]) return documento(dados, modulo);
  if (produto === "books" && modulo === "contacts") return contato(dados);
  if (produto === "books" && modulo === "items") return itemCatalogo(dados);
  return fichaLimpa(dados, rotulo);
}
