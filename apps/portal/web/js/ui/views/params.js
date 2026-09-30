// Tela: parametros percentuais do CFO - RASCUNHO DE SIMULACAO. A base oficial e
// exibida lado a lado e nunca e alterada.

import { api } from "../../data/api.js";
import { formatDateTime, formatPct } from "../../domain/format.js";
import { PARAM_KEYS, changedFromBase, validateDraft } from "../../domain/params.js";
import { faixaLabel, faixaTone } from "../../domain/rooms.js";
import { clear, errorNotice, h, panel, simTag, table, testTag } from "../dom.js";

const faixa = (f) => h("span", { class: `faixa tone-${faixaTone(f)}` }, faixaLabel(f));
const show = (v) => String(v).replace(".", ",");

function impactTable(data) {
  const changed = data.simulacao.projetos.filter((p) => p.mudou_classificacao).length;
  return table({
    caption: `Impacto do rascunho sobre a fixture TESTE — ${changed} projeto(s) mudam de classificação`,
    head: ["Projeto", "Margem orçada (oficial → simulação)", "Margem realizada (oficial → simulação)", "Gatilho (oficial → simulação)"],
    rows: data.simulacao.projetos.map((p) => [
      h("span", null, p.id, p.mudou_classificacao ? h("span", { class: "muted" }, " · muda") : null),
      h("span", null, faixa(p.oficial.margem_orcada.faixa), " → ", formatPct(p.cenario.margem_orcada.pct), " ", faixa(p.cenario.margem_orcada.faixa)),
      h("span", null, faixa(p.oficial.margem_realizada.faixa), " → ", formatPct(p.cenario.margem_realizada.pct), " ", faixa(p.cenario.margem_realizada.faixa)),
      h("span", null, faixa(p.oficial.exposicao.gatilho), " → ", faixa(p.cenario.exposicao.gatilho)),
    ]),
  });
}

export async function renderParams(root, _route, { signal }) {
  root.append(
    h(
      "header",
      { class: "view-head" },
      h("div", null, h("span", { class: "eyebrow" }, "Simulação · CFO"), h("h1", null, "Parâmetros percentuais"), h("p", null, "Rascunho para testar cenários. As regras oficiais (Política V1 e Clarificação V1.1) não são alteradas e continuam calculando o resultado oficial.")),
      simTag(),
    ),
  );
  const formBox = h("div");
  const impactBox = h("div");
  root.append(h("div", { class: "stack" }, formBox, impactBox));

  let payload;
  try {
    payload = await api.settings();
  } catch (e) {
    formBox.append(errorNotice(e.message));
    return;
  }
  if (signal.aborted) return;

  const inputs = {};
  const errs = {};
  const status = h("p", { class: "field-hint", role: "status", "aria-live": "polite" });
  const saveBtn = h("button", { class: "btn btn-primary", type: "submit" }, "Salvar rascunho");
  const resetBtn = h("button", { class: "btn", type: "button" }, "Restaurar base oficial");

  const rows = PARAM_KEYS.map((k) => {
    const id = `param-${k}`;
    inputs[k] = h("input", { class: "input num", id, type: "text", inputmode: "decimal", autocomplete: "off", value: show(payload.rascunho[k]), "aria-describedby": `${id}-err ${id}-base` });
    errs[k] = h("span", { class: "field-error", id: `${id}-err` });
    return h(
      "div",
      { class: "param-row" },
      h("div", { class: "field" }, h("label", { class: "field-label", for: id }, payload.rotulos[k]), h("span", { class: "field-hint" }, `Intervalo ${show(payload.limites[k][0])} a ${show(payload.limites[k][1])}%`)),
      h("div", { class: "field" }, inputs[k], errs[k]),
      h("div", { class: "param-base", id: `${id}-base` }, "Base oficial ", h("b", { class: "num" }, `${show(payload.base_oficial[k])}%`)),
    );
  });

  function readDraft() {
    return Object.fromEntries(PARAM_KEYS.map((k) => [k, inputs[k].value]));
  }
  function check() {
    const v = validateDraft(readDraft(), payload.limites);
    for (const k of PARAM_KEYS) {
      errs[k].textContent = v.errors[k] || "";
      inputs[k].setAttribute("aria-invalid", v.errors[k] ? "true" : "false");
    }
    const diff = v.ok ? changedFromBase(v.values, payload.base_oficial) : [];
    status.textContent = v.ok ? (diff.length ? `${diff.length} parâmetro(s) diferem da base oficial.` : "Igual à base oficial.") : "Corrija os campos destacados.";
    saveBtn.disabled = !v.ok;
    return v;
  }
  Object.values(inputs).forEach((i) => i.addEventListener("input", check));

  async function refreshImpact() {
    clear(impactBox);
    try {
      const data = await api.cfoAnalysis();
      if (signal.aborted) return;
      impactBox.append(panel({ title: "Impacto na base de teste", subtitle: payload.difere_da_base ? "Comparação entre base oficial e rascunho salvo." : "Rascunho igual à base: nenhuma diferença.", actions: h("span", { class: "row" }, testTag(), simTag()) }, impactTable(data)));
    } catch (e) {
      impactBox.append(errorNotice(`Impacto indisponível: ${e.message}`));
    }
  }

  const form = h(
    "form",
    { novalidate: true },
    rows,
    h("div", { class: "row" }, saveBtn, resetBtn, status),
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = check();
    if (!v.ok) return;
    saveBtn.disabled = true;
    try {
      payload = await api.saveSettings(v.values);
      status.textContent = `Rascunho salvo ${formatDateTime(payload.atualizado_em)}.`;
      await refreshImpact();
    } catch (err) {
      status.textContent = `Não salvo: ${err.message}`;
    } finally {
      saveBtn.disabled = false;
    }
  });
  resetBtn.addEventListener("click", async () => {
    try {
      payload = await api.resetSettings();
      for (const k of PARAM_KEYS) inputs[k].value = show(payload.rascunho[k]);
      check();
      status.textContent = "Rascunho removido; valores da base oficial restaurados.";
      await refreshImpact();
    } catch (err) {
      status.textContent = `Não restaurado: ${err.message}`;
    }
  });

  formBox.append(
    panel(
      { title: "Rascunho de simulação", subtitle: payload.aviso, accent: true },
      payload.rascunho_invalido ? errorNotice(`Rascunho salvo era inválido e foi ignorado: ${payload.rascunho_invalido}`) : null,
      form,
    ),
  );
  check();
  refreshImpact();
}
