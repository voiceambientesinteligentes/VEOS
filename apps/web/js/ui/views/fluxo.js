// Operacao: fluxo vivo da VOICE. Pedido (a partir do orcamento aceito no Zoho) -> reserva e
// baixa de estoque -> parcelas -> nota fiscal (emitida a mao e registrada aqui) -> recebimento.
// Cada acao roda a vigia: alertas FLX_* aparecem e somem sozinhos no Radar.
import { api } from "../../data/api.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, method, panel, stamp, stat, table } from "../dom.js";
import { barrasMensais } from "../grafico.js";
import { painelAceite, painelHoras, painelMargem, painelObra } from "./obra.js";

const ESTADOS = {
  rascunho: ["Rascunho", "neutral"], confirmado: ["Confirmado", "live"], entregue: ["Entregue", "warn"],
  faturado: ["Faturado", "ok"], concluido: ["Concluído", "ok"], cancelado: ["Cancelado", "risk"],
};
const brl = (v) => (v === null || v === undefined ? "—" : formatBRL(String(v)));
const qtd = (v) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 3 }));
const estado = (e) => stamp(...(ESTADOS[e] ?? [e, "neutral"]));
const hoje = () => new Date().toISOString().slice(0, 10);
const botao = (texto, tom = "ghost") => h("button", { class: `btn btn-${tom}`, type: "button" }, texto);
const inp = (attrs = {}) => h("input", { class: "input", type: "text", autocomplete: "off", ...attrs });
const MES = (ym) => new Date(`${ym}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

/** Executa uma acao com botao travado e mensagem de erro no lugar certo. */
function acao(b, saida, fn) {
  b.addEventListener("click", async () => {
    b.disabled = true;
    clear(saida);
    try { await fn(); } catch (e) { saida.append(errorNotice(e.message)); b.disabled = false; }
  });
  return b;
}

// ---------------------------------------------------------------- Pedidos (lista + resumo + novo)
export async function telaPedidos(root) {
  const [resumo, { pedidos }, { orcamentos }] = await Promise.all([api.fluxoResumo(), api.fluxoPedidos(), api.fluxoOrcamentosAceitos().catch(() => ({ orcamentos: [] }))]);
  const n = (e) => resumo.pedidos[e]?.quantidade ?? 0;
  root.append(
    h("div", { class: "form-grid" },
      stat("Pedidos em andamento", String(n("rascunho") + n("confirmado") + n("entregue")), `${n("confirmado")} confirmado(s) · ${n("entregue")} entregue(s) sem NF`),
      stat("A receber", brl(resumo.a_receber), `vencido: ${brl(resumo.vencido)}`),
      stat("Faturado no mês", brl(resumo.faturado_mes), "notas fiscais registradas"),
      stat("Recebido no mês", brl(resumo.recebido_mes))),
    panel({ title: "Pedidos", subtitle: "Do orçamento aceito à nota fiscal e ao recebimento. Clique para abrir." },
      pedidos.length
        ? table({ caption: `${pedidos.length} pedido(s)`, head: ["Pedido", "Cliente", "Orçamento", "Situação", "Total", "Criado"], align: ["", "", "", "", "r", ""],
            rows: pedidos.map((p) => [h("a", { href: `#/pedidos/${p.id}` }, p.numero), p.cliente_nome, p.orcamento_numero ?? "—", estado(p.estado), brl(p.valor_total), formatDate(p.criado_em)]) })
        : h("p", { class: "result-empty" }, "Nenhum pedido ainda. Crie o primeiro a partir de um orçamento aceito abaixo.")),
    panel({ title: "Novo pedido a partir de orçamento aceito", subtitle: "Orçamentos aceitos no Zoho Books que ainda não viraram pedido. Itens, preços e custos vêm do orçamento e do cadastro." },
      orcamentos.length ? listaAceitos(orcamentos) : h("p", { class: "result-empty" }, "Nenhum orçamento aceito sem pedido.")));
}

function listaAceitos(orcamentos) {
  const saida = h("div", { role: "status" });
  return h("div", { class: "stack-s" }, saida, table({
    caption: `${orcamentos.length} orçamento(s) aceito(s)`, head: ["Orçamento", "Cliente", "Data", "Total", ""], align: ["", "", "", "r", ""],
    rows: orcamentos.map((o) => [o.nome, o.cliente ?? "—", o.data ? formatDate(o.data) : "—", brl(o.total),
      acao(botao("Criar pedido", "primary"), saida, async () => { const r = await api.fluxoCriarPedido({ orcamento_zoho_id: o.zoho_id }); location.hash = `#/pedidos/${r.id}`; })]),
  }));
}

