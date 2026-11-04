// Fotos das telas para revisao visual: site LOCAL (dist/, porta 8878, aceito pela API) ou publicado
// (VEOS_SITE), com robo TESTE da direcao (sessao injetada; fica INATIVO no fim). Salva PNG em VEOS_FOTOS.
// Uso: node scripts/online.mjs tests/online/fotos.mjs "#/hoje" "#/operar" ...   (precisa do playwright)
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";

const URL_BASE = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASTA = process.env.VEOS_FOTOS ?? "fotos";
const local = !process.env.VEOS_SITE;
const SITE = process.env.VEOS_SITE ?? "http://127.0.0.1:8878/";
const telas = process.argv.slice(2).length ? process.argv.slice(2) : ["#/hoje"];
const EMAIL = "teste-fotos@veos-teste.invalid";
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
try {
  for (const [nome, viewport] of [["pc", { width: 1440, height: 900 }], ["cel", { width: 390, height: 844 }]]) {
    const ctx = await nav.newContext({ viewport, locale: "pt-BR", deviceScaleFactor: 1 });
    await ctx.addInitScript((s) => localStorage.setItem("veos.sessao", s), sessao);
    const pg = await ctx.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(e.message));
    for (const t of telas) {
      await pg.goto(`${SITE}${t}`, { waitUntil: "networkidle" });
      await pg.waitForFunction(() => !document.querySelector("#view .carregando-tela") && !document.querySelector("#view .muted")?.textContent?.match(/Carregando|Conferindo|Buscando/), null, { timeout: 45000 }).catch(() => {});
      await pg.waitForTimeout(800);
      const arq = `${PASTA}/${nome}-${t.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "raiz"}.png`;
      await pg.screenshot({ path: arq, fullPage: process.env.VEOS_FOTO_INTEIRA === "1" });
      console.log(`${arq}${erros.length ? ` · erros: ${erros.join(" | ")}` : ""}`);
      erros.length = 0;
    }
    await ctx.close();
  }
} finally { await nav.close(); await membro(false); srv?.kill(); }
