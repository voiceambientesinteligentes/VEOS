// Entrada do portal: sessao, moldura, roteamento por hash e estado de conexao.

import { api, session } from "./data/api.js";
import { parseRoute, routeHref } from "./domain/rooms.js";
import { appStore } from "./service/store.js";
import { clear, errorNotice, h } from "./ui/dom.js";
import { enableMotion } from "./ui/motion.js";
import { markActive, renderNav, renderStatus, roomName, setupDrawer } from "./ui/shell.js";
import { renderCfo } from "./ui/views/cfo.js";
import { renderIntegrations } from "./ui/views/integrations.js";
import { renderVoice360 } from "./ui/views/voice360.js";
import { renderMeeting } from "./ui/views/meeting.js";
import { renderOverview } from "./ui/views/overview.js";
import { renderParams } from "./ui/views/params.js";
import { renderRoom } from "./ui/views/room.js";
import { renderSecretaria } from "./ui/views/secretaria.js";

const VIEWS = {
  overview: { render: renderOverview, title: () => ["Visão geral", "Estado real do portal e das salas"] },
  room: { render: renderRoom, title: (r) => [`Sala ${roomName(r.room)[0]}`, `${roomName(r.room)[1]} · perfil consultivo`] },
  cfo: { render: renderCfo, title: () => ["Sala CFO", "Briefing, controles e indicadores sobre base TESTE · conversa consultiva"] },
  secretaria: { render: renderSecretaria, title: () => ["Secretaria", "Encaminhamento transparente e síntese com atribuição"] },
  meeting: { render: renderMeeting, title: () => ["Sala de reunião", "Até 3 perfis, em série, mediados pela Secretaria"] },
  params: { render: renderParams, title: () => ["Parâmetros CFO", "Rascunho de simulação — regras oficiais inalteradas"] },
  integrations: { render: renderIntegrations, title: () => ["Integrações Zoho", "Estados verificáveis · somente leitura · nenhuma escrita"] },
  voice360: { render: renderVoice360, title: () => ["Contexto VOICE_360", "Políticas oficiais por hash · consolidação em rascunho"] },
};

const el = {
  view: document.getElementById("view"),
  nav: document.getElementById("nav"),
  status: document.getElementById("sidebar-status"),
  main: document.getElementById("conteudo"),
  title: document.getElementById("view-title"),
  sub: document.getElementById("view-sub"),
  enginePill: document.getElementById("engine-pill"),
};

let current = null;

async function navigate() {
  const route = parseRoute(location.hash);
  current?.abort.abort();
  current?.stopMotion?.();
  const abort = new AbortController();
  current = { abort };

  const def = VIEWS[route.view];
  const [title, sub] = def.title(route);
  el.title.textContent = title;
  el.sub.textContent = sub;
  document.title = `${title} · VEOS Portal`;
  markActive(el.nav, routeHref(route));
  drawer.close(false);

  const root = h("div", { class: "stack view-enter" });
  clear(el.view).append(root);
  window.scrollTo({ top: 0, behavior: "instant" });
  try {
    await def.render(root, route, { signal: abort.signal });
  } catch (e) {
    root.append(errorNotice(`Não foi possível abrir esta tela: ${e.message}`));
  }
  if (!abort.signal.aborted) current.stopMotion = enableMotion(root);
  el.main.focus({ preventScroll: true });
}

async function refreshStatus() {
  try {
    const [status, rooms] = await Promise.all([api.status(), api.rooms()]);
    appStore.set({ status, rooms, connection: "ok" });
    renderStatus(el.status, status, null);
    renderNav(el.nav, rooms);
    markActive(el.nav, routeHref(parseRoute(location.hash)));
    el.enginePill.className = `pill tone-${status.provedor.executavel_encontrado ? "ok" : "risk"}`;
  } catch (e) {
    appStore.set({ connection: "error" });
    renderStatus(el.status, null, e.message);
    el.enginePill.className = "pill tone-risk";
  }
}

const drawer = setupDrawer({
  sidebar: document.getElementById("sidebar"),
  toggle: document.getElementById("menu-toggle"),
  backdrop: document.getElementById("backdrop"),
});

async function start() {
  renderNav(el.nav, null);
  try {
    appStore.set({ session: await session() });
  } catch (e) {
    renderStatus(el.status, null, e.message);
  }
  if (!location.hash) history.replaceState(null, "", "#/visao");
  window.addEventListener("hashchange", navigate);
  await refreshStatus();
  navigate();
  setInterval(refreshStatus, 15000);
}

start();