// ---------------------------------------------------------------- Pedido (detalhe e acoes)
export async function telaPedido(root, id, eu) {
  let d = await api.fluxoPedido(id);
  const desenhar = (msg) => {
    clear(root);
    const p = d.pedido;
    const saida = h("div", { role: "status" });
    const acoes = h("div", { class: "row" });
    const faltas = d.itens.filter((i) => i.tipo === "produto" && i.item_id && Number(i.reservado_pedido) < Number(i.quantidade));
    const refazer = (fn) => async () => { const r = await fn(); d = r.pedido ? r : await api.fluxoPedido(id); desenhar(r.resultado?.faltas?.length ? `Confirmado. Faltam em estoque: ${r.resultado.faltas.map((f) => `${f.nome} (${qtd(f.falta)})`).join(", ")}. O Radar avisou Operações.` : "Feito."); };
    if (p.estado === "rascunho") acoes.append(acao(botao("Confirmar pedido", "primary"), saida, refazer(() => api.fluxoAcao(id, "confirmar"))));
    if (p.estado === "confirmado" && faltas.length) acoes.append(acao(botao("Completar reserva"), saida, refazer(() => api.fluxoAcao(id, "reservar"))));
    if (p.estado === "confirmado") acoes.append(acao(botao("Registrar entrega (baixa estoque)", "primary"), saida, refazer(() => { if (!confirm("Registrar a entrega e baixar o estoque dos produtos?")) throw new Error("Cancelado."); return api.fluxoAcao(id, "entregar"); })));
    if (p.estado === "confirmado" && faltas.length) acoes.append(h("a", { class: "btn btn-ghost", href: `#/compras/nova?pedido=${id}` }, "Comprar o que falta"));
    if (p.estado !== "cancelado") acoes.append(h("a", { class: "btn btn-ghost", href: `#/pedidos/${id}/contrato` }, "Gerar contrato (PDF)"));
    if (["rascunho", "confirmado"].includes(p.estado) && eu?.papel === "direcao") acoes.append(acao(botao("Cancelar pedido"), saida, refazer(() => {
      const motivo = prompt("Motivo do cancelamento:"); if (!motivo) throw new Error("Informe o motivo."); return api.fluxoAcao(id, "cancelar", { motivo });
    })));
    const custo = p.custo_total !== null ? Number(p.custo_total) : null;
    root.append(...[
      h("p", null, h("a", { href: "#/pedidos" }, "‹ Pedidos")),
      msg ? h("p", { class: "notice notice-ok", role: "status" }, msg) : null,
      panel({ title: `${p.numero} · ${p.cliente_nome}`, subtitle: `${p.orcamento_numero ? `Orçamento ${p.orcamento_numero} (Zoho) · ` : ""}criado em ${formatDateTime(p.criado_em)}`, actions: estado(p.estado) },
        h("div", { class: "form-grid" },
          stat("Total do pedido", brl(p.valor_total)),
          stat("Custo dos itens", custo === null ? "incompleto" : brl(custo), custo === null ? "item sem preço de compra no cadastro" : `margem bruta ${brl(Number(p.valor_total) - custo)}`),
          stat("Parcelas", String(d.parcelas.length), brl(d.parcelas.filter((x) => x.estado !== "cancelada").reduce((s, x) => s + Number(x.valor), 0).toFixed(2))),
          stat("Notas fiscais", String(d.notas.length), brl(d.notas.reduce((s, x) => s + Number(x.valor), 0).toFixed(2)))),
        acoes, saida),
      panel({ title: "Itens", subtitle: "Produtos reservam estoque na confirmação e baixam na entrega. Serviços não mexem no estoque." },
        table({ head: ["Item", "Tipo", "Qtd", "Preço", "Custo", "Reservado", "Estoque (físico / reservado)"], align: ["", "", "r", "r", "r", "r", ""],
          rows: d.itens.map((i) => [i.item_id ? h("a", { href: `#/estoque/${encodeURIComponent(i.item_id)}` }, i.nome) : i.nome, i.tipo === "produto" ? "Produto" : "Serviço", qtd(i.quantidade), brl(i.preco_unit), brl(i.custo_unit),
            i.tipo === "produto" && i.item_id ? (Number(i.reservado_pedido) < Number(i.quantidade) && p.estado === "confirmado" ? stamp(`${qtd(i.reservado_pedido)} (faltam ${qtd(i.quantidade - i.reservado_pedido)})`, "risk") : qtd(i.reservado_pedido)) : "—",
            i.estoque ? `${qtd(i.estoque.fisico)} / ${qtd(i.estoque.reservado)}` : "—"]) })),
      d.caixa ? painelCaixa(d) : null,
      p.estado !== "cancelado" ? painelRt(d, id, eu, (m) => api.fluxoPedido(id).then((x) => { d = x; desenhar(m); })) : null,
      d.margem && p.estado !== "rascunho" ? painelMargem(d, id, eu, (m) => api.fluxoPedido(id).then((x) => { d = x; desenhar(m); })) : null,
      ["confirmado", "entregue", "faturado", "concluido"].includes(p.estado) ? painelObra(d, id, (m) => api.fluxoPedido(id).then((x) => { d = x; desenhar(m); })) : null,
      ["confirmado", "entregue", "faturado", "concluido"].includes(p.estado) ? painelHoras(d, id, (m) => api.fluxoPedido(id).then((x) => { d = x; desenhar(m); })) : null,
      !["rascunho", "cancelado"].includes(p.estado) ? painelAceite(d, id, (m) => api.fluxoPedido(id).then((x) => { d = x; desenhar(m); })) : null,
      painelParcelas(d, id, eu, () => api.fluxoPedido(id).then((x) => { d = x; desenhar("Parcelas atualizadas."); })),
      painelNotas(d, id, eu, (r) => { d = r; desenhar("Nota fiscal registrada."); }),
      painelAnexos(d, id, () => api.fluxoPedido(id).then((x) => { d = x; desenhar("Anexo enviado."); })),
      panel({ title: "Histórico", subtitle: "Não pode ser alterado nem apagado." },
        h("ul", { class: "list-plain stack-s" }, d.historico.map((x) => h("li", null, h("strong", null, x.acao.replace("_", " ")), ` · ${formatDateTime(x.em)}`, Object.keys(x.detalhe ?? {}).length ? h("span", { class: "field-hint" }, ` · ${Object.entries(x.detalhe).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.map((f) => (f && typeof f === "object" ? `${f.nome ?? ""} ${f.falta ? `(falta ${qtd(f.falta)})` : ""}`.trim() : f)).join(", ") || "nenhuma" : v}`).join(" · ")}`) : null)))),
    ].filter(Boolean));
  };
  desenhar();
}

// RT (arquiteto) e comissao/indicacao do pedido: viram contas a pagar sozinhas no momento definido
// (padrao: na assinatura, logo depois da entrada do cliente; decisao do fundador em 06/10/2026).
const QUANDO_RT = { assinatura: "na assinatura (depois da entrada)", parcelas: "a cada parcela recebida", fim: "no fim da obra (última parcela)" };
function painelRt(d, id, eu, recarregar) {
  const p = d.pedido;
  const total = Number(p.valor_total);
  const rt = Number(p.rt_pct ?? 0), com = Number(p.comissao_pct ?? 0);
  const saida = h("div", { role: "status" });
  const definido = p.rt_quando !== null && p.rt_quando !== undefined;
  const resumo = definido
    ? h("div", { class: "form-grid" },
      stat("RT", `${String(rt).replace(".", ",")}%`, `${brl((total * rt) / 100)} · ${p.rt_favorecido ?? "arquiteto (favorecido não informado)"}`),
      stat("Comissão / indicação", `${String(com).replace(".", ",")}%`, com ? `${brl((total * com) / 100)} · ${p.comissao_favorecido ?? "favorecido não informado"}` : "sem comissão neste pedido"),
      stat("Quando paga", QUANDO_RT[p.rt_quando] ?? p.rt_quando, "vira conta a pagar do pedido sozinha"))
    : h("p", { class: "notice notice-warn" }, "Pedido sem RT/comissão definida (anterior a 06/10/2026). Defina abaixo para gerar as contas a pagar.");
  if (!["direcao", "vendas", "financas"].includes(eu?.papel) || ["concluido"].includes(p.estado)) return panel({ title: "RT e comissão", subtitle: "Custo variável do pedido (Política V1 sec.5)." }, resumo);
  const iRt = h("input", { class: "input num", id: "rt-pct", inputmode: "decimal", value: String(definido ? rt : 10).replace(".", ",") });
  const iFav = h("input", { class: "input", id: "rt-fav", value: p.rt_favorecido ?? "", placeholder: "arquiteto ou escritório" });
  const iCom = h("input", { class: "input num", id: "rt-com", inputmode: "decimal", value: String(definido ? com : 0).replace(".", ",") });
  const iFavC = h("input", { class: "input", id: "rt-favc", value: p.comissao_favorecido ?? "", placeholder: "quem recebe a comissão" });
  const iQ = h("select", { class: "select", id: "rt-quando" }, Object.entries(QUANDO_RT).map(([v, t]) => h("option", { value: v, selected: v === (p.rt_quando ?? "assinatura") }, t)));
  const form = h("form", { class: "stack-s", novalidate: true }, h("div", { class: "form-grid" }, field(iRt.id, "RT (%)", iRt), field(iFav.id, "Favorecido da RT", iFav), field(iCom.id, "Comissão/indicação (%)", iCom, "Quando houver (normalmente 5%)"), field(iFavC.id, "Favorecido da comissão", iFavC), field(iQ.id, "Quando paga", iQ)),
    h("div", { class: "row" }, h("button", { class: "btn btn-ghost", type: "submit" }, "Salvar RT e comissão")), saida);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(saida);
    try {
      await api.fluxoAcao(id, "rt", { rt_pct: Number(iRt.value.replace(",", ".")), comissao_pct: Number(iCom.value.replace(",", ".")), rt_favorecido: iFav.value, comissao_favorecido: iFavC.value, rt_quando: iQ.value });
      await recarregar("RT e comissão salvas.");
    } catch (err) { saida.append(errorNotice(err.message)); }
  });
  return panel({ title: "RT e comissão", subtitle: "Custo variável do pedido (Política V1 sec.5): viram contas a pagar do pedido no momento escolhido e entram no caixa do pedido (V1.1)." }, resumo, method("Ajustar", form));
}

// Caixa do pedido pela Politica V1.1: recebido efetivo - compromissos (compras e contas do pedido).
const GATILHO = { ACIONADO: ["Acima de 10%", "risk"], "NAO ACIONADO": ["Dentro de 10%", "ok"] };
function painelCaixa(d) {
  const c = d.caixa;
  const [rot, tom] = GATILHO[c.gatilho] ?? ["Sem contrato", "warn"];
  return panel({ title: "Caixa do pedido (Política V1.1)", subtitle: "Posição = recebido efetivo − compromissos (compras e contas lançadas para este pedido).", actions: stamp(rot, tom) },
    h("div", { class: "grid-4" }, stat("Recebido", c.recebido), stat("Compromissos", c.compromissos, `${c.contas} conta(s)`), stat("Posição", c.posicao), stat("Exposição", c.exposicao, c.pct ? `${c.pct} do pedido${c.gatilho === "ACIONADO" ? " · acima de 10%: exige autorização expressa da direção" : ""}` : "—")),
    d.compras?.length ? table({ caption: "Compras deste pedido", head: ["Compra", "Fornecedor", "Total", "Situação"], align: ["", "", "r", ""],
      rows: d.compras.map((x) => [h("a", { href: `#/compras/${x.id}` }, x.numero), x.fornecedor_nome, brl(x.valor_total), x.estado]) }) : null,
    method("Fonte", c.fonte));
}

function painelParcelas(d, id, eu, recarregar) {
  const p = d.pedido;
  const saida = h("div", { role: "status" });
  const lista = d.parcelas.length
    ? table({ head: ["Nº", "Descrição", "Vencimento", "Valor", "Situação", ""], align: ["", "", "", "r", "", ""],
        rows: d.parcelas.map((x) => {
          const vencida = x.estado === "aberta" && x.vencimento < hoje();
          const receber = x.estado === "aberta" && ["direcao", "financas"].includes(eu?.papel) && p.estado !== "rascunho"
            ? acao(botao("Registrar recebimento"), saida, async () => {
                const data = prompt("Data do recebimento (AAAA-MM-DD):", hoje()); if (!data) throw new Error("Cancelado.");
                const valor = parseMoneyInput(prompt("Valor recebido (R$):", String(x.valor).replace(".", ",")) ?? ""); if (valor === null) throw new Error("Valor inválido.");
                await api.fluxoReceber(x.id, { data, valor }); await recarregar();
              }) : null;
          return [String(x.numero), x.descricao ?? "—", formatDate(x.vencimento), brl(x.valor),
            x.estado === "recebida" ? stamp(`Recebida ${formatDate(x.recebido_em)} · ${brl(x.valor_recebido)}`, "ok") : x.estado === "cancelada" ? stamp("Cancelada", "neutral") : vencida ? stamp("Vencida", "risk") : stamp("Aberta", "live"), receber];
        }) })
    : h("p", { class: "result-empty" }, "Sem parcelas. Defina as parcelas para poder confirmar o pedido.");
  const editor = p.estado === "rascunho" && ["direcao", "vendas", "financas"].includes(eu?.papel) ? editorParcelas(p, d.parcelas, id, recarregar) : null;
  return panel({ title: "Parcelas a receber", subtitle: "A soma das parcelas precisa bater com o total do pedido. Viram a previsão de caixa." }, lista, editor, saida);
}

function editorParcelas(p, atuais, id, recarregar) {
  const total = Math.round(Number(p.valor_total) * 100);
  const corpo = h("tbody");
  const linhas = [];
  const soma = h("span", { class: "field-hint" });
  const atualizar = () => {
    const s = linhas.reduce((acc, l) => acc + Math.round(Number(parseMoneyInput(l.valor.value) ?? 0) * 100), 0);
    soma.textContent = `Soma: ${brl((s / 100).toFixed(2))} de ${brl(p.valor_total)}${s === total ? " ✓" : ` (diferença ${brl(((total - s) / 100).toFixed(2))})`}`;
  };
  const add = (x = {}) => {
    const venc = inp({ type: "date", value: x.vencimento ?? "", "aria-label": "Vencimento" });
    const valor = inp({ class: "input num", inputmode: "decimal", value: x.valor ? Number(x.valor).toFixed(2).replace(".", ",") : "", "aria-label": "Valor" });
    const desc = inp({ value: x.descricao ?? "", "aria-label": "Descrição", placeholder: "ex.: Entrada" });
    const rem = botao("×");
    const l = { venc, valor, desc };
    const tr = h("tr", null, [desc, venc, valor, rem].map((c) => h("td", null, c)));
    rem.addEventListener("click", () => { tr.remove(); linhas.splice(linhas.indexOf(l), 1); atualizar(); });
    valor.addEventListener("input", atualizar);
    linhas.push(l); corpo.append(tr); atualizar();
  };
  atuais.filter((x) => x.estado !== "cancelada").forEach(add);
  // divisao em N parcelas iguais (centavo que sobra vai para a ultima)
  const nParc = inp({ id: "fx-n", class: "input num", value: "1", "aria-label": "Número de parcelas" });
  const primeira = inp({ id: "fx-1", type: "date", value: hoje(), "aria-label": "Primeiro vencimento" });
  const intervalo = inp({ id: "fx-int", class: "input num", value: "30", "aria-label": "Dias entre parcelas" });
  const dividir = botao("Dividir igual");
  dividir.addEventListener("click", () => {
    const n = Math.max(1, Math.min(60, parseInt(nParc.value, 10) || 1));
    const dias = Math.max(0, parseInt(intervalo.value, 10) || 0);
    const base = Math.floor(total / n);
    clear(corpo); linhas.length = 0;
    for (let i = 0; i < n; i++) {
      const dt = new Date(`${primeira.value || hoje()}T12:00:00Z`); dt.setUTCDate(dt.getUTCDate() + i * dias);
      add({ vencimento: dt.toISOString().slice(0, 10), valor: ((i === n - 1 ? total - base * (n - 1) : base) / 100).toFixed(2), descricao: n === 1 ? "À vista" : `Parcela ${i + 1}/${n}` });
    }
  });
  const erro = h("div", { role: "alert" });
  const salvar = botao("Salvar parcelas", "primary");
  acao(salvar, erro, async () => {
    const parcelas = linhas.map((l, i) => {
      const valor = parseMoneyInput(l.valor.value);
      if (!l.venc.value) throw new Error(`Parcela ${i + 1}: informe o vencimento`);
      if (valor === null) throw new Error(`Parcela ${i + 1}: valor inválido`);
      return { vencimento: l.venc.value, valor, descricao: l.desc.value.trim() || null };
    });
    await api.fluxoAcao(id, "parcelas", { parcelas });
    await recarregar();
  });
  const mais = botao("+ Parcela"); mais.addEventListener("click", () => add());
  return h("div", { class: "stack-s" },
    h("div", { class: "row" }, field("fx-n", "Parcelas", nParc), field("fx-1", "1º vencimento", primeira), field("fx-int", "Dias entre", intervalo), dividir),
    h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, h("tr", null, ["Descrição", "Vencimento", "Valor (R$)", ""].map((t) => h("th", { scope: "col" }, t)))), corpo)),
    h("div", { class: "row" }, mais, salvar, soma), erro);
}

function painelNotas(d, id, eu, aoRegistrar) {
  const p = d.pedido;
  const lista = d.notas.length
    ? table({ head: ["Tipo", "Número", "Série", "Emissão", "Valor", "Chave de acesso"], align: ["", "", "", "", "r", ""],
        rows: d.notas.map((n) => [n.tipo, n.numero, n.serie || "—", formatDate(n.emitida_em), brl(n.valor), n.chave_acesso ?? "—"]) })
    : h("p", { class: "result-empty" }, "Nenhuma nota fiscal registrada.");
  const soProduto = d.itens.some((i) => i.tipo === "produto");
  const podeFaturar = ["direcao", "financas"].includes(eu?.papel) && (["entregue", "faturado"].includes(p.estado) || (p.estado === "confirmado" && !soProduto));
  let form = null;
  if (podeFaturar && p.estado !== "concluido") {
    const jaNf = d.notas.reduce((s, n) => s + Number(n.valor), 0);
    const tipo = h("select", { class: "select", id: "nf-tipo" }, h("option", { value: soProduto ? "NF-e" : "NFS-e" }, soProduto ? "NF-e (produtos)" : "NFS-e (serviços)"), h("option", { value: soProduto ? "NFS-e" : "NF-e" }, soProduto ? "NFS-e (serviços)" : "NF-e (produtos)"));
    const numero = inp({ id: "nf-numero" }), serie = inp({ id: "nf-serie" }), data = inp({ id: "nf-data", type: "date", value: hoje() });
    const valor = inp({ id: "nf-valor", class: "input num", inputmode: "decimal", value: (Number(p.valor_total) - jaNf).toFixed(2).replace(".", ",") });
    const chave = inp({ id: "nf-chave", placeholder: "44 dígitos (opcional)" });
    const erro = h("div", { role: "alert" });
    const b = botao("Registrar nota fiscal", "primary");
    acao(b, erro, async () => {
      const v = parseMoneyInput(valor.value); if (v === null) throw new Error("Valor inválido.");
      const r = await api.fluxoAcao(id, "faturar", { tipo: tipo.value, numero: numero.value.trim(), serie: serie.value.trim(), emitida_em: data.value, valor: v, chave_acesso: chave.value.trim() || null });
      aoRegistrar(r);
    });
    form = h("div", { class: "stack-s" }, h("p", { class: "field-hint" }, "A nota é emitida manualmente (portal da prefeitura/SEFAZ ou contador). Registre aqui para fechar o faturamento."),
      h("div", { class: "form-grid" }, field("nf-tipo", "Tipo", tipo), field("nf-numero", "Número", numero), field("nf-serie", "Série", serie), field("nf-data", "Emissão", data), field("nf-valor", "Valor (R$)", valor), field("nf-chave", "Chave de acesso", chave)),
      h("div", { class: "row" }, b), erro);
  }
  return panel({ title: "Faturamento (notas fiscais)", subtitle: soProduto ? "Registre a NF depois da entrega." : "Pedido só de serviços: a NFS-e pode ser registrada após a confirmação." }, lista, form);
}

// ---------------------------------------------------------------- Estoque
export async function telaEstoque(root) {
  const busca = h("input", { class: "input", type: "search", placeholder: "Buscar produto", autocomplete: "off", "aria-label": "Buscar produto" });
  const corpo = h("div", { "aria-live": "polite" });
  let t;
  async function carregar() {
    const d = await api.fluxoEstoque(busca.value.trim(), 1);
    clear(corpo).append(d.itens.length
      ? table({ caption: "Produtos do catálogo (Zoho Books)", head: ["Produto", "SKU", "Físico", "Reservado", "Disponível", "Custo médio", "Compra (cadastro)"], align: ["", "", "r", "r", "r", "r", "r"],
          rows: d.itens.map((i) => {
            const f = Number(i.saldo?.fisico ?? 0), r = Number(i.saldo?.reservado ?? 0);
            return [h("a", { href: `#/estoque/${encodeURIComponent(i.zoho_id)}` }, i.nome), i.sku ?? "—", qtd(f), qtd(r), f - r < 0 ? stamp(qtd(f - r), "risk") : qtd(f - r), brl(i.saldo?.custo_medio), brl(i.compra)];
          }) })
      : h("p", { class: "result-empty" }, "Nenhum produto encontrado."));
  }
  busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(carregar, 300); });
  root.append(panel({ title: "Estoque", subtitle: "Saldo próprio do VEOS: entradas e ajustes aqui; reservas e baixas vêm dos pedidos. (O Zoho não controlava estoque: tudo começa em zero.)", actions: busca }, corpo));
  await carregar();
}

