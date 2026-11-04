// Conversa com os diretores (chat): lista de conversas, balões, continuação no mesmo fio, analisando,
// falha com "Tentar de novo", nova conversa escolhendo o diretor e o aviso de resposta sem dados.
import { api } from "../js/data/api.js";
import { telaDiretores } from "../js/ui/views/diretores.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1) || "conversa";
const R = "11111111-1111-1111-1111-111111111111";
const enviados = [], pensadas = [];
api.motoresIA = async () => ({ algum_no_servidor: true, motores: [{ id: "mistral", nome: "Mistral", ativo: true, gratuito: true }], dados_ao_provedor_gratuito: "No plano gratuito o provedor pode usar o conteúdo enviado." });
api.perguntasDiretores = async () => ({ perguntas: [
  { id: R, conversa_id: null, setor_id: "vendas", pergunta: "[TESTE] Como captar novos clientes?", estado: "respondida", criada_em: "2026-11-04T19:00:00Z", autor_nome: "Fernando TESTE",
    respostas: [{ id: 1, resposta: "ATENÇÃO (conferência do VEOS): nesta resposta o diretor não consultou nenhum dado do VEOS.\n\nRESUMO\nComece pelos escritórios de arquitetura.\n\nPRÓXIMOS PASSOS\n1. Listar 10 escritórios.\n2. Café técnico.\n\nConferência automática do VEOS: estes valores não vieram de uma ferramenta de cálculo e precisam ser conferidos: 68,0%.", motor: "Mistral (gratuito) · ministral", em: "2026-11-04T19:01:00Z", fontes: [] }],
    execucoes: [{ provedor: "mistral", modelo: "ministral", ok: true, ms: 18000, passos: [] }] },
  { id: "22222222-2222-2222-2222-222222222222", conversa_id: R, setor_id: "vendas", pergunta: "[TESTE] Detalhe o item 2", estado: caso === "falha" ? "pendente" : "respondida", criada_em: "2026-11-04T19:05:00Z", autor_nome: "Fernando TESTE",
    respostas: caso === "falha" ? [] : [{ id: 2, resposta: "O café técnico dura 40 minutos.\n• Leve o caderno técnico.\n• Marque o próximo passo.", motor: "Mistral (gratuito) · ministral", em: "2026-11-04T19:06:00Z", fontes: [{ titulo: "Manual do CSO", natureza: "manual" }] }],
    execucoes: caso === "falha" ? [] : [{ provedor: "mistral", modelo: "ministral", ok: true, ms: 9000, passos: [{ ferramenta: "canais_e_cadencias", ok: true }] }], ia_analisando: false, ia_erro: caso === "falha" ? "mistral: 429" : null },
  { id: "33333333-3333-3333-3333-333333333333", conversa_id: null, setor_id: "financas", pergunta: "[TESTE] Quanto cobrar?", estado: "pendente", criada_em: "2026-11-04T18:00:00Z", autor_nome: "Fernando TESTE", respostas: [], execucoes: [], ia_analisando: true },
] });
api.perguntarDiretor = async (d) => { enviados.push(d); return { id: "44444444-4444-4444-4444-444444444444", conversa_id: d.conversa_id ?? "44444444-4444-4444-4444-444444444444", estado: "pendente", ia: "analisando" }; };
api.pensarPergunta = async (id) => { pensadas.push(id); return { ia: "analisando" }; };
api.cancelarPergunta = async () => ({ ok: true });
if (caso === "nova") history.replaceState(null, "", `${location.pathname}#nova?setor=financas&pergunta=${encodeURIComponent("[TESTE] Margem do projeto")}`);

rodar(async (v) => {
  await telaDiretores(v);
  const t = () => v.textContent;
  const exigir = (...xs) => { for (const x of xs) if (!t().includes(x)) throw new Error(`falta: ${x}`); };
  if (caso === "nova") {
    if (v.querySelector(".cv-caixa")?.value !== "[TESTE] Margem do projeto") throw new Error("pergunta vinda da IA VEOS no compositor");
    exigir("Ricardo".slice(0, 0) || "CFO");
    v.querySelector(".cv-compositor").requestSubmit();
    await new Promise((r) => setTimeout(r, 50));
    if (enviados[0]?.setor_id !== "financas" || enviados[0]?.conversa_id) throw new Error(`nova conversa: ${JSON.stringify(enviados)}`);
    return;
  }
  if (v.querySelectorAll(".cv-item").length !== 2) throw new Error("duas conversas (a continuação fica dentro da primeira)");
  // celular: começa pela lista; toca na conversa para abrir
  if (!v.querySelector(".cv-mensagens .cv-minha")) v.querySelector(".cv-item").click();
  exigir("Como captar novos clientes?", "Detalhe o item 2", "IA · opinião", "Comece pelos escritórios");
  if (!v.querySelector(".cv-aviso")) throw new Error("aviso de resposta sem dados em destaque");
  if (!v.querySelector(".cv-conferencia")) throw new Error("conferência em destaque");
  if (!v.querySelector(".cv-texto h4") || !v.querySelector(".cv-texto ul li")) throw new Error("títulos e listas formatados");
  if (v.querySelectorAll(".cv-minha").length !== 2) throw new Error("dois balões meus");
  if (caso === "falha") {
    exigir("Não consegui responder agora");
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Tentar de novo").click();
    await new Promise((r) => setTimeout(r, 50));
    if (pensadas[0] !== "22222222-2222-2222-2222-222222222222") throw new Error("tentar de novo");
    if (!v.querySelector(".cv-caixa").disabled) throw new Error("caixa bloqueada enquanto espera");
    return;
  }
  // continuar a mesma conversa
  const caixa = v.querySelector(".cv-caixa");
  caixa.value = "[TESTE] E quanto custa?";
  v.querySelector(".cv-compositor").requestSubmit();
  await new Promise((r) => setTimeout(r, 50));
  if (enviados[0]?.conversa_id !== R || enviados[0]?.setor_id) throw new Error(`continuação: ${JSON.stringify(enviados)}`);
  // sugestão rápida
  if (!v.querySelector(".cv-sugestoes-fim button")) throw new Error("sugestões depois da resposta");
  // a outra conversa mostra "analisando"
  [...v.querySelectorAll(".cv-item")].find((b) => b.textContent.includes("Quanto cobrar")).click();
  if (!v.querySelector(".cv-digitando")) throw new Error("analisando…");
});
