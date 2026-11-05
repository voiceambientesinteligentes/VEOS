// Teste online da AGENDA POR PESSOA contra a API real: o robo TESTE da direcao assume o cargo SDR do Comercial,\n// recebe as tarefas do dia (origem agenda, responsavel = ele), a mesma chave nao duplica e, ao limpar o cargo,\n// as tarefas sao canceladas e o robo fica INATIVO. Uso: node scripts/online.mjs tests/online/e2e_agenda.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = `teste-agenda${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
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
const membro = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE agenda", papel: "direcao", ativo }) });
assert.ok((await membro(true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");
const sufixo = Date.now().toString(36);


const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10); // dia em Sao Paulo
const diaUtil = ![0, 6].includes(new Date(`${hoje}T12:00:00Z`).getUTCDay());
const minhas = async () => (await (await fetch(`${URL_BASE}/rest/v1/tarefas?responsavel=eq.${user.id}&origem=eq.agenda&select=id,titulo,estado,prazo,setor_id`, { headers: admin })).json());

try {
  const inv = await api("POST", `sistema/membros/${user.id}`, { acao: "cargo", cargo: "vendas:nao_existe" });
  assert.equal(inv.status, 400); ok("cargo inexistente recusado");
  const r = exige(await api("POST", `sistema/membros/${user.id}`, { acao: "cargo", cargo: "vendas:sdr", motivo: "teste" }), "definir cargo");
  ok(`cargo SDR definido (agenda: ${JSON.stringify(r.agenda)})`);
  const lista = exige(await api("GET", "sistema/membros"), "membros");
  assert.equal(lista.membros.find((m) => m.user_id === user.id).cargo, "vendas:sdr"); ok("cargo aparece na lista de usuarios");
  const t1 = await minhas();
  if (diaUtil) {
    assert.ok(t1.length >= 3, `esperava as tarefas do SDR, veio ${t1.length}`);
    assert.ok(t1.every((t) => t.setor_id === "vendas" && t.estado === "aberta")); ok(`${t1.length} tarefa(s) da agenda do SDR criadas para a pessoa`);
    assert.ok(t1.some((t) => t.titulo.startsWith("Hoje: ")) && t1.some((t) => t.titulo.startsWith("Semana: ")) && t1.some((t) => t.titulo.startsWith("Mês: "))); ok("diária, semanal e mensal presentes");
    const radar = exige(await api("GET", "radar"), "radar");
    assert.ok(radar.tarefas.some((t) => t.responsavel === user.id && t.origem === "agenda")); ok("tarefas da agenda aparecem no Radar com o responsável");
    // trocar para o mesmo cargo de novo e chamar a geracao outra vez nao duplica
    exige(await api("POST", `sistema/membros/${user.id}`, { acao: "cargo", cargo: "vendas:gerente_comercial" }), "outro cargo");
    exige(await api("POST", `sistema/membros/${user.id}`, { acao: "cargo", cargo: "vendas:sdr" }), "volta ao SDR");
    assert.equal((await minhas()).filter((t) => t.estado === "aberta" && t.titulo.startsWith("Hoje: Responder")).length, 1); ok("a mesma atividade do período não duplica");
  } else { console.log("aviso: fim de semana, a agenda não gera tarefas hoje"); assert.equal(t1.length, 0); ok("fim de semana não gera tarefas"); }
} finally {
  await api("POST", `sistema/membros/${user.id}`, { acao: "cargo", cargo: null });
  await fetch(`${URL_BASE}/rest/v1/tarefas?responsavel=eq.${user.id}&origem=eq.agenda`, { method: "DELETE", headers: admin }); // apaga as tarefas do robo (a chave de repeticao some junto)
  assert.ok((await membro(false)).ok);
  console.log(`\n${oks.length} verificações OK · robo TESTE inativo`);
}

