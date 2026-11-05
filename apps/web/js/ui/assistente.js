// ASSISTENTE VEOS: um so cerebro para o chat flutuante (todas as telas) e para a tela IA VEOS.
//   - Voce fala ou digita. Pedido de tela ("abrir o radar") o VEOS abre na hora; o resto vai ao
//     diretor certo (CFO, CSO, CMO...) pelo MOTOR DE IA do servidor, na mesma conversa por diretor
//     (o motor le as trocas anteriores). Resposta = opiniao do diretor, rotulada; nunca decisao.
//   - Avisos: alertas ALTO/CRITICO novos do Radar entram no chat como mensagem do VEOS (selo no botao).
//   - Voz: fala a resposta com a voz masculina pt-BR mais natural do navegador, grave, tom de
//     assistente formal (estilo "Jarvis"; a voz do filme e do ator e nao pode ser copiada).
// Estado guardado no aparelho (localStorage): mensagens recentes, conversas por diretor e preferencias.
import { api } from "../data/api.js";
import { CATALOGO } from "../data/catalogo.js";
import { interpretar } from "../domain/comandos.js";
import { blocosDaResposta } from "../domain/conversa.js";
import { avisosNovos } from "../domain/avisos.js";
import { clear, h } from "./dom.js";
import { icone } from "./icones.js";

