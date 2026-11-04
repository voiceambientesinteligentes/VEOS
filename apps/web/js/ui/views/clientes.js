// CLIENTES do VEOS: lista com busca, cadastro (PF/PJ, contato, obra, origem, parceiro, LGPD) e ficha
// com tudo do cliente: orcamentos, pedidos, oportunidades do funil e historico. Daqui se abre o
// orcamento novo, a oportunidade e a conversa no WhatsApp (envio sempre humano).
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { FASES_OBRA, formatarDocumento, formatarTelefone, normalizarCliente, ORIGENS, rotulo, TIPOS_IMOVEL, UFS } from "../../domain/clientes.js";
import { proximoPasso, SITUACOES } from "../../domain/orcamento.js";
import { telefoneWhatsApp } from "../../domain/proposta.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { formularioRegistro } from "../componentes.js";
import { clear, errorNotice, field, h, panel, stamp, stat, table } from "../dom.js";

const brl = (v) => formatBRL(String(Number(v ?? 0).toFixed(2)));
const opcoes = (lista, atual, vazio = "—") => [h("option", { value: "" }, vazio), ...lista.map(([v, t]) => h("option", { value: v, selected: v === atual }, t))];

/** Formulario de cliente (criar ou alterar). aoSalvar({id, codigo, ...dados}). */
export function formularioCliente(existente, aoSalvar, { compacto = false } = {}) {
  const e = existente ?? {};
  const inp = (id, valor = "", attrs = {}) => h("input", { class: "input", id, type: "text", autocomplete: "off", value: valor ?? "", ...attrs });
  const c = {
    tipo: h("select", { class: "select", id: "cl-tipo" }, h("option", { value: "pf", selected: e.tipo !== "pj" }, "Pessoa física"), h("option", { value: "pj", selected: e.tipo === "pj" }, "Empresa")),
    nome: inp("cl-nome", e.nome, { placeholder: "Nome completo ou razão social" }),
    telefone: inp("cl-telefone", e.telefone ? formatarTelefone(e.telefone) : "", { inputmode: "tel", placeholder: "(47) 99999-9999" }),
    email: inp("cl-email", e.email, { type: "email", placeholder: "nome@email.com" }),
    documento: inp("cl-documento", e.documento ? formatarDocumento(e.documento) : "", { inputmode: "numeric", placeholder: "CPF ou CNPJ (para contrato e nota)" }),
    contato_nome: inp("cl-contato", e.contato_nome, { placeholder: "Quem decide / quem fala com a VOICE" }),
    cidade: inp("cl-cidade", e.cidade, { placeholder: "Balneário Camboriú" }),
    uf: h("select", { class: "select", id: "cl-uf" }, opcoes(UFS.map((u) => [u, u]), e.uf ?? (existente ? "" : "SC"))),
    endereco_obra: inp("cl-endereco", e.endereco_obra, { placeholder: "Endereço da obra / do imóvel" }),
    tipo_imovel: h("select", { class: "select", id: "cl-imovel" }, opcoes(TIPOS_IMOVEL, e.tipo_imovel)),
    fase_obra: h("select", { class: "select", id: "cl-fase" }, opcoes(FASES_OBRA, e.fase_obra)),
    origem: h("select", { class: "select", id: "cl-origem" }, opcoes(ORIGENS, e.origem, "Como chegou?")),
    parceiro: inp("cl-parceiro", e.parceiro, { placeholder: "Arquiteto, designer ou construtora que indicou" }),
    observacao: h("textarea", { class: "input", id: "cl-obs", rows: 2 }, e.observacao ?? ""),
  };
  const aceita = h("input", { type: "checkbox", id: "cl-aceita", checked: e.aceita_contato !== false });
  const erro = h("div", { role: "alert" });
  const botao = h("button", { class: "btn btn-primary", type: "submit" }, existente ? "Salvar alterações" : "Cadastrar cliente");
  const essenciais = [field("cl-tipo", "Tipo", c.tipo), field("cl-nome", "Nome *", c.nome), field("cl-telefone", "Telefone / WhatsApp", c.telefone), field("cl-email", "E-mail", c.email, "Telefone ou e-mail: pelo menos um.")];
  const resto = [field("cl-documento", "CPF / CNPJ", c.documento, "Pode completar depois (obrigatório para contrato e nota)."), field("cl-contato", "Pessoa de contato", c.contato_nome),
    field("cl-cidade", "Cidade", c.cidade), field("cl-uf", "UF", c.uf), field("cl-endereco", "Endereço da obra", c.endereco_obra),
    field("cl-imovel", "Tipo de imóvel", c.tipo_imovel), field("cl-fase", "Fase da obra", c.fase_obra), field("cl-origem", "Origem", c.origem, "Mede qual canal traz cliente."), field("cl-parceiro", "Parceiro indicador", c.parceiro)];
  const form = h("form", { class: "stack-s form-cliente", novalidate: true },
    h("div", { class: "form-grid" }, essenciais, compacto ? null : resto),
    compacto ? h("details", null, h("summary", null, "Mais dados (documento, obra, origem, parceiro)"), h("div", { class: "form-grid" }, resto)) : null,
    field("cl-obs", "Observações", c.observacao),
    h("label", { class: "row field-hint", for: "cl-aceita" }, aceita, "O cliente aceita receber mensagens da VOICE (LGPD). Sem isso, o VEOS não prepara mensagens para ele."),
    h("div", { class: "row" }, botao), erro);
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clear(erro);
    const entrada = Object.fromEntries(Object.entries(c).map(([k, el]) => [k, el.value]));
    entrada.aceita_contato = aceita.checked;
    const { erros } = normalizarCliente(entrada);
    if (erros.length) return erro.append(h("ul", { class: "list-plain" }, erros.map((x) => h("li", { class: "field-error" }, x))));
    botao.disabled = true;
    try {
      const r = await api.clienteSalvar(entrada, existente?.id ?? null);
      aoSalvar({ ...normalizarCliente(entrada).dados, id: r.id, codigo: r.codigo });
    } catch (err) { erro.append(errorNotice(err.message)); } finally { botao.disabled = false; }
  });
  return form;
}

