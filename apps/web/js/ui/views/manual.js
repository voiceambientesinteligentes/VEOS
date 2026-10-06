// MANUAL DE ATUACAO do diretor (pesquisa com fontes): como um profissional senior da area age.
// Carregado sob demanda (apps/web/js/data/manuais/<setor>.js). "O que voce precisa?" acha o
// procedimento certo para o pedido; cada procedimento diz o que perguntar, os passos, o que
// entregar, como saber se ficou bom e quando levar a decisao para cima.
import { buscar, buscarSolto } from "../../domain/busca.js";
import { clear, h, method, panel, stamp, table } from "../dom.js";

export async function carregarManual(setor) {
  const { MANUAIS } = await import("../../data/manuais/indice.js");
  if (!MANUAIS.includes(setor)) return null;
  return (await import(`../../data/manuais/${setor}.js`)).default;
}

export function cartaoProcedimento(p, aberto = false) {
  return h("details", { class: "manual-proc", open: aberto },
    h("summary", null, h("strong", null, p.pedido)),
    h("div", { class: "stack-s" },
      p.perguntas_antes?.length ? h("div", null, h("p", { class: "manual-rotulo" }, "Antes de começar, pergunta:"), h("ul", null, p.perguntas_antes.map((x) => h("li", null, x)))) : null,
      h("div", null, h("p", { class: "manual-rotulo" }, "Como faz:"), h("ol", null, p.passos.map((x) => h("li", null, x)))),
      h("p", null, h("span", { class: "manual-rotulo" }, "Entrega: "), p.entregavel),
      p.criterios_de_qualidade?.length ? h("div", null, h("p", { class: "manual-rotulo" }, "Ficou bom quando:"), h("ul", null, p.criterios_de_qualidade.map((x) => h("li", null, x)))) : null,
      p.quando_escalar ? h("p", { class: "notice notice-warn" }, h("strong", null, "Leva para decisão superior quando: "), p.quando_escalar) : null));
}

export function painelManual(setor, m) {
  const itens = m.procedimentos.map((p, i) => ({ titulo: [p.pedido, ...(p.sinonimos ?? [])].join(" · "), extra: [...(p.passos ?? []), p.entregavel].join(" "), i }));
  const busca = h("input", { class: "input", type: "search", placeholder: "Ex.: campanha para arquitetos, fluxo de caixa, contratar técnico…", "aria-label": "O que você precisa?" });
  const resultado = h("div", { class: "stack-s" });
  const lista = h("div", { class: "stack-s" }, m.procedimentos.map((p) => cartaoProcedimento(p)));
  busca.addEventListener("input", () => {
    const q = busca.value.trim();
    clear(resultado);
    if (q.length < 3) return;
    const exatos = buscar(q, itens, 3);
    const achados = exatos.length ? exatos : buscarSolto(q, itens, 3);
    resultado.append(achados.length ? h("div", { class: "stack-s" }, h("p", { class: "field-hint" }, `Procedimento(s) mais próximo(s) de "${q}":`), achados.map((a) => cartaoProcedimento(m.procedimentos[a.i], true)))
      : h("p", { class: "field-hint" }, "Nenhum procedimento com essas palavras. Veja a lista completa abaixo ou registre a necessidade como ideia na Biblioteca."));
  });
  return h("div", { class: "stack" },
    panel({ title: `Manual de atuação · ${setor.diretor.titulo}`, subtitle: m.resumo },
      h("div", { class: "row" }, stamp(`${m.competencias.length} competências`, "live"), stamp(`${m.procedimentos.length} procedimentos`, "live"), stamp(`${m.frameworks.length} métodos`, "live"), stamp(`${m.fontes.length} fontes`, "neutral")),
      h("p", { class: "manual-rotulo" }, "O que você precisa?"), busca, resultado,
      h("div", { class: "row" }, h("a", { class: "btn btn-ghost", href: `#/diretores?setor=${setor.id}` }, `Perguntar ao ${setor.sigla}`))),
    panel({ title: "Como age em cada pedido", subtitle: "Procedimentos de um profissional sênior: o que pergunta antes, os passos, o que entrega e quando leva a decisão para cima." }, lista),
    panel({ title: "O que domina (competências de nível sênior)" },
      table({ caption: "Competências", head: ["Área", "Domina", "Sinal de senioridade"], rows: m.competencias.map((c) => [c.area, c.o_que_domina, c.sinal_de_senioridade ?? "—"]) })),
    panel({ title: "Métodos e frameworks" },
      h("div", { class: "stack-s" }, m.frameworks.map((f) => h("details", { class: "manual-proc" },
        h("summary", null, h("strong", null, f.nome), h("span", { class: "field-hint" }, ` · ${f.autor_ou_origem ?? ""}`)),
        h("p", null, h("span", { class: "manual-rotulo" }, "Quando usar: "), f.quando_usar ?? ""),
        h("ol", null, f.como_aplicar.map((x) => h("li", null, x))))))),
    panel({ title: "Indicadores que acompanha", subtitle: "Referências de mercado só com fonte; sem fonte, a meta é definida com dados da VOICE." },
      table({ caption: "Indicadores", head: ["Indicador", "Fórmula", "Para que serve", "Frequência", "Referência"], rows: m.indicadores.map((k) => [k.nome, k.formula, k.para_que_serve ?? "", k.frequencia ?? "", k.referencia ?? "definir com dados da VOICE"]) })),
    h("div", { class: "grid-2" },
      panel({ title: "Rotina" }, h("ul", { class: "list-plain stack-s" }, m.rotinas.map((r) => h("li", null, stamp(r.cadencia, "neutral"), " ", r.atividade)))),
      panel({ title: "Erros que evita" }, h("ul", null, m.armadilhas.map((x) => h("li", null, x))))),
    panel({ title: "Aplicação na VOICE" }, h("ul", null, m.aplicacao_voice.map((x) => h("li", null, x)))),
    panel({ title: "Formação de referência", subtitle: "Cursos e certificações usados como base do que um sênior desta área domina." },
      h("ul", { class: "list-plain stack-s" }, m.formacao_referencia.map((c) => h("li", null, c.url ? h("a", { href: c.url, target: "_blank", rel: "noopener noreferrer" }, c.nome) : c.nome, ` · ${c.instituicao ?? ""}`, c.o_que_cobre ? h("span", { class: "field-hint" }, ` — ${c.o_que_cobre}`) : null))),
      method(`Bibliografia (${m.bibliografia.length})`, ...m.bibliografia.map((b) => `${b.obra} — ${b.autor}`)),
      method(`Fontes pesquisadas (${m.fontes.length})`, ...m.fontes.map((f) => h("span", null, h("a", { href: f.url, target: "_blank", rel: "noopener noreferrer" }, f.titulo), f.o_que_extraiu ? ` — ${f.o_que_extraiu}` : "")))),
  );
}

/** Procedimento do manual mais proximo de um pedido em texto livre (regra, sem IA). */
export function procedimentoPara(m, pedido) {
  const itens = m.procedimentos.map((p, i) => ({ titulo: [p.pedido, ...(p.sinonimos ?? [])].join(" · "), extra: [...(p.passos ?? []), p.entregavel].join(" "), i }));
  const [a] = [...buscar(pedido, itens, 1), ...buscarSolto(pedido, itens, 1)];
  return a ? m.procedimentos[a.i] : null;
}
