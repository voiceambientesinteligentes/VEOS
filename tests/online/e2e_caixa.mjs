// Teste online do CAIXA REAL (somente leitura): usuario TESTE do financeiro le contas, plano, sugestoes,
// lancamentos, 13 semanas, fechamento e indicadores; usuario TESTE de vendas recebe 403. As escritas
// (extrato, conciliacao, recorrentes) sao testadas no banco em transacao desfeita (tests/banco/caixa_real.sql)
// para nao misturar lancamentos de teste no DRE da empresa. Nada de valores no log (CI publico).
// Uso: node scripts/online.mjs tests/online/e2e_caixa.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const resultados = [];
const ok = (n) => { resultados.push(n); console.log(`ok  ${n}`); };

async function sessao(email, papel) {
  const senha = randomBytes(24).toString("base64url");
  const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
  let user = lista.users.find((u) => u.email === email);
  if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email, password: senha, email_confirm: true }) })).json();
  else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha }) })).status, 200);
  const m = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: `Usuario TESTE caixa ${papel}`, papel, ativo }) });
  assert.ok((await m(true)).ok);
  const s = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: senha }) })).json();
  const api = async (rota) => { const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, { headers: { apikey: ANON, Authorization: `Bearer ${s.access_token}` } }); return { status: r.status, dados: await r.json().catch(() => ({})) }; };
  return { api, sair: () => m(false) };
}

const ci = process.env.CI ? "-ci" : "";
const fin = await sessao(`teste-caixa-fin${ci}@veos-teste.invalid`, "financas");
const ven = await sessao(`teste-caixa-ven${ci}@veos-teste.invalid`, "vendas");
try {
  const c = await fin.api("caixa/contas");
  assert.equal(c.status, 200, JSON.stringify(c.dados)); assert.ok(Array.isArray(c.dados.contas)); assert.match(c.dados.hoje, /^\d{4}-\d{2}-\d{2}$/);
  ok(`contas com saldo (${c.dados.contas.length} conta(s))`);
  const p = await fin.api("caixa/plano");
  assert.equal(p.status, 200); assert.ok(p.dados.plano.length >= 30); assert.ok(p.dados.plano.some((x) => x.codigo === "8.1" && x.grupo === "transferencia"));
  ok(`plano de contas gerencial (${p.dados.plano.length} categorias)`);
  const s = await fin.api("caixa/sugestoes"); assert.equal(s.status, 200); assert.ok(Array.isArray(s.dados.sugestoes)); ok("sugestões de conciliação");
  const m = await fin.api("caixa/movimentos?filtro=pendentes"); assert.equal(m.status, 200); assert.ok(Array.isArray(m.dados.movimentos)); ok("lançamentos pendentes");
  const r = await fin.api("caixa/recorrentes"); assert.equal(r.status, 200); assert.ok(Array.isArray(r.dados.recorrentes)); ok("recorrentes");
  const w = await fin.api("caixa/semanas?semanas=13");
  assert.equal(w.status, 200); assert.equal(w.dados.semanas, 13); assert.ok("aliquota_media_pct" in w.dados.impostos); assert.ok(typeof w.dados.entradas_realizadas_mes === "number");
  ok("dados do fluxo de 13 semanas (saldos, parcelas, contas, imposto)");
  const f = await fin.api("caixa/fechamento?mes=2026-09");
  assert.equal(f.status, 200); assert.equal(f.dados.mes, "2026-09"); assert.equal(f.dados.fim, "2026-09-30"); assert.ok(Array.isArray(f.dados.movimentos));
  ok("dados do fechamento do mês");
  const i = await fin.api("caixa/indicadores");
  assert.equal(i.status, 200); assert.ok(Array.isArray(i.dados.resumo_mensal)); assert.ok(Array.isArray(i.dados.vendas)); assert.ok(i.dados.vendas.every((v) => !/[a-z]{3,} [a-z]{3,}/i.test(v.cliente)), "cliente só pelo código");
  ok("dados dos indicadores (clientes só pelo código)");
  const rt = await fin.api("fluxo/rt-padrao");
  assert.equal(rt.status, 200); assert.ok(typeof rt.dados.rt_pct === "number" && typeof rt.dados.comissao_pct === "number"); assert.ok(["assinatura", "parcelas", "fim"].includes(rt.dados.rt_quando)); assert.ok(rt.dados.canais.length >= 1);
  ok("RT/comissão padrão do Formulário do CFO para pedidos novos");
  for (const rota of ["caixa/contas", "caixa/semanas", "caixa/indicadores"]) assert.equal((await ven.api(rota)).status, 403);
  ok("vendas não vê o caixa (403)");
} finally {
  await fin.sair();
  await ven.sair();
}
console.log(`\n${resultados.length} verificações OK`);
