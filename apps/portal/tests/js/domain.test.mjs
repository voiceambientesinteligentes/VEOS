// Testes das camadas de dominio e servico (sem DOM). Executar:
//   node --test tests/js/
import assert from "node:assert/strict";
import { test } from "node:test";

import { cashChartModel, niceStep, pathFor } from "../../web/js/domain/chart.js";
import { compareDecimal, formatBRL, formatDate, formatPP, formatPct, maxDecimal, minDecimal, toScaled } from "../../web/js/domain/format.js";
import { changedFromBase, validateDraft } from "../../web/js/domain/params.js";
import { faixaLabel, faixaTone, groupByMeeting, parseRoute, routeHref, toggleParticipant } from "../../web/js/domain/rooms.js";
import { nextDelay, pollJob } from "../../web/js/service/jobs.js";

const LIMITS = {
  risco_pct: ["0", "20"],
  limiar_exposicao_pct: ["0", "100"],
  margem_alvo_pct: ["0", "100"],
  margem_aceitavel_pct: ["0", "100"],
  margem_minima_pct: ["0", "100"],
};
const BASE = { risco_pct: "2.00", limiar_exposicao_pct: "10.00", margem_alvo_pct: "35.00", margem_aceitavel_pct: "30.00", margem_minima_pct: "25.00" };

test("formatBRL: separadores pt-BR e arredondamento meio para cima sem float", () => {
  assert.equal(formatBRL("1234567.5"), "R$ 1.234.567,50");
  assert.equal(formatBRL("0.005"), "R$ 0,01");
  assert.equal(formatBRL("-8000.00"), "-R$ 8.000,00");
  assert.equal(formatBRL("-0.004"), "R$ 0,00");
  assert.equal(formatBRL("9007199254740993.99"), "R$ 9.007.199.254.740.993,99");
  assert.equal(formatBRL(null), "—");
  assert.equal(formatBRL("abc"), "—");
});

test("formatPct / formatPP / formatDate", () => {
  assert.equal(formatPct("40.7407"), "40,74%");
  assert.equal(formatPct("12.345", 2), "12,35%");
  assert.equal(formatPct(null), "NÃO RESOLVIDO");
  assert.equal(formatPP("-2.5"), "−2,50 p.p.");
  assert.equal(formatPP("0"), "0,00 p.p.");
  assert.equal(formatDate("2026-09-28"), "28/09/2026");
});

test("comparacao decimal exata", () => {
  assert.equal(toScaled("1.239", 2), 124n);
  assert.equal(compareDecimal("10.00", "9.999"), 1);
  assert.equal(minDecimal(["5", "-3.5", "2"]), "-3.5");
  assert.equal(maxDecimal(["0.00", "0.01"]), "0.01");
});

test("parametros: base valida e sem diferencas", () => {
  const v = validateDraft(BASE, LIMITS);
  assert.ok(v.ok);
  assert.deepEqual(changedFromBase(v.values, BASE), []);
});

test("parametros: virgula aceita, faixas e ordem alvo >= aceitavel >= minima", () => {
  let v = validateDraft({ ...BASE, risco_pct: "2,5" }, LIMITS);
  assert.ok(v.ok);
  assert.deepEqual(changedFromBase(v.values, BASE), ["risco_pct"]);
  v = validateDraft({ ...BASE, risco_pct: "21" }, LIMITS);
  assert.ok(!v.ok && v.errors.risco_pct);
  v = validateDraft({ ...BASE, margem_alvo_pct: "20" }, LIMITS);
  assert.ok(!v.ok && v.errors.margem_aceitavel_pct);
  v = validateDraft({ ...BASE, limiar_exposicao_pct: "1.234" }, LIMITS);
  assert.ok(!v.ok && v.errors.limiar_exposicao_pct);
  v = validateDraft({ ...BASE, margem_minima_pct: "" }, LIMITS);
  assert.ok(!v.ok);
});