export async function telaItemEstoque(root, id, eu) {
  const d = await api.fluxoEstoqueItem(id);
  const f = Number(d.saldo?.fisico ?? 0), r = Number(d.saldo?.reservado ?? 0);
  const TIPO = { entrada: "Entrada", saida: "Saída (entrega)", reserva: "Reserva", liberacao: "Liberação", ajuste: "Ajuste" };
  let form = null;
  if (["direcao", "operacoes"].includes(eu?.papel)) {
    const tipo = h("select", { class: "select", id: "mv-tipo" }, h("option", { value: "entrada" }, "Entrada (compra recebida)"), h("option", { value: "ajuste" }, "Ajuste (inventário, perda) ±"));
    const q = inp({ id: "mv-qtd", class: "input num", inputmode: "decimal" });
    const custo = inp({ id: "mv-custo", class: "input num", inputmode: "decimal", value: d.item.compra ? Number(d.item.compra).toFixed(2).replace(".", ",") : "" });
    const obs = inp({ id: "mv-obs", placeholder: "Nota do fornecedor, motivo do ajuste…" });
    const erro = h("div", { role: "alert" });
    const b = botao("Registrar", "primary");
    acao(b, erro, async () => {
      const quantidade = String(q.value).replace(/\./g, "").replace(",", ".");
      if (!/^-?\d+(\.\d{1,3})?$/.test(quantidade)) throw new Error("Quantidade inválida.");
      const c = custo.value.trim() ? parseMoneyInput(custo.value) : null;
      if (custo.value.trim() && c === null) throw new Error("Custo inválido.");
      const res = await api.fluxoMovimento({ item_id: id, tipo: tipo.value, quantidade, custo_unit: tipo.value === "entrada" ? c : null, observacao: obs.value.trim() || null });
      if (res.reservas_completadas?.length) alert(`Reserva completada sozinha nos pedidos: ${res.reservas_completadas.join(", ")}`);
      location.reload();
    });
    form = panel({ title: "Registrar movimento" }, h("div", { class: "form-grid" }, field("mv-tipo", "Tipo", tipo), field("mv-qtd", "Quantidade", q, "Ajuste aceita negativo."), field("mv-custo", "Custo unitário (R$)", custo, "Só para entrada; vira o custo médio."), field("mv-obs", "Observação", obs, "Obrigatória no ajuste.")), h("div", { class: "row" }, b), erro);
  }
  root.append(...[
    h("p", null, h("a", { href: "#/estoque" }, "‹ Estoque")),
    panel({ title: d.item.nome, subtitle: `SKU ${d.item.sku ?? "—"} · unidade ${d.item.unidade ?? "—"}` },
      h("div", { class: "form-grid" }, stat("Físico", qtd(f)), stat("Reservado para pedidos", qtd(r)), stat("Disponível", qtd(f - r)), stat("Custo médio", brl(d.saldo?.custo_medio), `cadastro: ${brl(d.item.compra)}`))),
    form,
    panel({ title: "Movimentos", subtitle: "Trilha permanente (não pode ser alterada nem apagada)." },
      d.movimentos.length
        ? table({ head: ["Quando", "Tipo", "Quantidade", "Custo", "Pedido", "Observação"], align: ["", "", "r", "r", "", ""],
            rows: d.movimentos.map((m) => [formatDateTime(m.criado_em), TIPO[m.tipo] ?? m.tipo, qtd(m.quantidade), brl(m.custo_unit), m.pedido?.numero ?? "—", m.observacao ?? "—"]) })
        : h("p", { class: "result-empty" }, "Nenhum movimento ainda."))].filter(Boolean));
}

