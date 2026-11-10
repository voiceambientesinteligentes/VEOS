// Teste online do MCP REMOTO DEFINITIVO (funcao "mcp"): robo da direcao cria o link pela API, o MCP responde pelo
// protocolo, le dados, recusa rotas fora da leitura, respeita o escopo "consulta", registra as chamadas, perde o poder
// quando o dono deixa a direcao e para de funcionar quando o link e revogado.
// Uso: node scripts/online.mjs tests/online/e2e_mcp_remoto.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = `teste-mcpremoto${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
const ORIGEM = "https://voiceambientesinteligentes.github.io";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const ok = (t) => console.log(`ok  ${t}`);
let token = null;

async function api(method, rota, body) {
  const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Origin: ORIGEM, ...(method === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let dados = null; try { dados = t ? JSON.parse(t) : null; } catch { dados = t; }
  return { status: r.status, dados };
}
const exige = (r, msg) => { assert.equal(r.status, 200, `${msg}: ${r.status} ${JSON.stringify(r.dados).slice(0, 300)}`); return r.dados; };

const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha, ban_duration: "none" }) })).status, 200);
const membro = (papel, ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE mcp remoto", papel, ativo }) });
assert.ok((await membro("direcao", true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");

let n = 0;
const chamarMcp = async (url, method, params) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }) });
  const t = await r.text();
  return { status: r.status, corpo: t ? JSON.parse(t) : null };
};
const ferramenta = async (url, name, args = {}) => { const r = await chamarMcp(url, "tools/call", { name, arguments: args }); assert.equal(r.status, 200, JSON.stringify(r.corpo)); return r.corpo.result; };
const texto = (res) => res.content[0].text;

try {
  // so a direcao cria; escopo invalido recusado
  assert.equal((await api("POST", "mcp-remoto/link", { escopo: "tudo" })).status, 400); ok("escopo invalido recusado");
  const completo = exige(await api("POST", "mcp-remoto/link", { escopo: "completo", rotulo: "teste automatico", dias: 1 }), "criar link completo");
  assert.match(completo.url, /\/functions\/v1\/mcp\/[A-Za-z0-9_-]{43}$/); ok("link completo criado (aparece uma vez)");
  const consulta = exige(await api("POST", "mcp-remoto/link", { escopo: "consulta", dias: 1 }), "criar link de consulta");
  const U = completo.url, C = consulta.url;

  assert.equal((await chamarMcp(`${URL_BASE}/functions/v1/mcp/${"x".repeat(43)}`, "ping", {})).status, 401); ok("link inexistente -> 401");
  const ini = await chamarMcp(U, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "teste", version: "1" } });
  assert.equal(ini.corpo.result.serverInfo.name, "veos"); ok("initialize responde");
  const completas = (await chamarMcp(U, "tools/list", {})).corpo.result.tools.map((t) => t.name);
  const soConsulta = (await chamarMcp(C, "tools/list", {})).corpo.result.tools.map((t) => t.name);
  assert.ok(completas.includes("veos_criar_tarefa") && completas.includes("veos_ler") && completas.length >= 25);
  assert.ok(!soConsulta.some((x) => /^veos_(criar_|registrar_|responder_|rascunho_)/.test(x)) && soConsulta.includes("veos_ler"));
  ok(`escopo completo expoe ${completas.length} ferramentas; consulta expoe ${soConsulta.length} (sem nenhuma de escrita)`);

  const resumo = await ferramenta(U, "veos_resumo_do_dia"); assert.ok(!resumo.isError, texto(resumo)); ok("veos_resumo_do_dia roda como o dono");
  const radar = await ferramenta(U, "veos_radar"); assert.ok(!radar.isError); JSON.parse(texto(radar)); ok("veos_radar devolve JSON valido");
  const painel = await ferramenta(U, "veos_painel"); assert.ok(!painel.isError, texto(painel)); ok("veos_painel (so direcao) funciona: age como o dono");
  const ler = await ferramenta(U, "veos_ler", { rota: "comercial/clientes" }); assert.ok(!ler.isError, texto(ler)); ok("veos_ler le uma tela de dados");
  for (const ruim of ["conta/mcp", "sistema/usuarios", "entrevista/arquivo", "mcp-remoto", "../api/x", "cfo//x"]) {
    const r = await ferramenta(U, "veos_ler", { rota: ruim });
    assert.equal(r.isError, true, ruim);
  }
  ok("veos_ler recusa conta, usuarios, entrevista, o proprio MCP e caminhos estranhos");

  const t1 = await ferramenta(U, "veos_criar_tarefa", { setor: "direcao", titulo: `Tarefa TESTE do MCP remoto ${Date.now()}` });
  assert.ok(!t1.isError, texto(t1)); ok("escopo completo cria tarefa");
  const sem = await chamarMcp(C, "tools/call", { name: "veos_criar_tarefa", arguments: { setor: "direcao", titulo: "nao deve criar" } });
  assert.ok(sem.corpo.error || sem.corpo.result?.isError); ok("escopo consulta nao executa ferramenta de escrita");

  const est = exige(await api("GET", "mcp-remoto"), "listar");
  assert.equal(est.links.length >= 2, true); assert.ok(est.chamadas.some((c) => c.ferramenta === "veos_radar" && c.ok));
  assert.ok(est.chamadas.some((c) => c.ferramenta === "veos_ler" && !c.ok)); ok("chamadas (certas e recusadas) ficam registradas");
  assert.ok(!JSON.stringify(est).includes(U.split("/").pop()), "o segredo nao pode voltar na listagem"); ok("a listagem nao devolve o segredo");

  // dono perde a direcao -> o link perde o poder junto
  assert.ok((await membro("vendas", true)).ok);
  const rebaixado = await chamarMcp(U, "tools/call", { name: "veos_radar", arguments: {} });
  assert.equal(rebaixado.status, 403); ok("dono fora da direcao: o link para de funcionar (403)");
  assert.ok((await membro("direcao", true)).ok);
  assert.equal((await chamarMcp(U, "ping", {})).status, 200); ok("dono de volta na direcao: o link volta");

  // revogar
  const id = est.links.find((l) => l.escopo === "completo").id;
  exige(await api("POST", "mcp-remoto/revogar", { id }), "revogar");
  assert.equal((await chamarMcp(U, "ping", {})).status, 401); ok("link revogado -> 401");
  assert.equal((await chamarMcp(C, "ping", {})).status, 200); ok("revogar um link nao derruba o outro");
  exige(await api("POST", "mcp-remoto/revogar", {}), "revogar todos");
  assert.equal((await chamarMcp(C, "ping", {})).status, 401);
  // quem nao e da direcao nao cria link
  assert.ok((await membro("vendas", true)).ok);
  assert.equal((await api("POST", "mcp-remoto/link", { escopo: "consulta" })).status, 403); ok("vendas nao cria link -> 403");
  console.log("\n22 verificacoes OK");
} finally {
  await api("POST", "mcp-remoto/revogar", {}).catch(() => {});
  await membro("direcao", false);
}
