// BIBLIOTECA: memoria institucional do VEOS (decisoes e precedentes, erros e aprendizados,
// pesquisas e referencias, politicas vigentes, revisoes em andamento) e governanca (fundador,
// autoridades, alcadas e lacunas). As regras ficam no servidor e no banco; esta tela so mostra
// e envia. A busca de precedentes e por regras (texto, escopo, validade, versao): NAO e IA.
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { formatDate, formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, method, panel, stamp, table } from "../dom.js";

export const TIPOS = { preferencia: "Preferência", ideia: "Ideia", proposta: "Proposta", decisao: "Decisão", politica: "Política", excecao: "Exceção", incidente: "Erro / incidente", aprendizado: "Aprendizado", referencia: "Pesquisa / referência" };
const ESTADOS = {
  ativa: ["Ativa", "live"], inativa: ["Inativa", "neutral"], aberta: ["Aberta", "live"], em_analise: ["Em análise", "warn"], virou_proposta: ["Virou proposta", "neutral"], arquivada: ["Arquivada", "neutral"],
  rascunho: ["Rascunho", "neutral"], em_consulta: ["Em consulta", "warn"], aprovada: ["Aprovada", "ok"], rejeitada: ["Rejeitada", "risk"], retirada: ["Retirada", "neutral"],
  vigente: ["Vigente", "ok"], substituida: ["Substituída", "neutral"], revogada: ["Revogada", "risk"], expirada: ["Expirada", "neutral"],
  aberto: ["Aberto", "risk"], em_investigacao: ["Em investigação", "warn"], corrigido: ["Corrigido (verificação pendente)", "warn"], verificado: ["Verificado", "ok"], encerrado: ["Encerrado", "neutral"],
  hipotese: ["Hipótese", "warn"], em_verificacao: ["Em verificação", "warn"], validado: ["Validado", "ok"], refutado: ["Refutado", "risk"], desatualizada: ["Desatualizada", "neutral"],
};
const ESTADOS_TIPO = {
  preferencia: ["ativa", "inativa"], ideia: ["aberta", "em_analise", "virou_proposta", "arquivada"], proposta: ["rascunho", "em_consulta", "aprovada", "rejeitada", "retirada"],
  decisao: ["vigente", "substituida", "revogada", "expirada"], politica: ["vigente", "substituida", "revogada"], excecao: ["vigente", "expirada", "revogada"],
  incidente: ["aberto", "em_investigacao", "corrigido", "verificado", "encerrado"], aprendizado: ["hipotese", "em_verificacao", "validado", "refutado"], referencia: ["ativa", "desatualizada"],
};
const AREAS = [
  ["governanca", "Governança", "O fundador, as autoridades, as alçadas conhecidas e as lacunas."],
  ["decisoes", "Decisões e precedentes", "O que foi decidido, por quem, por quê, em que contexto e sob quais condições."],
  ["aprendizados", "Erros e aprendizados", "O que aconteceu, impacto, causa (confirmada ou em investigação), correção, prevenção e verificação."],
  ["referencias", "Pesquisas e referências", "Artigos, especialistas, métodos, documentação técnica e evidências internas."],
  ["politicas", "Políticas vigentes", "Regras formalmente aprovadas, alcance, responsáveis e versões."],
  ["revisoes", "Revisões em andamento", "Ideias, propostas, divergências, pareceres pendentes e conflitos encaminhados."],
  ["consultar", "Consultar precedentes", "Antes de recomendar ou executar: o que já existe sobre o tema e o que vale."],
];
const AREA_TIPOS = { decisoes: ["decisao", "excecao", "preferencia"], aprendizados: ["incidente", "aprendizado"], referencias: ["referencia"], politicas: ["politica"], revisoes: ["proposta", "ideia"] };
const NATUREZA = { fato_verificado: ["Fato verificado", "ok"], opiniao_fonte: ["Opinião da fonte", "live"], inferencia: ["Inferência do líder", "warn"], hipotese: ["Hipótese a validar", "warn"] };
const PARTICIPACAO = { informado: "Informado (ciência)", consultado: "Consultado (parecer)", aprovador: "Aprovador (alçada)" };
const POSICAO = { concorda: "Concorda", concorda_com_ressalvas: "Concorda com ressalvas", discorda: "Discorda", aprova: "Aprova", nao_aprova: "Não aprova", abstem: "Abstém-se" };
const AUTORIDADES = [["fundador", "Fundador"], ["ceo", "CEO"], ["direcao", "Direção"], ...CATALOGO.filter((s) => s.id !== "direcao").map((s) => [`setor:${s.id}`, `${s.sigla} · ${s.nome}`])];
const nomeAut = (a) => AUTORIDADES.find(([v]) => v === a)?.[1] ?? a ?? "—";
const nomeSetor = (id) => CATALOGO.find((s) => s.id === id)?.nome ?? id;
const est = (e) => stamp(...(ESTADOS[e] ?? [e, "neutral"]));
const botao = (t, tom = "ghost") => h("button", { class: `btn btn-${tom}`, type: "button" }, t);
const entrada = (id, attrs = {}) => h("input", { class: "input", id, type: "text", autocomplete: "off", ...attrs });
const area = (id, linhas = 3) => h("textarea", { class: "input", id, rows: linhas });
const escolha = (id, opcoes, valor = "") => h("select", { class: "select", id }, opcoes.map(([v, t]) => h("option", { value: v, selected: v === valor }, t)));
const hoje = () => new Date().toISOString().slice(0, 10);
const v = (id) => document.getElementById(id)?.value?.trim() ?? "";
const listaCsv = (s) => s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
const naoIA = () => h("p", { class: "field-hint" }, "Busca por regras (texto, escopo, validade, versão e autoridade). Não é raciocínio de IA: a camada de IA dos líderes ainda não está ligada.");

/** append que ignora partes vazias (null/undefined/false), para nunca escrever "null" na tela. */
const por = (el, ...xs) => { el.append(...xs.flat().filter((x) => x !== null && x !== undefined && x !== false)); return el; };

