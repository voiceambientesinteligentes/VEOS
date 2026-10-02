// PLANO DA VOICE e ESTOQUE ESTRATEGICO. O plano reune metas, acoes, rotinas e regras propostas pelos
// diretores (IA) e decididas pelo fundador: nada vale antes de "aprovado". O estoque estrategico e a
// sugestao do COO, liberada pelo CFO so quando o caixa estiver saudavel.
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { resumir } from "../../domain/diagnostico.js";
import { curvaItens, gatilhoEstoque, momentoDolar } from "../../domain/estoque_sugerido.js";
import { numeroBR, parametros } from "../../domain/formulario_cfo.js";
import { formatBRL, formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, method, panel, stamp, stat, table } from "../dom.js";

const brl = (v) => (v === null || v === undefined || Number.isNaN(v) ? "—" : formatBRL(String(Number(v).toFixed(2))));
const pct = (v) => (v === null || v === undefined ? "—" : `${String(Math.round(v * 10) / 10).replace(".", ",")}%`);
const dataBR = (iso) => String(iso ?? "").slice(0, 10).split("-").reverse().join("/");
const SETOR = Object.fromEntries(CATALOGO.map((s) => [s.id, s]));

export const FASES = [
  ["0-30", "Dias 1 a 30 · Estancar e enxergar", "Parar de perder dinheiro e passar a ver o caixa."],
  ["30-90", "Dias 31 a 90 · Organizar", "Preço certo em todo orçamento, funil medido e rotina financeira."],
  ["90-180", "Meses 4 a 6 · Crescer", "Volume de vendas com margem e sua saída da função técnica."],
  ["180-365", "Meses 7 a 12 · Consolidar", "Reserva de caixa, estoque estratégico e receita recorrente."],
];
const ESTADO = { proposto: ["Proposto · aguarda sua decisão", "warn"], aprovado: ["Aprovado", "ok"], em_andamento: ["Em andamento", "live"], feito: ["Feito", "ok"], cancelado: ["Cancelado", "neutral"] };
const TIPO = { meta: "Meta", acao: "Ação", rotina: "Rotina", regra: "Regra", decisao: "Decisão sua" };

function cartaoItem(i, pode, recarregar) {
  const saida = h("div", { role: "status" });
  const nota = h("textarea", { class: "input", rows: 2, placeholder: "Anotação (opcional)", "aria-label": `Anotação para ${i.codigo}` });
  const acao = (rotulo, estado, tom = "ghost") => {
    const b = h("button", { class: `btn btn-${tom} btn-mini`, type: "button" }, rotulo);
    b.addEventListener("click", async () => {
      b.disabled = true; clear(saida);
      try { await api.planoMudar(i.id, { estado, nota: nota.value }); await recarregar(); } catch (e) { saida.append(errorNotice(e.message)); b.disabled = false; }
    });
    return b;
  };
  const anotar = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Salvar anotação");
  anotar.addEventListener("click", async () => {
    if (!nota.value.trim()) return;
    anotar.disabled = true; clear(saida);
    try { await api.planoMudar(i.id, { nota: nota.value }); await recarregar(); } catch (e) { saida.append(errorNotice(e.message)); anotar.disabled = false; }
  });
  const botoes = [];
  if (i.estado === "proposto" && pode.aprovar) botoes.push(acao("Aprovar", "aprovado", "primary"), acao("Não fazer", "cancelado"));
  if (i.estado === "aprovado") botoes.push(acao("Começar", "em_andamento", "primary"), acao("Concluir", "feito"));
  if (i.estado === "em_andamento") botoes.push(acao("Concluir", "feito", "primary"));
  if (["feito", "cancelado"].includes(i.estado) && pode.aprovar) botoes.push(acao("Reabrir", "aprovado"));
  const s = SETOR[i.area];
  return h("li", { class: `panel panel-tight stack-s plano-item plano-${i.estado}`, id: `item-${i.codigo}` },
    h("div", { class: "row" }, stamp(i.codigo, "neutral"), stamp(TIPO[i.tipo] ?? i.tipo, i.tipo === "meta" ? "live" : "neutral"), stamp(s ? `${s.sigla} · ${s.diretor.nome}` : i.area, "neutral"), stamp(...ESTADO[i.estado])),
    h("strong", null, i.titulo),
    h("div", { class: "zoho-texto" }, i.descricao),
    h("dl", { class: "plano-dados" },
      i.responsavel ? [h("dt", null, "Quem faz"), h("dd", null, i.responsavel)] : null,
      i.indicador ? [h("dt", null, "Como medir"), h("dd", null, i.indicador)] : null,
      i.alvo ? [h("dt", null, i.estado === "proposto" ? "Alvo (proposta)" : "Alvo"), h("dd", null, i.alvo)] : null,
      i.prazo ? [h("dt", null, "Prazo"), h("dd", null, dataBR(i.prazo))] : null),
    h("p", { class: "field-hint" }, `Origem: ${i.origem}`),
    i.estado !== "cancelado" ? h("div", { class: "stack-s" }, nota, h("div", { class: "row" }, botoes, anotar)) : h("div", { class: "row" }, botoes),
    saida,
    i.historico?.length ? method(`Histórico (${i.historico.length})`, ...i.historico.map((x) => `${formatDateTime(x.em)} · ${x.quem}: ${x.acao === "estado" ? `${x.de} → ${x.para}` : x.acao}${x.nota ? ` — ${x.nota}` : ""}`)) : null);
}

