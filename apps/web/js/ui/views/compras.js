// Compras e contas a pagar: faltas de estoque -> compra (registrada; o VEOS nao envia nada ao
// fornecedor) -> recebimento da mercadoria (entrada no estoque, reserva dos pedidos completada
// sozinha) -> parcelas viram contas a pagar -> previsao de caixa. Regras no banco.
import { api } from "../../data/api.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { dividirParcelas, totalCompra } from "../../domain/compras.js";
import { clear, errorNotice, field, h, method, panel, stamp, stat, table } from "../dom.js";

const ESTADOS = { aberta: ["Aberta", "live"], parcial: ["Recebida em parte", "warn"], recebida: ["Recebida", "ok"], cancelada: ["Cancelada", "risk"] };
const CONTA = { aberta: ["Aberta", "live"], paga: ["Paga", "ok"], cancelada: ["Cancelada", "neutral"] };
const CATEGORIAS = { servico_terceiro: "Serviço de terceiro", frete: "Frete", imposto: "Imposto", despesa_fixa: "Despesa fixa", outro: "Outro", compra: "Compra" };
const brl = (v) => (v === null || v === undefined ? "—" : formatBRL(String(Number(v).toFixed(2))));
const qtd = (v) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const hoje = () => new Date().toISOString().slice(0, 10);
const inp = (attrs = {}) => h("input", { class: "input", type: "text", autocomplete: "off", ...attrs });
const dinheiro = (v) => (v === null || v === undefined || v === "" ? "" : formatBRL(String(Number(v).toFixed(2))).replace("R$ ", ""));
const lerDinheiro = (el) => parseMoneyInput(el.value.trim());
const numero = (s) => s.trim().replace(/\./g, "").replace(",", ".");

// ---------------------------------------------------------------- lista + faltas
export async function telaCompras(root) {
  const [{ compras }, { faltas }] = await Promise.all([api.comprasLista(), api.comprasFaltas()]);
  const semCompra = faltas.filter((f) => Number(f.em_compra) < Number(f.falta));
  const abertas = compras.filter((c) => ["aberta", "parcial"].includes(c.estado));
  root.append(
    h("div", { class: "grid-4" },
      stat("Compras em andamento", String(abertas.length), brl(abertas.reduce((s, c) => s + Number(c.valor_total), 0))),
      stat("Atrasadas", String(abertas.filter((c) => c.previsao_entrega && c.previsao_entrega < hoje()).length), "previsão de entrega vencida"),
      stat("Itens faltando", String(faltas.length), `${semCompra.length} sem compra registrada`),
      stat("Recebidas (todas)", String(compras.filter((c) => c.estado === "recebida").length))),
    panel({ title: "Faltas para comprar", subtitle: "Produtos de pedidos confirmados sem estoque reservado. Ao receber a compra, a reserva se completa sozinha.",
      actions: h("a", { class: "btn btn-primary", href: "#/compras/nova" }, "Nova compra") },
      faltas.length
        ? table({ caption: "Faltas", head: ["Pedido", "Cliente", "Produto", "Falta", "Em compra", ""], align: ["", "", "", "r", "r", ""],
          rows: faltas.map((f) => [h("a", { href: `#/pedidos/${f.pedido_id}` }, f.numero), f.cliente_nome, f.nome, qtd(f.falta),
            Number(f.em_compra) ? `${qtd(f.em_compra)} (${f.compras})` : "—",
            Number(f.em_compra) >= Number(f.falta) ? stamp("Coberta", "ok") : h("a", { class: "btn btn-ghost", href: `#/compras/nova?pedido=${f.pedido_id}` }, "Comprar")]) })
        : h("p", { class: "notice notice-ok" }, "Nenhuma falta: todos os pedidos confirmados têm estoque reservado.")),
    panel({ title: "Compras", subtitle: "Registro do que a equipe comprou. O VEOS não envia pedido ao fornecedor." },
      compras.length
        ? table({ caption: "Compras", head: ["Número", "Fornecedor", "Para o pedido", "Previsão", "Total", "Situação"], align: ["", "", "", "", "r", ""],
          rows: compras.map((c) => [h("a", { href: `#/compras/${c.id}` }, c.numero), c.fornecedor_nome, c.pedido ? h("a", { href: `#/pedidos/${c.pedido.id}` }, c.pedido.numero) : "—",
            c.previsao_entrega ? h("span", null, formatDate(c.previsao_entrega), ["aberta", "parcial"].includes(c.estado) && c.previsao_entrega < hoje() ? h("span", null, " ", stamp("Atrasada", "risk")) : null) : "—",
            brl(c.valor_total), stamp(...(ESTADOS[c.estado] ?? [c.estado, "neutral"]))]) })
        : h("p", { class: "result-empty" }, "Nenhuma compra registrada.")),
  );
}

