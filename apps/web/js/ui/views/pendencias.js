// PENDENCIAS DO PROJETO: aba provisoria que acompanha o que ja foi feito, o que falta e os proximos
// passos de cada diretor. Os dados ficam em data/pendencias_projeto.js (sem dados reais da empresa).
import { DIRETORES, ESTADOS, QUANDO } from "../../data/pendencias_projeto.js";
import { clear, h, panel, stamp, stat } from "../dom.js";

const ORDEM = ["bloqueado", "andamento", "pendente", "feito"];
const ESTADOS_LISTA = ["feito", "andamento", "pendente", "bloqueado"];
const contar = (topicos) => Object.fromEntries(ESTADOS_LISTA.map((e) => [e, topicos.filter((t) => t.estado === e).length]));
const rotuloDono = { Juridico: "Jurídico" };
const todosTopicos = () => DIRETORES.flatMap((d) => d.topicos.map((t) => ({ ...t, d })));

function barra(c, total) {
  const w = (n) => `${total ? (n / total) * 100 : 0}%`;
  return h("div", { class: "pj-barra", role: "img", "aria-label": `${c.feito} feitos de ${total}` },
    ESTADOS_LISTA.map((e) => h("span", { class: `b-${e}`, style: `width:${w(c[e])}` })));
}

function textoContagem(c, total) {
  const falta = total - c.feito;
  return `${c.feito} de ${total} feitos${falta ? ` · faltam ${falta}` : ""}`;
}

function cartao(t) {
  const [rotulo, tom] = ESTADOS[t.estado];
  const aberto = t.estado === "bloqueado" || (t.estado !== "feito" && t.quando === "agora" && t.dono === "Claude");
  return h("details", { class: `pj-topico e-${t.estado}`, id: `pj-${t.id}`, open: aberto },
    h("summary", null,
      stamp(t.id, "neutral"),
      h("strong", null, t.titulo),
      stamp(rotulo, tom),
      stamp(`Quem: ${rotuloDono[t.dono] ?? t.dono}`, "neutral"),
      stamp(QUANDO[t.quando], t.quando === "agora" ? "live" : "neutral")),
    h("div", { class: "pj-corpo" },
      h("p", null, t.detalhe),
      t.passos.length ? [h("h4", null, "O que fazer, em ordem"), h("ol", null, t.passos.map((p) => h("li", null, p)))] : null,
      h("h4", null, "Pronto quando"),
      h("p", null, t.pronto),
      h("p", { class: "field-hint" }, `Fonte: ${t.fonte}`)));
}

const lista = (itens) => h("ul", { class: "pj-topicos" }, itens.map((t) => h("li", null, cartao(t))));

function visaoGeral(corpo, ir) {
  const todos = todosTopicos();
  const c = contar(todos);
  const proximos = todos.filter((t) => t.estado !== "feito" && t.quando === "agora" && t.dono === "Claude");
  const esperando = todos.filter((t) => t.estado !== "feito" && t.dono !== "Claude" && t.quando === "agora");
  corpo.append(
    h("div", { class: "pj-resumo" },
      stat("Tópicos no total", String(todos.length), `em ${DIRETORES.length} diretores`),
      stat("Feitos", String(c.feito), `${Math.round((c.feito / todos.length) * 100)}% dos tópicos`),
      stat("Em andamento", String(c.andamento)),
      stat("Faltam fazer", String(c.pendente)),
      stat("Bloqueados", String(c.bloqueado), "esperam decisão ou terceiro")),
    panel({ title: "Linha de fluxo", subtitle: "Do financeiro até o último diretor. Clique num diretor para ver os tópicos. Barra: feito (verde), em andamento (azul), falta fazer (amarelo), bloqueado (vermelho)." },
      h("ol", { class: "pj-fluxo" }, DIRETORES.map((d) => {
        const dc = contar(d.topicos);
        const a = h("a", { class: "pj-no", href: `#/pendencias/${d.id}` },
          h("span", { class: "pj-sigla" }, d.sigla), h("span", { class: "pj-nome" }, d.cargo),
          barra(dc, d.topicos.length), h("span", { class: "pj-conta" }, textoContagem(dc, d.topicos.length)));
        a.addEventListener("click", (e) => { e.preventDefault(); ir(d.id); });
        return h("li", null, a);
      }))),
    panel({ title: "Próximos passos: o que o Claude pode fazer agora", subtitle: `${proximos.length} tópico(s) que não dependem de ninguém. Abra para ver o passo a passo.` },
      proximos.length ? lista(proximos) : h("p", { class: "muted" }, "Nada pendente para o Claude no momento.")),
    panel({ title: "Esperando você, o contador ou o jurídico", subtitle: `${esperando.length} tópico(s) que travam a estrutura agora. Para ver por pessoa, use a aba "Quem precisa agir".` },
      esperando.length ? lista(esperando) : h("p", { class: "muted" }, "Nada esperando decisão.")),
  );
}