function formNovo(recarregar) {
  const sel = (id, opcoes) => h("select", { class: "select", id }, opcoes.map(([v, t]) => h("option", { value: v }, t)));
  const area = sel("pn-area", CATALOGO.map((s) => [s.id, `${s.sigla} · ${s.nome}`]));
  const fase = sel("pn-fase", FASES.map(([v, t]) => [v, t]));
  const tipo = sel("pn-tipo", Object.entries(TIPO));
  const titulo = h("input", { class: "input", id: "pn-titulo", autocomplete: "off" });
  const descricao = h("textarea", { class: "input", id: "pn-desc", rows: 3 });
  const resp = h("input", { class: "input", id: "pn-resp", autocomplete: "off" });
  const indicador = h("input", { class: "input", id: "pn-ind", autocomplete: "off" });
  const alvo = h("input", { class: "input", id: "pn-alvo", autocomplete: "off" });
  const prazo = h("input", { class: "input", id: "pn-prazo", type: "date" });
  const saida = h("div", { role: "status" });
  const f = h("form", { class: "stack-s", novalidate: true },
    h("div", { class: "form-grid" }, field(area.id, "Área", area), field(fase.id, "Fase", fase), field(tipo.id, "Tipo", tipo), field(prazo.id, "Prazo", prazo)),
    field(titulo.id, "Título", titulo), field(descricao.id, "O que fazer", descricao),
    h("div", { class: "form-grid" }, field(resp.id, "Quem faz", resp), field(indicador.id, "Como medir", indicador), field(alvo.id, "Alvo", alvo)),
    h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "submit" }, "Adicionar ao plano")), saida);
  f.addEventListener("submit", async (e) => {
    e.preventDefault(); clear(saida);
    try {
      await api.planoCriar({ area: area.value, fase: fase.value, tipo: tipo.value, titulo: titulo.value, descricao: descricao.value, responsavel: resp.value, indicador: indicador.value, alvo: alvo.value, prazo: prazo.value || null });
      await recarregar();
    } catch (err) { saida.append(errorNotice(err.message)); }
  });
  return method("Adicionar item ao plano", f);
}

