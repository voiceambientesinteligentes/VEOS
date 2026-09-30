// Testes da camada de dominio dos controles CFO e integracoes (sem DOM). Executar:
//   node --test tests/js/
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  alcadaTone, arrow, buildAllocations, comparisonLabel, indicatorValue, integrationProgress,
  overallTone, parseMoneyInput, parsePctInput, severityTone, stateTone, sumReference,
} from "../../web/js/domain/controls.js";
import { parseRoute, routeHref } from "../../web/js/domain/rooms.js";

test("rotas novas: integracoes e contexto VOICE_360", () => {
  assert.equal(parseRoute("#/integracoes").view, "integrations");
  assert.equal(parseRoute("#/voice360").view, "voice360");
  assert.equal(routeHref({ view: "integrations" }), "#/integracoes");
  assert.equal(routeHref({ view: "voice360" }), "#/voice360");
});

test("parseMoneyInput: formatos pt-BR sem float", () => {
  assert.equal(parseMoneyInput("1.234,56"), "1234.56");
  assert.equal(parseMoneyInput("R$ 100.000"), "100000.00");
  assert.equal(parseMoneyInput("1234.5"), "1234.50");
  assert.equal(parseMoneyInput("0,1"), "0.10");
  assert.equal(parseMoneyInput("99999999999999"), null);
  assert.equal(parseMoneyInput("-5"), null);
  assert.equal(parseMoneyInput("1,234"), null);
  assert.equal(parseMoneyInput(""), null);
});

test("parsePctInput e referencia de fases somando exatamente 100", () => {
  assert.equal(parsePctInput("2,5"), "2.5");
  assert.equal(parsePctInput("100.01"), null);
  assert.equal(parsePctInput("abc"), null);
  assert.deepEqual(sumReference(["50", "40", "10"]), { ok: true, total: "100.00" });
  assert.equal(sumReference(["50", "40", "5"]).ok, false);
  assert.equal(sumReference(["33.33", "33.33", "33.34"]).ok, true);
  assert.equal(sumReference(["x"]).total, null);
});

test("comparacao: seta, delta em R$, variacao e p.p. para margens", () => {
  const brl = { unidade: "BRL", comparacao: { status: "OK", delta: "-19000.00", variacao_pct: "-12.6667", periodo_anterior: "2026-08" } };
  assert.equal(comparisonLabel(brl), "▼ R$ 19.000,00 (-12,7%) vs 2026-08");
  const pp = { unidade: "%", comparacao: { status: "OK", delta_pp: "-0.6283", periodo_anterior: "2026-08" } };
  assert.equal(comparisonLabel(pp), "▼ −0,63 p.p. vs 2026-08");
  const zero = { unidade: "BRL", comparacao: { status: "OK", delta: "9000.00", variacao_pct: null, periodo_anterior: "2026-08" } };
  assert.match(comparisonLabel(zero), /^▲ R\$ 9\.000,00 \(variação % indefinida\)/);
  assert.equal(comparisonLabel({ comparacao: { status: "INDISPONIVEL", motivo: "sem periodo anterior na base (sem baseline)" } }), "sem comparação: sem periodo anterior na base (sem baseline)");
  assert.equal(arrow("0"), "▬");
});

test("valor de indicador: ausente nunca vira zero", () => {
  assert.equal(indicatorValue({ unidade: "BRL", valor: null }), "Indisponível");
  assert.equal(indicatorValue({ unidade: "BRL", valor: "131000.00" }), "R$ 131.000,00");
  assert.equal(indicatorValue({ unidade: "%", valor: "37.5833" }), "37,58%");
  assert.equal(indicatorValue({ unidade: "dias", valor: "13.3077" }), "13,31 dias");
  assert.equal(indicatorValue({ unidade: "lista", itens: [{}, {}] }), "2 projeto(s)");
});

test("tons semanticos", () => {
  assert.equal(severityTone("critico"), "risk");
  assert.equal(overallTone("ATENCAO"), "warn");
  assert.equal(alcadaTone("NAO RESOLVIDO"), "neutral");
  assert.equal(alcadaTone("EXTRAORDINARIA"), "risk");
  assert.equal(stateTone("CONECTADO"), "ok");
  assert.equal(stateTone("VERIFICACAO FALHOU"), "risk");
  assert.equal(stateTone("NAO VERIFICADO"), "neutral");
});

test("progresso de integracoes: contagens, sem percentual global", () => {
  const rows = integrationProgress({ catalogo_total: 59, servidor_conectado: 3, leitura_testada_ok: 1, leitura_com_erro: 0, com_probe_disponivel: 3, dados_confiaveis: 0, acoes_autorizadas: 0 });
  assert.equal(rows.length, 6);
  assert.equal(rows[1].count, 3);
  assert.equal(rows[1].total, 59);
  assert.ok(rows.every((r) => !("percent" in r)));
});

test("alocacao por fase: sem reutilizacao do mesmo recebimento", () => {
  const avail = { "RC-1": "75000.00", "RC-2": "20000.00" };
  let r = buildAllocations([
    { fase: "F1", recebimento: "RC-1", valor: "21.000,00" },
    { fase: "F2", recebimento: "RC-1", valor: "54000" },
    { fase: "F2", recebimento: "RC-2", valor: "20000" },
  ], avail);
  assert.ok(r.ok, r.errors.join(";"));
  assert.equal(r.allocations[0].valor, "21000.00");
  r = buildAllocations([
    { fase: "F1", recebimento: "RC-1", valor: "60000" },
    { fase: "F2", recebimento: "RC-1", valor: "20000" },
  ], avail);
  assert.ok(!r.ok && /reutilização/.test(r.errors[0]));
  r = buildAllocations([{ fase: "F1", recebimento: "F-10-2", valor: "1" }], avail);
  assert.ok(!r.ok && /não é recebimento efetivo/.test(r.errors[0]));
  r = buildAllocations([{ fase: "F1", recebimento: "RC-2", valor: "1" }, { fase: "F1", recebimento: "RC-2", valor: "1" }], avail);
  assert.ok(!r.ok);
  assert.ok(buildAllocations([{ fase: "", recebimento: "", valor: "" }], avail).ok, "linha vazia ignorada");
});
