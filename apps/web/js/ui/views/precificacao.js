// Ferramentas do CFO: Negociacao ao Vivo e Calculadora de Precos. Calculo local, a cada digitacao.
// Impostos com nota conforme a tela validada pela direcao (editaveis; regime a confirmar), overhead de 20% sobre o
// custo direto, margem antes dos impostos e com nota (como a tela validada pela direcao), mais a
// conferencia da Politica V1 (MC oficial com provisao de 2%, faixas e alcada de desconto).
// Destinos: "Salvar como proposta" (Comercial) e "Fechar negociacao" (vira pedido no fluxo:
// estoque, parcelas, NF e caixa). Nada e enviado ao cliente daqui.
import { FONTE_POLITICA, FONTE_SIMPLES, IMPOSTOS_PADRAO, OVERHEAD_PADRAO, SIMPLES_ATE, aliquotaSimples, calculadora, negociacao, paraProposta, somaAliquotas } from "../../domain/precificacao.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, toScaled } from "../../domain/format.js";
import { clear, field, h, method, panel, stamp, stat } from "../dom.js";
import { renderConsulta } from "./biblioteca.js";
import { api } from "../../data/api.js";
import { parametros } from "../../domain/formulario_cfo.js";
import { condicaoSugerida } from "../../domain/condicao.js";

const FAIXA = {
  VERDE: ["Política V1: verde · MC ≥ 35%", "ok"],
  ACEITAVEL: ["Política V1: aceitável · MC 30–35%", "ok"],
  ATENCAO: ["Política V1: atenção · MC 25–30%, exige direção", "warn"],
  "NAO APROVADO": ["Política V1: não aprovado · MC < 25%", "risk"],
  "NAO RESOLVIDO": ["Política V1: não resolvido · faltam dados", "neutral"],
};
const ALCADA_TOM = { "FLUXO NORMAL": "ok", "AUTONOMIA COMERCIAL": "ok", "NAO RESOLVIDO": "neutral", DIRECAO: "warn", "EXCEPCIONAL - NOVA ANALISE INTEGRAL": "risk", EXTRAORDINARIA: "risk" };

