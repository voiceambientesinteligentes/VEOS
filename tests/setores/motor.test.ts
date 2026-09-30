// Motor das sentinelas: cada tipo de gatilho com datas fixas + validador de catalogo.
import assert from "node:assert/strict";
import { test } from "node:test";

import { avaliarSetor, type Registro, type Setor, validarCatalogo } from "../../supabase/functions/_shared/setores/motor.ts";

const HOJE = Date.parse("2026-09-30T15:00:00Z");
const SETOR: Setor = {
  id: "vendas", sigla: "CSO", nome: "Comercial", missao: "vender",
  diretor: { nome: "Persona", titulo: "Diretor" },
  equipe: [{ papel: "consultor", nome: "Consultor" }, { papel: "sdr", nome: "Pré-vendas" }],
  registros: [{
    tipo: "oportunidade", nome: "Oportunidade", responsavel: "consultor",
    estados: ["qualificacao", "proposta", "ganha", "perdida"], estado_inicial: "qualificacao", estados_finais: ["ganha", "perdida"],
    campos: [{ id: "proximo_passo", rotulo: "Próximo passo", tipo: "texto" }, { id: "valor_estimado", rotulo: "Valor", tipo: "dinheiro" }],
  }],
  modelos: [{ id: "followup", tipo: "email", assunto: "Sobre {{titulo}}", corpo: "Olá, seguimos com {{titulo}} há {{dias}} dias." }],
  sentinelas: [
    { id: "COM_SEM_VENDA", titulo: "Sem venda em {{janela_dias}} dias", severidade: "ALTO", mensagem: "{{total}} vendas; meta {{meta}}",
      gatilho: { tipo: "contagem", registro: "oportunidade", filtros: [{ campo: "estado", igual: "ganha" }], janela_dias: 7, data_campo: "atualizado_em", operador: "<", valor: 1 },
      acoes: [{ tipo: "tarefa", titulo: "Prospectar 10 contatos", papel: "sdr", prazo_dias: 1 }, { tipo: "notificar", para: "direcao" }] },
    { id: "COM_PIPELINE_BAIXO", titulo: "Pipeline baixo", severidade: "MEDIO", mensagem: "R$ {{total}}",
      gatilho: { tipo: "soma", registro: "oportunidade", campo: "valor_estimado", filtros: [{ campo: "estado", nao_em: ["ganha", "perdida"] }], janela_dias: 90, data_campo: "criado_em", operador: "<", valor: 300000 } },
    { id: "COM_PROPOSTA_PARADA", titulo: "{{titulo}} parada", severidade: "ALTO", mensagem: "{{dias}} dias sem retorno",
      gatilho: { tipo: "parado", registro: "oportunidade", filtros: [{ campo: "estado", igual: "proposta" }], dias: 7 },
      acoes: [{ tipo: "tarefa", titulo: "Follow-up de {{titulo}}", papel: "consultor", prazo_dias: 0 }, { tipo: "rascunho", modelo: "followup" }] },
    { id: "COM_PRAZO_VENCIDO", titulo: "Prazo de {{titulo}}", severidade: "MEDIO", mensagem: "venceu há {{dias}} dias",
      gatilho: { tipo: "vencido", registro: "oportunidade", campo: "prazo" } },
    { id: "COM_SEM_PROXIMO_PASSO", titulo: "{{titulo}} sem próximo passo", severidade: "MEDIO", mensagem: "defina",
      gatilho: { tipo: "faltando", registro: "oportunidade", campo: "proximo_passo" } },
  ],
};

const reg = (id: string, estado: string, extra: Partial<Registro> = {}): Registro => ({
  id, tipo: "oportunidade", titulo: `Residência ${id}`, estado, criado_em: "2026-09-20T10:00:00Z", atualizado_em: "2026-09-29T10:00:00Z",
  dados: { proximo_passo: "ligar", valor_estimado: "100000.00" }, ...extra,
});
const por = (alertas: ReturnType<typeof avaliarSetor>, id: string) => alertas.filter((a) => a.sentinela === id);

test("contagem: sem venda na janela gera alerta agregado com tarefa e notificacao", () => {
  const a = avaliarSetor(SETOR, [reg("A", "proposta")], HOJE);
  const x = por(a, "COM_SEM_VENDA");
  assert.equal(x.length, 1);
  assert.equal(x[0].chave, "COM_SEM_VENDA");
  assert.equal(x[0].titulo, "Sem venda em 7 dias");
  assert.equal(x[0].mensagem, "0 vendas; meta 1");
  assert.deepEqual(x[0].tarefas, [{ titulo: "Prospectar 10 contatos", papel: "sdr", prazo: "2026-10-01" }]);
  assert.deepEqual(x[0].notificar, ["direcao"]);
  // uma venda ganha atualizada ha 3 dias apaga o alerta
  const b = avaliarSetor(SETOR, [reg("A", "proposta"), reg("B", "ganha", { atualizado_em: "2026-09-27T12:00:00Z" })], HOJE);
  assert.equal(por(b, "COM_SEM_VENDA").length, 0);
  // venda fora da janela (10 dias) nao conta
  const c = avaliarSetor(SETOR, [reg("B", "ganha", { atualizado_em: "2026-09-20T12:00:00Z" })], HOJE);
  assert.equal(por(c, "COM_SEM_VENDA").length, 1);
});

