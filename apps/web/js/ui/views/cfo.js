// FERRAMENTAS DO CFO (Ricardo): formulario do fundador, preco correto dos produtos e da hora pela
// Politica V1, e diagnostico dos orcamentos do Zoho. O que faltar no formulario vira lacuna visivel;
// simulacao so com rotulo e fonte. Nada aqui muda preco de tabela nem envia nada a cliente.
import { api } from "../../data/api.js";
import { diagnosticoParams, impostosSimulados } from "../../domain/cfo_cenarios.js";
import { resumir, SINAIS } from "../../domain/diagnostico.js";
import { analisarOrcamento } from "../../domain/analise_orcamento.js";
import { qualidadeDaBase } from "../../domain/base_orcamentos.js";
import { corrigirOrcamento } from "../../domain/correcao_orcamento.js";
import { projetos } from "../../domain/estoque_sugerido.js";
import { custoNoBrasil, FAIXAS, faixa, faturamentoMinimo, fatorProduto, margem, precoPolitica, variacaoDolar } from "../../domain/formacao_preco.js";
import { comCompatibilidade, numeroBR, parametros, progresso, SECOES, SUGESTOES_TEMPOS, temTextoExtra } from "../../domain/formulario_cfo.js";
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

const NUMERICOS = ["numero", "moeda", "pct"];

function lista(c, prefixo, valores = [], { sugestoes = null } = {}) {
  const corpo = h("div", { class: "stack-s" });
  let seq = 0;
  const linha = (v = {}) => {
    const n = seq++;
    const el = h("div", { class: `panel panel-tight lista-linha${v.origem === "pesquisa" ? " lista-sugestao" : ""}` });
    const remover = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Remover");
    remover.addEventListener("click", () => el.remove());
    el.append(h("div", { class: "form-grid" }, c.campos.map((s) => { const id = `${prefixo}-${n}-${s.id}`; const ctl = controle(s, id, v[s.id]); ctl.dataset.sub = s.id; ctl.dataset.tipo = s.tipo; return field(id, rotulo(s), ctl, s.ajuda); })), h("div", { class: "row" }, v.origem === "pesquisa" ? stamp("sugestão da pesquisa: confirme ou ajuste", "warn") : null, remover));
    corpo.append(el);
  };
  for (const v of valores) linha(v);
  const add = h("button", { class: "btn btn-ghost", type: "button" }, "+ Adicionar linha");
  add.addEventListener("click", () => linha());
  const botoes = h("div", { class: "row" }, add);
  if (sugestoes) {
    const sug = h("button", { class: "btn btn-ghost", type: "button" }, `+ Sugestões da pesquisa (${sugestoes.length})`);
    sug.addEventListener("click", () => {
      const tem = new Set([...corpo.querySelectorAll("[data-sub=descricao]")].map((x) => x.value.trim().toLowerCase()));
      let n = 0;
      for (const x of sugestoes) if (!tem.has(x.descricao.toLowerCase())) { linha(x); n += 1; }
      sug.textContent = n ? `${n} sugestões adicionadas: confira e salve` : "Sugestões já estão na lista";
    });
    botoes.append(sug);
  }
  const el = h("div", { class: "stack-s", dataset: { lista: c.id } }, h("strong", null, c.rotulo), corpo, botoes);
  el.ler = () => [...corpo.children].map((l) => Object.fromEntries([...l.querySelectorAll("[data-sub]")].map((x) => [x.dataset.sub, x.value.trim()]))).filter((o) => Object.values(o).some(Boolean));
  el.invalidos = () => [...corpo.querySelectorAll("[data-sub]")].filter((x) => NUMERICOS.includes(x.dataset.tipo) && x.value.trim() && numeroBR(x.value) === null);
  return el;
}

