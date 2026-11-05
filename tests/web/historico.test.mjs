import { test } from "node:test";
import assert from "node:assert/strict";
import { camposAlterados, linhaHistorico } from "../../apps/web/js/domain/historico.js";

test("histórico: lista os campos tocados, com dados legíveis", () => {
  assert.deepEqual(camposAlterados({ titulo: "x", estado: "novo", prazo: "2026-11-10", dados: { nome_contato: "A", tipo_imovel: "casa" } }), ["título", "prazo", "nome contato", "tipo imovel"]);
  assert.deepEqual(camposAlterados(null), []);
});
test("histórico: texto de criação, mudança de estado e alteração simples", () => {
  const em = "2026-11-05T15:30:00Z";
  assert.match(linhaHistorico({ acao: "criado", para_estado: "novo", mudancas: {}, usuario: "Fernando", em }), /12:30 · Fernando · criado como "novo"/);
  assert.match(linhaHistorico({ acao: "alterado", de_estado: "novo", para_estado: "em_contato", mudancas: { estado: "em_contato", dados: { proximo_contato: "x" } }, usuario: "Ana", em }), /estado: novo → em_contato · campos: proximo contato/);
  assert.match(linhaHistorico({ acao: "alterado", de_estado: "novo", para_estado: "novo", mudancas: { titulo: "t" }, usuario: null, em }), /sistema · alterado · campos: título/);
});
