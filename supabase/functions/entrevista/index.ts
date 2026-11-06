// Edge Function "entrevista": MCP REMOTO (Streamable HTTP, JSON-RPC por POST) da ENTREVISTA GUIADA da empresa.
// O Fernando cola o link no ChatGPT (Configuracoes > Conectores). A URL e:
//   https://<projeto>.supabase.co/functions/v1/entrevista/<segredo>
// O segredo e aleatorio, so o hash fica no banco, expira e pode ser revogado em Integracoes.
// O link NAO da acesso a nenhum dado do VEOS: so as perguntas do roteiro e as respostas da propria entrevista.
// Sem JWT do Supabase (o ChatGPT nao envia): a autenticacao e o segredo da URL (deploy com --no-verify-jwt).
import { HttpError, servico } from "../_shared/banco.ts";
import {
  CERTEZAS, montarArquivo, perguntaPorId, progresso, proximasPerguntas, REGRAS_ENTREVISTA, ROTEIRO, TODAS, validarResposta,
} from "../_shared/dominio/entrevista.js";

const VERSAO = "2025-03-26";
const MAX_CORPO = 20_000;
const LIMITE_POR_MINUTO = 90; // por link (instancia): protege o banco de um laco descontrolado
const chamadas = new Map<string, number[]>();

const CABECALHOS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id, mcp-protocol-version, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const resp = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { ...CABECALHOS, "Content-Type": "application/json" } });
const ok = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const erro = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });
const texto = (t: string, ehErro = false) => ({ content: [{ type: "text", text: t }], ...(ehErro ? { isError: true } : {}) });

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function linkValido(segredo: string) {
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(segredo)) return null;
  const hash = await sha256(segredo);
  const [l] = await servico(`/rest/v1/entrevista_links?token_hash=eq.${hash}&revogado_em=is.null&expira_em=gt.${encodeURIComponent(new Date().toISOString())}&select=id,usos`);
  return l ?? null;
}

function limitar(id: string) {
  const agora = Date.now();
  const lista = (chamadas.get(id) ?? []).filter((t) => agora - t < 60_000);
  lista.push(agora);
  chamadas.set(id, lista);
  return lista.length <= LIMITE_POR_MINUTO;
}

const respostasAtuais = () => servico("/rest/v1/entrevista_respostas?select=pergunta_id,resposta,certeza,observacao&order=pergunta_id&limit=500");

const FERRAMENTAS = [
  {
    name: "iniciar_entrevista",
    description: "COMECE AQUI. Devolve as regras da conversa, o andamento e as primeiras perguntas da entrevista guiada da VOICE. Se a entrevista já começou, continua de onde parou.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "proxima_pergunta",
    description: "Devolve as próximas perguntas ainda sem resposta (padrão 2, máximo 5), na ordem do roteiro. Opcionalmente de uma seção.",
    inputSchema: { type: "object", properties: { secao: { type: "string", enum: ROTEIRO.map((s: { id: string }) => s.id), description: "id da seção (opcional)" }, quantidade: { type: "integer", minimum: 1, maximum: 5 } }, additionalProperties: false },
  },
  {
    name: "registrar_resposta",
    description: "Grava a resposta do Fernando a UMA pergunta. Use o pergunta_id devolvido pelas outras ferramentas. certeza: confirmado (tem certeza), estimado (palpite/média) ou nao_sei (pular; a resposta pode ficar vazia). Nunca grave senha, chave ou cartão. Pode regravar para corrigir.",
    inputSchema: {
      type: "object",
      properties: {
        pergunta_id: { type: "string" },
        resposta: { type: "string", maxLength: 4000, description: "a resposta com as palavras do Fernando, resumida só se ele pedir" },
        certeza: { type: "string", enum: CERTEZAS },
        observacao: { type: "string", maxLength: 500, description: "ressalva ou contexto curto (opcional)" },
      },
      required: ["pergunta_id", "certeza"],
      additionalProperties: false,
    },
  },
  {
    name: "ver_progresso",
    description: "Mostra quantas perguntas foram respondidas, por seção, e quais perguntas obrigatórias faltam.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "finalizar_entrevista",
    description: "Encerra a entrevista e devolve o ARQUIVO FINAL (Markdown) com todas as respostas. Entregue o arquivo ao Fernando (crie um arquivo para baixar, chamado entrevista-voice-AAAA-MM-DD.md) para ele enviar ao Claude Code. Pode ser chamada com a entrevista incompleta; o que faltar fica marcado.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const PROMPTS = [{
  name: "entrevista-veos",
  description: "Inicia a entrevista guiada da VOICE no VEOS (uma pergunta por vez; no fim gera o arquivo de respostas).",
}];
const TEXTO_PROMPT = "Vamos fazer a entrevista guiada da VOICE no VEOS. Chame a ferramenta iniciar_entrevista e siga as regras que ela devolver: uma pergunta por vez, em português simples, gravando cada resposta com registrar_resposta e, no fim, entregue o arquivo gerado por finalizar_entrevista.";

