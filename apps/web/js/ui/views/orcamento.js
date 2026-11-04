// ORCAMENTOS do VEOS, do zero ao pedido:
//   #/orcamentos               lista (situacao, validade, proximo passo) + "Retomar do Zoho"
//   #/orcamentos/novo[?cliente=|?zoho=]   montador: cliente, ambientes, produtos do catalogo com foto,
//                              mao de obra, desconto, condicao; margem e alcada ao vivo (Politica V1)
//   #/orcamentos/:id           ficha: itens, conferencia, versoes, historico e as acoes do ciclo
//                              (PDF, enviado, aceito -> pedido, recusado, nova versao)
// Custo e margem nunca vao para o cliente (o PDF e outra tela). Nada e enviado sozinho.
import { api } from "../../data/api.js";
import { impostosSimulados, diagnosticoParams } from "../../domain/cfo_cenarios.js";
import { formatarTelefone } from "../../domain/clientes.js";
import { condicaoSugerida } from "../../domain/condicao.js";
import { parametros } from "../../domain/formulario_cfo.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { AMBIENTES_SUGERIDOS, analise, linhasDosItens, paraSalvar, precoDoProduto, precoHora, proximoPasso, SERVICOS, SITUACOES, totais, totalLinha, errosOrcamento } from "../../domain/orcamento.js";
import { composicao } from "../../domain/tempos.js";
import { clear, errorNotice, field, h, method, panel, stamp, stat, table } from "../dom.js";
import { formularioCliente } from "./clientes.js";

const brl = (v) => (v === null || v === undefined ? "—" : formatBRL(String(Number(v).toFixed(2))));
const pct = (v) => (v === null || v === undefined ? "—" : `${String(Math.round(v * 10) / 10).replace(".", ",")}%`);
const n = (v) => { const s = String(v ?? "").trim().replace(/R\$|\s/g, ""); if (!s) return null; const x = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s); return Number.isFinite(x) ? x : null; };
const br = (v) => (v === null || v === undefined || v === "" ? "" : String(Math.round(Number(v) * 100) / 100).replace(".", ","));
const FAIXA_TOM = { VERDE: "ok", ACEITAVEL: "ok", ATENCAO: "warn", "NAO APROVADO": "risk", "NAO RESOLVIDO": "neutral" };
const FAIXA_TXT = { VERDE: "Verde (≥ 35%)", ACEITAVEL: "Aceitável (30–35%)", ATENCAO: "Atenção (25–30%)", "NAO APROVADO": "Não aprovado (< 25%)", "NAO RESOLVIDO": "Margem não resolvida" };
const ALCADA_TOM = { "FLUXO NORMAL": "ok", "AUTONOMIA COMERCIAL": "ok", DIRECAO: "warn", "NAO RESOLVIDO": "neutral", "EXCEPCIONAL - NOVA ANALISE INTEGRAL": "risk", EXTRAORDINARIA: "risk" };
const hojeMais = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
const situacao = (e) => stamp(...(SITUACOES[e] ?? [e, "neutral"]));

// ---------------------------------------------------------------- contexto de preco (CFO)
/** Impostos, comissao, custo-hora e custo real dos produtos. Sem acesso (vendas): so o que o catalogo mostra. */
async function contextoPreco() {
  const ctx = { p: null, imp: null, v: 0, rotulo: "LACUNA", texto: null, custoHora: null, cfo: null, validadeDias: 7, entradaPct: 40, canais: [], tempos: [], metrosPorPonto: 25 };
  try {
    const [{ respostas }, orc] = await Promise.all([api.cfoFormulario(), api.cfoOrcamentos().catch(() => ({ rbt12: null }))]);
    const p = parametros(respostas);
    const dp = diagnosticoParams(p, impostosSimulados(orc.rbt12) ?? impostosSimulados({ valor: 0 }));
    Object.assign(ctx, { p, imp: { produto: dp.params.tProduto, servico: dp.params.tServico }, v: p.v ?? 0, rotulo: dp.rotulo, texto: dp.texto, custoHora: p.hora?.custoHora ?? null,
      validadeDias: p.validadeDias ?? 7, entradaPct: p.entradaPct ?? 40, canais: p.canais ?? [], tempos: p.tempos ?? [], metrosPorPonto: p.metrosPorPonto ?? 25 });
    const [{ produtos }, cb] = await Promise.all([api.cfoProdutos(), api.cfoCambio().catch(() => ({ serie: [] }))]);
    const ptax = cb.serie?.length ? cb.serie[cb.serie.length - 1] : null;
    ctx.cfo = { produtos, p, serie: cb.serie ?? [], cambio: ptax ? Math.round(ptax.venda * (1 + (p.margemCambial ?? 0) / 100) * 10000) / 10000 : null, tProduto: ctx.imp.produto, v: ctx.v, ptax };
  } catch { /* perfil sem acesso ao CFO: preco de tabela e custo do catalogo */ }
  return ctx;
}

