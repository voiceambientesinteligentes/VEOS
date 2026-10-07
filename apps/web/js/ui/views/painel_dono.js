// PAINEL DO DONO e PLANO COMERCIAL. O painel responde, em uma tela: quanto preciso vender por mes
// (ponto de equilibrio, com o passo a passo), como estou (vendas, funil, plano), o que falta preencher
// e a quem perguntar. O comercial transforma a meta em atividade semanal, canais e o calculo do
// showroom. Metas so valem "aprovadas" quando o fundador salva a secao 10 do formulario.
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { funilNecessario, itensReferencia, margemPorReal, MODELOS_OBRA, mixPraticado, oQueFalta, pontoEquilibrio, saidasMensais, showroom, simularObra } from "../../domain/equilibrio.js";
import { projetos } from "../../domain/estoque_sugerido.js";
import { impostosSimulados } from "../../domain/cfo_cenarios.js";
import { comCompatibilidade, numeroBR, parametros } from "../../domain/formulario_cfo.js";
import { formatBRL } from "../../domain/format.js";
import { clear, field, h, method, panel, stamp, stat, table } from "../dom.js";
import { barrasMensais } from "../grafico.js";

const brl = (v) => (v === null || v === undefined || Number.isNaN(v) ? "—" : formatBRL(String(Number(v).toFixed(2))));
const pct = (v) => (v === null || v === undefined ? "—" : `${String(Math.round(v * 10) / 10).replace(".", ",")}%`);
const n1 = (v) => String(Math.round(v * 10) / 10).replace(".", ",");
const mil = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".", ",")} mi` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(Math.round(v)));
const SETOR = Object.fromEntries(CATALOGO.map((s) => [s.id, s]));
const perguntar = (setor, pergunta, rotulo) => h("a", { class: "btn btn-ghost btn-mini", href: `#/diretores?setor=${setor}&pergunta=${encodeURIComponent(pergunta)}` }, rotulo ?? `Perguntar ao ${SETOR[setor]?.sigla ?? setor}`);
const linkSecao = (secao, texto = "Preencher") => h("a", { href: `#/cfo/formulario?secao=${secao}` }, texto);

/** Barra de progresso. A largura vai pelo CSSOM: a CSP do site (style-src 'self') bloqueia o atributo style. */
function barraProgresso(pctValor, rotulo) {
  const cheio = h("span");
  cheio.style.width = `${Math.max(0, Math.min(100, pctValor))}%`;
  return h("div", { class: "barra-progresso", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pctValor), "aria-label": rotulo }, cheio);
}

/** Ultimos 12 meses (AAAA-MM), do mais antigo ao atual. */
function ultimosMeses(n = 12) {
  const d = new Date();
  return Array.from({ length: n }, (_, i) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (n - 1 - i), 1)); return x.toISOString().slice(0, 7); });
}

/** Base comum: parametros, impostos (do contador ou simulados), mix praticado e saidas. */
async function carregarBase() {
  const [{ respostas }, orc, crm, plano] = await Promise.all([
    api.cfoFormulario(), api.cfoOrcamentos(), api.cfoPainel().catch(() => ({ leadsPorMes: {}, negociosPorMes: {} })), api.plano().catch(() => ({ itens: [] })),
  ]);
  const resp = comCompatibilidade(respostas);
  const p = parametros(respostas);
  const sim = impostosSimulados(orc.rbt12);
  const imp = { tProduto: p.tProduto ?? sim?.produto ?? null, tServico: p.tServico ?? sim?.servico ?? null, simulado: p.tProduto === null || p.tServico === null };
  const umAno = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const proj = projetos(orc.orcamentos).filter((o) => o.data >= umAno && Number(o.total) > 500);
  const mix = mixPraticado(proj);
  const saidas = saidasMensais(p, resp);
  const desf = resp.pedidos?.dados?.por_orcamento ?? {};
  const desfechoPct = proj.length ? Math.round((proj.filter((o) => desf[o.numero]?.situacao).length / proj.length) * 100) : null;
  return { respostas: resp, p, imp, orc, crm, plano, proj, mix, saidas, desfechoPct };
}

