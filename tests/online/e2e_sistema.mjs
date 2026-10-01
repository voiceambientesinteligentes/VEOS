// Teste online da area Sistema (saude; usuarios e exportacao quando existirem). Usuario TESTE
// proprio com senha aleatoria renovada a cada execucao (nunca impressa); fica INATIVO no fim.
// Uso: node scripts/online.mjs tests/online/e2e_sistema.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = "teste-sistema@veos-teste.invalid";
const ORIGEM = "https://voiceambientesinteligentes.github.io";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const resultados = [];
const ok = (nome) => resultados.push(`ok  ${nome}`);

async function req(path, { method = "GET", token, body, headers = {} } = {}) {
  const r = await fetch(`${URL_BASE}${path}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, "Content-Type": "application/json", Origin: ORIGEM, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: r.status, dados };
}
const papel = (user_id, p, ativo = true) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id, nome: "Usuario TESTE sistema", papel: p, ativo }) });

const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha }) })).status, 200);
const token = (await req("/auth/v1/token?grant_type=password", { method: "POST", body: { email: EMAIL, password: senha } })).dados.access_token;
assert.ok(token, "login TESTE");

try {
  assert.ok((await papel(user.id, "vendas")).ok);
  assert.equal((await req("/functions/v1/api/sistema/saude", { token })).status, 403); ok("vendas nao ve a saude do sistema -> 403");
  assert.ok((await papel(user.id, "direcao")).ok);
  const s = await req("/functions/v1/api/sistema/saude", { token });
  assert.equal(s.status, 200, JSON.stringify(s.dados));
  assert.ok(s.dados.banco_bytes > 0 && Array.isArray(s.dados.alertas) && Array.isArray(s.dados.zoho_modulos));
  assert.ok(s.dados.agendamentos.some((j) => j.nome === "veos-saude-sistema"));
  ok(`direcao le a saude: banco ${Math.round(s.dados.banco_bytes / 1048576)} MB, ${s.dados.alertas.length} alerta(s), ${s.dados.agendamentos.length} agendamentos`);
  assert.equal((await req("/rest/v1/rpc/sistema_saude", { method: "POST", token, body: {} })).status >= 400, true); ok("usuario nao chama sistema_saude direto no banco");
} finally {
  await papel(user.id, "vendas", false); // TESTE fica inativo
}
console.log(resultados.join("\n"));
console.log(`\n${resultados.length} verificacoes OK`);