// ---------------------------------------------------------------- nova compra
export async function telaNovaCompra(root) {
  const pedidoId = new URLSearchParams(location.hash.split("?")[1] ?? "").get("pedido");
  const [{ faltas }, { fornecedores }] = await Promise.all([api.comprasFaltas(), api.comprasFornecedores()]);
  const doPedido = faltas.filter((f) => (!pedidoId || f.pedido_id === pedidoId) && Number(f.em_compra) < Number(f.falta));
  const linhas = [];
  const corpoItens = h("tbody");
  const total = h("strong", null, brl(0));
  const lista = h("datalist", { id: "fornecedores" }, fornecedores.map((f) => h("option", { value: f.nome })));
  const fornecedor = inp({ id: "nc-forn", list: "fornecedores", required: true });
  const previsao = h("input", { class: "input", id: "nc-prev", type: "date" });
  const obs = h("textarea", { class: "input", id: "nc-obs", rows: "2" });
  const nParc = h("input", { class: "input num", id: "nc-nparc", type: "number", min: "1", max: "24", value: "1" });
  const primeiro = h("input", { class: "input", id: "nc-venc", type: "date" });
  const intervalo = h("input", { class: "input num", id: "nc-int", type: "number", min: "1", max: "120", value: "30" });
  const corpoParc = h("tbody");
  const erro = h("div", { role: "alert" });
  let parcelas = [];

  function recalcular() {
    const t = totalCompra(linhas.filter((l) => l.usar.checked).map((l) => ({ quantidade: numero(l.q.value), custo_unit: lerDinheiro(l.c) ?? "0" })));
    total.textContent = brl(t);
    parcelas = primeiro.value ? dividirParcelas(t, Number(nParc.value) || 1, primeiro.value, Number(intervalo.value) || 30) : [];
    clear(corpoParc).append(...(parcelas.length ? parcelas.map((p, i) => h("tr", null, h("td", null, String(i + 1)), h("td", null, formatDate(p.vencimento)), h("td", { class: "r num" }, brl(p.valor))))
      : [h("tr", null, h("td", { colspan: "3", class: "muted" }, "Informe o vencimento da primeira parcela."))]));
  }
  for (const f of doPedido) {
    const usar = h("input", { type: "checkbox", checked: true, "aria-label": `Comprar ${f.nome}` });
    const q = h("input", { class: "input num", value: qtd(Number(f.falta) - Number(f.em_compra)), inputmode: "decimal", "aria-label": `Quantidade de ${f.nome}` });
    const c = h("input", { class: "input num", value: dinheiro(f.custo_zoho), inputmode: "decimal", "aria-label": `Custo unitário de ${f.nome}` });
    for (const el of [usar, q, c]) el.addEventListener("input", recalcular);
    linhas.push({ f, usar, q, c });
    corpoItens.append(h("tr", null, h("td", null, usar), h("td", null, `${f.nome}`, h("span", { class: "field-hint" }, ` · ${f.numero}`)), h("td", null, q), h("td", null, c)));
  }
  for (const el of [nParc, primeiro, intervalo]) el.addEventListener("input", recalcular);
  recalcular();

  const salvar = h("button", { class: "btn btn-primary", type: "submit" }, "Registrar compra");
  const form = h("form", { class: "stack", novalidate: true },
    panel({ title: "Fornecedor e entrega" }, lista,
      h("div", { class: "form-grid" }, field(fornecedor.id, "Fornecedor *", fornecedor, "Lista do Zoho (fornecedores); pode digitar outro."), field(previsao.id, "Previsão de entrega", previsao), field(obs.id, "Observação", obs))),
    panel({ title: "Itens", subtitle: doPedido.length ? "Faltas dos pedidos confirmados. Ajuste quantidade e custo (o custo sugerido vem do preço de compra no Zoho)." : "" },
      doPedido.length
        ? h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, h("tr", null, ["Comprar", "Produto", "Quantidade", "Custo unit. (R$)"].map((x) => h("th", { scope: "col" }, x)))), corpoItens))
        : h("p", { class: "result-empty" }, "Nenhuma falta sem compra. Para comprar para estoque, registre a entrada direto em Estoque."),
      h("p", null, "Total da compra: ", total)),
    panel({ title: "Pagamento ao fornecedor", subtitle: "As parcelas viram contas a pagar e entram na previsão de caixa. Devem somar o total." },
      h("div", { class: "form-grid" }, field(nParc.id, "Parcelas", nParc), field(primeiro.id, "1º vencimento *", primeiro), field(intervalo.id, "Intervalo (dias)", intervalo)),
      h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, h("tr", null, ["#", "Vencimento", "Valor"].map((x, i) => h("th", { scope: "col", class: i === 2 ? "r" : null }, x)))), corpoParc))),
    h("div", { class: "row" }, salvar, h("a", { class: "btn btn-ghost", href: "#/compras" }, "Voltar")), erro);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(erro);
    const itens = [];
    const problemas = [];
    for (const l of linhas.filter((x) => x.usar.checked)) {
      const custo = lerDinheiro(l.c);
      const quant = numero(l.q.value);
      if (!(Number(quant) > 0)) problemas.push(`${l.f.nome}: quantidade`);
      if (custo === null || custo === "") problemas.push(`${l.f.nome}: custo unitário`);
      itens.push({ item_id: l.f.item_id, quantidade: quant, custo_unit: custo });
    }
    if (!fornecedor.value.trim()) problemas.push("fornecedor");
    if (!itens.length) problemas.push("marque ao menos um item");
    if (!parcelas.length) problemas.push("vencimento da 1ª parcela");
    if (problemas.length) return erro.append(errorNotice(`Confira: ${problemas.join(", ")}.`));
    salvar.disabled = true;
    try {
      const pedidos = [...new Set(linhas.filter((x) => x.usar.checked).map((x) => x.f.pedido_id))];
      const r = await api.comprasCriar({ fornecedor_nome: fornecedor.value.trim(), fornecedor_zoho_id: fornecedores.find((f) => f.nome === fornecedor.value.trim())?.zoho_id ?? null,
        pedido_id: pedidos.length === 1 ? pedidos[0] : null, previsao_entrega: previsao.value || null, observacao: obs.value, itens, parcelas });
      location.hash = `#/compras/${r.id}`;
    } catch (err) {
      erro.append(errorNotice(err.message));
      salvar.disabled = false;
    }
  });
  root.append(form);
}

