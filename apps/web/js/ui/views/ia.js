// IA VEOS (tela cheia), no estilo de um app de conversa com IA: coluna central, saudacao grande quando
// vazia, caixa de texto arredondada com microfone e enviar, sugestoes, respostas em texto corrido.
// O orbe (onda WebGL) reage quando o VEOS escuta ou fala. Mesmo cerebro do chat flutuante
// (ui/assistente.js): telas abrem na hora; perguntas vao ao diretor certo pelo motor de IA do servidor.
import { assinar, caixaDeEntrada, definirVoz, desenharMensagens, enviar, escolherVoz, estado, ligarVoz, limparConversa, quandoFalar, vozesDisponiveis, vozLigada } from "../assistente.js";
import { h } from "../dom.js";
import { montarOnda } from "../onda.js";

const SUGESTOES = [
  ["Qual canal de captação eu trabalho primeiro este mês?", "Vendas"],
  ["Quanto devo cobrar pela hora de mão de obra?", "Finanças"],
  ["Monte uma campanha de Instagram para arquitetos", "Marketing"],
  ["Abrir o radar", "Tela"],
];

export function renderIA(root, signal, eu = {}, { embutida = false } = {}) {
  const nome = String(eu.nome ?? "").split(" ")[0];
  const canvas = h("canvas", { class: "ia2-onda", "aria-hidden": "true" });
  const orbe = h("div", { class: "ia2-orbe" }, canvas);
  const lista = h("div", { class: "ia2-lista", "aria-live": "polite" });
  const { form, campo } = caixaDeEntrada({ grande: true, placeholder: "Pergunte a um diretor ou peça uma tela… (Enter envia)", aoOuvir: (v) => energia(v ? 0.7 : 0.12) });
  const sugestoes = h("div", { class: "ia2-sugestoes" }, SUGESTOES.map(([t, tag]) => {
    const b = h("button", { class: "ia2-sugestao", type: "button" }, h("small", null, tag), h("span", null, t));
    b.addEventListener("click", () => enviar(t));
    return b;
  }));
  // voz: escolha e liga/desliga
  const seletor = h("select", { class: "select ia2-voz", "aria-label": "Voz do VEOS" });
  const vozBox = h("label", { class: "ia2-opcao" }, h("input", { type: "checkbox", checked: vozLigada() }), "Responder em voz");
  vozBox.firstChild.addEventListener("change", (e) => ligarVoz(e.target.checked));
  seletor.addEventListener("change", () => definirVoz(seletor.value));
  const preencherVozes = () => {
    const vs = vozesDisponiveis();
    const atual = escolherVoz(vs);
    seletor.replaceChildren(...(vs.length ? vs : [{ name: "", lang: "" }]).map((v) => h("option", { value: v.name, selected: v.name === atual?.name }, v.name ? v.name.replace(/^Microsoft\s+/, "").replace(/ - Portuguese \(Brazil\)| \(Portuguese.*\)$/, "") : "Voz do sistema")));
    seletor.disabled = !vs.length;
  };
  const novo = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Nova conversa");
  novo.addEventListener("click", () => { if (confirm("Começar uma conversa nova? As anteriores continuam em Perguntar aos diretores.")) limparConversa(); });

  const vazio = h("div", { class: "ia2-vazio" },
    h("h1", { class: "ia2-saudacao" }, h("span", { class: "ia2-estrela", "aria-hidden": "true" }, "✦"), ` Como posso ajudar${nome ? `, ${nome}` : ""}?`),
    form, sugestoes,
    h("p", { class: "ia2-nota" }, "Os diretores respondem com a IA do servidor, pelo manual de cada um e com os dados do VEOS. É opinião, não decisão."));
  const rodape = h("div", { class: "ia2-rodape" });
  const coluna = h("div", { class: "ia2-coluna" }, lista, rodape);
  root.append(h("section", { class: `ia2${embutida ? " ia2-embutida" : ""}`, "aria-label": "IA VEOS" },
    h("div", { class: "ia2-topo" }, orbe, h("div", { class: "ia2-topo-texto" }, h("strong", null, "VEOS"), h("small", null, "Assistente da VOICE")), h("div", { class: "ia2-topo-acoes" }, seletor, vozBox, novo)),
    coluna,
    h("p", { class: "ia2-privacidade" }, "Privacidade: o reconhecimento e a voz são do próprio navegador (o áudio pode ir ao Google no Chrome ou à Microsoft no Edge). O VEOS não grava áudio. Não fale dados pessoais de clientes.")));

  function desenhar() {
    const st = estado();
    // so avisos do Radar ainda nao e conversa: a saudacao fica e os avisos aparecem embaixo
    const temConversa = st.msgs.some((m) => m.de !== "aviso") || st.pensando;
    coluna.classList.toggle("ia2-com-conversa", Boolean(temConversa));
    if (!temConversa) {
      const avisos = st.msgs.filter((m) => m.de === "aviso").slice(-4);
      const caixaAvisos = avisos.length ? h("div", { class: "ia2-avisos" }, h("small", null, "Avisos"), avisos.map((m) => h("a", { class: "ia2-aviso", href: m.href ?? "#/radar" }, h("span", { class: "as-avatar as-avatar-aviso", "aria-hidden": "true" }, "!"), h("span", null, m.texto)))) : null;
      lista.replaceChildren(vazio, ...(caixaAvisos ? [caixaAvisos] : []));
      rodape.replaceChildren();
      if (form.parentElement !== vazio) vazio.insertBefore(form, sugestoes);
      return;
    }
    desenharMensagens(lista);
    if (form.parentElement !== rodape) rodape.replaceChildren(form);
  }
  const sair = assinar(desenhar);
  desenhar();
  preencherVozes();
  if ("speechSynthesis" in window) speechSynthesis.addEventListener?.("voiceschanged", preencherVozes, { signal });
  const onda = montarOnda(canvas, signal, { escala: 0.5 });
  if (!onda) orbe.classList.add("sem-webgl");
  const energia = (v) => onda?.definirEnergia(v);
  energia(0.12);
  quandoFalar((falando) => energia(falando ? 0.6 : 0.12));
  if (!embutida) campo.focus();
  signal.addEventListener("abort", () => { sair(); quandoFalar(null); if ("speechSynthesis" in window) speechSynthesis.cancel(); });
}