function porOrcamento(c, valores = {}, aceitos = []) {
  const el = h("div", { class: "stack-s" }, h("strong", null, c.rotulo));
  if (!aceitos.length) el.append(h("p", { class: "field-hint" }, "Nenhum orçamento aceito ou em rascunho no espelho do Zoho."));
  for (const o of aceitos) {
    const v = valores[o.numero] ?? {};
    el.append(h("details", { class: "panel panel-tight cfo-orc", dataset: { numero: o.numero } },
      h("summary", null, `${o.numero} · ${dataBR(o.data)} · ${o.cliente} · ${brl(o.total)}`, o.status === "draft" ? stamp("rascunho no Zoho", "neutral") : null, Object.keys(v).length ? stamp("respondido", "ok") : null),
      h("div", { class: "form-grid" }, c.campos.map((s) => { const id = `po-${o.numero}-${s.id}`; const ctl = controle(s, id, v[s.id]); ctl.dataset.sub = s.id; ctl.dataset.tipo = s.tipo; return field(id, s.rotulo, ctl); }))));
  }
  el.ler = () => Object.fromEntries([...el.querySelectorAll(".cfo-orc")].map((d) => [d.dataset.numero, Object.fromEntries([...d.querySelectorAll("[data-sub]")].map((x) => [x.dataset.sub, x.value.trim()]).filter(([, x]) => x))]).filter(([, o]) => Object.keys(o).length));
  el.invalidos = () => [...el.querySelectorAll("[data-sub]")].filter((x) => NUMERICOS.includes(x.dataset.tipo) && x.value.trim() && numeroBR(x.value) === null);
  return el;
}

/** Campos da secao na ordem, quebrando a grade nos grupos (subdivisoes). */
function montarCampos(s, d, aceitos) {
  const ctls = [];
  const blocos = [];
  let grade = null;
  for (const c of s.campos) {
    if (c.tipo === "grupo") { grade = null; blocos.push(h("h3", { class: "cfo-grupo" }, c.rotulo)); continue; }
    if (c.tipo === "lista" || c.tipo === "orcamentos") {
      grade = null;
      const el = c.tipo === "lista" ? lista(c, `${s.id}-${c.id}`, d[c.id] ?? [], { sugestoes: s.id === "tempos" && c.id === "itens" ? SUGESTOES_TEMPOS : null }) : porOrcamento(c, d[c.id] ?? {}, aceitos);
      ctls.push({ c, el });
      blocos.push(el);
      continue;
    }
    const id = `f-${s.id}-${c.id}`;
    const ctl = controle(c, id, d[c.id]);
    ctls.push({ c, ctl, id });
    if (!grade) { grade = h("div", { class: "form-grid" }); blocos.push(grade); }
    const lido = NUMERICOS.includes(c.tipo) && temTextoExtra(d[c.id]) ? `Lido como ${String(numeroBR(d[c.id])).replace(".", ",")}` : null;
    grade.append(field(id, rotulo(c), ctl, [c.ajuda, lido].filter(Boolean).join(" · ") || null));
  }
  return { ctls, blocos };
}

