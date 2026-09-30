// Aba da sala CFO: formularios reais de desconto/alcada, ticket, cobertura por fase
// e reserva. O servidor recalcula tudo em Decimal; esta tela so valida formato para
// retorno imediato. Calcular nao grava nada; registrar e uma acao separada.

import { api } from "../../data/api.js";
import { alcadaTone, buildAllocations, parseMoneyInput, parsePctInput, sumReference } from "../../domain/controls.js";
import { formatBRL, formatDate, formatPP, formatPct } from "../../domain/format.js";
import { faixaLabel, faixaTone } from "../../domain/rooms.js";
import { clear, errorNotice, field, h, method, panel, stamp, stat, table, testTag } from "../dom.js";

const faixa = (f) => h("span", { class: `faixa tone-${faixaTone(f)}` }, faixaLabel(f));
const input = (id, value = "", attrs = {}) => h("input", { class: "input num", id, type: "text", inputmode: "decimal", autocomplete: "off", value, ...attrs });

function money(id, label, errors) {
  const v = parseMoneyInput(document.getElementById(id)?.value);
  if (v === null) errors.push(`${label}: informe um valor em reais (ex.: 1.234,56).`);
  return v;
}

function resultActions(ctx, tipo, entrada, assunto) {
  return h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => ctx.onDecide({ tipo, entrada, assunto }) }, "Registrar decisão sobre este cálculo"), h("span", { class: "field-hint" }, "Calcular não grava nada. O registro é uma ação sua, separada."));
}

async function run(out, ctx, tipo, entrada, render, assunto) {
  clear(out).append(h("p", { class: "muted", role: "status" }, "Calculando…"));
  try {
    const r = await api.controle(tipo, entrada);
    if (ctx.signal.aborted) return;
    clear(out).append(render(r.resultado), resultActions(ctx, tipo, entrada, assunto(r.resultado)));
  } catch (e) {
    clear(out).append(errorNotice(e.message));
  }
}

function formShell(fields, out, onSubmit, submitLabel = "Calcular") {
  const errBox = h("div", { role: "alert" });
  const form = h("form", { class: "stack-s", novalidate: true }, fields, h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "submit" }, submitLabel)), errBox);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clear(errBox);
    const errors = [];
    const go = onSubmit(errors);
    if (errors.length) errBox.append(h("ul", { class: "list-plain" }, errors.map((x) => h("li", { class: "field-error" }, x))));
    else go();
  });
  return h("div", { class: "stack" }, form, out);
}

// ---------------------------------------------------------------- desconto
function discountForm(ctx) {
  const out = h("div", { class: "result" }, h("p", { class: "result-empty" }, "Informe o cenário e calcule. O desconto recalcula RL, provisão de 2% e MC."));
  const modo = h("select", { class: "select", id: "d-modo" }, h("option", { value: "pct" }, "Percentual (%)"), h("option", { value: "valor" }, "Valor (R$)"));
  const fields = h(
    "div",
    { class: "form-grid" },
    field("d-bruto", "Valor bruto antes do desconto", input("d-bruto", "100.000,00")),
    field("d-modo", "Informar desconto como", modo),
    field("d-desc", "Desconto", input("d-desc", "2"), "Percentual sobre o valor bruto — convenção de simulação."),
    field("d-imp-sem", "Impostos sem desconto", input("d-imp-sem", "10.000,00")),
    field("d-imp-com", "Impostos com desconto", input("d-imp-com", "9.800,00"), "Informe explicitamente; não há proporcionalidade presumida."),
    field("d-custos", "Custos diretos e variáveis", input("d-custos", "50.000,00"), "Sem provisão de risco (calculada: 2% da RL)."),
  );
  return formShell(fields, out, (errors) => {
    const e = { valor_bruto: money("d-bruto", "Valor bruto", errors), impostos_sem_desconto: money("d-imp-sem", "Impostos sem desconto", errors), impostos_com_desconto: money("d-imp-com", "Impostos com desconto", errors), custos_diretos: money("d-custos", "Custos", errors) };
    const raw = document.getElementById("d-desc").value;
    if (modo.value === "pct") {
      e.desconto_pct = parsePctInput(raw);
      if (e.desconto_pct === null) errors.push("Desconto: percentual entre 0 e 100, até 2 casas.");
    } else {
      e.desconto_valor = parseMoneyInput(raw);
      if (e.desconto_valor === null) errors.push("Desconto: informe um valor em reais.");
    }
    return () => run(out, ctx, "desconto", e, renderDiscount, (r) => `Desconto de ${formatPct(r.desconto_pct)} — alçada ${r.alcada.nivel}`);
  });
}

