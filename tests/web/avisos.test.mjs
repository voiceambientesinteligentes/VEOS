import { test } from "node:test";
import assert from "node:assert/strict";
import { avisosNovos } from "../../apps/web/js/domain/avisos.js";

const agora = Date.parse("2026-11-05T12:00:00Z");
const base = { hoje: "2026-11-05", euId: "eu", agora };

test("avisos: só alertas graves; tarefas atrasadas; agenda minha de hoje; resposta a pergunta minha", () => {
  const r = avisosNovos({ ...base,
    alertas: [{ chave: "A1", severidade: "ALTO", setor_id: "financas", titulo: "Caixa" }, { chave: "A2", severidade: "MEDIO", setor_id: "vendas", titulo: "x" }],
    tarefas: [{ id: "t1", titulo: "Ligar", prazo: "2026-11-03", setor_id: "vendas" }, { id: "t2", titulo: "Hoje: leads", prazo: "2026-11-05", setor_id: "vendas", responsavel: "eu" }, { id: "t3", titulo: "De outro", prazo: "2026-11-05", setor_id: "vendas", responsavel: "outro" }, { id: "t4", titulo: "Futura", prazo: "2026-11-09", setor_id: "vendas" }],
    perguntas: [{ id: "p1", estado: "respondida", autor: "eu", setor_id: "financas", pergunta: "Como está o caixa?", respostas: [{ em: "2026-11-05T10:00:00Z" }] },
      { id: "p2", estado: "respondida", autor: "outro", setor_id: "financas", pergunta: "x", respostas: [{ em: "2026-11-05T10:00:00Z" }] },
      { id: "p3", estado: "pendente", autor: "eu", setor_id: "vendas", pergunta: "y", respostas: [] },
      { id: "p4", estado: "respondida", autor: "eu", setor_id: "vendas", pergunta: "velha", respostas: [{ em: "2026-10-20T10:00:00Z" }] }] });
  assert.deepEqual(r.map((x) => x.chave), ["A1", "t:t1:atrasada", "t:t2:hoje", "p:p1"]);
  assert.match(r[0].texto, /^Alerta · CFO: Caixa/);
  assert.match(r[3].texto, /CFO respondeu: «Como está o caixa\?»/);
});
test("avisos: o que já foi visto não volta", () => {
  const r = avisosNovos({ ...base, alertas: [{ chave: "A1", severidade: "CRITICO", setor_id: "vendas", titulo: "t" }], tarefas: [{ id: "t1", titulo: "x", prazo: "2026-11-01", setor_id: "vendas" }], vistos: new Set(["A1", "t:t1:atrasada"]) });
  assert.deepEqual(r, []);
});
