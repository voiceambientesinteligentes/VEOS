// Ferramentas do CFO: Calculadora de Precos e Negociacao ao Vivo. Calculo local, a cada
// digitacao, pela Politica V1 (MC com provisao de 2%, faixas 35/30/25, alcada de desconto,
// ticket como meta) e Simples Nacional (LC 123). Nada e gravado nem enviado daqui.
import { FONTE_POLITICA, FONTE_SIMPLES, aliquotaSimples, anexoPorFatorR, calculadora, negociacao, paraProposta } from "../../domain/precificacao.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, toScaled } from "../../domain/format.js";
import { clear, field, h, method, panel, stamp, stat } from "../dom.js";

const FAIXA = {
  VERDE: ["Verde · alvo de 35% atingido", "ok"],
  ACEITAVEL: ["Aceitável · entre 30% e 35%", "ok"],
  ATENCAO: ["Atenção · entre 25% e 30%: exige direção", "warn"],
  "NAO APROVADO": ["Não aprovado · abaixo de 25%", "risk"],
  "NAO RESOLVIDO": ["Não resolvido · faltam dados", "neutral"],
};
const ALCADA_TOM = { "FLUXO NORMAL": "ok", "AUTONOMIA COMERCIAL": "ok", "NAO RESOLVIDO": "neutral", DIRECAO: "warn", "EXCEPCIONAL - NOVA ANALISE INTEGRAL": "risk", EXTRAORDINARIA: "risk" };

