// Obra no pedido: projeto do Zoho Projects (tarefas = checklist), horas da equipe (custo para a
// margem realizada), aceite e garantia, e o termo de aceite para imprimir. O texto do termo e
// colado (aprovado pelo juridico): o VEOS nao inventa redacao juridica nem prazo de garantia.
import { api } from "../../data/api.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { custoHoras, somaHoras } from "../../domain/obra.js";
import { clear, errorNotice, field, h, panel, stamp, table } from "../dom.js";

const brl = (v) => (v === null || v === undefined ? "—" : formatBRL(String(v)));
const qtd = (v) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const hoje = () => new Date().toISOString().slice(0, 10);
const botao = (texto, tom = "ghost") => h("button", { class: `btn btn-${tom}`, type: "button" }, texto);
const inp = (attrs = {}) => h("input", { class: "input", type: "text", autocomplete: "off", ...attrs });
function acao(b, saida, fn) {
  b.addEventListener("click", async () => {
    b.disabled = true;
    clear(saida);
    try { await fn(); } catch (e) { saida.append(errorNotice(e.message)); b.disabled = false; }
  });
  return b;
}

export function painelObra(d, id, recarregar) {
  const p = d.pedido;
  const saida = h("div", { role: "status" });
  const sel = h("select", { class: "select", id: "ob-proj" }, h("option", { value: "" }, "— carregando projetos do Zoho —"));
  api.fluxoProjetos().then(({ projetos }) => {
    clear(sel).append(h("option", { value: "" }, "— nenhum —"), ...projetos.map((x) => h("option", { value: x.zoho_id, selected: x.zoho_id === p.projeto_zoho_id }, `${x.nome}${x.status ? ` (${x.status})` : ""}`)));
  }).catch(() => clear(sel).append(h("option", { value: "" }, "Zoho Projects indisponível")));
  const ligar = acao(botao("Ligar projeto"), saida, async () => { await api.fluxoAcao(id, "projeto", { projeto_zoho_id: sel.value || null }); await recarregar("Projeto do Zoho ligado ao pedido."); });
  const ob = d.obra;
  const tarefas = ob?.tarefas ?? [];
  const feitas = tarefas.filter((t) => t.concluida === "true" || Number(t.pct) === 100).length;
  return panel({ title: "Obra (Zoho Projects)", subtitle: "As tarefas do projeto no Zoho são o checklist da obra. Para concluir uma tarefa, abra-a e edite (grava no Zoho)." },
    h("div", { class: "row" }, field(sel.id, "Projeto do Zoho", sel), ligar),
    saida,
    ob ? h("p", null, ob.projeto ? `${ob.projeto.nome} · ${ob.projeto.pct ?? 0}% concluído${ob.projeto.fim ? ` · fim previsto ${formatDate(String(ob.projeto.fim).slice(0, 10))}` : ""}` : "Projeto não encontrado no espelho.",
      tarefas.length ? h("span", null, " · ", stamp(`${feitas}/${tarefas.length} tarefas concluídas`, feitas === tarefas.length ? "ok" : "warn")) : null) : null,
    tarefas.length
      ? table({ caption: "Checklist da obra", head: ["Tarefa", "Lista", "Situação", "%", "Fim previsto"], align: ["", "", "", "r", ""],
        rows: tarefas.map((t) => [h("a", { href: `#/zoho/projects/tasks/${encodeURIComponent(t.zoho_id)}` }, t.nome), t.lista ?? "—", t.status?.name ?? (t.concluida === "true" ? "Concluída" : "—"), t.pct ?? "—", t.fim ? formatDate(String(t.fim).slice(0, 10)) : "—"]) })
      : ob ? h("p", { class: "result-empty" }, "Nenhuma tarefa deste projeto no espelho.") : null);
}

