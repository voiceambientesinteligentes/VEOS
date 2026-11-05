// Teste online dos FORNECEDORES PROPRIOS contra a API real: um robo TESTE da direcao cadastra, valida,
// altera, busca, importa um vendor do Zoho, lanca uma conta a pagar ligada ao fornecedor e confere a ficha.
// No fim a conta TESTE e cancelada e o robo fica INATIVO. Senha aleatoria, nunca impressa.
// Uso: node scripts/online.mjs tests/online/e2e_fornecedores.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = `teste-fornecedores${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
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
const membro = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE fornecedores", papel: "direcao", ativo }) });
assert.ok((await membro(true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");
const sufixo = Date.now().toString(36);


let contaId = null;

// CNPJ valido e diferente a cada execucao (o documento e unico no banco; execucoes paralelas nao podem colidir)
function cnpjAleatorio() {
  const d = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const dv = (base) => { const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const r = base.reduce((a, n, i) => a + n * pesos[i], 0) % 11; return r < 2 ? 0 : 11 - r; };
  d.push(dv(d)); d.push(dv(d));
  return d.join("");
}
const CNPJ = cnpjAleatorio();

try {
  const f = exige(await api("POST", "fluxo/fornecedores", { nome: `Fornecedor TESTE ${sufixo}`, documento: CNPJ, categoria: "importacao", telefone: "(47) 3333-4444", prazo_pagamento_dias: "28", cidade: "Itajaí", uf: "sc" }), "criar");
  assert.match(f.codigo, /^FOR-T\d{5}$/); ok(`fornecedor criado (${f.codigo}, serie de teste)`);
  const dup = await api("POST", "fluxo/fornecedores", { nome: "Outro", documento: CNPJ });
  assert.equal(dup.status, 400); assert.match(JSON.stringify(dup.dados), /já existe/); ok("CNPJ repetido recusado");
  const inval = await api("POST", "fluxo/fornecedores", { nome: "Ruim", documento: "123" });
  assert.equal(inval.status, 400); ok("documento invalido recusado");
  exige(await api("POST", `fluxo/fornecedores/${f.id}`, { condicao: "30% na compra, saldo em 28 dias" }), "alterar");
  const ficha = exige(await api("GET", `fluxo/fornecedores/${f.id}`), "ficha");
  assert.equal(ficha.fornecedor.condicao, "30% na compra, saldo em 28 dias"); assert.equal(ficha.fornecedor.prazo_pagamento_dias, 28); assert.equal(ficha.fornecedor.uf, "SC"); assert.equal(ficha.historico.length, 2);
  ok("alteracao parcial mantem o resto e registra historico");
  const busca = exige(await api("GET", `fluxo/fornecedores?busca=${encodeURIComponent(sufixo)}`), "busca");
  assert.ok(busca.fornecedores.some((x) => x.id === f.id)); ok("busca por nome acha o fornecedor");
  const lc = exige(await api("GET", "fluxo/compras/fornecedores"), "lista da compra");
  assert.ok(lc.fornecedores.find((x) => x.id === f.id)); ok("lista da compra traz o fornecedor proprio (com id)");

  // conta a pagar ligada ao fornecedor
  const cp = exige(await api("POST", "fluxo/contas-pagar", { descricao: `Conta TESTE ${sufixo}`, fornecedor: "qualquer", fornecedor_id: f.id, categoria: "frete", vencimento: "2027-01-10", valor: "123.45" }), "conta a pagar");
  contaId = cp.id;
  const f2 = exige(await api("GET", `fluxo/fornecedores/${f.id}`), "ficha 2");
  assert.ok(f2.contas.some((k) => k.id === contaId)); ok("conta a pagar aparece na ficha do fornecedor");
  const [linha] = await (await fetch(`${URL_BASE}/rest/v1/contas_pagar?id=eq.${contaId}&select=fornecedor,fornecedor_id`, { headers: admin })).json();
  assert.equal(linha.fornecedor_id, f.id); assert.equal(linha.fornecedor, `Fornecedor TESTE ${sufixo}`); ok("conta usa o nome e o id do cadastro");

  // importar um vendor do Zoho
  const zv = lc.fornecedores.find((x) => x.zoho_id && !x.id);
  if (zv) {
    const i1 = exige(await api("POST", `fluxo/fornecedores/zoho/${zv.zoho_id}`, {}), "importar do Zoho");
    const i2 = exige(await api("POST", `fluxo/fornecedores/zoho/${zv.zoho_id}`, {}), "importar de novo");
    assert.equal(i1.id, i2.id); ok(`vendor do Zoho importado uma vez so (${i1.codigo})`);
  } else console.log("aviso: nenhum vendor do Zoho no espelho para importar");

  const meus = await (await fetch(`${URL_BASE}/rest/v1/fornecedores?id=eq.${f.id}&select=criado_por`, { headers: admin })).json();
  assert.equal(meus[0].criado_por, user.id); ok("dados gravados como do robo (ficam fora da visao real)");
} finally {
  if (contaId) { const r = await api("POST", `fluxo/contas-pagar/${contaId}/cancelar`, { motivo: "conta TESTE do e2e_fornecedores" }); console.log(r.status === 200 ? "ok  conta TESTE cancelada" : `aviso: cancelar ${r.status}`); }
  // libera o CNPJ e o vendor do Zoho (indices unicos) e deixa os fornecedores do robo inativos
  await fetch(`${URL_BASE}/rest/v1/fornecedores?criado_por=eq.${user.id}`, { method: "PATCH", headers: admin, body: JSON.stringify({ documento: null, zoho_vendor_id: null, estado: "inativo" }) });
  assert.ok((await membro(false)).ok);
  console.log(`\n${oks.length} verificações OK · robo TESTE inativo`);
}

