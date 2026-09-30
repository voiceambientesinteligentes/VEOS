// Paridade: o vigia TypeScript (Supabase) deve responder exatamente como o vigia
// Python de referencia em todos os casos de paridade-vigia.json.
// Rodar: node --test tests/regras/   (Node 24, sem dependencias)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { avaliarOrcamento, RegraError } from "../../supabase/functions/_shared/regras/vigia.ts";
import { brl, centavos, divArred } from "../../supabase/functions/_shared/regras/dinheiro.ts";

type Caso = { entrada: unknown; esperado: Record<string, unknown> };
const casos: Caso[] = JSON.parse(readFileSync(new URL("./paridade-vigia.json", import.meta.url), "utf8"));

// O Decimal do Python preserva o formato de entrada ('0' x '0.00'): compara pelo valor.
const norm = (v: unknown) => (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v).toFixed(2) : v);
const normResumo = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, norm(v)]));

test(`paridade com o vigia Python (${casos.length} casos)`, () => {
  let erros = 0;
  for (const [n, c] of casos.entries()) {
    if (c.esperado.erro) {
      assert.throws(() => avaliarOrcamento(c.entrada), RegraError, `caso ${n}: deveria recusar`);
      erros++;
      continue;
    }
    const r = avaliarOrcamento(c.entrada) as unknown as Record<string, unknown>;
    const e = c.esperado;
    assert.deepEqual(
      { ...r, resumo: normResumo(r.resumo as Record<string, unknown>) },
      { ...e, resumo: normResumo(e.resumo as Record<string, unknown>) },
      `caso ${n} diverge`,
    );
  }
  assert.ok(erros > 0 && erros < casos.length);
});

test("dinheiro: arredondamento e formato", () => {
  assert.equal(centavos("1234.5", "x"), 123450n);
  assert.equal(divArred(5n, 2n), 3n); // meio para cima
  assert.equal(divArred(-5n, 2n), -3n); // meio para longe do zero (ROUND_HALF_UP)
  assert.equal(brl(12345678n), "R$ 123.456,78");
  assert.equal(brl(-500000n), "R$ -5.000,00");
  assert.throws(() => centavos("1.234,56", "x"), RegraError);
  assert.throws(() => centavos(10, "x"), RegraError);
});
