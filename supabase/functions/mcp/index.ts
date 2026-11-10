// Edge Function "mcp": MCP REMOTO DEFINITIVO do VEOS (Streamable HTTP, JSON-RPC por POST) para o ChatGPT ou o Claude.
// URL: https://<projeto>.supabase.co/functions/v1/mcp/<segredo>  (criada em Integracoes; o segredo aparece uma unica vez,
// so o hash fica no banco, expira e e revogavel). O link age COMO o dono que o criou: cada ferramenta chama as MESMAS
// rotas da API do site (mesmas permissoes e regras do banco). Escopo "consulta" = so leitura; "completo" = leitura +
// cadastros e rascunhos. Pagar, enviar, aceitar orcamento e gerar pedido nunca sao feitos por aqui. Toda chamada fica em
// mcp_chamadas. Sem JWT do Supabase (o ChatGPT/Claude nao enviam): a autenticacao e o segredo da URL (--no-verify-jwt).
import { HttpError, type Membro, servico } from "../_shared/banco.ts";
import { rotearComMembro } from "../api/roteador.ts";
import { RegraError } from "../_shared/regras/vigia.ts";
import { criarMcp, manualDiretorCom } from "../_shared/dominio/mcp.js";
import { CATALOGO } from "../_shared/setores/catalogo.ts";
import { MANUAIS } from "../_shared/ia/manuais.ts";

const MAX_CORPO = 100_000;
const LIMITE_POR_MINUTO = 120;
const chamadas = new Map<string, number[]>();

const CABECALHOS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id, mcp-protocol-version, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const resp = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { ...CABECALHOS, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

type Link = { id: string; escopo: "consulta" | "completo"; criado_por: string; usos: number };
async function linkValido(segredo: string): Promise<Link | null> {
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(segredo)) return null;
  const hash = await sha256(segredo);
  const [l] = await servico(`/rest/v1/mcp_links?token_hash=eq.${hash}&revogado_em=is.null&expira_em=gt.${encodeURIComponent(new Date().toISOString())}&select=id,escopo,criado_por,usos`);
  return l ?? null;
}

function limitar(id: string) {
  const agora = Date.now();
  const lista = (chamadas.get(id) ?? []).filter((t) => agora - t < 60_000);
  lista.push(agora);
  chamadas.set(id, lista);
  return lista.length <= LIMITE_POR_MINUTO;
}

// o dono do link, ativo, com o papel que tem hoje (se for rebaixado ou desativado, o link perde o poder junto)
async function donoDoLink(userId: string): Promise<Membro> {
  const [m] = await servico(`/rest/v1/membros?user_id=eq.${encodeURIComponent(userId)}&ativo=is.true&select=user_id,nome,papel,cargo`);
  if (!m) throw new HttpError(403, "o dono deste link não tem mais acesso ao VEOS");
  if (m.papel !== "direcao") throw new HttpError(403, "o MCP remoto só funciona para quem é da direção");
  return { ...m, email: "mcp-remoto" } as Membro;
}

const manualDiretor = (args: { setor: string; pedido?: string }) =>
  manualDiretorCom(args, (id: string) => CATALOGO.find((s: { id: string }) => s.id === id), (id: string) => MANUAIS[id] ?? null);

