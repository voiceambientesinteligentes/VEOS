// Tela: sala de reuniao mediada pela Secretaria. Ate 3 participantes, consulta
// em serie; o transcrito mostra somente respostas registradas.

import { api } from "../../data/api.js";
import { formatDateTime } from "../../domain/format.js";
import { EXECUTIVE_ORDER, MAX_MEETING, groupByMeeting, toggleParticipant } from "../../domain/rooms.js";
import { messageNode, mountChat } from "../chat.js";
import { h, pill } from "../dom.js";
import { roomName } from "../shell.js";

const STATUS_TONE = { concluida: "ok", "em andamento": "live", "concluida parcial": "warn" };

export async function renderMeeting(root, _route, { signal }) {
  let selected = [];
  let meetings = new Map();

  const hint = h("span", { class: "field-hint", "aria-live": "polite" });
  const chips = h("div", { class: "choice-chips", role: "group", "aria-labelledby": "meet-part-label" });
  const boxes = EXECUTIVE_ORDER.map((id) => {
    const input = h("input", { type: "checkbox", value: id });
    input.addEventListener("change", () => {
      selected = toggleParticipant(selected, id);
      sync();
    });
    chips.append(h("label", { class: "choice-chip" }, input, `${roomName(id)[0]} · ${roomName(id)[1]}`));
    return input;
  });

  function sync() {
    for (const b of boxes) {
      b.checked = selected.includes(b.value);
      b.disabled = !b.checked && selected.length >= MAX_MEETING;
    }
    hint.textContent = selected.length
      ? `Ordem de fala: ${selected.map((id) => roomName(id)[0]).join(" → ")} → ata da Secretaria. ${selected.length}/${MAX_MEETING}.`
      : `Selecione de 1 a ${MAX_MEETING} participantes.`;
  }
  sync();

  const controls = h(
    "div",
    { class: "field" },
    h("span", { class: "field-label", id: "meet-part-label" }, "Participantes"),
    chips,
    hint,
  );

  function renderTranscript(log, list) {
    const groups = groupByMeeting(list);
    for (const [id, msgs] of groups) {
      const info = meetings.get(id);
      log.append(
        h(
          "section",
          { class: "meeting-block", "aria-label": "Reunião" },
          h(
            "div",
            { class: "meeting-meta" },
            info ? pill(info.status, STATUS_TONE[info.status] || "neutral") : null,
            info ? h("span", null, `${info.participants.map((p) => roomName(p)[0]).join(", ")} · ${formatDateTime(info.created_at)}`) : null,
          ),
          msgs.map(messageNode),
        ),
      );
    }
  }

  async function loadMeetings() {
    try {
      const r = await api.meetings();
      meetings = new Map(r.reunioes.map((m) => [m.id, m]));
    } catch {
      /* status das reunioes e opcional para exibir o transcrito */
    }
  }
  await loadMeetings();

  const chatBox = h("div");
  root.append(
    h(
      "header",
      { class: "room-head" },
      h("div", { class: "room-emblem", "aria-hidden": "true" }, "REU"),
      h(
        "div",
        null,
        h("span", { class: "eyebrow" }, "Mediação · Secretaria"),
        h("h1", null, "Sala de reunião"),
        h("p", null, "Cada participante é consultado em série e vê as falas anteriores desta reunião. A Secretaria redige a ata usando somente respostas registradas; falhas aparecem como falhas."),
      ),
    ),
    h("div", { class: "stack" }, chatBox),
  );

  const chat = mountChat(chatBox, {
    room: "reuniao",
    signal,
    controls,
    placeholder: "Tópico da reunião…",
    emptyText: "Nenhuma reunião registrada.",
    render: renderTranscript,
    send: async (topic) => {
      if (!selected.length) throw new Error(`Selecione de 1 a ${MAX_MEETING} participantes.`);
      const r = await api.startMeeting(topic, selected);
      await loadMeetings();
      pollMeetingStatus();
      return r;
    },
  });

  if ([...meetings.values()].some((m) => m.status === "em andamento")) pollMeetingStatus();

  function pollMeetingStatus() {
    // o componente de conversa acompanha o job; aqui so atualizamos o status exibido
    const t = setInterval(async () => {
      if (signal.aborted) return clearInterval(t);
      await loadMeetings();
      chat.redraw();
      if (![...meetings.values()].some((m) => m.status === "em andamento")) clearInterval(t);
    }, 3000);
  }
}
