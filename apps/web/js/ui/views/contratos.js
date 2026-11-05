// CONTRATOS DE SUPORTE (receita recorrente): lista com receita mensal (MRR), cadastro e ficha com as
// cobrancas mensais. As cobrancas abertas entram na previsao de caixa (13 semanas) como entradas previstas.
import { api } from "../../data/api.js";
import { ESTADOS_CONTRATO, indicadoresRecorrencia, normalizarContrato } from "../../domain/contratos.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, panel, stamp, stat, table } from "../dom.js";

const brl = (v) => formatBRL(String(Number(v ?? 0).toFixed(2)));
const hojeISO = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const rotuloEstado = (e) => ESTADOS_CONTRATO.find(([k]) => k === e)?.[1] ?? e;
const selo = (e) => stamp(rotuloEstado(e), e === "ativo" ? "ok" : e === "suspenso" ? "warn" : "neutral");
const numeroBR = (v) => String(v).replace(/\./g, "").replace(",", ".");

function formulario(aoSalvar, clientes) {
  const inp = (id, attrs = {}) => h("input", { class: "input", id, type: "text", autocomplete: "off", ...attrs });
  const c = {
    cliente_nome: inp("ct-cliente", { list: "ct-clientes", placeholder: "Nome do cliente (escolha da lista ou digite)" }),
    descricao: inp("ct-desc", { placeholder: "ex.: Suporte mensal: atendimento remoto e 1 visita por mês" }),
    valor_mensal: inp("ct-valor", { inputmode: "decimal", placeholder: "1200,00" }),
    dia_vencimento: inp("ct-dia", { inputmode: "numeric", value: "10" }),
    inicio: inp("ct-inicio", { type: "date", value: hojeISO() }),
    fim: inp("ct-fim", { type: "date" }),
    observacao: h("textarea", { class: "input", id: "ct-obs", rows: 2 }),
  };
  const erro = h("div", { role: "alert" });
  const botao = h("button", { class: "btn btn-primary", type: "submit" }, "Cadastrar contrato");
  const form = h("form", { class: "stack-s", novalidate: true },
    h("datalist", { id: "ct-clientes" }, clientes.map((x) => h("option", { value: x.nome }))),
    h("div", { class: "form-grid" }, field("ct-cliente", "Cliente *", c.cliente_nome), field("ct-desc", "O que cobre *", c.descricao), field("ct-valor", "Valor mensal (R$) *", c.valor_mensal),
      field("ct-dia", "Dia do vencimento (1 a 28)", c.dia_vencimento), field("ct-inicio", "Início *", c.inicio, "As cobranças começam no mês atual ou no início, o que for mais tarde."), field("ct-fim", "Fim (opcional)", c.fim)),
    field("ct-obs", "Observações", c.observacao), h("div", { class: "row" }, botao), erro);
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clear(erro);
    const entrada = Object.fromEntries(Object.entries(c).map(([k, el]) => [k, el.value]));
    entrada.valor_mensal = numeroBR(entrada.valor_mensal);
    const cli = clientes.find((x) => x.nome === entrada.cliente_nome.trim());
    if (cli) entrada.cliente_id = cli.id;
    const { erros } = normalizarContrato(entrada);
    if (erros.length) return erro.append(h("ul", { class: "list-plain" }, erros.map((x) => h("li", { class: "field-error" }, x))));
    botao.disabled = true;
    try { aoSalvar(await api.contratoSuporteSalvar(entrada)); } catch (err) { erro.append(errorNotice(err.message)); } finally { botao.disabled = false; }
  });
  return form;
}

export async function telaContratos(root) {
  const d = await api.contratosSuporte();
  const clientes = await api.clientes().then((x) => x.clientes).catch(() => []);
  const hoje = hojeISO();
  const ind = indicadoresRecorrencia(d.contratos, d.cobrancas, hoje);
  const novo = h("div");
  const botao = h("button", { class: "btn btn-primary", type: "button" }, "+ Novo contrato");
  botao.addEventListener("click", () => {
    clear(novo).append(panel({ title: "Novo contrato de suporte", subtitle: "Receita recorrente: o VEOS gera as cobranças mensais e as coloca na previsão de caixa." },
      formulario((r) => { location.hash = `#/contratos/${r.id}`; }, clientes)));
    document.getElementById("ct-cliente")?.focus();
  });
  const proxima = (c) => d.cobrancas.filter((x) => x.contrato_id === c.id && x.estado === "aberta").sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
  root.append(
    panel({ title: "Contratos de suporte", subtitle: "Receita recorrente: contrato → cobrança mensal → previsão de caixa.", actions: botao },
      h("div", { class: "cfo-stats" }, stat("Receita mensal recorrente", brl(ind.mrr), `${ind.contratos_ativos} contrato(s) ativo(s)`), stat("Por ano", brl(ind.arr), "receita mensal × 12"),
        stat("Cobranças atrasadas", String(ind.atrasadas), ind.atrasadas ? brl(ind.valor_atrasado) : "nenhuma"), stat("Próximo recebimento", ind.proxima ? formatDate(ind.proxima.vencimento) : "—", ind.proxima ? brl(ind.proxima.valor) : "sem cobrança aberta")),
      d.contratos.length ? table({ head: ["Código", "Cliente", "Cobre", "Valor mensal", "Vence dia", "Próxima cobrança", "Situação"], align: ["", "", "", "r", "", "", ""],
        rows: d.contratos.map((c) => { const p = proxima(c); return [h("a", { href: `#/contratos/${c.id}` }, c.codigo), c.cliente_nome, c.descricao, brl(c.valor_mensal), String(c.dia_vencimento), p ? `${formatDate(p.vencimento)} · ${brl(p.valor)}` : "—", selo(c.estado)]; }) })
        : h("p", { class: "result-empty" }, "Nenhum contrato de suporte cadastrado ainda. Cadastre o primeiro para começar a prever a receita recorrente.")),
    novo);
  if (new URLSearchParams(location.hash.split("?")[1] ?? "").get("novo")) botao.click();
}

