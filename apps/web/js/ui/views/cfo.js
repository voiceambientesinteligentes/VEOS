// FERRAMENTAS DO CFO (Ricardo): formulario do fundador, preco correto dos produtos e da hora pela
// Politica V1, e diagnostico dos orcamentos do Zoho. O que faltar no formulario vira lacuna visivel;
// simulacao so com rotulo e fonte. Nada aqui muda preco de tabela nem envia nada a cliente.
import { api } from "../../data/api.js";
import { diagnosticoParams, impostosSimulados } from "../../domain/cfo_cenarios.js";
import { resumir, SINAIS } from "../../domain/diagnostico.js";
import { custoNoBrasil, FAIXAS, faixa, faturamentoMinimo, fatorProduto, margem, precoPolitica } from "../../domain/formacao_preco.js";
import { numeroBR, parametros, progresso, SECOES } from "../../domain/formulario_cfo.js";
import { formatBRL, formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, method, panel, stamp, stat, table } from "../dom.js";

const brl = (v) => (v === null || v === undefined || Number.isNaN(v) ? "—" : formatBRL(String(Number(v).toFixed(2))));
const pct = (v) => (v === null || v === undefined ? "—" : `${String(Math.round(v * 10) / 10).replace(".", ",")}%`);
const dataBR = (iso) => String(iso ?? "").slice(0, 10).split("-").reverse().join("/");
const FAIXA_TOM = { VERDE: "ok", ACEITAVEL: "ok", ATENCAO: "warn", "NAO APROVADO": "risk", "NAO RESOLVIDO": "neutral" };
const FAIXA_TXT = { VERDE: "verde", ACEITAVEL: "aceitável", ATENCAO: "atenção", "NAO APROVADO": "não aprovado", "NAO RESOLVIDO": "faltam dados" };
const linkForm = (texto = "Preencher no Formulário do CFO") => h("a", { href: "#/cfo/formulario" }, texto);

// ================================================================ formulario
function controle(c, id, valor) {
  if (c.tipo === "opcao") return h("select", { class: "select", id }, h("option", { value: "" }, "—"), c.opcoes.map(([v, t]) => h("option", { value: v, selected: v === valor }, t)));
  if (c.tipo === "area") return h("textarea", { class: "input", id, rows: 3 }, valor ?? "");
  const numerico = ["numero", "moeda", "pct"].includes(c.tipo);
  return h("input", { class: `input${numerico ? " num" : ""}`, id, type: "text", inputmode: numerico ? "decimal" : null, autocomplete: "off", value: valor ?? "", placeholder: c.tipo === "moeda" ? "R$" : c.tipo === "pct" ? "%" : null });
}
const rotulo = (c) => `${c.rotulo}${c.tipo === "pct" && !/%/.test(c.rotulo) ? " (%)" : ""}`;

function lista(c, prefixo, valores = []) {
  const corpo = h("div", { class: "stack-s" });
  const linha = (v = {}) => {
    const n = corpo.children.length;
    const el = h("div", { class: "panel panel-tight lista-linha" });
    const remover = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Remover");
    remover.addEventListener("click", () => el.remove());
    el.append(h("div", { class: "form-grid" }, c.campos.map((s) => { const id = `${prefixo}-${n}-${s.id}`; const ctl = controle(s, id, v[s.id]); ctl.dataset.sub = s.id; return field(id, rotulo(s), ctl, s.ajuda); })), h("div", { class: "row" }, remover));
    corpo.append(el);
  };
  for (const v of valores) linha(v);
  const add = h("button", { class: "btn btn-ghost", type: "button" }, "+ Adicionar linha");
  add.addEventListener("click", () => linha());
  const el = h("div", { class: "stack-s", dataset: { lista: c.id } }, h("strong", null, c.rotulo), corpo, h("div", { class: "row" }, add));
  el.ler = () => [...corpo.children].map((l) => Object.fromEntries([...l.querySelectorAll("[data-sub]")].map((x) => [x.dataset.sub, x.value.trim()]))).filter((o) => Object.values(o).some(Boolean));
  return el;
}

