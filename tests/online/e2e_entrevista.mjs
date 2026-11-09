// Teste online da ENTREVISTA GUIADA (MCP remoto): usa um link de teste proprio inserido direto no banco (NAO cria
// pelo /api para nao revogar o link real do Fernando), percorre o protocolo MCP, grava respostas, valida as recusas
// (segredo, link invalido, JSON ruim) e gera o arquivo final. Apaga tudo o que gravou (respostas, arquivo e link de teste).
// Uso: node scripts/online.mjs tests/online/e2e_entrevista.mjs
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !SERVICE) throw new Error("defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const rest = (c, init = {}) => fetch(`${URL_BASE}/rest/v1/${c}`, { ...init, headers: { ...admin, ...(init.headers ?? {}) } });
const ok = (t) => console.log(`ok  ${t}`);

// so roda se a entrevista real ainda nao tem respostas (nao mistura teste com dado do Fernando)
const existentes = await (await rest("entrevista_respostas?select=pergunta_id&limit=1")).json();
if (existentes.length) { console.log("PULADO: a entrevista real ja tem respostas; o teste nao mexe nelas."); process.exit(0); }

const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
const robo = lista.users.find((u) => u.email.endsWith("@veos-teste.invalid"));
assert.ok(robo, "precisa de um usuario robo (rode antes qualquer e2e_*)");
const segredo = randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(segredo).digest("hex");
const ins = await rest("entrevista_links", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ token_hash: hash, criado_por: robo.id, expira_em: new Date(Date.now() + 3600_000).toISOString() }) });
assert.equal(ins.status, 201, await ins.clone().text());
const linkId = (await ins.json())[0].id;
const MCP = `${URL_BASE}/functions/v1/entrevista`;
let n = 0;
const rpc = async (method, params, seg = segredo) => {
  const r = await fetch(`${MCP}/${seg}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }) });
  const t = await r.text();
  return { status: r.status, corpo: t ? JSON.parse(t) : null };
};
const ferramenta = async (name, args = {}) => { const r = await rpc("tools/call", { name, arguments: args }); assert.equal(r.status, 200); return r.corpo.result; };

try {
  assert.equal((await rpc("ping", {}, "x".repeat(43))).status, 401); ok("link invalido -> 401");
  const ini = await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "teste", version: "1" } });
  assert.equal(ini.corpo.result.serverInfo.name, "veos-entrevista"); ok("initialize responde como veos-entrevista");
  const tools = (await rpc("tools/list", {})).corpo.result.tools.map((t) => t.name);
  for (const t of ["iniciar_entrevista", "proxima_pergunta", "registrar_resposta", "ver_progresso", "finalizar_entrevista"]) assert.ok(tools.includes(t), t);
  ok(`5 ferramentas expostas (${tools.length})`);
  const i = JSON.parse((await ferramenta("iniciar_entrevista")).content[0].text);
  assert.ok(i.regras && i.proximas_perguntas.length >= 1 && i.retomando === false); ok(`iniciar devolve regras e ${i.proximas_perguntas.length} pergunta(s)`);
  const p1 = i.proximas_perguntas[0].id;
  const g = JSON.parse((await ferramenta("registrar_resposta", { pergunta_id: p1, resposta: "Resposta de teste automático", certeza: "estimado" })).content[0].text);
  assert.equal(g.gravado, p1); ok("registrar_resposta grava (estimado)");
  const segredoRuim = await ferramenta("registrar_resposta", { pergunta_id: p1, resposta: "minha senha: abc12345 e a chave sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAA", certeza: "confirmado" });
  assert.equal(segredoRuim.isError, true); ok("resposta com cara de senha/chave e recusada");
  const inex = await ferramenta("registrar_resposta", { pergunta_id: "nao-existe", resposta: "x", certeza: "confirmado" });
  assert.equal(inex.isError, true); ok("pergunta inexistente recusada");
  const nao = JSON.parse((await ferramenta("proxima_pergunta", { quantidade: 1 })).content[0].text);
  const p2 = nao.perguntas[0].id; assert.notEqual(p2, p1); ok("proxima_pergunta pula a ja respondida");
  assert.equal((await ferramenta("registrar_resposta", { pergunta_id: p2, certeza: "nao_sei" })).isError, undefined); ok("'nao sei' aceito sem texto");
  const prog = JSON.parse((await ferramenta("ver_progresso")).content[0].text);
  assert.equal(prog.respondidas, 2); ok("ver_progresso conta 2 respostas");
  const fim = JSON.parse((await ferramenta("finalizar_entrevista")).content[0].text);
  assert.match(fim.arquivo_markdown, /Resposta de teste automático/); assert.match(fim.arquivo_markdown, /n[ãa]o sei|lacuna/i); ok("finalizar gera o arquivo com a resposta e a LACUNA");
  const arq = await (await rest(`entrevista_arquivos?link_id=eq.${linkId}&select=respondidas`)).json();
  assert.equal(arq.length, 1); ok("arquivo final guardado no banco");
  const ruimJson = await fetch(`${MCP}/${segredo}`, { method: "POST", body: "{nao e json" });
  assert.equal(ruimJson.status, 400); ok("JSON invalido -> 400");
  assert.equal((await fetch(`${MCP}/${segredo}`)).status, 405); ok("GET -> 405");
  console.log("\n14 verificacoes OK");
} finally {
  await rest(`entrevista_respostas?link_id=eq.${linkId}`, { method: "DELETE" });
  await rest(`entrevista_arquivos?link_id=eq.${linkId}`, { method: "DELETE" });
  await rest(`entrevista_links?id=eq.${linkId}`, { method: "DELETE" });
}