export async function telaPlano(root) {
  const filtroArea = h("select", { class: "select", id: "pl-area" }, h("option", { value: "" }, "Todas as áreas"), CATALOGO.map((s) => h("option", { value: s.id }, `${s.sigla} · ${s.nome}`)));
  const filtroEstado = h("select", { class: "select", id: "pl-estado" }, h("option", { value: "" }, "Todos os estados"), Object.entries(ESTADO).map(([v, [t]]) => h("option", { value: v }, t)));
  const resumo = h("div", { class: "cfo-stats" });
  const corpo = h("div", { class: "stack" });
  const topo = h("div", { class: "stack-s" });
  let dados = null;
  async function recarregar() { dados = await api.plano(); desenhar(); }
  function desenhar() {
    const itens = dados.itens.filter((i) => (!filtroArea.value || i.area === filtroArea.value) && (!filtroEstado.value || i.estado === filtroEstado.value));
    const conta = (e) => dados.itens.filter((i) => i.estado === e).length;
    clear(resumo).append(
      stat("Itens no plano", String(dados.itens.length), `${dados.itens.filter((i) => i.tipo === "meta").length} metas`),
      stat("Aguardando sua decisão", String(conta("proposto")), "propostas dos diretores"),
      stat("Aprovados e em andamento", String(conta("aprovado") + conta("em_andamento")), "o que está valendo"),
      stat("Feitos", String(conta("feito")), `de ${dados.itens.length - conta("cancelado")} itens válidos`));
    clear(topo);
    if (dados.pode.criar) topo.append(formNovo(recarregar));
    clear(corpo).append(...[...FASES.map(([id, titulo, sub]) => {
      const daFase = itens.filter((i) => i.fase === id);
      if (!daFase.length) return null;
      const propostos = daFase.filter((i) => i.estado === "proposto");
      let aprovarTodos = null;
      if (dados.pode.aprovar && propostos.length > 1) {
        aprovarTodos = h("button", { class: "btn btn-ghost", type: "button" }, `Aprovar os ${propostos.length} propostos desta fase`);
        aprovarTodos.addEventListener("click", async () => {
          if (!confirm(`Aprovar ${propostos.length} itens da fase "${titulo}"? Você pode cancelar qualquer um depois.`)) return;
          aprovarTodos.disabled = true;
          for (const i of propostos) { try { await api.planoMudar(i.id, { estado: "aprovado", nota: "aprovado em lote" }); } catch { /* segue */ } }
          await recarregar();
        });
      }
      return panel({ title: titulo, subtitle: sub, actions: aprovarTodos }, h("ol", { class: "list-plain stack" }, daFase.map((i) => cartaoItem(i, dados.pode, recarregar))));
    }), itens.length ? null : h("p", { class: "result-empty" }, "Nenhum item com estes filtros.")].filter(Boolean)); // append nativo: sem null
  }
  for (const f of [filtroArea, filtroEstado]) f.addEventListener("change", desenhar);
  root.append(
    panel({ title: "Plano da VOICE", subtitle: "Metas, ações e rotinas propostas pelos diretores a partir dos seus dados. Nada vale antes de você aprovar; tudo fica registrado com quem e quando." },
      resumo,
      method("Como usar o plano", "1. Leia cada fase e aprove o que concorda (ou marque \"Não fazer\"). Metas são propostas até você aprovar.",
        "2. Quem executa marca \"Começar\" e \"Concluir\"; anotações ficam no histórico.",
        "3. Toda segunda-feira: abra o plano, veja o que está em andamento e o que venceu (rotina PL de revisão semanal).",
        "4. Mudou de ideia? Reabra ou edite: a versão anterior fica no histórico."),
      h("div", { class: "form-grid" }, field(filtroArea.id, "Área", filtroArea), field(filtroEstado.id, "Estado", filtroEstado)),
      topo),
    corpo,
  );
  await recarregar();
}

