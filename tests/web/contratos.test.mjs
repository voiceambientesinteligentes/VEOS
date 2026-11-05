import { test } from "node:test";
import assert from "node:assert/strict";
import { indicadoresRecorrencia, normalizarContrato } from "../../apps/web/js/domain/contratos.js";

test("contrato: exige cliente, descrição, valor, início; dia de 1 a 28", () => {
  assert.equal(normalizarContrato({}).erros.length, 4);
  const ok = normalizarContrato({ cliente_nome: "Família Lima", descricao: "Suporte mensal", valor_mensal: "1.200,50".replace(".", "").replace(",", "."), dia_vencimento: "5", inicio: "2026-11-01", fim: "" });
  assert.deepEqual(ok.erros, []);
  assert.equal(ok.dados.valor_mensal, 1200.5);
  assert.equal(ok.dados.dia_vencimento, 5);
  assert.equal(ok.dados.fim, null);
  assert.ok(normalizarContrato({ cliente_nome: "Ana", descricao: "xx", valor_mensal: 10, dia_vencimento: 31, inicio: "2026-11-01" }).erros.some((e) => /1 a 28/.test(e)));
  assert.ok(normalizarContrato({ cliente_nome: "Ana", descricao: "xx", valor_mensal: 10, inicio: "2026-11-10", fim: "2026-11-01" }).erros.some((e) => /fim/.test(e)));
});
test("contrato: alteração parcial só valida o que veio", () => {
  assert.deepEqual(normalizarContrato({ valor_mensal: 1500 }, { parcial: true }).erros, []);
  assert.deepEqual(Object.keys(normalizarContrato({ valor_mensal: 1500 }, { parcial: true }).dados), ["valor_mensal"]);
  assert.equal(normalizarContrato({ estado: "x" }, { parcial: true }).erros.length, 1);
  assert.equal(normalizarContrato({ valor_mensal: 0 }, { parcial: true }).erros.length, 1);
});
test("recorrência: MRR só de ativos, atrasadas e próxima cobrança", () => {
  const i = indicadoresRecorrencia(
    [{ estado: "ativo", valor_mensal: "1000" }, { estado: "ativo", valor_mensal: "500" }, { estado: "suspenso", valor_mensal: "900" }],
    [{ estado: "aberta", vencimento: "2026-10-10", valor: "1000" }, { estado: "aberta", vencimento: "2026-11-20", valor: "1000" }, { estado: "aberta", vencimento: "2026-12-10", valor: "1000" }, { estado: "recebida", vencimento: "2026-09-10", valor: "1000" }], "2026-11-05");
  assert.deepEqual([i.mrr, i.arr, i.contratos_ativos, i.abertas, i.atrasadas, i.valor_atrasado, i.proxima.vencimento], [1500, 18000, 2, 3, 1, 1000, "2026-11-20"]);
});
