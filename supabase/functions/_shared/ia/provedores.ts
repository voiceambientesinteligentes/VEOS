// Provedores de IA do motor de raciocinio dos diretores. Cada provedor roda o laco
// "pensar -> pedir ferramenta -> receber o resultado -> responder" no formato da propria API:
//   Gemini (Google AI Studio, generateContent com functionDeclarations)
//   OpenAI (Chat Completions com tools)
// Sem banco e sem Deno: testavel no Node com fetch simulado (tests/ia/provedores.test.ts).
// Falhas viram ProvedorErro com a orientacao de trocar de modelo (cota, modelo inexistente,
// sobrecarga) ou de provedor (chave invalida/sem permissao).

export type Esquema = { type: string; description?: string; properties?: Record<string, Esquema>; required?: string[]; enum?: string[]; items?: Esquema };
export type DefFerramenta = { nome: string; descricao: string; parametros: Esquema };
export type Chamada = { nome: string; args: Record<string, unknown> };
export type Passo = { ferramenta: string; argumentos: Record<string, unknown>; ms: number; ok: boolean; erro?: string };
export type Executor = (c: Chamada) => Promise<unknown>;
export type Pedido = {
  sistema: string;
  pergunta: string;
  ferramentas: DefFerramenta[];
  executar: Executor;
  maxPassos?: number; // rodadas com ferramentas antes de exigir a resposta final
  prazo?: number; // epoch ms: depois disso, responde com o que ja tem
};
export type Uso = { entrada: number; saida: number };
export type Resultado = { texto: string; modelo: string; passos: Passo[]; uso: Uso };
export type Provedor = { id: "gemini" | "openai"; rotulo: string; modelos: string[]; chave: string; gratuito: boolean };
export type Tentativa = { provedor: string; modelo: string; ok: boolean; erro?: string; passos: Passo[]; uso: Uso; ms: number };

export class ProvedorErro extends Error {
  status: number;
  trocar: "modelo" | "provedor";
  passos: Passo[];
  uso: Uso;
  constructor(status: number, msg: string, trocar: "modelo" | "provedor", passos: Passo[] = [], uso: Uso = { entrada: 0, saida: 0 }) {
    super(msg);
    this.status = status;
    this.trocar = trocar;
    this.passos = passos;
    this.uso = uso;
  }
}

const FECHAR = "\n\nAGORA RESPONDA: não chame mais ferramentas; escreva a resposta final com o que já foi levantado e aponte como LACUNA o que faltou.";
const TIMEOUT_CHAMADA = 60_000;

function erroHttp(nome: string, status: number, corpo: string, passos: Passo[], uso: Uso): ProvedorErro {
  let msg = corpo.slice(0, 300);
  try {
    const d = JSON.parse(corpo);
    msg = d.error?.message ?? d.error?.status ?? msg;
  } catch { /* corpo nao e JSON */ }
  const chaveRuim = status === 401 || status === 403 || /api[_ ]?key/i.test(msg);
  return new ProvedorErro(status, `${nome} ${status}: ${String(msg).slice(0, 200)}`, chaveRuim ? "provedor" : "modelo", passos, uso);
}

async function executar(p: Pedido, c: Chamada, passos: Passo[]) {
  const t0 = Date.now();
  try {
    const resultado = await p.executar(c);
    passos.push({ ferramenta: c.nome, argumentos: c.args, ms: Date.now() - t0, ok: true });
    return resultado;
  } catch (e) {
    const erro = (e as Error).message?.slice(0, 300) ?? "falha";
    passos.push({ ferramenta: c.nome, argumentos: c.args, ms: Date.now() - t0, ok: false, erro });
    return { erro };
  }
}

const restante = (p: Pedido) => Math.max(5_000, Math.min(TIMEOUT_CHAMADA, (p.prazo ?? Date.now() + TIMEOUT_CHAMADA) - Date.now() + 25_000));
const deveFechar = (p: Pedido, rodada: number) => rodada >= (p.maxPassos ?? 8) || (p.prazo !== undefined && Date.now() > p.prazo);

// ---------------------------------------------------------------- Gemini
// deno-lint-ignore no-explicit-any
type Parte = Record<string, any>;

