// Aba da sala CFO: quinze indicadores da V1 §13 com valor, comparacao entre
// periodos (financial-statements: delta R$, variacao sobre |anterior|, p.p. para
// margens), origem da regra e status. Metodologia, fonte e data ficam recolhidas.

import { api } from "../../data/api.js";
import { comparisonLabel, indicatorValue } from "../../domain/controls.js";
import { formatBRL, formatDate, formatDateTime, formatPP, formatPct } from "../../domain/format.js";
import { faixaLabel, faixaTone } from "../../domain/rooms.js";
import { clear, errorNotice, h, method, panel, stamp, table, testTag } from "../dom.js";
import { periodSelect } from "./cfo_briefing.js";

const faixa = (f) => h("span", { class: `faixa tone-${faixaTone(f)}` }, faixaLabel(f));
const ORIGEM = {
  POLITICA: ["Política", "live"],
  "CONVENCAO DE SIMULACAO": ["Convenção", "neutral"],
  "RASCUNHO NAO OFICIAL": ["Rascunho", "warn"],
};

function itemsTable(i) {
  const it = i.itens || [];
  if (!it.length) return null;
  switch (i.id) {
    case "mc_projeto":
      return table({ head: ["Projeto", "RL", "MC", "MC %", "Faixa", "Δ vs anterior"], align: ["", "r", "r", "r", "", "r"], rows: it.map((x) => [x.projeto, formatBRL(x.rl), formatBRL(x.mc), formatPct(x.pct), faixa(x.faixa), x.delta_pp === null || x.delta_pp === undefined ? "—" : formatPP(x.delta_pp)]) });
    case "exposicao_projeto":
      return table({ head: ["Projeto", "Contrato", "Recebido", "Compromissos", "Exposição", "%", "Gatilho"], align: ["", "r", "r", "r", "r", "r", ""], rows: it.map((x) => [x.projeto, x.valor_contrato ? formatBRL(x.valor_contrato) : "NÃO RESOLVIDO", formatBRL(x.recebido), formatBRL(x.compromissos), formatBRL(x.exposicao), formatPct(x.pct), faixa(x.gatilho)]) });
    case "necessidade_caixa":
      return table({ head: ["Horizonte", "Caixa livre", "Entradas", "Saídas", "Saldo", "Necessidade"], align: ["", "r", "r", "r", "r", "r"], rows: it.map((x) => [`${x.horizonte} dias`, formatBRL(x.caixa_livre), formatBRL(x.entradas), formatBRL(x.saidas), formatBRL(x.saldo_final), formatBRL(x.necessidade)]) });
    case "inadimplencia":
      return table({ head: ["Fatura", "Cliente", "Em aberto", "Dias de atraso"], align: ["", "", "r", "r"], rows: it.map((x) => [x.fatura, x.cliente, formatBRL(x.aberto), String(x.dias_atraso)]) });
    default:
      return table({ head: ["Nome", "Valor", "Participação"], align: ["", "r", "r"], rows: it.map((x) => [x.nome, formatBRL(x.valor), formatPct(x.pct)]) });
  }
}

function indicatorRow(i) {
  const [origem, tone] = ORIGEM[i.origem] || [i.origem, "neutral"];
  const meta = i.meta ? `Meta: ${i.meta.texto}${i.meta.situacao ? ` — ${i.meta.situacao}` : ""}${i.meta.ressalva ? ` (${i.meta.ressalva})` : ""}` : null;
  return [
    h("div", { class: "stack-s" }, h("span", { class: "app-name" }, i.nome), method("Metodologia, fonte e data", `Metodologia: ${i.metodologia}`, `Fonte: ${i.fonte}`, `Data: ${formatDate(i.data)} · período ${i.periodo}`, i.lacuna ? `Lacuna: ${i.lacuna}` : null, meta, itemsTable(i))),
    indicatorValue(i),
    comparisonLabel(i),
    stamp(origem, tone),
    stamp(i.status === "INDISPONIVEL" ? "Indisponível" : "Calculado", i.status === "INDISPONIVEL" ? "risk" : "ok"),
  ];
}