// ---------------------------------------------------------------- utilitarios
const brl = (c) => (c === null || c === undefined ? "—" : formatBRL(`${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n}.${String((c < 0n ? -c : c) % 100n).padStart(2, "0")}`));
const pctH = (h_) => (h_ === null || h_ === undefined ? "—" : `${h_ < 0n ? "-" : ""}${(h_ < 0n ? -h_ : h_) / 100n},${String((h_ < 0n ? -h_ : h_) % 100n).padStart(2, "0")}%`);
const money = (raw) => { const v = parseMoneyInput(raw); return v === null ? null : toScaled(v, 2); };
const numero = (raw) => { const s = String(raw ?? "").trim().replace(/\./g, "").replace(",", "."); return /^\d{1,9}(\.\d{1,2})?$/.test(s) ? toScaled(s, 2) : null; };
const decimalBR = (v) => { const [i, f = "00"] = String(v).split("."); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${f.padEnd(2, "0")}`; };
const SITUACAO_ZOHO = { draft: "Rascunho", sent: "Enviado", accepted: "Aceito", declined: "Recusado", expired: "Expirado", invoiced: "Faturado" };
const situacaoZoho = (s) => SITUACAO_ZOHO[s] ?? s;
const dataBR = (iso) => iso.split("-").reverse().join("/");
const inp = (id, attrs = {}) => h("input", { class: "input num", id, type: "text", inputmode: "decimal", autocomplete: "off", ...attrs });
const sel = (id, opcoes, valor) => h("select", { class: "select", id }, opcoes.map(([v, t]) => h("option", { value: v, selected: v === valor }, t)));

// preferencia do proprio navegador (conveniencia; o calculo funciona sem ela)
const CHAVE = "veos.impostos";
function lerPref() { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch { return {}; } }
function gravarPref(p) { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem armazenamento: segue sem lembrar */ } }

/**
 * Painel de impostos do Simples Nacional. A receita dos ultimos 12 meses (RBT12) define a faixa;
 * quando o Zoho Books estiver conectado ela vem sozinha das faturas. Devolve { el, ler() }.
 */
function painelImpostos(aoMudar, fontes = null) {
  const pref = lerPref();
  const rbt = inp("imp-rbt12", { value: pref.rbt12 ?? "" });
  const folha = inp("imp-folha", { value: pref.folha ?? "" });
  const anexoServ = sel("imp-anexo-serv", [["auto", "Pelo Fator R (informe a folha)"], ["III", "Anexo III"], ["V", "Anexo V"]], pref.anexoServ ?? "III");
  const saida = h("div", { class: "stack-s", role: "status" });
  const origem = h("p", { class: "field-hint" }, fontes?.rbt12 ? "Buscando a receita dos 12 meses no Zoho Books…" : "Receita digitada.");
  const el = panel({ title: "Impostos · Simples Nacional", subtitle: "A alíquota efetiva sai da receita bruta dos últimos 12 meses (RBT12). Quando o Zoho Books estiver conectado, ela é puxada das faturas automaticamente." },
    h("div", { class: "form-grid" },
      field("imp-rbt12", "Receita bruta dos últimos 12 meses (R$)", rbt, "Vazio ou zero = empresa sem histórico: usa a 1ª faixa."),
      field("imp-anexo-serv", "Serviços (instalação, programação)", anexoServ, "Confirmar o anexo do CNAE com o contador."),
      field("imp-folha", "Folha dos últimos 12 meses (R$)", folha, "Só para o Fator R (≥ 28% → Anexo III).")),
    origem,
    saida,
    method("Fonte e método", FONTE_SIMPLES, "Alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12.", "Produtos (equipamentos) no Anexo I; serviços no Anexo III ou V conforme o Fator R. O DAS já inclui ICMS/ISS, PIS, COFINS, IRPJ, CSLL e CPP."));
  function ler() {
    const r = rbt.value.trim() ? money(rbt.value) : 0n;
    const f = folha.value.trim() ? money(folha.value) : null;
    gravarPref({ rbt12: rbt.value, folha: folha.value, anexoServ: anexoServ.value });
    clear(saida);
    if (r === null) { saida.append(h("p", { class: "field-error" }, "Receita dos 12 meses: informe um valor em reais.")); return null; }
    const anexoS = anexoServ.value === "auto" ? anexoPorFatorR(f, r) : anexoServ.value;
    if (!anexoS) { saida.append(h("p", { class: "field-error" }, "Para escolher pelo Fator R, informe a receita e a folha dos 12 meses.")); return null; }
    try {
      const produto = aliquotaSimples(r, "I"), servico = aliquotaSimples(r, anexoS);
      saida.append(h("div", { class: "row" },
        stamp(`Produtos: ${pctH(produto.efetivaH)} (Anexo I, ${produto.faixa}ª faixa)`, "live"),
        stamp(`Serviços: ${pctH(servico.efetivaH)} (Anexo ${anexoS}, ${servico.faixa}ª faixa)`, "live")));
      return { produto, servico };
    } catch (e) {
      saida.append(h("p", { class: "field-error" }, e.message));
      return null;
    }
  }
  for (const c of [rbt, folha, anexoServ]) c.addEventListener("input", aoMudar);
  rbt.addEventListener("input", () => { origem.textContent = "Receita digitada (substitui a do Zoho nesta tela)."; });
  if (fontes?.rbt12) {
    fontes.rbt12().then((r) => {
      if (!r.faturas) {
        origem.textContent = `O Zoho Books não tem faturas emitidas de ${dataBR(r.inicio)} a ${dataBR(r.fim)}: a receita dos 12 meses não pode vir de lá. Digite a receita bruta (ex.: do extrato do Simples/PGDAS).`;
        return;
      }
      rbt.value = decimalBR(r.valor);
      origem.textContent = `Automático: ${r.fonte}, ${r.faturas} faturas de ${dataBR(r.inicio)} a ${dataBR(r.fim)}.`;
      aoMudar();
    }).catch((e) => {
      origem.textContent = e.status === 409 ? "Zoho não conectado: digite a receita ou peça à direção para conectar em Integrações." : `Não deu para puxar do Zoho (${e.message}). Digite a receita.`;
    });
  }
  return { el, ler };
}

function resultadoMargem(r, extra = []) {
  const [rotulo, tom] = FAIXA[r.faixa];
  return [
    h("div", { class: "row" }, stamp(rotulo, tom), r.alcada ? stamp(`Alçada: ${r.alcada.nivel.toLowerCase()}`, ALCADA_TOM[r.alcada.nivel]) : null),
    h("div", { class: "form-grid" },
      ...extra,
      stat("Impostos (Simples)", brl(r.impostoTotal ?? r.impostoRs)),
      stat("Receita líquida", brl(r.rl)),
      stat("Custos diretos", brl(r.custos)),
      stat("Provisão de risco 2%", brl(r.risco)),
      stat("Margem de contribuição", brl(r.mc), pctH(r.pctH))),
    reguaMargem(r.pctH),
  ];
}

/** Regua 0-50% com as faixas da politica (25 / 30 / 35) e o ponteiro da margem. */
function reguaMargem(p) {
  const regua = h("div", { class: "regua-margem", role: "img", "aria-label": p === null ? "Margem não resolvida" : `Margem de ${pctH(p)} na régua da política: piso 25%, normal 30%, alvo 35%` },
    h("span", { class: "regua-zona regua-risco" }), h("span", { class: "regua-zona regua-atencao" }), h("span", { class: "regua-zona regua-aceitavel" }), h("span", { class: "regua-zona regua-verde" }),
    ["25%", "30%", "35%"].map((t, i) => h("span", { class: `regua-marca regua-marca-${i}` }, t)));
  if (p !== null) {
    const ponteiro = h("span", { class: "regua-ponteiro" });
    const pos = Number(p < 0n ? 0n : p > 5000n ? 5000n : p) / 50; // 0..100 (%)
    ponteiro.style.left = `${pos}%`;
    regua.append(ponteiro);
  }
  return regua;
}

const listaExigencias = (r) => h("ul", { class: "list-plain stack-s" },
  [...(r.pendencias ?? []).map((p) => h("li", { class: "field-error" }, p)),
   ...(r.alcada?.exigencias ?? []).map((x) => h("li", null, x)),
   r.ticket?.texto ? h("li", null, r.ticket.texto) : null]);

// ---------------------------------------------------------------- Calculadora
export function telaCalculadora(root) {
  const campos = {
    materiais: inp("calc-materiais"), horas: inp("calc-horas"), valorHora: inp("calc-hora"),
    rateio: inp("calc-rateio", { value: "0" }), alvo: inp("calc-alvo", { value: "35" }),
    tipo: sel("calc-tipo", [["servico", "Serviço (instalação, programação)"], ["produto", "Produto (equipamentos)"]], "servico"),
  };
  const saida = h("div", { class: "stack", "aria-live": "polite" });
  const impostos = painelImpostos(calcular);
  const restaurar = h("button", { class: "btn btn-ghost", type: "button" }, "Restaurar padrões");
  restaurar.addEventListener("click", () => { campos.rateio.value = "0"; campos.alvo.value = "35"; calcular(); });

  function calcular() {
    clear(saida);
    const erros = [];
    const v = (c, nome, fn = money) => { const t = c.value.trim(); if (!t) return 0n; const x = fn(t); if (x === null) erros.push(`${nome}: valor inválido.`); return x ?? 0n; };
    const entrada = { materiais: v(campos.materiais, "Materiais"), horas: v(campos.horas, "Horas", numero), valorHora: v(campos.valorHora, "Valor/hora"), rateioFixo: v(campos.rateio, "Rateio fixo", numero), alvo: v(campos.alvo, "Margem alvo", numero) };
    const imp = impostos.ler();
    if (!imp) erros.push("Defina os impostos do Simples acima.");
    if (erros.length) return saida.append(h("ul", { class: "list-plain" }, erros.map((e) => h("li", { class: "field-error" }, e))));
    try {
      const r = calculadora({ ...entrada, imposto: (campos.tipo.value === "produto" ? imp.produto : imp.servico).efetiva });
      if (r.pendencias.length) return saida.append(panel({ title: "Preço mínimo pela política" }, h("p", { class: "result-empty" }, r.pendencias[0])));
      saida.append(panel({ title: "Preço mínimo pela política", subtitle: `Menor preço em que a margem de contribuição chega a ${pctH(entrada.alvo)} depois do Simples e da provisão de risco de 2%.` },
        h("p", { class: "preco-destaque" }, brl(r.preco)),
        ...resultadoMargem(r, [stat("Custo total", brl(r.custo), `mão de obra ${brl(r.maoDeObra)}${r.fixo ? ` · fixo ${brl(r.fixo)}` : ""}`), stat("Markup sobre o custo", `${pctH(r.markupH).replace("%", "")}×`)]),
        entrada.alvo < 3000n ? h("p", { class: "notice notice-risk" }, "Alvo abaixo de 30%: a política exige autorização da direção (sec.9).") : null,
        method("Fórmula e fonte", "Preço = custo ÷ ((1 − alíquota) × (1 − 2% − margem alvo)).", "MC = receita líquida − custos diretos − 2% da receita líquida (V1 sec.4 e 6).", FONTE_POLITICA,
          "Rateio de custo fixo: não consta da Política V1 (a MC oficial não inclui custo fixo). Use só como folga, se quiser.")));
    } catch (e) {
      saida.append(h("p", { class: "field-error" }, e.message));
    }
  }
  for (const c of Object.values(campos)) c.addEventListener("input", calcular);
  root.append(
    h("div", { class: "split" },
      h("div", { class: "stack" },
        panel({ title: "Custos do projeto", subtitle: "O resultado atualiza a cada digitação.", actions: restaurar },
          h("div", { class: "form-grid" },
            field("calc-materiais", "Materiais e equipamentos (R$)", campos.materiais),
            field("calc-horas", "Horas de trabalho", campos.horas),
            field("calc-hora", "Valor da hora (R$)", campos.valorHora, "Custo da hora da equipe."),
            field("calc-tipo", "Imposto como", campos.tipo),
            field("calc-rateio", "Rateio de custo fixo (%)", campos.rateio, "Proposta: fora da Política V1."),
            field("calc-alvo", "Margem de contribuição alvo (%)", campos.alvo, "Política V1: alvo 35%, mínimo normal 30%."))),
        impostos.el),
      saida));
  calcular();
}

// ---------------------------------------------------------------- Negociacao ao Vivo
export function telaNegociacao(root, fontes = null) {
  const cliente = h("input", { class: "input", id: "neg-cliente", type: "text", autocomplete: "off" });
  const tabela = inp("neg-tabela");
  const referencia = h("input", { class: "input", id: "neg-ref", type: "text", autocomplete: "off", placeholder: "Ex.: EST-000123" });
  const condicao = h("input", { class: "input", id: "neg-condicao", type: "text", autocomplete: "off", placeholder: "Ex.: 30% na assinatura, 70% por fase" });
  const descModo = sel("neg-desc-modo", [["pct", "%"], ["rs", "R$"]], "pct");
  const descValor = inp("neg-desc", { value: "0" });
  const linhasCusto = h("tbody");
  const linhasExtra = h("tbody");
  const saida = h("div", { class: "stack", "aria-live": "polite" });
  const impostos = painelImpostos(calcular, fontes);
  const origem = h("p", { class: "field-hint" }, "Digitado na tela.");

  function linha(corpo, celulas) {
    const remover = h("button", { class: "btn btn-ghost", type: "button", "aria-label": "Remover linha" }, "×");
    const tr = h("tr", null, celulas.map((c) => h("td", null, c)), h("td", null, remover));
    remover.addEventListener("click", () => { tr.remove(); calcular(); });
    for (const c of celulas) if (c instanceof HTMLElement) c.addEventListener("input", calcular);
    corpo.append(tr);
  }
  const novoCusto = (d = {}) => linha(linhasCusto, [
    sel(null, [["produto", "Produto"], ["servico", "Serviço"]], d.tipo ?? "produto"),
    h("input", { class: "input", type: "text", "aria-label": "Descrição", autocomplete: "off", value: d.nome ?? "" }),
    inp(null, { value: d.qtd ?? "1", "aria-label": "Quantidade" }), inp(null, { "aria-label": "Custo unitário (R$)", value: d.custo ?? "" })]);
  const novoExtra = () => linha(linhasExtra, [
    h("input", { class: "input", type: "text", "aria-label": "Descrição", placeholder: "Ex.: comissão do arquiteto", autocomplete: "off" }),
    sel(null, [["pct", "% do negociado"], ["rs", "R$"]], "pct"), inp(null, { "aria-label": "Valor" })]);
  const botao = (texto, fn) => { const b = h("button", { class: "btn btn-ghost", type: "button" }, texto); b.addEventListener("click", () => { fn(); calcular(); }); return b; };

  // Importar orcamento do Zoho Books: cliente, preco, desconto e itens com preco de compra.
  function painelZoho() {
    const busca = h("input", { class: "input", id: "zoho-busca", type: "search", autocomplete: "off", placeholder: "Cliente, número ou referência" });
    const status = sel("zoho-status", [["", "Todos"], ["draft", "Rascunho"], ["sent", "Enviado"], ["accepted", "Aceito"], ["declined", "Recusado"], ["expired", "Expirado"]], "");
    const lista = h("div", { class: "zoho-lista", "aria-live": "polite" });
    const buscar = h("button", { class: "btn btn-ghost", type: "button" }, "Buscar");
    async function carregar() {
      buscar.disabled = true;
      clear(lista).append(h("p", { class: "muted" }, "Buscando no Zoho Books…"));
      try {
        const { orcamentos } = await fontes.orcamentos(busca.value.trim(), status.value);
        clear(lista).append(orcamentos.length
          ? h("ul", { class: "list-plain stack-s" }, orcamentos.map((o) => {
              const usar = h("button", { class: "btn btn-ghost", type: "button" }, "Usar");
              usar.addEventListener("click", () => importar(o.id, usar));
              return h("li", { class: "panel panel-tight row" }, h("div", { class: "stack-s" }, h("strong", null, `${o.numero} · ${o.cliente}`), h("span", { class: "field-hint" }, `${dataBR(o.data)} · ${o.total ? brl(money(o.total.replace(".", ","))) : "—"} · ${situacaoZoho(o.status)}`)), usar);
            }))
          : h("p", { class: "result-empty" }, "Nenhum orçamento encontrado."));
      } catch (e) {
        clear(lista).append(h("p", { class: "field-hint" }, e.status === 409 ? "Zoho não conectado. A direção conecta em Integrações." : `Não deu para ler o Zoho: ${e.message}`));
      } finally { buscar.disabled = false; }
    }
    async function importar(id, b) {
      b.disabled = true;
      try {
        const o = await fontes.orcamento(id);
        cliente.value = o.cliente ?? "";
        const sub = money((o.subtotal ?? o.total ?? "0").replace(".", ",")), tot = money((o.total ?? "0").replace(".", ","));
        tabela.value = decimalBR(o.subtotal ?? o.total ?? "0");
        referencia.value = o.numero ?? "";
        descModo.value = "rs";
        descValor.value = sub > tot ? brl(sub - tot).replace("R$", "").trim() : "0";
        clear(linhasCusto);
        for (const i of o.itens) novoCusto({ tipo: i.tipo, nome: i.nome, qtd: String(i.quantidade).replace(".", ","), custo: i.custo_unit ? decimalBR(i.custo_unit) : "" });
        origem.textContent = `Importado do Zoho Books: orçamento ${o.numero} (${situacaoZoho(o.status)}).${o.sem_custo ? ` Atenção: ${o.sem_custo} item(ns) sem preço de compra no Zoho — preencha para a margem ser calculada.` : ""}`;
        calcular();
      } catch (e) {
        origem.textContent = `Falha ao importar: ${e.message}`;
      } finally { b.disabled = false; }
    }
    buscar.addEventListener("click", carregar);
    busca.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); carregar(); } });
    return panel({ title: "Orçamentos do Zoho Books", subtitle: "Importa cliente, preço, desconto e itens com o preço de compra do cadastro. Nada é alterado no Zoho.", actions: buscar },
      h("div", { class: "form-grid" }, field("zoho-busca", "Buscar", busca), field("zoho-status", "Situação", status)), lista);
  }

  function botaoSalvar(r) {
    if (!fontes?.salvarProposta) return null;
    const out = h("div", { class: "stack-s", role: "status" });
    const b = h("button", { class: "btn btn-primary", type: "button" }, "Salvar como proposta no Comercial");
    b.addEventListener("click", async () => {
      clear(out);
      let reg;
      try { reg = paraProposta(r, { cliente: cliente.value, referencia: referencia.value, condicao: condicao.value }); } catch (e) { return out.append(h("p", { class: "field-error" }, e.message)); }
      b.disabled = true;
      try {
        const res = await fontes.salvarProposta(reg);
        const al = res.alertas_do_registro ?? [];
        out.append(h("p", { class: "notice notice-ok" }, `Proposta salva no Comercial (${reg.estado === "aguardando_direcao" ? "aguardando a direção" : "rascunho"}). `, h("a", { href: "#/setor/vendas/registros" }, "Abrir no Comercial")),
          al.length ? h("ul", { class: "list-plain stack-s" }, al.map((a) => h("li", null, stamp(a.severidade, a.severidade === "CRITICO" || a.severidade === "ALTO" ? "risk" : "warn"), " ", h("strong", null, a.titulo), h("p", { class: "field-hint" }, a.mensagem)))) : null,
          reg.estado === "aguardando_direcao" ? h("p", { class: "field-hint" }, "O Radar avisa a direção: a alçada desta proposta exige aprovação.") : null);
      } catch (e) {
        b.disabled = false;
        out.append(h("p", { class: "field-error" }, `Não foi possível salvar: ${e.message}`));
      }
    });
    return h("div", { class: "stack-s" }, h("div", { class: "row" }, b), out);
  }

  function calcular() {
    clear(saida);
    const erros = [];
    const tab = money(tabela.value);
    if (tabela.value.trim() && tab === null) erros.push("Preço de tabela inválido.");
    const dv = descValor.value.trim() ? (descModo.value === "pct" ? numero(descValor.value) : money(descValor.value)) : 0n;
    if (dv === null) erros.push("Desconto inválido.");
    if (descModo.value === "pct" && dv > 10000n) erros.push("Desconto acima de 100%.");
    const semCusto = [];
    const custos = [...linhasCusto.rows].map((tr, i) => {
      const [tipo, desc, qtd, unit] = tr.querySelectorAll("select, input");
      if (!unit.value.trim()) { if (desc.value.trim()) semCusto.push(desc.value.trim()); return null; }
      const q = numero(qtd.value), u = money(unit.value);
      if (q === null || u === null) { erros.push(`Custo ${i + 1}: quantidade ou valor inválido.`); return null; }
      return { tipo: tipo.value, total: (q * u + 50n) / 100n };
    }).filter(Boolean);
    const extras = [...linhasExtra.rows].map((tr, i) => {
      const [, modo, valor] = tr.querySelectorAll("select, input");
      const v = valor.value.trim() ? (modo.value === "pct" ? numero(valor.value) : money(valor.value)) : 0n;
      if (v === null) { erros.push(`Custo adicional ${i + 1}: valor inválido.`); return null; }
      return { modo: modo.value, valor: v };
    }).filter(Boolean);
    const imp = impostos.ler();
    if (erros.length) return saida.append(h("ul", { class: "list-plain" }, erros.map((e) => h("li", { class: "field-error" }, e))));
    if (!tab) return saida.append(panel({ title: "Status de viabilidade" }, h("p", { class: "result-empty" }, "Informe o preço de tabela para começar.")));
    try {
      if (semCusto.length) {
        return saida.append(panel({ title: "Status de viabilidade" }, stamp(FAIXA["NAO RESOLVIDO"][0], "neutral"),
          h("p", { class: "field-error" }, `${semCusto.length} item(ns) sem custo: ${semCusto.slice(0, 5).join(", ")}${semCusto.length > 5 ? "…" : ""}. Preencha o custo ou remova a linha; sem isso a margem ficaria inflada.`)));
      }
      const r = negociacao({ tabela: tab, desconto: { modo: descModo.value, valor: dv }, custos, extras, impostos: imp ? { produto: imp.produto.efetiva, servico: imp.servico.efetiva } : null });
      saida.append(panel({ title: "Status de viabilidade", subtitle: cliente.value.trim() ? `Cliente: ${cliente.value.trim()}` : "Cliente não informado" },
        ...resultadoMargem(r, [
          stat("Preço de tabela", brl(r.tabela)),
          stat("Desconto", brl(r.descontoRs), pctH(r.descPctH)),
          stat("Preço negociado", brl(r.liquido)),
          stat("Custos adicionais", brl(r.custoExtras), "% sobre o preço já com desconto")]),
        listaExigencias(r),
        botaoSalvar(r),
        method("Fórmulas e fonte",
          "Preço negociado = tabela − desconto. Custo adicional em % incide sobre o preço negociado.",
          "Receita de produtos e de serviços é rateada pela participação de cada um no custo direto; cada parte paga a alíquota do seu anexo.",
          "MC = receita líquida − custos (diretos + adicionais) − 2% da receita líquida.", FONTE_POLITICA, FONTE_SIMPLES)));
    } catch (e) {
      saida.append(h("p", { class: "field-error" }, e.message));
    }
  }
  for (const c of [cliente, tabela, descModo, descValor]) c.addEventListener("input", calcular);
  novoCusto();
  for (const c of [cliente, tabela, descValor]) c.addEventListener("input", () => { if (origem.textContent.startsWith("Importado")) origem.textContent = "Importado do Zoho e ajustado na tela."; });
  root.append(
    h("div", { class: "split" },
      h("div", { class: "stack" },
        fontes?.orcamentos ? painelZoho() : null,
        panel({ title: "Dados da negociação" },
          origem,
          h("div", { class: "form-grid" },
            field("neg-cliente", "Cliente", cliente),
            field("neg-tabela", "Preço de tabela (R$)", tabela),
            field("neg-desc-modo", "Desconto em", descModo),
            field("neg-desc", "Desconto", descValor, "Política V1: até 2% com MC ≥ 32% é autonomia comercial; acima disso, direção."),
            field("neg-ref", "Referência da oportunidade", referencia, "Número do orçamento ou da oportunidade."),
            field("neg-condicao", "Condição de pagamento", condicao))),
        panel({ title: "Custos de compra e execução", subtitle: "Custo direto de cada item (sem imposto de venda).", actions: botao("+ Custo", () => novoCusto()) },
          h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, h("tr", null, ["Tipo", "Descrição", "Qtd", "Custo unit. (R$)", ""].map((t) => h("th", { scope: "col" }, t)))), linhasCusto))),
        panel({ title: "Custos adicionais", subtitle: "Comissões, frete, deslocamento. Em %, incide sobre o preço já com desconto.", actions: botao("+ Adicional", novoExtra) },
          h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", null, h("tr", null, ["Descrição", "Modo", "Valor", ""].map((t) => h("th", { scope: "col" }, t)))), linhasExtra))),
        impostos.el),
      saida));
  calcular();
}
