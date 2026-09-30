// Apresentacao: componente de conversa reutilizado pelas salas, Secretaria e
// Reuniao. Mensagens chegam do servidor e sao exibidas somente via textContent.

import { api } from "../data/api.js";
import { formatDateTime } from "../domain/format.js";
import { ENGINE_LABEL, jobStateLabel } from "../domain/rooms.js";
import { pollJob } from "../service/jobs.js";
import { clear, errorNotice, h } from "./dom.js";

export function messageNode(m) {
  const kind = m.meta?.kind;
  const cls = ["msg", `msg-${m.role}`];
  if (kind === "error") cls.push("msg-error");
  if (kind === "synthesis" || kind === "summary") cls.push("msg-synthesis");
  const label =
    kind === "synthesis"
      ? `Síntese da Secretaria — atribuição: ${(m.meta.attribution || []).join(", ")}`
      : kind === "summary"
        ? `Ata da Secretaria — baseada em: ${(m.meta.attribution || []).join(", ")}`
        : m.meta?.via === "secretaria"
          ? `${m.author} · via Secretaria`
          : m.author;
  return h(
    "article",
    { class: cls.join(" "), "aria-label": `${m.author}, ${formatDateTime(m.created_at)}` },
    m.role === "system" ? null : h("div", { class: "msg-head" }, h("span", { class: "msg-author" }, label), h("time", { datetime: m.created_at }, formatDateTime(m.created_at))),
    h("div", { class: "msg-body" }, m.content),
    m.role === "assistant" ? h("div", { class: "msg-engine" }, `${ENGINE_LABEL} — resposta registrada; não é decisão nem ação executada`) : null,
  );
}

export function progressNode(job) {
  const items = (job?.progress || []).map((p) =>
    h("span", { class: `step is-${p.state}` }, h("span", { class: "dot", "aria-hidden": "true" }), p.step),
  );
  if (job && (job.status === "queued" || (job.status === "running" && !items.length))) {
    items.unshift(h("span", { class: "step is-running" }, h("span", { class: "dot", "aria-hidden": "true" }), jobStateLabel(job.status)));
  }
  if (job?.status === "failed" && job.error) items.push(h("span", { class: "step is-failed" }, `Falhou: ${job.error}`));
  return items;
}

/**
 * Monta uma conversa.
 * opts.room: sala cujo historico e exibido.
 * opts.send(text): inicia o job no servidor e devolve {job}.
 * opts.filter(m): opcional, filtra mensagens exibidas.
 * opts.render(log, messages): opcional, renderizacao customizada do historico.
 * opts.controls: no DOM extra acima do campo de texto.
 */
export function mountChat(container, opts) {
  const { room, send, placeholder = "Escreva sua pergunta…", emptyText, controls, render, signal } = opts;
  let messages = [];
  let lastId = 0;
  let busy = false;

  const log = h("div", { class: "chat-log", role: "log", "aria-live": "polite", "aria-relevant": "additions", tabindex: "0", "aria-label": "Histórico da conversa" });
  const progress = h("div", { class: "progress-line", "aria-live": "polite" });
  const errorBox = h("div");
  const input = h("textarea", { class: "textarea", rows: 2, placeholder, "aria-label": "Mensagem", maxlength: "4000" });
  const btn = h("button", { class: "btn btn-primary", type: "submit" }, "Enviar");
  const counter = h("span", null, "0/4000");
  const form = h(
    "form",
    { class: "composer", novalidate: true },
    controls || null,
    h("div", { class: "composer-row" }, h("div", { class: "field grow" }, input), btn),
    h("div", { class: "composer-foot" }, h("span", null, "Enter envia · Shift+Enter quebra linha"), counter),
    progress,
    errorBox,
  );
  clear(container).append(h("div", { class: "chat" }, log, form));

  function draw() {
    const list = opts.filter ? messages.filter(opts.filter) : messages;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    clear(log);
    if (!list.length) log.append(h("p", { class: "chat-empty" }, emptyText || "Nenhuma mensagem nesta sala ainda."));
    else if (render) render(log, list);
    else for (const m of list) log.append(messageNode(m));
    if (nearBottom || busy) log.scrollTop = log.scrollHeight;
  }

  // Atualizacoes serializadas: nunca duas buscas com o mesmo 'after' em paralelo.
  let chain = Promise.resolve();
  function refresh() {
    chain = chain.then(async () => {
      try {
        const res = await api.messages(room, lastId);
        const novas = res.mensagens.filter((m) => m.id > lastId);
        if (novas.length) {
          messages = messages.concat(novas);
          lastId = messages[messages.length - 1].id;
          draw();
        }
      } catch (e) {
        clear(errorBox).append(errorNotice(e.message));
      }
    });
    return chain;
  }

  async function submit(text) {
    busy = true;
    btn.disabled = true;
    clear(errorBox);
    clear(progress);
    try {
      const started = await send(text);
      input.value = "";
      counter.textContent = "0/4000";
      await refresh();
      const job = await pollJob(started.job, {
        signal,
        onUpdate: async (j) => {
          clear(progress).append(...progressNode(j));
          await refresh();
        },
      });
      if (job) {
        await refresh();
        clear(progress).append(...progressNode(job));
      }
    } catch (e) {
      errorBox.append(errorNotice(e.message));
    } finally {
      busy = false;
      btn.disabled = false;
      if (!signal?.aborted) input.focus();
    }
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    submit(text);
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", () => {
    counter.textContent = `${input.value.length}/4000`;
  });

  draw();
  refresh();
  // Continua recebendo respostas ao voltar para uma sala com consulta em andamento.
  const refreshTimer = setInterval(() => { if (!signal?.aborted) refresh(); }, 3000);
  signal?.addEventListener("abort", () => clearInterval(refreshTimer), { once: true });
  return { refresh, input, redraw: draw };
}
