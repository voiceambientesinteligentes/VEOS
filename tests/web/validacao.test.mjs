import assert from "node:assert/strict";
import { test } from "node:test";

import { ROTEIRO, resumoValidacao } from "../../apps/web/js/domain/validacao.js";

test("roteiro cobre o fluxo pedido no P0 com ids unicos", () => {
  const ids = ROTEIRO.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ["login", "zoho-editar", "pedido", "contrato", "anexo", "biblioteca"]) assert.ok(ids.includes(id), id);
  for (const p of ROTEIRO) assert.ok(p.fazer && p.esperado && p.area && p.titulo, p.id);
});

test("resumo conta resultados e exige descricao da falha", () => {
  const r = resumoValidacao({ login: { resultado: "ok" }, celular: { resultado: "na" }, anexo: { resultado: "falhou", obs: "  " } });
  assert.equal(r.ok, 1);
  assert.equal(r.na, 1);
  assert.equal(r.falhou, 1);
  assert.equal(r.pendentes, ROTEIRO.length - 3);
  assert.equal(r.problemas.length, 1);
  const r2 = resumoValidacao({ anexo: { resultado: "falhou", obs: "link expirou antes de abrir" } });
  assert.deepEqual(r2.problemas, []);
  assert.equal(r2.falhas[0].id, "anexo");
  assert.match(r2.texto, /\[Falhou\] Documentos · Anexo PDF no pedido — link expirou antes de abrir/);
  assert.match(r2.texto, /\[Pendente\] Acesso · Entrar pelo link do e-mail/);
});
