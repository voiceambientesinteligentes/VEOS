import assert from "node:assert/strict";
import { test } from "node:test";

import { escala, resumoPainel, rotuloMes } from "../../apps/web/js/domain/painel.js";

test("escala redonda do eixo com 3 marcas", () => {
  assert.deepEqual(escala(0), { topo: 1, marcas: [] });
  assert.deepEqual(escala(290000), { topo: 300000, marcas: [100000, 200000, 300000] });
  assert.deepEqual(escala(70), { topo: 75, marcas: [25, 50, 75] });
  assert.equal(rotuloMes("2026-10"), "out/26");
});

test("resumo: lacuna fica null, conversao so com orcamentos decididos", () => {
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: `2026-${String(i + 1).padStart(2, "0")}`, vendas_total: null, nf_total: null, faturas_zoho_total: null }));
  meses[10].vendas_total = 1000; meses[11].vendas_total = "500.50"; meses[0].vendas_total = 200;
  const r = resumoPainel({ meses, orcamentos: [{ status: "accepted", qtd: 3 }, { status: "declined", qtd: 1 }, { status: "draft", qtd: 9 }] });
  assert.equal(r.vendas12, 1700.5);
  assert.equal(r.vendas3, 1500.5);
  assert.equal(r.faturado12, null);
  assert.equal(r.conversao, 75);
  assert.equal(resumoPainel({ meses, orcamentos: [{ status: "draft", qtd: 2 }] }).conversao, null);
});
