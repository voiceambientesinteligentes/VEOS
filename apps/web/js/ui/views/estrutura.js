// ESTRUTURA DA EMPRESA: organograma (CEO -> diretores -> gerentes -> equipe) e o que cada cargo faz
// todo dia, semana e mes. Vem do catalogo dos setores (setores/*.json). Tudo PROPOSTA ate a direcao aprovar.
// Tambem exporta os blocos usados na aba Equipe de cada setor.
import { CATALOGO } from "../../data/catalogo.js";
import { acumulos, arvoreEmpresa, arvoreSetor, FASE_ROTULO, ferramentaDaAtividade, FREQ_ROTULO, NIVEL_ROTULO, nomeCobertura, resumoEstrutura } from "../../domain/estrutura.js";
import { clear, h, panel, stamp, stat } from "../dom.js";

const TOM_NIVEL = { gestao: "live", assessoria: "neutral", execucao: "neutral" };
const lista = (titulo, itens) => (itens?.length ? h("div", { class: "eo-bloco" }, h("h4", null, titulo), h("ul", null, itens.map((x) => h("li", null, x)))) : null);
const nomeIndicador = (setor, id) => setor.indicadores.find((i) => i.id === id)?.nome ?? id;

function atividades(a) {
  if (!a) return null;
  return h("div", { class: "eo-agenda" }, Object.entries(FREQ_ROTULO).map(([k, rot]) => h("div", { class: "eo-freq" },
    h("h4", null, rot),
    a[k]?.length ? h("ul", null, a[k].map((x) => { const f = ferramentaDaAtividade(x); return h("li", null, x, f ? h("a", { class: "eo-ferramenta", href: f.href, title: `Abrir ${f.rotulo}` }, ` → ${f.rotulo}`) : null); })) : h("p", { class: "muted" }, "—"))));
}

/** Cartao completo de um cargo (missao, agenda, entregas, alcada). */
export function cartaoCargo(setor, p, { aberto = false } = {}) {
  const chefe = (p.reporta_a ?? setor.sigla) === setor.sigla ? setor.diretor.titulo : setor.equipe.find((x) => x.papel === p.reporta_a)?.nome ?? p.reporta_a;
  const cobre = nomeCobertura(CATALOGO, setor, p.cobre_enquanto_vago);
  return h("details", { class: `eo-cargo n-${p.nivel ?? "execucao"}`, id: `cargo-${setor.id}-${p.papel}`, open: aberto },
    h("summary", null,
      h("strong", null, p.nome),
      stamp(NIVEL_ROTULO[p.nivel] ?? "Execução", TOM_NIVEL[p.nivel] ?? "neutral"),
      p.fase ? stamp(FASE_ROTULO[p.fase], p.fase === "essencial" ? "ok" : "neutral") : null,
      h("span", { class: "field-hint" }, `Reporta a: ${chefe}`)),
    h("div", { class: "eo-corpo" },
      p.missao ? h("p", { class: "eo-missao" }, p.missao) : null,
      p.fase === "crescimento" && cobre ? h("p", { class: "field-hint" }, `Enquanto não houver pessoa no cargo, quem faz: ${cobre}.`) : null,
      p.fase === "essencial" && cobre ? h("p", { class: "field-hint" }, `Função necessária desde já. Se ninguém ocupar, quem faz: ${cobre}.`) : null,
      atividades(p.atividades),
      h("div", { class: "eo-colunas" },
        lista("Entregas", p.entregas),
        lista("Decide sozinho", p.decide),
        lista("Leva ao chefe", p.escala)),
      lista("Responsabilidades", p.responsabilidades),
      p.indicadores?.length ? h("p", { class: "field-hint" }, `Indicadores: ${p.indicadores.map((i) => nomeIndicador(setor, i)).join(" · ")}`) : null));
}

/** Cartao do diretor do setor com a agenda dele. */
export function cartaoDiretor(setor) {
  const d = setor.diretor;
  const chefe = d.reporta_a ? CATALOGO.find((s) => s.sigla === d.reporta_a) : null;
  return h("details", { class: "eo-cargo n-diretor", open: true },
    h("summary", null, h("strong", null, `${d.titulo} · ${d.nome}`), stamp("Diretor", "live"),
      h("span", { class: "field-hint" }, chefe ? `Reporta a: ${chefe.diretor.titulo}` : "Topo da empresa (exercido pelo fundador)")),
    h("div", { class: "eo-corpo" }, h("p", { class: "eo-missao" }, setor.missao), atividades(d.atividades), lista("Não decide sozinho", d.limites)));
}

/** Organograma de um setor em arvore (diretor -> gestao -> execucao). */
export function organogramaSetor(setor, aoEscolher) {
  const no = (n) => {
    const p = n.cargo;
    const rot = p ? p.nome : `${setor.sigla} · ${setor.diretor.titulo}`;
    const botao = h("button", { class: `eo-no n-${p ? p.nivel ?? "execucao" : "diretor"}${p?.fase === "crescimento" ? " f-crescimento" : ""}`, type: "button", "data-papel": p?.papel ?? setor.sigla }, rot);
    if (p && aoEscolher) botao.addEventListener("click", () => aoEscolher(p));
    return h("li", null, botao, n.filhos.length ? h("ul", null, n.filhos.map(no)) : null);
  };
  return h("ul", { class: "eo-arvore" }, no(arvoreSetor(setor)));
}