function seletorCanal(p, id) {
  return h("select", { class: "select", id }, p.canais.map((c) => h("option", { value: c.nome, selected: c.nome === p.canalPadrao }, `${c.nome} · ${pct(c.v)} de comissão/RT/cartão`)));
}

// ================================================================ painel do dono
export async function telaPainelDono(root) {
  const b = await carregarBase();
  const { p, imp, orc, crm, plano, proj, mix, saidas } = b;
  const canal = seletorCanal(p, "pd-canal");
  const corpoEq = h("div", { class: "stack-s" });
  const corpoSim = h("div", { class: "stack-s" });
  const metasEl = h("div", { class: "stack-s" });
  const ticket = proj.length ? proj.reduce((a, o) => a + Number(o.total), 0) / proj.length : null;
  const mesAtual = new Date().toISOString().slice(0, 7);
  const vendidoMes = orc.orcamentos.filter((o) => ["accepted", "invoiced"].includes(o.status) && String(o.data).startsWith(mesAtual)).reduce((a, o) => a + Number(o.total), 0);

  function calcular() {
    const c = p.canais.find((x) => x.nome === canal.value) ?? p.canais[0];
    const ok = imp.tProduto !== null && mix.multiplicador && mix.mixProduto !== null;
    const mc = ok ? margemPorReal({ tProduto: imp.tProduto, tServico: imp.tServico, v: c.v, multiplicador: mix.multiplicador, mixProduto: mix.mixProduto }) : null;
    const eq = mc ? pontoEquilibrio(saidas, mc) : null;
    return { c, mc, eq };
  }

  function desenhar() {
    const { c, mc, eq } = calcular();
    const meta = p.metas.meta_vendas_mes ?? eq?.meta ?? null;
    const progresso = meta ? Math.min(100, Math.round((vendidoMes / meta) * 100)) : null;
    clear(corpoEq).append(
      h("div", { class: "cfo-stats" },
        stat("Saídas do mês", brl(saidas.total), "custos fixos + sua retirada + equipe + veículo + dívidas"),
        stat("Margem por real vendido", mc ? pct(mc.media) : "—", mc ? `produto ${pct(mc.produto)} · serviço ${pct(mc.servico)} · canal ${c.nome}` : "faltam dados"),
        stat("Ponto de equilíbrio", eq ? brl(eq.meta) : "—", eq ? `≈ ${brl(eq.porDia)} por dia útil` : "faltam dados"),
        stat("Vendido neste mês", brl(vendidoMes), `${meta ? `${progresso}% de ${brl(meta)}${p.metas.meta_vendas_mes ? " (meta aprovada)" : " (ponto de equilíbrio)"}` : "orçamentos aceitos no Zoho"}${vendidoMes ? "" : " · conta os orçamentos marcados como aceitos no Zoho"}`)),
      meta ? barraProgresso(progresso, "Vendido no mês em relação à meta") : null,
      imp.simulado ? h("p", { class: "notice notice-warn" }, p.simulacaoAdotada ? "Impostos do Simples ADOTADOS por você (cálculo do VEOS pelo faturamento do Zoho) até o contador confirmar. " : "Impostos ainda SIMULADOS (Simples pelo faturamento do Zoho) até o contador informar. ", linkSecao("impostos", "Informar as alíquotas")) : null,
      method("Como chegamos nesse número (passo a passo)",
        h("div", { class: "stack-s" },
          h("p", null, h("strong", null, "1. Quanto sai do caixa todo mês"), " (seja qual for a venda):"),
          table({ head: ["Saída", "Por mês"], align: ["", "r"], rows: [...saidas.linhas.map(([t, v]) => [t, brl(v)]), [h("strong", null, "Total"), h("strong", null, brl(saidas.total))]] }),
          h("p", null, h("strong", null, "2. Quanto sobra de cada R$ 100 vendidos"), mc ? ` (mix dos seus projetos: ${Math.round(mix.mixProduto * 100)}% produto, ${100 - Math.round(mix.mixProduto * 100)}% serviço; produto vendido a ${n1(mix.multiplicador)}× o custo):` : ""),
          mc ? table({ head: ["", "Produto (R$ 100)", "Serviço (R$ 100)"], align: ["", "r", "r"], rows: [
            ["Imposto", `− ${n1(imp.tProduto)}`, `− ${n1(imp.tServico)}`],
            ["Provisão de risco (2% da receita líquida)", `− ${n1((100 - imp.tProduto) * 0.02)}`, `− ${n1((100 - imp.tServico) * 0.02)}`],
            [`Comissão + RT/indicação + cartão (${c.nome})`, `− ${n1(c.v)}`, `− ${n1(c.v)}`],
            ["Custo do produto", `− ${n1(100 / mix.multiplicador)}`, "— (a equipe já está nas saídas)"],
            [h("strong", null, "Sobra para pagar as saídas"), h("strong", null, n1(mc.produto)), h("strong", null, n1(mc.servico))],
          ] }) : null,
          mc ? h("p", null, `Na média do seu mix, sobram ${pct(mc.media)} de cada venda.`) : null,
          eq ? h("p", null, h("strong", null, "3. Vendas necessárias = saídas ÷ sobra"), ` = ${brl(saidas.total)} ÷ ${pct(mc.media)} = `, h("strong", null, brl(eq.meta)), ` por mês. Cada R$ 1.000 a menos de saída reduz a meta em ${brl(eq.cadaMil)}.`) : null,
          h("p", { class: "field-hint" }, "É o ponto de equilíbrio FINANCEIRO: inclui sua retirada e as parcelas de dívidas, porque o caixa precisa delas. Vender acima disso é o que forma a reserva e o lucro."))),
    );
    desenharSimulacao(c);
    desenharMetas(eq);
  }

  function desenharSimulacao(c) {
    clear(corpoSim);
    if (imp.tProduto === null || !mix.precoHora) return corpoSim.append(h("p", { class: "field-hint" }, "Faltam impostos ou o preço da hora praticado para simular."));
    const ref = itensReferencia(proj);
    const base = { tProduto: imp.tProduto, tServico: imp.tServico, v: c.v, catalogo: p.tempos, produtividade: p.produtividade && p.produtividade < 90 ? p.produtividade : 65, precoHora: mix.precoHora, comissionamento: p.comissionamento, entregaHoras: p.entregaHoras, metrosPorPonto: p.metrosPorPonto };
    const obras = MODELOS_OBRA.map((m) => simularObra(m, ref, base));
    const vendido = obras.reduce((a, o) => a + o.total, 0), sobra = obras.reduce((a, o) => a + (o.sobra ?? 0), 0), horas = obras.reduce((a, o) => a + o.horas, 0);
    corpoSim.append(
      h("div", { class: "cfo-stats" },
        ...obras.map((o) => stat(o.modelo, brl(o.total), `produtos ${brl(o.produtos)} + mão de obra ${brl(o.maoDeObra)} (${n1(o.horas)} h × ${brl(base.precoHora)}) · sobra ${brl(o.sobra)}`)),
        stat("As duas obras no mês", brl(vendido), `sobra ${brl(sobra)} contra ${brl(saidas.total)} de saídas → ${sobra >= saidas.total ? `fica ${brl(sobra - saidas.total)} para reserva e lucro` : `faltam ${brl(saidas.total - sobra)}`}`),
        stat("Horas de equipe usadas", `${Math.round(horas)} h`, (() => {
          // capacidade na MESMA produtividade da simulacao (a informada pode ser 100%)
          const cap = p.hora?.horasVendaveis && p.produtividade ? Math.round((p.hora.horasVendaveis * base.produtividade) / p.produtividade) : null;
          return cap ? `de ~${cap} h vendáveis no mês (sua equipe, com ${pct(base.produtividade)} de execução)` : "capacidade: preencha a equipe";
        })())),
      ...obras.map((o) => method(`Itens da simulação: ${o.modelo}`, table({ head: ["Item (o mais usado nos seus orçamentos)", "Qtd", "Custo", "Preço (Política 35%)", "Total"], align: ["", "r", "r", "r", "r"], rows: o.linhas.map((l) => [l.nome, String(l.qtd), brl(l.custo), brl(l.preco), brl(l.total)]) }),
        `Mão de obra: ${n1(o.horas)} h pelos seus tempos (com testes, entrega e produtividade ${pct(base.produtividade)}) × ${brl(base.precoHora)}/h (o que você cobra hoje).`,
        o.faltam.length ? `Sem item de referência para: ${o.faltam.join(", ")}.` : null)),
      h("p", { class: "field-hint" }, "Simulação com quantidades típicas de alto padrão; produtos no preço mínimo da Política (35%) e a hora no valor que você já pratica. Use a Negociação ao Vivo para um projeto real."));
  }

  function desenharMetas(eq) {
    const m = p.metas;
    const prop = (aprov, sugerida) => (aprov !== null && aprov !== undefined ? [aprov, "aprovada", "ok"] : [sugerida, "proposta", "warn"]);
    const vendas = prop(m.meta_vendas_mes, eq?.meta ?? null);
    const tk = prop(m.meta_ticket, ticket ? Math.round(ticket) : null);
    const conv = prop(m.meta_conversao_pct, 35);
    const fun = funilNecessario({ meta: vendas[0], ticket: tk[0], conversao: conv[0] });
    const orcs = prop(m.meta_orcamentos_mes, fun?.mes.orcamentos ?? null);
    const leads = prop(m.meta_leads_mes, fun?.mes.leads ?? null);
    const card = (rot, [v, est, tom], fmt, ctx) => h("div", { class: "panel panel-tight stat" }, h("span", { class: "stat-label" }, rot, " ", stamp(est, tom)), h("span", { class: "stat-figure" }, v === null ? "—" : fmt(v)), ctx ? h("span", { class: "stat-context" }, ctx) : null);
    const orcMes = proj.filter((o) => String(o.data).startsWith(mesAtual)).length;
    const leadsMes = crm.leadsPorMes?.[mesAtual] ?? 0;
    clear(metasEl).append(
      h("div", { class: "cfo-stats" },
        card("Vendas por mês", vendas, brl, `vendido neste mês: ${brl(vendidoMes)}`),
        card("Ticket médio", tk, brl, ticket ? `seus projetos (12 meses): ${brl(ticket)}` : null),
        card("Taxa de fechamento", conv, pct, b.desfechoPct !== null ? `desfecho marcado em ${b.desfechoPct}% dos projetos` : null),
        card("Orçamentos por mês", orcs, (v) => String(v), `neste mês: ${orcMes}`),
        card("Contatos novos por mês", leads, (v) => String(v), `neste mês no CRM: ${leadsMes}`)),
      Object.values(m).some((v) => v !== null) ? null : h("p", { class: "field-hint" }, "Metas em PROPOSTA (calculadas pelo CFO/CSO). Para aprovar, salve os valores na ", linkSecao("metas", "seção 10 do formulário"), "."));
  }

  canal.addEventListener("change", desenhar);
  const meses = ultimosMeses(12);
  const porMes = (pred, valor = () => 1) => meses.map((mm) => proj.filter((o) => String(o.data).startsWith(mm) && pred(o)).reduce((a, o) => a + valor(o), 0));
  const contagem = barrasMensais({ titulo: "Contatos e orçamentos por mês", meses, series: [
    { nome: "Contatos novos (CRM)", valores: meses.map((mm) => crm.leadsPorMes?.[mm] ?? 0) },
    { nome: "Projetos orçados", valores: porMes(() => true) }], formatar: (v) => String(Math.round(v)) });
  const valores = barrasMensais({ titulo: "Valor orçado e aceito por mês", meses, series: [
    { nome: "Orçado", valores: porMes(() => true, (o) => Number(o.total)) },
    { nome: "Aceito no Zoho", valores: meses.map((mm) => orc.orcamentos.filter((o) => ["accepted", "invoiced"].includes(o.status) && String(o.data).startsWith(mm)).reduce((a, o) => a + Number(o.total), 0)) }], formatar: brl, compacto: mil });
  const falta = oQueFalta(p, b.respostas, { desfechoPct: b.desfechoPct });
  const est = (e) => plano.itens.filter((i) => i.estado === e).length;
  const proximos = plano.itens.filter((i) => ["aprovado", "em_andamento"].includes(i.estado) && i.prazo).sort((x, y) => x.prazo.localeCompare(y.prazo)).slice(0, 5);

  root.append(
    panel({ title: "Painel do dono", subtitle: "Quanto precisa vender, como está indo, o que falta e a quem perguntar. Números da sua empresa, calculados na hora." },
      h("div", { class: "row" }, perguntar("financas", "Como reduzir o ponto de equilíbrio da VOICE?", "Perguntar ao CFO"), perguntar("vendas", "Qual a melhor forma de gerar mais contatos qualificados este mês?", "Perguntar ao CSO"), perguntar("marketing", "Como fazer o showroom gerar clientes?", "Perguntar ao CMO"), perguntar("operacoes", "Minha equipe dá conta de mais obras por mês?", "Perguntar ao COO"))),
    panel({ title: "Quanto preciso vender por mês", subtitle: "Ponto de equilíbrio financeiro: pagar todas as saídas do mês com a margem das vendas." },
      field(canal.id, "Canal de venda considerado", canal, "Com RT/indicação a margem cai; turn key e venda direta não pagam RT."), corpoEq),
    panel({ title: "Simulação: duas obras que pagam o mês", subtitle: "Exemplo concreto com produtos dos seus orçamentos e a mão de obra pelos seus tempos." }, corpoSim),
    panel({ title: "Metas do mês", subtitle: "Aprovadas por você ou, enquanto não aprovar, propostas pelos diretores." }, metasEl),
    panel({ title: "Funil: contatos, orçamentos e vendas", subtitle: "Projetos orçados contam uma vez por cliente (versões juntas). Aceitos dependem de você marcar no Zoho." }, contagem, valores,
      h("div", { class: "row" }, perguntar("vendas", "Analise meu funil dos últimos 12 meses e diga onde estou perdendo vendas."))),
    panel({ title: "Plano da VOICE", subtitle: "Onde está cada meta e ação." },
      h("div", { class: "cfo-stats" }, stat("Aguardando sua decisão", String(est("proposto"))), stat("Em andamento", String(est("em_andamento") + est("aprovado"))), stat("Feitos", String(est("feito")))),
      proximos.length ? h("ul", { class: "list-plain stack-s" }, proximos.map((i) => h("li", { class: "row" }, stamp(i.codigo, "neutral"), h("a", { href: `#/plano` }, i.titulo), h("span", { class: "field-hint" }, `prazo ${i.prazo.split("-").reverse().join("/")}`)))) : h("p", { class: "field-hint" }, "Nenhum item aprovado com prazo ainda."),
      h("a", { class: "btn btn-primary", href: "#/plano" }, "Abrir o plano")),
    panel({ title: "O que falta para fechar custos, preços e metas", subtitle: `${falta.filter((x) => x.ok).length} de ${falta.length} itens resolvidos.` },
      h("ul", { class: "list-plain stack-s" }, falta.map((x) => h("li", { class: "row" }, stamp(x.ok ? "ok" : "falta", x.ok ? "ok" : "warn"), h("span", null, x.texto), x.ok ? null : linkSecao(x.secao))))),
  );
  desenhar();
}