// ---------------------------------------------------------------- Recebimentos e faturamento
export async function telaRecebimentos(root) {
  const [resumo, { parcelas }, caixa] = await Promise.all([api.fluxoResumo(), api.fluxoParcelas("aberta"), api.caixaPrevisao().catch(() => null)]);
  const maior = Math.max(1, ...resumo.previsao.map((x) => Number(x.valor)));
  const barras = h("ul", { class: "list-plain stack-s previsao" }, resumo.previsao.map((x) => {
    const barra = h("span", { class: "previsao-barra" });
    barra.style.width = `${Math.max(2, (Number(x.valor) / maior) * 100)}%`;
    return h("li", { class: "previsao-linha" }, h("span", { class: "previsao-mes" }, MES(x.mes)), h("span", { class: "previsao-trilho" }, barra), h("span", { class: "num" }, brl(x.valor)));
  }));
  root.append(
    h("div", { class: "form-grid" },
      stat("A receber (aberto)", brl(resumo.a_receber)), stat("Vencido", brl(resumo.vencido)),
      stat("Faturado no mês", brl(resumo.faturado_mes), "soma das NF registradas"), stat("Recebido no mês", brl(resumo.recebido_mes)), stat("Estoque (a custo médio)", brl(resumo.estoque_valor))),
    caixa ? painelPrevisaoCaixa(caixa) : panel({ title: "Previsão de recebimentos por mês", subtitle: "Parcelas em aberto dos pedidos (inclui vencidas no mês de vencimento)." },
      resumo.previsao.length ? barras : h("p", { class: "result-empty" }, "Nenhuma parcela em aberto.")),
    panel({ title: "Parcelas em aberto", subtitle: "Registre o recebimento dentro do pedido." },
      parcelas.length
        ? table({ head: ["Vencimento", "Pedido", "Cliente", "Parcela", "Valor", ""], align: ["", "", "", "", "r", ""],
            rows: parcelas.map((x) => [formatDate(x.vencimento), h("a", { href: `#/pedidos/${x.pedido.id}` }, x.pedido.numero), x.pedido.cliente_nome, `${x.numero}${x.descricao ? ` · ${x.descricao}` : ""}`, brl(x.valor), x.vencimento < hoje() ? stamp("Vencida", "risk") : ""]) })
        : h("p", { class: "result-empty" }, "Nada em aberto.")));
}

