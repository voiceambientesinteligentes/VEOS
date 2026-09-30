import assert from "node:assert/strict";
import { test } from "node:test";

import { interpretar } from "../../apps/web/js/domain/comandos.js";

test("navegacao por voz", () => {
  assert.equal(interpretar("Abrir a órbita").rota, "#/orbita");
  assert.equal(interpretar("mostre os avisos do CFO").rota, "#/cfo");
  assert.equal(interpretar("Histórico").rota, "#/historico");
  assert.equal(interpretar("ir para a visão geral").rota, "#/visao");
  assert.equal(interpretar("VEOS, abre o histórico de orçamentos!").rota, "#/historico");
});

test("pedido de negocio indica o diretor, sem navegar", () => {
  const r = interpretar("Qual é a margem do projeto da cobertura e o custo dos equipamentos?");
  assert.equal(r.rota, undefined);
  assert.equal(r.diretor.sigla, "CFO");
  assert.equal(interpretar("prepare uma campanha para arquitetos no instagram").diretor.sigla, "CMO");
  assert.equal(interpretar("como está o cronograma da instalação").diretor.sigla, "COO");
  assert.equal(interpretar("quero ver a proposta do cliente").diretor.sigla, "CSO");
});

test("sem termo conhecido vai para a Secretaria; vazio pede repeticao", () => {
  assert.equal(interpretar("bom dia").diretor, null);
  assert.match(interpretar("   ").fala, /Não entendi/);
});