export async function telaContrato(root, id) {
  const d = await api.contratoSuporte(id);
  const c = d.contrato;
  const hoje = hojeISO();
  const area = h("div", { class: "stack" });
  const agir = async (dados) => { try { await api.contratoSuporteAlterar(id, dados); location.reload(); } catch (e) { area.append(errorNotice(e.message)); } };
  const botoes = [];
  if (c.estado === "ativo") botoes.push(["Suspender", () => { const m = prompt("Motivo da suspensão (opcional):"); if (m !== null) agir({ estado: "suspenso", motivo: m }); }]);
  if (c.estado === "suspenso") botoes.push(["Reativar", () => agir({ estado: "ativo" })]);
  if (c.estado !== "encerrado") {
    botoes.push(["Reajustar valor", () => { const v = prompt(`Novo valor mensal (atual ${brl(c.valor_mensal)}):`); if (v) agir({ valor_mensal: numeroBR(v), motivo: "reajuste" }); }]);
    botoes.push(["Encerrar", () => { if (confirm("Encerrar o contrato? As cobranças em aberto serão canceladas.")) agir({ estado: "encerrado" }); }]);
  }
  const linhas = d.cobrancas.map((x) => {
    let acao = "";
    if (x.estado === "aberta") {
      const b = h("button", { class: "btn btn-ghost", type: "button" }, "Marcar recebida");
      b.addEventListener("click", async () => {
        const data = prompt("Data do recebimento (AAAA-MM-DD):", hoje);
        if (!data) return;
        const valor = prompt("Valor recebido (R$):", String(Number(x.valor).toFixed(2)).replace(".", ","));
        if (!valor) return;
        try { await api.contratoSuporteReceber(id, x.id, { data, valor: numeroBR(valor) }); location.reload(); } catch (e) { area.append(errorNotice(e.message)); }
      });
      acao = b;
    }
    const situ = x.estado === "recebida" ? stamp(`recebida em ${formatDate(x.recebido_em)}`, "ok") : x.estado === "cancelada" ? stamp("cancelada", "neutral") : x.vencimento < hoje ? stamp("atrasada", "risk") : stamp("a receber", "warn");
    return [x.competencia.slice(0, 7), formatDate(x.vencimento), brl(x.estado === "recebida" ? x.valor_recebido : x.valor), situ, acao];
  });
  root.append(
    h("p", null, h("a", { href: "#/contratos" }, "‹ Contratos de suporte")),
    panel({ title: `${c.cliente_nome}`, subtitle: `${c.codigo} · ${c.descricao}`, actions: h("div", { class: "row" }, selo(c.estado), ...botoes.map(([t, fn]) => { const b = h("button", { class: "btn btn-ghost", type: "button" }, t); b.addEventListener("click", fn); return b; })) },
      h("div", { class: "cfo-stats" }, stat("Valor mensal", brl(c.valor_mensal), `vence todo dia ${c.dia_vencimento}`), stat("Início", formatDate(c.inicio), c.fim ? `fim em ${formatDate(c.fim)}` : "sem data de fim")),
      c.observacao ? h("p", { class: "zoho-texto" }, c.observacao) : null, c.cliente_id ? h("p", null, h("a", { href: `#/clientes/${c.cliente_id}` }, "Abrir a ficha do cliente")) : null),
    area,
    panel({ title: "Cobranças mensais", subtitle: "As abertas aparecem na previsão de caixa de 13 semanas." }, d.cobrancas.length ? table({ head: ["Mês", "Vencimento", "Valor", "Situação", ""], align: ["", "", "r", "", ""], rows: linhas }) : h("p", { class: "result-empty" }, "Sem cobranças geradas.")),
    panel({ title: "Histórico do contrato" }, h("ul", { class: "list-plain stack-s" }, d.historico.map((x) => h("li", { class: "field-hint" }, `${formatDateTime(x.em)} · ${x.acao}${x.detalhe?.campos ? `: ${x.detalhe.campos.join(", ")}` : ""}${x.detalhe?.competencia ? ` · ${String(x.detalhe.competencia).slice(0, 7)}` : ""}`)))));
}
