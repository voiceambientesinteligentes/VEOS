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

test("manual do diretor: setor invalido recusado; sem manual devolve o perfil", async () => {
  const r = await responder({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "veos_manual_diretor", arguments: { setor: "inexistente" } } }, null);
  assert.equal(r.result.isError, true);
  const m = await responder({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "veos_manual_diretor", arguments: { setor: "marketing", pedido: "campanha para arquitetos" } } }, null);
  assert.ok(!m.result.isError, m.result.content[0].text);
  const d = JSON.parse(m.result.content[0].text);
  assert.ok(d.diretor.nome);
});

test("ferramentas de criação: só cadastram e fazem rascunho, passam pela API e exigem os campos obrigatórios", async () => {
  const chamadas = [];
  const chamar = async (m, r, c) => { chamadas.push([m, r, c]); return { id: "x" }; };
  const call = (name, args) => responder({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, chamar);
  const nomes = FERRAMENTAS.map((f) => f.name);
  for (const n of ["veos_criar_cliente", "veos_criar_orcamento_rascunho", "veos_criar_conta_a_pagar", "veos_criar_fornecedor", "veos_criar_contrato_suporte", "veos_clientes", "veos_fornecedores"]) assert.ok(nomes.includes(n), n);
  // nenhuma ferramenta paga, envia ou aceita
  assert.ok(!nomes.some((n) => /pagar_conta|enviar|aceitar|aprovar|confirmar_pedido|decisao/.test(n)), nomes.join(","));
  assert.equal((await call("veos_criar_cliente", {})).result.isError, true);
  await call("veos_criar_cliente", { nome: "Cliente TESTE", telefone: "47999998888" });
  await call("veos_criar_conta_a_pagar", { descricao: "Frete", fornecedor: "Transp", categoria: "frete", vencimento: "2026-12-10", valor: "350.00" });
  await call("veos_criar_orcamento_rascunho", { cliente_nome: "Cliente TESTE", valor_total: "100.00", itens: [{ tipo: "servico", nome: "Visita", quantidade: "1", preco_unit: "100.00" }] });
  assert.deepEqual(chamadas.map((c) => [c[0], c[1]]), [["POST", "comercial/clientes"], ["POST", "fluxo/contas-pagar"], ["POST", "comercial/orcamentos"]]);
  assert.equal(chamadas[2][2].itens[0].tipo, "servico");
  await call("veos_clientes", { busca: "Silva & Filhos" });
  assert.equal(chamadas[3][1], "comercial/clientes?busca=Silva%20%26%20Filhos");
});
