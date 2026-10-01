// E2E online do setor Financeiro (projetos, fases, recebimentos, compromissos, compra proposta).
// Usa usuarios TESTE automatizados (vendas e financas) com senha aleatoria por execucao.
// Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node tests/online/e2e_financeiro.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const ok = [];

async function usuario(email, papel) {
  const senha = randomBytes(24).toString("base64url");
  const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
  let u = lista.users.find((x) => x.email === email);
  if (!u) u = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email, password: senha, email_confirm: true }) })).json();
  else await fetch(`${URL_BASE}/auth/v1/admin/users/${u.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha }) });
  await fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: u.id, nome: `Usuario TESTE ${papel}`, papel }) });
  const t = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: senha }) })).json();
  assert.ok(t.access_token, `login ${papel}`);
  return t.access_token;
}

async function api(token, metodo, rota, body, chave = randomUUID()) {
  const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, {
    method: metodo,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(metodo === "POST" ? { "Idempotency-Key": chave } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, dados: await r.json() };
}

const vendas = await usuario(`teste-automatizado${process.env.CI ? "-ci" : ""}@veos-teste.invalid`, "vendas");
const fin = await usuario(`teste-financas${process.env.CI ? "-ci" : ""}@veos-teste.invalid`, "financas");

assert.equal((await api(vendas, "GET", "projetos")).status, 403); ok.push("vendas nao acessa o Financeiro -> 403");

const cod = `PRJ-TESTE-E2E-${Date.now()}`;
const novo = await api(fin, "POST", "projetos", { codigo: cod, nome: "Residência TESTE", cliente: "Cliente TESTE", valor_contrato: "200000.00" });
assert.equal(novo.status, 200, JSON.stringify(novo.dados));
const id = novo.dados.id;
ok.push("financas cria projeto TESTE");
assert.equal((await api(fin, "POST", "projetos", { codigo: "PRJ-REAL-1", nome: "x", valor_contrato: "1.00" })).status, 400); ok.push("codigo sem TESTE recusado -> 400");

for (const f of [{ codigo: "F1", nome: "Infraestrutura", custos: "60000.00", encargos: "5000.00" }, { codigo: "F2", nome: "Equipamentos", custos: "50000.00", encargos: "3000.00" }]) {
  assert.equal((await api(fin, "POST", `projetos/${id}/fases`, f)).status, 200);
}
ok.push("2 fases cadastradas");

const chaveRec = randomUUID();
const r1 = await api(fin, "POST", `projetos/${id}/recebimentos`, { valor: "70000.00", data: "2026-09-10", fase_codigo: "F1" }, chaveRec);
assert.equal(r1.status, 200);
const r1b = await api(fin, "POST", `projetos/${id}/recebimentos`, { valor: "70000.00", data: "2026-09-10", fase_codigo: "F1" }, chaveRec);
assert.equal(r1b.dados.repetido, true); assert.equal(r1b.dados.id, r1.dados.id); ok.push("recebimento repetido com a mesma chave nao duplica");
await api(fin, "POST", `projetos/${id}/recebimentos`, { valor: "20000.00", data: "2026-09-15", fase_codigo: "F2" });
assert.equal((await api(fin, "POST", `projetos/${id}/recebimentos`, { valor: "1.00", data: "2026-09-15", fase_codigo: "F9" })).status, 400); ok.push("fase inexistente recusada -> 400");

await api(fin, "POST", `projetos/${id}/compromissos`, { descricao: "Cabeamento", valor: "80000.00", pago: "80000.00" });
const c2 = await api(fin, "POST", `projetos/${id}/compromissos`, { descricao: "Equipamentos encomendados", contraparte: "Fornecedor TESTE", valor: "30000.00", pago: "0" });
assert.equal((await api(fin, "POST", `projetos/${id}/compromissos`, { descricao: "x", valor: "10.00", pago: "11.00" })).status, 400); ok.push("pago acima do valor recusado -> 400");

const a = c2.dados.avaliacao;
assert.equal(a.resumo.recebido_efetivo, "90000.00");
assert.equal(a.resumo.compromissos, "110000.00");
assert.equal(a.resumo.exposicao_pct, "10.00");
assert.equal(a.resumo.gatilho, "NAO ACIONADO");
assert.ok(a.avisos.some((x) => x.codigo === "FASE_DESCOBERTA"));
ok.push("cada lancamento devolve a reavaliacao: exposicao 10,00% (gatilho nao acionado), F2 descoberta");

const compra = await api(fin, "POST", `projetos/${id}/compra-proposta`, { valor: "10000.00", fase: "F2", descricao: "Central de automação" });
assert.equal(compra.dados.avaliacao.situacao, "BLOQUEAR");
assert.equal(compra.dados.avaliacao.avisos[0].codigo, "COMPRA_SEM_COBERTURA");
assert.equal(compra.dados.avaliacao.resumo.cenario_compra.exposicao_pct, "15.00");
const depois = await api(fin, "GET", `projetos/${id}`);
assert.equal(depois.dados.avaliacao.resumo.compromissos, "110000.00");
ok.push("compra proposta sem cobertura -> BLOQUEAR (15%), e nada foi gravado");

const lista = await api(fin, "GET", "projetos");
assert.ok(lista.dados.projetos.some((p) => p.id === id)); ok.push("GET /projetos lista o projeto com situacao calculada");

const apagar = await fetch(`${URL_BASE}/rest/v1/recebimentos?id=eq.${r1.dados.id}`, { method: "DELETE", headers: admin });
assert.ok(!apagar.ok); ok.push("recebimentos sao append-only (DELETE recusado ate pelo service role)");
const direto = await fetch(`${URL_BASE}/rest/v1/projetos?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${fin}` } });
assert.deepEqual(await direto.json(), []); ok.push("usuario nao le tabelas financeiras direto (RLS)");

console.log(ok.map((x) => `ok  ${x}`).join("\n"));
console.log(`\n${ok.length} verificacoes OK`);
