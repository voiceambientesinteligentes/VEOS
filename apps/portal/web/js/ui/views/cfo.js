// Tela: sala CFO - painel com dados SINTETICOS (TESTE) calculados pelo motor
// existente, simulacao de parametros separada do oficial, e conversa.

import { api } from "../../data/api.js";
import { formatBRL, formatDate, formatPP, formatPct, isPositive, maxDecimal, minDecimal } from "../../domain/format.js";
import { faixaLabel, faixaTone } from "../../domain/rooms.js";
import { cashChart } from "../chart.js";
import { clear, errorNotice, h, panel, simTag, table, testTag } from "../dom.js";
import { renderBriefing } from "./cfo_briefing.js";
import { renderControls } from "./cfo_controls.js";
import { mountDecisions } from "./cfo_decisions.js";
import { renderIndicators } from "./cfo_indicators.js";
import { roomChat, roomHeader } from "./room.js";

const faixa = (f) => h("span", { class: `faixa tone-${faixaTone(f)}` }, faixaLabel(f));
const brl = (v) => h("span", { class: "num" }, formatBRL(v));

function kpi(label, value, foot) {
  return h(
    "div",
    { class: "panel panel-tight kpi reveal" },
    h("span", { class: "kpi-label" }, label),
    h("span", { class: "kpi-value num" }, formatBRL(value)),
    h("span", { class: "kpi-foot" }, testTag(), foot),
  );
}

const TAB_DEFS = [
  ["briefing", "Briefing"],
  ["painel", "Painel TESTE"],
  ["controles", "Controles"],
  ["indicadores", "Indicadores"],
  ["decisoes", "Decisões"],
  ["conversa", "Conversa com o CFO"],
];

function tabs(onSelect, defs = TAB_DEFS) {
  const buttons = defs.map(([id, label], i) =>
    h("button", { class: "tab", type: "button", role: "tab", id: `tab-${id}`, "aria-controls": `panel-${id}`, "aria-selected": i === 0 ? "true" : "false", tabindex: i === 0 ? "0" : "-1" }, label),
  );
  const select = (idx, focus) => {
    buttons.forEach((b, i) => {
      b.setAttribute("aria-selected", String(i === idx));
      b.tabIndex = i === idx ? 0 : -1;
    });
    if (focus) buttons[idx].focus();
    onSelect(defs[idx][0]);
  };
  buttons.forEach((b, i) => {
    b.addEventListener("click", () => select(i, false));
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        select((i + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length, true);
      }
    });
  });
  const node = h("div", { class: "tabs", role: "tablist", "aria-label": "Sala CFO" }, buttons);
  return { node, selectId: (id) => select(defs.findIndex((d) => d[0] === id), true) };
}

function controls(data, state, onApply) {
  const asOf = h("input", { class: "input", type: "date", id: "cfo-asof", value: data?.as_of || "" });
  const atraso = h("input", { class: "input", type: "number", id: "cfo-atraso", min: "0", max: "365", step: "1", value: String(state.atraso ?? 0), inputmode: "numeric" });
  const props = (data?.propostas_disponiveis || []).map((p) => {
    const input = h("input", { type: "checkbox", value: p.id, checked: state.propostas.includes(p.id) });
    return { input, node: h("label", { class: "choice-chip" }, input, `${p.id} · ${formatBRL(p.valor)} · ${p.descricao}`) };
  });
  const form = h(
    "form",
    { class: "controls", "aria-label": "Cenário do painel" },
    h("div", { class: "field" }, h("label", { class: "field-label", for: "cfo-asof" }, "Data-base"), asOf),
    h("div", { class: "field" }, h("label", { class: "field-label", for: "cfo-atraso" }, "Atraso de recebimentos (dias, cenário)"), atraso),
    props.length ? h("div", { class: "field", role: "group", "aria-labelledby": "cfo-prop-label" }, h("span", { class: "field-label", id: "cfo-prop-label" }, "Gastos propostos a simular (nada é assumido)"), h("div", { class: "choice-chips" }, props.map((p) => p.node))) : null,
    h("button", { class: "btn btn-primary", type: "submit" }, "Recalcular"),
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    onApply({ asOf: asOf.value, atraso: atraso.value || "0", propostas: props.filter((p) => p.input.checked).map((p) => p.input.value) });
  });
  return form;
}

function cashTable(linhas, caption) {
  return table({
    caption,
    head: ["Horizonte", "Entradas", "Saídas", "Gastos propostos", "Saldo projetado", "Necessidade"],
    align: ["", "r", "r", "r", "r", "r"],
    rows: linhas.map((l) => [`${l.horizonte} dias`, formatBRL(l.entradas), formatBRL(l.saidas), formatBRL(l.propostas), formatBRL(l.saldo_final), formatBRL(l.necessidade)]),
  });
}

