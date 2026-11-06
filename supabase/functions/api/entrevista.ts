// ENTREVISTA GUIADA na funcao "api" (so a direcao): cria/revoga o link do MCP e baixa as respostas.
//   GET  /entrevista            estado do link (sem a URL: ela aparece uma unica vez) + andamento
//   POST /entrevista/link       cria um link novo (revoga os anteriores) e devolve a URL UMA vez
//   POST /entrevista/revogar    revoga os links ativos
//   GET  /entrevista/arquivo    Markdown + JSON com as respostas de agora (pode estar incompleto)
// O MCP em si e a funcao "entrevista" (supabase/functions/entrevista).
import { HttpError, type Membro, servico, URL_BASE } from "../_shared/banco.ts";
import { montarArquivo, progresso } from "../_shared/dominio/entrevista.js";

const VALIDADE_DIAS = 21;

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const base64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function rotearEntrevista(req: Request, partes: string[], eu: Membro) {
  if (eu.papel !== "direcao") throw new HttpError(403, "somente a direção usa a entrevista guiada");
  const [, a] = partes;
  const respostas = () => servico("/rest/v1/entrevista_respostas?select=pergunta_id,resposta,certeza,observacao&order=pergunta_id&limit=500");

  if (req.method === "GET" && !a) {
    const agora = encodeURIComponent(new Date().toISOString());
    const [ativos, rs] = await Promise.all([
      servico(`/rest/v1/entrevista_links?revogado_em=is.null&expira_em=gt.${agora}&select=id,criado_em,expira_em,ultimo_uso,usos&order=criado_em.desc&limit=1`),
      respostas(),
    ]);
    return { link: ativos[0] ?? null, progresso: progresso(rs) };
  }
  if (req.method === "POST" && a === "link") {
    const segredo = base64url(crypto.getRandomValues(new Uint8Array(32))); // 43 caracteres
    const expira = new Date(Date.now() + VALIDADE_DIAS * 86_400_000).toISOString();
    await servico(`/rest/v1/entrevista_links?revogado_em=is.null`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ revogado_em: new Date().toISOString() }) });
    await servico("/rest/v1/entrevista_links", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ token_hash: await sha256(segredo), criado_por: eu.user_id, expira_em: expira }) });
    return {
      url: `${URL_BASE}/functions/v1/entrevista/${segredo}`,
      expira_em: expira,
      aviso: "Este link aparece uma única vez. Quem tiver o link consegue gravar respostas da entrevista (e nada além disso). Ele vale por 21 dias e pode ser revogado aqui.",
    };
  }
  if (req.method === "POST" && a === "revogar") {
    await servico(`/rest/v1/entrevista_links?revogado_em=is.null`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ revogado_em: new Date().toISOString() }) });
    return { ok: true };
  }
  if (req.method === "GET" && a === "arquivo") {
    const arq = montarArquivo(await respostas());
    return { markdown: arq.markdown, json: arq.json, progresso: arq.progresso };
  }
  throw new HttpError(404, "rota inexistente");
}