function acao(b, saida, fn) {
  b.addEventListener("click", async () => {
    b.disabled = true; clear(saida);
    try { await fn(); } catch (e) { saida.append(errorNotice(e.message)); b.disabled = false; }
  });
  return b;
}

// ---------------------------------------------------------------- tela principal
export async function telaBiblioteca(root, areaAtual = "decisoes", eu) {
  const abas = h("nav", { class: "tabs bib-abas", "aria-label": "Áreas da Biblioteca" }, AREAS.map(([id, nome]) =>
    h("a", { class: `tab${id === areaAtual ? " ativo" : ""}`, href: `#/biblioteca/${id}`, "aria-current": id === areaAtual ? "page" : null }, nome)));
  const desc = AREAS.find(([id]) => id === areaAtual)?.[2] ?? "";
  const corpo = h("div", { class: "stack" });
  root.append(abas, h("p", { class: "field-hint" }, desc), corpo);
  if (areaAtual === "governanca") return governanca(corpo, eu);
  if (areaAtual === "consultar") return consultar(corpo);
  return listar(corpo, areaAtual, eu);
}

async function listar(corpo, areaAtual, eu) {
  const tipos = AREA_TIPOS[areaAtual] ?? [];
  const f = {
    busca: entrada("bib-busca", { type: "search", placeholder: "Assunto, título ou código (BIB-0001)" }),
    setor: escolha("bib-setor", [["", "Todos os setores"], ...CATALOGO.map((s) => [s.id, s.nome])]),
    tipo: escolha("bib-tipo", [["", "Todos os tipos"], ...tipos.map((t) => [t, TIPOS[t]])]),
    estado: escolha("bib-estado", [["", "Todas as situações"], ...[...new Set(tipos.flatMap((t) => ESTADOS_TIPO[t]))].map((e) => [e, ESTADOS[e]?.[0] ?? e])]),
    responsavel: entrada("bib-resp", { placeholder: "Responsável ou autor" }),
    de: entrada("bib-de", { type: "date" }), ate: entrada("bib-ate", { type: "date" }),
  };
  const lista = h("div", { "aria-live": "polite" });
  const novo = botao("+ Novo registro", "primary");
  const formArea = h("div");
  novo.addEventListener("click", () => { clear(formArea); formArea.append(formularioNovo(tipos[0] ?? "ideia", eu)); formArea.scrollIntoView({ behavior: "smooth" }); });
  let t;
  async function carregar() {
    por(clear(lista), h("p", { class: "muted" }, "Carregando…"));
    try {
      const filtros = { busca: f.busca.value.trim(), setor: f.setor.value, estado: f.estado.value, responsavel: f.responsavel.value.trim(), de: f.de.value, ate: f.ate.value };
      const d = await api.bibListar(f.tipo.value ? { ...filtros, tipo: f.tipo.value } : { ...filtros, area: areaAtual });
      por(clear(lista), 
        d.registros.length
          ? table({ caption: `${d.registros.length} registro(s)`, head: ["Código", "Tipo", "Título", "Situação", "Escopo", "Autoridade", "Registrado"],
              rows: d.registros.map((r) => [h("a", { href: `#/biblioteca/r/${r.id}` }, r.codigo), TIPOS[r.tipo], h("span", null, r.titulo, r.hipotese ? h("span", null, " ", stamp("HIPÓTESE A VALIDAR", "warn")) : null, r.restrito ? h("span", null, " ", stamp("Restrito", "neutral")) : null, r.versao > 1 ? h("span", { class: "field-hint" }, ` v${r.versao}`) : null),
                est(r.estado), r.setores?.length ? r.setores.map(nomeSetor).join(", ") : "Empresa toda", nomeAut(r.autoridade), formatDate(r.registrado_em)]) })
          : h("p", { class: "result-empty" }, "Nenhum registro com estes filtros."),
        d.pareceres_pendentes?.length ? panel({ title: "Pareceres pendentes", subtitle: "Ausência de resposta não é aprovação." },
          table({ head: ["Registro", "Setor", "Participação", "Motivo", "Prazo", "Conclui"], rows: d.pareceres_pendentes.map((p) => [h("a", { href: `#/biblioteca/r/${p.registro_id}` }, p.registro?.codigo ?? "—"), nomeSetor(p.setor_id), p.encaminhamento ? `Encaminhado: ${p.encaminhamento === "ceo" ? "CEO" : "fundador"}` : PARTICIPACAO[p.participacao], p.motivo, p.prazo ? formatDate(p.prazo) : "—", p.responsavel_conclusao]) })) : null);
    } catch (e) { por(clear(lista), errorNotice(e.message)); }
  }
  for (const c of Object.values(f)) c.addEventListener(c.tagName === "SELECT" || c.type === "date" ? "change" : "input", () => { clearTimeout(t); t = setTimeout(carregar, 300); });
  corpo.append(
    panel({ title: AREAS.find(([id]) => id === areaAtual)?.[1], actions: novo },
      h("div", { class: "form-grid bib-filtros" }, field("bib-busca", "Pesquisar", f.busca), field("bib-setor", "Setor", f.setor), field("bib-tipo", "Tipo", f.tipo), field("bib-estado", "Situação", f.estado),
        field("bib-resp", "Responsável", f.responsavel), field("bib-de", "De", f.de), field("bib-ate", "Até", f.ate)),
      lista),
    formArea);
  await carregar();
}

