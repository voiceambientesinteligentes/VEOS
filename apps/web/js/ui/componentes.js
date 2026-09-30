// Componentes compartilhados das telas de setores e do Radar: alerta (com rascunhos),
// tarefa, descricao de sentinela e formulario gerado pelo catalogo.
import { api } from "../data/api.js";
import { CATALOGO } from "../data/catalogo.js";
import { parseMoneyInput } from "../domain/controls.js";
import { formatBRL, formatDate } from "../domain/format.js";
import { clear, errorNotice, field, h, stamp } from "./dom.js";

export const SEV_TOM = { INFO: "ok", MEDIO: "neutral", ALTO: "warn", CRITICO: "risk" };
export const SEV_ROTULO = { INFO: "Info", MEDIO: "Atenção", ALTO: "Alto", CRITICO: "Crítico" };
export const setorPorId = Object.fromEntries(CATALOGO.map((s) => [s.id, s]));
export const nomePapel = (setor, papel) => (papel === setor?.sigla ? setor.diretor.titulo : setor?.equipe.find((p) => p.papel === papel)?.nome ?? papel ?? "—");

// ---------------------------------------------------------------- alerta
function botaoCopiar(texto) {
  const b = h("button", { class: "btn btn-ghost", type: "button" }, "Copiar");
  b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(texto);
      b.textContent = "Copiado";
    } catch {
      b.textContent = "Não foi possível copiar";
    }
    setTimeout(() => { b.textContent = "Copiar"; }, 1800);
  });
  return b;
}

function rascunho(r) {
  const texto = r.assunto ? `${r.assunto}\n\n${r.corpo}` : r.corpo;
  const acoes = [botaoCopiar(texto)];
  if (r.tipo === "email") {
    acoes.push(h("a", { class: "btn btn-ghost", href: `mailto:?subject=${encodeURIComponent(r.assunto || "")}&body=${encodeURIComponent(r.corpo)}` }, "Abrir no e-mail"));
  }
  if (r.tipo === "whatsapp") {
    acoes.push(h("a", { class: "btn btn-ghost", href: `https://wa.me/?text=${encodeURIComponent(r.corpo)}`, target: "_blank", rel: "noopener noreferrer" }, "Abrir no WhatsApp"));
  }
  return h("details", { class: "rascunho" },
    h("summary", null, `Rascunho de ${r.tipo === "email" ? "e-mail" : r.tipo}${r.assunto ? `: ${r.assunto}` : ""}`),
    h("pre", { class: "rascunho-corpo" }, texto),
    h("div", { class: "row" }, acoes),
    h("p", { class: "field-hint" }, "Revise antes de enviar. O VEOS não envia nada sozinho."));
}

export function cartaoAlerta(a, { aoDispensar } = {}) {
  const setor = setorPorId[a.setor_id];
  const dispensar = h("button", { class: "btn btn-ghost", type: "button", title: "Dispensar enquanto a situação persistir" }, "Dispensar");
  dispensar.addEventListener("click", async () => {
    dispensar.disabled = true;
    try {
      await api.dispensarAlerta(a.id);
      aoDispensar?.();
    } catch (e) {
      dispensar.disabled = false;
      dispensar.textContent = e.message;
    }
  });
  return h("li", { class: `alerta alerta-${(a.severidade || "").toLowerCase()}` },
    h("div", { class: "alerta-topo" },
      stamp(SEV_ROTULO[a.severidade] || a.severidade, SEV_TOM[a.severidade]),
      setor ? h("a", { class: "alerta-setor", href: `#/setor/${setor.id}` }, `${setor.sigla} · ${setor.nome}`) : null,
      h("span", { class: "alerta-quando" }, a.atualizado_em ? formatDate(a.atualizado_em) : "")),
    h("p", { class: "alerta-titulo" }, a.titulo),
    h("p", { class: "alerta-texto" }, a.mensagem),
    (a.notificar || []).length ? h("p", { class: "field-hint" }, `Avisar: ${a.notificar.join(", ")}`) : null,
    (a.rascunhos || []).map(rascunho),
    h("div", { class: "row alerta-rodape" }, h("span", { class: "field-hint" }, a.fonte ? `Fonte: ${a.fonte}` : ""), dispensar));
}

