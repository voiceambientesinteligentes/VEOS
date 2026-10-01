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

export async function ligarAvisos() {
  if (!suportado()) throw new Error("Este navegador não tem avisos.");
  const p = await Notification.requestPermission();
  if (p !== "granted") throw new Error("Permissão negada no navegador.");
  gravar(LIGADO, true);
  iniciarAvisos();
}

export function desligarAvisos() {
  gravar(LIGADO, false);
  clearInterval(timer);
  timer = null;
}