// ---------------------------------------------------------------- governanca
async function governanca(corpo, eu) {
  const g = await api.bibGovernanca();
  const fundador = g.autoridades.filter((a) => a.autoridade === "fundador").map((a) => a.membro?.nome).filter(Boolean);
  const lacunas = g.alcadas.filter((x) => x.autoridade === "lacuna");
  por(corpo,
    panel({ title: "Fundador", subtitle: fundador.length ? `${fundador.join(", ")} · decisor final nos assuntos reservados ao fundador` : "Ninguém registrado como fundador" },
      h("ul", { class: "list-plain stack-s" },
        h("li", null, "Decide por último nos assuntos reservados a ele. Decisões rotineiras dentro das alçadas aprovadas continuam com os responsáveis."),
        h("li", null, "Suas decisões são registradas e consideradas nos casos relacionados, e podem ser questionadas por qualquer líder, gestor ou secretaria, com fundamento."),
        h("li", null, "Discordância não altera nem ignora uma decisão vigente: vira parecer ou proposta de revisão. Isso vale para todos, inclusive para o fundador (o banco recusa alteração silenciosa)."),
        h("li", null, "Conflitos sem solução vão à CEO para coordenação e, acima da alçada dela, ao fundador.")),
      lacunas.some((x) => x.id === "assuntos_reservados_fundador") ? h("p", { class: "notice notice-warn" }, "LACUNA: a lista de assuntos reservados ao fundador ainda não foi definida. Veja a proposta na área Revisões em andamento.") : null,
      g.eu.autoridades.length ? h("p", { class: "field-hint" }, `Você exerce: ${g.eu.autoridades.join(", ")}.`) : null),
    panel({ title: "Alçadas conhecidas e lacunas", subtitle: "Só o que tem fonte. O que não está definido aparece como lacuna para decisão — nada inventado." },
      table({ head: ["Assunto", "Regra", "Quem decide", "Fonte"], rows: g.alcadas.map((x) => [x.assunto, x.regra, x.autoridade === "lacuna" ? stamp("LACUNA · a definir", "warn") : nomeAut(x.autoridade), x.fonte]) })),
    g.encaminhamentos.length ? panel({ title: "Conflitos encaminhados", subtitle: "Aguardando a CEO ou o fundador." },
      table({ head: ["Registro", "Para", "Motivo", "Prazo"], rows: g.encaminhamentos.map((p) => [h("a", { href: `#/biblioteca/r/${p.registro.id}` }, p.registro.codigo), p.encaminhamento === "ceo" ? "CEO" : "Fundador", p.motivo, p.prazo ? formatDate(p.prazo) : "—"]) })) : null,
    g.meus_pareceres.length ? panel({ title: "Pareceres pedidos ao seu setor" },
      table({ head: ["Registro", "Participação", "Motivo", "Prazo"], rows: g.meus_pareceres.map((p) => [h("a", { href: `#/biblioteca/r/${p.registro.id}` }, `${p.registro.codigo} · ${p.registro.titulo}`), PARTICIPACAO[p.participacao], p.motivo, p.prazo ? formatDate(p.prazo) : "—"]) })) : null);
}

// ---------------------------------------------------------------- consultar precedentes
async function consultar(corpo, inicial = {}) {
  const termos = entrada("cons-termos", { placeholder: "Ex.: desconto margem kits", value: inicial.termos ?? "" });
  const setor = escolha("cons-setor", [["", "Qualquer setor"], ...CATALOGO.map((s) => [s.id, s.nome])], inicial.setor ?? "");
  const data = entrada("cons-data", { type: "date", value: hoje() });
  const saida = h("div", { class: "stack-s", "aria-live": "polite" });
  const b = botao("Consultar", "primary");
  acao(b, saida, async () => { b.disabled = false; renderConsulta(saida, await api.bibConsultar({ termos: termos.value.trim(), setor: setor.value, data: data.value, contexto: "biblioteca" })); });
  corpo.append(panel({ title: "Consultar precedentes", subtitle: "Mostra o que vale e o que não vale (e por quê). Um caso parecido não é automaticamente aplicável; precedente não autoriza executar." },
    h("div", { class: "form-grid" }, field("cons-termos", "Tema", termos), field("cons-setor", "Setor do caso", setor), field("cons-data", "Data do caso", data)), h("div", { class: "row" }, b), naoIA(), saida));
}

export function renderConsulta(alvo, c) {
  por(clear(alvo), 
    c.faltantes ? h("p", { class: "notice notice-warn" }, c.faltantes) : null,
    c.conflitos?.length ? h("div", { class: "notice notice-risk" }, c.conflitos.map((x) => h("p", null, `Conflito: ${x.motivo} (${(x.registros ?? []).join(", ")})`))) : null,
    c.considerados?.length ? h("ul", { class: "list-plain stack-s" }, c.considerados.map((x) => h("li", { class: "panel panel-tight" },
      h("div", { class: "row" }, x.aplicavel ? stamp("Aplicável", "ok") : stamp("Não aplicável", "neutral"), h("a", { href: `#/biblioteca/r/${x.id}` }, `${x.codigo} · ${TIPOS[x.tipo]}${x.versao > 1 ? ` v${x.versao}` : ""}`), est(x.estado)),
      h("strong", null, x.titulo), h("p", { class: "field-hint" }, x.motivo)))) : null,
    h("p", { class: "field-hint" }, `Consulta registrada (${c.consulta_id}) para rastreabilidade.`));
}

// ---------------------------------------------------------------- novo registro
function campoFonte(prefixo) {
  return h("fieldset", { class: "zoho-grupo" }, h("legend", null, "Fonte ou evidência (opcional)"),
    h("div", { class: "form-grid" },
      field(`${prefixo}-ftipo`, "Tipo", escolha(`${prefixo}-ftipo`, [["", "—"], ["interna", "Dado interno"], ["especialista", "Especialista"], ["pesquisa", "Pesquisa/artigo"], ["documentacao", "Documentação técnica"], ["metodo", "Método reconhecido"]])),
      field(`${prefixo}-fnat`, "Natureza", escolha(`${prefixo}-fnat`, Object.entries(NATUREZA).map(([k, [t]]) => [k, t]))),
      field(`${prefixo}-ftit`, "Título", entrada(`${prefixo}-ftit`)), field(`${prefixo}-faut`, "Autor ou instituição", entrada(`${prefixo}-faut`)),
      field(`${prefixo}-fdata`, "Data", entrada(`${prefixo}-fdata`, { placeholder: "AAAA-MM-DD ou ano" })), field(`${prefixo}-flink`, "Link", entrada(`${prefixo}-flink`, { placeholder: "https://…" })),
      field(`${prefixo}-fper`, "Origem/versão/período (interna)", entrada(`${prefixo}-fper`))),
    field(`${prefixo}-ftre`, "Trecho ou síntese pertinente", area(`${prefixo}-ftre`, 2)),
    h("label", { class: "row" }, h("input", { type: "checkbox", id: `${prefixo}-facc` }), " Eu li/acessei esta fonte (sem isso, não conta como evidência)"));
}
function lerFonte(prefixo) {
  if (!v(`${prefixo}-ftipo`) || !v(`${prefixo}-ftit`)) return [];
  return [{ tipo: v(`${prefixo}-ftipo`), natureza: v(`${prefixo}-fnat`), titulo: v(`${prefixo}-ftit`), autor: v(`${prefixo}-faut`) || null, data_fonte: v(`${prefixo}-fdata`) || null, link: v(`${prefixo}-flink`) || null,
    trecho: v(`${prefixo}-ftre`) || null, versao_periodo: v(`${prefixo}-fper`) || null, acessada: document.getElementById(`${prefixo}-facc`).checked }];
}
const setoresCheck = (prefixo) => h("fieldset", { class: "zoho-grupo" }, h("legend", null, "Escopo (setores afetados; nenhum = empresa toda)"),
  h("div", { class: "row bib-setores" }, CATALOGO.map((s) => h("label", null, h("input", { type: "checkbox", name: `${prefixo}-setor`, value: s.id }), ` ${s.sigla}`))));
