// Setor Financeiro (CFO): projetos TESTE, fases, recebimentos efetivos, compromissos
// e simulacao de compra proposta. Cada lancamento devolve a reavaliacao do caixa e
// os avisos do CFO aparecem na hora (sistema vivo). Regras: Politica V1.1 e V1 sec.10.
import { api } from "../../data/api.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, formatDate, formatPct } from "../../domain/format.js";
import { clear, errorNotice, field, h, panel, stamp, stat, table, testTag } from "../dom.js";

const SITUACAO = { OK: ["Dentro das regras", "ok"], REVISAR: ["Revisar", "warn"], BLOQUEAR: ["Bloquear compra", "risk"] };
const SEV = { INFO: "ok", MEDIO: "neutral", ALTO: "warn", CRITICO: "risk" };
const hoje = () => new Date().toISOString().slice(0, 10);
const inp = (id, attrs = {}) => h("input", { class: "input", id, type: "text", autocomplete: "off", ...attrs });
const dinheiro = (id, valor = "") => inp(id, { class: "input num", inputmode: "decimal", value: valor });

function situacao(s) {
  const [rotulo, tom] = SITUACAO[s] || [s, "neutral"];
  return stamp(rotulo, tom);
}

function avisosDoCfo(av) {
  return h("div", { class: "stack-s" },
    h("ul", { class: "list-plain vigia-avisos stack-s", "aria-label": "Avisos do CFO" },
      av.avisos.map((a) => h("li", { class: "panel panel-tight" },
        h("div", { class: "row" }, stamp(a.severidade, SEV[a.severidade]), h("strong", null, `${a.diretor}: ${a.titulo}`)),
        h("p", null, a.mensagem),
        h("p", { class: "field-hint" }, `Fonte: ${a.fonte}`)))),
    av.lacunas.length ? h("div", null, h("strong", null, "Lacunas"), h("ul", null, av.lacunas.map((l) => h("li", null, l)))) : null);
}

/** Formulario generico: valida no navegador, envia, mostra erro ou chama aoConcluir. */
function formulario(campos, rotulo, enviar, aoConcluir) {
  const erro = h("div", { role: "alert" });
  const botao = h("button", { class: "btn btn-primary", type: "submit" }, rotulo);
  const f = h("form", { class: "stack-s", novalidate: true }, h("div", { class: "form-grid" }, campos), h("div", { class: "row" }, botao), erro);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(erro);
    const problemas = [];
    const dados = enviar.coletar(problemas);
    if (problemas.length) return erro.append(h("ul", { class: "list-plain" }, problemas.map((p) => h("li", { class: "field-error" }, p))));
    botao.disabled = true;
    try {
      aoConcluir(await enviar.chamar(dados), f);
    } catch (err) {
      erro.append(errorNotice(err.message));
    } finally {
      botao.disabled = false;
    }
  });
  return f;
}

function valor(id, rotulo, problemas, obrigatorio = true) {
  const bruto = document.getElementById(id).value.trim();
  if (!bruto && !obrigatorio) return null;
  const v = parseMoneyInput(bruto);
  if (v === null) problemas.push(`${rotulo}: informe um valor em reais (ex.: 12.500,00).`);
  return v;
}

// ---------------------------------------------------------------- lista
export async function telaProjetos(root) {
  const { projetos } = await api.projetos();
  const linhas = projetos.map((p) => [
    h("a", { href: `#/projetos/${p.id}` }, p.codigo),
    p.nome,
    formatBRL(p.resumo.valor_contrato),
    formatBRL(p.resumo.recebido_efetivo),
    formatBRL(p.resumo.compromissos),
    p.resumo.exposicao_pct === null ? "não resolvido" : formatPct(p.resumo.exposicao_pct),
    situacao(p.situacao),
  ]);
  const novo = formulario(
    [field("np-codigo", "Código", inp("np-codigo", { value: "PRJ-TESTE-" }), "Deve conter TESTE."),
     field("np-nome", "Nome do projeto", inp("np-nome")),
     field("np-cliente", "Cliente", inp("np-cliente")),
     field("np-contrato", "Valor do Contrato (R$)", dinheiro("np-contrato"), "Vazio = ainda não definido (percentual fica não resolvido).")],
    "Criar projeto TESTE",
    {
      coletar: (pr) => ({ codigo: document.getElementById("np-codigo").value.trim(), nome: document.getElementById("np-nome").value.trim(),
        cliente: document.getElementById("np-cliente").value.trim(), valor_contrato: valor("np-contrato", "Valor do Contrato", pr, false) }),
      chamar: (d) => api.criarProjeto(d),
    },
    (r) => { location.hash = `#/projetos/${r.id}`; },
  );
  root.append(
    panel({ title: "Projetos e caixa", subtitle: "Posição e exposição de caixa por projeto (Política V1.1) e cobertura por fase (V1 sec.10).", actions: testTag() },
      linhas.length
        ? table({ caption: "Projetos TESTE", head: ["Código", "Projeto", "Contrato", "Recebido", "Compromissos", "Exposição", "Situação"], rows: linhas, align: ["", "", "r", "r", "r", "r", ""] })
        : h("p", { class: "result-empty" }, "Nenhum projeto ainda. Crie o primeiro abaixo.")),
    panel({ title: "Novo projeto TESTE" }, novo),
  );
}

