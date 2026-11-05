// Teste online do MCP do VEOS: usuario TESTE (vendas) cria o acesso do Claude Code, o servidor MCP
// real (scripts/mcp/veos-mcp.mjs) sobe com essa sessao e responde pelo protocolo; a sessao do
// "navegador" continua valida (sessoes separadas); permissoes de vendas valem no MCP. TESTE inativo no fim.
// Uso: node scripts/online.mjs tests/online/e2e_mcp.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
// GitHub Actions usa usuarios TESTE proprios (nao colide com execucao local ao mesmo tempo)
const EMAIL = `teste-mcp${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const resultados = [];
const ok = (n) => resultados.push(`ok  ${n}`);
const membro = (user_id, ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id, nome: "Usuario TESTE mcp", papel: "vendas", ativo }) });

const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha }) })).status, 200);
assert.ok((await membro(user.id, true)).ok);
const nav = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json();
const pasta = mkdtempSync(join(tmpdir(), "veos-mcp-"));
let mcp;
try {
  const r = await fetch(`${URL_BASE}/functions/v1/api/conta/mcp`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${nav.access_token}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: "{}" });
  const acesso = await r.json();
  assert.equal(r.status, 200, JSON.stringify(acesso)); assert.ok(acesso.refresh_token && acesso.refresh_token !== nav.refresh_token); ok("acesso do Claude Code criado (sessao separada)");

  const env = { ...process.env, VEOS_MCP_SESSAO: join(pasta, "sessao.json") };
  const cfg = spawn(process.execPath, ["scripts/mcp/veos-mcp.mjs", "--configurar", acesso.refresh_token], { env, stdio: "ignore" });
  await new Promise((res) => cfg.on("exit", res));
  mcp = spawn(process.execPath, ["scripts/mcp/veos-mcp.mjs"], { env, stdio: ["pipe", "pipe", "inherit"] });
  const pend = new Map();
  createInterface({ input: mcp.stdout }).on("line", (l) => { const m = JSON.parse(l); pend.get(m.id)?.(m); });
  let n = 0;
  const rpc = (method, params) => new Promise((res) => { const id = ++n; pend.set(id, res); mcp.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`); });

  assert.equal((await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "teste", version: "1" } })).result.serverInfo.name, "veos");
  mcp.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
  const tools = (await rpc("tools/list")).result.tools;
  assert.ok(tools.length >= 10); ok(`MCP responde pelo protocolo: ${tools.length} ferramentas`);
  const radar = (await rpc("tools/call", { name: "veos_radar", arguments: {} })).result;
  assert.ok(!radar.isError, radar.content[0].text); assert.ok(JSON.parse(radar.content[0].text).alertas); ok("veos_radar le o Radar com a sessao do usuario");
  const painel = (await rpc("tools/call", { name: "veos_painel", arguments: {} })).result;
  assert.equal(painel.isError, true); assert.match(painel.content[0].text, /somente direção/); ok("permissoes valem no MCP: vendas nao ve o painel executivo");
  const prec = (await rpc("tools/call", { name: "veos_consultar_precedentes", arguments: { termos: "desconto", setor: "vendas" } })).result;
  assert.ok(!prec.isError); assert.ok(JSON.parse(prec.content[0].text).consulta_id); ok("consulta de precedentes pelo MCP fica registrada");

  // ferramentas de criacao: valem as mesmas permissoes e regras da tela
  const sufixo = Date.now().toString(36);
  const cli = (await rpc("tools/call", { name: "veos_criar_cliente", arguments: { nome: `Cliente TESTE MCP ${sufixo}`, telefone: "(47) 90000-0001", origem: "outro" } })).result;
  assert.ok(!cli.isError, cli.content[0].text); const cliente = JSON.parse(cli.content[0].text); assert.match(cliente.codigo, /^CLI-T[0-9]{5}$/); ok(`veos_criar_cliente cadastra (${cliente.codigo}, serie de teste)`);
  const orc = (await rpc("tools/call", { name: "veos_criar_orcamento_rascunho", arguments: { cliente_id: cliente.id, cliente_nome: `Cliente TESTE MCP ${sufixo}`, valor_total: "500.00", itens: [{ tipo: "servico", nome: "Visita técnica TESTE", quantidade: "1", preco_unit: "500.00" }] } })).result;
  assert.ok(!orc.isError, orc.content[0].text); const orcamento = JSON.parse(orc.content[0].text); assert.match(orcamento.numero, /^ORV-T[0-9]{5}$/); ok(`veos_criar_orcamento_rascunho cria o rascunho (${orcamento.numero})`);
  const ficha = (await rpc("tools/call", { name: "veos_clientes", arguments: { busca: sufixo } })).result;
  assert.ok(JSON.parse(ficha.content[0].text).clientes.some((x) => x.id === cliente.id)); ok("veos_clientes acha o cliente criado");
  const conta = (await rpc("tools/call", { name: "veos_criar_conta_a_pagar", arguments: { descricao: "TESTE", fornecedor: "TESTE", categoria: "frete", vencimento: "2027-01-10", valor: "10.00" } })).result;
  assert.equal(conta.isError, true); assert.match(conta.content[0].text, /perfil/); ok("permissoes valem na criacao: vendas nao lanca conta a pagar");
  const vazio = (await rpc("tools/call", { name: "veos_criar_cliente", arguments: { nome: "Sem contato" } })).result;
  assert.equal(vazio.isError, true); ok("regras de validacao valem no MCP (cliente sem telefone nem e-mail recusado)");

  const nav2 = await fetch(`${URL_BASE}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: nav.refresh_token }) });
  assert.equal(nav2.status, 200); ok("a sessao do navegador continua valida depois do uso do MCP");
} finally {
  mcp?.kill();
  rmSync(pasta, { recursive: true, force: true });
  await membro(user.id, false);
}
console.log(resultados.join("\n"));
console.log(`\n${resultados.length} verificacoes OK`);
