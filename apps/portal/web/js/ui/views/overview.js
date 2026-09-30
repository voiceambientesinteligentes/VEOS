// Tela: visao geral. Mostra somente estado real (servidor, provedor, historicos,
// motor CFO). Nenhum indicador de negocio e exibido aqui.

import { api } from "../../data/api.js";
import { formatDateTime } from "../../domain/format.js";
import { ENGINE_LABEL, EXECUTIVE_ORDER } from "../../domain/rooms.js";
import { h, panel, pill } from "../dom.js";
import { connectionSummary, roomName } from "../shell.js";

function orbit() {
  return h(
    "div",
    { class: "orbit", "aria-hidden": "true", "data-parallax": "-0.08" },
    h("div", { class: "orbit-cross" }),
    h("div", { class: "orbit-ring" }),
    h("div", { class: "orbit-ring r2" }),
    h("div", { class: "orbit-ring r3" }),
    h("div", { class: "orbit-ring r4" }),
    h("div", { class: "orbit-arm a1" }, h("span", { class: "orbit-node" })),
    h("div", { class: "orbit-arm a2" }, h("span", { class: "orbit-node" })),
    h("div", { class: "orbit-arm a3" }, h("span", { class: "orbit-node" })),
    h("div", { class: "orbit-core" }),
  );
}

function hero() {
  return h(
    "section",
    { class: "hero", "aria-labelledby": "hero-title" },
    h(
      "div",
      { class: "hero-copy" },
      h("span", { class: "eyebrow" }, "VOICE · VEOS Portal"),
      h("h1", { id: "hero-title" }, "Seu centro de ", h("em", null, "comando executivo")),
      h(
        "p",
        null,
        "Converse com cada gerente, reúna as perspectivas da equipe e explore seus cenários financeiros. " +
          "A Secretaria conecta suas perguntas às salas certas.",
      ),
      h(
        "div",
        { class: "hero-actions" },
        h("a", { class: "btn btn-primary", href: "#/secretaria" }, "Falar com a Secretaria"),
        h("a", { class: "btn", href: "#/sala/cfo" }, "Abrir sala CFO"),
        h("a", { class: "btn btn-ghost", href: "#/reuniao" }, "Sala de reunião"),
      ),
    ),
    orbit(),
  );
}

function roomCard(id, sigla, nome, info, href) {
  return h(
    "a",
    { class: "room-card reveal", href },
    h("div", { class: "room-card-top" }, h("span", { class: "sigla" }, sigla), info?.mensagens ? pill(`${info.mensagens} msg`, "neutral") : pill("sem histórico", "neutral")),
    h("p", null, nome),
    h("div", { class: "room-card-foot" }, h("span", null, info?.ultima ? `Última atividade ${formatDateTime(info.ultima)}` : "Nenhuma conversa ainda"), h("span", { "aria-hidden": "true" }, "→")),
  );
}

function statusPanel(status, error) {
  const c = connectionSummary(status, error);
  if (!status) return panel({ title: "Conexão" }, pill(c.text, c.tone), h("p", { class: "muted" }, c.detail));
  const p = status.provedor;
  const hist = status.jobs.historico || {};
  return panel(
    { title: "Conexão", subtitle: "Disponibilidade das conversas e do painel." },
    h(
      "dl",
      { class: "status-list" },
      h("dt", null, "Servidor"),
      h("dd", { class: "mono" }, status.servidor.endereco),
      h("dt", null, "Motor"),
      h("dd", null, ENGINE_LABEL),
      h("dt", null, "Estado"),
      h("dd", null, pill(c.text, c.tone)),
      h("dt", null, "Detalhe"),
      h("dd", null, c.detail || "—"),
      h("dt", null, "Fila"),
      h("dd", null, `${status.jobs.em_fila_ou_execucao} em andamento · limite ${status.jobs.limite_concorrencia} simultâneas`),
      h("dt", null, "Jobs registrados"),
      h("dd", null, `${hist.done || 0} concluídos · ${hist.failed || 0} com falha`),
      h("dt", null, "Tempo limite"),
      h("dd", null, `${p.timeout_s}s por chamada`),
    ),
  );
}

function scopePanel(status, cfo, cfoError) {
  const ok = status?.cfo?.disponivel;
  const items = cfo?.escopo || [];
  const done = items.filter((e) => e.status.startsWith("IMPLEMENTADO -")).length;
  return panel(
    { title: "Módulos disponíveis", subtitle: "Recursos ativos e próximos passos." },
    h(
      "ul",
      { class: "list-plain" },
      h("li", null, "Conversas: perfis consultivos simulados pelo Claude Code; não executam ações nem acessam sistemas."),
      h("li", null, ok ? `CFO: motor TESTE disponível — ${done} de ${items.length} etapas implementadas com dados sintéticos; ${cfo?.pendencias?.length ?? "?"} pendências declaradas.` : `CFO: motor indisponível (${status?.cfo?.erro || cfoError || "verificando"}).`),
      h("li", null, "Demais salas (CEO, COO, CIO, CMO, CSO): somente conversa; sem painéis de dados."),
      h("li", null, "Parâmetros percentuais: apenas simulação; regras oficiais inalteradas."),
      h("li", null, status?.cfo_controles?.disponivel ? `CFO — controles, indicadores e briefing: base TESTE ${status.cfo_controles.fixture} (períodos ${status.cfo_controles.periodos.join(", ")}).` : `CFO — controles: base TESTE indisponível (${status?.cfo_controles?.erro || "verificando"}).`),
      h("li", null, "Integrações Zoho: estados verificáveis por healthcheck e leituras de teste; nenhum dado Zoho entra em indicador."),
    ),
    h("a", { class: "btn btn-ghost", href: "#/sala/cfo" }, "Ver pendências do CFO"),
  );
}

export async function renderOverview(root) {
  root.append(hero());
  const statusBox = h("div", { class: "grid-2" });
  const roomsBox = h("div", { class: "grid-4" });
  root.append(
    h("div", { class: "stack-s" }, h("h2", null, "Suas salas"), h("p", { class: "muted" }, "Uma conversa individual com cada área. Encaminhamentos e reuniões mediados pela Secretaria."), roomsBox),
    h("details", { class: "panel" }, h("summary", null, "Conexões e disponibilidade dos módulos"), statusBox),
  );
  root.firstChild.nextSibling.classList.add("reveal");

  const [status, rooms, cfo] = await Promise.allSettled([api.status(), api.rooms(), api.cfoAnalysis()]);
  const st = status.status === "fulfilled" ? status.value : null;
  statusBox.append(statusPanel(st, status.reason?.message), scopePanel(st, cfo.value, cfo.reason?.message));

  const info = Object.fromEntries((rooms.value?.salas || []).map((r) => [r.id, r]));
  for (const id of EXECUTIVE_ORDER) {
    const [sigla, nome] = roomName(id);
    roomsBox.append(roomCard(id, sigla, nome, info[id], `#/sala/${id}`));
  }
  roomsBox.append(roomCard("secretaria", "SEC", "Secretaria — encaminhamento e síntese", info.secretaria, "#/secretaria"));
  roomsBox.append(roomCard("reuniao", "REU", "Sala de reunião mediada", rooms.value?.reuniao, "#/reuniao"));
  if (rooms.status === "rejected") roomsBox.append(h("p", { class: "notice notice-risk" }, rooms.reason.message));
}
