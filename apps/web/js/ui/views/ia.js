// Tela IA VEOS: onda de voz (WebGL) + comando por voz do navegador (pt-BR).
// Hoje executa comandos de navegacao e indica o diretor que receberia o pedido;
// a IA (respostas dos diretores) entra quando for integrada - nada e inventado aqui.
import { interpretar } from "../../domain/comandos.js";
import { clear, h, s } from "../dom.js";
import { montarOnda } from "../onda.js";

const EXEMPLOS = ["Abrir a órbita", "Mostrar os avisos do CFO", "Abrir o histórico", "Qual a margem do projeto da cobertura?", "Prepare uma campanha para arquitetos"];

export function renderIA(root, signal) {
  const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
  const temVoz = !!Reconhecimento;
  const temFala = "speechSynthesis" in window;

  const canvas = h("canvas", { class: "ia-onda", "aria-hidden": "true" });
  const palco = h("div", { class: "ia-palco" }, canvas, h("div", { class: "ia-marca" }, h("span", { class: "ia-marca-simbolo", "aria-hidden": "true" }, "✦"), h("span", null, "VEOS IA")));
  const estado = h("p", { class: "ia-estado", role: "status" }, temVoz ? "Toque no microfone e fale." : "Este navegador não tem reconhecimento de voz. Use o Chrome ou o Edge, ou digite abaixo.");
  const transcricao = h("p", { class: "ia-transcricao", "aria-live": "polite" });
  const resposta = h("div", { class: "ia-resposta", "aria-live": "polite" });
  const microfone = h("button", { class: "ia-microfone", type: "button", "aria-pressed": "false", disabled: !temVoz, "aria-label": "Falar com o VEOS" },
    s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }),
  );
  microfone.firstChild.append(...iconeMicrofone());
  const falarResposta = h("input", { type: "checkbox", id: "ia-falar", checked: temFala, disabled: !temFala });
  const campo = h("input", { class: "input", id: "ia-texto", type: "text", autocomplete: "off", placeholder: "Ou digite um comando…" });
  const form = h("form", { class: "ia-form" }, campo, h("button", { class: "btn", type: "submit" }, "Enviar"));

  clear(root).append(
    h("section", { class: "ia", "aria-label": "Assistente VEOS" },
      palco,
      h("div", { class: "ia-controles" },
        h("div", { class: "ia-selos" },
          h("span", { class: "pill tone-warn" }, h("span", { class: "dot" }), "IA: integração pendente"),
          h("span", { class: `pill tone-${temVoz ? "ok" : "risk"}` }, h("span", { class: "dot" }), temVoz ? "Voz: pronta" : "Voz: indisponível")),
        microfone,
        estado,
        transcricao,
        resposta,
        form,
        h("label", { class: "ia-opcao", for: "ia-falar" }, falarResposta, "Responder em voz"),
      ),
      h("div", { class: "ia-ajuda" },
        h("p", { class: "ia-ajuda-titulo" }, "Experimente dizer"),
        h("ul", { class: "ia-exemplos" }, EXEMPLOS.map((e) => h("li", null, h("button", { class: "orbita-chip", type: "button", onclick: () => executar(e) }, `“${e}”`)))),
        h("p", { class: "ia-privacidade" },
          "Privacidade: o reconhecimento de voz é do próprio navegador e pode enviar o áudio ao fornecedor dele (Google no Chrome, Microsoft no Edge). O VEOS não grava áudio. As respostas dos diretores dependem da integração da IA, ainda pendente."),
      ),
    ),
  );

  const onda = montarOnda(canvas, signal);
  if (!onda) palco.classList.add("sem-webgl");
  const energia = (v) => onda?.definirEnergia(v);
  energia(0.12);

  function falar(texto) {
    if (!temFala || !falarResposta.checked) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 1.02;
    u.onstart = () => energia(0.55);
    u.onend = () => energia(0.12);
    speechSynthesis.speak(u);
  }

  function executar(texto) {
    const r = interpretar(texto);
    transcricao.textContent = r.texto ? `“${texto}”` : "";
    clear(resposta);
    if (r.rota) {
      resposta.append(h("p", null, h("strong", null, "Ação: "), r.fala));
      falar(r.fala);
      setTimeout(() => { if (!signal.aborted) location.hash = r.rota; }, 1100);
    } else if (r.diretor) {
      resposta.append(
        h("p", null, h("strong", null, "Encaminhamento: "), `${r.diretor.sigla} — ${r.diretor.nome}`),
        h("p", { class: "muted" }, "Quando a IA for integrada, o diretor responderá aqui com base nas fontes do VOICE_360, com data, versão e lacunas."),
      );
      falar(r.fala);
    } else {
      resposta.append(h("p", { class: "muted" }, r.fala));
      falar(r.fala);
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (campo.value.trim()) executar(campo.value.trim());
    campo.value = "";
  });

  // ------------------------------------------------ reconhecimento de voz
  let rec = null, ouvindo = false;
  function parar() {
    ouvindo = false;
    microfone.setAttribute("aria-pressed", "false");
    microfone.classList.remove("is-ouvindo");
    energia(0.12);
  }
  microfone.addEventListener("click", () => {
    if (ouvindo) {
      rec?.stop();
      return;
    }
    rec = new Reconhecimento();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      ouvindo = true;
      microfone.setAttribute("aria-pressed", "true");
      microfone.classList.add("is-ouvindo");
      estado.textContent = "Ouvindo…";
      clear(resposta);
      transcricao.textContent = "";
      energia(0.6);
      if (temFala) speechSynthesis.cancel();
    };
    rec.onspeechstart = () => energia(1);
    rec.onresult = (ev) => {
      let parcial = "", final = "";
      for (const r of ev.results) (r.isFinal ? (final += r[0].transcript) : (parcial += r[0].transcript));
      transcricao.textContent = `“${(final || parcial).trim()}”`;
      if (final) {
        estado.textContent = "Entendido.";
        executar(final.trim());
      }
    };
    rec.onerror = (ev) => {
      estado.textContent = {
        "not-allowed": "Microfone bloqueado. Libere o microfone para este site no ícone de cadeado da barra de endereço.",
        "service-not-allowed": "Microfone bloqueado. Libere o microfone para este site no ícone de cadeado da barra de endereço.",
        "no-speech": "Não ouvi nada. Toque de novo e fale.",
        "audio-capture": "Nenhum microfone encontrado.",
        network: "Sem conexão com o serviço de voz do navegador.",
      }[ev.error] || `Falha na voz: ${ev.error}`;
    };
    rec.onend = () => {
      parar();
      if (estado.textContent === "Ouvindo…") estado.textContent = "Toque no microfone e fale.";
    };
    try {
      rec.start();
    } catch (e) {
      estado.textContent = `Não foi possível iniciar a voz: ${e.message}`;
    }
  });

  signal.addEventListener("abort", () => {
    try { rec?.abort(); } catch { /* ja parado */ }
    if (temFala) speechSynthesis.cancel();
  });
}

function iconeMicrofone() {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  const traco = { fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round" };
  return [
    el("rect", { x: "9", y: "3", width: "6", height: "11", rx: "3", ...traco }),
    el("path", { d: "M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7", ...traco }),
  ];
}
