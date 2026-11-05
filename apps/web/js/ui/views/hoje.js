// HOJE (#/hoje): a pagina inicial. Responde "o que eu faco agora?": as prioridades do dia (alertas
// mais graves e tarefas vencidas/de hoje), os atalhos do que mais se cria e os numeros do momento.
// Abaixo, a Orbita dos setores e o comando de voz da IA VEOS (pedido do Fernando: na pagina inicial).
// O resto do VEOS continua a um clique (menu) ou na busca (Ctrl+K).
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { NOVOS } from "../../data/navegacao.js";
import { formatBRL } from "../../domain/format.js";
import { clear, errorNotice, h } from "../dom.js";
import { renderIA } from "./ia.js";
import { renderOrbita } from "./orbita.js";

const brl = (v) => formatBRL(String(Number(v ?? 0).toFixed(2)));
const SEV = { CRITICO: 0, ALTO: 1, MEDIO: 2, INFO: 3 };
const SEV_TXT = { CRITICO: "Crítico", ALTO: "Alto", MEDIO: "Atenção", INFO: "Info" };
const sigla = (id) => CATALOGO.find((s) => s.id === id)?.sigla ?? id;
const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const tentar = async (fn) => { try { return await fn(); } catch { return null; } };

/** Prioridades do dia: alertas (mais graves primeiro) e tarefas vencidas ou de hoje. Sem DOM. */
export function prioridades(radar, hoje = hojeISO(), limite = 7, euId = null) {
  const alertas = (radar?.alertas ?? []).filter((a) => a.severidade !== "INFO")
    .map((a) => ({ tipo: "alerta", id: a.id, titulo: a.titulo, detalhe: a.mensagem, setor: a.setor_id, peso: SEV[a.severidade] ?? 3, sev: a.severidade, href: `#/setor/${a.setor_id}` }));
  const tarefas = (radar?.tarefas ?? []).filter((t) => !t.prazo || t.prazo <= hoje)
    .map((t) => ({ tipo: "tarefa", id: t.id, titulo: t.titulo, detalhe: t.responsavel && t.responsavel === euId ? "Minha agenda" : t.prazo && t.prazo < hoje ? "Atrasada" : "Para hoje", setor: t.setor_id, peso: t.responsavel && t.responsavel === euId ? 1 : t.prazo && t.prazo < hoje ? 1.5 : 2.5, href: `#/setor/${t.setor_id}` }));
  const todas = [...alertas, ...tarefas].sort((a, b) => a.peso - b.peso);
  return { itens: todas.slice(0, limite), total: todas.length };
}