const lerSetores = (prefixo) => [...document.querySelectorAll(`input[name="${prefixo}-setor"]:checked`)].map((x) => x.value);

function formularioNovo(tipoInicial, eu) {
  const tipo = escolha("nv-tipo", Object.entries(TIPOS), tipoInicial);
  const especificos = h("div", { class: "stack-s" });
  const saida = h("div", { role: "status" });
  const salvar = botao("Registrar", "primary");
  function desenhar() {
    const t = tipo.value;
    const aprova = ["decisao", "politica", "excecao"].includes(t);
    clear(especificos).append(
      ["decisao", "politica", "excecao", "proposta"].includes(t) ? h("div", { class: "form-grid" },
        field("nv-aut", aprova ? "Autoridade que aprovou" : "Quem decide esta proposta", escolha("nv-aut", [["", "—"], ...AUTORIDADES])),
        field("nv-resp", "Responsável pela execução", entrada("nv-resp", { placeholder: "Ex.: CSO, comprador" })),
        aprova ? field("nv-desde", "Passa a valer em", entrada("nv-desde", { type: "date", value: hoje() })) : null,
        aprova ? field("nv-ate", "Válida até", entrada("nv-ate", { type: "date" })) : null,
        aprova ? field("nv-rev", "Revisar quando", entrada("nv-rev", { placeholder: "Ex.: a cada 6 meses ou se o ticket médio cair" })) : null,
        t === "excecao" ? field("nv-exc", "Código da regra excepcionada", entrada("nv-exc", { placeholder: "BIB-0001" })) : null) : null,
      ["decisao", "politica", "excecao", "proposta"].includes(t) ? h("div", { class: "form-grid" },
        field("nv-just", `Justificativa${aprova ? " *" : ""}`, area("nv-just")), field("nv-ctx", "Contexto", area("nv-ctx")),
        field("nv-cond", "Condições", area("nv-cond", 2)), field("nv-esp", "Resultado esperado", area("nv-esp", 2))) : null,
      t === "incidente" ? h("div", { class: "form-grid" },
        field("nv-quando", "Quando ocorreu", entrada("nv-quando", { type: "date", value: hoje() })), field("nv-espd", "Resultado esperado", area("nv-espd", 2)), field("nv-obs", "Resultado observado", area("nv-obs", 2)),
        field("nv-imp", "Impacto", area("nv-imp", 2)), field("nv-evid", "Evidências", area("nv-evid", 2)), field("nv-causa", "Causa (só a confirmada; senão, hipóteses)", area("nv-causa", 2)),
        h("label", { class: "row" }, h("input", { type: "checkbox", id: "nv-causa-ok" }), " Causa confirmada por evidência"),
        field("nv-cont", "Contenção e correção", area("nv-cont", 2)), field("nv-prev", "Medida preventiva", area("nv-prev", 2)), field("nv-iresp", "Responsável e prazo", entrada("nv-iresp"))) : null,
      t === "aprendizado" ? field("nv-verif", "Como verificar a eficácia", area("nv-verif", 2)) : null,
      aprova ? h("label", { class: "row bib-confirma" }, h("input", { type: "checkbox", id: "nv-confirmo" }), ` Confirmo que esta ${TIPOS[t].toLowerCase()} foi aprovada pela autoridade indicada (uma frase ou ideia não é decisão)`) : null);
  }
  tipo.addEventListener("change", desenhar);
  desenhar();
  acao(salvar, saida, async () => {
    const t = tipo.value;
    let excecaoDe = null;
    if (t === "excecao" && v("nv-exc")) {
      const d = await api.bibListar({ busca: v("nv-exc") });
      excecaoDe = d.registros.find((r) => r.codigo === v("nv-exc").toUpperCase())?.id;
      if (!excecaoDe) throw new Error("Regra excepcionada não encontrada (confira o código).");
    }
    const dados = t === "incidente" ? { quando: v("nv-quando"), esperado: v("nv-espd"), observado: v("nv-obs"), impacto: v("nv-imp"), evidencias: v("nv-evid"), causa: v("nv-causa"), causa_confirmada: document.getElementById("nv-causa-ok").checked, correcao: v("nv-cont"), prevencao: v("nv-prev"), responsavel_prazo: v("nv-iresp") }
      : t === "aprendizado" ? { como_verificar: v("nv-verif") } : {};
    const r = await api.bibCriar({
      tipo: t, titulo: v("nv-tit"), conteudo: v("nv-cont-principal"), assuntos: listaCsv(v("nv-ass")), setores: lerSetores("nv"), restrito: document.getElementById("nv-restrito").checked,
      autoridade: v("nv-aut") || null, responsavel: v("nv-resp") || null, vigente_desde: v("nv-desde") || null, valido_ate: v("nv-ate") || null, revisar_quando: v("nv-rev") || null,
      justificativa: v("nv-just") || null, contexto: v("nv-ctx") || null, condicoes: v("nv-cond") || null, resultado_esperado: v("nv-esp") || null,
      confirmo_aprovacao: document.getElementById("nv-confirmo")?.checked === true, excecao_de: excecaoDe, dados, fontes: lerFonte("nv"),
    });
    location.hash = `#/biblioteca/r/${r.id}`;
  });
  return panel({ title: "Novo registro", subtitle: "Escolha o tipo certo: preferência, ideia e proposta não são decisão." },
    h("div", { class: "form-grid" }, field("nv-tipo", "Tipo", tipo), field("nv-tit", "Título", entrada("nv-tit")), field("nv-ass", "Assuntos (separe por vírgula)", entrada("nv-ass", { placeholder: "desconto, margem, kits" }))),
    field("nv-cont-principal", "Conteúdo", area("nv-cont-principal", 4)),
    setoresCheck("nv"),
    h("label", { class: "row" }, h("input", { type: "checkbox", id: "nv-restrito" }), " Restrito (só autor, direção e setores do escopo)"),
    especificos, campoFonte("nv"), h("div", { class: "row" }, salvar), saida);
}

