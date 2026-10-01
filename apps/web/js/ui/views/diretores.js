// PERGUNTAR AOS DIRETORES: a pergunta vai para uma fila; uma sessao do Claude Code (plano Claude
// Max do fundador, sem API paga) responde na voz do diretor usando o manual e os dados do VEOS.
// Resposta de IA e sempre rotulada como opiniao (nunca decisao).
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, method, panel, stamp } from "../dom.js";

const SETOR = Object.fromEntries(CATALOGO.map((s) => [s.id, s]));
const EST = { pendente: ["Aguardando", "warn"], respondida: ["Respondida", "ok"], cancelada: ["Cancelada", "neutral"] };

export async function telaDiretores(root) {
  const inicial = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const setor = h("select", { class: "select", id: "dp-setor" }, CATALOGO.map((s) => h("option", { value: s.id, selected: s.id === inicial.get("setor") }, `${s.sigla} · ${s.diretor.nome} (${s.nome})`)));
  const pergunta = h("textarea", { class: "input", id: "dp-pergunta", rows: 4, placeholder: "Ex.: Faça um plano de campanha para arquitetos de Balneário Camboriú." }, inicial.get("pergunta") ?? "");
  const saida = h("div", { role: "status" });
  const enviar = h("button", { class: "btn btn-primary", type: "submit" }, "Enviar ao diretor");
  const lista = h("div", { class: "stack" });
  const form = h("form", { class: "stack-s", novalidate: true }, h("div", { class: "form-grid" }, field(setor.id, "Para", setor)), field(pergunta.id, "Pergunta", pergunta), h("div", { class: "row" }, enviar), saida);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(saida);
    if (pergunta.value.trim().length < 5) return saida.append(errorNotice("Escreva a pergunta."));
    enviar.disabled = true;
    try {
      await api.perguntarDiretor({ setor_id: setor.value, pergunta: pergunta.value });
      pergunta.value = "";
      saida.append(h("p", { class: "notice notice-ok" }, "Pergunta enviada. Ela será respondida na próxima sessão do Claude Code (peça: \"responda as perguntas pendentes dos diretores\")."));
      await desenhar();
    } catch (err) { saida.append(errorNotice(err.message)); } finally { enviar.disabled = false; }
  });

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
        p.estado === "pendente" ? h("div", { class: "row" }, h("span", { class: "field-hint" }, "Aguardando a próxima sessão do Claude Code."), cancelar) : null);
    })) : h("p", { class: "result-empty" }, "Nenhuma pergunta ainda."));
  }
  root.append(
    panel({ title: "Perguntar aos diretores", subtitle: "A IA responde pela sua assinatura do Claude (Claude Code), sem custo de API: cada diretor segue o seu manual de atuação e os dados do VEOS." }, form,
      method("Como funciona", "1. Você envia a pergunta ao diretor. 2. No VS Code, peça ao Claude Code: \"responda as perguntas pendentes dos diretores\" (ou deixe uma rotina fazendo isso). 3. A resposta aparece aqui.",
        "As respostas são da IA na voz do diretor: servem de orientação. Decisões, aprovações e envios continuam com você.",
        "Respostas instantâneas no site exigiriam a API paga (Anthropic ou OpenAI), que é separada das assinaturas Claude Max e ChatGPT.")),
    panel({ title: "Perguntas e respostas" }, lista),
  );
  await desenhar();
}