function porOrcamento(c, valores = {}, aceitos = []) {
  const el = h("div", { class: "stack-s" }, h("strong", null, c.rotulo));
  if (!aceitos.length) el.append(h("p", { class: "field-hint" }, "Nenhum orçamento aceito ou em rascunho no espelho do Zoho."));
  for (const o of aceitos) {
    const v = valores[o.numero] ?? {};
    el.append(h("details", { class: "panel panel-tight cfo-orc", dataset: { numero: o.numero } },
      h("summary", null, `${o.numero} · ${dataBR(o.data)} · ${o.cliente} · ${brl(o.total)}`, o.status === "draft" ? stamp("rascunho no Zoho", "neutral") : null, Object.keys(v).length ? stamp("respondido", "ok") : null),
      h("div", { class: "form-grid" }, c.campos.map((s) => { const id = `po-${o.numero}-${s.id}`; const ctl = controle(s, id, v[s.id]); ctl.dataset.sub = s.id; return field(id, s.rotulo, ctl); }))));
  }
  el.ler = () => Object.fromEntries([...el.querySelectorAll(".cfo-orc")].map((d) => [d.dataset.numero, Object.fromEntries([...d.querySelectorAll("[data-sub]")].map((x) => [x.dataset.sub, x.value.trim()]).filter(([, x]) => x))]).filter(([, o]) => Object.keys(o).length));
  return el;
}

export async function telaFormularioCfo(root) {
  const [{ respostas }, orc] = await Promise.all([api.cfoFormulario(), api.cfoOrcamentos().catch(() => ({ orcamentos: [] }))]);
  // Secao 7: aceitos e tambem os rascunhos desde 2025 (o Zoho nao diz quais fecharam)
  const aceitos = orc.orcamentos.filter((o) => ["accepted", "invoiced"].includes(o.status) || (o.status === "draft" && String(o.data) >= "2025-01-01"));
  const indice = h("ol", { class: "list-plain stack-s" });
  const desenharIndice = () => clear(indice).append(progresso(respostas).map((p) => h("li", { class: "row" },
    h("a", { href: `#/cfo/formulario?secao=${p.id}`, "data-secao": p.id }, p.titulo),
    stamp(`${p.feitos}/${p.total}`, p.feitos === p.total ? "ok" : p.feitos ? "warn" : "neutral"),
    p.em ? h("span", { class: "field-hint" }, `salvo por ${p.por} em ${formatDateTime(p.em)}`) : h("span", { class: "field-hint" }, "não preenchido"))));
  desenharIndice();
  indice.addEventListener("click", (e) => { const a = e.target.closest("[data-secao]"); if (!a) return; e.preventDefault(); document.getElementById(`sec-${a.dataset.secao}`)?.scrollIntoView({ behavior: "smooth" }); });

  const secoes = SECOES.map((s) => {
    const d = respostas[s.id]?.dados ?? {};
    const ctls = s.campos.map((c) => {
      if (c.tipo === "lista") return { c, el: lista(c, `${s.id}-${c.id}`, d[c.id] ?? []) };
      if (c.tipo === "orcamentos") return { c, el: porOrcamento(c, d[c.id] ?? {}, aceitos) };
      const id = `f-${s.id}-${c.id}`;
      return { c, ctl: controle(c, id, d[c.id]), id };
    });
    const saida = h("div", { role: "status" });
    const salvar = h("button", { class: "btn btn-primary", type: "submit" }, "Salvar esta seção");
    const form = h("form", { class: "stack-s", novalidate: true, id: `form-${s.id}` },
      h("div", { class: "form-grid" }, ctls.filter((x) => x.ctl).map((x) => field(x.id, rotulo(x.c), x.ctl, x.c.ajuda))),
      ctls.filter((x) => x.el).map((x) => x.el),
      h("div", { class: "row" }, salvar), saida);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clear(saida);
      const dados = {};
      for (const x of ctls) {
        if (x.el) { const v = x.el.ler(); if (Array.isArray(v) ? v.length : Object.keys(v).length) dados[x.c.id] = v; continue; }
        const v = x.ctl.value.trim();
        if (!v) continue;
        if (["numero", "moeda", "pct"].includes(x.c.tipo) && numeroBR(v) === null) return saida.append(errorNotice(`"${x.c.rotulo}": digite só o número (ex.: 1.234,56).`));
        dados[x.c.id] = v;
      }
      salvar.disabled = true;
      try {
        const r = await api.cfoSalvarSecao(s.id, dados);
        respostas[s.id] = { dados, em: r.em, autor_nome: "você", versoes: (respostas[s.id]?.versoes ?? 0) + 1 };
        desenharIndice();
        saida.append(h("p", { class: "notice notice-ok" }, "Seção salva. A versão anterior continua no histórico."));
      } catch (err) { saida.append(errorNotice(err.message)); } finally { salvar.disabled = false; }
    });
    return h("section", { class: "panel stack-s", id: `sec-${s.id}` },
      h("div", { class: "panel-head" }, h("div", null, h("h2", { class: "h3-like" }, s.titulo), h("p", null, s.porque))), form);
  });
  root.append(
    panel({ title: "Formulário do CFO", subtitle: "O que preciso saber de você para calcular o preço certo dos produtos e da mão de obra e fechar o diagnóstico de pedidos, impostos e dívidas. Preencha no seu ritmo: cada seção salva separada e guarda o histórico." },
      indice,
      method("Como estas respostas são usadas", "Impostos, cartão, comissão e importação entram na fórmula de preço da Política V1 (tela Preço dos produtos).", "Equipe e produtividade dão o custo da hora; custos fixos, pró-labore e parcelas dão o faturamento mínimo por mês.", "Os pedidos completam o diagnóstico com o que foi de fato recebido e gasto.", "Não sabe um campo? Deixe em branco: ele aparece como lacuna, nunca como zero.")),
    ...secoes,
  );
  const alvo = new URLSearchParams(location.hash.split("?")[1] ?? "").get("secao");
  if (alvo) document.getElementById(`sec-${alvo}`)?.scrollIntoView();
}