// ---------------------------------------------------------------- ficha do registro
export async function telaRegistroBiblioteca(root, id, eu) {
  const d = await api.bibRegistro(id);
  const r = d.registro;
  const saida = h("div", { role: "status" });
  const acoes = h("div", { class: "stack" });
  const recarregar = () => location.reload();
  const linha = (rot, val) => (val === null || val === undefined || val === "" ? null : h("div", { class: "zoho-campo" }, h("dt", null, rot), h("dd", null, val)));
  const div = r.dados?.divergencia;
  const fechado = ["decisao", "politica", "excecao"].includes(r.tipo) || (r.tipo === "proposta" && ["aprovada", "rejeitada", "retirada"].includes(r.estado));

  // -- acoes conforme tipo, estado e autoridade (o servidor confere de novo)
  const btns = h("div", { class: "row" });
  const abrir = (titulo, conteudo) => { clear(acoes).append(panel({ title: titulo }, conteudo)); acoes.scrollIntoView({ behavior: "smooth" }); };
  if (!["substituida", "revogada"].includes(r.estado)) {
    const b = botao(r.tipo === "proposta" || r.tipo === "ideia" ? "Comentar com fundamento (divergir)" : "Divergir / propor revisão");
    b.addEventListener("click", () => abrir("Divergência ou sugestão fundamentada", formDivergencia(r)));
    btns.append(b);
  }
  const bp = botao("Pedir parecer a um setor"); bp.addEventListener("click", () => abrir("Pedir parecer", formParecer(r))); btns.append(bp);
  const be = botao("Encaminhar conflito"); be.addEventListener("click", () => abrir("Encaminhar conflito", formEncaminhar(r))); btns.append(be);
  if (r.tipo === "proposta" && ["rascunho", "em_consulta"].includes(r.estado)) {
    const ba = botao("Aprovar ou rejeitar", "primary"); ba.addEventListener("click", () => abrir("Decidir a proposta", formDecidir(r, d.eu.tem_autoridade))); btns.append(ba);
  }
  if (["decisao", "politica", "excecao"].includes(r.tipo) && r.estado === "vigente") {
    const br = botao("Revisar (nova versão)", "primary"); br.addEventListener("click", () => abrir("Revisão: nova versão", formRevisar(r, d.eu.tem_autoridade))); btns.append(br);
    const bv = botao("Revogar / expirar"); bv.addEventListener("click", () => abrir("Revogar ou expirar", formEncerrar(r, d.eu.tem_autoridade))); btns.append(bv);
  }
  if (["ideia", "incidente", "aprendizado", "preferencia", "referencia"].includes(r.tipo)) {
    const bt = botao("Mudar situação"); bt.addEventListener("click", () => abrir("Mudar situação", formEstado(r))); btns.append(bt);
  }
  const bf = botao("Adicionar fonte"); bf.addEventListener("click", () => abrir("Adicionar fonte ou evidência", formFonte(r))); btns.append(bf);

  por(root,
    h("p", null, h("a", { href: "#/biblioteca/decisoes" }, "‹ Biblioteca")),
    panel({ title: `${r.codigo} · ${r.titulo}`, subtitle: `${TIPOS[r.tipo]}${r.versao > 1 ? ` · versão ${r.versao}` : ""} · registrado por ${r.autor_nome} em ${formatDateTime(r.registrado_em)}`,
      actions: h("div", { class: "row" }, est(r.estado), r.restrito ? stamp("Restrito", "neutral") : null, r.dados?.hipotese_a_validar ? stamp("HIPÓTESE A VALIDAR", "warn") : null, r.dados?.importado ? stamp("Importado do histórico", "neutral") : null) },
      r.estado === "substituida" && r.substituido_por ? h("p", { class: "notice notice-warn" }, "Esta versão foi SUBSTITUÍDA e não vale mais. ", h("a", { href: `#/biblioteca/r/${r.substituido_por}` }, "Ver a versão vigente")) : null,
      r.estado === "rejeitada" ? h("p", { class: "notice notice-warn" }, `Rejeitada. Motivo preservado: ${r.dados?.motivo_rejeitada ?? "—"}. Rejeição não é proibição permanente em qualquer contexto futuro.`) : null,
      h("p", { class: "zoho-texto" }, r.conteudo),
      h("dl", { class: "zoho-grade" },
        linha("Autoridade", nomeAut(r.autoridade)), linha("Aprovado em", r.aprovado_em ? formatDateTime(r.aprovado_em) : null), linha("Passa a valer em", r.vigente_desde ? formatDate(r.vigente_desde) : null),
        linha("Válido até", r.valido_ate ? formatDate(r.valido_ate) : null), linha("Escopo", r.setores?.length ? r.setores.map(nomeSetor).join(", ") : "Empresa toda"), linha("Assuntos", r.assuntos?.join(", ")),
        linha("Responsável pela execução", r.responsavel), linha("Revisar quando", r.revisar_quando), linha("Resultado esperado", r.resultado_esperado), linha("Resultado observado", r.resultado_observado)),
      r.contexto ? h("div", null, h("strong", null, "Contexto"), h("p", { class: "zoho-texto" }, r.contexto)) : null,
      r.justificativa ? h("div", null, h("strong", null, "Justificativa"), h("p", { class: "zoho-texto" }, r.justificativa)) : null,
      r.condicoes ? h("div", null, h("strong", null, "Condições"), h("p", { class: "zoho-texto" }, r.condicoes)) : null,
      div ? h("div", { class: "stack-s" }, h("strong", null, `Divergência fundamentada sobre ${r.dados.questiona ?? ""}`),
        h("dl", { class: "zoho-grade" }, ...[["Problema", div.problema], ["Argumento", div.argumento], ["Aplicação à VOICE", div.aplicacao], ["Benefícios", div.beneficios], ["Riscos", div.riscos], ["Limitações", div.limitacoes], ["Alternativa recomendada", div.alternativa], ["Autoridade para decidir", div.autoridade], ["Como testar", div.como_testar]].map(([a, b]) => linha(a, b)))) : null,
      r.tipo === "incidente" ? h("dl", { class: "zoho-grade" }, ...[["Quando", r.dados?.quando], ["Esperado", r.dados?.esperado], ["Observado", r.dados?.observado], ["Impacto", r.dados?.impacto], ["Evidências", r.dados?.evidencias],
        ["Causa", r.dados?.causa ? `${r.dados.causa}${r.dados.causa_confirmada ? " (confirmada)" : " (hipótese em investigação)"}` : null], ["Contenção e correção", r.dados?.correcao], ["Prevenção", r.dados?.prevencao], ["Responsável e prazo", r.dados?.responsavel_prazo], ["Verificação da eficácia", r.dados?.verificacao]].map(([a, b]) => linha(a, b))) : null,
      r.tipo === "aprendizado" ? h("dl", { class: "zoho-grade" }, linha("Como verificar", r.dados?.como_verificar), linha("Verificação", r.dados?.verificacao)) : null,
      r.dados?.motivo_aprovada ? h("p", { class: "field-hint" }, `Aprovação: ${r.dados.motivo_aprovada}`) : null,
      btns, saida),
    acoes,
    d.fontes.length ? panel({ title: "Fontes e evidências", subtitle: "Citar não basta: a fonte precisa sustentar a afirmação e ser pertinente." },
      h("ul", { class: "list-plain stack-s" }, d.fontes.map((f) => h("li", { class: "panel panel-tight" },
        h("div", { class: "row" }, stamp(...NATUREZA[f.natureza]), f.acessada ? null : stamp("Citada sem leitura: não é evidência", "risk"), h("strong", null, f.titulo)),
        h("p", { class: "field-hint" }, [f.autor, f.data_fonte, f.versao_periodo].filter(Boolean).join(" · ")), f.link ? h("a", { href: f.link, target: "_blank", rel: "noopener noreferrer" }, f.link) : null, f.trecho ? h("p", { class: "zoho-texto" }, f.trecho) : null)))) : null,
    d.vinculos.length ? panel({ title: "Relações" }, table({ head: ["Relação", "Registro"], rows: d.vinculos.map((x) => {
      const alvo = x.sentido === "de" ? x.para : x.de;
      const rel = { substitui: "substitui", questiona: "questiona", revisa: "revisa", baseado_em: "baseado em", contradiz: "contradiz", excecao_de: "exceção de", aprendizado_de: "aprendizado de", aplicado_em: "aplicado em", execucao: "execução", relacionado: "relacionado" }[x.relacao];
      return [x.sentido === "de" ? `Este registro ${rel}` : `${rel} este registro`, alvo ? h("a", { href: `#/biblioteca/r/${alvo.id}` }, `${alvo.codigo} · ${alvo.titulo} (${ESTADOS[alvo.estado]?.[0] ?? alvo.estado})`) : x.para_externo];
    }) })) : null,
    panel({ title: "Pareceres", subtitle: "Informado recebe ciência; consultado opina; aprovador decide quando a alçada exige. Ausência de resposta não é aprovação." },
      d.pareceres.length ? h("ul", { class: "list-plain stack-s" }, d.pareceres.map((p) => itemParecer(p, d.eu))) : h("p", { class: "result-empty" }, "Nenhum parecer pedido.")),
    d.versoes.length > 1 ? panel({ title: "Versões" }, table({ head: ["Versão", "Código", "Situação", "Registrada", "Vale desde"], rows: d.versoes.map((x) => [`v${x.versao}`, x.id === r.id ? h("strong", null, x.codigo) : h("a", { href: `#/biblioteca/r/${x.id}` }, x.codigo), est(x.estado), formatDate(x.registrado_em), x.vigente_desde ? formatDate(x.vigente_desde) : "—"]) })) : null,
    panel({ title: "Histórico", subtitle: "Permanente: não pode ser alterado nem apagado." },
      h("ul", { class: "list-plain stack-s" }, d.historico.map((x) => h("li", null, h("strong", null, x.acao.replace(/_/g, " ")), ` · ${formatDateTime(x.em)} · ${x.membro?.nome ?? "—"}`,
        x.de_estado || x.para_estado ? ` · ${ESTADOS[x.de_estado]?.[0] ?? x.de_estado ?? ""} → ${ESTADOS[x.para_estado]?.[0] ?? x.para_estado ?? ""}` : "",
        Object.entries(x.detalhe ?? {}).filter(([, val]) => val).length ? h("span", { class: "field-hint" }, ` · ${Object.entries(x.detalhe).filter(([, val]) => val).map(([k, val]) => `${k}: ${val}`).join(" · ")}`) : null)))));
  void fechado; void eu; void recarregar;
}

