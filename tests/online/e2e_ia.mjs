// Teste online do motor de raciocinio dos diretores: situacao dos motores (sem expor chaves), pergunta
// do usuario TESTE (vendas) ao CSO e, com motor ligado, a resposta da IA gravada em segundo plano com
// trilha de ferramentas. Cota gratuita esgotada nao derruba o teste: a pergunta volta para a fila com
// o motivo (comportamento esperado). No CI, com motor ligado, so a situacao dos motores. Uso: node scripts/online.mjs tests/online/e2e_ia.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = `teste-ia${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const resultados = [];
const ok = (n) => { resultados.push(`ok  ${n}`); console.log(`ok  ${n}`); };
const membro = (user_id, ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id, nome: "Usuario TESTE ia", papel: "vendas", ativo }) });

const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha }) })).status, 200);
assert.ok((await membro(user.id, true)).ok);
const sessao = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json();
const api = async (metodo, rota, corpo) => {
  const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, { method: metodo, headers: { apikey: ANON, Authorization: `Bearer ${sessao.access_token}`, "Content-Type": "application/json", ...(metodo === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}) }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  return { status: r.status, dados: await r.json().catch(() => ({})) };
};
let id = null;
try {
  const m = await api("GET", "diretores/motores");
  assert.equal(m.status, 200);
  const ids = m.dados.motores.map((x) => x.id);
  for (const id of ["gemini", "mistral", "openrouter", "openai", "claude-code"]) assert.ok(ids.includes(id), `motor ${id} na lista`);
  assert.ok(!/AIza|sk-[A-Za-z0-9]{10}/.test(JSON.stringify(m.dados)), "nenhuma chave exposta");
  const ligado = m.dados.algum_no_servidor;
  ok(`situação dos motores sem expor chaves (motor no servidor: ${ligado ? "sim" : "não"})`);

  if (ligado && process.env.CI) {
    // no CI: nao gasta cota gratuita nem deixa perguntas TESTE respondidas (respostas sao imutaveis)
    ok("CI: ciclo completo com IA roda só localmente (node scripts/online.mjs tests/online/e2e_ia.mjs)");
  } else await cicloCompleto(ligado);
} finally {
  if (id) await api("POST", `diretores/perguntas/${id}/cancelar`, {});
  await membro(user.id, false);
}
console.log(`
${resultados.length} verificações OK`);

async function cicloCompleto(ligado) {
  const p = await api("POST", "diretores/perguntas", { setor_id: "vendas", pergunta: "[TESTE automatizado] Em até 3 linhas: qual procedimento do seu manual você usaria para preparar uma proposta para um arquiteto? Não cite clientes." });
  assert.equal(p.status, 200, JSON.stringify(p.dados));
  id = p.dados.id;
  assert.equal(p.dados.ia, ligado ? "analisando" : "fila");
  ok(`pergunta criada e ${ligado ? "enviada ao motor de IA" : "deixada na fila do Claude Code"}`);

  if (ligado) {
    let q = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      q = (await api("GET", "diretores/perguntas?setor=vendas")).dados.perguntas.find((x) => x.id === id);
      if (q.estado !== "pendente" || (!q.ia_analisando && q.ia_erro)) break;
    }
    assert.ok(q.execucoes.length >= 1, "trilha da execução registrada");
    if (q.estado === "respondida") {
      const r = q.respostas[0];
      assert.match(r.motor, /Gemini|OpenAI/);
      assert.ok(!/\*\*|^#/m.test(r.resposta), "resposta sem Markdown");
      assert.ok(q.execucoes.some((x) => x.ok), "trilha da execução que respondeu");
      ok(`IA respondeu (${r.motor}) com ${q.execucoes.at(-1).passos.length} chamada(s) de ferramenta e ${r.fontes.length} fonte(s)`);
      const de_novo = await api("POST", `diretores/perguntas/${id}/pensar`, {});
      assert.equal(de_novo.status, 400); ok("pergunta respondida não é reprocessada");
    } else {
      assert.ok(q.ia_erro, "sem resposta deveria ter o motivo");
      ok(`motor tentou e devolveu para a fila com o motivo: ${q.ia_erro.slice(0, 120)}`);
    }
  } else {
    const t = await api("POST", `diretores/perguntas/${id}/pensar`, {});
    assert.equal(t.status, 409); ok("sem motor, 'tentar com a IA' explica que segue na fila do Claude Code");
  }
}