function marginPanel(data) {
  const sim = data.simulacao;
  const byId = Object.fromEntries(sim.projetos.map((p) => [p.id, p]));
  const showSim = sim.difere_da_base;
  const head = ["Projeto", "Receita Líquida", "Provisão risco", "MC orçada", "Faixa orçada", "MC realizada", "Faixa realizada"];
  if (showSim) head.push("Simulação orçada", "Simulação realizada", "Δ realizada");
  const rows = data.oficial.projetos.map((p) => {
    const r = [
      h("span", null, p.id, h("br"), h("span", { class: "muted" }, p.nome)),
      formatBRL(p.receita_liquida),
      formatBRL(p.risco),
      formatPct(p.margem_orcada.pct),
      faixa(p.margem_orcada.faixa),
      formatPct(p.margem_realizada.pct),
      faixa(p.margem_realizada.faixa),
    ];
    if (showSim) {
      const s = byId[p.id].cenario;
      r.push(
        h("span", null, formatPct(s.margem_orcada.pct), " ", faixa(s.margem_orcada.faixa)),
        h("span", null, formatPct(s.margem_realizada.pct), " ", faixa(s.margem_realizada.faixa)),
        formatPP(byId[p.id].delta_pp.margem_realizada),
      );
    }
    return r;
  });
  return panel(
    {
      title: "Margem de contribuição por projeto",
      subtitle: "Oficial: base da Política V1 (provisão 2% da RL, faixas 35/30/25). Custos fixos não rateados.",
      actions: h("span", { class: "row" }, testTag(), showSim ? simTag() : null),
    },
    showSim ? h("p", { class: "notice" }, "Colunas de simulação usam o rascunho de parâmetros. O resultado oficial não muda.") : null,
    table({ caption: "Valores TESTE", head, rows, align: ["", "r", "r", "r", "", "r", "", "", "", "r"] }),
  );
}

function exposurePanel(data) {
  const sim = Object.fromEntries(data.simulacao.projetos.map((p) => [p.id, p]));
  const showSim = data.simulacao.difere_da_base;
  const head = ["Projeto", "Valor do Contrato", "Recebido", "Compromissos", "Posição", "Exposição", "% do contrato", "Gatilho oficial"];
  if (showSim) head.push("Gatilho simulação");
  const rows = data.oficial.projetos.map((p) => {
    const r = [
      p.id,
      p.valor_contrato ? formatBRL(p.valor_contrato) : "NÃO RESOLVIDO",
      formatBRL(p.recebido),
      formatBRL(p.compromissos),
      formatBRL(p.corrente.posicao),
      formatBRL(p.corrente.exposicao),
      formatPct(p.corrente.pct, 2),
      faixa(p.corrente.gatilho),
    ];
    if (showSim) r.push(faixa(sim[p.id].cenario.exposicao.gatilho));
    return r;
  });
  const pf = data.oficial.projetos.filter((p) => p.pro_forma);
  return panel(
    { title: "Exposição de caixa por projeto", subtitle: "Posição = recebido − (pago + compromissos firmes). Gatilho só quando a exposição é superior ao limiar.", actions: testTag() },
    table({ caption: "Estado corrente — valores TESTE", head, rows, align: ["", "r", "r", "r", "r", "r", "r", ""] }),
    pf.length
      ? table({
          caption: "Pro forma com gastos propostos selecionados (simulação; nada foi assumido)",
          head: ["Projeto", "Propostas", "Proposto", "Posição pro forma", "Exposição", "%", "Gatilho"],
          align: ["", "", "r", "r", "r", "r", ""],
          rows: pf.map((p) => [p.id, p.propostas.join(", "), formatBRL(p.proposto), formatBRL(p.pro_forma.posicao), formatBRL(p.pro_forma.exposicao), formatPct(p.pro_forma.pct), faixa(p.pro_forma.gatilho)]),
        })
      : null,
  );
}

function agingPanel(data) {
  const faixas = Object.keys(data.oficial.aging.receber);
  return panel(
    { title: "Contas a receber e a pagar — aging", subtitle: `Saldos em aberto na data-base ${formatDate(data.as_of)}.`, actions: testTag() },
    table({
      caption: "Valores TESTE",
      head: ["Faixa", "A receber", "A pagar"],
      align: ["", "r", "r"],
      rows: faixas.map((f) => [f, formatBRL(data.oficial.aging.receber[f]), formatBRL(data.oficial.aging.pagar[f])]),
    }),
  );
}

function scopePanel(data, controles) {
  return panel(
    { title: "Escopo do CFO — o que ainda falta", subtitle: "O CFO não está 100% concluído. Regras sem definição na fonte permanecem pendentes." },
    table({ head: ["#", "Etapa do motor original (inalterado)", "Status"], rows: data.escopo.map((e) => [String(e.etapa), e.descricao, e.status]) }),
    controles?.length ? table({ caption: "Camada de controles do portal (cobre parte das pendências do motor, em simulação TESTE)", head: ["Item", "Status"], rows: controles.map((c) => [c.item, c.status]) }) : null,
    h("h3", null, "Pendências declaradas pelo motor"),
    h("ul", { class: "list-plain" }, data.pendencias.map((p) => h("li", null, p))),
    h("details", { class: "disclosure" }, h("summary", null, "Convenções da ferramenta e ambiguidades das fontes"), h("div", null, h("ul", { class: "list-plain" }, data.convencoes.map((c) => h("li", null, c))))),
  );
}

