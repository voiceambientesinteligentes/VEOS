// Aviso no navegador: com o VEOS aberto, confere o Radar a cada 5 min e avisa alertas ALTO/CRITICO
// novos dos setores do usuario. Gratuito e sem servidor de push: com a aba fechada, nao ha aviso.
import { api } from "../data/api.js";
import { alertasParaAvisar } from "../domain/notificacoes.js";

const LIGADO = "veos.avisos";
const VISTOS = "veos.avisos.vistos";
const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? padrao; } catch { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
let timer = null;

export const suportado = () => typeof Notification !== "undefined";
export const ligado = () => suportado() && Notification.permission === "granted" && ler(LIGADO, false) === true;

async function conferir(primeira) {
  try {
    const { alertas } = await api.radar();
    const [novos, vistos] = alertasParaAvisar(alertas, ler(VISTOS, []));
    gravar(VISTOS, vistos);
    if (primeira) return; // ao ligar/abrir, so marca o que ja existia
    for (const a of novos.slice(0, 3)) {
      const n = new Notification(`VEOS · ${a.severidade === "CRITICO" ? "Crítico" : "Alto"}`, { body: a.titulo, tag: a.chave });
      n.onclick = () => { window.focus(); location.hash = `#/setor/${a.setor_id}`; };
    }
  } catch { /* sem rede ou sessao: tenta no proximo ciclo */ }
}

export function iniciarAvisos() {
  if (timer || !ligado()) return;
  conferir(true);
  timer = setInterval(() => conferir(false), 5 * 60 * 1000);
}

// ---- aviso com o navegador FECHADO (Web Push): inscreve este aparelho; o servidor avisa alertas ALTO/CRITICO novos
export const pushSuportado = () => "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
const base64ParaBytes = (b64) => { const p = "=".repeat((4 - (b64.length % 4)) % 4); const s = atob((b64 + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };

/** Inscreve este aparelho. Devolve true se ficou inscrito; false se o servidor ainda nao tem chaves de push. */
export async function inscreverPush() {
  if (!pushSuportado()) return false;
  const { chave } = await api.pushChave();
  if (!chave) return false;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(chave) });
  const j = sub.toJSON();
  await api.pushInscrever({ endpoint: j.endpoint, keys: j.keys });
  return true;
}

export async function cancelarPush() {
  if (!pushSuportado()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await api.pushCancelar({ endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  } catch { /* sem service worker */ }
}

export async function pushInscrito() {
  if (!pushSuportado()) return false;
  try { return Boolean(await (await navigator.serviceWorker.ready).pushManager.getSubscription()); } catch { return false; }
}

export async function ligarAvisos() {
  if (!suportado()) throw new Error("Este navegador não tem avisos.");
  const p = await Notification.requestPermission();
  if (p !== "granted") throw new Error("Permissão negada no navegador.");
  gravar(LIGADO, true);
  iniciarAvisos();
  await inscreverPush().catch(() => false); // se falhar, continuam os avisos com o VEOS aberto
}

export function desligarAvisos() {
  cancelarPush();
  gravar(LIGADO, false);
  clearInterval(timer);
  timer = null;
}
