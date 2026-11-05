import { test } from "node:test";
import assert from "node:assert/strict";
import { fornecedorDoZoho, normalizarFornecedor } from "../../apps/web/js/domain/fornecedores.js";

test("fornecedor: só o nome é obrigatório; documento e telefone validados", () => {
  assert.deepEqual(normalizarFornecedor({ nome: "A" }).erros, ["Informe o nome do fornecedor."]);
  const ok = normalizarFornecedor({ nome: "Distribuidora Som", documento: "12.323.599/0001-83", telefone: "(47) 3333-4444", email: "VENDAS@x.com.br", categoria: "importacao", prazo_pagamento_dias: "28", uf: "sc" });
  assert.deepEqual(ok.erros, []);
  assert.equal(ok.dados.documento, "12323599000183");
  assert.equal(ok.dados.email, "vendas@x.com.br");
  assert.equal(ok.dados.prazo_pagamento_dias, 28);
  assert.equal(ok.dados.uf, "SC");
});
test("fornecedor: recusa documento, categoria, prazo e telefone inválidos", () => {
  const r = normalizarFornecedor({ nome: "Fulano", documento: "123", categoria: "x", prazo_pagamento_dias: "400", telefone: "123" });
  assert.equal(r.erros.length, 4);
});
test("fornecedor: alteração parcial só valida o que veio", () => {
  const r = normalizarFornecedor({ condicao: "28 dias" }, { parcial: true });
  assert.deepEqual(r.erros, []);
  assert.deepEqual(Object.keys(r.dados), ["condicao"]);
  assert.deepEqual(normalizarFornecedor({ estado: "x" }, { parcial: true }).erros, ["Situação inválida."]);
});
test("fornecedor do Zoho: usa contato principal e ignora documento inválido", () => {
  const f = fornecedorDoZoho({ contact_name: "Lojão", cf_cpf_cnpj: "11111111111", contact_persons: [{ is_primary_contact: true, first_name: "Ana", last_name: "Souza", email: "A@L.com", phone: "47999998888" }], billing_address: { city: "Itajaí", state_code: "SC" } });
  assert.equal(f.documento, null);
  assert.equal(f.contato_nome, "Ana Souza");
  assert.equal(f.telefone, "47999998888");
  assert.equal(f.email, "a@l.com");
});