// ================================================================ cenario de impostos
function painelLacunas(p) {
  return p.lacunas.length
    ? h("div", { class: "notice notice-warn stack-s" }, h("strong", null, `Faltam ${p.lacunas.length} informação(ões) suas:`), h("ul", null, p.lacunas.map((l) => h("li", null, l))), linkForm())
    : h("p", { class: "notice notice-ok" }, "Formulário completo para o cálculo de preço.");
}

// ================================================================ precos dos produtos
export async function telaPrecosCfo(root) {
  const [{ respostas }, { produtos }, orc] = await Promise.all([api.cfoFormulario(), api.cfoProdutos(), api.cfoOrcamentos().catch(() => ({ rbt12: null }))]);
  const p = parametros(respostas);
  const sim = impostosSimulados(orc.rbt12);
  const cenario = h("select", { class: "select", id: "cp-cenario" }, h("option", { value: "2026" }, "Venda até 31/12/2026 (Simples)"), h("option", { value: "2027" }, "Venda a partir de 2027 (fora do Simples)"));
  const tIn = h("input", { class: "input num", id: "cp-t", inputmode: "decimal", autocomplete: "off" });
  const vIn = h("input", { class: "input num", id: "cp-v", inputmode: "decimal", autocomplete: "off", value: String(p.v).replace(".", ",") });
  const tsIn = h("input", { class: "input num", id: "cp-ts", inputmode: "decimal", autocomplete: "off" });
  const origemT = h("span", { class: "field-hint" });
  const origemTs = h("span", { class: "field-hint" });
  const compra = h("select", { class: "select", id: "cp-compra" }, h("option", { value: "atual" }, "Como hoje (pelos seus pedidos)"), h("option", { value: "cnpj" }, "Se comprar regular pelo CNPJ (hipótese)"));
  const busca = h("input", { class: "input", id: "cp-busca", type: "search", placeholder: "Filtrar por nome ou código", autocomplete: "off" });
  const resumo = h("div", { class: "cfo-stats" });
  const tabela = h("div");
  const hora = h("div", { class: "stack-s" });
  const minimo = h("div", { class: "stack-s" });

  function preencherCenario() {
    const ano = cenario.value;
    const tp = ano === "2026" ? p.tProduto : p.tProduto2027;
    const ts = ano === "2026" ? p.tServico : p.tServico2027;
    if (tp !== null) { tIn.value = String(tp).replace(".", ","); origemT.textContent = "informado por você (contador)"; }
    else if (ano === "2026" && sim) { tIn.value = String(sim.produto).replace(".", ","); origemT.textContent = `SIMULAÇÃO: Simples Anexo I, faixa ${sim.faixaI}, faturamento estimado pelo Zoho ${brl(sim.rbt12)} · confirmar com o contador`; }
    else { tIn.value = ""; origemT.textContent = ano === "2027" ? "LACUNA: o contador precisa informar a alíquota de 2027 (com ICMS)" : "LACUNA: informe a alíquota"; }
    if (ts !== null) { tsIn.value = String(ts).replace(".", ","); origemTs.textContent = "informado por você (contador)"; }
    else if (ano === "2026" && sim) { tsIn.value = String(sim.servico).replace(".", ","); origemTs.textContent = `SIMULAÇÃO: Simples Anexo III (art. 18 §5º-B IX: instalação e manutenção), faixa ${sim.faixaIII} · BIB-0040 em consulta: pode ser Anexo IV`; }
    else { tsIn.value = ""; origemTs.textContent = "LACUNA: alíquota sobre serviço"; }
  }

  function desenhar() {
    const t = numeroBR(tIn.value), v = numeroBR(vIn.value) ?? 0, ts = numeroBR(tsIn.value);
    const q = busca.value.trim().toLowerCase();
    let abaixoMin = 0, comZoho = 0, semPreco = 0;
    const linhas = produtos.map((x) => {
      const f = fatorProduto(x, { ...p.fator, compra: compra.value });
      const custo = f.fator === null ? null : custoNoBrasil(x.custo, { fator: f.fator, perdas: p.perdas });
      const precos = Object.fromEntries(FAIXAS.map(([k, a]) => [k, t === null ? null : precoPolitica(custo, { t, v, alvo: a })]));
      const atual = x.preco_venda ?? x.zoho.find((z) => z.venda)?.venda ?? null;
      const m = atual && custo !== null && t !== null ? margem(atual, custo, { t, v }) : null;
      if (atual) comZoho += 1;
      if (m && m.pct < 30) abaixoMin += 1;
      if (precos.meta === null) semPreco += 1;
      return { x, f, custo, precos, atual, m };
    });
    clear(resumo).append(
      stat("Produtos", String(produtos.length), "ativos e a revisar no catálogo"),
      stat("Com preço atual", String(comZoho), "preço de venda no VEOS ou item igual no Zoho"),
      stat("Preço atual abaixo do mínimo", String(abaixoMin), "MC abaixo de 30% com custo de importação"),
      stat("Sem preço calculável", String(semPreco), t === null ? "falta a alíquota" : "falta custo ou câmbio (veja a coluna fator)"));
    const vis = linhas.filter(({ x }) => !q || `${x.codigo} ${x.nome}`.toLowerCase().includes(q));
    clear(tabela).append(table({
      caption: `Preço mínimo por produto (Política V1: MC sobre a receita líquida, com provisão de 2%) · ${vis.length} de ${linhas.length}`,
      head: ["Código", "Produto", "Pago (AliExpress)", "Fator de importação", "Custo no Brasil", "Meta 35%", "Mínimo 30%", "Piso 25%", "Preço atual", "MC do preço atual"],
      align: ["", "", "r", "r", "r", "r", "r", "r", "r", "r"],
      rows: vis.map(({ x, f, custo, precos, atual, m }) => [
        h("a", { href: `#/produtos/${x.id}` }, x.codigo), x.nome, brl(x.custo),
        h("span", { title: f.origem }, f.fator === null ? "—" : String(f.fator).replace(".", ",")), brl(custo),
        h("strong", null, brl(precos.meta)), brl(precos.minimo), brl(precos.piso), brl(atual),
        m ? stamp(`${pct(m.pct)} · ${FAIXA_TXT[faixa(m.pct)]}`, FAIXA_TOM[faixa(m.pct)]) : "—",
      ]),
    }));
    desenharHora(ts, v);
    desenharMinimo(t, ts);
  }

  function desenharHora(ts, v) {
    const ch = p.hora.custoHora;
    clear(hora);
    if (ch === null) {
      hora.append(h("p", null, "Ainda não dá para calcular o preço da hora: faltam os dados de quem executa."), h("ul", null, p.hora.lacunas.map((l) => h("li", null, l))), linkForm("Preencher a seção 3 (Equipe e mão de obra)"));
      return;
    }
    const precos = FAIXAS.map(([k, a]) => [k, a, ts === null ? null : precoPolitica(ch, { t: ts, v, alvo: a })]);
    hora.append(
      h("div", { class: "cfo-stats" }, stat("Custo da hora", brl(ch), `${brl(p.hora.custoMensal)}/mês ÷ ${p.hora.horasVendaveis} h vendáveis`),
        ...precos.map(([k, a, pr]) => stat(`Preço da hora · ${k} ${a}%`, brl(pr), ts === null ? "falta alíquota de serviço" : "por hora vendida"))),
    );
    const tempos = respostas.equipe?.dados?.tempos ?? [];
    if (tempos.length && ts !== null) {
      const ph = precos[0][2];
      hora.append(table({ caption: "Preço por serviço (tempo-padrão × preço da hora meta)", head: ["Serviço", "Unidade", "Horas", "Preço meta"], align: ["", "", "r", "r"], rows: tempos.map((x) => [x.servico || "—", x.unidade || "—", String(x.horas ?? "—"), brl(numeroBR(x.horas) === null || ph === null ? null : Math.round(numeroBR(x.horas) * ph * 100) / 100)]) }));
    }
  }

  function desenharMinimo(t, ts) {
    clear(minimo);
    const tMedio = t !== null && ts !== null ? (t + ts) / 2 : null;
    const fm = faturamentoMinimo({ fixos: p.fixos, proLabore: p.proLabore, dividas: p.parcelasMes, mcPct: 35, t: tMedio });
    if (fm === null) { minimo.append(h("p", null, "Falta o total de custos fixos para calcular quanto precisa vender por mês."), linkForm("Preencher a seção 4 (Custos fixos)")); return; }
    minimo.append(h("div", { class: "cfo-stats" },
      stat("Custos fixos + pró-labore", brl(p.fixos + p.proLabore), "por mês"),
      stat("Parcelas de dívidas", brl(p.parcelasMes), `${p.dividas} dívida(s) · saldo ${brl(p.saldoDividas)}`),
      stat("Vender por mês (mínimo)", brl(fm), "com MC de 35% e imposto médio produto/serviço")),
      h("p", { class: "field-hint" }, "Abaixo desse faturamento, mesmo vendendo no preço meta, o mês fecha sem dinheiro para estrutura, retirada e parcelas."));
  }

  cenario.addEventListener("change", () => { preencherCenario(); desenhar(); });
  for (const el of [tIn, vIn, tsIn, busca]) el.addEventListener("input", desenhar);
  compra.addEventListener("change", desenhar);
  preencherCenario();
  root.append(
    panel({ title: "Preço correto dos produtos", subtitle: "Ricardo (CFO): o preço sai da margem de contribuição da Política V1 sobre o custo real no Brasil (preço pago × fator de importação), não de um multiplicador fixo." },
      painelLacunas(p),
      h("div", { class: "form-grid" }, field(cenario.id, "Quando a venda será faturada", cenario), field(tIn.id, "Imposto sobre produto (%)", tIn, origemT), field(tsIn.id, "Imposto sobre serviço (%)", tsIn, origemTs), field(vIn.id, "Cartão + comissão + indicação (% do preço)", vIn, p.cartaoInformado ? "do formulário" : "LACUNA: sem taxa de cartão informada, está 0%"), field(compra.id, "Origem da compra", compra, "O imposto de importação zero até US$ 50 vale só para pessoa física")),
      field(busca.id, "Filtrar", busca), resumo, tabela,
      method("Como o preço é calculado", "Preço mínimo P = Custo ÷ [(1 − imposto) × (1 − 2% − margem) − despesas variáveis]: com esse preço a margem de contribuição oficial fica exatamente na meta (35%), no mínimo normal (30%) ou no piso (25%, só com a direção).",
        "Custo no Brasil = preço pago no AliExpress × fator de importação × (1 + perdas). O fator vem, nesta ordem, do formulário, do pedido mais recente do próprio produto (após 12/05/2026), da regra do Remessa Conforme com o seu câmbio, ou da mediana dos seus pedidos (1,205, só até R$ 280; acima, sem câmbio, fica lacuna).",
        "Regra vigente (Receita Federal, Portaria MF 1.342/2026): pessoa física, II 0% até US$ 50 e 60% menos US$ 30 acima; ICMS de SC 17% por dentro. Nos seus pedidos o fator passou de 1,446 para 1,205 em 12/05/2026, o que indica compras no CPF: revender o que foi comprado no CPF é risco fiscal (leve ao contador).",
        "Custos fixos não entram no preço de cada item: são pagos pela margem. Veja o faturamento mínimo abaixo.",
        "Preço de tabela só muda com a alçada (BIB-0075, em consulta): esta tela calcula; quem registra é a direção na ficha do produto.")),
    panel({ title: "Preço da mão de obra (hora)", subtitle: "Custo da hora = custo mensal de quem executa (com encargos) + veículo e ferramentas ÷ horas vendáveis. Preço da hora pela mesma fórmula da Política." }, hora),
    panel({ title: "Quanto precisa vender por mês", subtitle: "Faturamento mínimo = (custos fixos + pró-labore + parcelas de dívidas) ÷ margem de contribuição por real vendido." }, minimo),
  );
  desenhar();
}

