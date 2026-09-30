// Servico: acompanhamento assincrono de jobs por consulta periodica.
// O job continua no servidor mesmo que a tela seja trocada; o sinal apenas
// interrompe a consulta.

import { api } from "../data/api.js";

const FINAL = new Set(["done", "failed"]);

export function isFinal(status) {
  return FINAL.has(status);
}

export function nextDelay(attempt) {
  return Math.min(900 + attempt * 300, 3000);
}

export async function pollJob(id, { onUpdate = () => {}, signal, maxMs = 20 * 60 * 1000, fetchJob = api.job, sleep } = {}) {
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const started = Date.now();
  let attempt = 0;
  let lastKey = "";
  for (;;) {
    if (signal?.aborted) return null;
    let job;
    try {
      job = await fetchJob(id);
    } catch (e) {
      if (e.status === 404) throw e;
      job = null; // falha transitoria de rede: tenta de novo
    }
    if (job) {
      const key = `${job.status}:${job.progress.length}`;
      if (key !== lastKey) {
        lastKey = key;
        onUpdate(job);
      }
      if (isFinal(job.status)) return job;
    }
    if (Date.now() - started > maxMs) return job;
    await wait(nextDelay(attempt++));
  }
}