const K = { msgs: "veos.assistente.msgs", conversas: "veos.assistente.conversas", vistos: "veos.assistente.vistos", voz: "veos.assistente.voz", nomeVoz: "veos.assistente.nomevoz", naoLidas: "veos.assistente.naolidas" };
const ler = (k, p) => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? p; } catch { return p; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
const SETOR_DA_SIGLA = Object.fromEntries(CATALOGO.map((s) => [s.sigla, s.id]));
const SIGLA = Object.fromEntries(CATALOGO.map((s) => [s.id, s.sigla]));
const NOME = Object.fromEntries(CATALOGO.map((s) => [s.id, s.diretor.nome]));

// ---------------------------------------------------------------- estado compartilhado
const ouvintes = new Set();
let eu = null;
let msgs = ler(K.msgs, []);
let pensando = null; // { setor, desde }
let naoLidas = ler(K.naoLidas, 0);
const avisar = () => { gravar(K.msgs, msgs.slice(-60)); gravar(K.naoLidas, naoLidas); for (const f of ouvintes) f(); };
export const estado = () => ({ msgs, pensando, naoLidas, voz: ler(K.voz, true) });
export function assinar(f) { ouvintes.add(f); return () => ouvintes.delete(f); }
export function marcarLidas() { if (naoLidas) { naoLidas = 0; avisar(); } }
export function limparConversa() { msgs = []; gravar(K.conversas, {}); avisar(); }
function adicionar(m, contaNaoLida = false) { msgs.push({ id: crypto.randomUUID(), em: new Date().toISOString(), ...m }); if (contaNaoLida) naoLidas += 1; avisar(); }

// ---------------------------------------------------------------- voz (estilo assistente formal)
export const vozLigada = () => ler(K.voz, true);
export function ligarVoz(v) { gravar(K.voz, Boolean(v)); if (!v && "speechSynthesis" in window) speechSynthesis.cancel(); avisar(); }
const MASCULINAS = /antonio|francisco|donato|fabio|julio|nicolau|valerio|humberto|leandro|daniel|ricardo|male|masculin/i;
export function vozesDisponiveis() {
  if (!("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices().filter((v) => /^pt(-|_)?BR/i.test(v.lang) || /portugu/i.test(v.name));
}
/** Melhor voz para o tom "Jarvis": escolhida pela pessoa > masculina natural pt-BR > natural pt-BR > qualquer pt-BR. */
export function escolherVoz(lista = vozesDisponiveis(), preferida = ler(K.nomeVoz, null)) {
  return lista.find((v) => v.name === preferida)
    ?? lista.find((v) => MASCULINAS.test(v.name) && /natural|online|neural/i.test(v.name))
    ?? lista.find((v) => MASCULINAS.test(v.name))
    ?? lista.find((v) => /natural|online|neural/i.test(v.name))
    ?? lista[0] ?? null;
}
export function definirVoz(nome) { gravar(K.nomeVoz, nome); }
let aoFalar = null;
export function quandoFalar(f) { aoFalar = f; }
/** Trecho falado: so o essencial (resumo), sem avisos tecnicos, ate ~420 caracteres. */
export function trechoParaFalar(texto) {
  const b = blocosDaResposta(texto).filter((x) => ["paragrafo", "lista"].includes(x.tipo));
  const t = b.map((x) => (x.tipo === "lista" ? x.itens.slice(0, 3).join(". ") : x.texto)).join(" ").replace(/\s+/g, " ").trim();
  if (t.length <= 420) return t;
  const corte = t.slice(0, 420);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(". "), 200) + 1)} O restante está na tela.`;
}
export function falar(texto) {
  if (!vozLigada() || !("speechSynthesis" in window) || !texto) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  const voz = escolherVoz();
  if (voz) u.voice = voz;
  u.lang = voz?.lang ?? "pt-BR";
  u.pitch = MASCULINAS.test(voz?.name ?? "") ? 0.9 : 0.8; // mais grave, tom de assistente
  u.rate = 1.04;
  u.onstart = () => aoFalar?.(true);
  u.onend = () => aoFalar?.(false);
  u.onerror = () => aoFalar?.(false);
  speechSynthesis.speak(u);
}
if ("speechSynthesis" in window) speechSynthesis.addEventListener?.("voiceschanged", () => avisar());

// ---------------------------------------------------------------- conversa com os diretores
const tratamento = () => (eu?.nome ? String(eu.nome).split(" ")[0] : "");
async function aguardarResposta(id, setor) {
  const limite = Date.now() + 3.5 * 60_000;
  while (Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const { perguntas } = await api.perguntasDiretores({ setor });
      const p = perguntas.find((x) => x.id === id);
      if (p?.respostas?.length) return { ok: true, resposta: p.respostas.at(-1) };
      if (p && p.estado === "pendente" && !p.ia_analisando && p.ia_erro) return { ok: false, erro: p.ia_erro, id };
      if (p?.estado === "cancelada") return { ok: false, erro: "a mensagem foi cancelada" };
    } catch { /* rede: tenta de novo */ }
  }
  return { ok: false, erro: "o diretor ainda está pensando; a resposta vai aparecer em Perguntar aos diretores", id };
}

/** Envia o que a pessoa falou/digitou. Devolve quando a resposta chega (ou falha). */
export async function enviar(texto) {
  const t = String(texto ?? "").trim();
  if (!t || pensando) return;
  adicionar({ de: "eu", texto: t });
  const r = interpretar(t);
  if (r.rota) {
    const fala = `Certo${tratamento() ? `, ${tratamento()}` : ""}. ${r.fala}`;
    adicionar({ de: "veos", texto: fala });
    falar(fala);
    setTimeout(() => { location.hash = r.rota; }, 700);
    return;
  }
  const setor = r.diretor ? SETOR_DA_SIGLA[r.diretor.sigla] ?? "direcao" : "direcao";
  const conversas = ler(K.conversas, {});
  pensando = { setor, desde: Date.now() };
  avisar();
  try {
    let res;
    try {
      res = await api.perguntarDiretor(conversas[setor] ? { conversa_id: conversas[setor], pergunta: t } : { setor_id: setor, pergunta: t });
    } catch (e) {
      if (conversas[setor] && (e.status === 404 || e.status === 403)) res = await api.perguntarDiretor({ setor_id: setor, pergunta: t });
      else throw e;
    }
    conversas[setor] = res.conversa_id ?? res.id;
    // a resposta desta pergunta aparece aqui mesmo: nao repetir como aviso depois
    gravar(K.vistos, [...ler(K.vistos, []), `p:${res.id}`].slice(-500));
    gravar(K.conversas, conversas);
    if (res.ia !== "analisando") {
      adicionar({ de: "veos", texto: "Sem motor de IA ligado no servidor agora: a pergunta ficou na fila do Claude Code e a resposta aparece em Perguntar aos diretores.", href: "#/diretores" });
      return;
    }
    const fim = await aguardarResposta(res.id, setor);
    if (fim.ok) {
      adicionar({ de: "diretor", setor, texto: fim.resposta.resposta, motor: fim.resposta.motor, conversa: conversas[setor] });
      falar(trechoParaFalar(fim.resposta.resposta));
    } else {
      adicionar({ de: "veos", texto: `Não consegui a resposta do ${SIGLA[setor]} agora: ${fim.erro}.`, href: `#/diretores?conversa=${conversas[setor]}` });
    }
  } catch (e) {
    adicionar({ de: "veos", texto: e.status === 409 ? `O ${SIGLA[setor]} ainda está respondendo a mensagem anterior. Aguarde um instante.` : `Não consegui enviar: ${e.message}` });
  } finally {
    pensando = null;
    avisar();
  }
}