// ================================================================ diagnostico
export async function telaDiagnosticoCfo(root) {
  const [{ respostas }, orc] = await Promise.all([api.cfoFormulario(), api.cfoOrcamentos()]);
  const p = parametros(respostas);
  const { params, simulado, texto } = diagnosticoParams(p, impostosSimulados(orc.rbt12));
  const r = resumir(orc.orcamentos, params);
  const pedidos = respostas.pedidos?.dados?.por_orcamento ?? {};
  root.append(
    panel({ title: "Diagnóstico dos orçamentos", subtitle: `Ricardo (CFO): ${r.quantidade} orçamentos aceitos no Zoho Books, conferidos contra a Política V1. ${orc.fonte}.` },
      h("div", { class: "cfo-stats" },
        stat("Vendido (aceitos)", brl(r.total), `${r.quantidade} orçamentos · conversão ${pct(r.conversaoPct)} dos decididos`),
        stat("Desconto concedido", brl(r.desconto), `${pct(r.descPct)} do preço cheio`),
        stat("Acima da alçada", `${r.acimaAlcada} de ${r.quantidade}`, "desconto acima de 5%"),
        stat("Mão de obra dada", brl(r.maoDeObraDada.servicos), `${r.maoDeObraDada.orcamentos} orçamentos com o serviço tirado no desconto`)),
      simulado ? h("p", { class: "notice notice-warn" }, texto, " ", linkForm("Informar as alíquotas reais")) : null,
      h("p", { class: "field-hint" }, "Este diagnóstico só vê os orçamentos: o Zoho não tem faturas, recebimentos nem contas lançadas. O que foi realmente recebido e gasto entra pela seção 7 do formulário."),
    ),
    panel({ title: "O que está dando errado", subtitle: "Sinais encontrados nos orçamentos aceitos, do mais grave para o menos grave." },
      h("ul", { class: "list-plain stack-s" }, r.sinais.map((s) => h("li", { class: "row" }, stamp(`${s.n}×`, SINAIS[s.id].peso >= 3 ? "risk" : SINAIS[s.id].peso === 2 ? "warn" : "neutral"), h("span", null, s.texto))))),
    panel({ title: "Orçamento por orçamento" },
      table({
        head: ["Data", "Nº", "Cliente", "Total", "Desconto", "Margem bruta dos produtos", "MC estimada", "Sinais"], align: ["", "", "", "r", "r", "r", "r", ""],
        rows: r.aceitos.map((a) => [dataBR(a.data), a.numero, a.cliente, brl(a.total), pct(a.descPct), pct(a.margemBensPct),
          a.margem ? stamp(`${pct(a.margem.pct)}${a.margemCompleta ? "" : " parcial"}`, a.margemCompleta ? FAIXA_TOM[a.faixa] : "neutral") : "—",
          h("span", { class: "field-hint" }, `${a.sinais.length} sinal(is)${pedidos[a.numero] ? " · você informou o realizado" : ""}`)]),
      }),
      h("div", { class: "stack-s" }, r.aceitos.filter((a) => a.sinais.length).map((a) => h("details", { class: "method" },
        h("summary", null, `${a.numero} · ${a.cliente} · ${a.sinais.length} sinal(is)`),
        h("ul", null, a.sinais.map((s) => h("li", null, SINAIS[s].texto)), a.itens.map((i) => h("li", null, `${i.nome}: ${i.problema}${i.preco !== undefined ? ` (vendido ${brl(i.preco)}, custo ${brl(i.custo)})` : ` (custo ${brl(i.custo)})`}`)),
          a.lacunas.length ? h("li", null, `Margem incompleta, falta: ${a.lacunas.join(", ")}`) : null))))),
    method("Como cada sinal é medido", "Desconto = desconto do orçamento + ajuste negativo, sobre o preço cheio dos itens. Mão de obra dada = desconto ≥ 80% do valor dos serviços.",
      "Margem bruta dos produtos = (venda dos produtos − custo de compra do item no Zoho) ÷ venda, antes de desconto e imposto. MC estimada = fórmula oficial (receita líquida − custos − provisão de 2%), com mão de obra a custo-hora do formulário quando houver.",
      "Custo de compra dos serviços no Zoho é R$ 1,00 (sem base): por isso a mão de obra só entra com o custo-hora do formulário."),
  );
}