async function methodologyEditor(box, onSaved) {
  let pl;
  try {
    pl = await api.metodologias();
  } catch (e) {
    box.append(errorNotice(e.message));
    return;
  }
  const inputs = {};
  const rows = Object.keys(pl.rascunho).map((k) => {
    const opc = pl.opcoes[k];
    const id = `met-${k}`;
    inputs[k] = typeof opc[0] === "number"
      ? h("input", { class: "input num", id, type: "number", min: String(opc[0]), max: String(opc[1]), step: "1", value: String(pl.rascunho[k]) })
      : h("select", { class: "select", id }, opc.map((o) => h("option", { value: o, selected: o === pl.rascunho[k] }, o)));
    return h("div", { class: "field" }, h("label", { class: "field-label", for: id }, pl.rotulos[k]), inputs[k], h("span", { class: "field-hint" }, `Padrão de simulação: ${pl.padrao_simulacao[k]}`));
  });
  const status = h("p", { class: "field-hint", role: "status", "aria-live": "polite" }, pl.atualizado_em ? `Rascunho salvo ${formatDateTime(pl.atualizado_em)}.` : "Usando o padrão de simulação.");
  const save = h("button", { class: "btn btn-primary", type: "submit" }, "Salvar rascunho");
  const reset = h("button", { class: "btn", type: "button" }, "Restaurar padrão");
  const form = h("form", { class: "stack-s", novalidate: true }, h("div", { class: "form-grid" }, rows), h("div", { class: "row" }, save, reset, status));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, typeof pl.opcoes[k][0] === "number" ? Number.parseInt(el.value, 10) : el.value]));
    try {
      pl = await api.saveMetodologias(raw);
      status.textContent = `Rascunho salvo ${formatDateTime(pl.atualizado_em)}.`;
      onSaved();
    } catch (err) {
      status.textContent = `Não salvo: ${err.message}`;
    }
  });
  reset.addEventListener("click", async () => {
    try {
      pl = await api.resetMetodologias();
      for (const [k, el] of Object.entries(inputs)) el.value = String(pl.rascunho[k]);
      status.textContent = "Padrão de simulação restaurado.";
      onSaved();
    } catch (err) {
      status.textContent = `Não restaurado: ${err.message}`;
    }
  });
  box.append(
    h("details", { class: "disclosure" }, h("summary", null, "Metodologias não definidas pela política — rascunho não oficial"), h("div", { class: "stack-s" }, h("p", { class: "muted" }, pl.aviso), pl.rascunho_invalido ? errorNotice(`Rascunho salvo era inválido e foi ignorado: ${pl.rascunho_invalido}`) : null, form)),
  );
}

export async function renderIndicators(box, ctx, periodo) {
  clear(box).append(h("p", { class: "muted", role: "status" }, "Calculando indicadores TESTE…"));
  let ind;
  try {
    ind = await api.indicadores(periodo);
  } catch (e) {
    clear(box).append(errorNotice(`Indicadores indisponíveis: ${e.message}`));
    return;
  }
  if (ctx.signal.aborted) return;
  const editorBox = h("div");
  clear(box).append(
    panel(
      {
        title: "Indicadores de saúde financeira (V1 §13)",
        subtitle: `Período ${ind.periodo} (${formatDate(ind.inicio)} a ${formatDate(ind.fim)}) comparado a ${ind.anterior || "— sem baseline"}. Gerencial: não é DRE contábil; faturamento, contrato, receita líquida e caixa são grandezas distintas.`,
        actions: h("span", { class: "row" }, testTag(), periodSelect("ind-periodo", ctx.forms.periodos, ind.periodo, (v) => renderIndicators(box, ctx, v))),
      },
      table({ head: ["Indicador", "Valor", "Comparação", "Origem da regra", "Status"], align: ["", "r", "", "", ""], rows: ind.indicadores.map(indicatorRow) }),
    ),
    editorBox,
  );
  methodologyEditor(editorBox, () => renderIndicators(box, ctx, ind.periodo));
}