// ---------------------------------------------------------------- tarefa
export function linhaTarefa(t, { aoConcluir } = {}) {
  const setor = setorPorId[t.setor_id];
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasada = t.prazo && t.prazo < hoje;
  const feita = h("button", { class: "btn btn-ghost", type: "button" }, "Concluir");
  feita.addEventListener("click", async () => {
    feita.disabled = true;
    try {
      await api.concluirTarefa(t.id, "feita");
      aoConcluir?.();
    } catch (e) {
      feita.disabled = false;
      feita.textContent = e.message;
    }
  });
  return h("li", { class: `tarefa${atrasada ? " is-atrasada" : ""}` },
    h("div", { class: "tarefa-texto" },
      h("span", { class: "tarefa-titulo" }, t.titulo),
      h("span", { class: "field-hint" },
        [setor ? `${setor.sigla}` : null, t.papel ? nomePapel(setor, t.papel) : null, t.prazo ? `prazo ${formatDate(t.prazo)}${atrasada ? " (atrasada)" : ""}` : "sem prazo", t.origem && t.origem !== "manual" ? "gerada pela regra viva" : null].filter(Boolean).join(" · "))),
    feita);
}

// ---------------------------------------------------------------- sentinela em portugues
const OP = { "<": "menor que", "<=": "até", ">": "maior que", ">=": "pelo menos", "==": "igual a" };
function nomeCampo(tipo, c) {
  const base = { titulo: "título", estado: "estado", responsavel: "responsável", criado_em: "data de criação", atualizado_em: "última atualização", prazo: "prazo", valor: "valor" };
  return base[c] ?? tipo?.campos.find((x) => x.id === c)?.rotulo ?? c;
}
function textoFiltros(tipo, filtros = []) {
  return filtros.map((f) => {
    const n = nomeCampo(tipo, f.campo);
    if ("igual" in f) return `${n} = ${f.igual}`;
    if ("diferente" in f) return `${n} ≠ ${f.diferente}`;
    if (f.em) return `${n} em ${f.em.join("/")}`;
    if (f.nao_em) return `${n} fora de ${f.nao_em.join("/")}`;
    return "";
  }).filter(Boolean).join(" e ");
}
export function descreverSentinela(setor, s) {
  const g = s.gatilho;
  const tipo = setor.registros.find((t) => t.tipo === g.registro);
  const nome = tipo?.nome ?? g.registro;
  const filtros = textoFiltros(tipo, g.filtros);
  const onde = filtros ? ` (${filtros})` : "";
  switch (g.tipo) {
    case "contagem": return `Quando a quantidade de ${nome}${onde} nos últimos ${g.janela_dias} dias for ${OP[g.operador]} ${g.valor}.`;
    case "soma": return `Quando a soma de ${nomeCampo(tipo, g.campo)} em ${nome}${onde} nos últimos ${g.janela_dias} dias for ${OP[g.operador]} ${formatBRL(String(g.valor))}.`;
    case "parado": return `Para cada ${nome}${onde} sem atualização há mais de ${g.dias} dias.`;
    case "vencido": return `Para cada ${nome}${onde} com ${nomeCampo(tipo, g.campo)} vencido${g.antecedencia_dias ? ` ou vencendo em até ${g.antecedencia_dias} dias` : ""}.`;
    case "faltando": return `Para cada ${nome}${onde} sem ${nomeCampo(tipo, g.campo)}.`;
  }
  return "";
}