export function painelHoras(d, id, recarregar) {
  const hs = d.horas ?? [];
  const total = somaHoras(hs), custo = custoHoras(hs);
  const data = h("input", { class: "input", id: "hr-data", type: "date", value: hoje() });
  const pessoa = inp({ id: "hr-pessoa" }), horas = inp({ id: "hr-horas", inputmode: "decimal", class: "input num" }), custoH = inp({ id: "hr-custo", inputmode: "decimal", class: "input num" }), desc = inp({ id: "hr-desc" });
  const saida = h("div", { role: "status" });
  const lancar = acao(botao("Lançar horas", "primary"), saida, async () => {
    const ch = custoH.value.trim() ? parseMoneyInput(custoH.value.trim()) : null;
    if (custoH.value.trim() && !ch) throw new Error("Custo/hora: valor em reais (ex.: 45,00).");
    await api.fluxoAcao(id, "horas", { data: data.value, pessoa: pessoa.value, horas: horas.value.trim().replace(",", "."), custo_hora: ch, descricao: desc.value });
    await recarregar("Horas lançadas.");
  });
  const custoTxt = custo === null ? (hs.length ? "incompleto (há lançamento sem custo/hora)" : "—") : brl(custo.toFixed(2));
  return panel({ title: "Horas da equipe", subtitle: `${total.toFixed(2).replace(".", ",")} h lançadas · custo ${custoTxt}` },
    h("div", { class: "form-grid" }, field(data.id, "Data", data), field(pessoa.id, "Quem", pessoa), field(horas.id, "Horas", horas, "Correção: negativo com descrição."), field(custoH.id, "Custo/hora (R$)", custoH, "Entra na margem realizada."), field(desc.id, "Descrição", desc)),
    h("div", { class: "row" }, lancar), saida,
    hs.length ? table({ caption: "Lançamentos", head: ["Data", "Quem", "Horas", "Custo/hora", "Descrição"], align: ["", "", "r", "r", ""],
      rows: hs.map((x) => [formatDate(x.data), x.pessoa, String(x.horas).replace(".", ","), x.custo_hora === null ? "—" : brl(x.custo_hora), x.descricao ?? ""]) }) : null);
}

export function painelAceite(d, id, recarregar) {
  const p = d.pedido;
  const saida = h("div", { role: "status" });
  const pode = ["entregue", "faturado", "concluido"].includes(p.estado);
  const data = h("input", { class: "input", id: "ac-data", type: "date", value: p.aceite_em ?? hoje() });
  const gar = h("input", { class: "input", id: "ac-gar", type: "date", value: p.garantia_ate ?? "" });
  const gravar = acao(botao(p.aceite_em ? "Atualizar aceite" : "Registrar aceite", "primary"), saida, async () => {
    await api.fluxoAcao(id, "aceite", { data: data.value, garantia_ate: gar.value || null });
    await recarregar("Aceite registrado.");
  });
  return panel({ title: "Aceite da obra e garantia", subtitle: pode ? "Depois da entrega: registre a data do aceite e, se houver, o fim da garantia combinada." : "Disponível depois da entrega." },
    p.aceite_em ? h("p", null, stamp(`Aceite em ${formatDate(p.aceite_em)}`, "ok"), p.garantia_ate ? ` Garantia até ${formatDate(p.garantia_ate)}.` : " Garantia: não informada.") : null,
    pode ? h("div", { class: "form-grid" }, field(data.id, "Data do aceite", data), field(gar.id, "Garantia até", gar, "Prazo combinado com o cliente (o VEOS não presume).")) : null,
    h("div", { class: "row" }, pode ? gravar : null, h("a", { class: "btn btn-ghost", href: `#/pedidos/${id}/aceite` }, "Termo de aceite (PDF)")),
    saida);
}