export async function telaClientes(root) {
  const busca = h("input", { class: "input", id: "cl-busca", type: "search", autocomplete: "off", placeholder: "Nome, código, telefone, e-mail ou cidade", "aria-label": "Buscar cliente" });
  const lista = h("div", { "aria-live": "polite" });
  const novo = h("div");
  const botaoNovo = h("button", { class: "btn btn-primary", type: "button" }, "+ Novo cliente");
  botaoNovo.addEventListener("click", () => {
    clear(novo).append(panel({ title: "Novo cliente", subtitle: "O essencial primeiro; o resto pode completar depois." },
      formularioCliente(null, (r) => { location.hash = `#/clientes/${r.id}`; })));
    document.getElementById("cl-nome")?.focus();
  });
  let t;
  async function desenhar() {
    clear(lista).append(h("p", { class: "muted" }, "Carregando…"));
    try {
      const { clientes } = await api.clientes(busca.value.trim());
      clear(lista).append(clientes.length
        ? table({ caption: `${clientes.length} cliente(s)`, head: ["Código", "Cliente", "Cidade", "Contato", "Origem", "Cadastro"],
          rows: clientes.map((x) => [h("a", { href: `#/clientes/${x.id}` }, x.codigo), h("a", { href: `#/clientes/${x.id}` }, x.nome), [x.cidade, x.uf].filter(Boolean).join("/") || "—",
            x.telefone ? formatarTelefone(x.telefone) : x.email ?? "—", rotulo(ORIGENS, x.origem), formatDate(x.criado_em)]) })
        : h("div", { class: "stack-s" }, h("p", { class: "result-empty" }, busca.value.trim() ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda. Comece pelo primeiro:"),
          h("p", { class: "field-hint" }, "Todo contato que virar conversa de projeto vira cliente aqui. Orçamentos antigos do Zoho podem ser retomados em Orçamentos → Retomar do Zoho (o cliente é criado junto).")));
    } catch (e) { clear(lista).append(errorNotice(e.message)); }
  }
  busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(desenhar, 300); });
  root.append(panel({ title: "Clientes", subtitle: "Cadastro próprio do VEOS: quem é, onde é a obra, como chegou e quem indicou.", actions: h("div", { class: "row" }, busca, botaoNovo) }, lista), novo);
  await desenhar();
  if (new URLSearchParams(location.hash.split("?")[1] ?? "").get("novo")) botaoNovo.click();
}

