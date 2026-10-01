// Teste de navegador contra o SITE PUBLICADO (GitHub Pages) e a API real: um usuario TESTE da
// direcao (senha aleatoria renovada a cada execucao, nunca impressa) entra com sessao injetada
// e percorre as telas principais no computador e no celular (390 px). Confere: tela abre sem
// erro, sem erro de JavaScript, sem texto "undefined"/"NaN" e sem rolagem lateral no celular.
// O usuario TESTE fica INATIVO no fim. So leitura: nenhuma tela e preenchida.
// Uso: node scripts/online.mjs tests/online/navegador.mjs   (VEOS_SITE para outro endereco)
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !ANON || !SERVICE) throw new Error("defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY");
const SITE = process.env.VEOS_SITE ?? "https://voiceambientesinteligentes.github.io/VEOS/";
const EMAIL = "teste-navegador@veos-teste.invalid";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const TELAS = [
  "#/visao", "#/orbita", "#/radar", "#/conselho", "#/integracoes", "#/biblioteca/governanca", "#/biblioteca/decisoes", "#/biblioteca/revisoes",
  "#/pedidos", "#/estoque", "#/recebimentos", "#/compras", "#/compras/nova", "#/contas-pagar", "#/zoho/books", "#/zoho/crm", "#/setor/financas", "#/setor/vendas",
  "#/negociacao", "#/calculadora", "#/projetos", "#/sistema/saude", "#/sistema/usuarios", "#/sistema/exportar", "#/sistema/validacao", "#/conta",
];
const CELULAR = ["#/visao", "#/orbita", "#/radar", "#/pedidos", "#/compras", "#/contas-pagar", "#/recebimentos", "#/biblioteca/revisoes", "#/negociacao", "#/sistema/saude", "#/sistema/usuarios", "#/conta"];
const membro = (user_id, ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id, nome: "Usuario TESTE navegador", papel: "direcao", ativo }) });

// usuario TESTE e sessao
const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else assert.equal((await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha, ban_duration: "none" }) })).status, 200);
assert.ok((await membro(user.id, true)).ok, "membro TESTE");
const tok = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json();
assert.ok(tok.access_token, "login TESTE");
const sessao = JSON.stringify({ access_token: tok.access_token, refresh_token: tok.refresh_token, expira_em: Date.now() + tok.expires_in * 1000, email: EMAIL });

const navegador = await chromium.launch(process.env.CI ? {} : { channel: "msedge" });
const falhas = [], oks = [];
async function percorrer(nome, viewport, telas) {
  const ctx = await navegador.newContext({ viewport, locale: "pt-BR" });
  await ctx.addInitScript((s) => localStorage.setItem("veos.sessao", s), sessao);
  const pg = await ctx.newPage();
  const errosJs = [];
  pg.on("pageerror", (e) => errosJs.push(e.message));
  pg.on("console", (m) => m.type() === "error" && !/Content Security Policy|favicon/.test(m.text()) && errosJs.push(m.text()));
  await pg.goto(`${SITE}#/orbita`, { waitUntil: "networkidle" });
  for (const t of telas) {
    errosJs.length = 0;
    await pg.goto(`${SITE}${t}`, { waitUntil: "networkidle" });
    await pg.waitForFunction(() => document.querySelector("#view")?.children.length > 0, null, { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => ({
      texto: document.getElementById("view")?.innerText ?? "",
      titulo: document.getElementById("view-title")?.textContent ?? "",
      lateral: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    const prob = [];
    if (/Não foi possível abrir esta tela|Entrar|Enviar link de acesso/.test(r.titulo + r.texto.slice(0, 200))) prob.push(`não abriu (${r.titulo}: ${r.texto.slice(0, 120).replace(/\s+/g, " ")})`);
    if (/\b(undefined|NaN)\b/.test(r.texto)) prob.push("texto undefined/NaN");
    if (t !== "#/orbita" && r.titulo === "Órbita") prob.push("rota caiu na Órbita (tela não publicada?)");
    if (r.lateral) prob.push("rolagem lateral");
    if (errosJs.length) prob.push(`erro JS: ${errosJs.join(" | ").slice(0, 300)}`);
    (prob.length ? falhas : oks).push(`${nome} ${t}${prob.length ? ` -> ${prob.join("; ")}` : ""}`);
  }
  await ctx.close();
}
try {
  await percorrer("computador", { width: 1366, height: 900 }, TELAS);
  await percorrer("celular", { width: 390, height: 844 }, CELULAR);
} finally {
  await navegador.close();
  await membro(user.id, false); // TESTE fica inativo
}
for (const o of oks) console.log(`ok    ${o}`);
for (const f of falhas) console.log(`FALHA ${f}`);
console.log(`\n${oks.length}/${oks.length + falhas.length} telas OK no site publicado (${SITE})`);
process.exit(falhas.length ? 1 : 0);