// ---------------------------------------------------------------- lista
export async function telaOrcamentos(root, aba = "veos") {
  const abas = h("div", { class: "segmented", role: "tablist" });
  const corpo = h("div", { class: "stack" });
  for (const [id, t] of [["veos", "Orçamentos do VEOS"], ["zoho", "Retomar do Zoho"]]) {
    const b = h("button", { class: `btn ${id === aba ? "btn-primary" : "btn-ghost"}`, type: "button", role: "tab", "aria-selected": String(id === aba), dataset: { aba: id } }, t);
    b.addEventListener("click", () => { location.hash = id === "veos" ? "#/orcamentos" : "#/orcamentos?aba=zoho"; });
    abas.append(b);
  }
  root.append(h("div", { class: "row" }, h("a", { class: "btn btn-primary", href: "#/orcamentos/novo" }, "+ Novo orçamento"), abas), corpo);
  if (aba === "zoho") return listaZoho(corpo);
  const estado = h("select", { class: "select", id: "orc-estado", "aria-label": "Situação" }, h("option", { value: "" }, "Todas (vigentes)"), Object.entries(SITUACOES).filter(([k]) => k !== "substituido").map(([k, [t]]) => h("option", { value: k }, t)));
  const busca = h("input", { class: "input", type: "search", id: "orc-busca", placeholder: "Cliente ou número", "aria-label": "Buscar orçamento" });
  estado.value = new URLSearchParams(location.hash.split("?")[1] ?? "").get("estado") ?? "";
  const lista = h("div", { "aria-live": "polite" });
  let t;
  async function desenhar() {
    clear(lista).append(h("p", { class: "muted" }, "Carregando…"));
    try {
      const { orcamentos } = await api.comercialOrcamentos(busca.value.trim(), estado.value);
      const soma = (f) => orcamentos.filter(f).reduce((a, o) => a + Number(o.valor_total), 0);
      clear(lista).append(
        h("div", { class: "cfo-stats" }, stat("Em aberto", String(orcamentos.filter((o) => ["rascunho", "enviado"].includes(o.estado)).length), brl(soma((o) => ["rascunho", "enviado"].includes(o.estado)))),
          stat("Aceitos", String(orcamentos.filter((o) => o.estado === "aceito").length), brl(soma((o) => o.estado === "aceito"))),
          stat("Recusados", String(orcamentos.filter((o) => o.estado === "recusado").length), "registre o motivo: é o aprendizado")),
        orcamentos.length
          ? table({ head: ["Número", "Cliente", "Situação", "Valor", "Validade", "Próximo passo"], align: ["", "", "", "r", "", ""],
            rows: orcamentos.map((o) => [h("a", { href: `#/orcamentos/${o.id}` }, `${o.numero} v${o.versao}`), o.cliente_id ? h("a", { href: `#/clientes/${o.cliente_id}` }, o.cliente_nome) : o.cliente_nome, situacao(o.estado), brl(o.valor_total), o.validade ? formatDate(o.validade) : "—", proximoPasso(o)]) })
          : h("p", { class: "result-empty" }, "Nenhum orçamento ainda. Clique em \"+ Novo orçamento\" ou retome um antigo do Zoho."));
    } catch (e) { clear(lista).append(errorNotice(e.message)); }
  }
  estado.addEventListener("change", desenhar);
  busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(desenhar, 300); });
  corpo.append(panel({ title: "Orçamentos", subtitle: "Do rascunho ao pedido. Cada nova versão substitui a anterior; o histórico fica guardado.", actions: h("div", { class: "row" }, busca, estado) }, lista));
  await desenhar();
}

async function listaZoho(corpo) {
  const busca = h("input", { class: "input", type: "search", id: "orz-busca", placeholder: "Cliente ou número", "aria-label": "Buscar orçamento antigo" });
  const lista = h("div", { "aria-live": "polite" });
  const ROT = { draft: "Rascunho", sent: "Enviado", expired: "Expirado", declined: "Recusado" };
  let t;
  async function desenhar() {
    clear(lista).append(h("p", { class: "muted" }, "Carregando orçamentos antigos…"));
    try {
      const { orcamentos } = await api.retomarLista(busca.value.trim());
      clear(lista).append(orcamentos.length ? table({ caption: `${orcamentos.length} orçamento(s) que não fecharam`, head: ["Orçamento", "Cliente", "Data", "Situação no Zoho", "Valor", ""], align: ["", "", "", "", "r", ""],
        rows: orcamentos.map((o) => [o.numero, o.cliente, o.data ? formatDate(o.data) : "—", ROT[o.status] ?? o.status, brl(o.total),
          o.retomado ? h("span", { class: "field-hint" }, `retomado: ${o.retomado.numero}`) : h("a", { class: "btn btn-ghost btn-mini", href: `#/orcamentos/novo?zoho=${o.zoho_id}` }, "Retomar")]) })
        : h("p", { class: "result-empty" }, "Nenhum orçamento antigo em aberto no espelho do Zoho."));
    } catch (e) { clear(lista).append(errorNotice(e.message)); }
  }
  busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(desenhar, 300); });
  corpo.append(panel({ title: "Retomar orçamentos antigos do Zoho", subtitle: "Rascunhos, enviados, expirados e recusados. Retomar cria o cliente no VEOS e um orçamento novo com os itens ligados ao catálogo e o preço recalculado.", actions: busca },
    h("p", { class: "field-hint" }, "Antes de retomar: confirme com o cliente se o projeto ainda está de pé. Preço antigo aparece ao lado do novo para você conversar."), lista));
  await desenhar();
}