// ---------------------------------------------------------------- compra (detalhe + recebimento)
export async function telaCompra(root, id) {
  const desenhar = async (msg) => {
    const d = await api.compra(id);
    const c = d.compra;
    const saida = h("div", { role: "status" });
    const pendentes = d.itens.filter((i) => Number(i.recebido) < Number(i.quantidade));
    const campos = pendentes.map((i) => [i, h("input", { class: "input num", inputmode: "decimal", value: qtd(Number(i.quantidade) - Number(i.recebido)), "aria-label": `Recebido de ${i.nome}` })]);
    const receber = h("button", { class: "btn btn-primary", type: "button" }, "Registrar recebimento");
    receber.addEventListener("click", async () => {
      receber.disabled = true;
      clear(saida);
      try {
        const r = await api.compraAcao(id, "receber", { itens: campos.map(([i, el]) => ({ ordem: i.ordem, quantidade: numero(el.value) || "0" })) });
        await desenhar(`Recebimento registrado no estoque.${r.reservas_completadas?.length ? ` Reservas completadas: ${r.reservas_completadas.join(", ")}.` : ""}`);
      } catch (e) {
        saida.append(errorNotice(e.message));
        receber.disabled = false;
      }
    });
    const cancelar = h("button", { class: "btn btn-ghost", type: "button" }, "Cancelar compra");
    cancelar.addEventListener("click", async () => {
      const motivo = prompt("Motivo do cancelamento:");
      if (!motivo) return;
      try {
        await api.compraAcao(id, "cancelar", { motivo });
        await desenhar("Compra cancelada; as parcelas em aberto foram canceladas.");
      } catch (e) {
        saida.append(errorNotice(e.message));
      }
    });
    clear(root).append(...[
      h("p", null, h("a", { href: "#/compras" }, "‹ Compras")),
      msg ? h("p", { class: "notice notice-ok", role: "status" }, msg) : null,
      panel({ title: `${c.numero} · ${c.fornecedor_nome}`, subtitle: `Registrada em ${formatDateTime(c.criado_em)}${c.pedido ? ` · para o pedido ${c.pedido.numero} (${c.pedido.cliente_nome})` : ""}`, actions: stamp(...(ESTADOS[c.estado] ?? [c.estado, "neutral"])) },
        h("div", { class: "grid-4" }, stat("Total", brl(c.valor_total)), stat("Previsão de entrega", c.previsao_entrega ? formatDate(c.previsao_entrega) : "—"),
          stat("Itens", String(d.itens.length), `${pendentes.length} com recebimento pendente`), stat("A pagar em aberto", brl(d.contas.filter((k) => k.estado === "aberta").reduce((s, k) => s + Number(k.valor), 0)))),
        c.observacao ? h("p", null, c.observacao) : null,
        c.estado === "aberta" ? h("div", { class: "row" }, cancelar) : null, saida),
      panel({ title: "Itens e recebimento", subtitle: pendentes.length ? "Informe o que chegou. Entra no estoque pelo custo da compra." : "Tudo recebido." },
        table({ caption: "Itens", head: ["Produto", "Comprado", "Recebido", "Custo unit.", "Subtotal", ...(pendentes.length && c.estado !== "cancelada" ? ["Chegou agora"] : [])], align: ["", "r", "r", "r", "r", "r"],
          rows: d.itens.map((i) => [h("a", { href: `#/estoque/${encodeURIComponent(i.item_id)}` }, i.nome), qtd(i.quantidade), qtd(i.recebido), brl(i.custo_unit), brl(Number(i.quantidade) * Number(i.custo_unit)),
            ...(pendentes.length && c.estado !== "cancelada" ? [campos.find(([x]) => x.id === i.id)?.[1] ?? "—"] : [])]) }),
        pendentes.length && c.estado !== "cancelada" ? h("div", { class: "row" }, receber) : null),
      panel({ title: "Parcelas a pagar", subtitle: "Pagamento registrado em Contas a pagar." },
        table({ caption: "Parcelas", head: ["#", "Vencimento", "Valor", "Situação"], align: ["", "", "r", ""],
          rows: d.contas.map((k) => [String(k.numero), formatDate(k.vencimento), brl(k.valor), stamp(...(CONTA[k.estado] ?? [k.estado, "neutral"]))]) })),
      panel({ title: "Histórico", subtitle: "Não pode ser alterado." },
        h("ul", { class: "list-plain stack-s" }, d.historico.map((x) => h("li", null, h("strong", null, x.acao), ` · ${formatDateTime(x.em)}${x.membro?.nome ? ` · ${x.membro.nome}` : ""}`)))),
    ].filter(Boolean));
  };
  await desenhar();
}