function renderDiscount(r) {
  const a = r.antes;
  const d = r.depois;
  const line = (label, fa, fd) => [label, fa, fd];
  return h(
    "div",
    { class: "stack-s" },
    h("div", { class: "row" }, stamp(r.alcada.nivel, alcadaTone(r.alcada.nivel)), h("span", null, `Desconto ${formatBRL(r.desconto_valor)} = ${formatPct(r.desconto_pct)} do bruto`)),
    h("ul", { class: "list-plain" }, r.alcada.exigencias.map((x) => h("li", null, x))),
    table({
      head: ["", "Sem desconto", "Com desconto"],
      align: ["", "r", "r"],
      rows: [
        line("Receita líquida", formatBRL(a.rl), formatBRL(d.rl)),
        line("Provisão de risco 2%", formatBRL(a.risco), formatBRL(d.risco)),
        line("Custos diretos", formatBRL(a.custos), formatBRL(d.custos)),
        line("Margem de contribuição", formatBRL(a.mc), formatBRL(d.mc)),
        line("MC %", formatPct(a.pct), formatPct(d.pct)),
        line("Faixa", faixa(a.faixa), faixa(d.faixa)),
      ],
    }),
    h("p", null, `Variação: ${formatBRL(r.delta_mc)} de MC (${formatPP(r.delta_pp)}).`),
    method("Convenções e ordem de negociação (V1 §9)", ...r.convencoes, `Antes de reduzir preço: ${r.ordem_negociacao.join(" → ")}.`, `Fonte: ${r.fonte}`),
  );
}

// ---------------------------------------------------------------- ticket
function ticketForm(ctx) {
  const out = h("div", { class: "result" }, h("p", { class: "result-empty" }, `Ticket desejado: ${formatBRL(ctx.forms.ticket_desejado)}. Não é bloqueio.`));
  const checks = Object.entries(ctx.forms.excecoes_ticket).map(([k, v]) => {
    const c = h("input", { type: "checkbox", value: k });
    return { c, node: h("label", { class: "choice-chip" }, c, v) };
  });
  const fields = h(
    "div",
    { class: "stack-s" },
    h("div", { class: "form-grid" }, field("t-valor", "Valor do contrato", input("t-valor", "60.000,00")), field("t-margem", "MC % prevista (opcional)", input("t-margem", ""), "Usada para checar coerência; a margem exigida não muda.")),
    h("div", { class: "field", role: "group", "aria-labelledby": "t-just" }, h("span", { class: "field-label", id: "t-just" }, "Justificativas de exceção (V1 §2)"), h("div", { class: "choice-chips" }, checks.map((x) => x.node))),
  );
  return formShell(fields, out, (errors) => {
    const e = { valor_contrato: money("t-valor", "Valor do contrato", errors), justificativas: checks.filter((x) => x.c.checked).map((x) => x.c.value) };
    const mg = document.getElementById("t-margem").value.trim().replace(",", ".");
    if (mg) {
      if (!/^-?\d{1,3}(\.\d{1,4})?$/.test(mg)) errors.push("MC %: número com até 4 casas.");
      e.margem_pct = mg;
    }
    return () => run(out, ctx, "ticket", e, renderTicket, (r) => `Ticket ${formatBRL(r.valor_contrato)} — ${r.situacao}`);
  });
}

function renderTicket(r) {
  const tone = r.abaixo_do_desejado ? (r.situacao.includes("JUSTIFICADA") ? "warn" : "risk") : "ok";
  return h(
    "div",
    { class: "stack-s" },
    h("div", { class: "row" }, stamp(r.situacao, tone), h("span", null, "Bloqueio: não")),
    h("div", { class: "grid-3" }, stat("Contrato", formatBRL(r.valor_contrato), `Desejado ${formatBRL(r.ticket_desejado)}`), stat("Diferença", formatBRL(r.diferenca), r.registro_exigido ? "Registrar justificativa" : null), stat("Margem exigida", `${formatPct(r.margem_exigida.normal_pct, 0)} normal`, `Alvo ${formatPct(r.margem_exigida.alvo_pct, 0)} · piso ${formatPct(r.margem_exigida.piso_pct, 0)} — não reduzida pela exceção`)),
    r.faixa_margem ? h("p", null, "Faixa da MC informada: ", faixa(r.faixa_margem)) : null,
    r.inconsistencias.length ? h("ul", { class: "list-plain" }, r.inconsistencias.map((x) => h("li", { class: "field-error" }, x))) : null,
    r.justificativas.length ? h("p", null, `Justificativas: ${r.justificativas.map((j) => j.texto).join("; ")}.`) : null,
    method("Regra", r.regra, `Fonte: ${r.fonte}`),
  );
}