export async function telaTermoAceite(root, id) {
  const d = await api.fluxoPedido(id);
  const p = d.pedido;
  const campo = (idc, rot, valor = "", attrs = {}) => field(idc, rot, h("input", { class: "input", id: idc, type: "text", autocomplete: "off", value: valor, ...attrs }));
  const texto = h("textarea", { class: "input", id: "ta-texto", rows: 6, placeholder: "Cole aqui o texto do termo aprovado (declaração de recebimento, condições de garantia...)." });
  const doc = h("article", { class: "contrato-doc" });
  const v = (x) => document.getElementById(x)?.value?.trim() ?? "";
  function montar() {
    clear(doc).append(
      h("h1", null, "Termo de aceite da obra"),
      h("p", { class: "contrato-modelo" }, "Modelo gerado pelo VEOS a partir do pedido. Validar o texto com o jurídico antes de usar."),
      h("p", null, h("strong", null, "Cliente: "), v("ta-cli") || "________________________"),
      h("p", null, h("strong", null, "Endereço da obra: "), v("ta-obra") || "________________________"),
      h("p", null, h("strong", null, "Pedido: "), `${p.numero}${p.orcamento_numero ? ` (orçamento ${p.orcamento_numero})` : ""} · entregue em ${p.entregue_em ? formatDate(String(p.entregue_em).slice(0, 10)) : "____/____/______"}`),
      h("table", { class: "contrato-tabela" }, h("thead", null, h("tr", null, ["Item", "Tipo", "Qtd"].map((t) => h("th", null, t)))),
        h("tbody", null, d.itens.map((i) => h("tr", null, h("td", null, i.nome), h("td", null, i.tipo === "produto" ? "Produto" : "Serviço"), h("td", null, qtd(i.quantidade)))))),
      texto.value.trim() ? h("div", { class: "zoho-texto" }, texto.value.trim()) : h("p", { class: "contrato-modelo" }, "[Texto do termo aprovado ainda não incluído]"),
      h("p", null, h("strong", null, "Pendências registradas: "), v("ta-pend") || "nenhuma"),
      h("p", null, h("strong", null, "Garantia até: "), v("ta-gar") ? formatDate(v("ta-gar")) : "____/____/______"),
      h("p", { class: "contrato-local" }, `${v("ta-local") || "Balneário Camboriú/SC"}, ${v("ta-data") ? formatDate(v("ta-data")) : "____/____/______"}.`),
      h("div", { class: "contrato-assinaturas" }, h("div", null, h("span", null, "CLIENTE"), h("span", null, v("ta-cli"))), h("div", null, h("span", null, "VOICE"), h("span", null, v("ta-resp")))),
      h("p", { class: "contrato-rodape" }, `Pedido ${p.numero} · gerado pelo VEOS em ${formatDateTime(new Date().toISOString())}. Depois de assinado, anexe no pedido (Anexos → Termo de aceite).`));
  }
  const imprimir = botao("Imprimir / salvar em PDF", "primary");
  imprimir.addEventListener("click", () => { montar(); window.print(); });
  const form = panel({ title: `Termo de aceite do pedido ${p.numero}`, subtitle: "Complete, imprima, colete as assinaturas e anexe no pedido. Registre a data do aceite no pedido." },
    h("div", { class: "form-grid" }, campo("ta-cli", "Cliente", p.cliente_nome), campo("ta-obra", "Endereço da obra"), campo("ta-resp", "Responsável VOICE"),
      campo("ta-pend", "Pendências (se houver)"), campo("ta-gar", "Garantia até", p.garantia_ate ?? "", { type: "date" }),
      campo("ta-local", "Local", "Balneário Camboriú/SC"), campo("ta-data", "Data", p.aceite_em ?? hoje(), { type: "date" })),
    field("ta-texto", "Texto do termo (aprovado)", texto), h("div", { class: "row" }, imprimir));
  form.classList.add("nao-imprimir");
  form.addEventListener("input", montar);
  root.append(h("p", { class: "nao-imprimir" }, h("a", { href: `#/pedidos/${id}` }, `‹ Pedido ${p.numero}`)), form, doc);
  montar();
}
