// MCP REMOTO na funcao "api" (so a direcao): cria/revoga o link e mostra o uso.
//   GET  /mcp-remoto           links ativos (sem a URL: ela aparece uma unica vez) + ultimas chamadas
//   POST /mcp-remoto/link      {escopo: consulta|completo, rotulo?, dias?} cria um link novo (os anteriores continuam)
//   POST /mcp-remoto/revogar   {id?} revoga um link (sem id: todos os seus)
// O servidor MCP em si e a funcao "mcp" (supabase/functions/mcp).
import { HttpError, lerCorpo, type Membro, servico, URL_BASE } from "../_shared/banco.ts";

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const base64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function rotearMcpRemoto(req: Request, partes: string[], eu: Membro) {
  if (eu.papel !== "direcao") throw new HttpError(403, "somente a direção usa o MCP remoto");
  const [, a] = partes;
  if (req.method === "GET" && !a) {
    const agora = encodeURIComponent(new Date().toISOString());
    const links = await servico(`/rest/v1/mcp_links?revogado_em=is.null&expira_em=gt.${agora}&criado_por=eq.${eu.user_id}&select=id,rotulo,escopo,criado_em,expira_em,ultimo_uso,usos&order=criado_em.desc&limit=20`);
    const ids = links.map((l: { id: string }) => l.id);
    const chamadas = ids.length ? await servico(`/rest/v1/mcp_chamadas?link_id=in.(${ids.join(",")})&select=em,link_id,ferramenta,rota,ok,detalhe&order=em.desc&limit=30`) : [];
    return { links, chamadas };
  }
  if (req.method === "POST" && a === "link") {
    const c = (await lerCorpo(req)) ?? {};
    const escopo = c.escopo === "consulta" ? "consulta" : c.escopo === "completo" ? "completo" : null;
    if (!escopo) throw new HttpError(400, "escolha o escopo: consulta ou completo");
    const dias = Math.min(Math.max(Number(c.dias) || 30, 1), 90);
    const rotulo = typeof c.rotulo === "string" ? c.rotulo.trim().slice(0, 60) : "";
    const segredo = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const expira = new Date(Date.now() + dias * 86_400_000).toISOString();
    await servico("/rest/v1/mcp_links", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ token_hash: await sha256(segredo), rotulo, escopo, criado_por: eu.user_id, expira_em: expira }) });
    await servico("/rest/v1/membros_historico", { method: "POST", body: JSON.stringify({ user_id: eu.user_id, acao: "mcp_remoto_link", por: eu.user_id, motivo: `link do MCP remoto criado (escopo ${escopo}, ${dias} dias)` }) }).catch(() => {});
    return {
      url: `${URL_BASE}/functions/v1/mcp/${segredo}`,
      escopo,
      expira_em: expira,
      aviso: "Este link aparece uma única vez. Quem tiver o link age como você no VEOS dentro do escopo escolhido. Guarde como uma senha e revogue aqui se vazar.",
    };
  }
  if (req.method === "POST" && a === "revogar") {
    const c = (await lerCorpo(req)) ?? {};
    const filtro = c.id ? (UUID_RE.test(String(c.id)) ? `&id=eq.${c.id}` : null) : "";
    if (filtro === null) throw new HttpError(400, "id inválido");
    await servico(`/rest/v1/mcp_links?revogado_em=is.null&criado_por=eq.${eu.user_id}${filtro}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ revogado_em: new Date().toISOString() }) });
    await servico("/rest/v1/membros_historico", { method: "POST", body: JSON.stringify({ user_id: eu.user_id, acao: "mcp_remoto_revogado", por: eu.user_id, motivo: "link do MCP remoto revogado" }) }).catch(() => {});
    return { ok: true };
  }
  throw new HttpError(404, "rota inexistente");
}