export async function telaCliente(root, id) {
  const d = await api.cliente(id);
  const c = d.cliente;
  const vendas = CATALOGO.find((s) => s.id === "vendas");
  const tel = telefoneWhatsApp(c.telefone);
  const area = h("div", { class: "stack" });
  const editar = h("button", { class: "btn btn-ghost", type: "button" }, "Editar dados");
  editar.addEventListener("click", () => clear(area).append(panel({ title: `Editar ${c.codigo}` }, formularioCliente(c, () => location.reload()))));
  const oport = h("button", { class: "btn btn-ghost", type: "button" }, "+ Oportunidade no funil");
  oport.addEventListener("click", () => {
    const tipo = vendas.registros.find((r) => r.tipo === "oportunidade");
    clear(area).append(panel({ title: "Nova oportunidade", subtitle: "Entra no funil do Comercial com as regras vivas (parada, próximo passo, passagem)." },
      formularioRegistro(vendas, tipo, null, () => location.reload(), { titulo: `Projeto ${c.nome}`.slice(0, 200), dados: { cliente_nome: c.nome, cliente_ref: c.codigo, tipo_imovel: c.tipo_imovel ?? undefined, fase_obra: c.fase_obra ?? undefined, parceiro_indicador: c.parceiro ?? undefined } })));
  });
  const totalAceito = d.orcamentos.filter((o) => o.estado === "aceito").reduce((a, o) => a + Number(o.valor_total), 0);
  const emAberto = d.orcamentos.filter((o) => ["rascunho", "enviado"].includes(o.estado));
  root.append(...[
    h("p", null, h("a", { href: "#/clientes" }, "‹ Clientes")),
    panel({ title: `${c.nome}`, subtitle: `${c.codigo} · ${c.tipo === "pj" ? "Empresa" : "Pessoa física"}${c.estado === "inativo" ? " · INATIVO" : ""}`,
      actions: h("div", { class: "row" }, h("a", { class: "btn btn-primary", href: `#/orcamentos/novo?cliente=${c.id}` }, "+ Novo orçamento"), oport, editar) },
      h("div", { class: "cfo-stats" }, stat("Orçamentos em aberto", String(emAberto.length), emAberto.length ? brl(emAberto.reduce((a, o) => a + Number(o.valor_total), 0)) : "nenhum"),
        stat("Fechado (aceito)", brl(totalAceito), `${d.pedidos.length} pedido(s)`), stat("Oportunidades", String(d.oportunidades.length), "no funil do Comercial")),
      h("dl", { class: "zoho-grade" },
        ...[["Telefone", c.telefone ? formatarTelefone(c.telefone) : "—"], ["E-mail", c.email ?? "—"], ["CPF/CNPJ", c.documento ? formatarDocumento(c.documento) : "falta (necessário para contrato)"],
          ["Contato", c.contato_nome ?? "—"], ["Cidade", [c.cidade, c.uf].filter(Boolean).join("/") || "—"], ["Obra", c.endereco_obra ?? "—"], ["Imóvel", rotulo(TIPOS_IMOVEL, c.tipo_imovel)],
          ["Fase da obra", rotulo(FASES_OBRA, c.fase_obra)], ["Origem", rotulo(ORIGENS, c.origem)], ["Parceiro", c.parceiro ?? "—"], ["Aceita mensagens", c.aceita_contato ? "Sim" : "Não (LGPD)"]]
          .map(([k, v]) => h("div", { class: "zoho-campo" }, h("dt", null, k), h("dd", null, v)))),
      c.observacao ? h("p", { class: "zoho-texto" }, c.observacao) : null,
      h("div", { class: "row" },
        tel && c.aceita_contato ? h("a", { class: "btn btn-ghost", href: `https://wa.me/${tel}`, target: "_blank", rel: "noopener noreferrer" }, "Abrir WhatsApp") : null,
        c.email && c.aceita_contato ? h("a", { class: "btn btn-ghost", href: `mailto:${encodeURIComponent(c.email)}` }, "Escrever e-mail") : null)),
    area,
    panel({ title: "Orçamentos", subtitle: "Do VEOS, com a versão vigente de cada um." },
      d.orcamentos.length ? table({ head: ["Número", "Situação", "Valor", "Validade", "Próximo passo"], align: ["", "", "r", "", ""],
        rows: d.orcamentos.map((o) => [h("a", { href: `#/orcamentos/${o.id}` }, `${o.numero} v${o.versao}`), stamp(...(SITUACOES[o.estado] ?? [o.estado, "neutral"])), brl(o.valor_total), o.validade ? formatDate(o.validade) : "—", proximoPasso(o)]) })
        : h("p", { class: "result-empty" }, "Nenhum orçamento ainda.")),
    d.pedidos.length ? panel({ title: "Pedidos" }, table({ head: ["Pedido", "Situação", "Valor", "Criado"], align: ["", "", "r", ""],
      rows: d.pedidos.map((p) => [h("a", { href: `#/pedidos/${p.id}` }, p.numero), p.estado, brl(p.valor_total), formatDate(p.criado_em)]) })) : null,
    panel({ title: "Funil do Comercial" }, d.oportunidades.length ? table({ head: ["Oportunidade", "Etapa", "Valor", "Atualizada"], align: ["", "", "r", ""],
      rows: d.oportunidades.map((r) => [h("a", { href: "#/setor/vendas/registros" }, r.titulo), r.estado, r.valor ? brl(r.valor) : "—", formatDate(r.atualizado_em)]) })
      : h("p", { class: "result-empty" }, "Sem oportunidade aberta. Use \"+ Oportunidade no funil\" para acompanhar visita, projeto e proposta.")),
    panel({ title: "Histórico do cadastro" }, h("ul", { class: "list-plain stack-s" }, d.historico.map((x) => h("li", { class: "field-hint" }, `${formatDateTime(x.em)} · ${x.acao}${x.detalhe?.campos ? `: ${x.detalhe.campos.join(", ")}` : ""}`)))),
  ].filter(Boolean));
}
