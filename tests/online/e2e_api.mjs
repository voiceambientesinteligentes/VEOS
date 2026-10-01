// Teste ponta a ponta da API online (Supabase). Usa um usuario TESTE automatizado
// com senha aleatoria renovada a cada execucao (nunca impressa).
// Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node tests/online/e2e_api.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
// GitHub Actions usa usuarios TESTE proprios (nao colide com execucao local ao mesmo tempo)
const EMAIL = `teste-automatizado${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
const ORIGEM = "https://veos-voice.netlify.app";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const resultados = [];
const ok = (nome) => resultados.push(`ok  ${nome}`);

async function req(path, { method = "GET", token, body, headers = {} } = {}) {
  const r = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, "Content-Type": "application/json", Origin: ORIGEM, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
  return { status: r.status, dados, headers: r.headers };
}

// 1. usuario TESTE: cria se preciso e renova a senha
const senha = randomBytes(24).toString("base64url");
let lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) {
  const r = await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) });
  user = await r.json();
  assert.ok(user.id, "criar usuario TESTE");
} else {
  const r = await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha }) });
  assert.equal(r.status, 200, "renovar senha TESTE");
}
const login = await req("/auth/v1/token?grant_type=password", { method: "POST", body: { email: EMAIL, password: senha } });
assert.equal(login.status, 200, "login com senha");
const token = login.dados.access_token;

// 2. sem cadastro em membros -> 403
await fetch(`${URL_BASE}/rest/v1/membros?user_id=eq.${user.id}`, { method: "DELETE", headers: admin });
assert.equal((await req("/functions/v1/api/me", { token })).status, 403); ok("usuario autenticado mas fora de membros -> 403");

// 3. cadastra como membro TESTE
const ins = await fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE automatizado", papel: "vendas" }) });
assert.ok(ins.ok, "inserir membro");

const me = await req("/functions/v1/api/me", { token });
assert.equal(me.status, 200); assert.equal(me.dados.papel, "vendas"); ok("GET /api/me com membro -> 200");
assert.equal(me.headers.get("access-control-allow-origin"), ORIGEM); ok("CORS libera a origem do portal");
const outra = await req("/functions/v1/api/me", { token, headers: { Origin: "https://site-malicioso.example" } });
assert.equal(outra.headers.get("access-control-allow-origin"), null); ok("CORS nega origem desconhecida");

const st = await req("/functions/v1/api/setores", { token });
assert.equal(st.status, 200); assert.equal(st.dados.setores.length, 9); assert.equal(st.dados.diretores.length, 9); ok("GET /api/setores -> 9 setores e 9 diretores");

// 4. gravar orcamento: idempotencia
const orc = {
  id: `ORC-TESTE-E2E-${Date.now()}`, ambiente: "TESTE", impostos: "12000.00", valor_total_informado: "125000.00",
  itens: [{ codigo: "CENTRAL", quantidade: "2", preco_unitario: "50000.00", custo_unitario: "25000.00" },
          { codigo: "REDE", quantidade: "1", preco_unitario: "20000.00", custo_unitario: "12000.00" }],
};
const chave = randomUUID();
const g1 = await req("/functions/v1/api/orcamentos", { method: "POST", token, body: { entrada: orc }, headers: { "Idempotency-Key": chave } });
assert.equal(g1.status, 200, JSON.stringify(g1.dados)); assert.equal(g1.dados.situacao, "BLOQUEAR_ENVIO"); assert.equal(g1.dados.repetido, false);
ok("POST /api/orcamentos grava e devolve avisos (BLOQUEAR_ENVIO)");
const g2 = await req("/functions/v1/api/orcamentos", { method: "POST", token, body: { entrada: orc }, headers: { "Idempotency-Key": chave } });
assert.equal(g2.dados.repetido, true); assert.equal(g2.dados.orcamento_id, g1.dados.orcamento_id); ok("mesma chave repetida nao duplica (idempotente)");
assert.equal((await req("/functions/v1/api/orcamentos", { method: "POST", token, body: { entrada: orc } })).status, 400); ok("sem Idempotency-Key -> 400");
assert.equal((await req("/functions/v1/api/orcamentos", { method: "POST", token, body: { entrada: { ...orc, ambiente: "PRODUCAO" } }, headers: { "Idempotency-Key": randomUUID() } })).status, 400); ok("PRODUCAO recusado -> 400");

const lst = await req("/functions/v1/api/orcamentos", { token });
const salvo = lst.dados.orcamentos.find((o) => o.id === g1.dados.orcamento_id);
assert.ok(salvo); assert.equal(salvo.avisos.length, g1.dados.avisos.length); ok(`GET /api/orcamentos traz o registro com ${salvo.avisos.length} avisos gravados`);

// 5. protecoes
assert.equal((await req("/functions/v1/api/me")).status, 401); ok("chave publica sem login -> 401");
const rpc = await req("/rest/v1/rpc/registrar_orcamento", { method: "POST", token, body: { p: {} } });
assert.ok([401, 403, 404].includes(rpc.status), `rpc direto: ${rpc.status}`); ok(`usuario nao chama a funcao do banco direto -> ${rpc.status}`);
const leitura = await req("/rest/v1/orcamentos?select=id", { token });
assert.deepEqual(leitura.dados, []); ok("usuario nao le tabelas direto (RLS) -> []");
const cad = await req("/auth/v1/signup", { method: "POST", body: { email: `intruso-${Date.now()}@veos-teste.invalid`, password: randomBytes(16).toString("hex") } });
assert.ok(cad.status >= 400, `signup: ${cad.status}`); ok(`cadastro publico desligado -> ${cad.status}`);
const upd = await fetch(`${URL_BASE}/rest/v1/avisos?orcamento_id=eq.${g1.dados.orcamento_id}`, { method: "DELETE", headers: admin });
assert.ok(!upd.ok, "apagar aviso deveria falhar"); ok("avisos sao append-only (DELETE recusado ate pelo service role)");

console.log(resultados.join("\n"));
console.log(`\n${resultados.length} verificacoes OK`);
