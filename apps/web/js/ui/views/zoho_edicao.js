// Edicao nos dois sentidos: formulario gerado a partir dos campos editaveis do modulo
// (Books/Projects: lista do VEOS; CRM: metadados do proprio Zoho). Grava no Zoho e o espelho
// do VEOS e atualizado na hora. Em alteracao, so os campos mudados sao enviados.
import { api } from "../../data/api.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { clear, errorNotice, field, h, panel } from "../dom.js";

const EDITAVEIS = { books: ["contacts", "items", "estimates"], projects: ["tasks"] };
export const podeEditar = (produto, modulo) => produto === "crm" || (EDITAVEIS[produto] ?? []).includes(modulo);
const OPCAO_TXT = { customer: "Cliente", vendor: "Fornecedor", business: "Empresa", individual: "Pessoa física", goods: "Produto", service: "Serviço", none: "Nenhuma", low: "Baixa", medium: "Média", high: "Alta" };

/** Valor atual de um campo a partir do registro do Zoho (inclui caminhos do VEOS como contato.email). */
function atual(dados, id) {
  if (!dados) return "";
  if (id.startsWith("contato.")) {
    const p = (dados.contact_persons ?? []).find((x) => x.is_primary_contact) ?? {};
    return p[id.slice(8)] ?? "";
  }
  const v = id.split(".").reduce((o, k) => (o == null ? o : o[k]), dados);
  return v ?? "";
}
const paraInput = (tipo, v) => {
  if (v === null || v === undefined) return "";
  if (tipo === "datahora" && v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? "" : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  if (tipo === "dinheiro" && v !== "") return String(Number(v).toFixed(2)).replace(".", ",");
  return String(v);
};

function controle(c, valor) {
  const id = `ze-${c.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;
  let el;
  if (c.tipo === "texto_longo") el = h("textarea", { class: "input", id, rows: 4 }, valor);
  else if (c.tipo === "opcao") el = h("select", { class: "select", id }, h("option", { value: "" }, "—"), (c.opcoes ?? []).map((o) => h("option", { value: o, selected: String(valor) === o }, OPCAO_TXT[o] ?? o)));
  else if (c.tipo === "sim_nao") el = h("input", { type: "checkbox", id, checked: valor === true || valor === "true" });
  else el = h("input", { class: `input${["dinheiro", "numero"].includes(c.tipo) ? " num" : ""}`, id, autocomplete: "off",
    type: c.tipo === "data" ? "date" : c.tipo === "datahora" ? "datetime-local" : c.tipo === "email" ? "email" : c.tipo === "telefone" ? "tel" : "text",
    inputmode: ["dinheiro", "numero"].includes(c.tipo) ? "decimal" : null, value: valor });
  return { id, el, ler: () => (c.tipo === "sim_nao" ? el.checked : el.value) };
}

function converter(c, bruto) {
  if (c.tipo === "dinheiro") { if (bruto === "") return ""; const v = parseMoneyInput(bruto); if (v === null) throw new Error(`${c.rotulo}: valor em reais inválido`); return v; }
  if (c.tipo === "numero") { if (bruto === "") return ""; const s = String(bruto).replace(",", "."); if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`${c.rotulo}: número inválido`); return s; }
  if (c.tipo === "datahora" && bruto) return new Date(bruto).toISOString();
  return bruto;
}

// seletor que busca no espelho (clientes, itens)
function seletor(modulo, rotulo, aoEscolher) {
  const busca = h("input", { class: "input", type: "search", placeholder: `Buscar ${rotulo}`, autocomplete: "off", "aria-label": `Buscar ${rotulo}` });
  const lista = h("ul", { class: "list-plain zoho-sugestoes" });
  let t;
  busca.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      clear(lista);
      if (busca.value.trim().length < 2) return;
      try {
        const d = await api.zohoEspelhoLista("books", modulo, busca.value.trim(), 1);
        for (const l of d.linhas.slice(0, 8)) {
          const b = h("button", { class: "btn btn-ghost", type: "button" }, l.nome);
          b.addEventListener("click", () => { aoEscolher(l); clear(lista); busca.value = ""; });
          lista.append(h("li", null, b));
        }
      } catch (e) { lista.append(h("li", null, e.message)); }
    }, 300);
  });
  return h("div", { class: "stack-s" }, busca, lista);
}

function editorItens(itensIniciais) {
  const corpo = h("tbody");
  const linhas = [];
  function adicionar(it = {}) {
    const nome = h("input", { class: "input", type: "text", value: it.name ?? "", "aria-label": "Item", readonly: Boolean(it.item_id) });
    const desc = h("input", { class: "input", type: "text", value: it.description ?? "", "aria-label": "Descrição" });
    const qtd = h("input", { class: "input num", type: "text", inputmode: "decimal", value: String(it.quantity ?? 1).replace(".", ","), "aria-label": "Quantidade" });
    const preco = h("input", { class: "input num", type: "text", inputmode: "decimal", value: it.rate !== undefined ? Number(it.rate).toFixed(2).replace(".", ",") : "", "aria-label": "Preço" });
    const desconto = h("input", { class: "input num", type: "text", value: it.discount ? String(it.discount) : "", "aria-label": "Desconto", placeholder: "ex.: 5%" });
    const rem = h("button", { class: "btn btn-ghost", type: "button", "aria-label": "Remover item" }, "×");
    const linha = { it, nome, desc, qtd, preco, desconto };
    const tr = h("tr", null, [nome, desc, qtd, preco, desconto, rem].map((x) => h("td", null, x)));
    rem.addEventListener("click", () => { tr.remove(); linhas.splice(linhas.indexOf(linha), 1); });
    linhas.push(linha);
    corpo.append(tr);
  }
  (itensIniciais ?? []).forEach(adicionar);
  const el = h("div", { class: "stack-s" },
    h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, h("tr", null, ["Item", "Descrição", "Qtd", "Preço (R$)", "Desconto", ""].map((t) => h("th", { scope: "col" }, t)))), corpo)),
    h("div", { class: "row" },
      seletor("items", "item do catálogo", (l) => adicionar({ item_id: l.id, name: l.campos?.name ?? l.nome, rate: l.campos?.rate, description: l.campos?.description ?? "" })),
      (() => { const b = h("button", { class: "btn btn-ghost", type: "button" }, "+ Linha livre"); b.addEventListener("click", () => adicionar({})); return b; })()));
  const ler = () => linhas.map((l, i) => {
    const q = String(l.qtd.value).replace(/\./g, "").replace(",", ".");
    const r = parseMoneyInput(l.preco.value);
    if (!/^\d+(\.\d+)?$/.test(q) || Number(q) <= 0) throw new Error(`Item ${i + 1}: quantidade inválida`);
    if (r === null) throw new Error(`Item ${i + 1}: preço inválido`);
    const o = { quantity: q, rate: r, description: l.desc.value };
    if (l.it.item_id) o.item_id = l.it.item_id; else if (!l.nome.value.trim()) throw new Error(`Item ${i + 1}: informe o nome`); else o.name = l.nome.value.trim();
    if (l.it.line_item_id) o.line_item_id = l.it.line_item_id;
    if (l.it.header_name) o.header_name = l.it.header_name;
    if (l.desconto.value.trim()) o.discount = l.desconto.value.trim();
    return o;
  });
  return { el, ler };
}

/** Formulario de criar (registro null) ou alterar um registro do Zoho. */
export async function formularioZoho(area, { produto, modulo, id, registro, nomeModulo, aoSalvar }) {
  const { campos } = await api.zohoCampos(produto, modulo);
  if (!campos.length) return area.append(errorNotice("Este módulo ainda não pode ser editado pelo VEOS."));
  const dados = registro?.dados ?? null;
  const controles = [];
  let itens = null;
  const grupos = new Map();
  let cliente = null;
  for (const c of campos) {
    if (c.tipo === "itens") { itens = editorItens(dados?.line_items); continue; }
    if (c.id === "customer_id") {
      const nome = h("strong", null, dados?.customer_name ?? "nenhum escolhido");
      cliente = { valor: dados?.customer_id ?? "", el: null };
      cliente.el = field("ze-cliente", "Cliente", h("div", { class: "stack-s", id: "ze-cliente" }, nome, seletor("contacts", "cliente", (l) => { cliente.valor = l.id; nome.textContent = l.nome; })));
      continue;
    }
    const inicial = paraInput(c.tipo, atual(dados, c.id));
    const ctl = controle(c, inicial);
    controles.push({ c, ctl, inicial });
    const g = c.grupo ?? "Dados";
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(field(ctl.id, `${c.rotulo}${c.obrigatorio ? " *" : ""}`, ctl.el));
  }
  const erro = h("div", { role: "alert" });
  const salvar = h("button", { class: "btn btn-primary", type: "submit" }, registro ? "Salvar no Zoho" : "Criar no Zoho");
  const form = h("form", { class: "stack", novalidate: true },
    cliente?.el ?? null,
    [...grupos.entries()].map(([g, fs]) => h("fieldset", { class: "zoho-grupo" }, h("legend", null, g), h("div", { class: "form-grid" }, fs))),
    itens ? h("fieldset", { class: "zoho-grupo" }, h("legend", null, "Itens"), itens.el) : null,
    h("div", { class: "row" }, salvar, h("span", { class: "field-hint" }, "Grava direto no Zoho e atualiza o VEOS. Fica registrado quem alterou.")), erro);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(erro);
    const envio = {};
    try {
      for (const { c, ctl, inicial } of controles) {
        const bruto = ctl.ler();
        if (registro && String(bruto) === String(inicial)) continue; // alteracao: so o que mudou
        if (!registro && (bruto === "" || bruto === false)) continue;
        envio[c.id] = converter(c, bruto);
      }
      if (cliente && (!registro || cliente.valor !== (dados?.customer_id ?? ""))) { if (!cliente.valor) throw new Error("Escolha o cliente"); envio.customer_id = cliente.valor; }
      if (itens) envio.line_items = itens.ler();
    } catch (x) { return erro.append(errorNotice(x.message)); }
    const n = Object.keys(envio).length;
    if (!n) return erro.append(h("p", { class: "field-hint" }, "Nada mudou."));
    if (!confirm(`${registro ? "Alterar" : "Criar"} no Zoho (${nomeModulo}): ${n} campo(s). Confirma?`)) return;
    salvar.disabled = true;
    try {
      const r = await api.zohoEscrever(produto, modulo, id, envio, registro?.modificado_em);
      aoSalvar(r.id);
    } catch (x) { erro.append(errorNotice(x.message)); salvar.disabled = false; }
  });
  area.append(panel({ title: registro ? `Editar: ${registro.nome ?? id}` : `Novo registro: ${nomeModulo}`, subtitle: `Zoho ${produto === "crm" ? "CRM" : produto === "books" ? "Books" : "Projects"} · campos editáveis` }, form));
}