// ---------------------------------------------------------------- avisos do Radar no chat
let timerAvisos = null;
async function conferirAvisos(primeira) {
  try {
    const [{ alertas, tarefas }, resp] = await Promise.all([api.radar(), api.perguntasDiretores({ estado: "respondida", limite: 15 }).catch(() => ({ perguntas: [] }))]);
    const vistos = new Set(ler(K.vistos, []));
    const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
    const todos = avisosNovos({ alertas, tarefas, perguntas: resp.perguntas, hoje, euId: eu?.user_id ?? null });
    const novos = todos.filter((a) => !vistos.has(a.chave));
    for (const a of todos) vistos.add(a.chave);
    gravar(K.vistos, [...vistos].slice(-500));
    if (primeira && msgs.length) return; // primeira abertura com historico: so marca
    for (const a of novos.slice(0, primeira ? 3 : 5)) adicionar({ de: "aviso", setor: a.setor_id, texto: a.texto, href: a.href }, true);
  } catch { /* sem rede: proximo ciclo */ }
}

// ---------------------------------------------------------------- mensagens (DOM)
function textoFormatado(texto) {
  return h("div", { class: "as-texto" }, blocosDaResposta(texto).map((b) => {
    if (b.tipo === "titulo") return h("h4", null, b.texto);
    if (b.tipo === "lista") return h("ul", null, b.itens.map((i) => h("li", null, i)));
    if (b.tipo === "aviso") return h("p", { class: "cv-aviso" }, b.texto);
    if (b.tipo === "conferencia") return h("p", { class: "cv-conferencia" }, b.texto);
    if (b.tipo === "base") return h("p", { class: "cv-base" }, b.texto);
    return h("p", null, b.texto);
  }));
}
export function desenharMensagens(alvo, { compacto = false } = {}) {
  const st = estado();
  clear(alvo);
  for (const m of st.msgs) {
    if (m.de === "eu") { alvo.append(h("div", { class: "as-msg as-eu" }, h("div", { class: "as-balao" }, m.texto))); continue; }
    if (m.de === "aviso") { alvo.append(h("div", { class: "as-msg as-aviso" }, h("span", { class: "as-avatar as-avatar-aviso", "aria-hidden": "true" }, "!"), h("div", { class: "as-corpo" }, h("p", null, m.texto), m.href ? h("a", { href: m.href, class: "as-link" }, "Abrir") : null))); continue; }
    const sigla = m.de === "diretor" ? SIGLA[m.setor] : null;
    alvo.append(h("div", { class: `as-msg as-ia${m.de === "diretor" ? "" : " as-veos"}` },
      h("span", { class: "as-avatar", "aria-hidden": "true" }, sigla ?? "✦"),
      h("div", { class: "as-corpo" },
        m.de === "diretor" ? h("div", { class: "as-autor" }, h("strong", null, NOME[m.setor] ?? "Diretor"), h("span", { class: "cv-selo" }, "IA · opinião")) : null,
        m.de === "diretor" ? textoFormatado(compacto ? m.texto : m.texto) : h("p", null, m.texto),
        m.de === "diretor" && m.conversa ? h("a", { href: `#/diretores?conversa=${m.conversa}`, class: "as-link" }, "Continuar com fontes e histórico") : m.href ? h("a", { href: m.href, class: "as-link" }, "Abrir") : null)));
  }
  if (st.pensando) alvo.append(h("div", { class: "as-msg as-ia" }, h("span", { class: "as-avatar", "aria-hidden": "true" }, SIGLA[st.pensando.setor] ?? "✦"),
    h("div", { class: "as-corpo as-pensando" }, h("span", { class: "cv-pontos", "aria-hidden": "true" }, h("i"), h("i"), h("i")), h("small", null, `${NOME[st.pensando.setor] ?? "O diretor"} está analisando com os dados do VEOS…`))));
  alvo.scrollTop = alvo.scrollHeight;
}

// ---------------------------------------------------------------- entrada (texto + microfone)
const Reconhecimento = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export function caixaDeEntrada({ grande = false, placeholder = "Fale ou escreva para o VEOS…", aoOuvir = null } = {}) {
  const campo = h("textarea", { class: `as-campo${grande ? " as-campo-g" : ""}`, rows: 1, placeholder, "aria-label": "Mensagem para o VEOS" });
  const mic = h("button", { class: "as-botao as-mic", type: "button", "aria-label": "Falar", "aria-pressed": "false", disabled: !Reconhecimento, title: Reconhecimento ? "Falar" : "Este navegador não tem reconhecimento de voz" }, icone("mic"));
  const env = h("button", { class: "as-botao as-enviar", type: "submit", "aria-label": "Enviar" }, icone("enviar"));
  const form = h("form", { class: `as-entrada${grande ? " as-entrada-g" : ""}` }, campo, h("div", { class: "as-acoes" }, mic, env));
  const ajustar = () => { campo.style.height = "auto"; campo.style.height = `${Math.min(campo.scrollHeight, 200)}px`; };
  campo.addEventListener("input", ajustar);
  campo.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener("submit", (e) => { e.preventDefault(); const t = campo.value; campo.value = ""; ajustar(); enviar(t); });
  let rec = null;
  mic.addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    rec = new Reconhecimento();
    rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = false;
    rec.onstart = () => { mic.classList.add("ouvindo"); mic.setAttribute("aria-pressed", "true"); campo.placeholder = "Ouvindo…"; aoOuvir?.(true); };
    rec.onresult = (ev) => { let final = "", parcial = ""; for (const r of ev.results) (r.isFinal ? (final += r[0].transcript) : (parcial += r[0].transcript)); campo.value = (final || parcial).trim(); ajustar(); if (final) { const t = final.trim(); campo.value = ""; enviar(t); } };
    rec.onerror = (ev) => { campo.placeholder = ev.error === "not-allowed" ? "Microfone bloqueado: libere no cadeado da barra de endereço." : "Não ouvi. Toque no microfone e fale."; };
    rec.onend = () => { mic.classList.remove("ouvindo"); mic.setAttribute("aria-pressed", "false"); rec = null; if (campo.placeholder === "Ouvindo…") campo.placeholder = placeholder; aoOuvir?.(false); };
    try { rec.start(); } catch { rec = null; }
  });
  const sync = () => { env.disabled = Boolean(estado().pensando); };
  assinar(sync); sync();
  return { form, campo };
}

