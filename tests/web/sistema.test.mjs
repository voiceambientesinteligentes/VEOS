import assert from "node:assert/strict";
import { test } from "node:test";

import { formatBytes, haQuanto, ultimaSincronizacao, usoLimite } from "../../apps/web/js/domain/sistema.js";

test("bytes em unidades legiveis (pt-BR)", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2 KB");
  assert.equal(formatBytes(500 * 1024 * 1024), "500,0 MB");
  assert.equal(formatBytes(1024 ** 3), "1,00 GB");
  assert.equal(formatBytes(null), "0 B");
});

test("uso do limite com faixas 60/80", () => {
  assert.deepEqual(usoLimite(50, 100), { pct: 50, tom: "ok" });
  assert.deepEqual(usoLimite(60, 100), { pct: 60, tom: "warn" });
  assert.deepEqual(usoLimite(80, 100), { pct: 80, tom: "risk" });
  assert.deepEqual(usoLimite(1, 0), { pct: 0, tom: "ok" });
});

test("tempo relativo e ultima sincronizacao", () => {
  const agora = Date.parse("2026-10-01T12:00:00Z");
  assert.equal(haQuanto(null, agora), "nunca");
  assert.equal(haQuanto("2026-10-01T11:59:30Z", agora), "agora há pouco");
  assert.equal(haQuanto("2026-10-01T11:57:00Z", agora), "há 3 min");
  assert.equal(haQuanto("2026-10-01T10:00:00Z", agora), "há 2 h");
  assert.equal(haQuanto("2026-09-29T12:00:00Z", agora), "há 2 dias");
  assert.equal(ultimaSincronizacao([{ ultima_execucao_em: "2026-10-01T10:00:00Z" }, { ultima_execucao_em: null }, { ultima_execucao_em: "2026-10-01T11:00:00Z" }]), "2026-10-01T11:00:00Z");
  assert.equal(ultimaSincronizacao([]), null);
});
