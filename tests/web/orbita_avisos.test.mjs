import { test } from "node:test";
import assert from "node:assert/strict";
import { atividadeDoRadar } from "../../apps/web/js/domain/orbita_avisos.js";

const setores = [{ id: "financas" }, { id: "vendas" }, { id: "pessoas" }];
const radar = {
  setores: ["financas", "vendas"],
  alertas: [
    { setor_id: "financas", titulo: "Caixa apertado", mensagem: "Faltam R$ 10 mil", severidade: "MEDIO" },
    { setor_id: "financas", titulo: "Conta vencida", mensagem: "Fornecedor X", severidade: "CRITICO" },
  ],
  tarefas: [{ setor_id: "vendas", titulo: "Ligar para o cliente", prazo: "2026-11-10" }],
};

test("setor com alerta ou tarefa recebe pendencias, mais grave primeiro", () => {
  const a = atividadeDoRadar(setores, radar);
  assert.equal(a.financas.pendencias.length, 2);
  assert.equal(a.financas.pendencias[0].titulo, "Conta vencida");
  assert.equal(a.vendas.pendencias[0].detalhe, "Prazo: 10/11/2026");
  assert.equal(a.financas.alertas, 2);
});

test("setor sem nada nao pisca e radar vazio nao quebra", () => {
  assert.equal(atividadeDoRadar(setores, radar).pessoas.pendencias.length, 0);
  assert.equal(atividadeDoRadar(setores, radar).pessoas.acessivel, false);
  assert.equal(atividadeDoRadar(setores, null).financas.pendencias.length, 0);
});