// ================================================================ estoque estrategico
export async function telaEstoqueEstrategico(root) {
  const [{ respostas }, orc, cb] = await Promise.all([api.cfoFormulario(), api.cfoOrcamentos(), api.cfoCambio().catch(() => ({ serie: [] }))]);
  const p = parametros(respostas);
  const hist = resumir(orc.orcamentos, {});
  const fech = h("input", { class: "input num", id: "es-fech", inputmode: "decimal", value: String(hist.conversaoPct ?? 50).replace(".", ",") });
  const cobertura = h("input", { class: "input num", id: "es-cob", inputmode: "decimal", value: "30" });
  const corpo = h("div", { class: "stack-s" });
  const caixa = numeroBR(respostas.dividas?.dados?.caixa_hoje);
  const atraso = (respostas.dividas?.dados?.lista ?? []).some((d) => d.atraso === "sim");
  const gat = gatilhoEstoque({ caixa: caixa === 0 && !respostas.dividas?.dados?.caixa_hoje ? null : caixa, fixosMes: (p.fixos ?? 0) + (p.proLabore ?? 0), dividaEmAtraso: atraso });
  const dolar = momentoDolar(cb.serie);
  const hoje = new Date().toISOString().slice(0, 10);
  const umAno = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  function desenhar() {
    const r = curvaItens(orc.orcamentos, { desde: umAno, ate: hoje, fechamentoPct: numeroBR(fech.value) ?? 50, prazoDias: p.prazoEntrega ?? 25, coberturaDias: numeroBR(cobertura.value) ?? 30 });
    const ab = r.linhas.filter((l) => l.classe !== "C");
    const total = ab.reduce((a, l) => a + (l.valorLote ?? 0), 0);
    clear(corpo).append(
      h("div", { class: "cfo-stats" },
        stat("Projetos orçados (12 meses)", String(r.projetos), "versões do mesmo cliente contam uma vez"),
        stat("Itens curva A e B", String(ab.length), "aparecem em 10% ou mais dos projetos"),
        stat("Valor do estoque sugerido", brl(total), "custo de compra no Zoho, lote de A e B")),
      table({ caption: "Itens mais usados e lote sugerido", head: ["Curva", "Item", "Em quantos projetos", "Média por projeto", "Consumo/mês (estimado)", "Lote sugerido", "Valor do lote"], align: ["", "", "r", "r", "r", "r", "r"],
        rows: r.linhas.slice(0, 40).map((l) => [stamp(l.classe, l.classe === "A" ? "live" : l.classe === "B" ? "ok" : "neutral"), l.nome, `${l.projetos} (${pct(l.presencaPct)})`, String(l.mediaPorProjeto).replace(".", ","), String(l.consumoMensal).replace(".", ","), String(l.lote), brl(l.valorLote)]) }));
  }
  for (const el of [fech, cobertura]) el.addEventListener("input", desenhar);
  root.append(
    panel({ title: "Estoque estratégico", subtitle: "Rogério (COO) sugere o quê e quanto; Ricardo (CFO) libera quando o caixa permitir. Comprar estoque com caixa negativo troca dívida cara por mercadoria parada." },
      h("p", { class: `notice ${gat.liberado ? "notice-ok" : "notice-warn"}` }, h("strong", null, gat.liberado ? "Liberado pelo CFO. " : "Ainda não é hora. "), gat.motivo),
      dolar ? h("div", { class: "cfo-stats" },
        stat("Dólar hoje (PTAX)", `R$ ${String(dolar.hoje).replace(".", ",")}`, cb.fonte),
        stat("Média dos últimos dias", `R$ ${String(dolar.media).replace(".", ",")}`, `mín. R$ ${String(dolar.minimo).replace(".", ",")} · máx. R$ ${String(dolar.maximo).replace(".", ",")}`),
        stat("Momento", dolar.sinal, `${dolar.difPct > 0 ? "+" : ""}${String(dolar.difPct).replace(".", ",")}% contra a média (sinal, não previsão)`)) : h("p", { class: "field-hint" }, "Cotação do dólar indisponível agora."),
      h("div", { class: "form-grid" }, field(fech.id, "Taxa de fechamento usada (%)", fech, "Padrão: aceitos ÷ (aceitos + recusados) no Zoho. Ajuste quando a seção 9 do formulário estiver preenchida."), field(cobertura.id, "Cobertura além do prazo de entrega (dias)", cobertura)),
      corpo,
      method("Como o lote é calculado", "Consumo/mês = quantidade do item nos projetos orçados em 12 meses × taxa de fechamento ÷ 12.", `Lote = consumo/mês × (prazo de entrega de ${p.prazoEntrega ?? 25} dias + cobertura) ÷ 30.`, "Regra do CFO (proposta no Plano): só comprar estoque com reserva de 3 meses de custo fixo + pró-labore e nenhuma dívida em atraso; compra fracionada quando o dólar estiver abaixo da média.")),
  );
  desenhar();
}