/** Aba Equipe de um setor: organograma + cartoes. */
export function painelEquipeSetor(setor) {
  const cartoes = h("div", { class: "eo-cartoes" }, cartaoDiretor(setor), setor.equipe.map((p) => cartaoCargo(setor, p)));
  const abrir = (p) => {
    const el = cartoes.querySelector(`#cargo-${setor.id}-${p.papel}`);
    if (el) { el.open = true; el.scrollIntoView?.({ block: "start", behavior: "smooth" }); }
  };
  return [
    panel({ title: "Organograma do setor", subtitle: "Proposta de estrutura: clique num cargo para ver o que ele faz. Tracejado = cargo para quando crescer (até lá, outra pessoa acumula)." },
      organogramaSetor(setor, abrir), legenda()),
    panel({ title: "Cargos e atividades", subtitle: "O que cada um faz todo dia, toda semana e todo mês, o que entrega, o que decide e o que leva ao chefe." }, cartoes),
  ];
}

const legenda = () => h("p", { class: "eo-legenda field-hint" },
  h("span", { class: "eo-chip n-diretor" }, "Diretor"), h("span", { class: "eo-chip n-gestao" }, "Gestão"),
  h("span", { class: "eo-chip n-assessoria" }, "Assessoria"), h("span", { class: "eo-chip n-execucao" }, "Execução"),
  h("span", { class: "eo-chip f-crescimento" }, "Quando crescer"));

function abaOrganograma(corpo, ir) {
  const arv = arvoreEmpresa(CATALOGO);
  const r = resumoEstrutura(CATALOGO);
  const bloco = (s) => h("article", { class: "eo-setor" },
    h("a", { class: "eo-setor-cab", href: `#/estrutura/${s.id}`, onclick: (e) => { e.preventDefault(); ir(s.id); } },
      h("span", { class: "pj-sigla" }, s.sigla), h("span", null, s.nome)),
    organogramaSetor(s, () => ir(s.id)));
  corpo.append(
    h("div", { class: "pj-resumo" },
      stat("Diretores", String(r.diretores)), stat("Cargos", String(r.cargos), `${r.gestao} de gestão · ${r.execucao} de execução · ${r.assessoria} de assessoria`),
      stat("Essenciais agora", String(r.essenciais), "funções que precisam existir já"), stat("Quando crescer", String(r.crescimento), "cargos dedicados no futuro"),
      stat("Atividades definidas", String(r.atividades), "diárias, semanais e mensais")),
    panel({ title: "Organograma da VOICE", subtitle: `${arv.setor.diretor.titulo} no topo; os diretores respondem a ela. Clique num setor para ver cada cargo.` },
      h("div", { class: "eo-topo" }, h("span", { class: "eo-no n-diretor" }, `${arv.setor.sigla} · ${arv.setor.diretor.titulo}`)),
      h("div", { class: "eo-setores" }, bloco(arv.setor), arv.diretores.flatMap(function plano(d) { return [bloco(d.setor), ...d.diretores.flatMap(plano)]; })),
      legenda()),
  );
}

function abaSetor(corpo, s) {
  corpo.append(panel({ title: `${s.sigla} · ${s.nome}`, subtitle: s.missao }, h("p", { class: "field-hint" }, `${s.equipe.length} cargos abaixo do diretor. Tudo é proposta até a direção aprovar.`)), ...painelEquipeSetor(s));
}

function abaAcumulos(corpo) {
  const itens = acumulos(CATALOGO);
  corpo.append(panel({ title: "Quem acumula o quê enquanto a empresa é pequena",
    subtitle: "Cargos marcados \"quando crescer\" ainda não têm pessoa dedicada: a função continua existindo e fica com quem está abaixo. Use para decidir a ordem das contratações." },
  h("ul", { class: "pj-topicos" }, itens.map(({ quem, cargos }) => {
    const nome = quem.tipo === "diretor" ? `${quem.setor.sigla} · ${quem.setor.diretor.titulo}` : quem.tipo === "cargo" ? `${quem.cargo.nome} (${quem.setor.sigla})` : quem.id;
    return h("li", null, h("details", { class: "pj-topico e-pendente" },
      h("summary", null, h("strong", null, nome), stamp(`${cargos.length} cargo(s) acumulado(s)`, cargos.length > 3 ? "warn" : "neutral")),
      h("div", { class: "pj-corpo" }, h("ul", null, cargos.map(({ setor, cargo }) => h("li", null, `${cargo.nome} — ${setor.sigla}: ${cargo.missao ?? ""}`))))));
  }))));
}

export function telaEstrutura(root, _signal, aba = "geral") {
  const corpo = h("div", { class: "stack" });
  const abas = [["geral", "Organograma"], ...CATALOGO.map((s) => [s.id, s.sigla]), ["acumulo", "Quem acumula"]];
  const botoes = abas.map(([k, r]) => {
    const b = h("button", { class: "tab", type: "button", role: "tab", "aria-selected": String(k === aba), "data-aba": k }, r);
    b.addEventListener("click", () => ir(k));
    return b;
  });
  function ir(k) {
    history.replaceState(null, "", `#/estrutura/${k}`);
    botoes.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.aba === k)));
    clear(corpo);
    const s = CATALOGO.find((x) => x.id === k);
    if (s) abaSetor(corpo, s);
    else if (k === "acumulo") abaAcumulos(corpo);
    else abaOrganograma(corpo, ir);
  }
  root.append(
    h("p", { class: "field-hint" }, "Proposta de estrutura da empresa: cargos são funções, não pessoas. Enquanto a VOICE é pequena, uma pessoa acumula várias funções. Nada aqui vale como decisão até você aprovar."),
    h("div", { class: "tabs setor-abas", role: "tablist", "aria-label": "Setores" }, botoes),
    corpo);
  ir(aba);
}
