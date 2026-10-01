import assert from "node:assert/strict";
import { test } from "node:test";

import { celulaCSV, nomeArquivo, paraCSV } from "../../apps/web/js/domain/exportar.js";

test("celulas no padrao do Excel pt-BR", () => {
  assert.equal(celulaCSV(null), "");
  assert.equal(celulaCSV(1500.5), "1500,5");
  assert.equal(celulaCSV("1500.00"), "1500,00");
  assert.equal(celulaCSV("4823000000123"), "4823000000123");
  assert.equal(celulaCSV(true), "sim");
  assert.equal(celulaCSV("Rua A; 10"), '"Rua A; 10"');
  assert.equal(celulaCSV('diz "oi"'), '"diz ""oi"""');
  assert.equal(celulaCSV("linha1\nlinha2"), '"linha1\nlinha2"');
  assert.equal(celulaCSV({ a: 1 }), '"{""a"":1}"');
  assert.equal(celulaCSV("2026-10-01"), "2026-10-01");
});

test("bloqueia injecao de formula, mas nao numero negativo", () => {
  assert.equal(celulaCSV("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
  assert.equal(celulaCSV("@SOMA(A1)"), "'@SOMA(A1)");
  assert.equal(celulaCSV("-12.50"), "-12,50");
  assert.equal(celulaCSV(-3), "-3");
});

test("arquivo com BOM, cabecalho e CRLF", () => {
  const csv = paraCSV(["numero", "valor", "cliente"], [{ numero: "PED-00001", valor: "1500.00", cliente: "Cliente TESTE" }, { numero: "PED-00002", valor: null }]);
  assert.equal(csv, "﻿numero;valor;cliente\r\nPED-00001;1500,00;Cliente TESTE\r\nPED-00002;;\r\n");
  assert.equal(nomeArquivo("pedidos", new Date("2026-10-01T12:00:00Z")), "veos-pedidos-2026-10-01.csv");
});
