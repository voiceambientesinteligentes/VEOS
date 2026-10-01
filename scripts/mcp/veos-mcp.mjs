#!/usr/bin/env node
// MCP do VEOS para o Claude Code (stdio, sem dependencias). Usa a sessao do PROPRIO usuario,
// criada em Minha conta -> "Acesso do Claude Code", guardada em ~/.veos/mcp-sessao.json (fora
// do repositorio). Configurar uma vez:  node scripts/mcp/veos-mcp.mjs --configurar <codigo>
// Toda chamada passa pela API do site: mesmas permissoes e regras do banco.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { responder } from "./ferramentas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const config = readFileSync(join(AQUI, "../../apps/web/js/config.js"), "utf8");
const URL_BASE = /https:\/\/[a-z0-9]+\.supabase\.co/.exec(config)[0];
const ANON = /SUPABASE_ANON_KEY = "([^"]+)"/.exec(config)[1];
const ARQ = process.env.VEOS_MCP_SESSAO ?? join(homedir(), ".veos", "mcp-sessao.json");

function salvar(refresh) {
  mkdirSync(dirname(ARQ), { recursive: true });
  writeFileSync(ARQ, JSON.stringify({ refresh_token: refresh, atualizado_em: new Date().toISOString() }), { mode: 0o600 });
}

if (process.argv[2] === "--configurar") {
  const codigo = (process.argv[3] ?? "").trim();
  if (!codigo) { console.error("uso: node scripts/mcp/veos-mcp.mjs --configurar <codigo de Minha conta>"); process.exit(1); }
  salvar(codigo);
  console.error(`Acesso guardado em ${ARQ}. O Claude Code já pode usar o MCP do VEOS.`);
  process.exit(0);
}

let acesso = null, expira = 0;
async function token() {
  if (acesso && Date.now() < expira - 60_000) return acesso;
  let refresh;
  try { refresh = JSON.parse(readFileSync(ARQ, "utf8")).refresh_token; } catch { throw new Error("MCP sem acesso: crie em Minha conta → Acesso do Claude Code e rode --configurar"); }
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refresh }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("acesso do MCP expirou ou foi revogado: crie outro em Minha conta");
  salvar(d.refresh_token); // o refresh token gira a cada uso
  acesso = d.access_token;
  expira = Date.now() + Number(d.expires_in ?? 3600) * 1000;
  return acesso;
}

async function chamar(metodo, rota, corpo) {
  const t = await token();
  const r = await fetch(`${URL_BASE}/functions/v1/api/${rota}`, {
    method: metodo,
    headers: { apikey: ANON, Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(metodo === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro ?? `HTTP ${r.status}`);
  return d;
}

const rl = createInterface({ input: process.stdin });
rl.on("line", async (linha) => {
  if (!linha.trim()) return;
  let msg;
  try { msg = JSON.parse(linha); } catch { return process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } })}\n`); }
  const resposta = await responder(msg, chamar);
  if (resposta) process.stdout.write(`${JSON.stringify(resposta)}\n`);
});