test("grafico: dominio inclui zero e pontos ordenados", () => {
  const m = cashChartModel({
    saldo: "1000.00",
    corrente: [
      { horizonte: 30, saldo_final: "-500.00" },
      { horizonte: 60, saldo_final: "200.00" },
      { horizonte: 90, saldo_final: "800.00" },
    ],
    cenario: null,
  });
  assert.ok(m.min <= -500 && m.max >= 1000);
  assert.equal(m.a.length, 4);
  assert.equal(m.b, null);
  assert.ok(m.a[1].cy > m.zeroY, "saldo negativo abaixo da linha zero");
  assert.ok(m.a.every((p, i) => i === 0 || p.cx > m.a[i - 1].cx));
  assert.match(pathFor(m.a), /^M[\d.]+ [\d.]+ L/);
  assert.equal(niceStep(1000, 4), 250);
});

test("rotas do portal", () => {
  assert.deepEqual(parseRoute("#/sala/cfo"), { view: "cfo", room: "cfo" });
  assert.deepEqual(parseRoute("#/sala/cmo"), { view: "room", room: "cmo" });
  assert.deepEqual(parseRoute("#/sala/cto"), { view: "overview" });
  assert.equal(parseRoute("#/reuniao").view, "meeting");
  assert.equal(routeHref({ view: "room", room: "coo" }), "#/sala/coo");
});

test("reuniao: no maximo 3 participantes, ordem estavel, sem invalidos", () => {
  let s = [];
  for (const id of ["cso", "cfo", "coo", "ceo"]) s = toggleParticipant(s, id);
  assert.deepEqual(s, ["cfo", "coo", "cso"]);
  s = toggleParticipant(s, "cfo");
  assert.deepEqual(s, ["coo", "cso"]);
  assert.deepEqual(toggleParticipant(s, "secretaria"), s);
});

test("faixas: tom e rotulo", () => {
  assert.equal(faixaTone("VERDE"), "ok");
  assert.equal(faixaTone("ATENCAO"), "warn");
  assert.equal(faixaTone("ACIONADO"), "risk");
  assert.equal(faixaTone("NAO RESOLVIDO (falha fechada)"), "neutral");
  assert.equal(faixaLabel("NAO APROVADO"), "NÃO APROVADO");
});

test("transcrito agrupado por reuniao", () => {
  const g = groupByMeeting([
    { id: 1, meta: { meeting_id: "a" } },
    { id: 2, meta: { meeting_id: "b" } },
    { id: 3, meta: { meeting_id: "a" } },
  ]);
  assert.deepEqual([...g.keys()], ["a", "b"]);
  assert.deepEqual(g.get("a").map((m) => m.id), [1, 3]);
});

test("pollJob: acompanha ate estado final e tolera falha transitoria", async () => {
  const seq = [
    { status: "queued", progress: [] },
    new Error("rede"),
    { status: "running", progress: [{ step: "consultando CFO", state: "running" }] },
    { status: "done", progress: [{ step: "CFO respondeu", state: "done" }] },
  ];
  const updates = [];
  const job = await pollJob("x", {
    fetchJob: async () => {
      const item = seq.shift();
      if (item instanceof Error) throw item;
      return item;
    },
    sleep: async () => {},
    onUpdate: (j) => updates.push(j.status),
  });
  assert.equal(job.status, "done");
  assert.deepEqual(updates, ["queued", "running", "done"]);
});

test("pollJob: 404 propaga e abort interrompe", async () => {
  const notFound = Object.assign(new Error("inexistente"), { status: 404 });
  await assert.rejects(pollJob("x", { fetchJob: async () => { throw notFound; }, sleep: async () => {} }));
  const ac = new AbortController();
  ac.abort();
  assert.equal(await pollJob("x", { signal: ac.signal, fetchJob: async () => ({ status: "running", progress: [] }) }), null);
  assert.ok(nextDelay(0) < nextDelay(5) && nextDelay(100) === 3000);
});
