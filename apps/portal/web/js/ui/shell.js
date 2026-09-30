// Apresentacao: moldura do portal - menu lateral, gaveta mobile e estado de conexao.

import { formatDateTime } from "../domain/format.js";
import { EXECUTIVE_ORDER, routeHref } from "../domain/rooms.js";
import { clear, h, pill } from "./dom.js";

const NAMES = {
  ceo: ["CEO", "Direção geral"],
  cfo: ["CFO", "Finanças"],
  coo: ["COO", "Operações"],
  cio: ["CIO", "Tecnologia e dados"],
  cmo: ["CMO", "Marketing"],
  cso: ["CSO", "Vendas"],
};
export const roomName = (id) => NAMES[id] || [id.toUpperCase(), ""];

function link(href, sigla, text, count) {
  return h(
    "a",
    { class: "nav-link", href },
    h("span", { class: "nav-sigla", "aria-hidden": "true" }, sigla),
    h("span", { class: "nav-text" }, text),
    count ? h("span", { class: "nav-count", "aria-label": `${count} mensagens` }, String(count)) : null,
  );
}

export function renderNav(nav, rooms) {
  const counts = Object.fromEntries((rooms?.salas || []).map((r) => [r.id, r.mensagens]));
  clear(nav).append(
    h("div", { class: "nav-group" }, link("#/visao", "◎", "Visão geral")),
    h(
      "div",
      { class: "nav-group", role: "group", "aria-labelledby": "nav-exec" },
      h("span", { class: "nav-label", id: "nav-exec" }, "Salas executivas"),
      EXECUTIVE_ORDER.map((id) => link(routeHref({ view: "room", room: id }), NAMES[id][0], NAMES[id][1], counts[id])),
    ),
    h(
      "div",
      { class: "nav-group", role: "group", "aria-labelledby": "nav-sec" },
      h("span", { class: "nav-label", id: "nav-sec" }, "Mediação"),
      link("#/secretaria", "SEC", "Secretaria", counts.secretaria),
      link("#/reuniao", "REU", "Sala de reunião", rooms?.reuniao?.mensagens),
    ),
    h(
      "div",
      { class: "nav-group", role: "group", "aria-labelledby": "nav-sim" },
      h("span", { class: "nav-label", id: "nav-sim" }, "Simulação"),
      link("#/parametros", "%", "Parâmetros CFO"),
    ),
    h(
      "div",
      { class: "nav-group", role: "group", "aria-labelledby": "nav-int" },
      h("span", { class: "nav-label", id: "nav-int" }, "Integrações e contexto"),
      link("#/integracoes", "ZOHO", "Integrações Zoho"),
      link("#/voice360", "V360", "Contexto VOICE_360"),
    ),
  );
}

export function markActive(nav, href) {
  for (const a of nav.querySelectorAll("a.nav-link")) {
    if (a.getAttribute("href") === href) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

export function connectionSummary(status, error) {
  if (error) return { tone: "risk", text: "Servidor local inacessível", detail: error };
  if (!status) return { tone: "neutral", text: "Verificando conexão…", detail: "" };
  const p = status.provedor;
  const last = p.ultima_chamada;
  if (!p.executavel_encontrado) return { tone: "risk", text: "Claude Code não encontrado", detail: "Conversas indisponíveis; nenhuma resposta será gerada." };
  if (last.ok === false) return { tone: "warn", text: "Última chamada falhou", detail: `${last.detail} · ${formatDateTime(last.at)}` };
  if (last.ok === true) return { tone: "ok", text: "Claude Code respondeu", detail: `Última resposta ${formatDateTime(last.at)}` };
  return { tone: "neutral", text: "Claude Code encontrado", detail: "Sem chamadas nesta sessão do servidor." };
}

export function renderStatus(box, status, error) {
  const c = connectionSummary(status, error);
  const jobs = status?.jobs?.em_fila_ou_execucao;
  clear(box).append(
    h("div", { class: "stack-s" }, pill(c.text, c.tone), c.detail ? h("span", { class: "muted" }, c.detail) : null, jobs ? pill(`${jobs} em andamento`, "live") : null),
  );
}

export function setupDrawer({ sidebar, toggle, backdrop }) {
  const mq = window.matchMedia("(max-width: 960px)");
  const isOpen = () => sidebar.classList.contains("is-open");

  function open() {
    sidebar.classList.add("is-open");
    backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
    sidebar.querySelector("a.nav-link[aria-current='page'], a.nav-link")?.focus();
  }
  function close(returnFocus = true) {
    if (!isOpen()) return;
    sidebar.classList.remove("is-open");
    backdrop.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener("click", () => (isOpen() ? close() : open()));
  backdrop.addEventListener("click", () => close());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
    if (e.key === "Tab" && isOpen() && mq.matches) {
      // mantem o foco dentro da gaveta enquanto aberta
      const items = [...sidebar.querySelectorAll("a, button, [tabindex]:not([tabindex='-1'])")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  mq.addEventListener("change", () => close(false));
  return { close };
}