// ---------------------------------------------------------------- formulario de registro
function controle(c, valor, id) {
  const v = valor ?? "";
  if (c.tipo === "opcao") return h("select", { class: "select", id }, h("option", { value: "" }, "—"), c.opcoes.map((o) => h("option", { value: o, selected: o === v }, o)));
  if (c.tipo === "sim_nao") return h("select", { class: "select", id }, h("option", { value: "" }, "—"), h("option", { value: "true", selected: v === true }, "Sim"), h("option", { value: "false", selected: v === false }, "Não"));
  if (c.tipo === "texto_longo") return h("textarea", { class: "input", id, rows: "3" }, String(v));
  if (c.tipo === "data") return h("input", { class: "input", id, type: "date", value: v });
  if (c.tipo === "dinheiro") return h("input", { class: "input num", id, type: "text", inputmode: "decimal", value: v ? formatBRL(String(v)).replace("R$ ", "") : "" });
  const tipos = { email: "email", telefone: "tel", numero: "text" };
  return h("input", { class: "input", id, type: tipos[c.tipo] || "text", value: String(v), autocomplete: "off" });
}

function lerControle(c, el, problemas) {
  const bruto = (el.value ?? "").trim();
  if (!bruto) return "";
  if (c.tipo === "sim_nao") return bruto === "true";
  if (c.tipo === "dinheiro") {
    const d = parseMoneyInput(bruto);
    if (d === null) problemas.push(`${c.rotulo}: valor em reais (ex.: 12.500,00)`);
    return d;
  }
  return bruto;
}

/** Formulario de criacao/edicao de registro gerado pelo catalogo. */
export function formularioRegistro(setor, tipo, existente, aoSalvar) {
  const pre = `f-${tipo.tipo}`;
  const campos = [
    { id: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true, base: true },
    ...tipo.campos,
  ];
  const estado = h("select", { class: "select", id: `${pre}-estado` }, tipo.estados.map((e) => h("option", { value: e, selected: e === (existente?.estado ?? tipo.estado_inicial) }, e)));
  const papeis = [...setor.equipe.map((p) => [p.papel, p.nome]), [setor.sigla, setor.diretor.titulo]];
  const resp = h("select", { class: "select", id: `${pre}-resp` }, papeis.map(([p, n]) => h("option", { value: p, selected: p === (existente?.responsavel ?? tipo.responsavel) }, n)));
  const prazo = h("input", { class: "input", id: `${pre}-prazo`, type: "date", value: existente?.prazo ?? "" });
  const valor = h("input", { class: "input num", id: `${pre}-valor`, type: "text", inputmode: "decimal", value: existente?.valor ? formatBRL(existente.valor).replace("R$ ", "") : "" });
  const controles = campos.map((c) => [c, controle(c, c.base ? existente?.titulo : existente?.dados?.[c.id], `${pre}-${c.id}`)]);
  const erro = h("div", { role: "alert" });
  const botao = h("button", { class: "btn btn-primary", type: "submit" }, existente ? "Salvar alterações" : `Criar ${tipo.nome.toLowerCase()}`);
  const form = h("form", { class: "stack-s", novalidate: true },
    h("div", { class: "form-grid" },
      controles.map(([c, el]) => field(el.id, `${c.rotulo}${c.obrigatorio ? " *" : ""}`, el)),
      field(estado.id, "Estado", estado), field(resp.id, "Responsável", resp), field(prazo.id, "Prazo", prazo), field(valor.id, "Valor (R$)", valor)),
    h("div", { class: "row" }, botao), erro);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(erro);
    const problemas = [];
    const dados = {};
    let titulo = "";
    for (const [c, el] of controles) {
      const v = lerControle(c, el, problemas);
      if (c.base) titulo = v;
      else dados[c.id] = v;
    }
    const valorLido = valor.value.trim() ? parseMoneyInput(valor.value) : "";
    if (valorLido === null) problemas.push("Valor: em reais (ex.: 12.500,00)");
    if (problemas.length) return erro.append(h("ul", { class: "list-plain" }, problemas.map((p) => h("li", { class: "field-error" }, p))));
    botao.disabled = true;
    try {
      const corpo = { setor: setor.id, titulo, estado: estado.value, responsavel: resp.value, prazo: prazo.value, valor: valorLido, dados };
      const r = existente ? await api.alterarRegistro(existente.id, corpo) : await api.criarRegistro({ ...corpo, tipo: tipo.tipo });
      aoSalvar(r);
    } catch (err) {
      erro.append(errorNotice(err.message));
    } finally {
      botao.disabled = false;
    }
  });
  return form;
}
