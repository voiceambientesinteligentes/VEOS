// Aba da sala CFO: briefing no topo. Estrutura do skill oficial business-pulse
// (status geral, #1 prioridade com evidencia, TL;DR com numeros e deltas, riscos,
// lacunas e apendice de fontes), calculada pelo servidor sobre a base TESTE.

import { api } from "../../data/api.js";
import { comparisonLabel, indicatorValue, overallTone, severityTone } from "../../domain/controls.js";
import { formatBRL, formatDate, formatPct, isPositive } from "../../domain/format.js";
import { clear, errorNotice, h, method, panel, stamp, stat, table, testTag } from "../dom.js";

const SEV_LABEL = { critico: "Crítico", atencao: "Atenção" };

function evidenceList(evs) {
  return h("ul", { class: "evidence" }, evs.map((e) => h("li", null, e.valor, h("small", null, `${e.nome} · ${formatDate(e.data)} · ${e.fonte} · ${e.origem}`))));
}

export function periodSelect(id, periodos, atual, onChange) {
  const sel = h("select", { class: "select", id, "aria-label": "Período da base TESTE" }, periodos.map((p) => h("option", { value: p, selected: p === atual }, p)));
  sel.addEventListener("change", () => onChange(sel.value));
  return sel;
}

function priorityPanel(b, ctx) {
  const p = b.prioridade;
  if (!p) return panel({ title: "#1 Prioridade" }, h("p", null, "Nenhum alerta material na base TESTE."));
  const node = panel(
    { title: "#1 Prioridade", actions: stamp(SEV_LABEL[p.severidade], severityTone(p.severidade)) },
    h("div", { class: "stack-s" },
      h("p", { class: "priority-title" }, p.titulo),
      evidenceList(p.evidencias),
      h("p", null, h("b", null, "Próximo passo proposto: "), p.proximo_passo),
      method("Regra aplicada", p.regra),
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => ctx.onDecide({ tipo: "geral", entrada: { periodo: b.periodo }, assunto: p.titulo.slice(0, 200) }) }, "Registrar decisão sobre esta prioridade")),
    ),
  );
  node.classList.add("priority");
  return node;
}

function risksPanel(b) {
  return panel(
    { title: "Riscos e pontos de atenção", subtitle: "Cada item nomeia registro, valor e próximo passo. Propostas para decisão humana; nada foi executado." },
    table({
      head: ["Severidade", "Risco", "Evidência", "Próximo passo"],
      rows: b.riscos.map((r) => [stamp(SEV_LABEL[r.severidade], severityTone(r.severidade)), r.titulo, r.evidencias.map((e) => e.valor).join(" · "), r.proximo_passo]),
    }),
  );
}

function reservePanel(r) {
  const tone = r.situacao === "ATINGIDA" ? "ok" : r.situacao === "ABAIXO DA META" ? "warn" : "neutral";
  return panel(
    { title: "Reserva de caixa", subtitle: "Meta de 3 meses de custos fixos médios (V1 §12). A receber não substitui a reserva.", actions: stamp(r.situacao, tone) },
    h(
      "div",
      { class: "grid-4" },
      stat("Caixa livre", formatBRL(r.caixa_livre), `Restrito ${formatBRL(r.caixa_restrito)} — não conta`),
      stat("Custo fixo médio", r.base_mensal ? formatBRL(r.base_mensal) : "Desconhecido", `${r.janela_meses} meses completos · ${r.metodo}`),
      stat("Meta (3 meses)", r.meta_valor ? formatBRL(r.meta_valor) : "Desconhecida", isPositive(r.deficit) ? `Faltam ${formatBRL(r.deficit)}` : null),
      stat("Cobertura", r.cobertura_meses ? `${formatPct(r.cobertura_meses).replace("%", "")} meses` : "—", null),
    ),
    method("Metodologia (rascunho não oficial)", `Janela: ${r.origem.janela}`, `Método: ${r.origem.metodo}`, `Mês completo: ${r.origem.mes_completo}`, `Meta: ${r.origem.meta_3_meses}`, r.lacuna ? `Lacuna: ${r.lacuna}` : null),
  );
}

function gapsPanel(b) {
  if (!b.lacunas.length && !b.comparacao_indisponivel.length) return null;
  return panel(
    { title: "Lacunas", subtitle: "Dado ausente ou denominador zero aparece como indisponível — nunca como zero." },
    b.lacunas.length ? h("ul", { class: "list-plain" }, b.lacunas.map((l) => h("li", null, l))) : null,
    b.comparacao_indisponivel.length ? method(`Comparação com o período anterior indisponível em ${b.comparacao_indisponivel.length} indicador(es)`, b.comparacao_indisponivel.join(", ")) : null,
  );
}

function appendix(b) {
  const a = b.apendice;
  return h(
    "details",
    { class: "disclosure" },
    h("summary", null, "Apêndice — janela, fontes e limiares"),
    h(
      "div",
      { class: "stack-s" },
      h("p", null, `Janela: ${a.janela} · anterior: ${b.anterior || "sem baseline"}`),
      h("p", null, `Fontes usadas: ${a.fontes_usadas.join(" · ")}`),
      h("p", null, `Fontes não usadas: ${a.fontes_indisponiveis.join(" · ")}`),
      table({ head: ["Limiar", "Origem"], rows: a.limiares.map((l) => [l.limiar, l.origem]) }),
      h("p", { class: "muted" }, b.referencia),
    ),
  );
}

export async function renderBriefing(box, ctx, periodo) {
  clear(box).append(h("p", { class: "muted", role: "status" }, "Calculando briefing TESTE…"));
  let b;
  let ind;
  try {
    [b, ind] = await Promise.all([api.briefing(periodo), api.indicadores(periodo)]);
  } catch (e) {
    clear(box).append(errorNotice(`Briefing indisponível: ${e.message}`));
    return;
  }
  if (ctx.signal.aborted) return;
  const by = Object.fromEntries(ind.indicadores.map((i) => [i.id, i]));
  const tile = (id, label) => stat(label, indicatorValue(by[id]), comparisonLabel(by[id]));
  const parts = [
    h(
      "div",
      { class: "briefing-head" },
      h("div", { class: "row" }, stamp(b.status_geral, overallTone(b.status_geral)), h("p", null, b.linha)),
      h("div", { class: "row" }, testTag(), periodSelect("brief-periodo", ctx.forms.periodos, b.periodo, (v) => renderBriefing(box, ctx, v))),
    ),
    priorityPanel(b, ctx),
    panel({ title: "TL;DR" }, h("ul", { class: "tldr" }, b.tldr.map((t) => h("li", null, t)))),
    h("div", { class: "grid-4" }, tile("faturamento", "Faturamento"), tile("mc_consolidada", "MC consolidada"), tile("contas_receber", "Contas a receber"), tile("necessidade_caixa", "Necessidade de caixa 30/60/90")),
    b.riscos.length > 1 ? risksPanel(b) : null,
    reservePanel(b.reserva),
    gapsPanel(b),
    appendix(b),
  ];
  clear(box).append(...parts.filter(Boolean));
}