async function chamarFerramenta(nome: string, args: Record<string, unknown>, linkId: string) {
  if (nome === "iniciar_entrevista") {
    const rs = await respostasAtuais();
    const p = progresso(rs);
    const proximas = proximasPerguntas(rs, { quantidade: 2 });
    return texto(JSON.stringify({
      regras: REGRAS_ENTREVISTA,
      andamento: `${p.respondidas} de ${p.total} perguntas (${p.porcentagem}%)`,
      retomando: p.respondidas > 0,
      secoes: ROTEIRO.map((s: { id: string; titulo: string; intro: string }) => ({ id: s.id, titulo: s.titulo, intro: s.intro })),
      proximas_perguntas: proximas,
      proximo_passo: "Cumprimente o Fernando em uma frase, explique que são cerca de " + TODAS.length + " perguntas, que ele pode dizer 'não sei' ou parar quando quiser, e faça a primeira pergunta.",
    }, null, 2));
  }
  if (nome === "proxima_pergunta") {
    const secao = typeof args.secao === "string" && ROTEIRO.some((s: { id: string }) => s.id === args.secao) ? args.secao : null;
    const rs = await respostasAtuais();
    const proximas = proximasPerguntas(rs, { secao, quantidade: Number(args.quantidade) || 2 });
    const p = progresso(rs);
    const intro = secao ? ROTEIRO.find((s: { id: string }) => s.id === secao)?.intro : null;
    return texto(JSON.stringify({ andamento: `${p.respondidas} de ${p.total}`, secao_intro: intro, perguntas: proximas, fim: proximas.length === 0 ? "Não há mais perguntas pendentes: chame finalizar_entrevista." : undefined }, null, 2));
  }
  if (nome === "registrar_resposta") {
    const v = validarResposta(args);
    if (!v.ok) return texto(v.erro, true);
    const d = v.dados;
    const agora = new Date().toISOString();
    await servico("/rest/v1/entrevista_respostas?on_conflict=pergunta_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ pergunta_id: d.pergunta_id, resposta: d.resposta, certeza: d.certeza, observacao: d.observacao || null, atualizado_em: agora, link_id: linkId }),
    });
    const p = progresso(await respostasAtuais());
    const pergunta = perguntaPorId(d.pergunta_id);
    return texto(JSON.stringify({ gravado: d.pergunta_id, certeza: d.certeza, assunto: pergunta?.destino, andamento: `${p.respondidas} de ${p.total} (${p.porcentagem}%)`, restam_obrigatorias: p.faltam_obrigatorias.length }));
  }
  if (nome === "ver_progresso") {
    return texto(JSON.stringify(progresso(await respostasAtuais()), null, 2));
  }
  if (nome === "finalizar_entrevista") {
    const rs = await respostasAtuais();
    const a = montarArquivo(rs);
    await servico("/rest/v1/entrevista_arquivos", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ link_id: linkId, respondidas: a.progresso.respondidas, total: a.progresso.total, markdown: a.markdown, dados: a.json }) });
    return texto(JSON.stringify({
      instrucao: "Crie um arquivo para download chamado entrevista-voice-" + new Date().toISOString().slice(0, 10) + ".md com EXATAMENTE o conteúdo do campo arquivo_markdown e entregue ao Fernando. Diga que ele deve enviar esse arquivo ao Claude Code para preencher o VEOS, e que as respostas também ficam guardadas no VEOS (Integrações → Entrevista guiada).",
      resumo: a.progresso.respondidas + " de " + a.progresso.total + " respondidas, " + a.progresso.nao_sei + " marcadas como não sei",
      faltam_obrigatorias: a.progresso.faltam_obrigatorias,
      arquivo_markdown: a.markdown,
    }));
  }
  return texto("ferramenta desconhecida: " + nome, true);
}