// ================================================================ plano comercial
export const CANAIS_COMERCIAIS = [
  ["Arquitetos e designers", "Palestra técnica de 45 min no escritório + caderno técnico + visita a uma obra entregue", "Quinzenal nos 2 primeiros meses, depois mensal", "3 a 12 meses", "Escritórios ativos, projetos indicados por trimestre"],
  ["Construtoras e incorporadoras", "Decorado integrado + pacote de upgrade para compradores + infraestrutura padrão", "Reunião, proposta, retorno a cada 10 dias", "6 a 18 meses (venda em lote)", "Unidades com upgrade ÷ unidades vendidas"],
  ["Lojas parceiras (iluminação, marcenaria, cortinas, home theater)", "Indicação cruzada, demonstração na loja, treinamento dos vendedores", "Visita mensal + grupo de WhatsApp", "1 a 4 meses", "Contatos por loja por mês"],
  ["Condomínios e síndicos", "Diagnóstico gratuito de Wi-Fi das áreas comuns + apresentação na assembleia", "Contato → diagnóstico → assembleia (30–90 dias)", "2 a 6 meses", "Diagnósticos, apartamentos convertidos por prédio"],
  ["Corretores de alto padrão", "Laudo de tecnologia do imóvel + kit de valorização para revenda", "Café mensal com a imobiliária", "1 a 6 meses", "Indicações por corretor"],
  ["Mostras (CASACOR)", "Automação de 1–2 ambientes de arquitetos parceiros + captação com QR e agenda", "Proposta 6 a 9 meses antes", "3 a 12 meses", "Contatos na mostra, reuniões, vendas em 12 meses"],
  ["Google (anúncio e Perfil da Empresa)", "Palavras de intenção (automação residencial BC, Wi-Fi apartamento) + avaliações", "Diário · responder em até 1 hora", "1 a 3 meses", "Custo por contato, custo por venda"],
  ["Instagram", "Obras reais, antes e depois, marcar o arquiteto", "3 a 4 publicações por semana", "Longo prazo", "Mensagens qualificadas por mês"],
  ["Indicação de clientes", "Pedido na entrega + visita de 90 dias + benefício em serviço", "Na entrega, aos 90 dias e anual", "1 a 6 meses", "Indicações por cliente entregue"],
];
export const ROTEIROS = [
  ["Arquiteto", "Olá, [nome]. Sou o Fernando, da VOICE: automação, Wi-Fi e áudio e vídeo de alto padrão em BC. Posso levar ao seu escritório 40 minutos sobre o que precisa estar previsto no projeto (tubulação, quadros, rack, pontos de Wi-Fi) para a automação não quebrar o acabamento, e deixar nosso caderno técnico? Quinta às 9h ou às 14h?"],
  ["Construtora", "[Nome], o comprador de alto padrão já espera tecnologia. Proponho integrar o seu decorado (cenas de luz, cortinas, som e Wi-Fi sem ponto cego) e oferecer aos compradores um pacote de upgrade com preço fechado e instalação na entrega. Posso apresentar em 20 minutos?"],
  ["Síndico", "Bom dia, [nome]. Muitos condomínios de BC têm Wi-Fi ruim no salão, na academia e na piscina. Fazemos um diagnóstico gratuito de Wi-Fi das áreas comuns, com mapa de sinal e relatório. Posso agendar uma medição de 1 hora?"],
  ["Corretor", "[Nome], imóvel com tecnologia bem resolvida vende mais rápido. Posso fazer um laudo de tecnologia gratuito dos seus imóveis de alto padrão: Wi-Fi, automação e o que valorizaria cada um?"],
];
export const AGENDA = [
  ["CASACOR SC Florianópolis", "27/09 a 08/11/2026", "Visitar e mapear os 41 profissionais do elenco como arquitetos-alvo"],
  ["CASACOR SC Brava (Itajaí, empreendimento Malbec)", "Open House 20/01/2027 · público 11/07 a 22/08/2027", "Abordar arquitetos e a construtora até jan/2027: melhor janela de showroom parceiro"],
  ["Mostra Artefacto BC", "aberta desde ago/2026 até 2027", "Possível vitrine com arquitetos catarinenses"],
  ["DW! Semana de Design BC (CasaHall)", "agosto (2027 a confirmar)", "Relacionamento com arquitetos e lojas"],
];