// ---------------------------------------------------------------- fases
function phasesForm(ctx) {
  const ex = ctx.forms.fases_exemplo;
  const projetos = ctx.forms.projetos;
  const out = h("div", { class: "result" }, h("p", { class: "result-empty" }, "Somente recebimentos efetivos cobrem fase. A receber não conta. Verificação — não aprova compra."));
  const proj = h("select", { class: "select", id: "f-proj" }, projetos.map((p) => h("option", { value: p.id, selected: p.id === ex.projeto }, `${p.id} · ${p.nome}`)));
  const phaseBox = h("div", { class: "stack-s" });
  const allocBox = h("div", { class: "stack-s" });
  const receiptsBox = h("div");
  let phases = ex.fases.map((f, i) => ({ ...f, ref: ex.referencia_pct?.[i] ?? "" }));
  let allocs = ex.alocacoes.map((a) => ({ ...a }));

  const current = () => projetos.find((p) => p.id === proj.value);
  function drawReceipts() {
    const p = current();
    clear(receiptsBox).append(
      method(
        `Recebimentos efetivos de ${p.id} (${p.recebimentos_efetivos.length}) e a receber que não conta`,
        table({ head: ["Recebimento", "Fatura", "Data", "Valor"], align: ["", "", "", "r"], rows: p.recebimentos_efetivos.map((r) => [r.id, r.fatura, formatDate(r.data), formatBRL(r.valor)]) }),
        table({ head: ["Fatura a receber", "Vencimento", "Em aberto (não conta)"], align: ["", "", "r"], rows: p.a_receber.filter((x) => x.aberto !== "0.00").map((x) => [x.fatura, formatDate(x.vencimento), formatBRL(x.aberto)]) }),
      ),
    );
  }
  function drawPhases() {
    clear(phaseBox).append(
      ...phases.map((f, i) =>
        h(
          "div",
          { class: "phase-row" },
          field(`fp-id-${i}`, "Fase", h("input", { class: "input", id: `fp-id-${i}`, value: f.id, oninput: (e) => { f.id = e.target.value.trim(); } })),
          field(`fp-nome-${i}`, "Descrição", h("input", { class: "input", id: `fp-nome-${i}`, value: f.nome, oninput: (e) => { f.nome = e.target.value; } })),
          field(`fp-c-${i}`, "Custos", input(`fp-c-${i}`, f.custos, { oninput: (e) => { f.custos = e.target.value; } })),
          field(`fp-e-${i}`, "Encargos", input(`fp-e-${i}`, f.encargos, { oninput: (e) => { f.encargos = e.target.value; } })),
          field(`fp-p-${i}`, "Compra proposta", input(`fp-p-${i}`, f.compra_proposta || "0", { oninput: (e) => { f.compra_proposta = e.target.value; } })),
          field(`fp-r-${i}`, "Referência %", input(`fp-r-${i}`, f.ref, { oninput: (e) => { f.ref = e.target.value; } })),
        ),
      ),
      h("div", { class: "row" },
        h("button", { class: "btn btn-ghost", type: "button", disabled: phases.length >= 10, onclick: () => { phases.push({ id: `F${phases.length + 1}`, nome: "Nova fase", custos: "0", encargos: "0", compra_proposta: "0", ref: "" }); drawPhases(); drawAllocs(); } }, "Adicionar fase"),
        h("button", { class: "btn btn-ghost", type: "button", disabled: phases.length <= 1, onclick: () => { phases.pop(); drawPhases(); drawAllocs(); } }, "Remover última fase"),
        h("span", { class: "field-hint" }, "Referência 50/40/10 é editável por cenário; deve somar 100%.")),
    );
  }
  function drawAllocs() {
    const recs = current().recebimentos_efetivos;
    clear(allocBox).append(
      h("span", { class: "field-label" }, "Alocação explícita de recebimentos efetivos às fases"),
      ...allocs.map((a, i) =>
        h(
          "div",
          { class: "alloc-row" },
          field(`fa-f-${i}`, "Fase", h("select", { class: "select", id: `fa-f-${i}`, onchange: (e) => { a.fase = e.target.value; } }, phases.map((f) => h("option", { value: f.id, selected: f.id === a.fase }, f.id)))),
          field(`fa-r-${i}`, "Recebimento", h("select", { class: "select", id: `fa-r-${i}`, onchange: (e) => { a.recebimento = e.target.value; } }, h("option", { value: "" }, "—"), recs.map((r) => h("option", { value: r.id, selected: r.id === a.recebimento }, `${r.id} · ${formatBRL(r.valor)}`)))),
          field(`fa-v-${i}`, "Valor alocado", input(`fa-v-${i}`, a.valor, { oninput: (e) => { a.valor = e.target.value; } })),
          h("button", { class: "btn btn-ghost", type: "button", "aria-label": `Remover alocação ${i + 1}`, onclick: () => { allocs.splice(i, 1); drawAllocs(); } }, "Remover"),
        ),
      ),
      h("div", { class: "row" }, h("button", { class: "btn btn-ghost", type: "button", disabled: allocs.length >= 60, onclick: () => { allocs.push({ fase: phases[0]?.id || "", recebimento: "", valor: "" }); drawAllocs(); } }, "Adicionar alocação")),
    );
  }
  proj.addEventListener("change", () => {
    allocs = [];
    drawReceipts();
    drawAllocs();
  });
  drawReceipts();
  drawPhases();
  drawAllocs();

  const fields = h("div", { class: "stack-s" }, h("div", { class: "form-grid" }, field("f-proj", "Projeto (base TESTE)", proj)), receiptsBox, phaseBox, allocBox);
  return formShell(fields, out, (errors) => {
    const fases = phases.map((f, i) => {
      const c = parseMoneyInput(f.custos);
      const en = parseMoneyInput(f.encargos);
      const cp = parseMoneyInput(f.compra_proposta || "0");
      if (!f.id || c === null || en === null || cp === null) errors.push(`Fase ${i + 1}: informe id, custos, encargos e compra proposta em reais.`);
      return { id: f.id, nome: f.nome || f.id, custos: c, encargos: en, compra_proposta: cp };
    });
    const refs = phases.map((f) => f.ref);
    const entrada = { projeto: proj.value, fases, alocacoes: [] };
    if (refs.some((r) => String(r).trim())) {
      const s = sumReference(refs);
      if (!s.ok) errors.push(`Referência: os percentuais devem somar 100% (soma atual ${s.total ?? "inválida"}).`);
      entrada.referencia_pct = refs.map((r) => parsePctInput(r) ?? r);
    }
    const available = Object.fromEntries(current().recebimentos_efetivos.map((r) => [r.id, r.valor]));
    const al = buildAllocations(allocs, available);
    errors.push(...al.errors);
    entrada.alocacoes = al.allocations;
    return () => run(out, ctx, "fases", entrada, renderPhases, (r) => `Cobertura por fase ${r.projeto}`);
  });
}

