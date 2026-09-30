// E2E online dos setores vivos: registro validado pelo catalogo -> sentinela dispara na
// gravacao (alerta + tarefa + rascunho) -> corrigir o registro resolve o alerta sozinho.
// Usa a sentinela COM_LEAD_SEM_RESPOSTA? Nao: escolhe dinamicamente uma sentinela "faltando"
// do Comercial, que dispara na hora, sem depender de datas.
// Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node tests/online/e2e_setores.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

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
async function api(token, metodo, rota, body) {
  const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, {
    method: metodo,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(metodo === "POST" ? { "Idempotency-Key": randomUUID() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, dados: await r.json() };
}

// Sentinela "faltando" do Comercial, sem filtros complexos: dispara ao criar sem o campo.
const vendas = JSON.parse(readFileSync(new URL("../../setores/vendas.json", import.meta.url), "utf8"));
const s = vendas.sentinelas.find((x) => x.gatilho.tipo === "faltando" && (x.gatilho.filtros ?? []).every((f) => f.campo === "estado"));
assert.ok(s, "o Comercial precisa de ao menos uma sentinela 'faltando' filtrada so por estado");
const tipo = vendas.registros.find((t) => t.tipo === s.gatilho.registro);
const estadoFiltro = (s.gatilho.filtros ?? []).map((f) => f.igual ?? f.em?.[0]).find(Boolean);
const estado = estadoFiltro ?? tipo.estado_inicial; // filtro explicito de estado vale inclusive para estado final
const campoFaltando = tipo.campos.find((c) => c.id === s.gatilho.campo);
const exemplo = (c) => ({ texto: "TESTE", texto_longo: "TESTE", dinheiro: "1000.00", numero: "1", data: "2026-12-31", opcao: c.opcoes?.[0], email: "teste@veos-teste.invalid", telefone: "+55 11 99999-0000", sim_nao: true })[c.tipo];
const obrigatorios = Object.fromEntries(tipo.campos.filter((c) => c.obrigatorio && c.id !== s.gatilho.campo).map((c) => [c.id, exemplo(c)]));

const vendasTok = await usuario("teste-automatizado@veos-teste.invalid", "vendas");
const finTok = await usuario("teste-financas@veos-teste.invalid", "financas");

// acesso restrito
assert.equal((await api(vendasTok, "GET", "setor/financas")).status, 403);
assert.equal((await api(vendasTok, "GET", "setor/pessoas")).status, 403);
assert.equal((await api(finTok, "GET", "setor/financas")).status, 200);
ok.push("Financeiro e Pessoas restritos (vendas -> 403; finanças -> 200)");

// validacao pelo catalogo
assert.equal((await api(vendasTok, "POST", "registros", { setor: "vendas", tipo: tipo.tipo, titulo: "x", dados: { campo_inventado: 1 } })).status, 400);
assert.equal((await api(vendasTok, "POST", "registros", { setor: "vendas", tipo: "obra", titulo: "x", dados: {} })).status, 400);
ok.push("registro fora do catálogo recusado (campo inexistente, tipo de outro setor)");

// cria sem o campo -> sentinela dispara na hora
const titulo = `${tipo.nome} TESTE E2E ${Date.now()}`;
const criado = await api(vendasTok, "POST", "registros", { setor: "vendas", tipo: tipo.tipo, titulo, estado, dados: obrigatorios });
assert.equal(criado.status, 200, JSON.stringify(criado.dados));
const id = criado.dados.id;
const radar1 = await api(vendasTok, "GET", "radar");
const alerta = radar1.dados.alertas.find((a) => a.sentinela === s.id && a.registro_id === id);
assert.ok(alerta, `alerta ${s.id} deveria existir`);
ok.push(`regra viva ${s.id} disparou na gravação: "${alerta.titulo}"`);
const tarefasSent = (s.acoes ?? []).filter((a) => a.tipo === "tarefa").length;
if (tarefasSent) {
  assert.ok(radar1.dados.tarefas.some((t) => t.registro_id === id && t.origem === s.id), "tarefa gerada");
  ok.push(`tarefa gerada automaticamente (${tarefasSent})`);
}
if ((s.acoes ?? []).some((a) => a.tipo === "rascunho")) {
  assert.ok(alerta.rascunhos.length > 0 && alerta.rascunhos[0].corpo.length > 10, "rascunho preenchido");
  ok.push("rascunho de mensagem preparado no alerta");
}

// corrige o registro -> alerta resolvido sozinho
const corrigido = await api(vendasTok, "POST", `registros/${id}`, { setor: "vendas", dados: { [s.gatilho.campo]: exemplo(campoFaltando) } });
assert.equal(corrigido.status, 200, JSON.stringify(corrigido.dados));
const radar2 = await api(vendasTok, "GET", "radar");
assert.ok(!radar2.dados.alertas.some((a) => a.sentinela === s.id && a.registro_id === id), "alerta deveria ter sido resolvido");
const [resolvido] = await (await fetch(`${URL_BASE}/rest/v1/alertas?chave=eq.${s.id}:${id}&select=estado`, { headers: admin })).json();
assert.equal(resolvido.estado, "resolvido");
ok.push("ao preencher o campo, o alerta foi resolvido automaticamente");

// historico append-only
const hist = await (await fetch(`${URL_BASE}/rest/v1/registros_historico?registro_id=eq.${id}&select=id,acao`, { headers: admin })).json();
assert.deepEqual(hist.map((x) => x.acao), ["criado", "alterado"]);
const apagar = await fetch(`${URL_BASE}/rest/v1/registros_historico?registro_id=eq.${id}`, { method: "DELETE", headers: admin });
assert.ok(!apagar.ok);
ok.push("histórico registrou criação e alteração e não pode ser apagado");

// tarefa manual e conclusao
const t = await api(vendasTok, "POST", "tarefas", { setor: "vendas", titulo: "Ligar para arquiteto TESTE", papel: vendas.equipe[0].papel, prazo: "2026-10-02" });
assert.equal(t.status, 200);
assert.equal((await api(vendasTok, "POST", `tarefas/${t.dados.id}`, { estado: "feita" })).dados.estado, "feita");
ok.push("tarefa manual criada e concluída");

// varredura manual
const v = await api(vendasTok, "POST", "radar/varrer", {});
assert.equal(v.status, 200);
assert.equal(typeof v.dados.ativos, "number");
ok.push(`varredura manual: ${v.dados.ativos} alertas ativos nos setores acessíveis`);

console.log(ok.map((x) => `ok  ${x}`).join("\n"));
console.log(`\n${ok.length} verificacoes OK`);
