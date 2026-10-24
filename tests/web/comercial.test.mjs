import assert from "node:assert/strict";
import { test } from "node:test";

import { CADENCIAS, CANAIS, DONOS_METAS, IMPLANTACAO, agendaCadencia, baseComercial, cadenciaDoRegistro, chaveCliente, preencher, segmentoPorNome } from "../../apps/web/js/domain/comercial.js";

test("segmento pelo nome e chave que junta cadastros duplicados", () => {
  assert.equal(segmentoPorNome("Studio TESTE.Arq"), "especificador");
  assert.equal(segmentoPorNome("TESTE Architecture by Fulana"), "especificador");
  assert.equal(segmentoPorNome("TESTE Empreendimentos SPE Ltda"), "construtora");
  assert.equal(segmentoPorNome("Hotel TESTE"), "corporativo");
  assert.equal(segmentoPorNome("Clínica TESTE Ltda"), "corporativo");
  assert.equal(segmentoPorNome("Fulano de Tal TESTE"), "cliente_final");
  assert.equal(chaveCliente("Studio We.Teste"), chaveCliente("Studio WeTeste"));
  assert.equal(chaveCliente("José  TESTE"), "joseteste");
});

test("base comercial: ganhos, perdidos, abertos, segmentos, concentração e duplicados", () => {
  const o = (cliente, status, total, data = "2026-09-01") => ({ cliente, status, total, data });
  const b = baseComercial([
    o("Studio A.Teste", "draft", 10000), o("Studio ATeste", "accepted", 30000), o("Studio A.Teste", "declined", 20000),
    o("Fulano TESTE", "invoiced", 50000), o("Fulano TESTE", "expired", 5000, "2025-01-01"),
    o("TESTE Empreendimentos", "sent", 40000),
  ]);
  assert.equal(b.orcamentos, 6);
  assert.equal(b.clientes, 3);
  assert.deepEqual([b.ganhos, b.perdidos, b.abertos], [2, 2, 2]);
  assert.equal(b.ticket_ganho, 40000);
  assert.equal(b.taxa_ganho_decididos, 50);
  assert.equal(b.pct_abertos, 33.3);
  assert.equal(b.mediana_orcamento, 25000);
  const esp = b.por_segmento.find((s) => s.segmento === "especificador");
  assert.deepEqual([esp.clientes, esp.orcamentos, esp.ganhos, esp.perdidos, esp.abertos, esp.orcado, esp.ganho], [1, 3, 1, 1, 1, 60000, 30000]);
  assert.equal(b.concentracao.orcamentos, 3);
  assert.equal(b.concentracao.pct, 50);
  assert.deepEqual(b.duplicados, [["Studio A.Teste", "Studio ATeste"]]);
  // filtro por data
  assert.equal(baseComercial([o("X TESTE", "accepted", 1, "2025-01-01"), o("Y TESTE", "accepted", 1, "2026-01-01")], { desde: "2026-01-01" }).orcamentos, 1);
  // base vazia: lacunas, nunca zero inventado
  const v = baseComercial([]);
  assert.equal(v.ticket_ganho, null);
  assert.equal(v.taxa_ganho_decididos, null);
  assert.equal(v.mediana_orcamento, null);
});

test("cadências: gatilho mais específico, agenda sem fim de semana e textos preenchidos", () => {
  assert.equal(cadenciaDoRegistro({ tipo: "lead", estado: "novo", dados: { origem: "site" } }).id, "lead_novo");
  assert.equal(cadenciaDoRegistro({ tipo: "lead", estado: "novo", dados: { origem: "cliente_antigo_reativacao" } }).id, "reativacao");
  assert.equal(cadenciaDoRegistro({ tipo: "proposta", estado: "enviada", dados: {} }).id, "proposta_enviada");
  assert.equal(cadenciaDoRegistro({ tipo: "lead", estado: "em_contato", dados: {} }), null);
  const lead = CADENCIAS.find((c) => c.id === "lead_novo");
  const ag = agendaCadencia(lead, "2026-10-09"); // sexta-feira
  assert.equal(ag[0].data, "2026-10-09");
  assert.equal(ag[1].data, "2026-10-12"); // D+1 cai no sabado -> segunda
  assert.equal(ag[2].data, "2026-10-12"); // D+3 cai na segunda
  assert.deepEqual(ag.map((p) => p.ordem), [1, 2, 3, 4, 5, 6]);
  assert.equal(preencher("Olá, {{nome}}! {{vendedor}} aqui ({{empresa}}).", { nome: "Ana TESTE", vendedor: "Bia" }), "Olá, Ana TESTE! Bia aqui ([empresa]).");
  // toda cadencia tem passos em ordem de dia, com acao e canal conhecido
  for (const c of CADENCIAS) {
    assert.ok(c.passos.length >= 3, c.id);
    assert.deepEqual(c.passos.map((p) => p.dia), [...c.passos.map((p) => p.dia)].sort((a, b) => a - b), c.id);
    for (const p of c.passos) assert.ok(["whatsapp", "email", "ligacao", "visita"].includes(p.canal) && p.acao.length > 10, `${c.id} ${p.dia}`);
  }
  // prospecção fria nunca começa por WhatsApp (opt-in)
  assert.equal(CADENCIAS.find((c) => c.id === "parceiro_prospeccao").passos[0].canal, "email");
});

test("canais, implantação e donos das metas consistentes", () => {
  const setores = ["direcao", "financas", "vendas", "marketing", "operacoes", "tecnologia", "posvenda", "pessoas", "secretaria"];
  const ids = new Set(CADENCIAS.map((c) => c.id));
  for (const c of CANAIS) {
    assert.ok(setores.includes(c.dono), c.id);
    assert.ok(!c.cadencia || ids.has(c.cadencia), c.id);
    for (const k of ["oferta", "metrica", "ia", "ferramenta", "cuidado"]) assert.ok(c[k], `${c.id}.${k}`);
  }
  const codigos = IMPLANTACAO.flatMap((g) => g.itens.map((i) => i.codigo));
  assert.equal(new Set(codigos).size, codigos.length);
  for (const g of IMPLANTACAO) for (const i of g.itens) assert.ok(setores.includes(i.dono), i.codigo);
  for (const m of DONOS_METAS) assert.ok(setores.includes(m.define) && setores.includes(m.persegue), m.meta);
  assert.equal(DONOS_METAS.find((m) => m.meta.startsWith("Faturamento")).define, "direcao");
});
