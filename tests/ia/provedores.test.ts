// Motor de IA: provedores com fetch simulado (sem rede, sem chave real).
import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pedido, type Provedor, responderComFallback, rodarGemini, rodarOpenAI } from "../../supabase/functions/_shared/ia/provedores.ts";

const gemini: Provedor = { id: "gemini", rotulo: "Gemini (chave gratuita)", modelos: ["gemini-a", "gemini-b"], chave: "k-gemini", gratuito: true };
const openai: Provedor = { id: "openai", rotulo: "OpenAI", modelos: ["gpt-x"], chave: "k-openai", gratuito: false };
const resp = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

function pedido(chamadas: unknown[] = []): Pedido {
  return {
    sistema: "Você é o CFO.", pergunta: "Qual o preço?",
    ferramentas: [{ nome: "preco_pela_politica", descricao: "preço", parametros: { type: "object", properties: { custo: { type: "number" } }, required: ["custo"] } }],
    executar: async (c) => { chamadas.push(c); return { meta_35: 224.19 }; },
  };
}

test("Gemini: pede ferramenta, recebe o resultado e responde; devolve o turno do modelo com a assinatura", async () => {
  const corpos: any[] = [];
  const f = (async (_url: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body));
    corpos.push(b);
    if (corpos.length === 1) return resp(200, { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "preco_pela_politica", args: { custo: 100 } }, thoughtSignature: "SIG" }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } });
    return resp(200, { candidates: [{ content: { role: "model", parts: [{ text: "pensando", thought: true }, { text: "RESUMO\nPreço meta R$ 224,19." }] } }], usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 8 } });
  }) as typeof fetch;
  const chamadas: unknown[] = [];
  const r = await rodarGemini(gemini, "gemini-a", pedido(chamadas), f);
  assert.equal(r.texto, "RESUMO\nPreço meta R$ 224,19.");
  assert.deepEqual(chamadas, [{ nome: "preco_pela_politica", args: { custo: 100 } }]);
  assert.equal(r.passos.length, 1);
  assert.ok(r.passos[0].ok);
  assert.deepEqual(r.uso, { entrada: 40, saida: 13 });
  assert.equal(corpos[0].tools[0].functionDeclarations[0].name, "preco_pela_politica");
  assert.equal(corpos[0].systemInstruction.parts[0].text, "Você é o CFO.");
  assert.equal(corpos[1].contents[1].parts[0].thoughtSignature, "SIG", "turno do modelo devolvido como veio");
  assert.deepEqual(corpos[1].contents[2].parts[0].functionResponse, { name: "preco_pela_politica", response: { resultado: { meta_35: 224.19 } } });
});

test("Gemini: erro da ferramenta vira resultado {erro} e o passo fica registrado como falha", async () => {
  let n = 0;
  const f = (async () => {
    n++;
    return n === 1 ? resp(200, { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "preco_pela_politica", args: {} } }] } }] })
      : resp(200, { candidates: [{ content: { role: "model", parts: [{ text: "LACUNA: custo." }] } }] });
  }) as typeof fetch;
  const p = pedido();
  p.executar = async () => { throw new Error("custo precisa ser maior que zero"); };
  const r = await rodarGemini(gemini, "gemini-a", p, f);
  assert.equal(r.passos[0].ok, false);
  assert.match(r.passos[0].erro ?? "", /custo/);
});

test("Gemini: passou do prazo -> proibe ferramentas (mode NONE) e exige a resposta final", async () => {
  const corpos: any[] = [];
  const f = (async (_u: string, init: RequestInit) => { corpos.push(JSON.parse(String(init.body))); return resp(200, { candidates: [{ content: { role: "model", parts: [{ text: "Resposta com o que havia." }] } }] }); }) as typeof fetch;
  const p = { ...pedido(), prazo: Date.now() - 1 };
  const r = await rodarGemini(gemini, "gemini-a", p, f);
  assert.equal(r.texto, "Resposta com o que havia.");
  assert.equal(corpos[0].toolConfig.functionCallingConfig.mode, "NONE");
  assert.match(corpos[0].systemInstruction.parts[0].text, /AGORA RESPONDA/);
});