export async function telaFormularioCfo(root) {
  const [{ respostas: brutas }, orc] = await Promise.all([api.cfoFormulario(), api.cfoOrcamentos().catch(() => ({ orcamentos: [] }))]);
  const respostas = comCompatibilidade(brutas);
  // Secao 9: aceitos e tambem os rascunhos desde 2025 (o Zoho nao diz quais fecharam)
  const aceitos = orc.orcamentos.filter((o) => ["accepted", "invoiced"].includes(o.status) || (o.status === "draft" && String(o.data) >= "2025-01-01"));
  const indice = h("ol", { class: "list-plain stack-s" });
  const desenharIndice = () => clear(indice).append(...progresso(respostas).map((p) => h("li", { class: "row" },
    h("a", { href: `#/cfo/formulario?secao=${p.id}`, "data-secao": p.id }, p.titulo),
    stamp(`${p.feitos}/${p.total}`, p.feitos === p.total ? "ok" : p.feitos ? "warn" : "neutral"),
    p.convertido ? h("span", { class: "field-hint" }, "convertido da versão anterior: confira e salve") : p.em ? h("span", { class: "field-hint" }, `salvo por ${p.por} em ${formatDateTime(p.em)}`) : h("span", { class: "field-hint" }, "não preenchido"))));
  desenharIndice();
  indice.addEventListener("click", (e) => { const a = e.target.closest("[data-secao]"); if (!a) return; e.preventDefault(); document.getElementById(`sec-${a.dataset.secao}`)?.scrollIntoView({ behavior: "smooth" }); });

  const secoes = SECOES.map((s) => {
    const d = respostas[s.id]?.dados ?? {};
    const { ctls, blocos } = montarCampos(s, d, aceitos);
    const saida = h("div", { role: "status" });
    const salvar = h("button", { class: "btn btn-primary", type: "submit" }, "Salvar esta seção");
    const form = h("form", { class: "stack-s", novalidate: true, id: `form-${s.id}` }, blocos, h("div", { class: "row" }, salvar), saida);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clear(saida);
      const dados = {};
      for (const x of ctls) {
        if (x.el) {
          const ruins = x.el.invalidos();
          if (ruins.length) { ruins[0].focus(); return saida.append(errorNotice(`"${x.c.rotulo}": há ${ruins.length} campo(s) numérico(s) sem número (ex.: 1.234,56 ou 18).`)); }
          const v = x.el.ler();
          if (Array.isArray(v) ? v.length : Object.keys(v).length) dados[x.c.id] = v;
          continue;
        }
        const v = x.ctl.value.trim();
        if (!v) continue;
        if (NUMERICOS.includes(x.c.tipo) && numeroBR(v) === null) return saida.append(errorNotice(`"${x.c.rotulo}": digite só o número (ex.: 1.234,56).`));
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
      h("div", { class: "panel-head" }, h("div", null, h("h2", { class: "h3-like" }, s.titulo), h("p", null, s.porque))),
      respostas[s.id]?.convertido ? h("p", { class: "notice notice-warn" }, "Preenchido a partir das suas respostas anteriores (novo formato). Confira e clique em Salvar para confirmar.") : null,
      form);
  });
  root.append(
    panel({ title: "Formulário do CFO", subtitle: "O que preciso saber de você para o preço certo dos produtos e da mão de obra, o diagnóstico e o plano. Preencha no seu ritmo: cada seção salva separada e guarda o histórico." },
      indice,
      method("Como estas respostas são usadas", "Impostos, cartão, comissão e importação entram na fórmula de preço da Política V1 (tela Preço dos produtos).", "Equipe, produtividade e tempos de serviço dão o custo da hora e as horas de cada orçamento (Diagnóstico).", "Custos fixos, sua retirada e as parcelas dão o faturamento mínimo e as metas do Plano da VOICE.", "Não sabe um campo? Deixe em branco: ele aparece como lacuna, nunca como zero.")),
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
  // dolar desde a compra mais antiga do catalogo (max. 2 anos) para atualizar o custo pela variacao
  const ultimaCompra = (x) => (x.compras ?? []).map((c) => c.data).filter(Boolean).sort().pop() ?? null;
  const maisAntiga = produtos.map(ultimaCompra).filter(Boolean).sort()[0] ?? "";
  const cb = await api.cfoCambio(maisAntiga).catch(() => ({ serie: [] }));
  // dolar do dia (PTAX do Banco Central) + a folga que voce definiu para a variacao ate a compra
  const ptax = cb.serie?.length ? cb.serie[cb.serie.length - 1] : null;
  const cambio = ptax ? Math.round(ptax.venda * (1 + (p.margemCambial ?? 0) / 100) * 10000) / 10000 : null;
  const sim = impostosSimulados(orc.rbt12);
  const cenario = h("select", { class: "select", id: "cp-cenario" }, h("option", { value: "2026" }, "Venda até 31/12/2026 (Simples)"), h("option", { value: "2027" }, "Venda a partir de 2027 (fora do Simples)"));
  const tIn = h("input", { class: "input num", id: "cp-t", inputmode: "decimal", autocomplete: "off" });
  const vIn = h("input", { class: "input num", id: "cp-v", inputmode: "decimal", autocomplete: "off", value: String(p.v).replace(".", ",") });
  const canal = h("select", { class: "select", id: "cp-canal" }, p.canais.map((c) => h("option", { value: c.nome, selected: c.nome === p.canalPadrao }, `${c.nome} (${String(c.v).replace(".", ",")}%)`)));
  canal.addEventListener("change", () => { const c = p.canais.find((x) => x.nome === canal.value); if (c) vIn.value = String(c.v).replace(".", ","); desenhar(); });
  const atualizarDolar = h("select", { class: "select", id: "cp-dolar" }, h("option", { value: "sim" }, "Sim: custo de hoje pelo dólar"), h("option", { value: "nao" }, "Não: preço da última compra"));
  atualizarDolar.addEventListener("change", () => desenhar());
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
    else if (ano === "2026" && sim) { tIn.value = String(sim.produto).replace(".", ","); origemT.textContent = `${p.simulacaoAdotada ? "ADOTADA por você" : "SIMULAÇÃO"}: Simples Anexo I, faixa ${sim.faixaI}, faturamento estimado pelo Zoho ${brl(sim.rbt12)} · confirmar com o contador`; }
    else { tIn.value = ""; origemT.textContent = ano === "2027" ? "LACUNA: o contador precisa informar a alíquota de 2027 (com ICMS)" : "LACUNA: informe a alíquota"; }
    if (ts !== null) { tsIn.value = String(ts).replace(".", ","); origemTs.textContent = "informado por você (contador)"; }
    else if (ano === "2026" && sim) { tsIn.value = String(sim.servico).replace(".", ","); origemTs.textContent = `${p.simulacaoAdotada ? "ADOTADA por você" : "SIMULAÇÃO"}: Simples Anexo III (art. 18 §5º-B IX: instalação e manutenção), faixa ${sim.faixaIII} · BIB-0040 em consulta: pode ser Anexo IV`; }
    else { tsIn.value = ""; origemTs.textContent = "LACUNA: alíquota sobre serviço"; }
  }

  function desenhar() {
    const t = numeroBR(tIn.value), v = numeroBR(vIn.value) ?? 0, ts = numeroBR(tsIn.value);
    const q = busca.value.trim().toLowerCase();
    let abaixoMin = 0, comZoho = 0, semPreco = 0, conflitos = 0;
    const linhas = produtos.map((x) => {
      const f = fatorProduto(x, { ...p.fator, cambio, compra: compra.value });
      if (f.conflito) conflitos += 1;
      const vd = atualizarDolar.value === "sim" ? variacaoDolar(ultimaCompra(x), cb.serie) : null;
      const fatorDolar = vd ? vd.fator * (1 + (p.spreadAliexpress ?? 0) / 100) : 1;
      const custo = f.fator === null ? null : custoNoBrasil(x.custo * fatorDolar, { fator: f.fator, perdas: p.perdas });
      const precos = Object.fromEntries(FAIXAS.map(([k, a]) => [k, t === null ? null : precoPolitica(custo, { t, v, alvo: a })]));
      const atual = x.preco_venda ?? x.zoho.find((z) => z.venda)?.venda ?? null;
      const m = atual && custo !== null && t !== null ? margem(atual, custo, { t, v }) : null;
      if (atual) comZoho += 1;
      if (m && m.pct < 30) abaixoMin += 1;
      if (precos.meta === null) semPreco += 1;
      return { x, f, custo, precos, atual, m, vd };
    });
    clear(resumo).append(
      stat("Produtos", String(produtos.length), "ativos e a revisar no catálogo"),
      stat("Com preço atual", String(comZoho), "preço de venda no VEOS ou item igual no Zoho"),
      stat("Preço atual abaixo do mínimo", String(abaixoMin), "MC abaixo de 30% com custo de importação"),
      stat("Sem preço calculável", String(semPreco), t === null ? "falta a alíquota" : "falta custo ou câmbio (veja a coluna fator)"),
      stat("Dólar usado", cambio ? `R$ ${String(cambio).replace(".", ",")}` : "—", ptax ? `PTAX de ${dataBR(ptax.data)} (Banco Central)${p.margemCambial ? ` + ${pct(p.margemCambial)} de folga` : " · sem folga cambial definida"}` : "cotação indisponível agora"));
    if (conflitos) resumo.append(h("p", { class: "notice notice-warn cfo-largo" }, `Você informou que o preço da planilha já inclui os impostos de importação, mas em ${conflitos} produto(s) o total pago no pedido foi maior que o preço unitário (em geral +20,5%). Usei o valor real do pedido. Confira um pedido no AliExpress e ajuste a seção 2 se for o caso.`));
    const vis = linhas.filter(({ x }) => !q || `${x.codigo} ${x.nome}`.toLowerCase().includes(q));
    clear(tabela).append(table({
      caption: `Preço mínimo por produto (Política V1: MC sobre a receita líquida, com provisão de 2%) · ${vis.length} de ${linhas.length}`,
      head: ["Código", "Produto", "Pago (AliExpress)", "Dólar desde a compra", "Fator de importação", "Custo no Brasil hoje", "Meta 35%", "Mínimo 30%", "Piso 25%", "Preço atual", "MC do preço atual"],
      align: ["", "", "r", "r", "r", "r", "r", "r", "r", "r", "r"],
      rows: vis.map(({ x, f, custo, precos, atual, m, vd }) => [
        h("a", { href: `#/produtos/${x.id}` }, x.codigo), x.nome, brl(x.custo),
        vd ? h("span", { title: `PTAX ${vd.de.data}: ${vd.de.venda} → ${vd.para.data}: ${vd.para.venda}` }, `${vd.fator >= 1 ? "+" : ""}${String(Math.round((vd.fator - 1) * 1000) / 10).replace(".", ",")}%`) : "—",
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
      h("div", { class: "form-grid" }, field(cenario.id, "Quando a venda será faturada", cenario), field(tIn.id, "Imposto sobre produto (%)", tIn, origemT), field(tsIn.id, "Imposto sobre serviço (%)", tsIn, origemTs), field(vIn.id, "Cartão + comissão + indicação (% do preço)", vIn, p.cartaoInformado ? `do formulário: cartão ${pct(p.vDetalhe.cartao)} + comissão ${pct(p.vDetalhe.comissao)} + indicação ${pct(p.vDetalhe.indicacao)}` : "LACUNA: sem taxa de cartão informada, está 0%"), field(compra.id, "Origem da compra", compra, "O imposto de importação zero até US$ 50 vale só para pessoa física"), field(canal.id, "Canal de venda", canal, "Com RT/indicação, sem ou turn key"), field(atualizarDolar.id, "Atualizar custo pelo dólar?", atualizarDolar, "Variação da PTAX desde a última compra de cada produto (atualiza todo dia)")),
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
    painelRecentes(orc.orcamentos, p, params, simulado),
    painelBase(orc.orcamentos, p, params),
    panel({ title: "Diagnóstico dos orçamentos", subtitle: `Ricardo (CFO): ${r.quantidade} orçamentos aceitos no Zoho Books, conferidos contra a Política V1. ${orc.fonte}.` },
      h("div", { class: "cfo-stats" },
        stat("Vendido (aceitos)", brl(r.total), `${r.quantidade} orçamentos · conversão ${pct(r.conversaoPct)} dos decididos`),
        stat("Desconto concedido", brl(r.desconto), `${pct(r.descPct)} do preço cheio`),
        stat("Acima da alçada", `${r.acimaAlcada} de ${r.quantidade}`, "desconto acima de 5%"),
        stat("Mão de obra dada", brl(r.maoDeObraDada.servicos), `${r.maoDeObraDada.orcamentos} orçamentos com o serviço tirado no desconto`)),
      simulado ? h("p", { class: "notice notice-warn" }, texto, " ", linkForm("Informar as alíquotas reais")) : null,
      h("p", { class: "field-hint" }, "Este diagnóstico só vê os orçamentos: o Zoho não tem faturas, recebimentos nem contas lançadas. O que foi realmente recebido e gasto entra pela seção 9 do formulário."),
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

// ================================================================ cobrado x o que deveria (por orcamento)
const SIT_COR = { abaixo: ["sobe", "risk"], ok: ["ok", "ok"], sem_custo: ["sem custo real", "neutral"], servico: ["serviço: ver horas", "neutral"], sem_cadastro: ["sem cadastro", "neutral"] };
function tabelaCorrecao(o, base) {
  const c = corrigirOrcamento(o, { t: base.tProduto, v: base.v, alvo: 35 });
  if (c.erro) return h("p", { class: "notice notice-warn" }, c.erro);
  return h("div", { class: "stack-s" },
    h("p", { class: c.abaixo ? "notice notice-warn" : "notice notice-ok" }, c.abaixo
      ? `Pela Política (meta de 35%), este orçamento deveria ser ${brl(c.total_novo)} em vez de ${brl(c.total_atual)}: ${brl(c.diferenca)} a mais (${pct(c.diferenca_pct)}), em ${c.abaixo} produto(s) abaixo do preço.`
      : `Os produtos com custo cadastrado já estão no preço da Política (meta de 35%) ou acima.${c.sem_custo ? ` ${c.sem_custo} item(ns) sem custo real não dá para conferir.` : ""}`),
    method(`Cobrado × o que deveria, item a item (${c.linhas.length} linhas)`,
      table({ caption: `Preço pela Política com imposto ${pct(c.imposto_pct)} e ${pct(c.despesas_canal_pct)} de RT/comissão/cartão do canal`, head: ["Item", "Qtd", "Custo", "Cobrado", "Margem atual", "Mínimo (30%)", "Deveria (35%)", "", "Diferença no total"], align: ["", "r", "r", "r", "r", "r", "r", "", "r"],
        rows: c.linhas.map((l) => [l.nome, String(l.qtd).replace(".", ","), l.custo ? brl(l.custo) : "—", brl(l.preco), l.margem_atual === null || l.margem_atual === undefined ? "—" : pct(l.margem_atual),
          l.preco_minimo_30 ? brl(l.preco_minimo_30) : "—", l.preco_meta_35 ? h("strong", null, brl(l.preco_meta_35)) : "—", stamp(...SIT_COR[l.situacao]), l.diferenca ? brl(l.diferenca) : ""]) }),
      `Total cobrado ${brl(c.total_atual)} · total pela Política ${brl(c.total_novo)}. Mão de obra: compare as horas cobradas com as calculadas acima. Custo = cadastro do item no Zoho (o CFO usa também a última compra confirmada no catálogo do VEOS).`));
}

// ================================================================ base de precos (todos os orcamentos)
// Decisao do fundador (06/10/2026): os orcamentos antigos nao viram pedido; servem de base para saber se o
// preco estava certo. Mesma analise do cartao abaixo, aplicada a todos (versoes contam uma vez).
function painelBase(orcamentos, p, params) {
  const base = { ...params, produtividade: p.produtividade, comissionamento: p.comissionamento, entregaHoras: p.entregaHoras, metrosPorPonto: p.metrosPorPonto };
  const r = qualidadeDaBase(orcamentos, base, p.tempos);
  const x = r.resumo;
  const linha = (l) => [h("a", { href: `#/cfo/diagnostico?orc=${encodeURIComponent(l.numero)}` }, l.numero), dataBR(l.data), l.situacao, brl(l.total), l.multiplicador ? `${String(l.multiplicador).replace(".", ",")}×` : "—", l.margem_produtos === null ? "—" : stamp(pct(l.margem_produtos), l.margem_produtos >= 30 ? "ok" : l.margem_produtos >= 25 ? "warn" : "risk"),
    l.itens_abaixo_25 ? stamp(`${l.itens_abaixo_25} item(ns) < 25%`, "risk") : "", l.margem_total === null ? "—" : pct(l.margem_total), l.horas_cobradas ? `${l.horas_cobradas} h / ${String(l.horas_calculadas).replace(".", ",")} h` : "sem horas"];
  return panel({ title: "Base de preços: todos os orçamentos", subtitle: `Decisão de 06/10/2026: os orçamentos antigos não viram pedido; servem de base para saber se o preço estava certo. ${x.projetos} projetos (rascunhos, enviados e aceitos; versões do mesmo cliente contam uma vez). Clique no número para ver o orçamento item a item contra o preço que deveria.` },
    h("div", { class: "cfo-stats" },
      stat("Produtos abaixo de 30%", pct(x.pct_produtos_abaixo_de_30), "dos projetos (margem dos produtos com imposto, comissão e RT)"),
      stat("Com item NÃO APROVADO", pct(x.pct_com_item_nao_aprovado_25), "projetos com algum produto abaixo de 25%"),
      stat("Multiplicador médio", x.multiplicador_medio_produtos ? `${String(x.multiplicador_medio_produtos).replace(".", ",")}×` : "—", "venda ÷ custo dos produtos"),
      stat("Horas cobradas × calculadas", x.horas_cobradas_sobre_calculadas_pct === null ? "—" : pct(x.horas_cobradas_sobre_calculadas_pct), `${x.horas_cobradas} h cobradas · ${x.horas_calculadas_realistas} h pelos tempos com produtividade ${pct(x.produtividade_usada)}`),
      stat("Sem condição de pagamento", pct(x.pct_sem_condicao_de_pagamento), "dos projetos"),
      stat("Sem imposto no preço", pct(x.pct_sem_imposto_no_preco), "dos projetos")),
    table({ caption: "Os 10 com a menor margem nos produtos", head: ["Nº", "Data", "Situação", "Total", "Multiplicador", "Margem produtos", "", "Margem total", "Horas (cobradas / calculadas)"], align: ["", "", "", "r", "r", "r", "", "r", "r"], rows: r.piores.map(linha) }),
    method(`Todos os ${r.linhas.length} projetos`, table({ head: ["Nº", "Data", "Situação", "Total", "Multiplicador", "Margem produtos", "", "Margem total", "Horas (cobradas / calculadas)"], align: ["", "", "", "r", "r", "r", "", "r", "r"], rows: r.linhas.map(linha) })));
}

// ================================================================ ultimos orcamentos (analise detalhada)
const PROD_PESQUISA = 65;

/** Analise detalhada dos ultimos projetos (versoes do mesmo cliente contam uma vez) ou de um numero escolhido. */
function painelRecentes(orcamentos, p, params, simulado) {
  const recentes = projetos(orcamentos).slice(0, 4);
  const pedido = new URLSearchParams(location.hash.split("?")[1] ?? "").get("orc");
  const escolha = h("select", { class: "select", id: "dg-orc" }, h("option", { value: "" }, "Os 4 últimos projetos"),
    orcamentos.slice().sort((a, b) => String(b.numero).localeCompare(String(a.numero))).map((o) => h("option", { value: o.numero, selected: o.numero === pedido }, `${o.numero} · ${dataBR(o.data)} · ${o.cliente} · ${brl(o.total)}`)));
  const corpo = h("div", { class: "stack" });
  const canal = h("select", { class: "select", id: "dg-canal" }, p.canais.map((c) => h("option", { value: c.nome, selected: c.nome === p.canalPadrao }, `${c.nome} (${String(c.v).replace(".", ",")}%)`)));
  const base = { ...params, produtividade: p.produtividade, comissionamento: p.comissionamento, entregaHoras: p.entregaHoras, metrosPorPonto: p.metrosPorPonto };
  const produtividadeAlta = p.produtividade !== null && p.produtividade >= 90;
  function cartao(o) {
    const a = analisarOrcamento(o, base, p.tempos);
    const alt = produtividadeAlta ? analisarOrcamento(o, { ...base, produtividade: PROD_PESQUISA }, p.tempos) : null;
    const versoes = orcamentos.filter((x) => x.cliente === o.cliente && x.numero !== o.numero && Math.abs(new Date(x.data) - new Date(o.data)) <= 10 * 864e5).map((x) => x.numero);
    return h("article", { class: "panel panel-tight stack-s cfo-analise" },
      h("div", { class: "row" }, h("strong", null, `${a.numero} · ${a.cliente}`), h("span", { class: "field-hint" }, `${dataBR(a.data)} · ${brl(a.total)}`), versoes.length ? stamp(`+${versoes.length} versão(ões): ${versoes.join(", ")}`, "neutral") : null),
      h("div", { class: "cfo-stats" },
        stat("Produtos", brl(a.produtos.venda), a.produtos.multiplicador ? `${String(a.produtos.multiplicador).replace(".", ",")}× o custo · margem ${a.produtos.mc ? pct(a.produtos.mc.pct) : "—"}` : "sem custo cadastrado"),
        stat("Preço mínimo dos produtos (35%)", brl(a.produtos.precoMeta), a.produtos.precoMeta ? `diferença ${brl(a.produtos.venda - a.produtos.precoMeta)}` : "faltam dados"),
        stat("Mão de obra", brl(a.mo.valor), a.mo.horasCobradas ? `${a.mo.horasCobradas} h cobradas · ${brl(a.mo.porHora)}/h` : "sem horas no orçamento"),
        stat("Horas calculadas", `${String(a.mo.horasReais).replace(".", ",")} h`, `${String(a.mo.horasPadrao).replace(".", ",")} h de execução pelos seus tempos · produtividade ${pct(a.mo.premissas.produtividade)}${alt ? ` (com ${PROD_PESQUISA}%: ${String(alt.mo.horasReais).replace(".", ",")} h)` : ""}`),
        stat("Preço da hora (35%)", brl(a.mo.precoHoraMeta), a.mo.precoHoraMeta ? "pelo custo da hora do formulário" : "falta custo da hora"),
        stat("Margem do orçamento", a.mcTotal ? pct(a.mcTotal.pct) : "—", a.mcTotal ? `${FAIXA_TXT[faixa(a.mcTotal.pct)]}${simulado ? " · impostos simulados" : ""}` : "faltam dados")),
      a.pontos.length ? h("ul", { class: "stack-s cfo-pontos" }, a.pontos.map((x) => h("li", null, x))) : h("p", { class: "notice notice-ok" }, "Nenhum ponto de atenção."),
      tabelaCorrecao(o, base),
      h("div", { class: "row" }, h("a", { class: "btn btn-ghost", href: `#/diretores?setor=financas&pergunta=${encodeURIComponent(`Analise o orçamento ${o.numero}: veja os erros e refaça com os valores corretos.`)}` }, `Perguntar ao CFO sobre o ${o.numero}`)),
      a.produtos.abaixo.length ? method(`Produtos abaixo de 30% (${a.produtos.abaixo.length})`, ...a.produtos.abaixo.map((i) => `${i.nome}: cobrado ${brl(i.preco)}, custo ${brl(i.custo)}, margem ${i.mc === null ? "—" : pct(i.mc)} → preço mínimo ${brl(i.meta)}`)) : null,
      method("Como as horas foram calculadas", ...a.mo.linhas.map((l) => `${l.dispositivo}${l.tecnologia !== "na" ? ` (${l.tecnologia === "sem_fio" ? "sem fio" : "cabeado"})` : ""} × ${l.qtd}: ${l.minUnit} min cada (${l.atividades.join(" + ")})`),
        a.mo.premissas.cenas ? `Cenas: ${a.mo.premissas.cenas} (hipótese: uma por interruptor)` : null,
        `+ ${pct(a.mo.premissas.comissionamento)} de testes/comissionamento, + ${String(a.mo.premissas.entrega).replace(".", ",")} h de entrega, ÷ produtividade ${pct(a.mo.premissas.produtividade)}`,
        a.mo.metrosRede ? `Cabo de rede: ${a.mo.metrosRede} m ÷ ${p.metrosPorPonto} m por ponto` : null,
        a.mo.faltam.length ? `Sem tempo no catálogo: ${a.mo.faltam.map((f) => `${f.dispositivo} × ${f.qtd}`).join(", ")}` : null));
  }
  function desenhar() {
    base.v = (p.canais.find((c) => c.nome === canal.value) ?? { v: params.v }).v;
    const lista = escolha.value ? orcamentos.filter((o) => o.numero === escolha.value) : recentes;
    clear(corpo).append(...lista.map(cartao)); // append nativo: espalhar a lista
  }
  escolha.addEventListener("change", desenhar);
  canal.addEventListener("change", desenhar);
  desenhar();
  return panel({ title: "Últimos orçamentos: o que está certo e o que corrigir", subtitle: "CFO e COO: produto contra o preço mínimo da Política (com imposto, comissão e indicação) e horas cobradas contra as horas calculadas pelos equipamentos e pelos seus tempos de serviço." },
    produtividadeAlta ? h("p", { class: "notice notice-warn" }, `Você informou produtividade de ${pct(p.produtividade)}. Em obra, a pesquisa indica 60–75% (deslocamento, montagem, espera, retrabalho): mostro também o cálculo com ${PROD_PESQUISA}%.`) : null,
    h("div", { class: "form-grid" }, field(escolha.id, "Ver", escolha), field(canal.id, "Canal de venda deste orçamento", canal, "RT/indicação só quando houver; turn key e direto não pagam")), corpo);
}