// ---------------------------------------------------------------- utilitarios
const brl = (c) => (c === null || c === undefined ? "—" : formatBRL(`${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n}.${String((c < 0n ? -c : c) % 100n).padStart(2, "0")}`));
const pctH = (h_) => (h_ === null || h_ === undefined ? "—" : `${h_ < 0n ? "-" : ""}${(h_ < 0n ? -h_ : h_) / 100n},${String((h_ < 0n ? -h_ : h_) % 100n).padStart(2, "0")}%`);
const money = (raw) => { const v = parseMoneyInput(raw); return v === null ? null : toScaled(v, 2); };
const numero = (raw) => { const s = String(raw ?? "").trim().replace(/\./g, "").replace(",", "."); return /^\d{1,9}(\.\d{1,3})?$/.test(s) ? toScaled(s, 2) : null; };
const decimalBR = (v) => { const [i, f = "00"] = String(v).split("."); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${f.padEnd(2, "0").slice(0, 2)}`; };
const fixo2 = (c) => `${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n}.${String((c < 0n ? -c : c) % 100n).padStart(2, "0")}`;
const SITUACAO_ZOHO = { draft: "Rascunho", sent: "Enviado", accepted: "Aceito", declined: "Recusado", expired: "Expirado", invoiced: "Faturado" };
const situacaoZoho = (s) => SITUACAO_ZOHO[s] ?? s;
const dataBR = (iso) => String(iso ?? "").split("-").reverse().join("/");
const inp = (id, attrs = {}) => h("input", { class: "input num", id, type: "text", inputmode: "decimal", autocomplete: "off", ...attrs });
const sel = (id, opcoes, valor) => h("select", { class: "select", id }, opcoes.map(([v, t]) => h("option", { value: v, selected: v === valor }, t)));
const botao = (texto, tom = "ghost", attrs = {}) => h("button", { class: `btn btn-${tom}`, type: "button", ...attrs }, texto);

// ---------------------------------------------------------------- impostos (com nota), editaveis
// Lista por bloco em centesimos de ponto; guardada no proprio navegador (conveniencia).
const CHAVE_IMP = "veos.impostos.v2";
function lerImpostos() {
  try {
    const x = JSON.parse(localStorage.getItem(CHAVE_IMP) || "null");
    if (x?.produto && x?.servico) return { produto: x.produto.map(([n, v]) => [n, BigInt(v)]), servico: x.servico.map(([n, v]) => [n, BigInt(v)]) };
  } catch { /* usa o padrao */ }
  return { produto: IMPOSTOS_PADRAO.produto.map((x) => [...x]), servico: IMPOSTOS_PADRAO.servico.map((x) => [...x]) };
}
function gravarImpostos(t) {
  try { localStorage.setItem(CHAVE_IMP, JSON.stringify({ produto: t.produto.map(([n, v]) => [n, String(v)]), servico: t.servico.map(([n, v]) => [n, String(v)]) })); } catch { /* sem armazenamento */ }
}

/** Bloco de impostos de um tipo de nota: chips com as aliquotas e edicao inline (editar, remover, adicionar). */
function blocoImpostos(tabela, chave, titulo, aoMudar) {
  const el = h("div", { class: `imp-bloco imp-${chave}` });
  let editando = false;
  function desenhar(base, valor) {
    const soma = somaAliquotas(tabela[chave]);
    const alternar = botao(editando ? "Concluir" : "Editar", "ghost", { class: "btn btn-ghost btn-mini" });
    alternar.addEventListener("click", () => { editando = !editando; desenhar(base, valor); });
    clear(el).append(
      h("div", { class: "row imp-cabeca" }, h("strong", null, titulo), h("span", { class: "field-hint" }, `base ${brl(base)}`), h("span", { class: "imp-total" }, `${pctH(soma.num)} = ${brl(valor)}`), alternar),
      editando
        ? h("div", { class: "stack-s" },
            tabela[chave].map(([nome, v], i) => {
              const n = h("input", { class: "input", value: nome, "aria-label": "Imposto" });
              const a = inp(null, { value: pctH(v).replace("%", ""), "aria-label": `Alíquota ${nome} (%)` });
              const rem = botao("×", "ghost", { "aria-label": `Remover ${nome}` });
              n.addEventListener("input", () => { tabela[chave][i][0] = n.value.trim() || "Imposto"; gravarImpostos(tabela); });
              a.addEventListener("input", () => { const x = numero(a.value); if (x !== null && x <= 10000n) { tabela[chave][i][1] = x; gravarImpostos(tabela); aoMudar(); } });
              rem.addEventListener("click", () => { tabela[chave].splice(i, 1); gravarImpostos(tabela); aoMudar(); });
              return h("div", { class: "row imp-linha" }, n, a, h("span", { class: "field-hint" }, "%"), rem);
            }),
            (() => { const b = botao("+ Imposto"); b.addEventListener("click", () => { tabela[chave].push(["Novo", 0n]); gravarImpostos(tabela); aoMudar(); }); return b; })())
        : h("div", { class: "row imp-chips" }, tabela[chave].map(([nome, v]) => h("span", { class: "imp-chip" }, `${nome} ${pctH(v)}`))));
  }
  /** No Simples: um so imposto (DAS) com a aliquota efetiva da faixa; sem edicao manual. */
  function simples(base, valor, aliq) {
    clear(el).append(h("div", { class: "row imp-cabeca" }, h("strong", null, titulo), h("span", { class: "field-hint" }, `base ${brl(base)}`), h("span", { class: "imp-total" }, `${pctH((aliq.num * 100n + aliq.den / 2n) / aliq.den)} = ${brl(valor)}`)),
      h("div", { class: "row imp-chips" }, h("span", { class: "imp-chip" }, "Simples Nacional (DAS)")));
  }
  return { el, desenhar, simples };
}

// ---------------------------------------------------------------- regime pela data do faturamento
// Ate SIMPLES_ATE: Simples Nacional (produtos Anexo I; servicos no anexo escolhido), faixa pela soma
// dos orcamentos aceitos e faturados dos ultimos 12 meses. Depois: aliquotas da tela validada (editaveis).
const CHAVE_ANEXO = "veos.simples.anexo_servicos";
const lerAnexo = () => { try { return localStorage.getItem(CHAVE_ANEXO) || ""; } catch { return ""; } };
function painelRegime(fontes, aoMudar) {
  const data = h("input", { class: "input", id: "reg-data", type: "date", value: new Date().toISOString().slice(0, 10) });
  const rbt = inp("reg-rbt");
  const anexo = sel("reg-anexo", [["", "Escolha (confirme com o contador)"], ["III", "Anexo III"], ["IV", "Anexo IV (instalação; INSS fora do DAS)"], ["V", "Anexo V"]], lerAnexo());
  const origemRbt = h("p", { class: "field-hint" }, fontes?.rbt12 ? "Buscando no Zoho Books…" : "Informe a receita dos 12 meses.");
  const info = h("div", { class: "stack-s", role: "status" });
  const el = h("div", { class: "stack-s regime" },
    h("strong", null, "Regime tributário"),
    h("p", { class: "field-hint" }, `Pela data prevista do faturamento: Simples Nacional até ${dataBR(SIMPLES_ATE)} (exclusão registrada na Receita); depois, as alíquotas da tela validada.`),
    h("div", { class: "form-grid" }, field("reg-data", "Faturamento previsto em", data), field("reg-rbt", "Base da faixa: últimos 12 meses (R$)", rbt, "Soma dos orçamentos aceitos e faturados no Zoho Books."), field("reg-anexo", "Serviços no Simples", anexo, "CNAE principal na Receita: 4321-5/00 (instalação elétrica).")),
    origemRbt, info,
    method("Fonte", "CNPJ 12.323.599/0001-83 (VOICE AUTOMACAO LTDA): optante pelo Simples desde 01/01/2024, exclusão em 31/12/2026 — dados abertos da Receita (minhareceita.org), consulta de 01/10/2026.", FONTE_SIMPLES, "Base da faixa: orientação do fundador (01/10/2026), em análise na Biblioteca."));
  for (const c of [data, rbt]) c.addEventListener("input", aoMudar);
  anexo.addEventListener("change", () => { try { localStorage.setItem(CHAVE_ANEXO, anexo.value); } catch { /* ok */ } aoMudar(); });
  rbt.addEventListener("input", () => { origemRbt.textContent = "Valor digitado (substitui o do Zoho nesta tela)."; });
  if (fontes?.rbt12) fontes.rbt12().then((r) => {
    rbt.value = decimalBR(r.valor);
    origemRbt.textContent = `Automático: ${r.quantidade} orçamento(s) aceitos/faturados de ${dataBR(r.inicio)} a ${dataBR(r.fim)}. No ano de ${r.ano}: ${brl(money(decimalBR(r.ano_valor)))}.`;
    aoMudar();
  }).catch((e) => { origemRbt.textContent = `Não deu para ler do Zoho (${e.message}). Digite a receita dos 12 meses.`; });
  /** Devolve { modo, produto, servico } (Razao %) ou { erro }. */
  function ler(temServico, blocos) {
    clear(info);
    const pos = data.value && data.value > SIMPLES_ATE;
    if (pos) { info.append(stamp("Após o Simples: alíquotas da tela validada (editáveis abaixo)", "warn")); return { modo: "pos", produto: somaAliquotas(blocos.produto), servico: somaAliquotas(blocos.servico) }; }
    const base = rbt.value.trim() ? money(rbt.value) : 0n;
    if (base === null) return { erro: "Receita dos 12 meses inválida." };
    try {
      const prod = aliquotaSimples(base, "I");
      let serv = null;
      if (anexo.value) serv = aliquotaSimples(base, anexo.value);
      else if (temServico) return { erro: "Escolha o anexo do Simples para os serviços (confirme com o contador)." };
      info.append(h("div", { class: "row" }, stamp(`Produtos: ${pctH(prod.efetivaH)} (Anexo I, ${prod.faixa}ª faixa)`, "live"), serv ? stamp(`Serviços: ${pctH(serv.efetivaH)} (Anexo ${anexo.value}, ${serv.faixa}ª faixa)`, "live") : null));
      if (prod.faixa > 1) info.append(h("p", { class: "notice notice-warn" }, `A receita dos 12 meses já está na ${prod.faixa}ª faixa do Simples: a alíquota subiu.`));
      return { modo: "simples", produto: prod.efetiva, servico: serv ? serv.efetiva : { num: 0n, den: 1n } };
    } catch (e) { return { erro: e.message }; }
  }
  return { el, ler };
}

// ---------------------------------------------------------------- Negociacao ao Vivo
export function telaNegociacao(root, fontes = null) {
  const impostos = lerImpostos();
  const cliente = h("input", { class: "input", id: "neg-cliente", type: "text", autocomplete: "off" });
  const tabela = inp("neg-tabela");
  const referencia = h("input", { class: "input", id: "neg-ref", type: "text", autocomplete: "off", placeholder: "Ex.: EST-000123" });
  const condicao = h("input", { class: "input", id: "neg-condicao", type: "text", autocomplete: "off", placeholder: "Ex.: 30% na assinatura, 70% por fase" });
  const descModo = h("div", { class: "segmented", role: "radiogroup", "aria-label": "Desconto em" });
  let modoDesc = "pct";
  for (const [v, t] of [["pct", "%"], ["rs", "R$"]]) {
    const r = h("input", { type: "radio", name: "neg-desc-modo", value: v, checked: v === "pct" });
    r.addEventListener("change", () => { modoDesc = v; calcular(); });
    descModo.append(h("label", null, r, t));
  }
  const descValor = inp("neg-desc", { placeholder: "Ex.: 5" });
  const overhead = inp("neg-overhead", { value: pctH(OVERHEAD_PADRAO).replace("%", "") });
  const linhasCusto = h("tbody"), linhasExtra = h("tbody");
  const origem = h("p", { class: "field-hint" }, "Escolha um orçamento à esquerda ou preencha à mão.");
  const status = h("div", { class: "stack", "aria-live": "polite" });
  const resumoCustos = h("div", { class: "stack-s" });
  const acoes = h("div", { class: "stack-s" });
  const blocoProd = blocoImpostos(impostos, "produto", "Produtos (NF-e)", () => calcular());
  const blocoServ = blocoImpostos(impostos, "servico", "Serviços / mão de obra (NFS-e)", () => calcular());
  const regime = painelRegime(fontes, () => calcular());
  let orcamento = null; // { zoho_id, numero, cliente_zoho_id }
  let ultimo = null;    // ultimo calculo valido (para os botoes)

  // linhas de custo: tipo, descricao, qtd (fixa quando vem do orcamento), custo total da linha
  function novoCusto(d = {}) {
    const tipo = sel(null, [["produto", "Prod"], ["servico", "Serv"]], d.tipo ?? "produto");
    const desc = h("input", { class: "input", type: "text", "aria-label": "Descrição", autocomplete: "off", value: d.nome ?? "" });
    const qtd = inp(null, { value: d.qtd ?? "1", "aria-label": "Quantidade", readonly: Boolean(d.fixo) });
    const total = inp(null, { "aria-label": "Custo total da linha (R$)", value: d.total ?? "" });
    const rem = botao("×", "ghost", { "aria-label": "Remover linha" });
    const tr = h("tr", null, [tipo, desc, qtd, total, rem].map((c) => h("td", null, c)));
    tr.dados = { item_id: d.item_id ?? null, preco_unit: d.preco_unit ?? "0" };
    rem.addEventListener("click", () => { tr.remove(); calcular(); });
    for (const c of [tipo, desc, qtd, total]) c.addEventListener("input", calcular);
    linhasCusto.append(tr);
  }
  function novoExtra(d = {}) {
    const desc = h("input", { class: "input", type: "text", "aria-label": "Descrição", placeholder: "Ex.: RT do arquiteto, comissão, frete", autocomplete: "off", value: d.descricao ?? "" });
    const modo = sel(null, [["pct", "% do negociado"], ["rs", "R$"]], d.modo ?? "pct");
    const valor = inp(null, { "aria-label": "Valor", value: d.valor ?? "" });
    const rem = botao("×", "ghost", { "aria-label": "Remover custo adicional" });
    const tr = h("tr", null, [desc, modo, valor, rem].map((c) => h("td", null, c)));
    if (d.canal) tr.dataset.canal = "1";
    rem.addEventListener("click", () => { tr.remove(); calcular(); });
    for (const c of [desc, modo, valor]) c.addEventListener("input", calcular);
    linhasExtra.append(tr);
  }

  // Canal de venda (formulario do CFO, secao 7): lanca comissao e RT/indicacao como custos adicionais.
  const canal = h("select", { class: "select", id: "neg-canal" }, h("option", { value: "" }, "Sem canal (lançar à mão)"));
  let canais = [], pFormulario = null;
  api.cfoFormulario().then(({ respostas }) => {
    pFormulario = parametros(respostas);
    canais = pFormulario.canais;
    for (const c of canais) canal.append(h("option", { value: c.nome }, `${c.nome} · comissão ${String(c.comissao).replace(".", ",")}% + RT ${String(c.rt).replace(".", ",")}%`));
  }).catch(() => { /* sem acesso ao formulario: canal manual */ });
  canal.addEventListener("change", () => {
    for (const tr of [...linhasExtra.rows]) if (tr.dataset.canal) tr.remove();
    const c = canais.find((x) => x.nome === canal.value);
    if (c) {
      if (c.comissao) novoExtra({ descricao: `Comissão de vendedor (${c.nome})`, valor: String(c.comissao).replace(".", ","), canal: true });
      if (c.rt) novoExtra({ descricao: `RT / indicação (${c.nome})`, valor: String(c.rt).replace(".", ","), canal: true });
      if (c.outros) novoExtra({ descricao: `Outros custos de venda (${c.nome})`, valor: String(c.outros).replace(".", ","), canal: true });
    }
    calcular();
  });

  // Condicao de pagamento sugerida pelo CFO: sinal que cobre o material, etapas, validade e dolar do dia.
  const sugerir = botao("Condição sugerida pelo CFO", "ghost", { class: "btn btn-ghost btn-mini" });
  sugerir.addEventListener("click", async () => {
    // usa o ultimo calculo valido; sem ele, os custos de produto das linhas e o preco informado
    const linhas = lerLinhas([]);
    const custoProd = ultimo ? Number(ultimo.r.custoProduto) / 100 : linhas.custos.filter((x) => x.tipo === "produto").reduce((a, x) => a + Number(x.total) / 100, 0);
    const totalNeg = ultimo ? Number(ultimo.r.liquido) / 100 : Number(money(tabela.value) ?? 0n) / 100;
    if (!(totalNeg > 0)) { condicao.placeholder = "Informe o preço ou escolha um orçamento primeiro."; return; }
    let ptax = null;
    try { const cb = await api.cfoCambio(); ptax = cb.serie?.length ? cb.serie[cb.serie.length - 1] : null; } catch { /* sem cotacao */ }
    const canalSel = canais.find((x) => x.nome === canal.value) ?? canais.find((x) => x.padrao) ?? null;
    const naAssinatura = canalSel && (pFormulario?.quandoPagaRt ?? "assinatura") === "assinatura" ? (totalNeg * (canalSel.rt + canalSel.comissao)) / 100 : 0;
    const c = condicaoSugerida({ custoProdutos: custoProd, total: totalNeg, entradaMinima: pFormulario?.entradaPct ?? 40, validadeDias: pFormulario?.validadeDias ?? 7, ptax, pagoNaAssinatura: naAssinatura });
    condicao.value = c.texto;
    calcular();
  });

  function lerLinhas(erros) {
    const semCusto = [];
    const custos = [], itensPedido = [];
    [...linhasCusto.rows].forEach((tr, i) => {
      const [tipo, desc, qtd, total] = tr.querySelectorAll("select, input");
      const q = numero(qtd.value);
      if (q === null || q <= 0n) { erros.push(`Custo ${i + 1}: quantidade inválida.`); return; }
      if (!total.value.trim()) { if (desc.value.trim()) semCusto.push(desc.value.trim()); return; }
      const t = money(total.value);
      if (t === null) { erros.push(`Custo ${i + 1}: valor inválido.`); return; }
      custos.push({ tipo: tipo.value, total: t });
      itensPedido.push({ item_id: tr.dados.item_id, nome: desc.value.trim() || "Item", tipo: tipo.value, quantidade: String(Number(q) / 100), preco_unit: tr.dados.preco_unit, custo_unit: (Number(t) / 100 / (Number(q) / 100)).toFixed(4) });
    });
    const extras = [...linhasExtra.rows].map((tr, i) => {
      const [desc, modo, valor] = tr.querySelectorAll("select, input");
      const v = valor.value.trim() ? (modo.value === "pct" ? numero(valor.value) : money(valor.value)) : 0n;
      if (v === null) { erros.push(`Custo adicional ${i + 1}: valor inválido.`); return null; }
      return { descricao: desc.value.trim(), modo: modo.value, valor: v };
    }).filter(Boolean);
    return { custos, extras, semCusto, itensPedido };
  }

  function calcular() {
    ultimo = null;
    clear(status); clear(resumoCustos); clear(acoes);
    const erros = [];
    const tab = tabela.value.trim() ? money(tabela.value) : null;
    if (tabela.value.trim() && tab === null) erros.push("Preço de venda inválido.");
    const dv = descValor.value.trim() ? (modoDesc === "pct" ? numero(descValor.value) : money(descValor.value)) : 0n;
    if (dv === null) erros.push("Desconto inválido.");
    if (modoDesc === "pct" && dv > 10000n) erros.push("Desconto acima de 100%.");
    const ov = numero(overhead.value);
    if (ov === null) erros.push("Overhead inválido.");
    const { custos, extras, semCusto, itensPedido } = lerLinhas(erros);
    const reg = regime.ler(custos.some((c) => c.tipo === "servico"), impostos);
    if (reg.erro) erros.push(reg.erro);
    const impostosCalc = reg.erro ? null : { produto: reg.produto, servico: reg.servico };
    if (erros.length) { blocoProd.desenhar(0n, 0n); blocoServ.desenhar(0n, 0n); return status.append(panel({ title: "Status de viabilidade" }, h("ul", { class: "list-plain" }, erros.map((e) => h("li", { class: "field-error" }, e))))); }
    let r = null;
    try { r = negociacao({ tabela: tab ?? 0n, desconto: { modo: modoDesc, valor: dv }, custos, extras, impostos: impostosCalc, overhead: ov }); } catch (e) { return status.append(panel({ title: "Status de viabilidade" }, h("p", { class: "field-error" }, e.message))); }
    const imp = (base, a) => (base === null ? 0n : (base * a.num * 100n / a.den + 5000n) / 10000n);
    if (reg.modo === "pos") { blocoProd.desenhar(r.receitaProduto ?? 0n, imp(r.receitaProduto, impostosCalc.produto)); blocoServ.desenhar(r.receitaServico ?? 0n, imp(r.receitaServico, impostosCalc.servico)); }
    else { blocoProd.simples(r.receitaProduto ?? 0n, imp(r.receitaProduto, impostosCalc.produto), impostosCalc.produto); blocoServ.simples(r.receitaServico ?? 0n, imp(r.receitaServico, impostosCalc.servico), impostosCalc.servico); }
    // resumo dos custos (painel de custos de compra)
    resumoCustos.append(h("dl", { class: "zoho-grade custos-resumo" },
      h("div", { class: "zoho-campo" }, h("dt", null, `Produtos NF-e (${custos.filter((c) => c.tipo === "produto").length})`), h("dd", null, brl(r.custoProduto))),
      h("div", { class: "zoho-campo" }, h("dt", null, `Serviços NFS-e (${custos.filter((c) => c.tipo === "servico").length})`), h("dd", null, brl(r.custoServico))),
      h("div", { class: "zoho-campo" }, h("dt", null, "Custo direto total"), h("dd", null, brl(r.custoDireto))),
      h("div", { class: "zoho-campo" }, h("dt", null, `Overhead (${pctH(r.overheadH)})`), h("dd", null, brl(r.custoOverhead))),
      r.custoExtras ? h("div", { class: "zoho-campo" }, h("dt", null, "Custos adicionais"), h("dd", null, brl(r.custoExtras))) : null,
      h("div", { class: "zoho-campo" }, h("dt", null, "Custo total com overhead"), h("dd", null, h("strong", null, brl(r.custoTotal))))));
    if (!tab) return status.append(panel({ title: "Status de viabilidade" }, h("p", { class: "result-empty" }, "Escolha um orçamento ou informe o preço de venda.")));
    if (semCusto.length) {
      return status.append(panel({ title: "Status de viabilidade" }, stamp("Não resolvido · faltam custos", "neutral"),
        h("p", { class: "field-error" }, `${semCusto.length} item(ns) sem custo: ${semCusto.slice(0, 5).join(", ")}${semCusto.length > 5 ? "…" : ""}. Preencha o custo total da linha ou remova; sem isso a margem ficaria inflada.`)));
    }
    ultimo = { r, itensPedido };
    const [rot, tom] = FAIXA[r.faixa];
    status.append(panel({ title: "Status de viabilidade", subtitle: cliente.value.trim() ? `Cliente: ${cliente.value.trim()}` : "Cliente não informado" },
      h("div", { class: "form-grid" }, stat("Preço de tabela", brl(r.tabela)), stat("Preço negociado", brl(r.liquido), r.descontoRs ? `desconto ${brl(r.descontoRs)} (${pctH(r.descPctH)})` : "sem desconto")),
      h("div", { class: "grid-2 cenarios" },
        h("div", { class: "panel panel-tight cenario" }, h("span", { class: "stat-label" }, "Antes dos impostos"),
          h("dl", { class: "cenario-linhas" }, h("dt", null, "Margem"), h("dd", null, pctH(r.antesImpostos.margemH)), h("dt", null, "Lucro"), h("dd", null, brl(r.antesImpostos.lucro)), h("dt", null, "Impostos"), h("dd", null, brl(0n)))),
        h("div", { class: "panel panel-tight cenario cenario-nota" }, h("span", { class: "stat-label" }, `Com nota · ${pctH(r.comNota.taxaH)}`),
          h("dl", { class: "cenario-linhas" }, h("dt", null, "Margem"), h("dd", null, pctH(r.comNota.margemH)), h("dt", null, "Lucro"), h("dd", null, brl(r.comNota.lucro)), h("dt", null, "Impostos"), h("dd", null, `−${brl(r.comNota.impostos)}`)))),
      h("div", { class: "row" }, stamp(rot, tom), stamp(`Alçada: ${r.alcada.nivel.toLowerCase()}`, ALCADA_TOM[r.alcada.nivel])),
      h("ul", { class: "list-plain stack-s" },
        r.alcada.exigencias.map((x) => h("li", null, x)),
        r.ticket.texto ? h("li", null, r.ticket.texto) : null,
        h("li", { class: "field-hint" }, `MC oficial (Política V1): ${brl(r.mc)} = ${pctH(r.pctH)} · receita líquida ${brl(r.rl)} − custos diretos e adicionais ${brl(r.custos)} − provisão de risco 2% ${brl(r.risco)} (sem overhead).`)),
      method("Fórmulas e fonte",
        "Preço negociado = tabela − desconto. Custo adicional em % incide sobre o preço negociado.",
        "Overhead = custo direto × %. Custo total = direto + overhead + adicionais.",
        "Impostos: a receita é rateada entre produtos e serviços pela participação de cada um no custo direto; cada parte paga as alíquotas do seu bloco (NF-e ou NFS-e).",
        "Margem antes dos impostos = (negociado − custo total) ÷ negociado. Com nota = (negociado − custo total − impostos) ÷ negociado.",
        `Conferência: ${FONTE_POLITICA}.`, "Impostos: Simples Nacional (DAS pela faixa da receita dos 12 meses) até 31/12/2026; depois, as alíquotas da tela validada (editáveis).")));
    montarAcoes(r);
  }

  // Precedentes (Biblioteca): consultados antes de salvar proposta ou fechar pedido.
  const termosPrecedentes = (r) => ["desconto", "margem", "ticket", "negociação", "proposta", r.descontoRs > 0n ? "alçada" : "", r.comNota.impostos !== null ? "imposto" : ""].filter(Boolean).join(" OR ");
  async function consultarPrecedentes(r, referencia, alvo) {
    if (!fontes?.consultarPrecedentes) return null;
    const c = await fontes.consultarPrecedentes({ termos: termosPrecedentes(r), setor: "vendas", contexto: "negociacao", referencia });
    if (alvo) renderConsulta(alvo, c);
    return c;
  }

  function montarAcoes(r) {
    const saida = h("div", { role: "status" });
    const precedentes = h("div", { class: "stack-s precedentes", "aria-live": "polite" });
    const verPrec = botao("Consultar precedentes (Biblioteca)");
    verPrec.addEventListener("click", async () => { verPrec.disabled = true; clear(precedentes).append(h("p", { class: "muted" }, "Consultando…")); try { await consultarPrecedentes(r, null, precedentes); } catch (e) { clear(precedentes).append(h("p", { class: "field-error" }, e.message)); } finally { verPrec.disabled = false; } });
    const proposta = botao("Salvar como proposta no Comercial");
    proposta.addEventListener("click", async () => {
      clear(saida);
      let reg;
      try { reg = paraProposta(r, { cliente: cliente.value, referencia: referencia.value, condicao: condicao.value }); } catch (e) { return saida.append(h("p", { class: "field-error" }, e.message)); }
      proposta.disabled = true;
      try {
        const antes = await consultarPrecedentes(r, null, precedentes).catch(() => null);
        if (antes?.conflitos?.length && !confirm("Há conflito entre precedentes (veja abaixo). Salvar a proposta mesmo assim? O conflito deve ir à autoridade competente.")) { proposta.disabled = false; return; }
        const res = await fontes.salvarProposta(reg);
        if (res?.id) await consultarPrecedentes(r, `proposta:${res.id}`).catch(() => null);
        const al = res.alertas_do_registro ?? [];
        saida.append(h("p", { class: "notice notice-ok" }, `Proposta salva no Comercial (${reg.estado === "aguardando_direcao" ? "aguardando a direção" : "rascunho"}). `, h("a", { href: "#/setor/vendas/registros" }, "Abrir no Comercial")),
          al.length ? h("ul", { class: "list-plain stack-s" }, al.map((a) => h("li", null, h("strong", null, a.titulo), h("p", { class: "field-hint" }, a.mensagem)))) : null);
      } catch (e) { proposta.disabled = false; saida.append(h("p", { class: "field-error" }, `Não foi possível salvar: ${e.message}`)); }
    });
    const fechar = botao("Fechar negociação e lançar no fluxo de caixa", "primary");
    fechar.addEventListener("click", async () => {
      clear(saida);
      if (!cliente.value.trim()) return saida.append(h("p", { class: "field-error" }, "Informe o cliente."));
      if (!ultimo?.itensPedido.length) return saida.append(h("p", { class: "field-error" }, "Inclua os itens (custos de compra) do pedido."));
      if (!confirm(`Criar o pedido de ${cliente.value.trim()} por ${brl(r.liquido)}? Em seguida você define as parcelas, que entram na previsão de caixa.`)) return;
      fechar.disabled = true;
      try {
        const antes = await consultarPrecedentes(r, null, precedentes).catch(() => null);
        if (antes?.conflitos?.length && !confirm("Há conflito entre precedentes (veja abaixo). Criar o pedido mesmo assim? O conflito deve ir à autoridade competente.")) { fechar.disabled = false; return; }
        const aplicaveis = (antes?.considerados ?? []).filter((x) => x.aplicavel).map((x) => x.codigo);
        const res = await fontes.criarPedido({ negociacao: {
          cliente: cliente.value.trim(), cliente_zoho_id: orcamento?.cliente_zoho_id ?? null, orcamento_zoho_id: orcamento?.zoho_id ?? null, orcamento_numero: referencia.value.trim() || orcamento?.numero || null,
          valor_total: fixo2(r.liquido), condicao: condicao.value.trim() || null, itens: ultimo.itensPedido,
          ...(() => { const c = canais.find((x) => x.nome === canal.value); return c ? { rt_pct: c.rt, comissao_pct: c.comissao } : {}; })(),
          resumo: { precedentes: aplicaveis, consulta: antes?.consulta_id ?? null, tabela: fixo2(r.tabela), desconto: fixo2(r.descontoRs), impostos: r.comNota.impostos === null ? null : fixo2(r.comNota.impostos), custo_total: fixo2(r.custoTotal), margem_com_nota: pctH(r.comNota.margemH), mc_politica: pctH(r.pctH), alcada: r.alcada.nivel },
        } });
        await consultarPrecedentes(r, `pedido:${res.id}`).catch(() => null);
        location.hash = `#/pedidos/${res.id}`;
      } catch (e) { fechar.disabled = false; saida.append(h("p", { class: "field-error" }, `Não foi possível criar o pedido: ${e.message}`)); }
    });
    if (fontes?.salvarProposta || fontes?.criarPedido) acoes.append(
      panel({ title: "Precedentes", subtitle: "Antes de salvar ou fechar, o VEOS consulta a Biblioteca (decisões, políticas e aprendizados que valem para o Comercial). Busca por regras, não IA. Precedente orienta; não autoriza." },
        h("div", { class: "row" }, verPrec), precedentes),
      h("div", { class: "row" }, fontes.salvarProposta ? proposta : null, fontes.criarPedido ? fechar : null), saida);
  }

  // lista de orcamentos do Zoho (esquerda), carregada ao abrir
  function painelOrcamentos() {
    const busca = h("input", { class: "input", id: "zoho-busca", type: "search", autocomplete: "off", placeholder: "Buscar por cliente ou número" });
    const situacao = sel("zoho-status", [["", "Todos os status"], ["draft", "Rascunho"], ["sent", "Enviado"], ["accepted", "Aceito"], ["declined", "Recusado"], ["expired", "Expirado"]], "");
    const atualizar = botao("↻", "ghost", { "aria-label": "Atualizar lista", title: "Atualizar" });
    const lista = h("div", { class: "zoho-lista orc-lista", "aria-live": "polite" });
    const somar = h("input", { type: "checkbox", id: "neg-somar" });
    const combinados = new Map(); // zoho_id -> orcamento importado (projeto pedido em partes)
    somar.addEventListener("change", () => { if (!somar.checked) combinados.clear(); });
    let t;
    async function carregar() {
      clear(lista).append(h("p", { class: "muted" }, "Carregando orçamentos do Zoho Books…"));
      try {
        const { orcamentos } = await fontes.orcamentos(busca.value.trim(), situacao.value);
        clear(lista).append(h("p", { class: "field-hint" }, `${orcamentos.length} orçamento(s)`),
          orcamentos.length ? h("ul", { class: "list-plain orc-itens" }, orcamentos.map((o) => {
            const b = h("button", { class: `orc-item${orcamento?.zoho_id === o.id ? " ativo" : ""}`, type: "button" },
              h("span", { class: "orc-nome" }, o.cliente), h("span", { class: "orc-valor num" }, o.total ? brl(money(o.total.replace(".", ","))) : "—"),
              h("span", { class: "field-hint" }, `${o.numero} · ${dataBR(o.data)}`), stamp(situacaoZoho(o.status), o.status === "accepted" ? "ok" : o.status === "declined" ? "risk" : "neutral"));
            b.addEventListener("click", () => importar(o.id, b));
            return h("li", null, b);
          })) : h("p", { class: "result-empty" }, "Nenhum orçamento encontrado."));
      } catch (e) {
        clear(lista).append(h("p", { class: "field-hint" }, e.status === 409 ? "Zoho não conectado. A direção conecta em Integrações." : `Não deu para ler o Zoho: ${e.message}`));
      }
    }
    function reconstruir() {
      const os = [...combinados.values()];
      clear(linhasCusto);
      if (!os.length) { origem.textContent = "Escolha os orçamentos à esquerda para somar."; tabela.value = ""; descValor.value = ""; calcular(); return; }
      const somaDe = (k) => os.reduce((a, o) => a + (money(decimalBR(o[k] ?? o.total ?? "0")) ?? 0n), 0n);
      const sub = somaDe("subtotal"), tot = somaDe("total");
      orcamento = { zoho_id: os[0].id, numero: os.map((o) => o.numero).join(" + "), cliente_zoho_id: os[0].cliente_id ?? null };
      cliente.value = os[0].cliente ?? "";
      tabela.value = decimalBR(fixo2(sub));
      referencia.value = os.map((o) => o.numero).join(" + ");
      if (sub > tot) { descValor.value = decimalBR(fixo2(sub - tot)); modoDesc = "rs"; descModo.querySelector('input[value="rs"]').checked = true; } else { descValor.value = ""; }
      for (const o of os) for (const i of o.itens) {
        const q = Number(i.quantidade || 1);
        novoCusto({ tipo: i.tipo, nome: `${i.nome} (${o.numero})`, item_id: i.item_id ?? null, fixo: true, qtd: String(i.quantidade).replace(".", ","), total: i.custo_unit ? decimalBR((Number(i.custo_unit) * q).toFixed(2)) : "", preco_unit: i.venda_unit ?? "0" });
      }
      origem.textContent = `Somando ${os.length} orçamento(s): ${os.map((o) => o.numero).join(", ")}. Preço global = soma dos ativos; o cliente pediu em partes, a negociação é do conjunto.`;
      calcular();
    }
    async function importar(id, b) {
      if (somar.checked) {
        b.disabled = true;
        try {
          if (combinados.has(id)) combinados.delete(id); else combinados.set(id, await fontes.orcamento(id));
          b.classList.toggle("ativo", combinados.has(id));
          reconstruir();
        } catch (e) { origem.textContent = `Falha ao importar: ${e.message}`; } finally { b.disabled = false; }
        return;
      }
      b.disabled = true;
      try {
        const o = await fontes.orcamento(id);
        orcamento = { zoho_id: o.id, numero: o.numero, cliente_zoho_id: o.cliente_id ?? null };
        cliente.value = o.cliente ?? "";
        tabela.value = decimalBR(o.subtotal ?? o.total ?? "0");
        referencia.value = o.numero ?? "";
        const sub = money(decimalBR(o.subtotal ?? o.total ?? "0")), tot = money(decimalBR(o.total ?? "0"));
        if (sub > tot) { descValor.value = decimalBR(fixo2(sub - tot)); modoDesc = "rs"; descModo.querySelector('input[value="rs"]').checked = true; } else { descValor.value = ""; }
        clear(linhasCusto);
        for (const i of o.itens) {
          const q = Number(i.quantidade || 1);
          novoCusto({ tipo: i.tipo, nome: i.nome, item_id: i.item_id ?? null, fixo: true, qtd: String(i.quantidade).replace(".", ","), total: i.custo_unit ? decimalBR((Number(i.custo_unit) * q).toFixed(2)) : "", preco_unit: i.venda_unit ?? "0" });
        }
        origem.textContent = `Importado do Zoho Books: ${o.numero} (${situacaoZoho(o.status)}).${o.sem_custo ? ` Atenção: ${o.sem_custo} item(ns) sem preço de compra no cadastro — preencha o custo.` : ""}`;
        calcular();
        for (const x of lista.querySelectorAll(".orc-item")) x.classList.toggle("ativo", x === b);
      } catch (e) { origem.textContent = `Falha ao importar: ${e.message}`; } finally { b.disabled = false; }
    }
    busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(carregar, 350); });
    situacao.addEventListener("change", carregar);
    atualizar.addEventListener("click", carregar);
    carregar();
    return panel({ title: "Orçamentos e estimativas", subtitle: "Zoho Books. Ao escolher, cliente, preço e itens com o custo de compra do cadastro entram na negociação. Nada é alterado no Zoho." },
      h("div", { class: "row orc-filtros" }, busca, situacao, atualizar),
      h("label", { class: "row field-hint", for: "neg-somar" }, somar, "Somar vários orçamentos (projeto pedido em partes): clique para incluir ou tirar"), lista);
  }

  const limpar = botao("Limpar tudo");
  limpar.addEventListener("click", () => {
    orcamento = null; clear(linhasCusto); clear(linhasExtra);
    for (const c of [cliente, tabela, referencia, condicao, descValor]) c.value = "";
    origem.textContent = "Escolha um orçamento à esquerda ou preencha à mão.";
    novoCusto(); calcular();
  });
  const addCusto = botao("+ Adicionar"); addCusto.addEventListener("click", () => { novoCusto(); calcular(); });
  const addExtra = botao("+ Adicionar"); addExtra.addEventListener("click", () => { novoExtra(); calcular(); });
  const restaurarImp = botao("Restaurar alíquotas padrão");
  restaurarImp.addEventListener("click", () => { const p = { produto: IMPOSTOS_PADRAO.produto.map((x) => [...x]), servico: IMPOSTOS_PADRAO.servico.map((x) => [...x]) }; impostos.produto = p.produto; impostos.servico = p.servico; gravarImpostos(impostos); calcular(); });
  for (const c of [cliente, tabela, descValor, overhead]) c.addEventListener("input", calcular);
  novoCusto();

  root.append(h("div", { class: "negociacao" },
    fontes?.orcamentos ? h("div", { class: "negociacao-esq" }, painelOrcamentos()) : null,
    h("div", { class: "stack negociacao-dir" },
      status,
      panel({ title: "Dados da negociação" }, origem,
        h("div", { class: "form-grid" },
          field("neg-cliente", "Cliente", cliente), field("neg-tabela", "Preço de venda (R$) — total do orçamento", tabela),
          field("neg-ref", "Referência (orçamento)", referencia), field("neg-condicao", "Condição de pagamento", condicao, sugerir), field("neg-canal", "Canal de venda", canal, "Lança comissão e RT/indicação do canal como custos adicionais."))),
      panel({ title: "Ajustes financeiros", subtitle: "Desconto concedido, impostos com nota e custos adicionais (RT, comissão, frete)." },
        h("div", { class: "form-grid" }, h("div", { class: "field" }, h("span", { class: "field-label" }, "Desconto em"), descModo), field("neg-desc", "Desconto", descValor, "Política V1: até 2% com MC ≥ 32% é autonomia comercial; acima disso, direção.")),
        regime.el,
        h("div", { class: "stack-s" }, h("div", { class: "row" }, h("strong", null, "Impostos (com nota)"), restaurarImp), blocoProd.el, blocoServ.el),
        h("div", { class: "stack-s" }, h("div", { class: "row" }, h("strong", null, "Custos adicionais"), addExtra),
          h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, h("tr", null, ["Descrição", "Modo", "Valor", ""].map((x) => h("th", { scope: "col" }, x)))), linhasExtra)),
          h("p", { class: "field-hint" }, "Em %, incide sobre o preço já com desconto."))),
      panel({ title: "Custos de compra dos produtos", subtitle: "Custo total de cada linha (preço de compra do cadastro × quantidade). Quantidade vem do orçamento.", actions: addCusto },
        h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, h("tr", null, ["Tipo", "Descrição", "Qtd", "Custo total (R$)", ""].map((x) => h("th", { scope: "col" }, x)))), linhasCusto)),
        h("div", { class: "form-grid" }, field("neg-overhead", "Overhead sobre o custo direto (%)", overhead)),
        resumoCustos, h("div", { class: "row" }, limpar)),
      acoes)));
  calcular();
}