// ---------------------------------------------------------------- montador
export async function telaNovoOrcamento(root, { clienteId = null, zohoId = null, editarId = null } = {}) {
  const carregando = h("p", { class: "muted" }, "Carregando preços, custos e impostos do CFO…");
  root.append(carregando);
  const ctx = await contextoPreco();
  carregando.remove();
  let cliente = null, substitui = null, referencia = null;
  let linhas = [];
  let observacaoInicial = "";
  let condicaoInicial = "", validadeInicial = hojeMais(ctx.validadeDias || 7), prazoInicial = "";
  const avisos = h("div", { class: "stack-s" });

  if (editarId) {
    const d = await api.comercialOrcamento(editarId);
    substitui = d.orcamento.id;
    linhas = linhasDosItens(d.itens);
    cliente = d.cliente ? { ...d.cliente } : { id: null, nome: d.orcamento.cliente_nome };
    referencia = d.orcamento.referencia;
    observacaoInicial = d.orcamento.observacao ?? ""; condicaoInicial = d.orcamento.condicao ?? ""; prazoInicial = d.orcamento.prazo_execucao ?? "";
    avisos.append(h("p", { class: "notice" }, `Nova versão de ${d.orcamento.numero} (v${d.orcamento.versao}). Ao salvar, a versão anterior fica guardada como "substituída".`));
  } else if (zohoId) {
    const z = await api.retomar(zohoId);
    referencia = `Zoho ${z.numero}`;
    if (z.cliente_zoho_id) {
      const r = await api.clienteDoZoho(z.cliente_zoho_id);
      cliente = (await api.cliente(r.id)).cliente;
    }
    let mudou = 0;
    linhas = z.itens.map((i) => {
      if (i.produto) {
        const pr = precoDoProduto(i.produto, ctx.cfo);
        const preco = pr.preco ?? i.preco_antigo;
        if (pr.preco !== null && Math.abs(pr.preco - i.preco_antigo) > 0.5) mudou += 1;
        return { secao: i.secao, tipo: "produto", nome: i.produto.nome, descricao: i.descricao, quantidade: String(i.quantidade), unidade: i.unidade || i.produto.unidade || "un", preco_unit: String(preco), custo_unit: pr.custo === null ? (i.custo_zoho ?? "") : String(pr.custo), produto_id: i.produto.id, item_id: i.item_id, _antigo: i.preco_antigo };
      }
      return { secao: i.secao, tipo: i.tipo, nome: i.nome, descricao: i.descricao, quantidade: String(i.quantidade), unidade: i.unidade, preco_unit: String(i.preco_antigo), custo_unit: i.custo_zoho === null ? "" : String(i.custo_zoho), produto_id: null, item_id: i.item_id, _antigo: i.preco_antigo };
    });
    observacaoInicial = z.notas ?? "";
    avisos.append(h("p", { class: "notice" }, `Retomando ${z.numero} (${formatDate(z.data)}, ${brl(z.total)} no Zoho). ${z.itens.filter((i) => i.produto).length} de ${z.itens.length} itens ligados ao catálogo do VEOS${mudou ? `; ${mudou} com preço recalculado pela Política (o antigo aparece na linha)` : ""}. Itens sem custo precisam do custo para a margem.`));
  } else if (clienteId) {
    cliente = (await api.cliente(clienteId)).cliente;
  }

  // ---- cliente
  const caixaCliente = h("div", { class: "stack-s" });
  function desenharCliente() {
    clear(caixaCliente);
    if (cliente) {
      const trocar = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Trocar");
      trocar.addEventListener("click", () => { cliente = null; desenharCliente(); recalcular(); });
      caixaCliente.append(h("div", { class: "row orc-cliente" }, h("strong", null, cliente.nome), cliente.codigo ? h("span", { class: "field-hint" }, cliente.codigo) : null,
        cliente.telefone ? h("span", { class: "field-hint" }, formatarTelefone(cliente.telefone)) : null, cliente.cidade ? h("span", { class: "field-hint" }, cliente.cidade) : null, substitui ? null : trocar));
      return;
    }
    const busca = h("input", { class: "input", type: "search", id: "orc-cli-busca", autocomplete: "off", placeholder: "Buscar cliente pelo nome, telefone ou código" });
    const res = h("ul", { class: "list-plain orc-cli-lista" });
    const novo = h("button", { class: "btn btn-ghost", type: "button" }, "+ Cadastrar cliente novo");
    const form = h("div");
    novo.addEventListener("click", () => clear(form).append(formularioCliente(null, (c) => { cliente = c; desenharCliente(); recalcular(); }, { compacto: true })));
    let t;
    busca.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const q = busca.value.trim();
        if (q.length < 2) return clear(res);
        const { clientes } = await api.clientes(q);
        clear(res).append(...(clientes.length ? clientes.slice(0, 8).map((c) => {
          const b = h("button", { class: "orc-item", type: "button" }, h("span", { class: "orc-nome" }, c.nome), h("span", { class: "field-hint" }, [c.codigo, c.cidade, c.telefone ? formatarTelefone(c.telefone) : null].filter(Boolean).join(" · ")));
          b.addEventListener("click", () => { cliente = c; desenharCliente(); recalcular(); });
          return h("li", null, b);
        }) : [h("li", { class: "field-hint" }, "Nenhum cliente com esse nome. Cadastre abaixo.")]));
      }, 250);
    });
    caixaCliente.append(busca, res, novo, form);
  }

  // ---- linhas
  const corpoLinhas = h("div", { class: "stack-s" });
  const secaoAtual = h("input", { class: "input", id: "orc-ambiente", list: "orc-ambientes", value: "Geral", autocomplete: "off" });
  const datalist = h("datalist", { id: "orc-ambientes" }, AMBIENTES_SUGERIDOS.map((a) => h("option", { value: a })));
  const ambientesUsados = () => [...new Set(linhas.map((l) => l.secao || "Geral"))];

  function adicionar(l) { linhas.push({ secao: secaoAtual.value.trim() || "Geral", quantidade: "1", unidade: "un", custo_unit: "", ...l }); desenharLinhas(); recalcular(); }

  function desenharLinhas() {
    clear(corpoLinhas);
    if (!linhas.length) return corpoLinhas.append(h("p", { class: "result-empty" }, "Nenhum item ainda. Escolha o ambiente e adicione produtos do catálogo ou serviços."));
    for (const amb of ambientesUsados()) {
      const doAmb = linhas.map((l, i) => [l, i]).filter(([l]) => (l.secao || "Geral") === amb);
      const tbody = h("tbody");
      for (const [l, i] of doAmb) {
        const ctl = (campo, attrs = {}) => {
          const el = h("input", { class: `input${campo === "nome" ? "" : " num"}`, type: "text", inputmode: campo === "nome" ? null : "decimal", value: campo === "nome" ? l.nome : br(l[campo]), "aria-label": campo, ...attrs });
          el.addEventListener("input", () => { l[campo] = campo === "nome" ? el.value : (n(el.value) === null ? el.value : String(n(el.value))); recalcular(); tot.textContent = brl(totalLinha(l)); });
          return el;
        };
        const tot = h("span", { class: "num" }, brl(totalLinha(l)));
        const mover = h("select", { class: "select select-mini", "aria-label": "Ambiente" }, [...new Set([...ambientesUsados(), secaoAtual.value.trim() || "Geral"])].map((a) => h("option", { value: a, selected: a === amb }, a)));
        mover.addEventListener("change", () => { l.secao = mover.value; desenharLinhas(); recalcular(); });
        const rem = h("button", { class: "btn btn-ghost btn-mini", type: "button", "aria-label": `Remover ${l.nome}` }, "×");
        rem.addEventListener("click", () => { linhas.splice(i, 1); desenharLinhas(); recalcular(); });
        tbody.append(h("tr", null,
          h("td", null, stamp(l.tipo === "servico" ? "Serv" : "Prod", l.tipo === "servico" ? "live" : "neutral")),
          h("td", { class: "orc-desc" }, ctl("nome"), l._origem ? h("span", { class: "field-hint" }, l._origem) : null, l._antigo !== undefined && Math.abs(Number(l._antigo) - Number(l.preco_unit)) > 0.5 ? h("span", { class: "field-hint" }, `antes: ${brl(l._antigo)}`) : null),
          h("td", null, ctl("quantidade")), h("td", null, ctl("preco_unit")), h("td", null, ctl("custo_unit", { placeholder: "custo" })), h("td", { class: "r" }, tot), h("td", null, mover), h("td", null, rem)));
      }
      const sub = totais(doAmb.map(([l]) => l)).subtotal;
      corpoLinhas.append(h("div", { class: "orc-ambiente" }, h("div", { class: "row" }, h("h3", { class: "h3-like" }, amb), h("span", { class: "field-hint" }, `${doAmb.length} item(ns) · ${brl(sub)}`)),
        h("div", { class: "table-wrap" }, h("table", { class: "table orc-tabela" }, h("thead", null, h("tr", null, ["", "Item", "Qtd", "Preço unit.", "Custo unit.", "Total", "Ambiente", ""].map((x) => h("th", { scope: "col" }, x)))), tbody))));
    }
  }

  // ---- catalogo
  const buscaProd = h("input", { class: "input", type: "search", id: "orc-prod-busca", autocomplete: "off", placeholder: "Buscar no catálogo: interruptor, câmera, access point…" });
  const gradeProd = h("div", { class: "orc-produtos", "aria-live": "polite" });
  let tp;
  async function buscarProdutos() {
    clear(gradeProd).append(h("p", { class: "muted" }, "Buscando…"));
    try {
      const r = await api.produtos({ busca: buscaProd.value.trim(), situacao: "ativo" });
      const lista = r.produtos ?? r.itens ?? [];
      clear(gradeProd).append(...(lista.length ? lista.slice(0, 24).map((p) => {
        const pr = precoDoProduto(p, ctx.cfo);
        const add = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "+ Adicionar");
        add.addEventListener("click", () => adicionar({ tipo: "produto", nome: p.nome, descricao: [p.marca, p.modelo].filter(Boolean).join(" ") || "", unidade: p.unidade || "un", preco_unit: pr.preco === null ? "" : String(pr.preco), custo_unit: pr.custo === null ? "" : String(pr.custo), produto_id: p.id, item_id: null, _origem: `${pr.origemPreco}${pr.custo !== null ? "" : " · sem custo"}` }));
        return h("div", { class: "panel panel-tight orc-produto" },
          p.foto ? h("img", { src: p.foto, alt: p.nome, loading: "lazy", class: "orc-foto" }) : h("div", { class: "orc-foto produto-sem-foto" }, "sem foto"),
          h("strong", null, p.nome), h("span", { class: "field-hint" }, p.codigo),
          h("span", null, pr.preco === null ? "sem preço" : brl(pr.preco)), h("span", { class: "field-hint" }, pr.origemPreco), add);
      }) : [h("p", { class: "result-empty" }, "Nada encontrado no catálogo. Use \"+ Item livre\" e cadastre o produto depois (Catálogo → Cadastro pendente).")]));
    } catch (e) { clear(gradeProd).append(errorNotice(e.message)); }
  }
  buscaProd.addEventListener("input", () => { clearTimeout(tp); tp = setTimeout(buscarProdutos, 300); });

  // ---- servicos
  const ph = precoHora(ctx.custoHora, ctx.imp?.servico ?? null, ctx.v);
  const botoesServ = h("div", { class: "row" }, SERVICOS.map((s) => {
    const b = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, `+ ${s.nome}`);
    b.addEventListener("click", () => adicionar({ tipo: "servico", nome: s.nome, descricao: s.descricao, unidade: s.unidade, quantidade: "4", preco_unit: ph === null ? "" : String(ph), custo_unit: ctx.custoHora === null ? "" : String(ctx.custoHora), _origem: ph === null ? "preço da hora: informe (falta o custo-hora no Formulário do CFO)" : "hora pela Política V1 (MC 35%)" }));
    return b;
  }));
  const estimar = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Estimar horas pelos tempos-padrão");
  const estimativa = h("p", { class: "field-hint", "aria-live": "polite" });
  estimar.addEventListener("click", () => {
    if (!ctx.tempos.length) { estimativa.textContent = "Ainda não há tempos-padrão cadastrados (Formulário do CFO → Tempos de serviço). Lance as horas à mão."; return; }
    const comp = composicao(linhas.map((l) => ({ tipo: l.tipo === "servico" ? "service" : "goods", nome: l.nome, qtd: Number(l.quantidade), unidade: l.unidade })), ctx.tempos, { metrosPorPonto: ctx.metrosPorPonto });
    if (!comp.horas) { estimativa.textContent = `Os itens do orçamento não têm tempo-padrão${comp.faltam.length ? ` (${comp.faltam.length} dispositivo(s) sem tempo)` : ""}.`; return; }
    adicionar({ tipo: "servico", nome: "Mão de obra: instalação, configuração e programação", descricao: "Conforme os tempos-padrão de cada dispositivo do escopo.", unidade: "h", quantidade: String(comp.horas), preco_unit: ph === null ? "" : String(ph), custo_unit: ctx.custoHora === null ? "" : String(ctx.custoHora), _origem: `${comp.horas} h pelos tempos-padrão${comp.faltam.length ? ` · ${comp.faltam.length} dispositivo(s) sem tempo` : ""}` });
    estimativa.textContent = `${comp.horas} h estimadas para ${comp.linhas.length} tipo(s) de dispositivo.`;
  });
  const livre = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "+ Item livre");
  livre.addEventListener("click", () => adicionar({ tipo: "produto", nome: "Item", preco_unit: "", _origem: "item livre: informe preço e custo" }));

  // ---- condicoes
  const descModo = h("select", { class: "select", id: "orc-desc-modo" }, h("option", { value: "pct" }, "%"), h("option", { value: "rs" }, "R$"));
  const descValor = h("input", { class: "input num", id: "orc-desc", inputmode: "decimal", autocomplete: "off", placeholder: "0" });
  const canal = h("select", { class: "select", id: "orc-canal" }, h("option", { value: "" }, `Venda direta${ctx.v ? ` (${pct(ctx.v)} sobre o preço)` : ""}`), ctx.canais.map((c) => h("option", { value: c.nome }, `${c.nome} · ${pct(c.v)} (comissão, RT, cartão)`)));
  const condicao = h("input", { class: "input", id: "orc-condicao", autocomplete: "off", value: condicaoInicial, placeholder: "Ex.: 40% na assinatura, 60% na entrega dos equipamentos" });
  const sugerir = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Sugestão do CFO");
  const validade = h("input", { class: "input", id: "orc-validade", type: "date", value: validadeInicial });
  const prazo = h("input", { class: "input", id: "orc-prazo", autocomplete: "off", value: prazoInicial, placeholder: "Ex.: 30 dias após a liberação da obra" });
  const obs = h("textarea", { class: "input", id: "orc-obs", rows: 3 }, observacaoInicial || "Garantia de 12 meses para a instalação e conforme o fabricante para os equipamentos. Infraestrutura elétrica e civil por conta da obra, salvo quando listada.");
  const vCanal = () => (canal.value ? ctx.canais.find((c) => c.nome === canal.value)?.v ?? ctx.v : ctx.v);
  sugerir.addEventListener("click", () => {
    const t = totais(linhas, { modo: descModo.value, valor: n(descValor.value) ?? 0 });
    const custoProd = linhas.filter((l) => l.tipo !== "servico").reduce((a, l) => a + (n(l.custo_unit) ?? 0) * (n(l.quantidade) ?? 0), 0);
    const c = condicaoSugerida({ custoProdutos: custoProd, total: t.total, entradaMinima: ctx.entradaPct, validadeDias: ctx.validadeDias, ptax: ctx.cfo?.ptax ?? null, pagoNaAssinatura: 0 });
    condicao.value = c.texto; if (c.validade) validade.value = c.validade;
  });
  for (const el of [descModo, descValor, canal]) el.addEventListener("input", () => recalcular());

  // ---- conferencia
  const conferencia = h("div", { class: "stack-s", "aria-live": "polite" });
  const resumoTopo = h("div", { class: "cfo-stats" });
  let ultimo = null;
  function recalcular() {
    const desconto = { modo: descModo.value, valor: n(descValor.value) ?? 0 };
    const a = analise(linhas, desconto, { imp: ctx.imp, v: vCanal() });
    ultimo = a;
    clear(resumoTopo).append(stat("Produtos", brl(a.produtos)), stat("Serviços", brl(a.servicos)), stat("Desconto", brl(a.desconto), a.desconto ? pct(a.descontoPct) : "sem desconto"), stat("Total ao cliente", brl(a.total), `${linhas.length} item(ns)`));
    clear(conferencia);
    if (!a.resolvido) conferencia.append(h("p", { class: "notice notice-warn" }, a.motivo));
    else conferencia.append(
      h("div", { class: "row" }, stamp(`MC ${pct(a.mcPct)} · ${FAIXA_TXT[a.faixa] ?? a.faixa}`, FAIXA_TOM[a.faixa] ?? "neutral"), stamp(`Alçada: ${a.alcada.toLowerCase()}`, ALCADA_TOM[a.alcada] ?? "neutral")),
      h("ul", { class: "list-plain stack-s" }, a.exigencias.map((x) => h("li", null, x)), a.ticket ? h("li", { class: "field-hint" }, a.ticket) : null,
        h("li", { class: "field-hint" }, `Lucro com nota estimado: ${brl(a.lucroComNota)} (${pct(a.margemComNota)}) · impostos ${brl(a.impostos)} · custo direto ${brl(a.custo)}.`)));
    if (ctx.texto) conferencia.append(h("p", { class: "field-hint" }, ctx.texto));
    if (!ctx.p) conferencia.append(h("p", { class: "field-hint" }, "Seu perfil não vê os parâmetros do CFO: a margem não é calculada aqui. A direção confere antes de enviar."));
  }

  // ---- salvar
  const saida = h("div", { role: "status" });
  const salvar = h("button", { class: "btn btn-primary", type: "button" }, substitui ? "Salvar nova versão" : "Salvar orçamento");
  salvar.addEventListener("click", async () => {
    clear(saida);
    const erros = errosOrcamento({ cliente, linhas });
    if (cliente && !cliente.id) erros.push("Cadastre o cliente no VEOS antes de salvar (clique em Trocar e cadastre).");
    if (erros.length) return saida.append(h("ul", { class: "list-plain" }, erros.map((e) => h("li", { class: "field-error" }, e))));
    if (ultimo?.resolvido && !["FLUXO NORMAL", "AUTONOMIA COMERCIAL"].includes(ultimo.alcada) && !confirm(`Alçada: ${ultimo.alcada.toLowerCase()}. O orçamento será salvo, mas precisa da autorização indicada antes de ir ao cliente. Salvar?`)) return;
    salvar.disabled = true;
    try {
      const payload = paraSalvar({ cliente: { ...cliente, referencia }, linhas, desconto: { modo: descModo.value, valor: n(descValor.value) ?? 0 }, condicao: condicao.value.trim(), validade: validade.value, prazo: prazo.value.trim(), observacao: obs.value.trim(), analise: ultimo, substitui });
      const r = await api.comercialOrcamentoCriar(payload);
      location.hash = `#/orcamentos/${r.id}`;
    } catch (e) { saida.append(errorNotice(`Não foi possível salvar: ${e.message}`)); salvar.disabled = false; }
  });

  root.append(
    h("p", null, h("a", { href: "#/orcamentos" }, "‹ Orçamentos")), avisos,
    h("div", { class: "orc-montador" },
      h("div", { class: "stack orc-esq" },
        panel({ title: "1. Cliente" }, caixaCliente),
        panel({ title: "2. Itens por ambiente", subtitle: "Escolha o ambiente e adicione. Preço e custo podem ser ajustados na linha; a margem se recalcula na hora." },
          h("div", { class: "form-grid" }, field("orc-ambiente", "Ambiente dos próximos itens", secaoAtual, "Sala, cozinha, suíte… ou o seu nome."), datalist),
          h("div", { class: "stack-s" }, h("strong", null, "Produtos do catálogo"), buscaProd, gradeProd),
          h("div", { class: "stack-s" }, h("strong", null, "Mão de obra e serviços"), botoesServ, h("div", { class: "row" }, estimar, livre), estimativa),
          corpoLinhas),
        panel({ title: "3. Condições" },
          h("div", { class: "form-grid" }, field("orc-desc", "Desconto", h("div", { class: "row" }, descValor, descModo), "Política V1: até 2% com MC ≥ 32% é do vendedor; acima, direção."),
            field("orc-canal", "Canal de venda", canal, "Comissão e RT entram como custo sobre o preço."),
            field("orc-condicao", "Condição de pagamento", condicao, sugerir), field("orc-validade", "Validade", validade, "Curta para importados (dólar)."), field("orc-prazo", "Prazo de execução", prazo)),
          field("orc-obs", "Observações e garantias (vão para a proposta)", obs))),
      h("div", { class: "stack orc-dir" },
        panel({ title: "Resumo" }, resumoTopo),
        panel({ title: "Conferência do CFO", subtitle: "Interna: nunca vai para o cliente." }, conferencia,
          method("Como é calculado", "MC oficial (Política V1) = receita líquida − custos diretos − comissão/RT − provisão de risco de 2%, sem overhead.", "Faixas: ≥ 35% verde · 30–35% aceitável · 25–30% atenção (direção) · < 25% extraordinária.", "Preço sugerido do produto = preço que dá MC de 35% com o custo real de importação (tela Preço dos produtos).")),
        panel({ title: "Salvar" }, h("p", { class: "field-hint" }, "Depois de salvo: gerar o PDF, enviar, e marcar aceito (vira pedido) ou recusado."), salvar, saida))));
  desenharCliente();
  desenharLinhas();
  recalcular();
  buscarProdutos();
}

