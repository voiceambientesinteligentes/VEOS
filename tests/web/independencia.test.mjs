import assert from "node:assert/strict";
import { test } from "node:test";

import { MODULOS_ZOHO, resumoIndependencia } from "../../apps/web/js/domain/independencia.js";

test("mapa de independencia: modulos unicos, situacoes validas e resumo so dos usados", () => {
  const chaves = MODULOS_ZOHO.map((m) => `${m.produto}.${m.modulo}`);
  assert.equal(new Set(chaves).size, chaves.length);
  assert.ok(MODULOS_ZOHO.every((m) => ["coberto", "parcial", "nao"].includes(m.situacao) && m.veos && m.falta));
  const usados = new Set(["books.items", "books.estimates", "crm.Deals"]);
  assert.deepEqual(resumoIndependencia(MODULOS_ZOHO, (p, m) => (usados.has(`${p}.${m}`) ? 10 : 0)), { usados: 3, coberto: 0, parcial: 2, nao: 1 });
});
