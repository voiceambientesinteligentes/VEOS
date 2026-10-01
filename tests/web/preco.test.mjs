import assert from "node:assert/strict";
import { test } from "node:test";

import { custoAquisicao, markup, precoSugerido } from "../../apps/web/js/domain/preco.js";

test("markup do Sebrae: exemplo do Sebrae RN (DF 12, DV 15, ML 18 -> 1,82; custo 60 -> 109,09)", () => {
  assert.equal(Math.round(markup(15, 12, 18) * 100) / 100, 1.82);
  // o Sebrae arredonda o multiplicador para 1,82 (60 x 1,82 = 109,20); sem arredondar, 109,09
  assert.deepEqual(precoSugerido(60, 15, 12, 18), { markup: 1.8182, preco: 109.09 });
});

test("lacunas e limites", () => {
  assert.equal(markup("", 10, 20), null);
  assert.equal(markup(50, 30, 20), null); // soma 100%: impossivel
  assert.equal(markup(-1, 10, 10), null);
  assert.equal(precoSugerido(0, 10, 10, 10), null);
  assert.equal(markup("10,5", 9.5, 20), 100 / 60);
  assert.equal(custoAquisicao(124.59, 10, 50), 184.59);
  assert.equal(custoAquisicao(null, 10, 10), null);
});
