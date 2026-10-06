import { api } from "../js/data/api.js";
import { telaDiretores } from "../js/ui/views/diretores.js";
import { rodar } from "./_kit.js";

const enviados = [];
const pensadas = [];
api.motoresIA = async () => ({ algum_no_servidor: true, motores: [{ id: "gemini", nome: "Gemini (Google AI Studio)", ativo: true, gratuito: true }, { id: "openai", nome: "OpenAI", ativo: false }, { id: "claude-code", nome: "Claude Code (fila)", ativo: true }], dados_ao_provedor_gratuito: "No plano gratuito do Gemini o Google pode usar o conteúdo enviado." });
api.perguntasDiretores = async () => ({ perguntas: [
  { id: "11111111-1111-1111-1111-111111111111", setor_id: "vendas", pergunta: "[TESTE] Posso dar 8% de desconto?", estado: "respondida", criada_em: "2026-10-01T20:00:00Z", autor_nome: "Fernando TESTE",
    respostas: [{ id: 1, resposta: "RESUMO\n8% não está na alçada comercial.\n1. Entender o interesse.\n2. Alternativas.", procedimento: "O cliente pediu desconto", motor: "Gemini (chave gratuita) · gemini-3.8-flash", em: "2026-10-01T20:10:00Z", fontes: [{ titulo: "Política V1 sec. 9", natureza: "política vigente" }] }],
    execucoes: [{ provedor: "gemini", modelo: "gemini-3.8-flash", ok: false, erro: "Gemini 429: cota", ms: 900, passos: [] }, { provedor: "gemini", modelo: "gemini-3.5-flash", ok: true, ms: 21000, passos: [{ ferramenta: "consultar_precedentes", ok: true }, { ferramenta: "preco_pela_politica", ok: true }] }] },
  { id: "22222222-2222-2222-2222-222222222222", setor_id: "marketing", pergunta: "[TESTE] Campanha para arquitetos", estado: "pendente", criada_em: "2026-10-01T21:00:00Z", autor_nome: "Fernando TESTE", respostas: [], execucoes: [], ia_analisando: true },
  { id: "33333333-3333-3333-3333-333333333333", setor_id: "financas", pergunta: "[TESTE] Analise o orçamento 966", estado: "pendente", criada_em: "2026-10-01T22:00:00Z", autor_nome: "Fernando TESTE", respostas: [], execucoes: [{ provedor: "gemini", modelo: "gemini-3.8-flash", ok: false, erro: "Gemini 429", ms: 500, passos: [] }], ia_analisando: false, ia_erro: "gemini/gemini-3.8-flash: Gemini 429: cota" }] });
api.perguntarDiretor = async (d) => { enviados.push(d); return { id: "x", estado: "pendente", ia: "analisando" }; };
api.pensarPergunta = async (id) => { pensadas.push(id); return { ia: "analisando" }; };
api.cancelarPergunta = async () => ({ ok: true });
rodar(async (v) => {
  await telaDiretores(v);
  const t = v.textContent;
  for (const trecho of ["Resposta de IA · opinião, não decisão", "Motor de raciocínio ligado", "Analisando", "não conseguiu responder", "precedentes da Biblioteca, preço pela Política", "Google pode usar"]) {
    if (!t.includes(trecho)) throw new Error(`faltou: ${trecho}`);
  }
  const tentar = [...v.querySelectorAll("button")].find((b) => b.textContent === "Tentar com a IA");
  tentar.click();
  await new Promise((r) => setTimeout(r, 100));
  if (pensadas[0] !== "33333333-3333-3333-3333-333333333333") throw new Error(`nova tentativa: ${JSON.stringify(pensadas)}`);
  v.querySelector("#dp-setor").value = "financas";
  v.querySelector("#dp-pergunta").value = "[TESTE] Quanto cobrar?";
  v.querySelector("form").requestSubmit();
  await new Promise((r) => setTimeout(r, 100));
  if (enviados[0]?.setor_id !== "financas") throw new Error(JSON.stringify(enviados));
  if (!v.textContent.includes("está analisando com o motor de IA")) throw new Error("aviso de envio com IA ausente");
});
