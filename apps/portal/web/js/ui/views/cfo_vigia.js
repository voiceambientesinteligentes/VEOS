// Aba da sala CFO: vigia (sistema vivo). O vendedor monta um orcamento TESTE e o
// servidor devolve os avisos do CFO com regra e fonte. Calculo puro: nada e gravado.

import { api } from "../../data/api.js";
import { alcadaTone, parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, formatPct } from "../../domain/format.js";
import { faixaLabel, faixaTone } from "../../domain/rooms.js";
import { clear, errorNotice, field, h, panel, stamp, stat, testTag } from "../dom.js";

const SITUACAO = {
  OK: ["Pode seguir", "ok"],
  REVISAR: ["Revisar antes de enviar", "warn"],
  BLOQUEAR_ENVIO: ["Não enviar ao cliente", "risk"],
};
const SEV_TONE = { INFO: "ok", MEDIO: "neutral", ALTO: "warn", CRITICO: "risk" };
const EXEMPLO = [
  ["CENTRAL", "2", "50.000,00", "25.000,00"],
  ["REDE", "1", "20.000,00", "12.000,00"],
];

const cell = (value, label, attrs = {}) =>
  h("input", { class: "input num", type: "text", autocomplete: "off", value, "aria-label": label, ...attrs });

function itemRow(values = ["", "1", "", ""]) {
  const [codigo, qtd, preco, custo] = values;
  const row = h(
    "div",
    { class: "form-grid vigia-item" },
    cell(codigo, "Código do item", { class: "input" }),
    cell(qtd, "Quantidade", { inputmode: "numeric" }),
    cell(preco, "Preço unitário (R$)", { inputmode: "decimal" }),
    cell(custo, "Custo unitário (R$) — vazio se desconhecido", { inputmode: "decimal" }),
  );
  const remove = h("button", { class: "btn", type: "button", "aria-label": "Remover item" }, "Remover");
  remove.addEventListener("click", () => row.remove());
  row.append(remove);
  return row;
}

function readItems(list, errors) {
  return [...list.querySelectorAll(".vigia-item")].map((row, i) => {
    const [codigo, qtd, preco, custo] = [...row.querySelectorAll("input")].map((x) => x.value.trim());
    const p = parseMoneyInput(preco);
    const c = custo ? parseMoneyInput(custo) : null;
    if (!codigo) errors.push(`Item ${i + 1}: informe o código.`);
    if (!/^[1-9]\d{0,5}$/.test(qtd)) errors.push(`Item ${i + 1}: quantidade inteira maior que zero.`);
    if (p === null) errors.push(`Item ${i + 1}: preço unitário inválido.`);
    if (custo && c === null) errors.push(`Item ${i + 1}: custo inválido (deixe vazio se desconhecido).`);
    return { codigo, quantidade: qtd, preco_unitario: p, custo_unitario: c };
  });
}

function renderResult(r) {
  const [label, tone] = SITUACAO[r.situacao] || [r.situacao, "neutral"];
  const res = r.resumo;
  return h(
    "div",
    { class: "stack" },
    h("div", { class: "row" }, stamp(label, tone), testTag()),
    h(
      "div",
      { class: "form-grid" },
      stat("Soma dos itens", formatBRL(res.soma_itens)),
      stat("Total informado", formatBRL(res.valor_informado)),
      stat("Valor líquido", formatBRL(res.valor_liquido), `desconto ${formatPct(res.desconto_pct)}`),
      stat("Margem de contribuição", res.margem_pct === null ? "não calculada" : formatPct(res.margem_pct),
        res.faixa_margem ? h("span", { class: `faixa tone-${faixaTone(res.faixa_margem)}` }, faixaLabel(res.faixa_margem)) : null),
      res.alcada ? stat("Alçada", h("span", { class: `faixa tone-${alcadaTone(res.alcada)}` }, res.alcada)) : null,
    ),
    h(
      "ul",
      { class: "list-plain vigia-avisos stack-s", "aria-label": "Avisos do CFO" },
      r.avisos.map((a) =>
        h(
          "li",
          { class: "panel panel-tight" },
          h("div", { class: "row" }, stamp(a.severidade, SEV_TONE[a.severidade]), h("strong", null, `${a.diretor}: ${a.titulo}`)),
          h("p", null, a.mensagem),
          h("p", { class: "field-hint" }, `Fonte: ${a.fonte} · ${a.origem}`),
        ),
      ),
    ),
    r.lacunas.length
      ? h("div", null, h("strong", null, "Lacunas (dado ausente nunca vira zero)"), h("ul", null, r.lacunas.map((l) => h("li", null, l))))
      : null,
    h("p", { class: "field-hint" }, r.nota),
  );
}