function coverageCell(c) {
  if (!c) return "—";
  return h("span", null, stamp(c.situacao, c.cobre ? "ok" : "risk"), c.cobre ? null : ` falta ${formatBRL(c.deficit)}`);
}

function renderPhases(r) {
  return h(
    "div",
    { class: "stack-s" },
    h("div", { class: "grid-4" }, stat("Recebido efetivo", formatBRL(r.recebido_efetivo_total), `até ${formatDate(r.data_base)}`), stat("Alocado às fases", formatBRL(r.alocado_total), `não alocado ${formatBRL(r.nao_alocado)}`), stat("A receber", formatBRL(r.a_receber_nao_conta), "não cobre fase"), stat("Compra aprovada?", "Não", "verificação apenas")),
    table({
      head: ["Fase", "Necessidade atual", "Coberto (recebido)", "Situação atual", "Com compra proposta", "Referência"],
      align: ["", "r", "r", "", "", "r"],
      rows: r.fases.map((f) => [
        h("span", null, f.id, h("br"), h("span", { class: "muted" }, f.nome)),
        formatBRL(f.atual.necessidade),
        formatBRL(f.coberto_recebido_efetivo),
        coverageCell(f.atual),
        f.proposta ? h("span", null, `${formatBRL(f.proposta.necessidade)} `, coverageCell(f.proposta)) : "sem compra proposta",
        f.referencia_valor ? `${formatPct(f.referencia_pct, 0)} = ${formatBRL(f.referencia_valor)}${f.referencia_cobre_necessidade ? "" : " (abaixo da necessidade)"}` : "—",
      ]),
    }),
    method("Regra e convenções", r.regra, ...r.convencoes, `Fonte: ${r.fonte}`),
  );
}

