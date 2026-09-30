// Dominio: salas, rotas do portal e regras de selecao de reuniao.

export const EXECUTIVE_ORDER = ["ceo", "cfo", "coo", "cio", "cmo", "cso"];
export const MAX_MEETING = 3;
export const ENGINE_LABEL = "Claude Code • perfil consultivo";

export function parseRoute(hash) {
  const h = String(hash || "").replace(/^#\/?/, "");
  const [a, b] = h.split("/");
  if (a === "sala" && EXECUTIVE_ORDER.includes(b)) return { view: b === "cfo" ? "cfo" : "room", room: b };
  if (a === "secretaria") return { view: "secretaria", room: "secretaria" };
  if (a === "reuniao") return { view: "meeting", room: "reuniao" };
  if (a === "parametros") return { view: "params" };
  if (a === "integracoes") return { view: "integrations" };
  if (a === "voice360") return { view: "voice360" };
  return { view: "overview" };
}

export function routeHref(r) {
  if (r.view === "room" || r.view === "cfo") return `#/sala/${r.room}`;
  if (r.view === "secretaria") return "#/secretaria";
  if (r.view === "meeting") return "#/reuniao";
  if (r.view === "params") return "#/parametros";
  if (r.view === "integrations") return "#/integracoes";
  if (r.view === "voice360") return "#/voice360";
  return "#/visao";
}

export function toggleParticipant(selected, id) {
  if (!EXECUTIVE_ORDER.includes(id)) return selected;
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  if (selected.length >= MAX_MEETING) return selected;
  return EXECUTIVE_ORDER.filter((x) => x === id || selected.includes(x));
}

export function faixaTone(faixa) {
  switch (faixa) {
    case "VERDE":
    case "NAO ACIONADO":
      return "ok";
    case "ACEITAVEL":
    case "ATENCAO":
      return "warn";
    case "NAO APROVADO":
    case "ACIONADO":
      return "risk";
    default:
      return "neutral";
  }
}

const FAIXA_LABEL = {
  VERDE: "VERDE",
  ACEITAVEL: "ACEITÁVEL",
  ATENCAO: "ATENÇÃO",
  "NAO APROVADO": "NÃO APROVADO",
  ACIONADO: "ACIONADO",
  "NAO ACIONADO": "NÃO ACIONADO",
  "NAO RESOLVIDO": "NÃO RESOLVIDO",
  "NAO RESOLVIDO (falha fechada)": "NÃO RESOLVIDO (falha fechada)",
};
export const faixaLabel = (f) => FAIXA_LABEL[f] || f || "—";

export function jobStateLabel(status) {
  return { queued: "na fila", running: "em andamento", done: "concluído", failed: "falhou" }[status] || status;
}

// Agrupa mensagens da sala de reuniao por meeting_id, preservando a ordem.
export function groupByMeeting(messages) {
  const groups = new Map();
  for (const m of messages) {
    const id = m.meta?.meeting_id || "sem-reuniao";
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(m);
  }
  return groups;
}
