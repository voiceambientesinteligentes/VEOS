// Tela: Integracoes Zoho. Estados separados por app (oferta, conta, servidor,
// leitura, dados, acao), progresso por contagens reais e somente acoes que existem:
// healthcheck (claude mcp list) e tres leituras de verificacao. Nenhum botao conecta
// conta ou concede permissao: isso segue o guia MCP oficial, fora do portal.

import { api } from "../../data/api.js";
import { integrationProgress, stateTone } from "../../domain/controls.js";
import { formatDateTime } from "../../domain/format.js";
import { pollJob } from "../../service/jobs.js";
import { progressNode } from "../chat.js";
import { clear, errorNotice, h, method, panel, stamp, table } from "../dom.js";

const ESTADOS = [
  ["oferta", "Oferta"],
  ["conta", "Conta"],
  ["servidor", "Servidor"],
  ["leitura", "Leitura"],
  ["dados", "Dados"],
  ["acao", "Ação"],
];

function progressList(p) {
  return h("ul", { class: "count-list" }, integrationProgress(p).map((r) => h("li", null, h("b", null, r.total === null ? String(r.count) : `${r.count} de ${r.total}`), h("span", null, r.label))));
}

function healthEvidence(hc) {
  if (!hc) return h("p", { class: "muted" }, "Nenhum healthcheck registrado. Os estados de servidor aparecem como não verificados.");
  return method(
    `Último healthcheck ${formatDateTime(hc.em)} — ${hc.ok ? "concluído" : "falhou"}`,
    `Comando: ${hc.comando} · código de saída ${hc.codigo_saida ?? "—"} · ${hc.duracao_ms ?? "—"} ms`,
    hc.erro ? `Erro: ${hc.erro}` : null,
    (hc.servidores_zoho || []).length ? `Servidores Zoho: ${hc.servidores_zoho.map((s) => `${s.servidor} → ${s.status}`).join("; ")}` : "Nenhum servidor Zoho listado.",
    hc.outros_servidores ? `Outros servidores (não Zoho): ${hc.outros_servidores.total}` : null,
    "Somente nome e estado são guardados; endpoints, tokens e saída bruta são descartados.",
  );
}

function probeEvidence(a) {
  const e = a.evidencia_probe;
  if (!a.probe) return null;
  if (!e) return h("span", { class: "muted" }, `Leitura disponível: ${a.probe_ferramenta}`);
  return method(`Leitura ${formatDateTime(e.em)}`, `Operação: ${e.ferramenta}`, e.erro ? `Erro: ${e.erro}` : `tool_use e tool_result verificados · ${e.resultado_bytes} bytes · itens ${e.itens ?? "—"}`, "Conteúdo não é guardado; os dados não entram em indicador.");
}

function appRow(a) {
  return [
    h("div", { class: "stack-s" }, h("span", { class: "app-name" }, a.nome), a.nota ? h("span", { class: "field-hint" }, a.nota) : null, probeEvidence(a)),
    ...ESTADOS.map(([k]) => stamp(a.estados[k], stateTone(a.estados[k]))),
  ];
}

export async function renderIntegrations(root, _route, { signal }) {
  const progressBox = h("div");
  const actionsBox = h("div", { class: "stack-s" });
  const tableBox = h("div");
  const jobLine = h("div", { class: "progress-line", "aria-live": "polite" });
  const filter = h("input", { class: "input", id: "int-filtro", type: "search", placeholder: "Filtrar por nome", autocomplete: "off" });
  let payload = null;
  let busy = false;

  root.append(
    h("header", { class: "view-head" }, h("div", null, h("span", { class: "eyebrow" }, "Integrações · Zoho MCP"), h("h1", null, "Integrações Zoho"), h("p", null, "Catálogo oficial não significa contratado nem conectado. Conexão não significa dados confiáveis: nenhum dado Zoho entra em indicador ou diagnóstico."))),
    h("div", { class: "stack" }, progressBox, actionsBox, tableBox),
  );

  async function runJob(start, label) {
    if (busy) return;
    busy = true;
    actionsBox.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    clear(jobLine).append(h("span", { class: "step is-running" }, `${label}…`));
    try {
      const r = await start();
      const job = await pollJob(r.job, { signal, onUpdate: (j) => clear(jobLine).append(...progressNode(j)) });
      if (job) clear(jobLine).append(...progressNode(job));
    } catch (e) {
      clear(jobLine).append(h("span", { class: "step is-failed" }, e.message));
    } finally {
      busy = false;
      await load();
    }
  }

  const holder = h("div");
  function drawTable() {
    const q = filter.value.trim().toLowerCase();
    const apps = payload.apps.filter((a) => !q || a.nome.toLowerCase().includes(q));
    clear(holder).append(table({ head: ["Serviço", ...ESTADOS.map(([, l]) => l)], rows: apps.map(appRow) }));
    if (!tableBox.firstChild) {
      tableBox.append(
        panel(
          { title: "Serviços do catálogo oficial", subtitle: `${payload.catalogo.aviso} Fonte: ${payload.catalogo.url} (consultado em ${payload.catalogo.consultado_em}).` },
          h("div", { class: "row" }, h("label", { class: "field-label", for: "int-filtro" }, "Filtro"), filter),
          holder,
        ),
      );
    }
  }
  filter.addEventListener("input", () => payload && drawTable());

  async function load() {
    try {
      payload = await api.integracoes();
    } catch (e) {
      clear(progressBox).append(errorNotice(`Integrações indisponíveis: ${e.message}`));
      return;
    }
    if (signal.aborted) return;
    clear(progressBox).append(panel({ title: "Progresso verificável", subtitle: "Contagens de estados registrados. Não há percentual global." }, progressList(payload.progresso)));
    clear(actionsBox).append(
      panel(
        { title: "Verificações", subtitle: "Somente leitura. Executadas pelo Claude Code local, sem shell, com tempo limite; falha aparece como erro, nunca como zero." },
        h(
          "div",
          { class: "row" },
          h("button", { class: "btn btn-primary", type: "button", disabled: busy, onclick: () => runJob(api.healthcheck, "Executando healthcheck") }, "Executar healthcheck (claude mcp list)"),
          payload.probes.map((p) => h("button", { class: "btn", type: "button", disabled: busy, title: p.ferramenta, onclick: () => runJob(() => api.probe(p.id), `Lendo ${p.app}`) }, `Testar leitura ${p.app}`)),
        ),
        jobLine,
        healthEvidence(payload.healthcheck),
        method("Como os demais apps são autorizados", "Pelo guia oficial do Zoho MCP (OAuth, permissões do usuário), fora do portal:", h("a", { href: payload.catalogo.guia, target: "_blank", rel: "noopener noreferrer" }, payload.catalogo.guia), "O portal não configura contas, não concede permissões e não executa escrita em nenhum app."),
      ),
    );
    drawTable();
  }
  await load();
}
