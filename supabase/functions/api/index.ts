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
//   /api/radar, /setor, /registros, /tarefas, /alertas -> setores vivos (ver setores.ts)
// Escritas exigem header Idempotency-Key (repetir nao duplica).
// Identidade: token do Supabase Auth validado no servidor + cadastro ativo em `membros`.
// Nunca confia em papel/setor enviado pelo cliente.
import { avaliarOrcamento, RegraError } from "../_shared/regras/vigia.ts";
import { ANON, HttpError, lerCorpo, type Membro, SERVICE, servico, URL_BASE } from "../_shared/banco.ts";
import { rotearFinanceiro } from "./financeiro.ts";
import { rotearSetores } from "./setores.ts";
import { rotearZoho } from "./zoho.ts";
import { rotearFluxo } from "./fluxo.ts";
import { rotearBiblioteca } from "./biblioteca.ts";
import { rotearSistema } from "./sistema.ts";
import { rotearNotificacoes } from "./notificacoes.ts";

const ORIGENS = [
  /^https:\/\/voiceambientesinteligentes\.github\.io$/,
  /^https:\/\/veos-voice\.netlify\.app$/,
  /^https:\/\/[a-z0-9-]+--veos-voice\.netlify\.app$/,
  /^http:\/\/127\.0\.0\.1:8878$/,
];
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;

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
  const rows = await servico(`/rest/v1/membros?user_id=eq.${encodeURIComponent(user.id)}&ativo=is.true&select=user_id,nome,papel,exige_mfa`);
  if (!rows?.length) throw new HttpError(403, "usuario sem acesso ao VEOS");
  // MFA exigido pela direcao: a sessao precisa ter passado pelo codigo (aal2). O token ja foi
  // validado pelo Auth acima; aqui so se le a claim.
  const { exige_mfa, ...m } = rows[0];
  const aal = lerClaims(token).aal ?? "aal1";
  if (exige_mfa && aal !== "aal2") throw new HttpError(403, "mfa_necessario");
  return { ...m, email: user.email as string, aal, exige_mfa };
}

async function rotear(req: Request, rota: string) {
  const eu = await membro(req);
  const partes = rota.split("/");
  if (partes[0] === "zoho") return await rotearZoho(req, partes, eu);
  if (partes[0] === "fluxo") return await rotearFluxo(req, partes, eu);
  if (partes[0] === "biblioteca") return await rotearBiblioteca(req, partes, eu);
  if (partes[0] === "sistema") return await rotearSistema(req, partes, eu);
  if (partes[0] === "mensagens" || partes[0] === "resumo") return await rotearNotificacoes(req, partes, eu);
  if (partes[0] === "projetos") return await rotearFinanceiro(req, partes, eu);
  if (["radar", "setor", "registros", "tarefas", "alertas"].includes(partes[0])) return await rotearSetores(req, partes, eu);
  if (req.method === "GET" && rota === "me") return eu;
  if (req.method === "GET" && rota === "painel") {
    if (!["direcao", "financas"].includes(eu.papel)) throw new HttpError(403, "somente direção e finanças");
    return await servico("/rest/v1/rpc/painel_executivo", { method: "POST", body: JSON.stringify({ p_meses: 12 }) });
  }
  if (req.method === "GET" && rota === "setores") {
    const [setores, diretores] = await Promise.all([
      servico("/rest/v1/setores?select=id,sigla,nome,descricao&ativo=is.true&order=sigla"),
      servico("/rest/v1/diretores?select=id,setor_id,sigla,nome&ativo=is.true&order=sigla"),
    ]);
    return { setores, diretores };
  }
  if (req.method === "GET" && rota === "orcamentos") {
    return {
      orcamentos: await servico(
        "/rest/v1/orcamentos?select=id,codigo,ambiente,vendedor,cliente,valor_total_informado,criado_em," +
          "avisos(severidade,codigo,titulo,situacao)&order=criado_em.desc&limit=20",
      ),
    };
  }
  if (req.method === "POST" && rota === "orcamentos") {
    const chave = req.headers.get("Idempotency-Key") ?? "";
    if (!CHAVE_RE.test(chave)) throw new HttpError(400, "Idempotency-Key obrigatorio (16-64 caracteres)");
    const entrada = (await lerCorpo(req))?.entrada;
    const resultado = avaliarOrcamento(entrada); // RegraError -> 400
    const reg = await servico("/rest/v1/rpc/registrar_orcamento", {
      method: "POST",
      body: JSON.stringify({ p: { chave: `${eu.user_id}:${chave}`, usuario_id: eu.user_id, orcamento: entrada, resultado } }),
    });
    const nota = reg.repetido
      ? "Envio repetido: este orçamento TESTE já estava registrado com estes avisos. Nada foi duplicado ou aprovado."
      : "Orçamento TESTE registrado com os avisos do CFO (histórico não pode ser alterado). Nada foi aprovado.";
    return { ...resultado, ...reg, nota };
  }
  throw new HttpError(404, "rota inexistente");
}

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
