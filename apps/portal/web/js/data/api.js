// Camada de dados: unico ponto de acesso HTTP ao servidor local.
// Escritas levam o token CSRF da sessao; nenhuma URL externa e usada.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let csrf = null;

async function request(method, path, body) {
  const opts = {
    method,
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
  };
  if (method !== "GET") {
    if (!csrf) await session();
    opts.headers["Content-Type"] = "application/json";
    opts.headers["X-VEOS-CSRF"] = csrf;
    opts.body = JSON.stringify(body ?? {});
  }
  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new ApiError(0, "Servidor local inacessível. Verifique se a janela do portal está aberta.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new ApiError(res.status, data?.erro || `Falha HTTP ${res.status}`);
  return data;
}

const q = (params) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const t = s.toString();
  return t ? `?${t}` : "";
};

export async function session() {
  const s = await request("GET", "/api/session");
  csrf = s.csrf;
  return s;
}

export const api = {
  session,
  status: () => request("GET", "/api/status"),
  rooms: () => request("GET", "/api/rooms"),
  messages: (room, after = 0) => request("GET", `/api/rooms/${encodeURIComponent(room)}/messages${q({ after })}`),
  sendChat: (room, text) => request("POST", `/api/rooms/${encodeURIComponent(room)}/messages`, { text }),
  secretaria: (text, target, mode) => request("POST", "/api/secretaria", { text, target, mode }),
  route: (text) => request("GET", `/api/route${q({ text })}`),
  meetings: () => request("GET", "/api/meetings"),
  startMeeting: (topic, participants) => request("POST", "/api/meetings", { topic, participants }),
  job: (id) => request("GET", `/api/jobs/${encodeURIComponent(id)}`),
  cfoAnalysis: ({ asOf, atraso, propostas } = {}) =>
    request("GET", `/api/cfo/analysis${q({ as_of: asOf, atraso, propostas: (propostas || []).join(",") })}`),
  settings: () => request("GET", "/api/settings"),
  saveSettings: (rascunho) => request("PUT", "/api/settings", { rascunho }),
  resetSettings: () => request("DELETE", "/api/settings", {}),
  briefing: (periodo) => request("GET", `/api/cfo/briefing${q({ periodo })}`),
  indicadores: (periodo) => request("GET", `/api/cfo/indicadores${q({ periodo })}`),
  formularios: () => request("GET", "/api/cfo/formularios"),
  controle: (tipo, entrada) => request("POST", `/api/cfo/controles/${encodeURIComponent(tipo)}`, { entrada }),
  vigiaOrcamento: (entrada) => request("POST", "/api/vigia/orcamento", { entrada }),
  metodologias: () => request("GET", "/api/cfo/metodologias"),
  saveMetodologias: (rascunho) => request("PUT", "/api/cfo/metodologias", { rascunho }),
  resetMetodologias: () => request("DELETE", "/api/cfo/metodologias", {}),
  decisoes: () => request("GET", "/api/cfo/decisoes"),
  registrarDecisao: (body) => request("POST", "/api/cfo/decisoes", body),
  integracoes: () => request("GET", "/api/integracoes"),
  healthcheck: () => request("POST", "/api/integracoes/health", {}),
  probe: (probe) => request("POST", "/api/integracoes/probe", { probe }),
  voice360: () => request("GET", "/api/voice360"),
};
