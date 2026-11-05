// Teste online do AVISO COM O NAVEGADOR FECHADO (Web Push): chave publica, inscricao de um aparelho de mentira,\n// envio de teste (assina com VAPID e criptografa de verdade; o servico de push responde que o aparelho nao existe)\n// e remocao. Nao prova a chegada num navegador real. Uso: node scripts/online.mjs tests/online/e2e_push.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = `teste-push${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
const ORIGEM = "https://voiceambientesinteligentes.github.io";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const oks = [];
const ok = (t) => { oks.push(t); console.log(`ok  ${t}`); };
let token = null;

async function api(method, rota, body) {
  const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Origin: ORIGEM, ...(method === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const texto = await r.text();
  let dados = null; try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: r.status, dados };
}
const exige = (r, msg) => { assert.equal(r.status, 200, `${msg}: ${r.status} ${JSON.stringify(r.dados).slice(0, 300)}`); return r.dados; };

const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha, ban_duration: "none" }) })).status, 200);
const membro = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE push", papel: "direcao", ativo }) });
assert.ok((await membro(true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");
const sufixo = Date.now().toString(36);


import { createECDH, randomBytes as rb } from "node:crypto";
const b64u = (b) => Buffer.from(b).toString("base64url");

try {
  const ch = exige(await api("GET", "push/chave"), "chave");
  assert.ok(ch.chave && ch.chave.length > 60); ok("o servidor tem a chave publica de push (VAPID)");
  const sem = await api("POST", "push/testar", {});
  assert.equal(sem.status, 400); ok("aviso de teste sem aparelho inscrito -> 400");
  const ruim = await api("POST", "push/inscrever", { endpoint: "http://inseguro.example/x", keys: { p256dh: "a".repeat(30), auth: "b".repeat(10) } });
  assert.equal(ruim.status, 400); ok("endpoint sem https recusado");
  // aparelho de mentira: chave P-256 valida e segredo de autenticacao; endpoint no servico de push do Chrome/Edge com token inexistente
  const ecdh = createECDH("prime256v1"); ecdh.generateKeys();
  const endpoint = `https://fcm.googleapis.com/fcm/send/veos-teste-${rb(12).toString("hex")}`;
  exige(await api("POST", "push/inscrever", { endpoint, keys: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(rb(16)) } }), "inscrever");
  const linhas = await (await fetch(`${URL_BASE}/rest/v1/push_inscricoes?user_id=eq.${user.id}&select=endpoint`, { headers: admin })).json();
  assert.ok(linhas.some((l) => l.endpoint === endpoint)); ok("aparelho inscrito (gravado para o usuario)");
  exige(await api("POST", "push/inscrever", { endpoint, keys: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(rb(16)) } }), "inscrever de novo");
  const dup = await (await fetch(`${URL_BASE}/rest/v1/push_inscricoes?endpoint=eq.${encodeURIComponent(endpoint)}&select=id`, { headers: admin })).json();
  assert.equal(dup.length, 1); ok("inscrever o mesmo aparelho de novo nao duplica");
  const t = exige(await api("POST", "push/testar", {}), "testar");
  console.log(`   resposta do servico de push: ${JSON.stringify(t.resultados)}`);
  assert.equal(t.aparelhos, 1);
  assert.equal(t.resultados[0], "removida", `resultado inesperado ${t.resultados[0]} (401/403 = assinatura VAPID recusada)`);
  ok(`o servidor assinou (VAPID), criptografou e enviou; o servico de push aceitou a assinatura e respondeu que o aparelho de mentira nao existe ()${t.resultados[0]}`);
  const c = exige(await api("POST", "push/cancelar", { endpoint }), "cancelar");
  assert.ok(c.ok); ok("cancelar a inscricao funciona");
} finally {
  await fetch(`${URL_BASE}/rest/v1/push_inscricoes?user_id=eq.${user.id}`, { method: "DELETE", headers: admin });
  assert.ok((await membro(false)).ok);
  console.log(`\n${oks.length} verificações OK · robo TESTE inativo`);
}

