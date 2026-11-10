// Teste online da IA QUE EXECUTA (sem gastar cota de IA): pesquisa na web a partir do servidor, contato publico de
// empresas, registro de qualquer setor com filtro, e-mail de prospeccao preparado (cadastra o parceiro, troca o modelo da
// cadencia), envio SIMULADO (robo nunca envia de verdade), travas (bloqueio, repeticao em 30 dias) e Gmail desligado.
// O destinatario do teste e um endereco .invalid (nunca entregavel). Robo: teste-iaexecuta@veos-teste.invalid.
// Uso: node scripts/online.mjs tests/online/e2e_ia_executa.mjs
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const EMAIL = `teste-iaexecuta${process.env.CI ? "-ci" : ""}@veos-teste.invalid`;
const ORIGEM = "https://voiceambientesinteligentes.github.io";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const ok = (t) => console.log(`ok  ${t}`);
let token = null, n = 0;

async function api(method, rota, body) {
  const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, { method, headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Origin: ORIGEM, ...(method === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let dados = null; try { dados = t ? JSON.parse(t) : null; } catch { dados = t; }
  return { status: r.status, dados };
}
const exige = (r, msg) => { assert.equal(r.status, 200, `${msg}: ${r.status} ${JSON.stringify(r.dados).slice(0, 400)}`); n++; return r.dados; };

const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha, ban_duration: "none" }) })).status, 200);
const membro = (papel, ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Usuario TESTE ia executa", papel, ativo }) });
assert.ok((await membro("direcao", true)).ok);
token = (await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json()).access_token;
assert.ok(token, "login TESTE");
const destino = `prospect-${Date.now()}@veos-teste.invalid`;

try {
  const sit = exige(await api("GET", "pesquisa/situacao"), "situacao da pesquisa");
  assert.ok(sit.provedores.find((p) => p.id === "duckduckgo").ativo); ok(`pesquisa: ${sit.provedores.filter((p) => p.ativo).map((p) => p.nome).join(", ")}`);

  const web = await api("GET", `pesquisa/web?q=${encodeURIComponent("escritório de arquitetura Balneário Camboriú")}&n=8`);
  if (web.status === 200) { n++; assert.ok(web.dados.resultados.length > 0); ok(`pesquisa na web pelo servidor (${web.dados.provedor}${web.dados.cache ? ", cache" : ""}): ${web.dados.resultados.length} resultados`); }
  else console.log(`AVISO pesquisa na web pelo servidor: ${web.status} ${JSON.stringify(web.dados).slice(0, 300)}`);

  if (web.status === 200) {
    const c = await api("POST", "pesquisa/contatos", { busca: "escritório de arquitetura em Balneário Camboriú", quantidade: 3 });
    if (c.status === 200) { n++; ok(`contatos de empresas: ${c.dados.encontrados.length} com e-mail (${c.dados.encontrados.map((e) => e.nome).join("; ")}), ${c.dados.sem_email.length} sem e-mail, ${c.dados.nao_lidos.length} não lidos`); }
    else console.log(`AVISO contatos: ${c.status} ${JSON.stringify(c.dados).slice(0, 300)}`);
    // endereco interno: o VEOS recusa (400); o firewall do Supabase as vezes barra antes (403). Os dois sao recusa.
    for (const u of ["http://169.254.169.254/latest/meta-data", "http://127.0.0.1:8080/", "http://intranet.local/"]) {
      const pg = await api("GET", `pesquisa/pagina?url=${encodeURIComponent(u)}`);
      assert.ok([400, 403].includes(pg.status), `${u}: ${pg.status}`); n++;
    }
    ok("leitura de endereço interno recusada");
    const site = await api("GET", `pesquisa/pagina?url=${encodeURIComponent("https://arqinove.com.br/contato/")}`);
    if (site.status === 200) { n++; ok(`página lida: ${site.dados.titulo} · e-mails ${site.dados.contatos.emails.join(", ") || "—"}${site.dados.nota ? " (pela Parallel)" : ""}`); }
    else console.log(`AVISO página: ${site.status} ${JSON.stringify(site.dados).slice(0, 200)}`);
  }

  const em = exige(await api("GET", "email/situacao"), "situacao do e-mail");
  ok(`Gmail: ${em.conectado ? `conectado (${em.conta})` : "não conectado"}; limite ${em.limite_dia}/dia, prospecção ${em.limite_prospeccao}`);

  // e-mail de prospeccao preparado: cadastra o parceiro prospectado e troca o modelo da cadencia pelo e-mail personalizado
  const prep = exige(await api("POST", "mensagens", { canal: "email", destinatario: destino, assunto: "Café técnico VOICE", corpo: "Olá, {{primeiro_nome}}! Vi o trabalho do {{empresa}}.\n\nFernando — VOICE", tipo: "prospeccao", setor_id: "vendas", origem: "mcp:teste", alvo: { nome: "Studio TESTE IA", site: "https://exemplo.invalid", tipo_parceiro: "arquiteto" } }), "preparar e-mail");
  assert.ok(prep.id && prep.parceiro?.id); assert.match(prep.corpo, /Vi o trabalho do Studio TESTE IA/); assert.doesNotMatch(prep.corpo, /\{\{/);
  ok(`rascunho ${prep.id.slice(0, 8)} + parceiro prospectado ${prep.parceiro.id.slice(0, 8)} (${prep.parceiro.novo ? "novo" : "já existia"}); modelo preenchido`);
  const de2 = exige(await api("POST", "mensagens", { canal: "email", destinatario: destino, assunto: "Café técnico VOICE (v2)", corpo: "Texto novo", tipo: "prospeccao", setor_id: "vendas", origem: "mcp:teste" }), "preparar de novo");
  assert.equal(de2.id, prep.id); assert.equal(de2.atualizado, true); ok("preparar de novo para o mesmo destinatário atualiza o rascunho (não duplica)");
  const regs = exige(await api("GET", `setor/vendas?tipo=parceiro&busca=${encodeURIComponent("Studio TESTE IA")}&limite=5`), "registros filtrados");
  assert.ok(regs.registros.some((r) => r.id === prep.parceiro.id)); ok("registros do setor com filtro (tipo + busca + limite)");

  // envio: robo so simula; registra enviada; nao repete apresentacao em 30 dias
  const env = exige(await api("POST", `mensagens/${prep.id}/enviar`, { confirmacao: "tela" }), "enviar (simulado)");
  assert.equal(env.via, "simulado"); ok("envio do robô simulado (nada saiu) e registrado como enviada");
  const de3 = exige(await api("POST", "mensagens", { canal: "email", destinatario: destino, assunto: "Outra", corpo: "Outra apresentação", tipo: "prospeccao", setor_id: "vendas" }), "terceiro rascunho");
  const rep = await api("POST", `mensagens/${de3.id}/enviar`, {});
  assert.equal(rep.status, 409); assert.match(rep.dados.erro, /já recebeu uma apresentação/); n++; ok("segunda apresentação ao mesmo endereço em 30 dias recusada (409)");
  exige(await api("POST", `mensagens/${de3.id}/descartada`, { motivo: "teste" }), "descartar");

  // lista de bloqueio: quem pediu para sair nao recebe nada
  exige(await api("POST", "comercial/bloqueio", { contato: destino, motivo: "teste automático" }), "bloquear");
  const bloq = await api("POST", "mensagens", { canal: "email", destinatario: destino, assunto: "x", corpo: "y" });
  assert.equal(bloq.status, 409); n++; ok("contato bloqueado: nada é preparado (409)");

  // Gmail desligado para real: caixa de entrada responde que nao esta conectado (robo sem ponte)
  if (!em.conectado) { const cx = await api("GET", "email/caixa"); assert.equal(cx.status, 409); n++; ok("caixa do Gmail sem ponte: 409 com orientação"); }
  console.log(`\n${n} verificações OK`);
} finally {
  await membro("direcao", false);
}