export async function telaComercial(root) {
  const b = await carregarBase();
  const { p, imp, proj, mix, saidas } = b;
  const ticketReal = proj.length ? Math.round(proj.reduce((a, o) => a + Number(o.total), 0) / proj.length) : 0;
  const c0 = p.canais.find((c) => c.nome === p.canalPadrao) ?? p.canais[0];
  const mc = imp.tProduto !== null && mix.multiplicador ? margemPorReal({ tProduto: imp.tProduto, tServico: imp.tServico, v: c0.v, multiplicador: mix.multiplicador, mixProduto: mix.mixProduto }) : null;
  const eq = mc ? pontoEquilibrio(saidas, mc) : null;
  const inp = (id, v) => h("input", { class: "input num", id, inputmode: "decimal", autocomplete: "off", value: v === null || v === undefined ? "" : String(v).replace(".", ",") });
  const fMeta = inp("cm-meta", p.metas.meta_vendas_mes ?? eq?.meta), fTicket = inp("cm-ticket", p.metas.meta_ticket ?? ticketReal), fConv = inp("cm-conv", p.metas.meta_conversao_pct ?? 35);
  const fVis = inp("cm-vis", 65), fLead = inp("cm-lead", 50), fToque = inp("cm-toque", 25);
  const funilEl = h("div");
  function desenharFunil() {
    const f = funilNecessario({ meta: numeroBR(fMeta.value), ticket: numeroBR(fTicket.value), conversao: numeroBR(fConv.value) ?? 35, visitaParaOrcamento: numeroBR(fVis.value) ?? 65, leadParaVisita: numeroBR(fLead.value) ?? 50, toqueParaLead: numeroBR(fToque.value) ?? 25 });
    clear(funilEl).append(f ? table({ caption: "Atividade necessária (metas de atividade são PROPOSTA até você aprovar)", head: ["Etapa", "Por mês", "Por semana"], align: ["", "r", "r"], rows: [
      ["Toques de prospecção (arquitetos, construtoras, lojas, síndicos, corretores)", String(f.mes.toques), n1(f.semana.toques)],
      ["Contatos qualificados (leads)", String(f.mes.leads), n1(f.semana.leads)],
      ["Visitas técnicas / diagnósticos", String(f.mes.visitas), n1(f.semana.visitas)],
      ["Orçamentos enviados", String(f.mes.orcamentos), n1(f.semana.orcamentos)],
      ["Vendas", n1(f.mes.vendas), n1(f.semana.vendas)]] }) : h("p", { class: "field-hint" }, "Informe meta e ticket."));
  }
  for (const el of [fMeta, fTicket, fConv, fVis, fLead, fToque]) el.addEventListener("input", desenharFunil);

  // showroom
  const showFixo = (b.respostas.fixos?.dados?.itens ?? []).find((x) => /show/i.test(x.descricao ?? ""));
  const sCusto = inp("sh-custo", numeroBR(showFixo?.valor) ?? ""), sInv = inp("sh-inv", 100000), sMeses = inp("sh-meses", 12), sInd = inp("sh-ind", 0);
  const showEl = h("div", { class: "stack-s" });
  function desenharShow() {
    const base = { ticket: numeroBR(fTicket.value) ?? ticketReal, mcPct: mc?.media ?? null };
    const proprio = showroom({ ...base, custoMensal: numeroBR(sCusto.value) ?? 0 });
    const parceiro = showroom({ ...base, investimento: numeroBR(sInv.value) ?? 0, meses: numeroBR(sMeses.value) ?? 12, indicacaoPct: numeroBR(sInd.value) ?? 0 });
    clear(showEl).append(!proprio || !parceiro ? h("p", { class: "field-hint" }, "Faltam ticket ou margem.") : h("div", { class: "cfo-stats" },
      stat("Margem de cada venda", brl(proprio.porVenda), `ticket ${brl(base.ticket)} × margem ${pct(base.mcPct)}`),
      stat("Showroom próprio: vendas por mês só para se pagar", n1(proprio.vendasMesParaPagarCusto), `custo de ${brl(numeroBR(sCusto.value) ?? 0)}/mês`),
      stat("Showroom parceiro: vendas para recuperar o investimento", parceiro.impossivel ? "impossível" : n1(parceiro.vendasParaRecuperar), parceiro.impossivel ? "a indicação come a margem" : `${n1(parceiro.vendasMesNoPrazo)} venda(s)/mês para recuperar em ${numeroBR(sMeses.value) ?? 12} meses`)),
    h("p", { class: "field-hint" }, "Regra de corte sugerida: se em 6 meses o espaço não trouxer metade das vendas necessárias, renegociar ou encerrar. Atribuição: pergunte sempre \"onde nos conheceu?\" e marque a origem do contato no CRM."));
  }
  for (const el of [sCusto, sInv, sMeses, sInd, fTicket]) el.addEventListener("input", desenharShow);

  root.append(
    panel({ title: "Plano comercial", subtitle: "Eduardo (CSO) e Camila (CMO): da meta de vendas à atividade da semana. Responsáveis: CSO cuida do funil e das propostas; CMO cuida de showroom, mostras, Instagram e Google." },
      h("div", { class: "row" }, perguntar("vendas", "Monte minha agenda de prospecção desta semana com base no plano comercial."), perguntar("marketing", "Crie o roteiro do café técnico para arquitetos no showroom."))),
    panel({ title: "Da meta à semana", subtitle: "Taxas iniciais são hipóteses de mercado: meça 90 dias e ajuste." },
      h("div", { class: "form-grid" }, field(fMeta.id, "Meta de vendas por mês (R$)", fMeta, eq ? `ponto de equilíbrio: ${brl(eq.meta)}` : null), field(fTicket.id, "Ticket médio (R$)", fTicket, `seus projetos: ${brl(ticketReal)}`), field(fConv.id, "Fechamento dos orçamentos (%)", fConv), field(fVis.id, "Visitas que viram orçamento (%)", fVis), field(fLead.id, "Contatos que viram visita (%)", fLead), field(fToque.id, "Toques que viram contato (%)", fToque)),
      funilEl, h("p", { class: "field-hint" }, "Regra de ouro (estudo HBR com 1,25 milhão de contatos): responder em até 1 hora multiplica a chance de qualificar. Retorno do orçamento nos dias 2, 5, 10, 20 e 35.")),
    panel({ title: "Canais: onde estão os clientes", subtitle: "Pesquisa CEDIA/CE Pro/Aureside e mercado local (out/2026)." },
      table({ head: ["Canal", "Como abordar", "Cadência", "Tempo até vender", "Como medir"], rows: CANAIS_COMERCIAIS })),
    panel({ title: "Roteiros de abordagem", subtitle: "Ofertas de entrada: diagnóstico de Wi-Fi, visita técnica gratuita, caderno técnico, laudo de tecnologia." },
      h("div", { class: "stack-s" }, ROTEIROS.map(([quem, texto]) => method(quem, texto)))),
    panel({ title: "Showroom: próprio e com parceiros", subtitle: "Responsável: CMO (Camila), com o CFO (Ricardo) aprovando o investimento. Showroom parceiro = investimento da VOICE; conta como marketing, não como venda." },
      h("div", { class: "form-grid" }, field(sCusto.id, "Custo mensal do showroom próprio (R$)", sCusto), field(sInv.id, "Investimento num showroom parceiro (R$)", sInv), field(sMeses.id, "Recuperar em (meses)", sMeses), field(sInd.id, "Indicação paga ao parceiro por venda (%)", sInd)),
      showEl,
      h("p", { class: "field-hint" }, "Sugestão: antes de investir R$ 100 mil, piloto de R$ 20–30 mil em comodato (o equipamento continua da VOICE) num espaço com fluxo comprovado, com metas de contatos e cláusula de saída.")),
    panel({ title: "Agenda de eventos", subtitle: "Mostras e feiras que valem o tempo." }, table({ head: ["Evento", "Quando", "O que fazer"], rows: AGENDA })),
  );
  desenharFunil();
  desenharShow();
}
