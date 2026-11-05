// FORNECEDORES do VEOS: lista com busca, cadastro (documento, contato, categoria, prazos de pagamento e
// entrega) e ficha com as compras e contas a pagar do fornecedor. Compras e Contas a pagar escolhem
// o fornecedor daqui; o Zoho continua sendo a fonte dos nomes antigos (importar na ficha de compras).
import { api } from "../../data/api.js";
import { CATEGORIAS_FORNECEDOR, formatarDocumento, formatarTelefone, normalizarFornecedor, rotuloCategoria, UFS } from "../../domain/fornecedores.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, panel, stat, table } from "../dom.js";

const brl = (v) => formatBRL(String(Number(v ?? 0).toFixed(2)));

export function formularioFornecedor(existente, aoSalvar) {
  const e = existente ?? {};
  const inp = (id, valor = "", attrs = {}) => h("input", { class: "input", id, type: "text", autocomplete: "off", value: valor ?? "", ...attrs });
  const c = {
    nome: inp("fo-nome", e.nome, { placeholder: "Razão social ou nome" }),
    categoria: h("select", { class: "select", id: "fo-cat" }, CATEGORIAS_FORNECEDOR.map(([v, t]) => h("option", { value: v, selected: v === (e.categoria ?? "outro") }, t))),
    documento: inp("fo-doc", e.documento ? formatarDocumento(e.documento) : "", { inputmode: "numeric", placeholder: "CNPJ ou CPF" }),
    contato_nome: inp("fo-contato", e.contato_nome, { placeholder: "Vendedor / contato" }),
    telefone: inp("fo-tel", e.telefone ? formatarTelefone(e.telefone) : "", { inputmode: "tel", placeholder: "(47) 3333-4444" }),
    email: inp("fo-email", e.email, { type: "email" }),
    cidade: inp("fo-cidade", e.cidade),
    uf: h("select", { class: "select", id: "fo-uf" }, [h("option", { value: "" }, "—"), ...UFS.map((u) => h("option", { value: u, selected: u === e.uf }, u))]),
    prazo_pagamento_dias: inp("fo-pag", e.prazo_pagamento_dias ?? "", { inputmode: "numeric", placeholder: "ex.: 28" }),
    prazo_entrega_dias: inp("fo-ent", e.prazo_entrega_dias ?? "", { inputmode: "numeric", placeholder: "ex.: 7" }),
    condicao: inp("fo-cond", e.condicao, { placeholder: "ex.: 30% na compra, saldo em 28 dias; frete CIF" }),
    observacao: h("textarea", { class: "input", id: "fo-obs", rows: 2 }, e.observacao ?? ""),
  };
  const erro = h("div", { role: "alert" });
  const botao = h("button", { class: "btn btn-primary", type: "submit" }, existente ? "Salvar alterações" : "Cadastrar fornecedor");
  const form = h("form", { class: "stack-s", novalidate: true },
    h("div", { class: "form-grid" },
      field("fo-nome", "Nome *", c.nome), field("fo-cat", "Categoria", c.categoria), field("fo-doc", "CNPJ / CPF", c.documento), field("fo-contato", "Contato", c.contato_nome),
      field("fo-tel", "Telefone", c.telefone), field("fo-email", "E-mail", c.email), field("fo-cidade", "Cidade", c.cidade), field("fo-uf", "UF", c.uf),
      field("fo-pag", "Prazo de pagamento (dias)", c.prazo_pagamento_dias, "Quantos dias o fornecedor dá para pagar."), field("fo-ent", "Prazo de entrega (dias)", c.prazo_entrega_dias),
      field("fo-cond", "Condição comercial", c.condicao)),
    field("fo-obs", "Observações", c.observacao), h("div", { class: "row" }, botao), erro);
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clear(erro);
    const entrada = Object.fromEntries(Object.entries(c).map(([k, el]) => [k, el.value]));
    const { erros } = normalizarFornecedor(entrada);
    if (erros.length) return erro.append(h("ul", { class: "list-plain" }, erros.map((x) => h("li", { class: "field-error" }, x))));
    botao.disabled = true;
    try {
      const r = await api.fornecedorSalvar(entrada, existente?.id ?? null);
      aoSalvar({ id: r.id, codigo: r.codigo });
    } catch (err) { erro.append(errorNotice(err.message)); } finally { botao.disabled = false; }
  });
  return form;
}

