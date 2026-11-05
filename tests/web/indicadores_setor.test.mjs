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
  assert.match(r.receita_influenciada.lacuna, /campanha/);
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
  assert.match(r.tempo_primeira_resposta.lacuna, /hora/);
  assert.equal(calcularIndicadoresSetor("posvenda", [], { hoje }).nps.lacuna.includes("pesquisa"), true);
  assert.ok(calcularIndicadoresSetor("posvenda", [], { hoje }).receita_recorrente.lacuna);
});
test("todos os ids calculados existem no catálogo do setor", () => {
  for (const id of ["marketing", "posvenda"]) {
    const ids = new Set(CATALOGO.find((s) => s.id === id).indicadores.map((i) => i.id));
    for (const k of Object.keys(calcularIndicadoresSetor(id, [], { hoje, mrr: 0 }))) assert.ok(ids.has(k), `${id}.${k} não existe no catálogo`);
  }
});