function itemParecer(p, eu) {
  const saida = h("div", { role: "status" });
  let form = null;
  if (p.estado === "pendente" && (eu.papel === p.setor_id)) {
    const pos = escolha(`pp-pos-${p.id}`, (p.participacao === "aprovador" ? ["aprova", "nao_aprova", "abstem"] : p.participacao === "consultado" ? ["concorda", "concorda_com_ressalvas", "discorda", "abstem"] : []).map((k) => [k, POSICAO[k]]));
    const arg = area(`pp-arg-${p.id}`, 2);
    const b = botao(p.participacao === "informado" ? "Registrar ciência" : "Responder", "primary");
    acao(b, saida, async () => { await api.bibResponderParecer(p.id, { posicao: pos.value || null, argumento: arg.value.trim() }); location.reload(); });
    form = h("div", { class: "stack-s" }, p.participacao !== "informado" ? field(`pp-pos-${p.id}`, "Posição", pos) : null, field(`pp-arg-${p.id}`, p.participacao === "informado" ? "Observação (opcional)" : "Argumento", arg), h("div", { class: "row" }, b), saida);
  }
  return h("li", { class: "panel panel-tight" },
    h("div", { class: "row" }, h("strong", null, nomeSetor(p.setor_id)), stamp(p.encaminhamento ? `Encaminhado: ${p.encaminhamento === "ceo" ? "CEO" : "fundador"}` : PARTICIPACAO[p.participacao], "live"),
      stamp({ pendente: "Pendente", respondido: "Respondido", ciente: "Ciente", sem_resposta: "Sem resposta (não é aprovação)", cancelado: "Cancelado" }[p.estado], p.estado === "sem_resposta" ? "warn" : p.estado === "pendente" ? "neutral" : "ok")),
    h("p", { class: "field-hint" }, `Motivo: ${p.motivo} · prazo ${p.prazo ? formatDate(p.prazo) : "—"} · conclui: ${p.responsavel_conclusao}`),
    p.posicao ? h("p", null, h("strong", null, POSICAO[p.posicao]), ` — ${p.argumento}`) : null,
    p.estado === "pendente" && eu.papel !== p.setor_id ? h("p", { class: "field-hint" }, "Aguardando um membro deste setor. Ninguém responde por outro setor (nenhum parecer é simulado).") : null,
    form);
}

