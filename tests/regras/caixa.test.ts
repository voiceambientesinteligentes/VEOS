// Caixa do projeto: paridade com cfo_controls (Python) + cenarios calculados a mao.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { avaliarCaixaProjeto, cobertura, exposicao } from "../../supabase/functions/_shared/regras/caixa.ts";
import { centavos, centesimos, fixo2, RegraError } from "../../supabase/functions/_shared/regras/dinheiro.ts";

const par = JSON.parse(readFileSync(new URL("./paridade-caixa.json", import.meta.url), "utf8"));
const n2 = (v: string | null) => (v === null ? null : Number(v).toFixed(2));
// Python devolve o percentual com ate 4 casas (jsonable); comparamos arredondado a 2.
const pct2 = (v: string | null) => (v === null ? null : (Math.round(Number(v) * 100 + (Number(v) >= 0 ? 1e-9 : -1e-9)) / 100).toFixed(2));

test(`paridade exposicao V1.1 com Python (${par.exposicao.length} casos)`, () => {
  for (const [i, c] of par.exposicao.entries()) {
    const vc = c.valor_contrato === null ? null : centavos(c.valor_contrato, "vc");
    const pos = c.posicao.startsWith("-") ? -centavos(c.posicao.slice(1), "p") : centavos(c.posicao, "p");
    const r = exposicao(pos, vc);
    assert.equal(fixo2(r.exposicao), n2(c.esperado.exposicao), `caso ${i} exposicao`);
    assert.equal(r.gatilho, c.esperado.gatilho, `caso ${i} gatilho`);
    assert.equal(r.pct === null ? null : fixo2(centesimos(r.pct)), pct2(c.esperado.pct), `caso ${i} pct`);
  }
});

test(`paridade cobertura V1 sec.10 com Python (${par.cobertura.length} casos)`, () => {
  for (const [i, c] of par.cobertura.entries()) {
    const r = cobertura(centavos(c.coberto, "c"), centavos(c.necessidade, "n"));
    assert.equal(r.situacao, c.esperado.situacao, `caso ${i}`);
    assert.equal(r.cobre, c.esperado.cobre, `caso ${i}`);
    assert.equal(fixo2(r.deficit), n2(c.esperado.deficit), `caso ${i}`);
  }
});

const BASE = {
  codigo: "PRJ-TESTE-01", valor_contrato: "200000.00",
  fases: [{ id: "F1", nome: "Infraestrutura", custos: "60000.00", encargos: "5000.00" },
          { id: "F2", nome: "Equipamentos", custos: "50000.00", encargos: "3000.00" }],
  recebimentos: [{ valor: "70000.00", fase: "F1" }, { valor: "20000.00", fase: "F2" }],
  compromissos: [{ valor: "80000.00" }, { valor: "30000.00" }],
};
const cods = (r: { avisos: { codigo: string }[] }) => r.avisos.map((a) => a.codigo);

test("exposicao exatamente 10% nao aciona o gatilho (estritamente acima)", () => {
  const r = avaliarCaixaProjeto(BASE);
  // recebido 90.000 - compromissos 110.000 = -20.000 -> 10,00% de 200.000
  assert.equal(r.resumo.posicao, "-20000.00");
  assert.equal(r.resumo.exposicao_pct, "10.00");
  assert.equal(r.resumo.gatilho, "NAO ACIONADO");
  assert.ok(cods(r).includes("EXP_ATENCAO"));
  const f2 = r.resumo.fases.find((f) => f.id === "F2")!;
  assert.deepEqual([f2.situacao, f2.deficit], ["DESCOBERTA", "33000.00"]);
  assert.ok(cods(r).includes("FASE_DESCOBERTA"));
  assert.equal(r.situacao, "OK");
});

test("compra sem cobertura na fase bloqueia e acusa gatilho de exposicao", () => {
  const r = avaliarCaixaProjeto({ ...BASE, compra_proposta: { valor: "10000.00", fase: "F2" } });
  assert.equal(r.situacao, "BLOQUEAR");
  assert.equal(r.avisos[0].codigo, "COMPRA_SEM_COBERTURA");
  assert.ok(cods(r).includes("COMPRA_EXPOSICAO")); // 30.000 = 15%
  assert.equal(r.resumo.cenario_compra!.exposicao_pct, "15.00");
  assert.equal(r.resumo.compromissos, "110000.00"); // proposta nao entra nos compromissos (V1.1 sec.6)
});

test("compra coberta na fase, mas acima de 10% exige direcao", () => {
  const r = avaliarCaixaProjeto({ ...BASE, compra_proposta: { valor: "1000.00", fase: "F1" } });
  assert.ok(cods(r).includes("COMPRA_COBERTA"));
  assert.ok(cods(r).includes("COMPRA_EXPOSICAO")); // 21.000 = 10,5%
  assert.equal(r.situacao, "REVISAR");
});

test("sem Valor do Contrato: percentual nao resolvido, falha fechada", () => {
  const r = avaliarCaixaProjeto({ ...BASE, valor_contrato: null });
  assert.equal(r.resumo.exposicao_pct, null);
  assert.ok(cods(r).includes("EXP_NAO_RESOLVIDA"));
  assert.equal(r.situacao, "REVISAR");
});

test("posicao positiva e fases cobertas", () => {
  const r = avaliarCaixaProjeto({ ...BASE, recebimentos: [{ valor: "70000.00", fase: "F1" }, { valor: "60000.00", fase: "F2" }] });
  assert.equal(r.resumo.exposicao, "0.00");
  assert.deepEqual(cods(r), ["EXP_OK"]);
});

test("entradas invalidas sao recusadas", () => {
  for (const ruim of [
    { ...BASE, codigo: "PRJ-REAL" },
    { ...BASE, recebimentos: [{ valor: "10.00", fase: "F9" }] },
    { ...BASE, compromissos: [{ valor: "-5.00" }] },
    { ...BASE, fases: [...BASE.fases, BASE.fases[0]] },
  ]) assert.throws(() => avaliarCaixaProjeto(ruim), RegraError);
});