function dashboard(box, data, state, reload, controles) {
  const o = data.oficial;
  const scenarioOn = Number(data.atraso_dias) > 0 || o.propostas_sel.length > 0;
  const minSaldo = minDecimal(o.corrente.map((l) => l.saldo_final));
  const maxNec = maxDecimal(o.corrente.map((l) => l.necessidade));
  clear(box).append(
    h("div", { class: "banner-synthetic", role: "note" }, h("strong", null, "TESTE"), h("span", null, data.banner)),
    panel({ title: "Cenário", subtitle: data.descricao }, controls(data, state, reload)),
    h(
      "div",
      { class: "grid-4" },
      kpi("Saldo na data-base", o.saldo, `em ${formatDate(data.as_of)}`),
      kpi("Menor saldo projetado (90d)", minSaldo, "corrente"),
      kpi("Necessidade de caixa (90d)", maxNec, isPositive(maxNec) ? "há necessidade" : "sem necessidade"),
      kpi("A receber vencido", o.receber_vencido_nao_projetado, "não projetado"),
    ),
    panel(
      { title: "Caixa 30/60/90", subtitle: scenarioOn ? `Cenário: atraso de ${data.atraso_dias} dia(s); propostas: ${o.propostas_sel.join(", ") || "nenhuma"}.` : "Sem cenário aplicado — somente o estado corrente.", actions: h("span", { class: "row" }, testTag(), scenarioOn ? simTag() : null) },
      cashChart({ saldo: o.saldo, corrente: o.corrente, cenario: scenarioOn ? o.cenario : null }),
      cashTable(o.corrente, "Corrente — valores TESTE"),
      scenarioOn ? cashTable(o.cenario, "Cenário (simulação; não altera o corrente) — valores TESTE") : null,
    ),
    marginPanel(data),
    exposurePanel(data),
    agingPanel(data),
    panel(
      { title: "Recomendações", subtitle: "Propostas geradas pelo motor. Nenhuma aprovação foi registrada.", actions: testTag() },
      o.recomendacoes.length ? h("ul", { class: "list-plain" }, o.recomendacoes.map((r) => h("li", null, r))) : h("p", { class: "muted" }, "Nenhuma recomendação gerada."),
    ),
    scopePanel(data, controles),
    h("p", { class: "muted" }, `Fixture sha256 ${data.fixture_sha256.slice(0, 16)}… · sem Zoho, sem credenciais, sem transações.`),
  );
}

export async function renderCfo(root, _route, { signal }) {
  const panels = Object.fromEntries(TAB_DEFS.map(([id], i) => [id, h("div", { id: `panel-${id}`, role: "tabpanel", "aria-labelledby": `tab-${id}`, class: "stack", hidden: i !== 0 })]));
  const mounted = new Set();
  let forms = null;
  let decisions = null;
  const ctx = { signal, forms: null, onDecide: (detail) => { tabBar.selectId("decisoes"); decisions?.prefill(detail); } };

  const state = { atraso: 0, propostas: [] };
  async function load(params = {}) {
    Object.assign(state, params);
    clear(panels.painel).append(h("p", { class: "muted", role: "status" }, "Calculando com o motor CFO TESTE…"));
    try {
      const data = await api.cfoAnalysis(state);
      if (signal.aborted) return;
      state.asOf = data.as_of;
      dashboard(panels.painel, data, state, load, forms?.escopo);
      panels.painel.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    } catch (e) {
      clear(panels.painel).append(errorNotice(`Painel CFO indisponível: ${e.message}`));
    }
  }

  function needsForms(box) {
    if (forms) return false;
    clear(box).append(errorNotice("Base TESTE de controles indisponível; veja o estado em Visão geral."));
    return true;
  }

  function mount(id) {
    if (mounted.has(id)) return;
    mounted.add(id);
    const box = panels[id];
    if (id === "conversa") roomChat(box, "cfo", signal);
    else if (id === "painel") load();
    else if (needsForms(box)) mounted.delete(id);
    else if (id === "briefing") renderBriefing(box, ctx);
    else if (id === "controles") renderControls(box, ctx);
    else if (id === "indicadores") renderIndicators(box, ctx);
    else if (id === "decisoes") decisions = mountDecisions(box, ctx);
  }

  const tabBar = tabs((id) => {
    for (const [k, el] of Object.entries(panels)) el.hidden = k !== id;
    mount(id);
  });
  root.append(roomHeader("cfo"), tabBar.node, ...Object.values(panels));

  try {
    forms = await api.formularios();
    ctx.forms = forms;
  } catch (e) {
    forms = null;
  }
  if (signal.aborted) return;
  mount("briefing");
}
