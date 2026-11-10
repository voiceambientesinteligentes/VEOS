// Teste online da IA com PERGUNTA DE DADOS: o levantamento previo deve trazer os fatos do VEOS antes do modelo, a resposta
// deve trazer fontes e a trilha (ia_execucoes) deve mostrar as ferramentas. Gasta cota gratuita: nao roda no CI.
// Uso: node scripts/online.mjs tests/online/e2e_ia_dados.mjs ["pergunta"] [setor]
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

if (process.env.CI) { console.log("PULADO no CI (gasta cota gratuita da IA)."); process.exit(0); }
const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const PERGUNTA = process.argv[2] ?? "[TESTE automatizado] Como está o caixa agora e o que temos a pagar? Responda curto, só com dados do VEOS.";
const SETOR = process.argv[3] ?? "financas";
const EMAIL = "teste-iadados@veos-teste.invalid";
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
const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha, ban_duration: "none" }) })).status, 200);
const membro = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE ia dados", papel: "direcao", ativo }) });
assert.ok((await membro(true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");
let id = null;
try {
  const p = await api("POST", "diretores/perguntas", { setor_id: SETOR, pergunta: PERGUNTA });
  assert.equal(p.status, 200, JSON.stringify(p.dados));
  id = p.dados.id ?? p.dados.pergunta?.id;
  const t0 = Date.now();
  let q = null;
  while (Date.now() - t0 < 170_000) {
    await new Promise((r) => setTimeout(r, 4000));
    q = (await api("GET", `diretores/perguntas?setor=${SETOR}`)).dados.perguntas.find((x) => x.id === id);
    if (q && q.estado !== "pendente") break;
  }
  assert.equal(q?.estado, "respondida", `estado: ${q?.estado}`);
  const resp = (q.respostas ?? []).sort((a, b) => b.id - a.id)[0];
  const seg = Math.round((Date.now() - t0) / 1000);
  ok(`respondida em ~${seg}s por ${resp.motor}`);
  const trilha = await (await fetch(`${URL_BASE}/rest/v1/ia_execucoes?pergunta_id=eq.${id}&select=provedor,modelo,ok,ms,passos,erro&order=em`, { headers: admin })).json();
  const ferramentas = new Set(trilha.flatMap((t) => (t.passos ?? []).map((s) => s.nome ?? s.ferramenta).filter(Boolean)));
  console.log(`    tentativas: ${trilha.map((t) => `${t.provedor}/${t.modelo} ${t.ok ? "ok" : "falhou"} ${Math.round(t.ms / 1000)}s`).join(" | ")}`);
  console.log(`    ferramentas chamadas pelo modelo: ${[...ferramentas].join(", ") || "nenhuma (os dados vieram do levantamento previo)"}`);
  console.log(`    fontes: ${(resp.fontes ?? []).map((f) => f.titulo).join(" | ").slice(0, 300)}`);
  assert.ok((resp.fontes ?? []).length > 0, "resposta sem fontes");
  ok(`${(resp.fontes ?? []).length} fonte(s) na resposta`);
  assert.ok(!/ATENÇÃO \(conferência do VEOS\): nesta resposta o diretor não consultou/.test(resp.resposta), "a resposta saiu sem dados do VEOS");
  ok("a resposta usou dados do VEOS (sem o aviso de 'não consultou nenhum dado')");
  console.log(`\n--- RESPOSTA ---\n${resp.resposta.slice(0, 2500)}\n----------------`);
} finally {
  if (id) await api("POST", `diretores/perguntas/${id}/cancelar`, {}).catch(() => {});
  await membro(false);
}
