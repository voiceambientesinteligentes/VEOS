// Tela: sala executiva individual (conversa com historico proprio).

import { api } from "../../data/api.js";
import { ENGINE_LABEL } from "../../domain/rooms.js";
import { mountChat } from "../chat.js";
import { h } from "../dom.js";
import { roomName } from "../shell.js";

const FOCO = {
  ceo: "Estratégia, prioridades, alocação entre áreas e trade-offs da empresa.",
  cfo: "Caixa, margem de contribuição, exposição, orçamento e risco financeiro.",
  coo: "Execução de projetos, instalação, prazos, fornecedores e capacidade.",
  cio: "Sistemas, dados, integrações, segurança da informação e automação interna.",
  cmo: "Marca, posicionamento, campanhas, conteúdo e geração de demanda.",
  cso: "Pipeline, propostas, negociação, previsão comercial e relacionamento com clientes.",
};

export function roomHeader(id) {
  const [sigla, nome] = roomName(id);
  return h(
    "header",
    { class: "room-head" },
    h("div", { class: "room-emblem", "aria-hidden": "true" }, sigla),
    h(
      "div",
      null,
      h("span", { class: "eyebrow" }, "Sala executiva · perfil consultivo"),
      h("h1", null, `${sigla} — ${nome}`),
      h("p", null, FOCO[id]),
    ),
  );
}

export function roomChat(container, id, signal) {
  const [sigla] = roomName(id);
  return mountChat(container, {
    room: id,
    signal,
    send: (text) => api.sendChat(id, text),
    placeholder: `Pergunte ao ${sigla}…`,
    emptyText: `Nenhuma conversa com o ${sigla} ainda. O histórico desta sala é só desta sala.`,
  });
}

export async function renderRoom(root, { room }, { signal }) {
  const chatBox = h("div");
  root.append(
    roomHeader(room),
    h(
      "p",
      { class: "notice" },
      `${ENGINE_LABEL}. Respostas são sugestões para sua decisão; o perfil não executa ações, não aprova nada e não acessa Zoho, arquivos ou sistemas.`,
    ),
    h("div", { class: "stack" }, chatBox),
  );
  roomChat(chatBox, room, signal);
}
