import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularIndicadoresSetor } from "../../apps/web/js/domain/indicadores_setor.js";
import { CATALOGO } from "../../apps/web/js/data/catalogo.js";

const hoje = "2026-11-05";

test("marketing: calcula leads, conversão, custo por lead e comparecimento; o resto é LACUNA", () => {
  const regs = [
    { tipo: "campanha", estado: "encerrada", dados: { data_fim: "2026-10-20", leads_gerados: 20, oportunidades_geradas: 4, investimento_realizado: 2000 } },
    { tipo: "campanha", estado: "cancelada", dados: { data_fim: "2026-10-20", leads_gerados: 99 } },
    { tipo: "campanha", estado: "encerrada", dados: { data_fim: "2025-01-20", leads_gerados: 50 } },
    { tipo: "evento", estado: "realizado", dados: { data_evento: "2026-10-10", convidados: 40, presentes: 25, leads_gerados: 5 } },
    { tipo: "conteudo", estado: "publicado", dados: { data_publicacao: "2026-10-30" } },
    { tipo: "case", estado: "publicado", atualizado_em: "2026-10-01T10:00:00Z", dados: {} },
  ];
  const r = calcularIndicadoresSetor("marketing", regs, { hoje });
  assert.equal(r.leads_gerados.valor, 25);
  assert.equal(r.oportunidades_marketing.valor, 4);
  assert.equal(r.taxa_lead_oportunidade.valor, 16);
  assert.equal(r.custo_por_lead.valor, 80);
  assert.equal(r.comparecimento_eventos.valor, 62.5);
  assert.equal(r.cases_publicados.valor, 1);
  assert.ok(r.publicacoes_semana.valor > 0);
  assert.match(r.receita_influenciada.lacuna, /Comercial/); // sem acesso às oportunidades
});
test("marketing sem registros: LACUNA com motivo, nunca zero inventado", () => {
  const r = calcularIndicadoresSetor("marketing", [], { hoje });
  for (const id of ["leads_gerados", "taxa_lead_oportunidade", "custo_por_lead", "comparecimento_eventos"]) assert.ok(r[id].lacuna && r[id].valor === undefined, id);
});
test("pós-venda: NPS, reincidência, repasse e receita recorrente dos contratos", () => {
  const pesq = (n) => ({ tipo: "pesquisa_satisfacao", estado: "respondida", dados: { nota_nps: n, data_resposta: "2026-10-15" } });
  const regs = [pesq(10), pesq(9), pesq(8), pesq(3),
    { tipo: "chamado", estado: "fechado", atualizado_em: "2026-10-20T10:00:00Z", dados: { reincidente: "sim" } }, { tipo: "chamado", estado: "fechado", atualizado_em: "2026-10-21T10:00:00Z", dados: { reincidente: "nao" } },
    { tipo: "pesquisa_satisfacao", estado: "retorno_feito", dados: { nota_nps: 10, data_resposta: "2026-10-01", indicacao_ou_ampliacao: "indicacao", data_repasse_comercial: "2026-10-05" } }];
  const r = calcularIndicadoresSetor("posvenda", regs, { hoje, mrr: 3600, contratosAtivos: 3 });
  assert.equal(r.nps.valor, 40); // 3 promotores, 1 detrator em 5 respostas -> (3-1)/5
  assert.equal(r.chamados_reincidentes.valor, 50);
  assert.equal(r.indicacoes_repassadas.valor, 1);
  assert.equal(r.receita_recorrente.valor, 3600);
  assert.match(r.tempo_primeira_resposta.lacuna, /hora/); // sem horas preenchidas: LACUNA
  assert.equal(calcularIndicadoresSetor("posvenda", [], { hoje }).nps.lacuna.includes("pesquisa"), true);
  assert.ok(calcularIndicadoresSetor("posvenda", [], { hoje }).receita_recorrente.lacuna);
});
test("todos os ids calculados existem no catálogo do setor", () => {
  for (const id of ["marketing", "posvenda"]) {
    const ids = new Set(CATALOGO.find((s) => s.id === id).indicadores.map((i) => i.id));
    for (const k of Object.keys(calcularIndicadoresSetor(id, [], { hoje, mrr: 0 }))) assert.ok(ids.has(k), `${id}.${k} não existe no catálogo`);
  }
});

test("novos campos: SLA, 1ª resposta, atendimento remoto, garantia, renovação, receita influenciada e escritórios", () => {
  const ch = (d) => ({ tipo: "chamado", estado: "fechado", atualizado_em: "2026-10-20T10:00:00Z", dados: d });
  const regs = [
    ch({ data_limite_solucao: "2026-10-20", data_resolucao: "2026-10-19", horas_primeira_resposta: 2, atendimento: "remoto", cobertura: "garantia_instalacao", custo_atendimento: 300 }),
    ch({ data_limite_solucao: "2026-10-18", data_resolucao: "2026-10-19", horas_primeira_resposta: 4, atendimento: "com_visita", cobertura: "contrato_suporte", custo_atendimento: 500 }),
    { tipo: "contrato_suporte", estado: "ativo", dados: { data_oferta_continuidade: "2026-10-10", resultado_continuidade: "renovou" } },
    { tipo: "contrato_suporte", estado: "ativo", dados: { data_oferta_continuidade: "2026-10-11", resultado_continuidade: "nao_renovou" } },
  ];
  const r = calcularIndicadoresSetor("posvenda", regs, { hoje });
  assert.equal(r.cumprimento_sla.valor, 50);
  assert.equal(r.tempo_primeira_resposta.valor, 3);
  assert.equal(r.resolucao_remota.valor, 50);
  assert.equal(r.custo_garantia.valor, 300); // só chamados em garantia
  assert.equal(r.taxa_renovacao.valor, 50);
  const vendas = [
    { tipo: "oportunidade", dados: { data_ganho: "2026-10-10", valor_estimado: 30000, campanha_origem: "Evento showroom" } },
    { tipo: "oportunidade", dados: { data_ganho: "2026-10-12", valor_estimado: 70000 } },
    { tipo: "oportunidade", dados: { valor_estimado: 99000 } },
  ];
  const m = calcularIndicadoresSetor("marketing", [
    { tipo: "evento", estado: "realizado", dados: { data_evento: "2026-10-10", escritorios_presentes: 8 } },
    { tipo: "campanha", estado: "encerrada", dados: { data_fim: "2026-10-20", escritorios_alcancados: 5 } },
  ], { hoje, vendas });
  assert.equal(m.receita_influenciada.valor, 30);
  assert.equal(m.arquitetos_engajados.valor, 13);
  assert.ok(calcularIndicadoresSetor("marketing", [], { hoje, vendas: [] }).receita_influenciada.lacuna);
});

test("MCP: resposta grande vira JSON válido com aviso de truncamento (não corta no meio)", async () => {
  const { textoMcp } = await import("../../scripts/mcp/ferramentas.mjs");
  const grande = { alertas: Array.from({ length: 3000 }, (_, i) => ({ id: i, texto: "x".repeat(60) })), tarefas: [{ id: 1 }] };
  const s = textoMcp(grande);
  assert.ok(s.length <= 60000);
  const j = JSON.parse(s);
  assert.equal(j.truncado.alertas.total, 3000);
  assert.ok(j.alertas.length < 3000 && j.alertas.length > 100);
  assert.deepEqual(JSON.parse(textoMcp({ a: 1 })), { a: 1 });
});
