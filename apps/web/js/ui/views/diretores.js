// PERGUNTAR AOS DIRETORES em formato de CONVERSA: as conversas a esquerda; a conversa aberta a direita,
// com balões (voce x diretor), "analisando…" enquanto o motor de IA pensa e a caixa de digitar embaixo
// para continuar no mesmo fio (o motor le as trocas anteriores). O motor no servidor segue o manual do
// diretor, as ferramentas de calculo do VEOS e os precedentes da Biblioteca; sem motor, a pergunta vai
// para o Claude Code. Resposta de IA = opiniao rotulada, nunca decisao, nunca envio a cliente.
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { FERRAMENTA } from "../../data/ferramentas_ia.js";
import { agruparConversas, blocosDaResposta, SUGESTOES } from "../../domain/conversa.js";
import { formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, h, method } from "../dom.js";

const SETOR = Object.fromEntries(CATALOGO.map((s) => [s.id, s]));
const ESPERA_MS = 4000;
const hora = (iso) => { if (!iso) return ""; const d = new Date(iso); const hoje = new Date().toDateString() === d.toDateString(); return hoje ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : formatDateTime(iso); };

function textoFormatado(texto) {
  return h("div", { class: "cv-texto" }, blocosDaResposta(texto).map((b) => {
    if (b.tipo === "titulo") return h("h4", null, b.texto);
    if (b.tipo === "lista") return h("ul", null, b.itens.map((i) => h("li", null, i)));
    if (b.tipo === "aviso") return h("p", { class: "cv-aviso" }, b.texto);
    if (b.tipo === "conferencia") return h("p", { class: "cv-conferencia" }, b.texto);
    if (b.tipo === "base") return h("p", { class: "cv-base" }, b.texto);
    return h("p", null, b.texto);
  }));
}