// Previsao de caixa (financas e direcao): entradas (parcelas) - saidas (contas a pagar), por mes.
function painelPrevisaoCaixa(cx) {
  const ms = cx.meses;
  const ent = ms.map((m) => Number(m.entradas_previstas) + Number(m.entradas_realizadas));
  const sai = ms.map((m) => Number(m.saidas_previstas) + Number(m.saidas_realizadas));
  let acumulado = 0;
  const linhas = ms.map((m, i) => {
    const saldo = ent[i] - sai[i];
    if (m.mes >= cx.mes_atual) acumulado += saldo;
    return [MES(m.mes) + (m.mes === cx.mes_atual ? " (atual)" : ""), brl(m.entradas_realizadas), brl(m.entradas_previstas), brl(m.saidas_realizadas), brl(m.saidas_previstas), brl(saldo.toFixed(2)), m.mes >= cx.mes_atual ? brl(acumulado.toFixed(2)) : "—"];
  });
  const vazio = ent.every((v) => !v) && sai.every((v) => !v);
  return panel({ title: "Previsão de caixa (entradas − saídas)", subtitle: `Parcelas dos pedidos e contas a pagar. Vencidos ainda em aberto: a receber ${brl(cx.entradas_vencidas)}, a pagar ${brl(cx.saidas_vencidas)}.` },
    vazio ? h("p", { class: "result-empty" }, "Sem parcelas nem contas a pagar no período.")
      : barrasMensais({ titulo: "Entradas e saídas por mês", meses: ms.map((m) => m.mes), series: [{ nome: "Entradas", valores: ent.map((v) => v || null) }, { nome: "Saídas", valores: sai.map((v) => v || null) }], formatar: (v) => brl(Number(v).toFixed(2)), compacto: (v) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v)) }),
    table({ caption: "Caixa por mês", head: ["Mês", "Recebido", "A receber", "Pago", "A pagar", "Saldo do mês", "Acumulado a partir de hoje"], align: ["", "r", "r", "r", "r", "r", "r"], rows: linhas }),
    method("Como ler", "Realizado: pela data do recebimento ou do pagamento. Previsto: em aberto, pelo vencimento (vencidos ficam no mês em que venceram).", "Não inclui saldo bancário inicial (o VEOS ainda não lê os bancos): o acumulado é a variação do caixa a partir deste mês."));
}