export function renderVigia(box, ctx) {
  const list = h("div", { class: "stack-s" }, EXEMPLO.map(itemRow));
  const add = h("button", { class: "btn", type: "button" }, "Adicionar item");
  add.addEventListener("click", () => list.append(itemRow()));
  const total = cell("120.000,00", "Total informado pelo vendedor", { id: "v-total", inputmode: "decimal" });
  const desconto = cell("", "Desconto (R$)", { id: "v-desc", inputmode: "decimal" });
  const impostos = cell("12.000,00", "Impostos (R$)", { id: "v-imp", inputmode: "decimal" });
  const out = h("div", { class: "result" }, h("p", { class: "result-empty" }, "Salve o orçamento TESTE para ver os avisos do CFO."));
  const errBox = h("div", { role: "alert" });
  const form = h(
    "form",
    { class: "stack-s", novalidate: true },
    h("p", { class: "field-hint" }, "Colunas: código · quantidade · preço unitário · custo unitário (vazio = desconhecido)"),
    list,
    h("div", { class: "row" }, add),
    h(
      "div",
      { class: "form-grid" },
      field("v-total", "Total informado pelo vendedor", total),
      field("v-desc", "Desconto (R$)", desconto, "Vazio = sem desconto."),
      field("v-imp", "Impostos (R$)", impostos, "Vazio = desconhecido: a margem não é calculada."),
    ),
    h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "submit" }, "Salvar orçamento TESTE")),
    errBox,
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(errBox);
    const errors = [];
    const itens = readItems(list, errors);
    if (!itens.length) errors.push("Inclua ao menos um item.");
    const tot = parseMoneyInput(total.value);
    if (tot === null) errors.push("Total informado inválido.");
    const desc = desconto.value.trim() ? parseMoneyInput(desconto.value) : null;
    if (desconto.value.trim() && desc === null) errors.push("Desconto inválido.");
    const imp = impostos.value.trim() ? parseMoneyInput(impostos.value) : null;
    if (impostos.value.trim() && imp === null) errors.push("Impostos inválidos.");
    if (errors.length) {
      errBox.append(h("ul", { class: "list-plain" }, errors.map((x) => h("li", { class: "field-error" }, x))));
      return;
    }
    const entrada = { id: "ORC-TESTE-PORTAL", ambiente: "TESTE", itens, valor_total_informado: tot };
    if (desc !== null) entrada.desconto_valor = desc;
    if (imp !== null) entrada.impostos = imp;
    clear(out).append(h("p", { class: "muted", role: "status" }, "O CFO está conferindo…"));
    try {
      const r = await api.vigiaOrcamento(entrada);
      if (ctx.signal.aborted) return;
      clear(out).append(renderResult(r));
    } catch (err) {
      clear(out).append(errorNotice(err.message));
    }
  });
  clear(box).append(
    panel(
      { title: "Avisos do CFO (vigia)", subtitle: "Sistema vivo: ao salvar um orçamento, o CFO confere soma, custos, margem, alçada e ticket pela Política V1. Nada é gravado ou aprovado.", actions: testTag() },
      form,
      out,
    ),
  );
}