// ---------------------------------------------------------------- formularios de acao
function formDivergencia(r) {
  const saida = h("div", { role: "status" });
  const campos = [["problema", "Problema ou decisão analisada"], ["argumento", "Argumento"], ["aplicacao", "Aplicação ao contexto da VOICE"], ["beneficios", "Benefícios"], ["riscos", "Riscos"], ["limitacoes", "Limitações"], ["alternativa", "Alternativa recomendada"], ["como_testar", "Como testar (se for hipótese)"]];
  const b = botao("Registrar divergência", "primary");
  acao(b, saida, async () => {
    const divergencia = Object.fromEntries(campos.map(([k]) => [k, v(`dv-${k}`)]));
    divergencia.autoridade = v("dv-aut") || r.autoridade;
    const res = await api.bibAcao(r.id, "divergir", { divergencia, fontes: lerFonte("dv") });
    location.hash = `#/biblioteca/r/${res.id}`;
  });
  return h("div", { class: "stack-s" },
    h("p", { class: "field-hint" }, `O registro ${r.codigo} NÃO muda: a divergência vira uma proposta ligada a ele, para a autoridade decidir. Sem evidência acessada, fica como HIPÓTESE A VALIDAR.`),
    h("div", { class: "form-grid" }, campos.map(([k, t]) => field(`dv-${k}`, t, area(`dv-${k}`, 2))), field("dv-aut", "Autoridade competente para decidir", escolha("dv-aut", [["", nomeAut(r.autoridade)], ...AUTORIDADES]))),
    campoFonte("dv"), h("div", { class: "row" }, b), saida);
}

function formParecer(r) {
  const saida = h("div", { role: "status" });
  const b = botao("Pedir parecer", "primary");
  acao(b, saida, async () => { await api.bibAcao(r.id, "parecer", { setor_id: v("pa-setor"), participacao: v("pa-part"), motivo: v("pa-mot"), prazo: v("pa-prazo") || null, responsavel_conclusao: v("pa-conc") || null }); location.reload(); });
  return h("div", { class: "stack-s" },
    h("p", { class: "field-hint" }, "Envolva só quem é afetado (orçamento, prazo, capacidade, padrão técnico, compromisso com cliente, responsabilidade, processo ou política). Vira tarefa no Radar do setor; depende de atuação humana."),
    h("div", { class: "form-grid" },
      field("pa-setor", "Setor", escolha("pa-setor", CATALOGO.map((s) => [s.id, s.nome]))),
      field("pa-part", "Participação", escolha("pa-part", Object.entries(PARTICIPACAO))),
      field("pa-prazo", "Prazo", entrada("pa-prazo", { type: "date" })),
      field("pa-conc", "Quem conclui o assunto", entrada("pa-conc", { placeholder: "Ex.: CSO (padrão: CEO)" }))),
    field("pa-mot", "Impacto / motivo", area("pa-mot", 2)), h("div", { class: "row" }, b), saida);
}

function formEncaminhar(r) {
  const saida = h("div", { role: "status" });
  const b = botao("Encaminhar", "primary");
  acao(b, saida, async () => { await api.bibAcao(r.id, "encaminhar", { nivel: v("en-niv"), motivo: v("en-mot"), prazo: v("en-prazo") || null }); location.reload(); });
  return h("div", { class: "stack-s" }, h("p", { class: "field-hint" }, "Conflito sem solução entre setores vai à CEO para coordenação; acima da alçada dela, ao fundador. Nenhuma comunicação externa é enviada."),
    h("div", { class: "form-grid" }, field("en-niv", "Para", escolha("en-niv", [["ceo", "CEO (coordenação)"], ["fundador", "Fundador (acima da alçada da CEO)"]])), field("en-prazo", "Prazo", entrada("en-prazo", { type: "date" }))),
    field("en-mot", "O conflito, impactos e a recomendação", area("en-mot", 3)), h("div", { class: "row" }, b), saida);
}