// ---------------------------------------------------------------- anexos em PDF
const TIPO_ANEXO = { orcamento: "Orçamento", proposta: "Proposta", contrato: "Contrato assinado", aceite: "Termo de aceite", outro: "Outro" };
function painelAnexos(d, id, recarregar) {
  const saida = h("div", { role: "status" });
  const arquivo = h("input", { type: "file", id: "ax-arq", accept: "application/pdf,.pdf", class: "input" });
  const tipo = h("select", { class: "select", id: "ax-tipo" }, Object.entries(TIPO_ANEXO).map(([k, t]) => h("option", { value: k }, t)));
  const enviar = botao("Enviar PDF", "primary");
  acao(enviar, saida, async () => {
    const f = arquivo.files?.[0];
    if (!f) throw new Error("Escolha um arquivo PDF.");
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) throw new Error("Só PDF.");
    if (f.size > 16 * 1024 * 1024) throw new Error("O PDF deve ter até 16 MB.");
    const dados = { nome: f.name, tipo: tipo.value, tamanho: f.size };
    const { caminho, url } = await api.fluxoAnexo(id, dados);
    const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: f });
    if (!r.ok) throw new Error(`Falha no envio (${r.status}).`);
    await api.fluxoAnexo(id, { ...dados, caminho, confirmar: true });
    await recarregar();
  });
  const lista = (d.anexos ?? []).length
    ? table({ head: ["Arquivo", "Tipo", "Tamanho", "Enviado", ""], rows: d.anexos.map((x) => {
        const abrir = botao("Abrir");
        acao(abrir, saida, async () => { const l = await api.fluxoAnexoLink(x.id); window.open(l.url, "_blank", "noopener"); abrir.disabled = false; });
        return [x.nome, TIPO_ANEXO[x.tipo] ?? x.tipo, `${(x.tamanho / 1024 / 1024).toFixed(2).replace(".", ",")} MB`, formatDateTime(x.enviado_em), abrir];
      }) })
    : h("p", { class: "result-empty" }, "Nenhum PDF anexado.");
  return panel({ title: "Anexos (PDF)", subtitle: "Orçamento, proposta ou contrato assinado. Arquivos privados; o link de abertura vale 5 minutos. Até 16 MB." },
    lista, h("div", { class: "form-grid" }, field("ax-arq", "Arquivo PDF", arquivo), field("ax-tipo", "Tipo", tipo)), h("div", { class: "row" }, enviar), saida);
}

