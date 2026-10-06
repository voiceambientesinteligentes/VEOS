// PERGUNTAR AOS DIRETORES: a pergunta vai para a fila e o MOTOR DE RACIOCINIO do servidor (Gemini com
// chave gratuita; OpenAI se houver chave) responde em segundo plano, na voz do diretor, usando o manual,
// as ferramentas de calculo do VEOS e os precedentes da Biblioteca. Sem motor (ou se ele falhar), a
// pergunta segue para o Claude Code (plano Max do fundador). Resposta de IA = opiniao, nunca decisao.
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { FERRAMENTA } from "../../data/ferramentas_ia.js";
import { formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, method, panel, stamp } from "../dom.js";

const SETOR = Object.fromEntries(CATALOGO.map((s) => [s.id, s]));
const EST = { pendente: ["Aguardando", "warn"], respondida: ["Respondida", "ok"], cancelada: ["Cancelada", "neutral"] };

const ESPERA_MS = 4000;

export async function telaDiretores(root) {
  const inicial = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const motores = await api.motoresIA().catch(() => null);
  const noServidor = Boolean(motores?.algum_no_servidor);
  const setor = h("select", { class: "select", id: "dp-setor" }, CATALOGO.map((s) => h("option", { value: s.id, selected: s.id === inicial.get("setor") }, `${s.sigla} · ${s.diretor.nome} (${s.nome})`)));
  const pergunta = h("textarea", { class: "input", id: "dp-pergunta", rows: 4, placeholder: "Ex.: Analise o orçamento 966 e refaça com os valores corretos." }, inicial.get("pergunta") ?? "");
  const saida = h("div", { role: "status" });
  const enviar = h("button", { class: "btn btn-primary", type: "submit" }, "Enviar ao diretor");
  const lista = h("div", { class: "stack" });
  let timer = null;
  const form = h("form", { class: "stack-s", novalidate: true }, h("div", { class: "form-grid" }, field(setor.id, "Para", setor)), field(pergunta.id, "Pergunta", pergunta), h("div", { class: "row" }, enviar), saida);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(saida);
    if (pergunta.value.trim().length < 5) return saida.append(errorNotice("Escreva a pergunta."));
    enviar.disabled = true;
    try {
      const r = await api.perguntarDiretor({ setor_id: setor.value, pergunta: pergunta.value });
      const nome = SETOR[setor.value]?.diretor.nome ?? "O diretor";
      pergunta.value = "";
      saida.append(h("p", { class: "notice notice-ok" }, r.ia === "analisando"
        ? `Pergunta enviada. ${nome} está analisando com o motor de IA; a resposta aparece abaixo em 1 a 2 minutos.`
        : "Pergunta enviada. Ela será respondida na próxima sessão do Claude Code (peça: \"responda as perguntas pendentes dos diretores\")."));
      await desenhar();
    } catch (err) { saida.append(errorNotice(err.message)); } finally { enviar.disabled = false; }
  });

  function trilha(p) {
    const ex = p.execucoes ?? [];
    if (!ex.length) return null;
    return method(`Como o motor chegou na resposta (${ex.length} tentativa${ex.length > 1 ? "s" : ""})`, ...ex.map((x) => {
      const usadas = (x.passos ?? []).map((s) => `${FERRAMENTA[s.ferramenta] ?? s.ferramenta}${s.ok ? "" : " (falhou)"}`);
      return `${x.provedor} · ${x.modelo}: ${x.ok ? "respondeu" : `falhou (${x.erro ?? "erro"})`}${usadas.length ? ` · ferramentas: ${usadas.join(", ")}` : ""} · ${Math.round((x.ms ?? 0) / 1000)} s`;
    }));
  }

  function pendencia(p, cancelar) {
    if (p.ia_analisando) return h("div", { class: "row" }, stamp("Analisando", "live"), h("span", { class: "field-hint" }, `${SETOR[p.setor_id]?.diretor.nome ?? "O diretor"} está pensando com o motor de IA…`));
    const tentar = h("button", { class: "btn btn-ghost", type: "button" }, "Tentar com a IA");
    tentar.addEventListener("click", async () => {
      tentar.disabled = true;
      try { await api.pensarPergunta(p.id); await desenhar(); } catch (e) { tentar.textContent = e.message; }
    });
    return h("div", { class: "stack-s" },
      p.ia_erro ? h("p", { class: "notice notice-warn" }, `O motor de IA não conseguiu responder: ${p.ia_erro}`) : null,
      h("div", { class: "row" }, h("span", { class: "field-hint" }, noServidor ? "Na fila. Você pode pedir de novo ao motor de IA ou deixar para o Claude Code." : "Aguardando a próxima sessão do Claude Code."), noServidor ? tentar : null, cancelar));
  }

  async function desenhar() {
    const { perguntas } = await api.perguntasDiretores();
    clear(lista).append(perguntas.length ? h("ul", { class: "list-plain stack" }, perguntas.map((p) => {
      const s = SETOR[p.setor_id];
      const cancelar = h("button", { class: "btn btn-ghost", type: "button" }, "Cancelar");
      cancelar.addEventListener("click", async () => { try { await api.cancelarPergunta(p.id); await desenhar(); } catch (e) { cancelar.textContent = e.message; } });
      return h("li", { class: "panel panel-tight stack-s" },
        h("div", { class: "row" }, stamp(s ? s.sigla : p.setor_id, "live"), h("strong", null, s ? s.diretor.nome : ""), stamp(...EST[p.estado]), h("span", { class: "field-hint" }, `${p.autor_nome} · ${formatDateTime(p.criada_em)}`)),
        h("p", { class: "pergunta-texto" }, p.pergunta),
        ...p.respostas.map((r) => h("div", { class: "resposta-ia stack-s" },
          h("div", { class: "row" }, stamp("Resposta de IA · opinião, não decisão", "warn"), h("span", { class: "field-hint" }, `${r.motor} · ${formatDateTime(r.em)}`)),
          r.procedimento ? h("p", { class: "field-hint" }, `Procedimento do manual: ${r.procedimento}`) : null,
          h("div", { class: "zoho-texto" }, r.resposta),
          r.fontes?.length ? method(`Fontes (${r.fontes.length})`, ...r.fontes.map((f) => (f.url ? h("a", { href: f.url, target: "_blank", rel: "noopener noreferrer" }, f.titulo ?? f.url) : `${f.titulo ?? ""}${f.natureza ? ` (${f.natureza})` : ""}`))) : null)),
        trilha(p),
        p.estado === "pendente" ? pendencia(p, cancelar) : null);
    })) : h("p", { class: "result-empty" }, "Nenhuma pergunta ainda."));
    // acompanha a analise em andamento sem recarregar a pagina
    clearTimeout(timer);
    if (perguntas.some((p) => p.ia_analisando) && root.isConnected) timer = setTimeout(() => desenhar().catch(() => {}), ESPERA_MS);
  }

  const ativos = (motores?.motores ?? []).filter((m) => m.ativo).map((m) => m.nome);
  root.append(
    panel({ title: "Perguntar aos diretores", subtitle: noServidor ? `Motor de raciocínio ligado: ${ativos.join(" → ")}. Cada diretor segue o próprio manual, faz as contas pelas ferramentas do VEOS e consulta a Biblioteca antes de opinar.` : "A IA responde pela sua assinatura do Claude (Claude Code), sem custo de API: cada diretor segue o seu manual de atuação e os dados do VEOS." },
      form,
      motores?.dados_ao_provedor_gratuito ? h("p", { class: "notice notice-warn" }, `${motores.dados_ao_provedor_gratuito} Não escreva na pergunta nome, telefone ou e-mail de cliente.`) : null,
      method("Como funciona",
        noServidor ? "1. Você envia a pergunta. 2. O motor de IA (em ordem: " + ativos.join(", ") + ") lê o manual do diretor, consulta a Biblioteca e usa as ferramentas de cálculo do VEOS — ele não faz conta de cabeça. 3. A resposta aparece aqui com as fontes e as ferramentas usadas; valores em reais que não vieram de uma ferramenta são apontados. 4. Se a cota gratuita acabar, ele tenta outro modelo; se nada funcionar, a pergunta fica para o Claude Code." : "1. Você envia a pergunta ao diretor. 2. No VS Code, peça ao Claude Code: \"responda as perguntas pendentes dos diretores\" (ou deixe uma rotina fazendo isso). 3. A resposta aparece aqui.",
        "As respostas são da IA na voz do diretor: servem de orientação. Decisões, aprovações e envios continuam com você.",
        "ChatGPT Plus/Pro e Claude Pro/Max são assinaturas de uso no app: não incluem a API. A API da OpenAI é cobrada à parte (decisão de custo: BIB-0044).")),
    panel({ title: "Perguntas e respostas" }, lista),
  );
  await desenhar();
}
