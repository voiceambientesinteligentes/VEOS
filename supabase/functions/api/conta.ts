// CONTA na funcao "api": acesso do Claude Code (MCP do VEOS) para o proprio usuario.
//   POST /conta/mcp   cria uma sessao SEPARADA (nao derruba a do navegador) e devolve o refresh
//                      token uma unica vez, para o servidor MCP local guardar fora do repositorio.
// A sessao tem o mesmo membro e as mesmas permissoes: toda acao passa pela API e pelas regras do banco.
// Quem exige MFA nao usa o MCP (a sessao nasce sem codigo e a API recusa).
import { HttpError, type Membro, SERVICE, servico, URL_BASE, ANON } from "../_shared/banco.ts";

export async function rotearConta(req: Request, partes: string[], eu: Membro & { exige_mfa?: boolean }) {
  const [, a] = partes;
  if (req.method === "POST" && a === "mcp") {
    if (eu.exige_mfa) throw new HttpError(403, "seu acesso exige MFA: o MCP do Claude Code não está disponível para este perfil");
    const link = await fetch(`${URL_BASE}/auth/v1/admin/generate_link`, {
      method: "POST", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", email: eu.email }),
    }).then((r) => r.json());
    const hash = link?.hashed_token ?? link?.properties?.hashed_token;
    if (!hash) { console.error("generate_link", JSON.stringify(link).slice(0, 200)); throw new HttpError(502, "falha ao criar o acesso"); }
    const s = await fetch(`${URL_BASE}/auth/v1/verify`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash: hash }) }).then((r) => r.json());
    if (!s?.refresh_token) { console.error("verify", JSON.stringify(s).slice(0, 200)); throw new HttpError(502, "falha ao criar o acesso"); }
    await servico("/rest/v1/membros_historico", { method: "POST", body: JSON.stringify({ user_id: eu.user_id, acao: "mcp_acesso", por: eu.user_id, motivo: "acesso do Claude Code (MCP) criado pelo próprio usuário" }) });
    return { refresh_token: s.refresh_token, email: eu.email, aviso: "Guarde só no seu computador (o MCP grava em ~/.veos). Quem tiver este código age como você no VEOS. Para revogar: Sair de todas as sessões em Minha conta." };
  }
  if (req.method === "POST" && a === "sair-de-tudo") {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const r = await fetch(`${URL_BASE}/auth/v1/logout?scope=global`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!r.ok && r.status !== 204) throw new HttpError(502, "falha ao encerrar as sessões");
    return { ok: true };
  }
  throw new HttpError(404, "rota inexistente");
}