// ---------------------------------------------------------------- contrato (imprimir / salvar em PDF)
// Modelo gerado a partir do pedido. As clausulas juridicas NAO sao inventadas: o texto aprovado
// pelo juridico/direcao e colado no campo proprio. O navegador salva em PDF pela impressao.
export async function telaContrato(root, id) {
  const d = await api.fluxoPedido(id);
  const p = d.pedido;
  let cli = null;
  if (p.cliente_zoho_id) { try { cli = (await api.zohoEspelhoRegistro("books", "contacts", p.cliente_zoho_id)).dados; } catch { cli = null; } }
  const end = (e) => (e ? [e.address, e.street2, [e.city, e.state].filter(Boolean).join(" - "), e.zip].filter(Boolean).join(", ") : "");
  const campo = (idc, rot, valor = "", attrs = {}) => field(idc, rot, h("input", { class: "input", id: idc, type: "text", autocomplete: "off", value: valor, ...attrs }));
  const clausulas = h("textarea", { class: "input", id: "ct-clausulas", rows: 8, placeholder: "Cole aqui as cláusulas aprovadas (garantia, obrigações das partes, rescisão, foro...)." });
  const doc = h("article", { class: "contrato-doc" });
  const v = (x) => document.getElementById(x)?.value?.trim() ?? "";
  const temProduto = d.itens.some((i) => i.tipo === "produto"), temServico = d.itens.some((i) => i.tipo === "servico");
  function montar() {
    const linha = (rot, val) => h("p", null, h("strong", null, `${rot}: `), val || "________________________");
    clear(doc).append(
      h("h1", null, "Contrato de fornecimento de equipamentos e prestação de serviços"),
      h("p", { class: "contrato-modelo" }, "Modelo gerado pelo VEOS a partir do pedido. Validar o texto com o jurídico antes de assinar."),
      h("h2", null, "1. Partes"),
      linha("CONTRATADA", `${v("ct-emp")}, CNPJ ${v("ct-cnpj-emp")}, com sede em ${v("ct-end-emp")}`),
      linha("CONTRATANTE", `${v("ct-cli")}, CPF/CNPJ ${v("ct-doc")}, residente/sediado em ${v("ct-end-cli")}`),
      h("h2", null, "2. Objeto"),
      h("p", null, `Fornecimento e/ou instalação dos itens abaixo no endereço da obra: ${v("ct-obra") || "________________________"}.`),
      h("table", { class: "contrato-tabela" }, h("thead", null, h("tr", null, ["Item", "Tipo", "Qtd", "Valor unit.", "Total"].map((t) => h("th", null, t)))),
        h("tbody", null, d.itens.map((i) => h("tr", null, h("td", null, i.nome), h("td", null, i.tipo === "produto" ? "Produto" : "Serviço"), h("td", null, qtd(i.quantidade)), h("td", null, brl(i.preco_unit)), h("td", null, brl((Number(i.quantidade) * Number(i.preco_unit)).toFixed(2))))))),
      h("h2", null, "3. Preço e pagamento"),
      h("p", null, `Valor total do contrato: ${brl(p.valor_total)}${p.condicao ? ` (${p.condicao})` : ""}. Documentos fiscais: ${[temProduto ? "NF-e (produtos)" : null, temServico ? "NFS-e (serviços)" : null].filter(Boolean).join(" e ")}.`),
      d.parcelas.filter((x) => x.estado !== "cancelada").length
        ? h("table", { class: "contrato-tabela" }, h("thead", null, h("tr", null, ["Parcela", "Vencimento", "Valor"].map((t) => h("th", null, t)))),
            h("tbody", null, d.parcelas.filter((x) => x.estado !== "cancelada").map((x) => h("tr", null, h("td", null, `${x.numero}${x.descricao ? ` · ${x.descricao}` : ""}`), h("td", null, formatDate(x.vencimento)), h("td", null, brl(x.valor))))))
        : h("p", null, "Parcelas: a definir no pedido."),
      h("h2", null, "4. Prazo"),
      h("p", null, `Início previsto: ${v("ct-ini") ? formatDate(v("ct-ini")) : "____/____/______"}. Conclusão prevista: ${v("ct-fim") ? formatDate(v("ct-fim")) : "____/____/______"}.`),
      h("h2", null, "5. Cláusulas gerais"),
      clausulas.value.trim() ? h("div", { class: "zoho-texto" }, clausulas.value.trim()) : h("p", { class: "contrato-modelo" }, "[Cláusulas aprovadas pelo jurídico ainda não incluídas]"),
      h("p", { class: "contrato-local" }, `${v("ct-local") || "Balneário Camboriú/SC"}, ${v("ct-data") ? formatDate(v("ct-data")) : "____/____/______"}.`),
      h("div", { class: "contrato-assinaturas" }, h("div", null, h("span", null, "CONTRATADA"), h("span", null, v("ct-emp"))), h("div", null, h("span", null, "CONTRATANTE"), h("span", null, v("ct-cli")))),
      h("p", { class: "contrato-rodape" }, `Pedido ${p.numero}${p.orcamento_numero ? ` · orçamento ${p.orcamento_numero}` : ""} · gerado pelo VEOS em ${formatDateTime(new Date().toISOString())}.`));
  }
  const imprimir = botao("Imprimir / salvar em PDF", "primary");
  imprimir.addEventListener("click", () => { montar(); window.print(); });
  const form = panel({ title: `Contrato do pedido ${p.numero}`, subtitle: "Confira e complete os dados. Depois de assinado, anexe o PDF no pedido (Anexos → Contrato assinado)." },
    h("div", { class: "form-grid" },
      campo("ct-emp", "Contratada", "VOICE AUTOMACAO LTDA"), campo("ct-cnpj-emp", "CNPJ da contratada", "12.323.599/0001-83"),
      campo("ct-end-emp", "Endereço da contratada", "R 2500, 690 - Centro, Balneário Camboriú/SC, 88330-396"),
      campo("ct-cli", "Contratante", cli?.contact_name ?? p.cliente_nome), campo("ct-doc", "CPF/CNPJ do contratante", cli?.tax_reg_no ?? ""),
      campo("ct-end-cli", "Endereço do contratante", end(cli?.billing_address)), campo("ct-obra", "Endereço da obra", end(cli?.shipping_address)),
      campo("ct-ini", "Início previsto", "", { type: "date" }), campo("ct-fim", "Conclusão prevista", "", { type: "date" }),
      campo("ct-local", "Local", "Balneário Camboriú/SC"), campo("ct-data", "Data", new Date().toISOString().slice(0, 10), { type: "date" })),
    field("ct-clausulas", "Cláusulas gerais (texto aprovado)", clausulas), h("div", { class: "row" }, imprimir));
  form.classList.add("nao-imprimir");
  form.addEventListener("input", montar);
  root.append(h("p", { class: "nao-imprimir" }, h("a", { href: `#/pedidos/${id}` }, `‹ Pedido ${p.numero}`)), form, doc);
  montar();
}
