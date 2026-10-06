// Coerencia entre o motor de IA, os manuais e a tela: toda ferramenta citada nos manuais existe, tem
// nome amigavel e esquema aceito pelos provedores (Gemini e OpenAI: objeto com properties).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// banco.ts le o ambiente do Deno ao carregar: no Node, um ambiente vazio basta (nada vai a rede aqui)
(globalThis as Record<string, unknown>).Deno = { env: { get: () => "" } };
const { ferramentasDoSetor, procedimentosDoSetor } = await import("../../supabase/functions/_shared/ia/ferramentas.ts");
const { FERRAMENTA } = await import("../../apps/web/js/data/ferramentas_ia.js");

function validarEsquema(e: Record<string, unknown>, onde: string) {
  assert.ok(["object", "string", "number", "integer", "boolean", "array"].includes(String(e.type)), `${onde}: tipo ${e.type}`);
  assert.ok(!("additionalProperties" in e), `${onde}: additionalProperties não é aceito pelo Gemini`);
  if (e.type === "object") {
    assert.ok(e.properties && typeof e.properties === "object", `${onde}: object sem properties`);
    for (const [k, v] of Object.entries(e.properties as Record<string, Record<string, unknown>>)) validarEsquema(v, `${onde}.${k}`);
    for (const r of (e.required as string[]) ?? []) assert.ok(r in (e.properties as object), `${onde}: required ${r} fora de properties`);
  }
}

test("toda ferramenta tem nome único, descrição, esquema válido e nome amigável na tela", () => {
  const fs = ferramentasDoSetor("financas");
  assert.ok(fs.length >= 20);
  assert.equal(new Set(fs.map((f) => f.nome)).size, fs.length);
  for (const f of fs) {
    assert.match(f.nome, /^[a-z][a-z0-9_]{2,40}$/);
    assert.ok(f.descricao.length > 20, f.nome);
    validarEsquema(f.parametros as unknown as Record<string, unknown>, f.nome);
    assert.ok(FERRAMENTA[f.nome], `sem nome amigável: ${f.nome}`);
  }
});

test("diretores fora de finanças não recebem ferramentas financeiras", () => {
  const nomes = ferramentasDoSetor("marketing").map((f) => f.nome);
  assert.ok(nomes.includes("manual_do_diretor") && nomes.includes("consultar_precedentes"));
  assert.ok(!nomes.includes("analisar_orcamento") && !nomes.includes("fluxo_13_semanas"));
});

test("as ferramentas citadas nos manuais existem no motor do setor", () => {
  for (const arq of readdirSync("setores/manuais").filter((x) => x.endsWith(".json"))) {
    const setor = arq.replace(".json", "");
    const m = JSON.parse(readFileSync(`setores/manuais/${arq}`, "utf8"));
    const existem = new Set(ferramentasDoSetor(setor).map((f) => f.nome));
    for (const p of m.procedimentos) for (const f of p.ferramentas_veos ?? []) assert.ok(existem.has(f), `${setor}: "${p.pedido}" cita ${f}`);
  }
  const cfo = procedimentosDoSetor("financas");
  assert.ok(cfo.some((p) => p.startsWith("Quanto devo cobrar por este projeto?") && p.includes("simular_correcao_orcamento")));
});
