import assert from "node:assert/strict";
import { test } from "node:test";

import { custoHoras, somaHoras } from "../../apps/web/js/domain/obra.js";

test("horas e custo: lacuna quando falta custo/hora", () => {
  assert.equal(somaHoras([{ horas: "6.5" }, { horas: "-1" }]), 5.5);
  assert.equal(custoHoras([{ horas: "6.5", custo_hora: "50.00" }, { horas: "1.25", custo_hora: "40" }]), 375);
  assert.equal(custoHoras([{ horas: "1", custo_hora: null }]), null);
  assert.equal(custoHoras([]), null);
});