// ---------------------------------------------------------------- Calculadora
export function telaCalculadora(root, fontes = null) {
  const impostos = lerImpostos();
  const campos = {
    materiais: inp("calc-materiais"), horas: inp("calc-horas"), valorHora: inp("calc-hora"),
    rateio: inp("calc-rateio", { value: pctH(OVERHEAD_PADRAO).replace("%", "") }), alvo: inp("calc-alvo", { value: "35" }),
    tipo: sel("calc-tipo", [["produto", "Produto (NF-e)"], ["servico", "Serviço (NFS-e)"]], "produto"),
  };
  const saida = h("div", { class: "stack", "aria-live": "polite" });
  const regime = painelRegime(fontes, () => calcular());
  const restaurar = botao("Restaurar padrões");
  restaurar.addEventListener("click", () => { campos.rateio.value = pctH(OVERHEAD_PADRAO).replace("%", ""); campos.alvo.value = "35"; calcular(); });
  function calcular() {
    clear(saida);
    const erros = [];
    const v = (c, nome, fn = money) => { const t = c.value.trim(); if (!t) return 0n; const x = fn(t); if (x === null) erros.push(`${nome}: valor inválido.`); return x ?? 0n; };
    const entrada = { materiais: v(campos.materiais, "Materiais"), horas: v(campos.horas, "Horas", numero), valorHora: v(campos.valorHora, "Valor/hora"), rateioFixo: v(campos.rateio, "Overhead", numero), alvo: v(campos.alvo, "Margem alvo", numero) };
    if (erros.length) return saida.append(h("ul", { class: "list-plain" }, erros.map((e) => h("li", { class: "field-error" }, e))));
    const reg = regime.ler(campos.tipo.value === "servico", impostos);
    if (reg.erro) return saida.append(h("p", { class: "field-error" }, reg.erro));
    const aliq = campos.tipo.value === "produto" ? reg.produto : reg.servico;
    try {
      const r = calculadora({ ...entrada, imposto: aliq });
      if (r.pendencias.length) return saida.append(panel({ title: "Preço mínimo pela política" }, h("p", { class: "result-empty" }, r.pendencias[0])));
      saida.append(panel({ title: "Preço mínimo pela política", subtitle: `Menor preço em que a margem de contribuição chega a ${pctH(entrada.alvo)} depois dos impostos com nota (${pctH((aliq.num * 100n + aliq.den / 2n) / aliq.den)}) e da provisão de risco de 2%.` },
        h("p", { class: "preco-destaque" }, brl(r.preco)),
        h("div", { class: "form-grid" },
          stat("Custo total", brl(r.custo), `mão de obra ${brl(r.maoDeObra)}${r.fixo ? ` · overhead ${brl(r.fixo)}` : ""}`), stat("Markup sobre o custo", `${pctH(r.markupH).replace("%", "")}×`),
          stat("Impostos com nota", brl(r.impostoRs), reg.modo === "simples" ? "Simples Nacional (DAS)" : "alíquotas da tela validada"), stat("Receita líquida", brl(r.rl)), stat("Provisão de risco 2%", brl(r.risco)), stat("Margem de contribuição", brl(r.mc), pctH(r.pctH))),
        h("div", { class: "row" }, stamp(FAIXA[r.faixa][0], FAIXA[r.faixa][1])),
        entrada.alvo < 3000n ? h("p", { class: "notice notice-risk" }, "Alvo abaixo de 30%: a política exige autorização da direção (sec.9).") : null,
        method("Fórmula e fonte", "Preço = custo ÷ ((1 − alíquota) × (1 − 2% − margem alvo)).", "Custo = materiais + mão de obra + overhead.", FONTE_POLITICA, "Regime e alíquotas: os mesmos da Negociação ao Vivo.")));
    } catch (e) { saida.append(h("p", { class: "field-error" }, e.message)); }
  }
  for (const c of Object.values(campos)) c.addEventListener("input", calcular);
  root.append(h("div", { class: "split" },
    panel({ title: "Custos do projeto", subtitle: "O resultado atualiza a cada digitação.", actions: restaurar },
      h("div", { class: "form-grid" },
        field("calc-materiais", "Materiais e equipamentos (R$)", campos.materiais), field("calc-horas", "Horas de trabalho", campos.horas),
        field("calc-hora", "Valor da hora (R$)", campos.valorHora, "Custo da hora da equipe."), field("calc-tipo", "Nota fiscal", campos.tipo),
        field("calc-rateio", "Overhead (%)", campos.rateio, "Mesmo padrão da Negociação ao Vivo."), field("calc-alvo", "Margem de contribuição alvo (%)", campos.alvo, "Política V1: alvo 35%, mínimo normal 30%.")),
      regime.el),
    saida));
  calcular();
}
