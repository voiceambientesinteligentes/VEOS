import { api } from "../js/data/api.js";
import { telaDiretores } from "../js/ui/views/diretores.js";
import { rodar } from "./_kit.js";

const enviados = [];
api.perguntasDiretores = async () => ({ perguntas: [
  { id: "11111111-1111-1111-1111-111111111111", setor_id: "vendas", pergunta: "[TESTE] Posso dar 8% de desconto?", estado: "respondida", criada_em: "2026-10-01T20:00:00Z", autor_nome: "Fernando TESTE",
    respostas: [{ id: 1, resposta: "Fernando, Eduardo (CSO). 8% não está na alçada comercial.\n1. Entender o interesse.\n2. Alternativas.", procedimento: "O cliente pediu desconto", motor: "Claude (Claude Code, plano Max)", em: "2026-10-01T20:10:00Z", fontes: [{ titulo: "Política V1 sec. 9", natureza: "fato_verificado" }] }] },
  { id: "22222222-2222-2222-2222-222222222222", setor_id: "marketing", pergunta: "[TESTE] Campanha para arquitetos", estado: "pendente", criada_em: "2026-10-01T21:00:00Z", autor_nome: "Fernando TESTE", respostas: [] }] });
api.perguntarDiretor = async (d) => { enviados.push(d); return { id: "x", estado: "pendente" }; };
api.cancelarPergunta = async () => ({ ok: true });
rodar(async (v) => {
  await telaDiretores(v);
  const t = v.textContent;
  if (!t.includes("Resposta de IA · opinião, não decisão") || !t.includes("Aguardando a próxima sessão do Claude Code")) throw new Error("lista incompleta");
  v.querySelector("#dp-setor").value = "financas";
  v.querySelector("#dp-pergunta").value = "[TESTE] Quanto cobrar?";
  v.querySelector("form").requestSubmit();
  await new Promise((r) => setTimeout(r, 100));
  if (enviados[0]?.setor_id !== "financas") throw new Error(JSON.stringify(enviados));
});