function chamarApi(dono: Membro, linkId: string, ferramenta: string, marca: { registrado: boolean }) {
  return async (metodo: string, rota: string, corpo?: unknown) => {
    marca.registrado = true;
    const url = `https://interno.invalid/functions/v1/api/${rota}`;
    const bruto = corpo === undefined ? undefined : JSON.stringify(corpo);
    const chave = (await sha256(`${linkId}|${metodo}|${rota}|${bruto ?? ""}|${Math.floor(Date.now() / 300_000)}`)).slice(0, 40); // mesma chamada em 5 min nao duplica
    const req = new Request(url, { method: metodo, headers: { "Content-Type": "application/json", "X-VEOS-Origem": "mcp", ...(metodo === "POST" ? { "Idempotency-Key": chave } : {}) }, body: bruto });
    let status = 200, detalhe: string | null = null;
    try {
      // o roteador recebe so o caminho (os filtros ?a=b chegam pela URL da requisicao)
      return await rotearComMembro(req, rota.split("?")[0].replace(/\/$/, ""), dono);
    } catch (e) {
      if (e instanceof HttpError) { status = e.status; detalhe = e.message; throw new Error(e.message); }
      if (e instanceof RegraError) { status = 400; detalhe = e.message; throw new Error(e.message); }
      console.error("mcp", ferramenta, e);
      status = 500; detalhe = "falha interna";
      throw new Error("falha interna do VEOS; tente de novo");
    } finally {
      servico("/rest/v1/mcp_chamadas", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ link_id: linkId, ferramenta, rota: rota.slice(0, 120), ok: status < 400, detalhe: detalhe?.slice(0, 300) ?? null }) }).catch(() => {});
    }
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CABECALHOS });
  const partes = new URL(req.url).pathname.split("/").filter(Boolean); // functions/v1/mcp/<segredo>
  const i = partes.indexOf("mcp");
  const segredo = i >= 0 ? (partes[i + 1] ?? "") : "";
  if (req.method !== "POST") return resp(405, { erro: "use POST (MCP Streamable HTTP)" });
  let link: Link | null;
  try {
    link = await linkValido(segredo);
  } catch (e) {
    console.error("mcp link", e);
    return resp(503, { erro: "indisponível" });
  }
  if (!link) return resp(401, { erro: "link inválido, expirado ou revogado" });
  if (!limitar(link.id)) return resp(429, { jsonrpc: "2.0", id: null, error: { code: -32000, message: "muitas chamadas: aguarde um minuto" } });
  const bruto = await req.text();
  if (bruto.length > MAX_CORPO) return resp(413, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "mensagem grande demais" } });
  let msg: unknown;
  try { msg = JSON.parse(bruto); } catch { return resp(400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }); }
  servico(`/rest/v1/mcp_links?id=eq.${link.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ultimo_uso: new Date().toISOString(), usos: (link.usos ?? 0) + 1 }) }).catch(() => {});

  let dono: Membro;
  try {
    dono = await donoDoLink(link.criado_por);
  } catch (e) {
    const m = e instanceof HttpError ? e.message : "indisponível";
    return resp(e instanceof HttpError ? 403 : 503, { jsonrpc: "2.0", id: null, error: { code: -32000, message: m } });
  }
  const { responder } = criarMcp({ manualDiretor, nome: "veos", escopo: link.escopo, catalogo: CATALOGO as unknown as unknown[] });
  const lote = Array.isArray(msg) ? msg : [msg];
  const respostas = [];
  for (const m of lote as { method?: string; params?: { name?: string } }[]) {
    // a ferramenta chamada entra no registro de auditoria
    const nomeFerramenta = m?.method === "tools/call" ? String(m.params?.name ?? "?") : "protocolo";
    const marca = { registrado: false };
    const r = await responder(m as never, chamarApi(dono, link.id, nomeFerramenta, marca)) as { result?: { isError?: boolean; content?: { text?: string }[] }; error?: { message?: string } } | null;
    // recusas que nem chegaram a API (ferramenta fora do escopo, rota fora da leitura, argumento faltando) tambem ficam registradas
    const recusa = r?.error?.message ?? (r?.result?.isError ? r.result.content?.[0]?.text : null);
    if (nomeFerramenta !== "protocolo" && !marca.registrado && recusa) {
      servico("/rest/v1/mcp_chamadas", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ link_id: link.id, ferramenta: nomeFerramenta.slice(0, 80), rota: null, ok: false, detalhe: String(recusa).slice(0, 300) }) }).catch(() => {});
    }
    if (r) respostas.push(r);
  }
  if (!respostas.length) return new Response(null, { status: 202, headers: CABECALHOS });
  return resp(200, Array.isArray(msg) ? respostas : respostas[0]);
});