test("OpenAI: tool_calls -> mensagem role tool com o resultado -> texto final", async () => {
  const corpos: any[] = [];
  const f = (async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal((init.headers as Record<string, string>).Authorization, "Bearer k-openai");
    corpos.push(JSON.parse(String(init.body)));
    if (corpos.length === 1) return resp(200, { choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "preco_pela_politica", arguments: "{\"custo\":100}" } }] } }], usage: { prompt_tokens: 7, completion_tokens: 3 } });
    return resp(200, { choices: [{ message: { role: "assistant", content: "Meta R$ 224,19." } }], usage: { prompt_tokens: 20, completion_tokens: 4 } });
  }) as typeof fetch;
  const chamadas: unknown[] = [];
  const r = await rodarOpenAI(openai, "gpt-x", pedido(chamadas), f);
  assert.equal(r.texto, "Meta R$ 224,19.");
  assert.deepEqual(chamadas, [{ nome: "preco_pela_politica", args: { custo: 100 } }]);
  assert.deepEqual(corpos[1].messages[3], { role: "tool", tool_call_id: "c1", content: "{\"meta_35\":224.19}" });
  assert.equal(corpos[0].tools[0].function.name, "preco_pela_politica");
});

test("fallback: cota esgotada (429) no 1º modelo -> 2º modelo responde; todas as tentativas ficam na trilha", async () => {
  const modelos: string[] = [];
  const f = (async (url: string) => {
    const m = /models\/([^:]+):/.exec(url)?.[1] ?? "";
    modelos.push(m);
    if (m === "gemini-a") return resp(429, { error: { code: 429, message: "Resource has been exhausted (e.g. check quota).", status: "RESOURCE_EXHAUSTED" } });
    return resp(200, { candidates: [{ content: { role: "model", parts: [{ text: "ok" }] } }] });
  }) as typeof fetch;
  const r = await responderComFallback([gemini, openai], pedido(), f);
  assert.ok(r.ok);
  assert.deepEqual(modelos, ["gemini-a", "gemini-b"]);
  assert.equal(r.ok && r.resultado.modelo, "gemini-b");
  assert.equal(r.tentativas.length, 2);
  assert.equal(r.tentativas[0].ok, false);
  assert.match(r.tentativas[0].erro ?? "", /429/);
});

test("fallback: chave inválida no Gemini pula os outros modelos dele e vai para a OpenAI", async () => {
  const urls: string[] = [];
  const f = (async (url: string) => {
    urls.push(url);
    if (url.includes("googleapis")) return resp(400, { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } });
    return resp(200, { choices: [{ message: { role: "assistant", content: "pela OpenAI" } }] });
  }) as typeof fetch;
  const r = await responderComFallback([gemini, openai], pedido(), f);
  assert.ok(r.ok);
  assert.equal(r.ok && r.provedor.id, "openai");
  assert.equal(urls.filter((u) => u.includes("googleapis")).length, 1, "não tenta o 2º modelo com chave inválida");
});

test("fallback: sobrecarga (503) repete uma vez o mesmo modelo; nada responde -> ok=false com o motivo de cada tentativa", async () => {
  const modelos: string[] = [];
  const f = (async (url: string) => { modelos.push(/models\/([^:]+):/.exec(url)?.[1] ?? ""); return resp(503, { error: { message: "overloaded" } }); }) as typeof fetch;
  const r = await responderComFallback([gemini], pedido(), f, 0);
  assert.equal(r.ok, false);
  assert.deepEqual(modelos, ["gemini-a", "gemini-a", "gemini-b", "gemini-b"]);
  assert.ok(r.tentativas.every((t) => /503/.test(t.erro ?? "")));
});

test("fallback: o próximo modelo recebe os dados que as ferramentas já levantaram", async () => {
  const perguntas: string[] = [];
  let n = 0;
  const f = (async (url: string, init: RequestInit) => {
    n++;
    const b = JSON.parse(String(init.body));
    perguntas.push(b.contents[0].parts[0].text);
    if (url.includes("gemini-a") && n === 1) return resp(200, { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "preco_pela_politica", args: { custo: 100 } } }] } }] });
    if (url.includes("gemini-a")) return resp(429, { error: { message: "quota" } });
    return resp(200, { candidates: [{ content: { role: "model", parts: [{ text: "ok com os dados" }] } }] });
  }) as typeof fetch;
  const coletados: string[] = [];
  const p = pedido();
  p.executar = async (c) => { coletados.push(`${c.nome} → meta 224,20`); return { meta_35: 224.2 }; };
  p.dadosLevantados = () => coletados.join(" | ");
  const r = await responderComFallback([gemini], p, f, 0);
  assert.ok(r.ok);
  assert.ok(!perguntas[0].includes("DADOS JÁ LEVANTADOS"));
  assert.match(perguntas.at(-1)!, /DADOS JÁ LEVANTADOS[\s\S]*preco_pela_politica → meta 224,20/);
});

test("prazo final: sem tempo, não começa nova tentativa", async () => {
  const f = (async () => resp(200, { candidates: [{ content: { role: "model", parts: [{ text: "x" }] } }] })) as typeof fetch;
  const r = await responderComFallback([gemini], { ...pedido(), limite: Date.now() + 1000 }, f, 0);
  assert.equal(r.ok, false);
  assert.equal(r.tentativas.length, 0);
});