// ---------------------------------------------------------------- ficha
export async function telaOrcamentoFicha(root, id) {
  const d = await api.comercialOrcamento(id);
  const o = d.orcamento;
  const a = o.resumo ?? {};
  const saida = h("div", { role: "status" });
  const acoes = h("div", { class: "row" });
  const vigente = !["substituido"].includes(o.estado);
  const btn = (t, cls, fn) => { const b = h("button", { class: `btn ${cls}`, type: "button" }, t); b.addEventListener("click", async () => { clear(saida); b.disabled = true; try { await fn(); } catch (e) { saida.append(errorNotice(e.message)); } finally { b.disabled = false; } }); return b; };
  const mudar = async (estado, motivo = null) => { await api.orcamentoSituacao(id, estado, motivo); location.reload(); };
  if (["rascunho", "enviado", "expirado"].includes(o.estado)) {
    acoes.append(h("a", { class: "btn btn-primary", href: `#/propostas/orcamento/${id}` }, "Proposta em PDF e envio"));
    if (o.estado !== "enviado") acoes.append(btn("Marcar como enviado", "btn-ghost", () => mudar("enviado")));
    acoes.append(h("a", { class: "btn btn-ghost", href: `#/orcamentos/novo?editar=${id}` }, "Nova versão (editar)"));
    acoes.append(btn("Cliente aceitou → gerar pedido", "btn-ghost", async () => {
      if (!confirm(`Gerar o pedido de ${o.cliente_nome} por ${brl(o.valor_total)}? Em seguida você define as parcelas (previsão de caixa), compras e obra.`)) return;
      const r = await api.pedidoDoOrcamento(id);
      location.hash = `#/pedidos/${r.id}`;
    }));
    acoes.append(btn("Cliente recusou", "btn-ghost", async () => {
      const motivo = prompt("Motivo da recusa (preço, concorrente, obra adiada, escopo…):");
      if (motivo && motivo.trim()) await mudar("recusado", motivo.trim());
    }));
    if (o.estado === "enviado" && o.validade && o.validade < new Date().toISOString().slice(0, 10)) acoes.append(btn("Marcar expirado", "btn-ghost", () => mudar("expirado")));
  } else if (o.estado === "recusado") {
    acoes.append(btn("Reabrir (voltar a rascunho)", "btn-ghost", () => mudar("rascunho")));
  } else if (o.estado === "aceito" && o.pedido_id) {
    acoes.append(h("a", { class: "btn btn-primary", href: `#/pedidos/${o.pedido_id}` }, "Abrir o pedido"));
  }
  const secoes = totais(linhasDosItens(d.itens)).secoes;
  root.append(
    h("p", null, h("a", { href: "#/orcamentos" }, "‹ Orçamentos")),
    panel({ title: `${o.numero} · versão ${o.versao}`, subtitle: `${o.cliente_nome} · criado em ${formatDateTime(o.criado_em)}`, actions: situacao(o.estado) },
      h("div", { class: "cfo-stats" }, stat("Total ao cliente", brl(o.valor_total), o.desconto ? `desconto ${brl(o.desconto)}` : "sem desconto"),
        stat("Validade", o.validade ? formatDate(o.validade) : "—", o.prazo_execucao ?? ""), stat("Próximo passo", proximoPasso(o)),
        a.mc_politica !== undefined && a.mc_politica !== null ? stat("MC (Política V1)", pct(Number(a.mc_politica)), `${a.faixa ?? ""} · alçada ${String(a.alcada ?? "").toLowerCase()}`) : stat("MC (Política V1)", "—", a.pendente ?? "não calculada")),
      d.cliente ? h("p", null, "Cliente: ", h("a", { href: `#/clientes/${d.cliente.id}` }, `${d.cliente.nome} (${d.cliente.codigo})`), d.cliente.telefone ? ` · ${formatarTelefone(d.cliente.telefone)}` : "") : null,
      o.condicao ? h("p", null, h("strong", null, "Pagamento: "), o.condicao) : null,
      o.motivo_recusa ? h("p", { class: "notice notice-warn" }, `Recusado: ${o.motivo_recusa}`) : null,
      vigente ? acoes : h("p", { class: "notice" }, "Esta versão foi substituída. Abra a versão vigente abaixo."), saida),
    panel({ title: "Itens", subtitle: secoes.map((s) => `${s.secao}: ${brl(s.total)}`).join(" · ") },
      table({ head: ["Ambiente", "Item", "Qtd", "Preço unit.", "Total", "Custo unit."], align: ["", "", "r", "r", "r", "r"],
        rows: d.itens.map((i) => [i.secao ?? "Geral", h("span", null, h("strong", null, i.nome), i.descricao ? h("span", { class: "field-hint" }, ` ${i.descricao}`) : null), `${Number(i.quantidade).toLocaleString("pt-BR")} ${i.unidade ?? ""}`, brl(i.preco_unit), brl(Number(i.quantidade) * Number(i.preco_unit)), i.custo_unit === null ? "—" : brl(i.custo_unit)]) })),
    panel({ title: "Versões" }, table({ head: ["Versão", "Situação", "Valor", "Criada"], align: ["", "", "r", ""],
      rows: d.versoes.map((v) => [v.id === id ? `v${v.versao} (esta)` : h("a", { href: `#/orcamentos/${v.id}` }, `v${v.versao}`), situacao(v.estado), brl(v.valor_total), formatDateTime(v.criado_em)]) })),
    panel({ title: "Histórico" }, h("ul", { class: "list-plain stack-s" }, d.historico.map((x) => h("li", { class: "field-hint" }, `${formatDateTime(x.em)} · ${x.acao}${x.detalhe?.motivo ? `: ${x.detalhe.motivo}` : ""}`)))),
  );
}