// ---------------------------------------------------------------- chat flutuante (todas as telas, menos IA VEOS)
let raizFlutuante = null;
export function iniciarAssistente(usuario) {
  eu = usuario;
  if (!raizFlutuante) montarFlutuante();
  clearInterval(timerAvisos);
  conferirAvisos(true);
  timerAvisos = setInterval(() => conferirAvisos(false), 2 * 60_000);
  const ver = () => { raizFlutuante.hidden = location.hash.startsWith("#/ia"); if (raizFlutuante.hidden) raizFlutuante.classList.remove("aberto"); };
  window.addEventListener("hashchange", ver);
  ver();
}
export function pararAssistente() { clearInterval(timerAvisos); if (raizFlutuante) raizFlutuante.hidden = true; }

function montarFlutuante() {
  const lista = h("div", { class: "as-lista", "aria-live": "polite" });
  const { form, campo } = caixaDeEntrada({ placeholder: "Pergunte ou peça uma tela…" });
  const fechar = h("button", { class: "as-botao", type: "button", "aria-label": "Fechar o chat" }, icone("fechar"));
  const vozBtn = h("button", { class: "as-botao", type: "button", "aria-label": "Voz", title: "Ligar/desligar a voz" }, icone("som"));
  const painel = h("section", { class: "as-painel", role: "dialog", "aria-label": "Assistente VEOS" },
    h("header", { class: "as-topo" }, h("span", { class: "as-avatar", "aria-hidden": "true" }, "✦"),
      h("div", { class: "as-topo-texto" }, h("strong", null, "VEOS"), h("small", null, "Avisos e perguntas aos diretores")),
      h("a", { class: "as-botao", href: "#/ia", "aria-label": "Abrir em tela cheia", title: "Tela cheia" }, icone("expandir")), vozBtn, fechar),
    lista, h("footer", { class: "as-rodape" }, form));
  const selo = h("span", { class: "as-selo", hidden: true });
  const botao = h("button", { class: "as-flutuante", type: "button", "aria-label": "Abrir o assistente VEOS", "aria-expanded": "false" }, icone("ia"), selo);
  raizFlutuante = h("div", { class: "as-raiz" }, painel, botao);
  document.body.append(raizFlutuante);
  const abrir = (v) => { raizFlutuante.classList.toggle("aberto", v); botao.setAttribute("aria-expanded", String(v)); if (v) { marcarLidas(); desenharMensagens(lista, { compacto: true }); setTimeout(() => campo.focus(), 50); } };
  botao.addEventListener("click", () => abrir(!raizFlutuante.classList.contains("aberto")));
  fechar.addEventListener("click", () => abrir(false));
  vozBtn.addEventListener("click", () => ligarVoz(!vozLigada()));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && raizFlutuante.classList.contains("aberto")) abrir(false); });
  lista.addEventListener("click", (e) => { if (e.target.closest("a")) abrir(false); });
  window.addEventListener("hashchange", () => abrir(false)); // mudou de tela (link ou pedido de tela): o chat se recolhe
  assinar(() => {
    const st = estado();
    selo.hidden = !st.naoLidas; selo.textContent = String(st.naoLidas);
    vozBtn.classList.toggle("desligado", !st.voz); vozBtn.title = st.voz ? "Voz ligada (clique para desligar)" : "Voz desligada (clique para ligar)";
    if (raizFlutuante.classList.contains("aberto")) { marcarLidas(); desenharMensagens(lista, { compacto: true }); }
    botao.classList.toggle("pensando", Boolean(st.pensando));
  });
  avisar();
}
