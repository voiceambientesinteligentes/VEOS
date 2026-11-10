// Uso REAL da IA no modo execucao (gasta cota gratuita do motor de IA; fora do CI): o robo pede ao CSO "ache 2
// escritorios de arquitetura, pegue os e-mails e prepare a apresentacao" e confere que o motor chamou
// encontrar_contatos e preparar_email e que os rascunhos existem (origem ia:<id>). Nada e enviado: robo nunca envia
// de verdade e os rascunhos dele sao descartados no fim (os dados do robo nao aparecem para quem usa o VEOS).
// Uso: node scripts/online.mjs tests/online/uso_ia_executa.mjs ["pedido"] [setor]
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = "teste-usoia-executa@veos-teste.invalid";
const ORIGEM = "https://voiceambientesinteligentes.github.io";
const PEDIDO = process.argv[2] ?? "Ache 2 escritórios de arquitetura em Balneário Camboriú, pegue os e-mails e prepare um e-mail de apresentação da VOICE para cada um.";
const SETOR = process.argv[3] ?? "vendas";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
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
const membro = (papel, ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Fernando TESTE", papel, ativo }) });
assert.ok((await membro("direcao", true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");

let rascunhos = [];
try {
  const p = await api("POST", "diretores/perguntas", { setor_id: SETOR, pergunta: PEDIDO });
  assert.equal(p.status, 200, JSON.stringify(p.dados));
  assert.equal(p.dados.ia, "analisando", "motor de IA ligado");
  console.log(`pedido ${p.dados.id.slice(0, 8)} ao ${SETOR}: ${PEDIDO}`);
  const t0 = Date.now();
  let q = null;
  while (Date.now() - t0 < 200_000) {
    await new Promise((r) => setTimeout(r, 6000));
    const l = await api("GET", `diretores/perguntas?setor=${SETOR}&limite=20`);
    q = l.dados?.perguntas?.find((x) => x.id === p.dados.id);
    if (q?.estado === "respondida" || (q?.estado === "pendente" && !q.ia_analisando && q.ia_erro)) break;
  }
  const ms = Date.now() - t0;
  const passos = (q?.execucoes ?? []).flatMap((e) => (e.passos ?? []).map((s) => `${s.ferramenta}${s.ok ? "" : "(erro)"}`));
  console.log(`\nestado: ${q?.estado} em ${Math.round(ms / 1000)} s · motor: ${q?.respostas?.at(-1)?.motor ?? "—"}${q?.ia_erro ? ` · erro: ${q.ia_erro}` : ""}`);
  console.log(`ferramentas chamadas: ${passos.join(", ") || "nenhuma"}`);
  console.log(`\n--- resposta ---\n${String(q?.respostas?.at(-1)?.resposta ?? "").slice(0, 2500)}\n--- fim ---`);
  const m = await api("GET", `mensagens?estado=rascunho&origem=${encodeURIComponent(`ia:${p.dados.id}`)}`);
  rascunhos = m.dados?.mensagens ?? [];
  for (const r of rascunhos) console.log(`\nRASCUNHO para ${r.destinatario} · ${r.assunto}\n${String(r.corpo).slice(0, 700)}`);
  assert.equal(q?.estado, "respondida");
  assert.ok(passos.some((x) => /encontrar_contatos|pesquisar_web/.test(x)), "pesquisou");
  assert.ok(rascunhos.length >= 1, "preparou ao menos um e-mail");
  console.log(`\nOK: ${rascunhos.length} e-mail(s) preparado(s) pela IA (nada enviado)`);
} finally {
  for (const r of rascunhos) await api("POST", `mensagens/${r.id}/descartada`, { motivo: "teste automático (uso da IA)" }).catch(() => {});
  await membro("direcao", false);
}
