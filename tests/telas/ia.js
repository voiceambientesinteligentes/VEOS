// IA VEOS + assistente: pergunta vai ao diretor certo pelo motor (perguntarDiretor), "analisando…",
// resposta formatada; continuação na mesma conversa; pedido de tela abre a tela; avisos do Radar no chat.
import { api } from "../js/data/api.js";
import { renderIA } from "../js/ui/views/ia.js";
import { enviar, estado, iniciarAssistente, limparConversa } from "../js/ui/assistente.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1) || "pergunta";
localStorage.clear();
if (window.speechSynthesis) window.speechSynthesis.speak = () => {};
const enviados = [];
let respondida = false;
api.perguntarDiretor = async (d) => { enviados.push(d); return { id: `p${enviados.length}`, conversa_id: d.conversa_id ?? "c1", estado: "pendente", ia: "analisando" }; };
api.perguntasDiretores = async () => ({ perguntas: enviados.map((d, k) => ({ id: `p${k + 1}`, estado: "respondida", respostas: [{ resposta: "RESUMO\nComece pelos escritórios de arquitetura TESTE.\n• Café técnico\n• Caderno técnico", motor: "Mistral · teste", em: new Date().toISOString() }] })) });
api.radar = async () => ({ alertas: [{ id: "a1", chave: "TESTE_ALERTA", setor_id: "vendas", severidade: "CRITICO", titulo: "Lead TESTE sem resposta" }], tarefas: [], setores: ["vendas"] });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

rodar(async (v) => {
  if (caso === "aviso") {
    iniciarAssistente({ nome: "Fernando TESTE", papel: "direcao" });
    await espera(300);
    const selo = document.querySelector(".as-selo");
    if (!selo || selo.hidden || selo.textContent !== "1") throw new Error("selo do aviso no botão");
    document.querySelector(".as-flutuante").click();
    if (!document.querySelector(".as-raiz.aberto") || !document.body.textContent.includes("Lead TESTE sem resposta")) throw new Error("aviso dentro do chat");
    if (!document.querySelector(".as-selo").hidden) throw new Error("abrir marca como lido");
    v.append(document.querySelector(".as-raiz")); // dentro do #view para o kit medir
    return;
  }
  renderIA(v, new AbortController().signal, { nome: "Fernando TESTE", papel: "direcao" });
  if (!v.textContent.includes("Como posso ajudar, Fernando?")) throw new Error("saudação");
  if (!v.querySelector(".as-mic") || !v.querySelector(".ia2-sugestao")) throw new Error("microfone e sugestões");
  if (caso === "tela") {
    await enviar("abrir o radar");
    if (!v.textContent.includes("Abrindo o radar")) throw new Error("pedido de tela");
    if (enviados.length) throw new Error("pedido de tela não vai ao motor");
    return;
  }
  const campo = v.querySelector(".as-campo");
  campo.value = "prepare uma campanha para arquitetos no instagram";
  campo.form.requestSubmit();
  await espera(50);
  if (enviados[0]?.setor_id !== "marketing") throw new Error(`vai ao CMO: ${JSON.stringify(enviados)}`);
  if (!v.querySelector(".as-pensando")) throw new Error("analisando…");
  await espera(4500);
  if (!v.textContent.includes("Comece pelos escritórios de arquitetura TESTE") || !v.querySelector(".as-texto ul li")) throw new Error("resposta formatada");
  if (!v.textContent.includes("IA · opinião")) throw new Error("rótulo de opinião");
  // continuação: mesma conversa do CMO
  await enviar("detalhe a campanha de instagram");
  if (enviados[1]?.conversa_id !== "c1") throw new Error(`continuação na mesma conversa: ${JSON.stringify(enviados[1])}`);
  if (estado().msgs.length < 4) throw new Error("histórico no chat");
  limparConversa();
});