export async function rodarGemini(prov: Provedor, modelo: string, p: Pedido, f: typeof fetch = fetch): Promise<Resultado> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
  const contents: { role: string; parts: Parte[] }[] = [{ role: "user", parts: [{ text: p.pergunta }] }];
  const tools = p.ferramentas.length ? [{ functionDeclarations: p.ferramentas.map((x) => ({ name: x.nome, description: x.descricao, parameters: x.parametros })) }] : undefined;
  const passos: Passo[] = [];
  const uso: Uso = { entrada: 0, saida: 0 };
  for (let rodada = 0; ; rodada++) {
    const fechar = deveFechar(p, rodada);
    const corpo = {
      systemInstruction: { parts: [{ text: p.sistema + (fechar ? FECHAR : "") }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      ...(tools ? { tools, toolConfig: { functionCallingConfig: { mode: fechar ? "NONE" : "AUTO" } } } : {}),
    };
    let r: Response;
    try {
      r = await f(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": prov.chave }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(restante(p)) });
    } catch (e) {
      throw new ProvedorErro(504, `Gemini sem resposta: ${(e as Error).message}`, "modelo", passos, uso);
    }
    if (!r.ok) throw erroHttp("Gemini", r.status, await r.text(), passos, uso);
    const d = await r.json();
    uso.entrada += Number(d.usageMetadata?.promptTokenCount ?? 0);
    uso.saida += Number(d.usageMetadata?.candidatesTokenCount ?? 0) + Number(d.usageMetadata?.thoughtsTokenCount ?? 0);
    const cand = d.candidates?.[0];
    const partes: Parte[] = cand?.content?.parts ?? [];
    if (!partes.length) throw new ProvedorErro(502, `Gemini sem conteúdo (${cand?.finishReason ?? d.promptFeedback?.blockReason ?? "vazio"})`, "modelo", passos, uso);
    const chamadas = partes.filter((x) => x.functionCall);
    if (!chamadas.length || fechar) {
      const texto = partes.filter((x) => typeof x.text === "string" && !x.thought).map((x) => x.text).join("").trim();
      if (!texto) throw new ProvedorErro(502, `Gemini respondeu sem texto (${cand?.finishReason ?? "?"})`, "modelo", passos, uso);
      return { texto, modelo, passos, uso };
    }
    contents.push(cand.content); // devolvido como veio: preserva as assinaturas de raciocinio (thoughtSignature)
    const respostas: Parte[] = [];
    for (const x of chamadas) {
      const c = { nome: String(x.functionCall.name), args: (x.functionCall.args ?? {}) as Record<string, unknown> };
      const resultado = await executar(p, c, passos);
      respostas.push({ functionResponse: { name: c.nome, ...(x.functionCall.id ? { id: x.functionCall.id } : {}), response: { resultado } } });
    }
    contents.push({ role: "user", parts: respostas });
  }
}

// ---------------------------------------------------------------- OpenAI
export async function rodarOpenAI(prov: Provedor, modelo: string, p: Pedido, f: typeof fetch = fetch): Promise<Resultado> {
  // deno-lint-ignore no-explicit-any
  const msgs: Record<string, any>[] = [{ role: "system", content: p.sistema }, { role: "user", content: p.pergunta }];
  const tools = p.ferramentas.map((x) => ({ type: "function", function: { name: x.nome, description: x.descricao, parameters: x.parametros } }));
  const passos: Passo[] = [];
  const uso: Uso = { entrada: 0, saida: 0 };
  for (let rodada = 0; ; rodada++) {
    const fechar = deveFechar(p, rodada);
    if (fechar) msgs[0] = { role: "system", content: p.sistema + FECHAR };
    const corpo = { model: modelo, messages: msgs, ...(tools.length ? { tools, tool_choice: fechar ? "none" : "auto" } : {}) };
    let r: Response;
    try {
      r = await f("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.chave}` }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(restante(p)) });
    } catch (e) {
      throw new ProvedorErro(504, `OpenAI sem resposta: ${(e as Error).message}`, "modelo", passos, uso);
    }
    if (!r.ok) throw erroHttp("OpenAI", r.status, await r.text(), passos, uso);
    const d = await r.json();
    uso.entrada += Number(d.usage?.prompt_tokens ?? 0);
    uso.saida += Number(d.usage?.completion_tokens ?? 0);
    const m = d.choices?.[0]?.message;
    if (!m) throw new ProvedorErro(502, "OpenAI sem mensagem", "modelo", passos, uso);
    const chamadas = m.tool_calls ?? [];
    if (!chamadas.length || fechar) {
      const texto = String(m.content ?? "").trim();
      if (!texto) throw new ProvedorErro(502, `OpenAI respondeu sem texto (${d.choices?.[0]?.finish_reason ?? "?"})`, "modelo", passos, uso);
      return { texto, modelo, passos, uso };
    }
    msgs.push(m);
    for (const x of chamadas) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(x.function?.arguments || "{}");
      } catch { /* argumentos invalidos: a ferramenta recebe vazio e responde com erro de validacao */ }
      const resultado = await executar(p, { nome: String(x.function?.name), args }, passos);
      msgs.push({ role: "tool", tool_call_id: x.id, content: JSON.stringify(resultado) });
    }
  }
}

/**
 * Tenta os provedores na ordem; em cada um, os modelos na ordem. Cota esgotada, modelo inexistente
 * ou sobrecarga -> proximo modelo; chave invalida -> proximo provedor. Devolve o primeiro resultado
 * e TODAS as tentativas (para a trilha de auditoria).
 */
export async function responderComFallback(provedores: Provedor[], p: Pedido, f: typeof fetch = fetch) {
  const tentativas: Tentativa[] = [];
  for (const prov of provedores) {
    for (const modelo of prov.modelos) {
      if (p.prazo !== undefined && Date.now() > p.prazo + 20_000) break;
      const t0 = Date.now();
      try {
        const r = prov.id === "gemini" ? await rodarGemini(prov, modelo, p, f) : await rodarOpenAI(prov, modelo, p, f);
        tentativas.push({ provedor: prov.id, modelo, ok: true, passos: r.passos, uso: r.uso, ms: Date.now() - t0 });
        return { ok: true as const, provedor: prov, resultado: r, tentativas };
      } catch (e) {
        const pe = e instanceof ProvedorErro ? e : new ProvedorErro(500, (e as Error).message ?? "falha", "modelo");
        tentativas.push({ provedor: prov.id, modelo, ok: false, erro: pe.message, passos: pe.passos, uso: pe.uso, ms: Date.now() - t0 });
        if (pe.trocar === "provedor") break;
      }
    }
  }
  return { ok: false as const, tentativas };
}
