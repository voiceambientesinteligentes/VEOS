import assert from "node:assert/strict";
import { test } from "node:test";

import { buscar, normalizar, pontuar } from "../../apps/web/js/domain/busca.js";

const ITENS = [
  { titulo: "Negociação ao Vivo", extra: "Ferramentas do CFO", href: "#/negociacao" },
  { titulo: "Pedidos", extra: "Operação", href: "#/pedidos" },
  { titulo: "PED-00012 · Cliente TESTE Ltda", extra: "pedido confirmado", href: "#/pedidos/1" },
  { titulo: "Contas a pagar", extra: "Operação financeiro", href: "#/contas-pagar" },
  { titulo: "Saúde do sistema", extra: "Sistema", href: "#/sistema/saude" },
];

test("normaliza acentos e caixa", () => {
  assert.equal(normalizar("Negociação SAÚDE"), "negociacao saude");
});

test("todas as palavras precisam aparecer; inicio do titulo pesa mais", () => {
  assert.equal(pontuar("negoc", ITENS[0]), 6);
  assert.equal(pontuar("negoc xyz", ITENS[0]), 0);
  assert.deepEqual(buscar("saude", ITENS).map((i) => i.href), ["#/sistema/saude"]);
  assert.deepEqual(buscar("ped", ITENS).map((i) => i.href), ["#/pedidos", "#/pedidos/1"]);
  assert.deepEqual(buscar("cliente teste", ITENS).map((i) => i.href), ["#/pedidos/1"]);
  assert.deepEqual(buscar("financeiro", ITENS).map((i) => i.href), ["#/contas-pagar"]);
  assert.deepEqual(buscar("", ITENS), []);
  assert.deepEqual(buscar("a(b", ITENS), []);
});