async function tratar(msg: Record<string, unknown>, linkId: string) {
  const { id, method, params } = msg as { id?: unknown; method?: string; params?: Record<string, unknown> };
  if (method === "initialize") {
    const pedida = typeof params?.protocolVersion === "string" ? params.protocolVersion : VERSAO;
    return ok(id, {
      protocolVersion: pedida,
      capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
      serverInfo: { name: "veos-entrevista", version: "1.0.0" },
      instructions: "Entrevista guiada da VOICE Ambientes Inteligentes. Comece sempre por iniciar_entrevista e siga as regras que ela devolver.",
    });
  }
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") return ok(id, { tools: FERRAMENTAS });
  if (method === "prompts/list") return ok(id, { prompts: PROMPTS });
  if (method === "prompts/get") {
    if (params?.name !== "entrevista-veos") return erro(id, -32602, "prompt desconhecido");
    return ok(id, { description: PROMPTS[0].description, messages: [{ role: "user", content: { type: "text", text: TEXTO_PROMPT } }] });
  }
  if (method === "resources/list") return ok(id, { resources: [] });
  if (method === "tools/call") {
    const nome = typeof params?.name === "string" ? params.name : "";
    const args = (params?.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
    if (!FERRAMENTAS.some((f) => f.name === nome)) return erro(id, -32602, "ferramenta desconhecida");
    try {
      return ok(id, await chamarFerramenta(nome, args, linkId));
    } catch (e) {
      console.error("entrevista", nome, e);
      return ok(id, texto(e instanceof HttpError ? e.message : "falha ao acessar o banco; tente de novo em instantes", true));
    }
  }
  return erro(id, -32601, "método não suportado");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CABECALHOS });
  const partes = new URL(req.url).pathname.split("/").filter(Boolean); // functions/v1/entrevista/<segredo>
  const i = partes.indexOf("entrevista");
  const segredo = i >= 0 ? (partes[i + 1] ?? "") : "";
  if (req.method !== "POST") return resp(405, { erro: "use POST (MCP Streamable HTTP)" });
  let link;
  try {
    link = await linkValido(segredo);
  } catch (e) {
    console.error("entrevista link", e);
    return resp(503, { erro: "indisponível" });
  }
  if (!link) return resp(401, { erro: "link inválido, expirado ou revogado" });
  if (!limitar(link.id)) return resp(429, erro(null, -32000, "muitas chamadas: aguarde um minuto"));
  const bruto = await req.text();
  if (bruto.length > MAX_CORPO) return resp(413, erro(null, -32600, "mensagem grande demais"));
  let msg: unknown;
  try { msg = JSON.parse(bruto); } catch { return resp(400, erro(null, -32700, "JSON inválido")); }
  servico(`/rest/v1/entrevista_links?id=eq.${link.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ultimo_uso: new Date().toISOString(), usos: (link.usos ?? 0) + 1 }) }).catch(() => {});
  const lote = Array.isArray(msg) ? msg : [msg];
  if (lote.length > 10) return resp(400, erro(null, -32600, "lote grande demais"));
  const respostas = [];
  for (const m of lote) {
    if (!m || typeof m !== "object") { respostas.push(erro(null, -32600, "requisição inválida")); continue; }
    const r = m as Record<string, unknown>;
    if (r.id === undefined) continue; // notificacao (ex.: notifications/initialized): sem resposta
    respostas.push(await tratar(r, link.id));
  }
  if (!respostas.length) return new Response(null, { status: 202, headers: CABECALHOS });
  return resp(200, Array.isArray(msg) ? respostas : respostas[0]);
});