function formDecidir(r, temAutoridade) {
  const saida = h("div", { role: "status" });
  const aprovar = botao("Aprovar", "primary"), rejeitar = botao("Rejeitar");
  const conf = h("input", { type: "checkbox", id: "dc-conf" });
  acao(aprovar, saida, async () => { await api.bibAcao(r.id, "transicao", { para: "aprovada", motivo: v("dc-mot"), autoridade: v("dc-aut") || r.autoridade, confirmo_aprovacao: conf.checked }); location.reload(); });
  acao(rejeitar, saida, async () => { await api.bibAcao(r.id, "transicao", { para: "rejeitada", motivo: v("dc-mot"), autoridade: v("dc-aut") || r.autoridade }); location.reload(); });
  return h("div", { class: "stack-s" },
    temAutoridade || !r.autoridade ? null : h("p", { class: "notice notice-warn" }, `Esta proposta é decidida por: ${nomeAut(r.autoridade)}. Você não tem essa autoridade; o servidor vai recusar.`),
    r.autoridade ? null : field("dc-aut", "Autoridade que decide", escolha("dc-aut", [["", "—"], ...AUTORIDADES])),
    field("dc-mot", "Motivo (fica preservado; rejeição não é proibição permanente)", area("dc-mot", 3)),
    h("label", { class: "row" }, conf, " Confirmo a aprovação (só para aprovar)"), h("div", { class: "row" }, aprovar, rejeitar), saida,
    h("p", { class: "field-hint" }, "Aprovar a proposta registra a decisão sobre ela. Para mudar uma decisão ou política vigente, use “Revisar (nova versão)” na própria decisão."));
}

function formRevisar(r, temAutoridade) {
  const saida = h("div", { role: "status" });
  const b = botao("Criar nova versão", "primary");
  const tit = entrada("rv-tit", { value: r.titulo }), cont = area("rv-cont", 5);
  cont.value = r.conteudo;
  const conf = h("input", { type: "checkbox", id: "rv-conf" });
  acao(b, saida, async () => {
    let motivada = null;
    if (v("rv-mot-cod")) { const d = await api.bibListar({ busca: v("rv-mot-cod") }); motivada = d.registros.find((x) => x.codigo === v("rv-mot-cod").toUpperCase())?.id ?? null; if (!motivada) throw new Error("Proposta que motivou não encontrada."); }
    const res = await api.bibAcao(r.id, "revisar", { titulo: tit.value.trim(), conteudo: cont.value.trim(), justificativa: v("rv-just"), condicoes: v("rv-cond") || null, vigente_desde: v("rv-desde") || null, valido_ate: v("rv-ate") || null, motivada_por: motivada, confirmo_aprovacao: conf.checked });
    location.hash = `#/biblioteca/r/${res.id}`;
  });
  return h("div", { class: "stack-s" },
    temAutoridade ? null : h("p", { class: "notice notice-warn" }, `Só ${nomeAut(r.autoridade)} revisa este registro. Para questionar, use “Divergir / propor revisão”.`),
    h("p", { class: "field-hint" }, `A versão atual (${r.codigo}, v${r.versao}) fica preservada como “substituída”, ligada à nova.`),
    field("rv-tit", "Título", tit), field("rv-cont", "Novo conteúdo", cont), field("rv-just", "O que muda e por quê *", area("rv-just", 3)), field("rv-cond", "Condições", area("rv-cond", 2)),
    h("div", { class: "form-grid" }, field("rv-desde", "Passa a valer em", entrada("rv-desde", { type: "date", value: hoje() })), field("rv-ate", "Válida até", entrada("rv-ate", { type: "date" })), field("rv-mot-cod", "Proposta que motivou (código, opcional)", entrada("rv-mot-cod", { placeholder: "BIB-0000" }))),
    h("label", { class: "row" }, conf, " Confirmo a aprovação desta nova versão"), h("div", { class: "row" }, b), saida);
}

function formEncerrar(r, temAutoridade) {
  const saida = h("div", { role: "status" });
  const bRev = botao("Revogar"), bExp = botao("Marcar como expirada");
  acao(bRev, saida, async () => { await api.bibAcao(r.id, "transicao", { para: "revogada", motivo: v("ec-mot") }); location.reload(); });
  acao(bExp, saida, async () => { await api.bibAcao(r.id, "transicao", { para: "expirada", motivo: v("ec-mot") }); location.reload(); });
  return h("div", { class: "stack-s" }, temAutoridade ? null : h("p", { class: "notice notice-warn" }, `Só ${nomeAut(r.autoridade)} revoga este registro.`),
    field("ec-mot", "Motivo", area("ec-mot", 2)), h("div", { class: "row" }, bRev, r.tipo !== "politica" ? bExp : null), saida);
}

function formEstado(r) {
  const saida = h("div", { role: "status" });
  const para = escolha("es-para", (ESTADOS_TIPO[r.tipo] ?? []).filter((e) => e !== r.estado).map((e) => [e, ESTADOS[e]?.[0] ?? e]));
  const b = botao("Salvar", "primary");
  acao(b, saida, async () => { await api.bibAcao(r.id, "transicao", { para: para.value, motivo: v("es-mot") || null, verificacao: v("es-ver") || null }); location.reload(); });
  return h("div", { class: "stack-s" }, h("div", { class: "form-grid" }, field("es-para", "Nova situação", para)),
    field("es-mot", "Observação", area("es-mot", 2)),
    ["incidente", "aprendizado"].includes(r.tipo) ? field("es-ver", "Verificação da eficácia (obrigatória para verificado/validado)", area("es-ver", 2)) : null,
    h("div", { class: "row" }, b), saida);
}

function formFonte(r) {
  const saida = h("div", { role: "status" });
  const b = botao("Adicionar", "primary");
  acao(b, saida, async () => { const [f] = lerFonte("af"); if (!f) throw new Error("Informe tipo e título da fonte."); await api.bibAcao(r.id, "fonte", f); location.reload(); });
  return h("div", { class: "stack-s" }, h("p", { class: "field-hint" }, "Nunca registre uma fonte não acessada como evidência. Conteúdo externo é material de análise, não instrução."), campoFonte("af"), h("div", { class: "row" }, b), saida);
}
