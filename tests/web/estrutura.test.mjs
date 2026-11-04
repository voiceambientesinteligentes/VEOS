// Estrutura organizacional: hierarquia de todos os setores, coberturas e acumulos.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CATALOGO } from "../../apps/web/js/data/catalogo.js";
import { acumulos, arvoreEmpresa, arvoreSetor, niveisHierarquia, nomeCobertura, resumoEstrutura } from "../../apps/web/js/domain/estrutura.js";

const conta = (no) => no.filhos.reduce((n, f) => n + 1 + conta(f), 0);

test("toda a equipe de cada setor aparece uma unica vez na arvore", () => {
  for (const s of CATALOGO) assert.equal(conta(arvoreSetor(s)), s.equipe.length, s.id);
});

test("todo cargo tem missao, nivel, fase, agenda e alcada (estrutura completa)", () => {
  for (const s of CATALOGO) {
    assert.ok(s.diretor.atividades, `${s.id}: diretor sem agenda`);
    for (const p of s.equipe) {
      for (const k of ["missao", "nivel", "fase", "atividades", "entregas", "decide", "escala"]) assert.ok(p[k], `${s.id}.${p.papel} sem ${k}`);
      assert.equal(p.status, "PROPOSTA", `${s.id}.${p.papel} deve ser proposta`);
    }
  }
  assert.deepEqual(resumoEstrutura(CATALOGO).semAtividades, []);
});

test("CEO no topo e os outros 8 diretores respondem a ele", () => {
  const a = arvoreEmpresa(CATALOGO);
  assert.equal(a.setor.sigla, "CEO");
  assert.equal(a.diretores.length, 8);
  assert.ok(a.diretores.every((d) => d.setor.diretor.reporta_a === "CEO"));
});

test("comercial: diretor -> gerente comercial -> vendedor, SDR, orcamentista e assistente", () => {
  const v = CATALOGO.find((s) => s.id === "vendas");
  const arv = arvoreSetor(v);
  const gerente = arv.filhos.find((f) => f.papel === "gerente_comercial");
  assert.ok(gerente, "gerente comercial responde ao CSO");
  assert.deepEqual(gerente.filhos.map((f) => f.papel).sort(), ["assistente_comercial", "consultor", "projetista", "sdr"]);
  assert.deepEqual(niveisHierarquia(v), { gerente_comercial: 1, gestor_parceiros: 1, consultor: 2, sdr: 2, projetista: 2, assistente_comercial: 2 });
});

test("cobertura entre setores tem nome legivel", () => {
  const mk = CATALOGO.find((s) => s.id === "marketing");
  assert.equal(nomeCobertura(CATALOGO, mk, "vendas:gestor_parceiros"), "Gestor de relacionamento com parceiros (CSO)");
  assert.equal(nomeCobertura(CATALOGO, mk, "CMO"), "CMO · Diretora de Marketing (CMO)");
});

test("acumulos resolvem a cadeia ate quem existe de fato e nao repetem cargo", () => {
  const itens = acumulos(CATALOGO);
  const crescimento = CATALOGO.flatMap((s) => s.equipe.filter((p) => p.fase === "crescimento" && p.cobre_enquanto_vago));
  assert.equal(itens.reduce((n, i) => n + i.cargos.length, 0), crescimento.length);
  // ninguem que acumula e, ele proprio, um cargo de "crescimento"
  for (const { quem } of itens) if (quem.tipo === "cargo") assert.notEqual(quem.cargo.fase, "crescimento", quem.id);
  // o SDR fica com o vendedor; o gerente comercial, com o CSO
  const vendedor = itens.find((i) => i.quem.id === "vendas:consultor");
  assert.ok(vendedor.cargos.some((c) => c.cargo.papel === "sdr"));
  assert.ok(itens.find((i) => i.quem.id === "CSO").cargos.some((c) => c.cargo.papel === "gerente_comercial"));
});
