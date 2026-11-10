// Edge Function "api" - servidor do portal VEOS online.
//   GET  /api/me          -> membro autenticado
//   GET  /api/painel      -> painel executivo (direcao e financas)
//   GET  /api/setores     -> setores e diretores
//   GET  /api/orcamentos  -> ultimos orcamentos com avisos
//   POST /api/orcamentos  -> vigia avalia e grava orcamento + avisos + evento
//   /api/projetos...      -> setor Financeiro (ver financeiro.ts; direcao e financas)
//   /api/zoho/...        -> Zoho: espelho, edicao nos dois sentidos (ver zoho.ts)
//   /api/fluxo/...       -> pedidos, estoque, parcelas, NF (ver fluxo.ts)
//   /api/biblioteca/...  -> memoria institucional e governanca (ver biblioteca.ts)
//   /api/mensagens, /api/resumo -> caixa de saida e resumo do dia (ver notificacoes.ts)
//   /api/sistema/...     -> saude do sistema, usuarios e exportacao (ver sistema.ts)
//   /api/cfo/...         -> formulario do CFO, diagnostico de orcamentos e preco de produtos (ver cfo.ts)
//   /api/plano/...       -> Plano da VOICE: metas, acoes e rotinas (ver plano.ts)
//   /api/caixa/...       -> caixa real: extrato, conciliacao, recorrentes, 13 semanas, DRE e indicadores (ver caixa.ts)
//   /api/radar, /setor, /registros, /tarefas, /alertas -> setores vivos (ver setores.ts)
// Escritas exigem header Idempotency-Key (repetir nao duplica).
// Identidade: token do Supabase Auth validado no servidor + cadastro ativo em `membros`.
// Nunca confia em papel/setor enviado pelo cliente.
import { RegraError } from "../_shared/regras/vigia.ts";
import { ANON, HttpError, type Membro, SERVICE, servico, URL_BASE } from "../_shared/banco.ts";
import { rotearComMembro } from "./roteador.ts";

const ORIGENS = [
  /^https:\/\/voiceambientesinteligentes\.github\.io$/,
  /^https:\/\/veos-voice\.netlify\.app$/,
  /^https:\/\/[a-z0-9-]+--veos-voice\.netlify\.app$/,
  /^http:\/\/127\.0\.0\.1:8878$/,
];

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("Origin") ?? "";
  if (!ORIGENS.some((re) => re.test(o))) return {};
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

function lerClaims(token: string): Record<string, string> {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

async function membro(req: Request): Promise<Membro> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "login necessario");
  const r = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new HttpError(401, "sessao invalida ou expirada");
  const user = await r.json();
  if (!user?.id) throw new HttpError(401, "sessao invalida");
  const rows = await servico(`/rest/v1/membros?user_id=eq.${encodeURIComponent(user.id)}&ativo=is.true&select=user_id,nome,papel,cargo,exige_mfa`);
  if (!rows?.length) throw new HttpError(403, "usuario sem acesso ao VEOS");
  // MFA exigido pela direcao: a sessao precisa ter passado pelo codigo (aal2). O token ja foi
  // validado pelo Auth acima; aqui so se le a claim.
  const { exige_mfa, ...m } = rows[0];
  const aal = lerClaims(token).aal ?? "aal1";
  if (exige_mfa && aal !== "aal2") throw new HttpError(403, "mfa_necessario");
  return { ...m, email: user.email as string, aal, exige_mfa };
}

const rotear = async (req: Request, rota: string) => rotearComMembro(req, rota, await membro(req));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (!URL_BASE || !ANON || !SERVICE) return json(req, 500, { erro: "configuracao do servidor incompleta" });
  const rota = new URL(req.url).pathname.replace(/^.*\/api\/?/, "").replace(/\/$/, "");
  try {
    return json(req, 200, await rotear(req, rota));
  } catch (e) {
    if (e instanceof HttpError) return json(req, e.status, { erro: e.message });
    if (e instanceof RegraError) return json(req, 400, { erro: e.message });
    console.error(e);
    return json(req, 500, { erro: "falha interna" });
  }
});
