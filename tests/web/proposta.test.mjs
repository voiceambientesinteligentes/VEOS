import assert from "node:assert/strict";
import { test } from "node:test";

import { agruparItens, rascunhosEnvio, telefoneWhatsApp, totaisProposta } from "../../apps/web/js/domain/proposta.js";

test("agrupa pelas secoes do orcamento, na ordem dos itens", () => {
  const s = agruparItens([
    { item_order: 3, header_name: "Sala", name: "Teclado", quantity: 2, rate: 100, item_total: 200 },
    { item_order: 1, header_name: "Cozinha", name: "Central", quantity: 1, rate: 1000, item_total: 1000, description: " Central TESTE " },
    { item_order: 2, header_name: "Cozinha", name: "Sensor", quantity: 3, rate: 33.33, item_total: 99.99 },
    { item_order: 4, name: "Programação", quantity: 1, rate: 500, item_total: 500 },
  ]);
  assert.deepEqual(s.map((x) => [x.secao, x.itens.length, x.subtotal]), [["Cozinha", 2, 1099.99], ["Sala", 1, 200], ["Itens", 1, 500]]);
  assert.equal(s[0].itens[0].descricao, "Central TESTE");
});

test("totais e rascunhos de envio", () => {
  assert.deepEqual(totaisProposta({ sub_total: 2000, discount_total: 100, tax_total: 0, adjustment: 0, total: 1900 }), { subtotal: 2000, desconto: 100, impostos: 0, ajuste: 0, total: 1900 });
  const r = rascunhosEnvio({ numero: "EST-000123", cliente: "Cliente TESTE", total: 18500.5, validade: "2026-10-31", contato: "Fernando" });
  assert.equal(r.assunto, "Proposta EST-000123 · VOICE Ambientes Inteligentes");
  assert.match(r.corpo, /válida até 31\/10\/2026\), no valor de R\$ 18\.500,50/);
  assert.match(r.whatsapp, /^Olá, Cliente TESTE!/);
  assert.equal(telefoneWhatsApp("(47) 99999-0000"), "5547999990000");
  assert.equal(telefoneWhatsApp("+55 47 99999 0000"), "5547999990000");
  assert.equal(telefoneWhatsApp("1234"), "");
});
