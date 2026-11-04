// USO REAL DA IA VEOS (site local ou publicado, robo TESTE da direcao): digita uma pergunta na tela
// IA VEOS, espera o diretor responder pelo motor de IA do servidor, continua a conversa pelo chat
// flutuante de outra tela e confere o pedido de tela. Fotos em VEOS_FOTOS. Robo fica INATIVO no fim.
// Uso: node scripts/online.mjs tests/online/uso_ia.mjs   (precisa do playwright)
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const local = !process.env.VEOS_SITE;
const SITE = process.env.VEOS_SITE ?? "http://127.0.0.1:8878/";
const PASTA = process.env.VEOS_FOTOS ?? "fotos";
const EMAIL = "teste-ia-uso@veos-teste.invalid";
const admin = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
mkdirSync(PASTA, { recursive: true });
let srv = null;
if (local) { execFileSync(process.execPath, ["scripts/build-web.mjs"], { stdio: "ignore" }); srv = spawn(process.execPath, ["scripts/serve-web.mjs"], { stdio: "ignore" }); await new Promise((r) => setTimeout(r, 900)); }
const senha = randomBytes(24).toString("base64url");
const lista = await (await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=1000`, { headers: admin })).json();
let user = lista.users.find((u) => u.email === EMAIL);
if (!user) user = await (await fetch(`${URL_BASE}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: EMAIL, password: senha, email_confirm: true }) })).json();
else await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers: admin, body: JSON.stringify({ password: senha, ban_duration: "none" }) });
const membro = (ativo) => fetch(`${URL_BASE}/rest/v1/membros`, { method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, nome: "Fernando TESTE", papel: "direcao", ativo }) });
await membro(true);
const tok = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: senha }) })).json();
const sessao = JSON.stringify({ access_token: tok.access_token, refresh_token: tok.refresh_token, expira_em: Date.now() + tok.expires_in * 1000, email: EMAIL });
const nav = await chromium.launch(process.env.CI ? {} : { channel: "msedge" });
const ok = (t) => console.log(`ok  ${t}`);
try {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR" });
  await ctx.addInitScript((s) => { localStorage.setItem("veos.sessao", s); localStorage.setItem("veos.assistente.voz", "false"); }, sessao);
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(e.message));
  await pg.goto(`${SITE}#/ia`, { waitUntil: "networkidle" });
  await pg.waitForSelector(".ia2-saudacao");
  await pg.screenshot({ path: `${PASTA}/ia-vazia.png` });
  ok("tela IA VEOS abre com a saudação");
  await pg.fill(".ia2 .as-campo", "[TESTE] Em até 5 linhas: qual o primeiro passo para captar escritórios de arquitetura? Use os dados do VEOS.");
  await pg.keyboard.press("Enter");
  await pg.waitForSelector(".as-pensando", { timeout: 10000 });
  ok("mensagem enviada: diretor analisando");
  await pg.waitForSelector(".ia2 .as-ia .as-texto", { timeout: 200000 });
  const resp = await pg.locator(".ia2 .as-ia .as-texto").last().innerText();
  assert.ok(resp.length > 40);
  await pg.screenshot({ path: `${PASTA}/ia-resposta.png`, fullPage: true });
  ok(`resposta do diretor na tela (${resp.length} caracteres): ${resp.slice(0, 120).replace(/\s+/g, " ")}…`);
  // continua pelo chat flutuante, de outra tela
  await pg.goto(`${SITE}#/hoje`, { waitUntil: "networkidle" });
  await pg.click(".as-flutuante");
  await pg.waitForSelector(".as-raiz.aberto .as-ia");
  ok("chat flutuante mostra a mesma conversa em outra tela");
  await pg.fill(".as-painel .as-campo", "abrir os orçamentos");
  await pg.keyboard.press("Enter");
  await pg.waitForURL(/#\/orcamentos$/, { timeout: 10000 });
  ok("pedido de tela pelo chat abre Orçamentos");
  await pg.click(".as-flutuante");
  await pg.waitForSelector(".as-raiz.aberto");
  await pg.screenshot({ path: `${PASTA}/chat-flutuante.png` });
  assert.deepEqual(erros, [], erros.join(" | "));
  ok("sem erro de JavaScript");
} finally { await nav.close(); await membro(false); srv?.kill(); }
