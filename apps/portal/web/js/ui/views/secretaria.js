// Tela: Secretaria - encaminha ao perfil escolhido (ou por roteamento simples e
// transparente) e, se pedido, sintetiza com atribuicao.

import { api } from "../../data/api.js";
import { EXECUTIVE_ORDER } from "../../domain/rooms.js";
import { mountChat } from "../chat.js";
import { clear, h } from "../dom.js";
import { roomName } from "../shell.js";

function flow() {
  return h(
    "ol",
    { class: "flow", "aria-label": "Como a Secretaria trabalha" },
    h("li", null, h("strong", null, "Pergunta"), "Você escreve aqui."),
    h("li", null, h("strong", null, "Encaminhamento"), "Sua escolha, ou palavras-chave com o motivo exibido."),
    h("li", null, h("strong", null, "Perfil responde"), "Com o histórico da Secretaria, nunca o da sala privada."),
    h("li", null, h("strong", null, "Síntese opcional"), "A Secretaria resume e atribui ao perfil."),
  );
}

export async function renderSecretaria(root, _route, { signal }) {
  const target = h(
    "select",
    { class: "select", id: "sec-target" },
    h("option", { value: "auto" }, "Automático (palavras-chave)"),
    EXECUTIVE_ORDER.map((id) => h("option", { value: id }, `${roomName(id)[0]} — ${roomName(id)[1]}`)),
  );
  const modes = h(
    "div",
    { class: "segmented", role: "radiogroup", "aria-label": "Forma da resposta" },
    h("label", null, h("input", { type: "radio", name: "sec-mode", value: "direto", checked: true }), "Resposta direta do perfil"),
    h("label", null, h("input", { type: "radio", name: "sec-mode", value: "sintese" }), "Síntese da Secretaria"),
  );
  const preview = h("p", { class: "route-preview", "aria-live": "polite" });
  const controls = h(
    "div",
    { class: "row" },
    h("div", { class: "field" }, h("label", { class: "field-label", for: "sec-target" }, "Encaminhar para"), target),
    h("div", { class: "field" }, h("span", { class: "field-label" }, "Resposta"), modes),
  );

  const chatBox = h("div");
  root.append(
    h(
      "header",
      { class: "room-head" },
      h("div", { class: "room-emblem", "aria-hidden": "true" }, "SEC"),
      h("div", null, h("span", { class: "eyebrow" }, "Mediação"), h("h1", null, "Secretaria"), h("p", null, "Encaminha sua pergunta a um perfil consultivo e, se você quiser, entrega uma síntese com atribuição.")),
    ),
    h("details", { class: "disclosure" }, h("summary", null, "Como a Secretaria trabalha"), flow()),
    h("div", { class: "stack" }, chatBox),
  );

  const chat = mountChat(chatBox, {
    room: "secretaria",
    signal,
    controls: h("div", { class: "stack-s" }, controls, preview),
    placeholder: "O que você precisa? A Secretaria encaminha.",
    emptyText: "Nenhum encaminhamento ainda.",
    send: (text) => api.secretaria(text, target.value, modes.querySelector("input:checked").value),
  });

  let timer = 0;
  async function updatePreview() {
    const text = chat.input.value.trim();
    clear(preview);
    if (target.value !== "auto") {
      preview.append("Será encaminhado para ", h("b", null, roomName(target.value)[0]), " — escolha explícita.");
      return;
    }
    if (!text) {
      preview.append("Sem texto: o encaminhamento automático aparece aqui antes do envio.");
      return;
    }
    try {
      const r = await api.route(text);
      if (signal.aborted) return;
      clear(preview).append("Seria encaminhado para ", h("b", null, roomName(r.room)[0]), ` — ${r.reason}.`);
    } catch (e) {
      clear(preview).append(e.message);
    }
  }
  chat.input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(updatePreview, 350);
  });
  target.addEventListener("change", updatePreview);
  signal.addEventListener("abort", () => clearTimeout(timer));
  updatePreview();
}