// ---------------------------------------------------------------- contas a pagar
export async function telaContasPagar(root) {
  const conteudo = h("div", { class: "stack" });
  root.append(conteudo);
  let estado = "aberta";
  const desenhar = async (msg) => {
    const { contas } = await api.contasPagar(estado);
    const saida = h("div", { role: "status" });
    const abas = h("div", { class: "row" }, Object.entries({ aberta: "Em aberto", paga: "Pagas", cancelada: "Canceladas" }).map(([k, rot]) => {
      const b = h("button", { class: "btn btn-ghost", type: "button", "aria-pressed": String(k === estado) }, rot);
      b.addEventListener("click", () => { estado = k; desenhar(); });
      return b;
    }));
    const linha = (k) => {
      const acoes = h("div", { class: "row" });
      if (k.estado === "aberta") {
        const pagar = h("button", { class: "btn btn-ghost", type: "button" }, "Pagar");
        pagar.addEventListener("click", async () => {
          const data = prompt("Data do pagamento (AAAA-MM-DD):", hoje());
          if (!data) return;
          const valor = prompt("Valor pago (R$):", dinheiro(k.valor));
          if (!valor) return;
          try {
            await api.contaPagarAcao(k.id, "pagar", { data, valor: parseMoneyInput(valor) });
            await desenhar("Pagamento registrado.");
          } catch (e) { saida.append(errorNotice(e.message)); }
        });
        acoes.append(pagar);
        if (!k.compra_id) {
          const canc = h("button", { class: "btn btn-ghost", type: "button" }, "Cancelar");
          canc.addEventListener("click", async () => {
            const motivo = prompt("Motivo do cancelamento:");
            if (!motivo) return;
            try { await api.contaPagarAcao(k.id, "cancelar", { motivo }); await desenhar("Conta cancelada."); } catch (e) { saida.append(errorNotice(e.message)); }
          });
          acoes.append(canc);
        }
      }
      return [formatDate(k.vencimento), k.descricao, k.fornecedor, CATEGORIAS[k.categoria] ?? k.categoria,
        k.compra ? h("a", { href: `#/compras/${k.compra.id}` }, k.compra.numero) : k.pedido ? h("a", { href: `#/pedidos/${k.pedido.id}` }, k.pedido.numero) : "—",
        brl(k.estado === "paga" ? k.valor_pago : k.valor),
        k.estado === "aberta" && k.vencimento < hoje() ? stamp("Vencida", "risk") : k.estado === "paga" ? `paga em ${formatDate(k.pago_em)}` : k.estado === "cancelada" ? (k.motivo_cancelamento ?? "cancelada") : "",
        acoes];
    };
    const desc = inp({ id: "cp-desc" }), forn = inp({ id: "cp-forn" }), venc = h("input", { class: "input", id: "cp-venc", type: "date" }), valor = inp({ id: "cp-valor", inputmode: "decimal", class: "input num" });
    const cat = h("select", { class: "select", id: "cp-cat" }, Object.entries(CATEGORIAS).filter(([k]) => k !== "compra").map(([k, v]) => h("option", { value: k }, v)));
    const erro = h("div", { role: "alert" });
    const criar = h("button", { class: "btn btn-primary", type: "submit" }, "Lançar conta");
    const form = h("form", { class: "stack-s", novalidate: true },
      h("div", { class: "form-grid" }, field(desc.id, "Descrição *", desc), field(forn.id, "Fornecedor / favorecido *", forn), field(cat.id, "Categoria", cat), field(venc.id, "Vencimento *", venc), field(valor.id, "Valor (R$) *", valor)),
      h("div", { class: "row" }, criar), erro);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clear(erro);
      const v = parseMoneyInput(valor.value.trim());
      if (!desc.value.trim() || !forn.value.trim() || !venc.value || !v) return erro.append(errorNotice("Preencha descrição, fornecedor, vencimento e valor."));
      criar.disabled = true;
      try {
        await api.contaPagarCriar({ descricao: desc.value, fornecedor: forn.value, categoria: cat.value, vencimento: venc.value, valor: v });
        await desenhar("Conta lançada.");
      } catch (err) { erro.append(errorNotice(err.message)); criar.disabled = false; }
    });
    const abertasTotal = estado === "aberta" ? contas.reduce((s, k) => s + Number(k.valor), 0) : null;
    clear(conteudo).append(...[
      msg ? h("p", { class: "notice notice-ok", role: "status" }, msg) : null,
      panel({ title: "Contas a pagar", subtitle: estado === "aberta" ? `${contas.length} em aberto · ${brl(abertasTotal)} · vencidas: ${brl(contas.filter((k) => k.vencimento < hoje()).reduce((s, k) => s + Number(k.valor), 0))}` : "", actions: abas },
        saida,
        contas.length ? table({ caption: "Contas", head: ["Vencimento", "Descrição", "Fornecedor", "Categoria", "Origem", "Valor", "", ""], align: ["", "", "", "", "", "r", "", ""], rows: contas.map(linha) })
          : h("p", { class: "result-empty" }, "Nenhuma conta nesta situação.")),
      panel({ title: "Lançar conta avulsa", subtitle: "Frete, serviço de terceiro, imposto, despesa fixa. Parcelas de compra nascem em Compras." }, form,
        method("Regras", "Pagamento não pode ter data futura; conta paga não volta. Cancelar exige motivo; parcela de compra só se cancela cancelando a compra.", "Tudo fica no histórico, que não pode ser alterado.")),
    ].filter(Boolean));
  };
  await desenhar();
}
