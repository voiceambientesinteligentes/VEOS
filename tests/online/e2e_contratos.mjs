// Teste online dos CONTRATOS DE SUPORTE (receita recorrente) contra a API real: cria contrato, confere as cobrancas,\n// o MRR, a previsao de caixa, o recebimento, a suspensao e o encerramento. No fim o contrato TESTE e encerrado\n// (cobrancas abertas canceladas) e o robo fica INATIVO. Uso: node scripts/online.mjs tests/online/e2e_contratos.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = `teste-contratos${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
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
const membro = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE contratos", papel: "direcao", ativo }) });
assert.ok((await membro(true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");
const sufixo = Date.now().toString(36);



const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
let contratoId = null;

try {
  const inv = await api("POST", "fluxo/contratos-suporte", { cliente_nome: "X", descricao: "y", valor_mensal: 0, inicio: hoje });
  assert.equal(inv.status, 400); ok("contrato sem valor recusado");
  const r = exige(await api("POST", "fluxo/contratos-suporte", { cliente_nome: `Cliente TESTE ${sufixo}`, descricao: "Suporte mensal TESTE", valor_mensal: "1200.00", dia_vencimento: "10", inicio: "2025-01-10" }), "criar");
  contratoId = r.id;
  assert.match(r.codigo, /^SUP-T\d{5}$/); ok(`contrato criado (${r.codigo}, série de teste)`);
  const ficha = exige(await api("GET", `fluxo/contratos-suporte/${contratoId}`), "ficha");
  assert.equal(ficha.cobrancas.length, 7); assert.ok(ficha.cobrancas.every((c) => c.competencia >= `${hoje.slice(0, 7)}-01`)); ok("7 cobranças geradas, nenhuma de mês passado (início antigo)");
  const lista = exige(await api("GET", "fluxo/contratos-suporte"), "lista");
  assert.ok(lista.contratos.some((c) => c.id === contratoId)); assert.ok(lista.indicadores.mrr >= 1200); ok(`MRR da lista soma o contrato (${lista.indicadores.mrr})`);
  const cx = exige(await api("GET", "caixa/semanas?semanas=13"), "semanas");
  assert.ok(cx.parcelas.some((x) => x.pedido === r.codigo), "cobranca do contrato fora da previsao de caixa"); ok("cobranças abertas do contrato entram na previsão de caixa (entradas previstas)");
  // reajuste
  exige(await api("POST", `fluxo/contratos-suporte/${contratoId}`, { valor_mensal: "1500.00", motivo: "reajuste" }), "reajuste");
  const f2 = exige(await api("GET", `fluxo/contratos-suporte/${contratoId}`), "ficha 2");
  assert.ok(f2.cobrancas.every((c) => Number(c.valor) === 1500)); ok("reajuste atualiza as cobranças abertas");
  // receber
  const primeira = f2.cobrancas[0];
  const futuro = await api("POST", `fluxo/contratos-suporte/${contratoId}/cobrancas/${primeira.id}/receber`, { data: "2999-01-01", valor: "1500.00" });
  assert.equal(futuro.status, 400); ok("recebimento com data futura recusado");
  exige(await api("POST", `fluxo/contratos-suporte/${contratoId}/cobrancas/${primeira.id}/receber`, { data: hoje, valor: "1500.00" }), "receber");
  const rep = exige(await api("POST", `fluxo/contratos-suporte/${contratoId}/cobrancas/${primeira.id}/receber`, { data: hoje, valor: "1500.00" }), "receber de novo");
  assert.equal(rep.repetido, true); ok("cobrança recebida uma vez só");
  // suspender / reativar
  exige(await api("POST", `fluxo/contratos-suporte/${contratoId}`, { estado: "suspenso", motivo: "teste" }), "suspender");
  const f3 = exige(await api("GET", `fluxo/contratos-suporte/${contratoId}`), "ficha 3");
  assert.equal(f3.cobrancas.filter((c) => c.estado === "aberta").length, 0); ok("suspender cancela as cobranças abertas");
  exige(await api("POST", `fluxo/contratos-suporte/${contratoId}`, { estado: "ativo" }), "reativar");
  const f4 = exige(await api("GET", `fluxo/contratos-suporte/${contratoId}`), "ficha 4");
  assert.equal(f4.cobrancas.filter((c) => c.estado === "aberta").length, 6); ok("reativar reabre as cobranças futuras");
  const semPerm = await api("GET", "fluxo/contratos-suporte/00000000-0000-0000-0000-000000000000");
  assert.equal(semPerm.status, 404); ok("contrato inexistente -> 404");
  const meus = await (await fetch(`${URL_BASE}/rest/v1/contratos_suporte?id=eq.${contratoId}&select=criado_por`, { headers: admin })).json();
  assert.equal(meus[0].criado_por, user.id); ok("dados gravados como do robo (fora da visao real e da previsao de caixa real)");
} finally {
  if (contratoId) { const r = await api("POST", `fluxo/contratos-suporte/${contratoId}`, { estado: "encerrado" }); console.log(r.status === 200 ? "ok  contrato TESTE encerrado" : `aviso: encerrar ${r.status}`); }
  assert.ok((await membro(false)).ok);
  console.log(`\n${oks.length} verificações OK · robo TESTE inativo`);
}

