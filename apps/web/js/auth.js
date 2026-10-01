// Login do VEOS online via Supabase Auth, sem bibliotecas: link magico por e-mail
// (so para usuarios ja cadastrados - cadastro publico desligado), sessao no
// localStorage e renovacao automatica do token.
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

const CHAVE = "veos.sessao";
let sessao = null;

function ler() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || "null");
  } catch {
    return null;
  }
}

function guardar(s) {
  sessao = s;
  try {
    if (s) localStorage.setItem(CHAVE, JSON.stringify(s));
    else localStorage.removeItem(CHAVE);
  } catch {
    /* navegacao privada: a sessao vale so enquanto a aba estiver aberta */
  }
}

async function auth(path, body) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.msg || dados.error_description || `falha no login (${r.status})`);
  return dados;
}

const deTokens = (t) => ({
  access_token: t.access_token,
  refresh_token: t.refresh_token,
  expira_em: Date.now() + Number(t.expires_in || 3600) * 1000,
  email: t.user?.email ?? null,
});

/** Retorno do link magico: #access_token=...&refresh_token=...&expires_in=... */
export function capturarRetornoDoLink() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (h.get("error_description")) {
    history.replaceState(null, "", location.pathname);
    return h.get("error_description");
  }
  if (!h.get("access_token") || !h.get("refresh_token")) return null;
  guardar(deTokens({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_in: h.get("expires_in") }));
  history.replaceState(null, "", `${location.pathname}#/orbita`);
  return null;
}

export async function enviarLink(email) {
  await auth("otp", { email, create_user: false, redirect_to: `${location.origin}${location.pathname}` });
}

export async function token() {
  sessao = sessao || ler();
  if (!sessao) return null;
  if (Date.now() > sessao.expira_em - 60_000) {
    try {
      guardar({ ...deTokens(await auth("token?grant_type=refresh_token", { refresh_token: sessao.refresh_token })), email: sessao.email });
    } catch {
      guardar(null);
      return null;
    }
  }
  return sessao.access_token;
}

export async function sair() {
  const t = sessao?.access_token;
  guardar(null);
  if (t) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${t}` } }).catch(() => {});
  }
}

// ---------------------------------------------------------------- MFA (TOTP, app autenticador)
async function authUsuario(method, path, body) {
  const t = await token();
  if (!t) throw new Error("sessão expirada");
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.msg || dados.message || dados.error_description || `falha (${r.status})`);
  return dados;
}

/** Fatores TOTP da conta (verificados e pendentes). */
export async function fatoresMfa() {
  const u = await authUsuario("GET", "user");
  return (u.factors ?? []).filter((f) => f.factor_type === "totp");
}

/** Inicia o cadastro: devolve { id, totp: { qr_code, secret, uri } }. Pendentes antigos sao descartados. */
export async function cadastrarMfa() {
  for (const f of await fatoresMfa()) if (f.status !== "verified") await authUsuario("DELETE", `factors/${f.id}`).catch(() => {});
  return await authUsuario("POST", "factors", { factor_type: "totp", friendly_name: `VEOS ${new Date().toISOString().slice(0, 10)}` });
}

/** Confere o codigo de 6 digitos; a sessao passa a ser aal2 (tokens novos). */
export async function verificarMfa(fatorId, codigo) {
  const desafio = await authUsuario("POST", `factors/${fatorId}/challenge`, {});
  const t = await authUsuario("POST", `factors/${fatorId}/verify`, { challenge_id: desafio.id, code: String(codigo).replace(/\D/g, "") });
  guardar({ ...deTokens(t), email: t.user?.email ?? sessao?.email ?? null });
}

export async function removerMfa(fatorId) {
  await authUsuario("DELETE", `factors/${fatorId}`);
}