// ---------------------------------------------------------------- reserva
function reserveForm(ctx) {
  const out = h("div", { class: "result" }, h("p", { class: "result-empty" }, "Meta de 3 meses (V1 §12). Janela e método são rascunho não oficial."));
  const per = h("select", { class: "select", id: "r-per" }, ctx.forms.periodos.map((p) => h("option", { value: p, selected: p === ctx.forms.periodo_atual }, p)));
  const met = h("select", { class: "select", id: "r-met" }, h("option", { value: "" }, "Rascunho salvo"), h("option", { value: "media" }, "Média"), h("option", { value: "mediana" }, "Mediana"));
  const fields = h(
    "div",
    { class: "form-grid" },
    field("r-per", "Período (data-base)", per),
    field("r-jan", "Janela de meses completos", h("input", { class: "input num", id: "r-jan", type: "number", min: "1", max: "24", step: "1", placeholder: "rascunho salvo" })),
    field("r-met", "Método", met),
    field("r-livre", "Caixa livre (cenário, opcional)", input("r-livre", ""), "Vazio = caixa livre da base. Restrito nunca conta."),
  );
  return formShell(fields, out, (errors) => {
    const e = { periodo: per.value };
    const jan = document.getElementById("r-jan").value.trim();
    if (jan) {
      if (!/^\d{1,2}$/.test(jan) || +jan < 1 || +jan > 24) errors.push("Janela: inteiro de 1 a 24.");
      e.janela_meses = jan;
    }
    if (met.value) e.metodo = met.value;
    const livre = document.getElementById("r-livre").value.trim();
    if (livre) {
      e.caixa_livre = parseMoneyInput(livre);
      if (e.caixa_livre === null) errors.push("Caixa livre: valor em reais.");
    }
    return () => run(out, ctx, "reserva", e, renderReserve, (r) => `Reserva ${r.periodo} — ${r.situacao}`);
  });
}

function renderReserve(r) {
  const tone = r.situacao === "ATINGIDA" ? "ok" : r.situacao === "ABAIXO DA META" ? "warn" : "neutral";
  return h(
    "div",
    { class: "stack-s" },
    h("div", { class: "row" }, stamp(r.situacao, tone), h("span", null, `Data-base ${formatDate(r.data_base)} · janela ${r.janela_meses} meses · ${r.metodo}`)),
    h("div", { class: "grid-4" }, stat("Caixa livre", formatBRL(r.caixa_livre), `restrito ${formatBRL(r.caixa_restrito)} não conta`), stat("Custo fixo médio", r.base_mensal ? formatBRL(r.base_mensal) : "Desconhecido", null), stat("Meta", r.meta_valor ? formatBRL(r.meta_valor) : "Desconhecida", `${r.meta_meses} meses`), stat("Déficit", r.deficit ? formatBRL(r.deficit) : "—", r.cobertura_meses ? `cobre ${formatPct(r.cobertura_meses).replace("%", "")} meses` : null)),
    r.lacuna ? h("p", { class: "notice notice-risk" }, r.lacuna) : null,
    table({ head: ["Mês", "Custo fixo", "Situação"], align: ["", "r", ""], rows: r.meses.map((m) => [m.mes, m.valor ? formatBRL(m.valor) : "—", m.situacao]) }),
    method("Origem das regras", `Meta: ${r.origem.meta_3_meses}`, `Janela: ${r.origem.janela}`, `Método: ${r.origem.metodo}`, `Mês completo: ${r.origem.mes_completo}`, ...r.notas),
  );
}

// ---------------------------------------------------------------- montagem
const FORMS = [
  ["desconto", "Desconto e alçada", discountForm],
  ["ticket", "Ticket", ticketForm],
  ["fases", "Cobertura por fase", phasesForm],
  ["reserva", "Reserva de caixa", reserveForm],
];

export function renderControls(box, ctx) {
  const body = h("div");
  const radios = FORMS.map(([id, label], i) => {
    const r = h("input", { type: "radio", name: "cfo-controle", value: id, checked: i === 0 });
    r.addEventListener("change", () => show(id));
    return h("label", null, r, label);
  });
  function show(id) {
    const def = FORMS.find((f) => f[0] === id);
    clear(body).append(def[2](ctx));
  }
  clear(box).append(
    panel(
      { title: "Controles CFO", subtitle: "Simulações em Decimal com regras da Política V1 e da Clarificação V1.1. Resultado é proposta; nada é aprovado ou executado.", actions: testTag() },
      h("div", { class: "segmented control-switch", role: "radiogroup", "aria-label": "Controle" }, radios),
      body,
    ),
  );
  show("desconto");
}