export async function telaHoje(root, eu = {}, signal = new AbortController().signal) {
  const agora = new Date();
  const hora = agora.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataBruta = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const dataTxt = dataBruta.charAt(0).toUpperCase() + dataBruta.slice(1);
  const nome = String(eu.nome ?? "").split(" ")[0];

  const lista = h("div", { class: "hj-lista", "aria-live": "polite" }, h("p", { class: "muted" }, "Carregando o seu dia…"));
  const numeros = h("div", { class: "hj-numeros" });
  const orbitaBox = h("div", { class: "hj-orbita-box" }, h("p", { class: "muted" }, "Montando a órbita…"));
  const iaBox = h("div", { class: "hj-ia-box" });
  const atalhos = h("div", { class: "hj-atalhos" }, NOVOS.filter(([, , , p]) => !p || p.includes(eu.papel)).slice(0, 4).map(([href, t, sub]) =>
    h("a", { class: "hj-atalho", href }, h("span", { class: "hj-atalho-mais", "aria-hidden": "true" }, "+"), h("span", null, h("strong", null, t), h("small", null, sub)))));

  root.append(
    h("section", { class: "hj-topo" }, h("h1", null, `${saudacao}${nome ? `, ${nome}` : ""}`), h("p", { class: "hj-data" }, dataTxt)),
    atalhos,
    h("div", { class: "hj-grade" },
      h("section", { class: "hj-card hj-prioridades" }, h("div", { class: "hj-card-topo" }, h("h2", null, "Para fazer hoje"), h("a", { href: "#/radar", class: "hj-link" }, "Ver tudo")), lista),
      h("section", { class: "hj-card" }, h("div", { class: "hj-card-topo" }, h("h2", null, "Agora na VOICE")), numeros)),
    h("div", { class: "hj-centro" },
      h("section", { class: "hj-card hj-orbita" }, h("div", { class: "hj-card-topo" }, h("h2", null, "Órbita"), h("a", { href: "#/orbita", class: "hj-link" }, "Tela cheia")), orbitaBox),
      h("section", { class: "hj-card hj-ia" }, h("div", { class: "hj-card-topo" }, h("h2", null, "IA VEOS"), h("a", { href: "#/ia", class: "hj-link" }, "Tela cheia")), iaBox)),
  );
  renderIA(iaBox, signal, eu, { embutida: true });

  const [radar, orcs, peds, cad] = await Promise.all([tentar(() => api.radar()), tentar(() => api.comercialOrcamentos()), tentar(() => api.fluxoPedidos()), tentar(() => api.setores())]);
  // orbita: os setores com os alertas e tarefas do Radar (mesma regra da tela Orbita)
  if (cad && !signal.aborted) {
    const atividade = Object.fromEntries(cad.setores.map((s) => [s.id, {
      alertas: (radar?.alertas ?? []).filter((a) => a.setor_id === s.id).length,
      tarefas: (radar?.tarefas ?? []).filter((x) => x.setor_id === s.id).length,
      acessivel: (radar?.setores ?? []).includes(s.id),
    }]));
    renderOrbita(orbitaBox, { setores: cad.setores, diretores: cad.diretores, atividade, signal });
  } else clear(orbitaBox).append(h("p", { class: "muted" }, "Órbita indisponível agora."));
  // prioridades
  clear(lista);
  if (!radar) lista.append(errorNotice("Não deu para ler o Radar agora."));
  else {
    const { itens, total } = prioridades(radar, undefined, undefined, eu.user_id);
    if (!itens.length) lista.append(h("div", { class: "hj-vazio" }, h("strong", null, "Tudo em dia."), h("span", null, "Nenhum alerta importante nem tarefa vencida.")));
    for (const i of itens) {
      const acao = i.tipo === "tarefa"
        ? (() => { const b = h("button", { class: "btn btn-ghost btn-mini", type: "button", title: "Marcar como feita" }, "Feito"); b.addEventListener("click", async () => { b.disabled = true; try { await api.concluirTarefa(i.id, "feita"); b.closest(".hj-item")?.classList.add("hj-feito"); b.textContent = "✓"; } catch (e) { b.disabled = false; b.title = e.message; } }); return b; })()
        : h("a", { class: "btn btn-ghost btn-mini", href: i.href }, "Abrir");
      lista.append(h("div", { class: `hj-item hj-${i.tipo}${i.sev ? ` sev-${i.sev.toLowerCase()}` : ""}` },
        h("span", { class: "hj-marca", "aria-hidden": "true" }),
        h("div", { class: "hj-texto" }, h("strong", null, i.titulo), h("small", null, [i.tipo === "alerta" ? SEV_TXT[i.sev] : i.detalhe, sigla(i.setor)].join(" · "))),
        acao));
    }
    if (total > itens.length) lista.append(h("a", { class: "hj-mais", href: "#/radar" }, `+ ${total - itens.length} outra(s) no Radar`));
  }
  // numeros do momento
  const o = orcs?.orcamentos ?? [];
  const aberto = o.filter((x) => ["rascunho", "enviado"].includes(x.estado));
  const enviados = o.filter((x) => x.estado === "enviado");
  const ativos = (peds?.pedidos ?? []).filter((p) => !["concluido", "cancelado"].includes(p.estado));
  const num = (rotulo, valor, sub, href) => h("a", { class: "hj-num", href }, h("span", null, rotulo), h("strong", null, valor), sub ? h("small", null, sub) : null);
  numeros.append(
    num("Orçamentos em aberto", String(aberto.length), aberto.length ? brl(aberto.reduce((a, x) => a + Number(x.valor_total), 0)) : "nenhum ainda", "#/orcamentos"),
    num("Aguardando o cliente", String(enviados.length), enviados.length ? "ligue em 2 dias" : "—", "#/orcamentos?estado=enviado"),
    num("Pedidos em andamento", String(ativos.length), ativos.length ? brl(ativos.reduce((a, x) => a + Number(x.valor_total), 0)) : "—", "#/pedidos"),
    h("a", { class: "hj-num hj-guia", href: "#/operar" }, h("span", null, "Começar a operar"), h("strong", null, "Guia"), h("small", null, "o passo a passo do zero")));
}
