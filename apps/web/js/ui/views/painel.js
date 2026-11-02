// PAINEL EXECUTIVO (Visao geral, direcao e financas).
// Mantem as mesmas fontes e regras de calculo; esta camada organiza a leitura da informacao.
// Dado ausente aparece como lacuna explicada, nunca como zero.
import { api } from "../../data/api.js";
import { formatBRL } from "../../domain/format.js";
import { h, method, panel, stamp, stat, table } from "../dom.js";
import { barrasMensais } from "../grafico.js";
import { resumoPainel, soma } from "../../domain/painel.js";
import { SEV_ROTULO, SEV_TOM, setorPorId } from "../componentes.js";

const SIT = { accepted: "Aceitos", draft: "Rascunho", sent: "Enviados", declined: "Recusados", expired: "Expirados", invoiced: "Faturados" };

const brl = (v) => (v === null || v === undefined ? "—" : formatBRL(String(Number(v).toFixed(2))));
const mil = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".", ",")} mi` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(Math.round(v)));

function dashboardCard(node, modifier) {
  node.classList.add("dashboard-card", modifier);
  return node;
}

export async function telaPainel(root) {
  const p = await api.painel();
  const r = resumoPainel(p);
  const meses = p.meses.map((m) => m.mes);
  const alertasPorSetor = Object.entries(p.alertas.reduce((acc, a) => {
    (acc[a.setor] ??= {})[a.severidade] = a.qtd;
    return acc;
  }, {}));

  const introducao = h("header", { class: "dashboard-intro" },
    h("div", { class: "dashboard-intro-copy" },
      h("span", { class: "dashboard-eyebrow" }, "ACOMPANHAMENTO EXECUTIVO"),
      h("h1", null, "Visão geral"),
      h("p", null, "Uma leitura consolidada de vendas, faturamento, caixa e operação. Os números seguem as fontes registradas no VEOS e nos sistemas integrados.")),
    h("nav", { class: "dashboard-intro-actions", "aria-label": "Acessos rápidos" },
      h("a", { class: "btn btn-primary", href: "#/painel-dono" }, "Painel do dono"),
      h("a", { class: "btn btn-ghost", href: "#/radar" }, "Abrir radar")));

  const indicadores = h("section", { class: "dashboard-kpis", "aria-label": "Indicadores principais" },
    stat("Vendas aceitas · 12 meses", brl(r.vendas12), `Zoho Books · últimos 3 meses: ${brl(r.vendas3)}`),
    stat("Faturado · 12 meses", r.faturado12 === null ? "Sem dados" : brl(r.faturado12), p.tem_nf || p.tem_faturas_zoho ? "Notas registradas no VEOS + faturas do Zoho" : "Nenhuma NF registrada e o Books não tem faturas"),
    stat("A receber", brl(p.a_receber?.aberto), p.a_receber?.vencido ? `Vencido: ${brl(p.a_receber.vencido)}` : p.tem_parcelas ? "Nada vencido" : "Sem parcelas de pedidos"),
    stat("Conversão de orçamentos", r.conversao === null ? "—" : `${r.conversao}%`, r.totalFechados ? `Aceitos ÷ (aceitos + recusados + expirados), ${r.totalFechados} decididos em 12 meses` : "Sem orçamentos decididos"));

  const vendas = dashboardCard(
    panel({ title: "Vendas aceitas por mês", subtitle: "Valor dos orçamentos aceitos no Zoho Books, pela data do orçamento." },
      barrasMensais({ titulo: "Vendas aceitas por mês", meses, series: [{ nome: "Vendas aceitas", valores: p.meses.map((m) => m.vendas_total) }], formatar: brl, compacto: mil })),
    "dashboard-card--sales");

  const caixa = dashboardCard(
    panel({ title: "Caixa · previsto × recebido", subtitle: "Parcelas dos pedidos do VEOS, pelo vencimento e pela data do recebimento." },
      p.tem_parcelas
        ? barrasMensais({ titulo: "Caixa previsto e recebido por mês", meses, series: [{ nome: "Previsto", valores: p.meses.map((m) => m.caixa_previsto) }, { nome: "Recebido", valores: p.meses.map((m) => m.caixa_recebido) }], formatar: brl, compacto: mil })
        : h("p", { class: "result-empty" }, "Ainda não há pedidos com parcelas no VEOS. O gráfico aparece quando o primeiro pedido for criado em Operação → Pedidos.")),
    "dashboard-card--cash");

  const faturado = dashboardCard(
    panel({ title: "Faturamento por mês", subtitle: "Notas fiscais registradas no VEOS e faturas do Zoho Books." },
      p.tem_nf || p.tem_faturas_zoho
        ? barrasMensais({ titulo: "Faturado por mês", meses, series: [{ nome: "Faturado", valores: p.meses.map((m) => soma([m.nf_total, m.faturas_zoho_total])) }], formatar: brl, compacto: mil })
        : h("p", { class: "result-empty" }, "Lacuna: nenhuma nota fiscal registrada no VEOS e o Zoho Books não tem faturas. O faturamento passa a aparecer quando as NFs dos pedidos forem registradas.")),
    "dashboard-card--billing");

  const pedidos = dashboardCard(
    panel({ title: "Pedidos", subtitle: "Pedidos não cancelados · últimos 12 meses." },
      p.pedidos.qtd
        ? h("div", { class: "dashboard-order-summary" },
          h("div", { class: "dashboard-order-number" }, String(p.pedidos.qtd)),
          h("div", { class: "dashboard-order-details" },
            h("strong", null, brl(p.pedidos.valor)),
            h("span", null, "Valor total dos pedidos"),
            h("p", null, "Margem bruta orçada: ", p.pedidos.margem_bruta_orcada_pct === null ? "— (sem custo informado)" : h("strong", null, `${String(p.pedidos.margem_bruta_orcada_pct).replace(".", ",")}%`), ` · ${p.pedidos.qtd_com_custo} com custo`),
            h("p", { class: "field-hint" }, "Preço menos custo direto, sobre o preço. Não equivale à margem de contribuição oficial da Política V1; a margem realizada depende de compras e horas (backlog P1.9).")))
        : h("p", { class: "result-empty" }, "Nenhum pedido criado no VEOS ainda.")),
    "dashboard-card--orders");

  const crm = dashboardCard(
    panel({ title: "Funil do CRM", subtitle: "Negócios abertos e fechados no Zoho CRM, por etapa." },
      p.funil_crm.length
        ? table({ caption: "Negócios por etapa", head: ["Etapa", "Negócios", "Valor"], align: ["", "r", "r"],
          rows: p.funil_crm.map((f) => [f.etapa ?? "Sem etapa", String(f.qtd), f.valor === null ? "Não informado" : brl(f.valor)]) })
        : h("p", { class: "result-empty" }, "Nenhum negócio no CRM."),
      p.funil_crm.length && p.funil_crm.every((f) => f.valor === null) ? h("p", { class: "field-hint" }, "Os negócios do CRM estão sem valor (campo Amount vazio no Zoho).") : null),
    "dashboard-card--crm");

  const orcamentos = dashboardCard(
    panel({ title: "Orçamentos por situação", subtitle: "Distribuição dos orçamentos no Zoho Books · últimos 12 meses." },
      table({ caption: "Orçamentos", head: ["Situação", "Quantidade", "Total"], align: ["", "r", "r"],
        rows: p.orcamentos.map((o) => [SIT[o.status] ?? o.status, String(o.qtd), brl(o.total)]) })),
    "dashboard-card--budgets");

  const alertas = dashboardCard(
    panel({ title: "Alertas ativos por setor", subtitle: "Regras vivas, fluxo, Biblioteca e saúde do sistema." },
      alertasPorSetor.length
        ? h("ul", { class: "dashboard-alert-list" }, alertasPorSetor.map(([setor, sev]) =>
          h("li", { class: "dashboard-alert-item" },
            h("a", { href: `#/setor/${setor}` }, setorPorId[setor] ? `${setorPorId[setor].sigla} · ${setorPorId[setor].nome}` : setor),
            h("div", { class: "dashboard-alert-tags" },
              ["CRITICO", "ALTO", "MEDIO", "INFO"].filter((k) => sev[k]).map((k) => stamp(`${sev[k]} ${SEV_ROTULO[k]}`, SEV_TOM[k]))))))
        : h("p", { class: "notice notice-ok" }, "Nenhum alerta ativo.")),
    "dashboard-card--alerts");

  const graficos = h("section", { class: "dashboard-grid dashboard-grid--charts", "aria-label": "Gráficos financeiros" },
    vendas, caixa, faturado);
  const operacao = h("section", { class: "dashboard-grid dashboard-grid--operations", "aria-label": "Resumo operacional" },
    pedidos, crm);
  const controle = h("section", { class: "dashboard-grid dashboard-grid--control", "aria-label": "Acompanhamento e alertas" },
    orcamentos, alertas);

  root.append(
    h("div", { class: "dashboard-page" },
      introducao,
      indicadores,
      graficos,
      operacao,
      controle,
      method("Fontes, período e limites",
        `Período: ${p.de.split("-").reverse().join("/")} a ${p.ate.split("-").reverse().join("/")}.`,
        "Vendas e orçamentos: espelho do Zoho Books (sincronização automática). Funil: espelho do Zoho CRM. Pedidos, parcelas e notas fiscais: fluxo do VEOS.",
        "Valores sem dado aparecem como “—” ou como lacuna explicada; nada é estimado.")),
  );
}