function abaDiretor(corpo, d) {
  const c = contar(d.topicos);
  const filtro = h("select", { class: "select", id: "pj-filtro", "aria-label": "Filtrar por situação" },
    h("option", { value: "abertos" }, "O que falta (sem os feitos)"), h("option", { value: "todos" }, "Todos"),
    Object.entries(ESTADOS).map(([k, [r]]) => h("option", { value: k }, r)));
  const area = h("ul", { class: "pj-topicos" });
  const pintar = () => {
    const f = filtro.value;
    const itens = d.topicos.filter((t) => (f === "todos" ? true : f === "abertos" ? t.estado !== "feito" : t.estado === f))
      .sort((a, b) => ORDEM.indexOf(a.estado) - ORDEM.indexOf(b.estado));
    clear(area).append(...(itens.length ? itens.map((t) => h("li", null, cartao(t))) : [h("li", { class: "muted" }, "Nenhum tópico nesta situação.")]));
  };
  filtro.addEventListener("change", pintar);
  pintar();
  corpo.append(
    panel({ title: `${d.sigla} · ${d.cargo}`, subtitle: `${d.nome} · ${textoContagem(c, d.topicos.length)}` },
      h("div", { class: "stack-s" }, h("p", null, d.resumo), barra(c, d.topicos.length))),
    h("div", { class: "row" }, h("label", { for: "pj-filtro" }, "Mostrar:"), filtro),
    area,
  );
}

function abaQuem(corpo) {
  const todos = todosTopicos().filter((t) => t.estado !== "feito");
  const ordem = ["agora", "depois", "final"];
  for (const dono of ["Fernando", "Contador", "Juridico", "Claude"]) {
    const itens = todos.filter((t) => t.dono === dono).sort((a, b) => ordem.indexOf(a.quando) - ordem.indexOf(b.quando));
    if (!itens.length) continue;
    corpo.append(panel({ title: `${rotuloDono[dono] ?? dono} (${itens.length})`, subtitle: dono === "Claude" ? "O que o Claude constrói sem depender de ninguém." : "O que só essa pessoa pode decidir ou fazer." }, lista(itens)));
  }
}

export function telaPendencias(root, _signal, aba = "geral") {
  const corpo = h("div", { class: "stack" });
  const abas = [["geral", "Visão geral"], ...DIRETORES.map((d) => [d.id, d.sigla]), ["quem", "Quem precisa agir"]];
  const botoes = abas.map(([k, r]) => {
    const b = h("button", { class: "tab", type: "button", role: "tab", "aria-selected": String(k === aba), "data-aba": k }, r);
    b.addEventListener("click", () => ir(k));
    return b;
  });
  function ir(k) {
    history.replaceState(null, "", `#/pendencias/${k}`);
    botoes.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.aba === k)));
    clear(corpo);
    const d = DIRETORES.find((x) => x.id === k);
    if (d) abaDiretor(corpo, d);
    else if (k === "quem") abaQuem(corpo);
    else visaoGeral(corpo, ir);
  }
  root.append(
    h("p", { class: "field-hint" }, "Aba provisória do projeto: só o que falta para terminar o VEOS (não é rotina da empresa). Sai do menu quando o projeto fechar."),
    h("div", { class: "tabs setor-abas", role: "tablist", "aria-label": "Diretores" }, botoes),
    corpo);
  ir(aba);
}
