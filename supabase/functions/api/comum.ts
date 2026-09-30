// Utilitarios da funcao "api": erro HTTP, acesso ao banco com service role, corpo JSON.
export const URL_BASE = Deno.env.get("SUPABASE_URL") ?? "";
export const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
export const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_BODY = 64 * 1024;

export class HttpError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
  }
}

export type Membro = { user_id: string; nome: string; papel: string; email: string };

export async function servico(path: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const texto = await r.text();
  if (!r.ok) {
    console.error("banco", r.status, texto.slice(0, 500));
    // violacao de regra do banco (constraint/trigger/raise) -> 400 com mensagem util
    if (r.status === 400 || r.status === 409) {
      let msg = "registro recusado pelo banco";
      try {
        msg = JSON.parse(texto).message || msg;
      } catch { /* mantem generica */ }
      throw new HttpError(400, msg);
    }
    throw new HttpError(502, "falha ao acessar o banco");
  }
  return texto ? JSON.parse(texto) : null;
}

export async function lerCorpo(req: Request) {
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) throw new HttpError(413, "corpo acima de 64 KB");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "JSON invalido");
  }
}