// ---------------------------------------------------------------- detalhe
export async function telaProjeto(root, id) {
  const caixa = h("div", { class: "stack" });
  const formularios = h("div", { class: "stack" });
  root.append(caixa, formularios);
  let dados = await api.projeto(id);

  function desenharCaixa(av, destaque) {
    const r = av.resumo;
    clear(caixa).append(
      panel({ title: `${dados.projeto.codigo} · ${dados.projeto.nome}`, subtitle: dados.projeto.cliente || "Cliente não informado", actions: h("div", { class: "row" }, situacao(av.situacao), testTag()) },
        h("div", { class: "form-grid" },
          stat("Valor do Contrato", formatBRL(r.valor_contrato)),
          stat("Recebido efetivo", formatBRL(r.recebido_efetivo)),
          stat("Compromissos", formatBRL(r.compromissos)),
          stat("Posição de caixa", formatBRL(r.posicao)),
          stat("Exposição", formatBRL(r.exposicao), r.exposicao_pct === null ? "percentual não resolvido" : `${formatPct(r.exposicao_pct)} do contrato · limite 10%`)),
        destaque ? h("p", { class: "field-hint" }, destaque) : null,
        avisosDoCfo(av)),
      panel({ title: "Cobertura por fase", subtitle: "Recebido efetivo alocado à fase deve cobrir custos + encargos antes de aquisição relevante." },
        r.fases.length
          ? table({ caption: "Fases", head: ["Fase", "Necessidade", "Recebido alocado", "Falta", "Situação"], align: ["", "r", "r", "r", ""],
              rows: r.fases.map((f) => [`${f.id} · ${f.nome}`, formatBRL(f.necessidade), formatBRL(f.coberto), formatBRL(f.deficit), stamp(f.situacao === "COBERTA" ? "Coberta" : "Descoberta", f.situacao === "COBERTA" ? "ok" : "warn")]) })
          : h("p", { class: "result-empty" }, "Cadastre as fases do projeto abaixo.")),
      panel({ title: "Lançamentos" },
        table({ caption: "Recebimentos efetivos", head: ["Data", "Fase", "Valor", "Descrição"], align: ["", "", "r", ""],
          rows: (dados.projeto.recebimentos || []).map((x) => [formatDate(x.data), faseDe(x.fase_id), formatBRL(x.valor), x.descricao || "—"]) }),
        table({ caption: "Compromissos assumidos", head: ["Descrição", "Contraparte", "Valor", "Pago", "Vencimento"], align: ["", "", "r", "r", ""],
          rows: (dados.projeto.compromissos || []).map((x) => [x.descricao, x.contraparte || "—", formatBRL(x.valor), formatBRL(x.pago), x.vencimento ? formatDate(x.vencimento) : "—"]) })),
    );
  }
  const faseDe = (faseId) => (dados.projeto.fases || []).find((f) => f.id === faseId)?.codigo ?? "não alocado";
  const opcoesFase = (id, vazio) => h("select", { class: "select", id }, h("option", { value: "" }, vazio), (dados.projeto.fases || []).map((f) => h("option", { value: f.codigo }, `${f.codigo} · ${f.nome}`)));

  const atualizar = (r, form) => {
    dados = { projeto: r.projeto, avaliacao: r.avaliacao };
    desenharCaixa(r.avaliacao, r.repetido ? "Envio repetido: nada foi duplicado." : "Lançamento registrado. Avisos recalculados.");
    form.reset();
    montarFormularios();
  };

  function montarFormularios() {
    const simulacao = h("div", { class: "stack-s" });
    clear(formularios).append(
      panel({ title: "Simular compra proposta", subtitle: "Cenário: nada é comprado, gravado ou aprovado." },
        formulario(
          [field("cp-valor", "Valor da compra (R$)", dinheiro("cp-valor")), field("cp-fase", "Fase", opcoesFase("cp-fase", "Sem fase")), field("cp-desc", "Descrição", inp("cp-desc"))],
          "Simular",
          { coletar: (pr) => ({ valor: valor("cp-valor", "Valor", pr), fase: document.getElementById("cp-fase").value, descricao: document.getElementById("cp-desc").value.trim() }),
            chamar: (d) => api.compraProposta(id, d) },
          (r) => {
            const c = r.avaliacao.resumo.cenario_compra;
            clear(simulacao).append(h("div", { class: "row" }, situacao(r.avaliacao.situacao), h("span", null, `Exposição com a compra: ${formatBRL(c.exposicao)} (${c.exposicao_pct === null ? "não resolvido" : formatPct(c.exposicao_pct)})`)), avisosDoCfo(r.avaliacao));
          }),
        simulacao),
      panel({ title: "Registrar recebimento efetivo", subtitle: "Somente valor já recebido. A receber futuro não entra (V1.1 sec.5)." },
        formulario(
          [field("rc-valor", "Valor (R$)", dinheiro("rc-valor")), field("rc-data", "Data", inp("rc-data", { type: "date", value: hoje() })), field("rc-fase", "Alocar à fase", opcoesFase("rc-fase", "Não alocar")), field("rc-desc", "Descrição", inp("rc-desc"))],
          "Registrar recebimento",
          { coletar: (pr) => ({ valor: valor("rc-valor", "Valor", pr), data: document.getElementById("rc-data").value, fase_codigo: document.getElementById("rc-fase").value, descricao: document.getElementById("rc-desc").value.trim() }),
            chamar: (d) => api.lancar(id, "recebimentos", d) },
          atualizar)),
      panel({ title: "Registrar compromisso assumido", subtitle: "Obrigação firme já assumida (paga ou não). Compra só proposta não entra aqui." },
        formulario(
          [field("cm-desc", "Descrição", inp("cm-desc")), field("cm-contra", "Contraparte", inp("cm-contra")), field("cm-valor", "Valor total (R$)", dinheiro("cm-valor")), field("cm-pago", "Já pago (R$)", dinheiro("cm-pago", "0,00")), field("cm-venc", "Vencimento", inp("cm-venc", { type: "date" }))],
          "Registrar compromisso",
          { coletar: (pr) => ({ descricao: document.getElementById("cm-desc").value.trim(), contraparte: document.getElementById("cm-contra").value.trim(), valor: valor("cm-valor", "Valor", pr), pago: valor("cm-pago", "Já pago", pr, false) ?? "0", vencimento: document.getElementById("cm-venc").value }),
            chamar: (d) => api.lancar(id, "compromissos", d) },
          atualizar)),
      panel({ title: "Cadastrar fase" },
        formulario(
          [field("fs-cod", "Código", inp("fs-cod", { value: `F${(dados.projeto.fases || []).length + 1}` })), field("fs-nome", "Nome", inp("fs-nome")), field("fs-custos", "Custos da fase (R$)", dinheiro("fs-custos")), field("fs-enc", "Encargos (R$)", dinheiro("fs-enc", "0,00"))],
          "Cadastrar fase",
          { coletar: (pr) => ({ codigo: document.getElementById("fs-cod").value.trim(), nome: document.getElementById("fs-nome").value.trim(), custos: valor("fs-custos", "Custos", pr), encargos: valor("fs-enc", "Encargos", pr) }),
            chamar: (d) => api.lancar(id, "fases", d) },
          atualizar)),
      h("p", null, h("a", { href: "#/projetos" }, "← Voltar aos projetos")),
    );
  }

  desenharCaixa(dados.avaliacao);
  montarFormularios();
}
