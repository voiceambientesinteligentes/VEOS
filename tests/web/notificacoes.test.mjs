import assert from "node:assert/strict";
import { test } from "node:test";

import { alertasParaAvisar, textoResumo } from "../../apps/web/js/domain/notificacoes.js";

test("texto do resumo do dia", () => {
  const t = textoResumo([{ setor: "financas", data: "2026-10-01", alertas_ativos: 3, alertas_novos_24h: [{ titulo: "Parcela vencida TESTE", severidade: "ALTO" }], resolvidos_24h: 1,
    tarefas_abertas: 4, tarefas_atrasadas: [{ titulo: "Cobrar TESTE", prazo: "2026-09-28" }], tarefas_hoje: 0, mensagens_rascunho: 2 }], { financas: "CFO · Financeiro" });
  assert.match(t, /^Resumo do dia 01\/10\/2026 · VEOS/);
  assert.match(t, /CFO · Financeiro: 3 alerta\(s\) ativo\(s\), 1 novo\(s\) em 24 h, 1 resolvido\(s\), 4 tarefa\(s\) aberta\(s\), 1 atrasada\(s\), 2 mensagem\(ns\) para enviar\./);
  assert.match(t, /• \[alto\] Parcela vencida TESTE/);
  assert.match(t, /• atrasada desde 28\/09\/2026: Cobrar TESTE/);
});

test("aviso no navegador so para ALTO/CRITICO novos; lista de vistos nao cresce", () => {
  const al = [{ chave: "A", severidade: "ALTO" }, { chave: "B", severidade: "INFO" }, { chave: "C", severidade: "CRITICO" }];
  const [n1, v1] = alertasParaAvisar(al, ["X"]);
  assert.deepEqual(n1.map((a) => a.chave), ["A", "C"]);
  assert.deepEqual(v1, ["A", "C"]);
  const [n2] = alertasParaAvisar(al, v1);
  assert.equal(n2.length, 0);
});
