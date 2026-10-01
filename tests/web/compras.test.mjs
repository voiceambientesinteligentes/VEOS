import assert from "node:assert/strict";
import { test } from "node:test";

import { dividirParcelas, totalCompra } from "../../apps/web/js/domain/compras.js";

test("total arredonda item a item como o banco", () => {
  assert.equal(totalCompra([{ quantidade: "3", custo_unit: "33.33" }, { quantidade: "1.5", custo_unit: "10.01" }]), 115.01); // 99,99 + 15,015 -> 15,02
  assert.equal(totalCompra([{ quantidade: "0.333", custo_unit: "0.15" }]), 0.05); // 0,04995 -> 0,05
  assert.equal(totalCompra([]), 0);
});

test("parcelas somam exatamente o total, sobra na ultima", () => {
  const p = dividirParcelas(1000, 3, "2026-10-10", 30);
  assert.deepEqual(p.map((x) => x.valor), ["333.33", "333.33", "333.34"]);
  assert.deepEqual(p.map((x) => x.vencimento), ["2026-10-10", "2026-11-09", "2026-12-09"]);
  assert.equal(p.reduce((s, x) => s + Math.round(Number(x.valor) * 100), 0), 100000);
  assert.deepEqual(dividirParcelas(0, 2, "2026-10-10"), []);
});
