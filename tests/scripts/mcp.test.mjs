import assert from "node:assert/strict";
import { test } from "node:test";

import { FERRAMENTAS, responder } from "../../scripts/mcp/ferramentas.mjs";

test("initialize e tools/list", async () => {
  const i = await responder({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }, null);
  assert.equal(i.result.serverInfo.name, "veos");
  assert.match(i.result.instructions, /veos_consultar_precedentes/);
  const l = await responder({ jsonrpc: "2.0", id: 2, method: "tools/list" }, null);
  assert.equal(l.result.tools.length, FERRAMENTAS.length);
  assert.ok(l.result.tools.every((t) => t.inputSchema.type === "object" && !("rota" in t)));
  assert.equal(await responder({ jsonrpc: "2.0", method: "notifications/initialized" }, null), null);
});

test("tools/call passa pela API e nunca cria decisao", async () => {
  const chamadas = [];
  const chamar = async (m, r, c) => { chamadas.push([m, r, c]); return { ok: true }; };
  const r = await responder({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "veos_consultar_precedentes", arguments: { termos: "desconto margem", setor: "vendas" } } }, chamar);
  assert.deepEqual(chamadas[0], ["POST", "biblioteca/consultar", { termos: "desconto margem", setor: "vendas", referencia: undefined, contexto: "mcp" }]);
  assert.equal(r.result.isError, undefined);
  const ideia = FERRAMENTAS.find((f) => f.name === "veos_registrar_ideia_ou_proposta");
  assert.deepEqual(ideia.inputSchema.properties.tipo.enum, ["ideia", "proposta"]);
  const falta = await responder({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "veos_pedido", arguments: {} } }, chamar);
  assert.equal(falta.result.isError, true);
  const erro = await responder({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "veos_painel", arguments: {} } }, async () => { throw new Error("somente direção e finanças"); });
  assert.match(erro.result.content[0].text, /somente direção/);
  const desconhecida = await responder({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "apagar_tudo" } }, chamar);
  assert.equal(desconhecida.error.code, -32602);
});