test("soma: pipeline aberto abaixo da meta", () => {
  const a = avaliarSetor(SETOR, [reg("A", "proposta"), reg("B", "qualificacao"), reg("C", "ganha")], HOJE);
  const x = por(a, "COM_PIPELINE_BAIXO");
  assert.equal(x.length, 1);
  assert.equal(x[0].mensagem, "R$ 200000"); // ganha nao entra no pipeline
  const b = avaliarSetor(SETOR, [reg("A", "proposta"), reg("B", "qualificacao"), reg("D", "qualificacao")], HOJE);
  assert.equal(por(b, "COM_PIPELINE_BAIXO").length, 0); // 300.000 nao e < 300.000
});

test("parado: proposta sem atualizacao ha mais de 7 dias, com rascunho preenchido", () => {
  const a = avaliarSetor(SETOR, [reg("A", "proposta", { atualizado_em: "2026-09-20T09:00:00Z" }), reg("B", "proposta", { atualizado_em: "2026-09-23T09:00:00Z" })], HOJE);
  const x = por(a, "COM_PROPOSTA_PARADA");
  assert.equal(x.length, 1); // 10 dias sim; 7 dias exatos nao
  assert.equal(x[0].chave, "COM_PROPOSTA_PARADA:A");
  assert.equal(x[0].mensagem, "10 dias sem retorno");
  assert.equal(x[0].tarefas[0].titulo, "Follow-up de Residência A");
  assert.equal(x[0].tarefas[0].prazo, "2026-09-30");
  assert.deepEqual(x[0].rascunhos[0], { modelo: "followup", tipo: "email", assunto: "Sobre Residência A", corpo: "Olá, seguimos com Residência A há 10 dias." });
});

test("vencido e faltando ignoram registros em estado final", () => {
  const a = avaliarSetor(SETOR, [
    reg("A", "proposta", { prazo: "2026-09-25" }),
    reg("B", "ganha", { prazo: "2026-09-01" }),
    reg("C", "qualificacao", { prazo: "2026-10-05" }),
    reg("D", "qualificacao", { dados: { proximo_passo: " " } }),
    reg("E", "perdida", { dados: {} }),
  ], HOJE);
  assert.deepEqual(por(a, "COM_PRAZO_VENCIDO").map((x) => [x.registro_id, x.mensagem]), [["A", "venceu há 5 dias"]]);
  assert.deepEqual(por(a, "COM_SEM_PROXIMO_PASSO").map((x) => x.registro_id), ["D"]);
});

test("filtro explicito de estado permite vigiar estado final", () => {
  const s = structuredClone(SETOR);
  s.sentinelas = [{ id: "COM_GANHA_SEM_PASSAGEM", titulo: "{{titulo}} sem passagem", severidade: "ALTO", mensagem: "x",
    gatilho: { tipo: "faltando", registro: "oportunidade", campo: "proximo_passo", filtros: [{ campo: "estado", igual: "ganha" }] } }];
  const a = avaliarSetor(s, [reg("A", "ganha", { dados: {} }), reg("B", "proposta", { dados: {} })], HOJE);
  assert.deepEqual(a.map((x) => x.registro_id), ["A"]);
});

test("alertas saem ordenados por severidade", () => {
  const a = avaliarSetor(SETOR, [reg("A", "proposta", { atualizado_em: "2026-09-10T09:00:00Z", dados: {} })], HOJE);
  const sev = a.map((x) => x.severidade);
  assert.deepEqual(sev, [...sev].sort((p, q) => ["INFO", "MEDIO", "ALTO", "CRITICO"].indexOf(q) - ["INFO", "MEDIO", "ALTO", "CRITICO"].indexOf(p)));
});

test("validador aponta referencias quebradas", () => {
  assert.deepEqual(validarCatalogo([SETOR]), []);
  const ruim = structuredClone(SETOR);
  ruim.sentinelas.push({ id: "com_ruim", titulo: "x", severidade: "URGENTE", mensagem: "x",
    gatilho: { tipo: "parado", registro: "oportunidade", filtros: [{ campo: "estado", igual: "fechada" }] },
    acoes: [{ tipo: "rascunho", modelo: "nao_existe" }, { tipo: "tarefa", papel: "gerente" }] });
  const erros = validarCatalogo([ruim, structuredClone(SETOR)]).join("\n");
  for (const esperado of ["id inválido", "severidade URGENTE", "estado inexistente fechada", "parado sem dias", "modelo inexistente", "papel inexistente gerente", "tipo oportunidade repetido"]) {
    assert.ok(erros.includes(esperado), `faltou: ${esperado}\n${erros}`);
  }
});