export async function telaFornecedores(root) {
  const busca = h("input", { class: "input", id: "fo-busca", type: "search", autocomplete: "off", placeholder: "Nome, código, CNPJ, telefone ou cidade", "aria-label": "Buscar fornecedor" });
  const lista = h("div", { "aria-live": "polite" });
  const novo = h("div");
  const botaoNovo = h("button", { class: "btn btn-primary", type: "button" }, "+ Novo fornecedor");
  botaoNovo.addEventListener("click", () => {
    clear(novo).append(panel({ title: "Novo fornecedor", subtitle: "Só o nome é obrigatório; o resto ajuda a comprar e pagar melhor." }, formularioFornecedor(null, (r) => { location.hash = `#/fornecedores/${r.id}`; })));
    document.getElementById("fo-nome")?.focus();
  });
  let t;
  async function desenhar() {
    clear(lista).append(h("p", { class: "muted" }, "Carregando…"));
    try {
      const { fornecedores } = await api.fornecedores(busca.value.trim());
      clear(lista).append(fornecedores.length
        ? table({ caption: `${fornecedores.length} fornecedor(es)`, head: ["Código", "Fornecedor", "Categoria", "Contato", "Paga em", "Entrega"],
          rows: fornecedores.map((x) => [h("a", { href: `#/fornecedores/${x.id}` }, x.codigo), h("a", { href: `#/fornecedores/${x.id}` }, x.nome), rotuloCategoria(x.categoria),
            x.telefone ? formatarTelefone(x.telefone) : x.email ?? "—", x.prazo_pagamento_dias != null ? `${x.prazo_pagamento_dias} dias` : "—", x.prazo_entrega_dias != null ? `${x.prazo_entrega_dias} dias` : "—"]) })
        : h("div", { class: "stack-s" }, h("p", { class: "result-empty" }, busca.value.trim() ? "Nenhum fornecedor encontrado." : "Nenhum fornecedor cadastrado ainda."),
          h("p", { class: "field-hint" }, "Cadastre aqui quem vende para a VOICE. Ao registrar uma compra, escolha o fornecedor da lista; os nomes antigos do Zoho aparecem na lista e podem ser importados na hora.")));
    } catch (e) { clear(lista).append(errorNotice(e.message)); }
  }
  busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(desenhar, 300); });
  root.append(panel({ title: "Fornecedores", subtitle: "Cadastro próprio do VEOS: quem vende para a VOICE, prazos e condições.", actions: h("div", { class: "row" }, busca, botaoNovo) }, lista), novo);
  await desenhar();
  if (new URLSearchParams(location.hash.split("?")[1] ?? "").get("novo")) botaoNovo.click();
}

export async function telaFornecedor(root, id) {
  const d = await api.fornecedor(id);
  const f = d.fornecedor;
  const area = h("div", { class: "stack" });
  const editar = h("button", { class: "btn btn-ghost", type: "button" }, "Editar dados");
  editar.addEventListener("click", () => clear(area).append(panel({ title: `Editar ${f.codigo}` }, formularioFornecedor(f, () => location.reload()))));
  const alternar = h("button", { class: "btn btn-ghost", type: "button" }, f.estado === "ativo" ? "Inativar" : "Reativar");
  alternar.addEventListener("click", async () => {
    alternar.disabled = true;
    try { await api.fornecedorSalvar({ estado: f.estado === "ativo" ? "inativo" : "ativo" }, f.id); location.reload(); } catch (e) { alternar.after(errorNotice(e.message)); alternar.disabled = false; }
  });
  const comprado = d.compras.filter((c) => c.estado !== "cancelada").reduce((s, c) => s + Number(c.valor_total), 0);
  const aPagar = d.contas.filter((k) => k.estado === "aberta").reduce((s, k) => s + Number(k.valor), 0);
  root.append(
    h("p", null, h("a", { href: "#/fornecedores" }, "‹ Fornecedores")),
    panel({ title: f.nome, subtitle: `${f.codigo} · ${rotuloCategoria(f.categoria)}${f.estado === "inativo" ? " · INATIVO" : ""}`, actions: h("div", { class: "row" }, h("a", { class: "btn btn-primary", href: "#/compras/nova" }, "+ Nova compra"), editar, alternar) },
      h("div", { class: "cfo-stats" }, stat("Comprado", brl(comprado), `${d.compras.length} compra(s)`), stat("A pagar (em aberto)", brl(aPagar), `${d.contas.filter((k) => k.estado === "aberta").length} conta(s)`),
        stat("Prazo de pagamento", f.prazo_pagamento_dias != null ? `${f.prazo_pagamento_dias} dias` : "—", f.condicao ?? "condição não informada")),
      h("dl", { class: "zoho-grade" },
        ...[["CNPJ/CPF", f.documento ? formatarDocumento(f.documento) : "—"], ["Contato", f.contato_nome ?? "—"], ["Telefone", f.telefone ? formatarTelefone(f.telefone) : "—"], ["E-mail", f.email ?? "—"],
          ["Cidade", [f.cidade, f.uf].filter(Boolean).join("/") || "—"], ["Prazo de entrega", f.prazo_entrega_dias != null ? `${f.prazo_entrega_dias} dias` : "—"], ["Origem", f.zoho_vendor_id ? "Importado do Zoho" : "Cadastro no VEOS"]]
          .map(([k, v]) => h("div", { class: "zoho-campo" }, h("dt", null, k), h("dd", null, v)))),
      f.observacao ? h("p", { class: "zoho-texto" }, f.observacao) : null),
    area,
    panel({ title: "Compras" }, d.compras.length ? table({ head: ["Número", "Situação", "Total", "Previsão", "Registrada"], align: ["", "", "r", "", ""],
      rows: d.compras.map((c) => [h("a", { href: `#/compras/${c.id}` }, c.numero), c.estado, brl(c.valor_total), c.previsao_entrega ? formatDate(c.previsao_entrega) : "—", formatDate(c.criado_em)]) })
      : h("p", { class: "result-empty" }, "Nenhuma compra com este fornecedor.")),
    panel({ title: "Contas a pagar" }, d.contas.length ? table({ head: ["Descrição", "Vencimento", "Valor", "Situação"], align: ["", "", "r", ""],
      rows: d.contas.map((k) => [k.descricao, formatDate(k.vencimento), brl(k.valor), k.estado]) }) : h("p", { class: "result-empty" }, "Nenhuma conta a pagar.")),
    panel({ title: "Histórico do cadastro" }, h("ul", { class: "list-plain stack-s" }, d.historico.map((x) => h("li", { class: "field-hint" }, `${formatDateTime(x.em)} · ${x.acao}${x.detalhe?.campos ? `: ${x.detalhe.campos.join(", ")}` : ""}`)))));
}
