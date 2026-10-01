// Pagina de um setor, montada a partir do catalogo (setores/<id>.json):
// Painel (alertas, tarefas, numeros) · Registros · Processos · Equipe · Rotinas ·
// Regras vivas · Diretor · Modelos. Registros sao gravados na API e disparam a varredura.
import { api } from "../../data/api.js";
import { formatBRL, formatDate } from "../../domain/format.js";
import { cartaoAlerta, descreverSentinela, formularioRegistro, linhaTarefa, nomePapel, setorPorId, SEV_ROTULO, SEV_TOM } from "../componentes.js";
import { clear, errorNotice, h, panel, stamp, table, testTag } from "../dom.js";
import { carregarManual, painelManual } from "./manual.js";

const ABAS = [["painel", "Painel"], ["registros", "Registros"], ["processos", "Processos"], ["equipe", "Equipe"], ["rotinas", "Rotinas"], ["regras", "Regras vivas"], ["diretor", "Diretor"], ["manual", "Manual"], ["modelos", "Modelos"]];
const statusTag = (s) => stamp(s === "POLITICA" ? "Política oficial" : "Proposta", s === "POLITICA" ? "live" : "neutral");

export async function telaSetor(root, id, signal, aba = "painel") {
  const setor = setorPorId[id];
  if (!setor) return root.append(errorNotice("Setor inexistente."));
  let dados;
  try {
    dados = await api.setor(id);
  } catch (e) {
    if (e.status === 403) return root.append(panel({ title: `${setor.sigla} · ${setor.nome}` }, h("p", null, "Acesso restrito: este setor guarda dados sensíveis e só é aberto para a direção e a equipe do setor.")));
    throw e;
  }
  const d = setor.diretor;
  const corpo = h("div", { class: "stack" });
  const botoes = ABAS.map(([k, rotulo]) => {
    const b = h("button", { class: "tab", type: "button", role: "tab", "aria-selected": String(k === aba) }, rotulo);
    b.addEventListener("click", () => {
      history.replaceState(null, "", `#/setor/${id}/${k}`);
      botoes.forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      mostrar(k);
    });
    return b;
  });
  root.append(
    h("header", { class: "setor-cabeca" },
      h("span", { class: "setor-sigla" }, setor.sigla),
      h("div", null, h("h2", { class: "setor-nome" }, setor.nome), h("p", { class: "setor-missao" }, setor.missao)),
      h("div", { class: "setor-diretor" }, h("span", { class: "field-hint" }, d.titulo), h("strong", null, d.nome))),
    h("div", { class: "tabs setor-abas", role: "tablist", "aria-label": `Abas de ${setor.nome}` }, botoes),
    corpo,
  );

  const recarregar = async (k) => {
    dados = await api.setor(id);
    if (!signal.aborted) mostrar(k);
  };

  function mostrar(k) {
    clear(corpo);
    ({ painel, registros, processos, equipe, rotinas, regras, diretor, manual, modelos }[k] ?? painel)();
  }

  // ------------------------------------------------ Manual de atuacao (carregado sob demanda)
  function manual() {
    const area = h("div", { class: "stack" }, h("p", { class: "field-hint" }, "Carregando o manual…"));
    corpo.append(area);
    carregarManual(id).then((m) => {
      if (signal.aborted) return;
      clear(area).append(m ? painelManual(setor, m) : h("p", { class: "result-empty" }, "Manual deste diretor ainda em pesquisa."));
    }).catch((e) => clear(area).append(errorNotice(`Não foi possível abrir o manual: ${e.message}`)));
  }

  // ------------------------------------------------ Painel
  function painel() {
    const porTipo = setor.registros.map((t) => {
      const doTipo = dados.registros.filter((r) => r.tipo === t.tipo);
      const abertos = doTipo.filter((r) => !t.estados_finais.includes(r.estado)).length;
      return [t.nome, String(doTipo.length), String(abertos), t.estados.map((e) => `${e}: ${doTipo.filter((r) => r.estado === e).length}`).join(" · ")];
    });
    corpo.append(
      panel({ title: "Alertas do setor", subtitle: "Gerados pelas regras vivas. Somem sozinhos quando a situação é resolvida.", actions: testTag() },
        dados.alertas.length
          ? h("ul", { class: "list-plain stack-s" }, dados.alertas.map((a) => cartaoAlerta({ ...a, setor_id: id }, { aoDispensar: () => recarregar("painel") })))
          : h("p", { class: "result-empty" }, "Nenhum alerta ativo. As regras vivas estão vigiando.")),
      panel({ title: "Tarefas abertas" },
        dados.tarefas.length
          ? h("ul", { class: "list-plain stack-s" }, dados.tarefas.map((t) => linhaTarefa({ ...t, setor_id: id }, { aoConcluir: () => recarregar("painel") })))
          : h("p", { class: "result-empty" }, "Nenhuma tarefa aberta.")),
      panel({ title: "Números do setor" },
        table({ caption: "Registros por tipo", head: ["Tipo", "Total", "Em aberto", "Por estado"], rows: porTipo, align: ["", "r", "r", ""] })),
      panel({ title: "Indicadores", subtitle: "Definições e metas. Marcadas como Proposta até a direção aprovar." },
        table({ caption: "Indicadores", head: ["Indicador", "Fórmula", "Meta", "Frequência", "Origem"],
          rows: (setor.indicadores || []).map((i) => [i.nome, i.formula, i.meta, i.frequencia, statusTag(i.status)]) })),
    );
  }

  // ------------------------------------------------ Registros
  function registros() {
    const escolha = h("div", { class: "segmented", role: "radiogroup", "aria-label": "Tipo de registro" });
    const area = h("div", { class: "stack" });
    let tipoAtual = setor.registros[0];
    setor.registros.forEach((t, i) => {
      const r = h("input", { type: "radio", name: "tipo-registro", value: t.tipo, checked: i === 0 });
      r.addEventListener("change", () => { tipoAtual = t; lista(); });
      escolha.append(h("label", null, r, t.nome));
    });
    function lista(editar = null) {
      const t = tipoAtual;
      const doTipo = dados.registros.filter((r) => r.tipo === t.tipo);
      const linhas = doTipo.map((r) => {
        const abrir = h("button", { class: "btn btn-ghost", type: "button" }, "Abrir");
        abrir.addEventListener("click", () => lista(r));
        return [r.titulo, stamp(r.estado, t.estados_finais.includes(r.estado) ? "neutral" : "live"), nomePapel(setor, r.responsavel), r.prazo ? formatDate(r.prazo) : "—", r.valor ? formatBRL(r.valor) : "—", formatDate(r.atualizado_em), abrir];
      });
      const aoSalvar = async (res) => {
        await recarregar("registros");
        const alertas = res.alertas_do_registro || [];
        if (alertas.length) {
          corpo.prepend(panel({ title: "O setor reagiu a este registro" },
            h("ul", { class: "list-plain stack-s" }, alertas.map((a) => h("li", null, stamp(SEV_ROTULO[a.severidade], SEV_TOM[a.severidade]), " ", h("strong", null, a.titulo), h("p", { class: "field-hint" }, a.mensagem))))));
        }
      };
      clear(area).append(
        panel({ title: t.nome, subtitle: t.descricao || "", actions: testTag() },
          doTipo.length
            ? table({ caption: `${t.nome} (${doTipo.length})`, head: ["Título", "Estado", "Responsável", "Prazo", "Valor", "Atualizado", ""], rows: linhas, align: ["", "", "", "", "r", "", ""] })
            : h("p", { class: "result-empty" }, `Nenhum registro de ${t.nome.toLowerCase()} ainda.`)),
        panel({ title: editar ? `Editar: ${editar.titulo}` : `Novo registro: ${t.nome}` },
          formularioRegistro(setor, t, editar, aoSalvar),
          editar ? h("button", { class: "btn btn-ghost", type: "button", onclick: () => lista() }, "Cancelar edição") : null),
      );
    }
    corpo.append(panel({ title: "Registros do setor", subtitle: "Cada registro é vigiado pelas regras vivas. Toda mudança fica no histórico." }, escolha), area);
    lista();
  }

  // ------------------------------------------------ Processos, equipe, rotinas
  function processos() {
    corpo.append(...(setor.processos || []).map((p) => panel({ title: p.nome, subtitle: p.descricao || "" },
      h("ol", { class: "processo-etapas" }, (p.etapas || []).map((e) => h("li", null,
        h("strong", null, e.nome), h("span", { class: "field-hint" }, ` · ${nomePapel(setor, e.responsavel)}`),
        e.criterio_saida ? h("p", { class: "field-hint" }, `Sai da etapa quando: ${e.criterio_saida}`) : null))))));
  }
  function equipe() {
    corpo.append(panel({ title: "Equipe do setor", subtitle: `Coordenada por ${d.titulo} · ${d.nome}` },
      h("div", { class: "grade-cartoes" }, setor.equipe.map((p) => h("article", { class: "panel panel-tight cartao-papel" },
        h("p", { class: "cartao-papel-nome" }, p.nome), h("p", { class: "field-hint" }, `Reporta a: ${p.reporta_a || setor.sigla}`),
        h("ul", null, (p.responsabilidades || []).map((x) => h("li", null, x))))))));
  }
  function rotinas() {
    corpo.append(panel({ title: "Rotinas", subtitle: "O ritmo do setor: o que acontece todo dia, semana e mês." },
      h("div", { class: "grade-cartoes" }, (setor.rotinas || []).map((r) => h("article", { class: "panel panel-tight" },
        h("div", { class: "row" }, stamp(r.frequencia, "live"), h("strong", null, r.nome)),
        h("p", { class: "field-hint" }, `Responsável: ${nomePapel(setor, r.responsavel)}`),
        h("ol", null, (r.passos || []).map((x) => h("li", null, x))))))));
  }

  // ------------------------------------------------ Regras vivas
  function regras() {
    corpo.append(panel({ title: "Regras vivas (sentinelas)", subtitle: "O que o setor vigia sozinho e o que faz quando algo sai do esperado." },
      h("ul", { class: "list-plain stack-s" }, setor.sentinelas.map((s) => h("li", { class: "panel panel-tight" },
        h("div", { class: "row" }, stamp(SEV_ROTULO[s.severidade], SEV_TOM[s.severidade]), h("strong", null, s.titulo.replace(/\{\{[^}]+\}\}/g, "…")), statusTag(s.status)),
        h("p", null, descreverSentinela(setor, s)),
        (s.acoes || []).length ? h("p", { class: "field-hint" }, `Então: ${(s.acoes || []).map((a) => a.tipo === "tarefa" ? `cria tarefa para ${nomePapel(setor, a.papel)}` : a.tipo === "rascunho" ? "prepara rascunho de mensagem" : `avisa ${a.para}`).join(" · ")}`) : null,
        h("p", { class: "field-hint" }, `Fonte: ${s.fonte || "—"}`))))));
  }

  // ------------------------------------------------ Diretor
  function diretor() {
    const lista = (titulo, itens) => (itens?.length ? h("div", null, h("p", { class: "diretor-sec" }, titulo), h("ul", null, itens.map((x) => h("li", null, x)))) : null);
    corpo.append(panel({ title: `${d.nome}`, subtitle: `${d.titulo} · persona fictícia do conselho consultivo`, actions: stamp(setor.sigla, "live") },
      h("p", { class: "diretor-perfil" }, d.perfil),
      lista("Especialidades", d.especialidades),
      d.metodos?.length ? h("div", null, h("p", { class: "diretor-sec" }, "Métodos que aplica"),
        h("ul", null, d.metodos.map((m) => h("li", null, h("strong", null, m.nome), m.autor ? ` (${m.autor})` : "", ` — ${m.uso}`)))) : null,
      lista("Princípios", d.principios),
      d.como_aconselha ? h("div", null, h("p", { class: "diretor-sec" }, "Como aconselha"), h("p", null, d.como_aconselha)) : null,
      lista("Perguntas que sempre faz à direção", d.perguntas_chave),
      lista("O que não decide sozinho", d.limites),
      (setor.relacoes || []).length ? lista("Relações com outros setores", setor.relacoes.map((r) => `${setorPorId[r.setor]?.sigla ?? r.setor}: ${r.fluxo}`)) : null,
      (setor.fontes || []).length ? lista("Fontes de conhecimento", setor.fontes.map((f) => `${f.titulo} (${f.tipo})`)) : null));
  }

  // ------------------------------------------------ Modelos
  function modelos() {
    corpo.append(panel({ title: "Modelos de mensagens e documentos", subtitle: "Usados pelas regras vivas para preparar rascunhos." },
      h("ul", { class: "list-plain stack-s" }, (setor.modelos || []).map((m) => h("li", { class: "panel panel-tight" },
        h("div", { class: "row" }, stamp(m.tipo, "neutral"), h("strong", null, m.assunto || m.id)),
        h("pre", { class: "rascunho-corpo" }, m.corpo))))),
      (setor.documentos || []).length ? panel({ title: "Documentos e checklists padrão" }, h("ul", null, setor.documentos.map((x) => h("li", null, x)))) : "");
  }

  mostrar(aba);
}
