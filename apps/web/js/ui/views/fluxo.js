// Operacao: fluxo vivo da VOICE. Pedido (a partir do orcamento aceito no Zoho) -> reserva e
// baixa de estoque -> parcelas -> nota fiscal (emitida a mao e registrada aqui) -> recebimento.
// Cada acao roda a vigia: alertas FLX_* aparecem e somem sozinhos no Radar.
import { api } from "../../data/api.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, panel, stamp, stat, table } from "../dom.js";

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
      painelParcelas(d, id, eu, () => api.fluxoPedido(id).then((x) => { d = x; desenhar("Parcelas atualizadas."); })),
      painelNotas(d, id, eu, (r) => { d = r; desenhar("Nota fiscal registrada."); }),
      panel({ title: "Histórico", subtitle: "Não pode ser alterado nem apagado." },
        h("ul", { class: "list-plain stack-s" }, d.historico.map((x) => h("li", null, h("strong", null, x.acao.replace("_", " ")), ` · ${formatDateTime(x.em)}`, Object.keys(x.detalhe ?? {}).length ? h("span", { class: "field-hint" }, ` · ${Object.entries(x.detalhe).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.map((f) => (f && typeof f === "object" ? `${f.nome ?? ""} ${f.falta ? `(falta ${qtd(f.falta)})` : ""}`.trim() : f)).join(", ") || "nenhuma" : v}`).join(" · ")}`) : null)))),
    ].filter(Boolean));
  };
  desenhar();
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
  const [resumo, { parcelas }] = await Promise.all([api.fluxoResumo(), api.fluxoParcelas("aberta")]);
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
    panel({ title: "Previsão de recebimentos por mês", subtitle: "Parcelas em aberto dos pedidos (inclui vencidas no mês de vencimento)." },
      resumo.previsao.length ? barras : h("p", { class: "result-empty" }, "Nenhuma parcela em aberto.")),
    panel({ title: "Parcelas em aberto", subtitle: "Registre o recebimento dentro do pedido." },
      parcelas.length
        ? table({ head: ["Vencimento", "Pedido", "Cliente", "Parcela", "Valor", ""], align: ["", "", "", "", "r", ""],
            rows: parcelas.map((x) => [formatDate(x.vencimento), h("a", { href: `#/pedidos/${x.pedido.id}` }, x.pedido.numero), x.pedido.cliente_nome, `${x.numero}${x.descricao ? ` · ${x.descricao}` : ""}`, brl(x.valor), x.vencimento < hoje() ? stamp("Vencida", "risk") : ""]) })
        : h("p", { class: "result-empty" }, "Nada em aberto.")));
}