export async function telaDiretores(root) {
  const inicial = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const motores = await api.motoresIA().catch(() => null);
  const noServidor = Boolean(motores?.algum_no_servidor);
  let conversas = [], atual = inicial.get("conversa"), novoSetor = inicial.get("setor") && SETOR[inicial.get("setor")] ? inicial.get("setor") : null;
  let rascunhoInicial = inicial.get("pergunta") ?? "";
  if (novoSetor || rascunhoInicial) atual = null;
  let timer = null, ocupado = false;

  const lista = h("div", { class: "cv-lista", role: "list" });
  const painel = h("section", { class: "cv-painel", "aria-live": "polite" });
  const chat = h("div", { class: "cv" }, h("aside", { class: "cv-coluna" },
    h("div", { class: "cv-coluna-topo" }, h("strong", null, "Conversas"), (() => { const b = h("button", { class: "btn btn-primary btn-mini", type: "button" }, "+ Nova"); b.addEventListener("click", () => abrirNova(null)); return b; })()),
    lista), painel);
  root.append(chat);

  // ---------------------------------------------------------------- lista
  function desenharLista() {
    clear(lista).append(...(conversas.length ? conversas.map((c) => {
      const s = SETOR[c.setor];
      const b = h("button", { class: `cv-item${c.id === atual ? " ativo" : ""}`, type: "button", role: "listitem" },
        h("span", { class: "cv-sigla" }, s?.sigla ?? "?"),
        h("span", { class: "cv-item-texto" }, h("span", { class: "cv-item-topo" }, h("strong", null, s?.diretor.nome ?? c.setor), h("small", null, hora(c.ultima))),
          h("span", { class: "cv-item-titulo" }, c.titulo), h("small", { class: "cv-item-previa" }, c.analisando ? "analisando…" : c.pendente ? "aguardando resposta" : c.previa)),
        c.pendente ? h("span", { class: "cv-ponto", "aria-label": "aguardando" }) : null);
      b.addEventListener("click", () => abrir(c.id));
      return b;
    }) : [h("p", { class: "field-hint cv-vazio-lista" }, "Nenhuma conversa ainda. Comece uma com o diretor certo para o assunto.")]));
  }

  // ---------------------------------------------------------------- nova conversa: escolher o diretor
  function abrirNova(setor) {
    atual = null; novoSetor = setor;
    history.replaceState(null, "", `#/diretores${setor ? `?setor=${setor}` : ""}`);
    chat.classList.add("cv-aberta");
    desenharLista();
    if (!setor) {
      clear(painel).append(
        cabecalho(null),
        h("div", { class: "cv-escolha" }, h("h3", null, "Com quem você quer falar?"), h("p", { class: "field-hint" }, "Cada diretor responde pelo próprio manual, com as contas feitas pelo VEOS."),
          h("div", { class: "cv-diretores" }, CATALOGO.map((s) => {
            const b = h("button", { class: "cv-diretor", type: "button" }, h("span", { class: "cv-sigla" }, s.sigla), h("span", null, h("strong", null, s.diretor.nome), h("small", null, s.nome)));
            b.addEventListener("click", () => abrirNova(s.id));
            return b;
          })),
          ajuda()));
      return;
    }
    const s = SETOR[setor];
    clear(painel).append(cabecalho(setor),
      h("div", { class: "cv-mensagens" }, h("div", { class: "cv-boas-vindas" }, h("span", { class: "cv-sigla cv-sigla-g" }, s.sigla), h("strong", null, s.diretor.nome), h("span", { class: "field-hint" }, s.diretor.titulo),
        h("div", { class: "cv-sugestoes" }, (s.diretor.perguntas_chave ?? []).slice(0, 3).map((p) => { const b = h("button", { class: "orbita-chip", type: "button" }, p); b.addEventListener("click", () => { caixa.value = p; caixa.focus(); }); return b; })))),
      compositor(null, setor));
    caixa.value = rascunhoInicial; rascunhoInicial = "";
    caixa.focus();
  }

  // ---------------------------------------------------------------- conversa aberta
  function abrir(id) {
    atual = id; novoSetor = null;
    history.replaceState(null, "", `#/diretores?conversa=${id}`);
    chat.classList.add("cv-aberta");
    desenharLista();
    desenharConversa(true);
  }

  function cabecalho(setor) {
    const s = setor ? SETOR[setor] : null;
    const voltar = h("button", { class: "btn btn-ghost btn-mini cv-voltar", type: "button", "aria-label": "Voltar às conversas" }, "‹");
    voltar.addEventListener("click", () => { chat.classList.remove("cv-aberta"); });
    return h("div", { class: "cv-cabecalho" }, voltar,
      s ? h("span", { class: "cv-sigla" }, s.sigla) : null,
      h("div", { class: "cv-cab-texto" }, h("strong", null, s ? s.diretor.nome : "Nova conversa"), h("small", null, s ? `${s.diretor.titulo} · responde com IA (opinião, não decisão)` : "Escolha o diretor")),
      s ? h("a", { class: "btn btn-ghost btn-mini", href: `#/setor/${s.id}/manual` }, "Manual") : null);
  }

  let caixa = null;
  function compositor(conversaId, setor) {
    caixa = h("textarea", { class: "input cv-caixa", rows: 1, placeholder: conversaId ? "Responder ao diretor… (Enter envia, Shift+Enter quebra a linha)" : "Escreva a sua pergunta…", "aria-label": "Mensagem" });
    const enviar = h("button", { class: "btn btn-primary cv-enviar", type: "submit", "aria-label": "Enviar" }, "Enviar");
    const erro = h("div", { role: "alert" });
    const form = h("form", { class: "cv-compositor" }, h("div", { class: "cv-compositor-linha" }, caixa, enviar), erro);
    const ajustar = () => { caixa.style.height = "auto"; caixa.style.height = `${Math.min(caixa.scrollHeight, 180)}px`; };
    caixa.addEventListener("input", ajustar);
    caixa.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clear(erro);
      const texto = caixa.value.trim();
      if (texto.length < 2) return;
      enviar.disabled = true;
      try {
        const r = await api.perguntarDiretor(conversaId ? { conversa_id: conversaId, pergunta: texto } : { setor_id: setor, pergunta: texto });
        caixa.value = "";
        await recarregar();
        abrir(r.conversa_id ?? r.id);
      } catch (err) { erro.append(errorNotice(err.message)); enviar.disabled = false; }
    });
    return form;
  }

  function balaoDiretor(p, r, s) {
    const ex = p.execucoes ?? [];
    const detalhes = [];
    if (r.procedimento) detalhes.push(`Procedimento do manual: ${r.procedimento}`);
    for (const f of r.fontes ?? []) detalhes.push(f.url ? h("a", { href: f.url, target: "_blank", rel: "noopener noreferrer" }, f.titulo ?? f.url) : `Fonte: ${f.titulo ?? ""}${f.natureza ? ` (${f.natureza})` : ""}`);
    for (const x of ex) {
      const usadas = (x.passos ?? []).map((st) => `${FERRAMENTA[st.ferramenta] ?? st.ferramenta}${st.ok ? "" : " (falhou)"}`);
      detalhes.push(`${x.provedor} · ${x.modelo}: ${x.ok ? "respondeu" : `falhou (${x.erro ?? "erro"})`} · ${usadas.length ? `dados consultados: ${usadas.join(", ")}` : "não consultou dados do VEOS"} · ${Math.round((x.ms ?? 0) / 1000)} s`);
    }
    return h("div", { class: "cv-msg cv-dele" }, h("span", { class: "cv-sigla cv-avatar" }, s?.sigla ?? "?"),
      h("div", { class: "cv-balao" },
        h("div", { class: "cv-autor" }, h("strong", null, s?.diretor.nome ?? "Diretor"), h("span", { class: "cv-selo" }, "IA · opinião"), h("small", null, hora(r.em))),
        textoFormatado(r.resposta),
        detalhes.length ? method(`Fontes e como chegou na resposta · ${r.motor}`, ...detalhes) : h("small", { class: "field-hint" }, r.motor)));
  }

  function balaoEspera(p, s) {
    if (p.ia_analisando) return h("div", { class: "cv-msg cv-dele" }, h("span", { class: "cv-sigla cv-avatar" }, s?.sigla ?? "?"),
      h("div", { class: "cv-balao cv-digitando" }, h("span", { class: "cv-pontos", "aria-hidden": "true" }, h("i"), h("i"), h("i")), h("small", null, `${s?.diretor.nome ?? "O diretor"} está analisando com os dados do VEOS (1 a 2 minutos)…`)));
    const tentar = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Tentar de novo");
    tentar.addEventListener("click", async () => { tentar.disabled = true; try { await api.pensarPergunta(p.id); await recarregar(); desenharConversa(); } catch (e) { tentar.textContent = e.message; } });
    const cancelar = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Cancelar mensagem");
    cancelar.addEventListener("click", async () => { cancelar.disabled = true; try { await api.cancelarPergunta(p.id); await recarregar(); desenharConversa(); } catch (e) { cancelar.textContent = e.message; } });
    return h("div", { class: "cv-msg cv-dele" }, h("span", { class: "cv-sigla cv-avatar" }, s?.sigla ?? "?"),
      h("div", { class: "cv-balao cv-falha" },
        h("p", null, p.ia_erro ? `Não consegui responder agora: ${p.ia_erro}` : noServidor ? "Na fila: o motor de IA ainda não começou." : "Na fila do Claude Code (próxima sessão)."),
        h("div", { class: "row" }, noServidor ? tentar : null, cancelar)));
  }

  function desenharConversa(rolar = false) {
    const c = conversas.find((x) => x.id === atual);
    if (!c) { clear(painel).append(cabecalho(null), h("p", { class: "result-empty cv-vazio" }, "Conversa não encontrada.")); return; }
    const s = SETOR[c.setor];
    const msgs = h("div", { class: "cv-mensagens" });
    for (const p of c.turnos) {
      if (p.estado === "cancelada") { msgs.append(h("div", { class: "cv-msg cv-minha cv-cancelada" }, h("div", { class: "cv-balao" }, h("p", null, p.pergunta), h("small", null, "cancelada")))); continue; }
      msgs.append(h("div", { class: "cv-msg cv-minha" }, h("div", { class: "cv-balao" }, h("p", null, p.pergunta), h("small", null, `${p.autor_nome === "—" ? "Você" : p.autor_nome} · ${hora(p.criada_em)}`))));
      for (const r of p.respostas ?? []) msgs.append(balaoDiretor(p, r, s));
      if (p.estado === "pendente") msgs.append(balaoEspera(p, s));
    }
    const ultima = c.turnos.at(-1);
    if (!c.pendente && ultima?.estado === "respondida") {
      msgs.append(h("div", { class: "cv-sugestoes cv-sugestoes-fim" }, SUGESTOES.map((t) => { const b = h("button", { class: "orbita-chip", type: "button" }, t); b.addEventListener("click", () => { caixa.value = t; caixa.dispatchEvent(new Event("input")); caixa.form.requestSubmit(); }); return b; })));
    }
    const comp = compositor(c.id, c.setor);
    if (c.pendente) { caixa.disabled = true; caixa.placeholder = "Aguarde a resposta para continuar…"; comp.querySelector("button[type=submit]").disabled = true; }
    const antes = painel.querySelector(".cv-mensagens");
    const estavaNoFim = !antes || antes.scrollHeight - antes.scrollTop - antes.clientHeight < 80;
    clear(painel).append(cabecalho(c.setor), msgs, comp);
    if (rolar || estavaNoFim) msgs.scrollTop = msgs.scrollHeight;
    if (!c.pendente) caixa.focus({ preventScroll: true });
  }

  function ajuda() {
    const ativos = (motores?.motores ?? []).filter((m) => m.ativo).map((m) => m.nome);
    return h("div", { class: "stack-s cv-ajuda" },
      motores?.dados_ao_provedor_gratuito ? h("p", { class: "notice notice-warn" }, `${motores.dados_ao_provedor_gratuito} Não escreva nome, telefone ou e-mail de cliente.`) : null,
      method("Como funciona",
        noServidor ? `O motor de IA (${ativos.join(" → ")}) lê o manual do diretor, consulta a Biblioteca e usa as ferramentas de cálculo do VEOS. Numa conversa, ele lê as mensagens anteriores antes de responder.` : "A pergunta vai para o Claude Code (sua assinatura), que responde pelo manual do diretor.",
        "Números que não vieram de uma ferramenta (valores e percentuais) são apontados no fim da resposta; se o diretor responder sem consultar dados, aparece um aviso no topo.",
        "As respostas são opinião na voz do diretor: decisões, aprovações e envios continuam com você."));
  }

  // ---------------------------------------------------------------- dados e atualizacao
  async function recarregar() {
    const { perguntas } = await api.perguntasDiretores();
    conversas = agruparConversas(perguntas);
  }
  async function ciclo() {
    clearTimeout(timer);
    if (!root.isConnected) return;
    const c = conversas.find((x) => x.id === atual);
    if (c?.pendente && !ocupado) {
      ocupado = true;
      try { await recarregar(); desenharLista(); if (document.activeElement !== caixa) desenharConversa(); } catch { /* tenta de novo */ } finally { ocupado = false; }
    }
    timer = setTimeout(ciclo, ESPERA_MS);
  }

  await recarregar();
  desenharLista();
  if (atual && conversas.some((c) => c.id === atual)) abrir(atual);
  else if (novoSetor || rascunhoInicial) abrirNova(novoSetor);
  else if (conversas.length && window.matchMedia("(min-width: 961px)").matches) abrir(conversas[0].id);
  else { abrirNova(null); chat.classList.remove("cv-aberta"); }
  timer = setTimeout(ciclo, ESPERA_MS);
}
