// PAINEL EXECUTIVO (Visao geral, direcao e financas): vendas aceitas, faturado, caixa previsto x
// recebido, pedidos com margem bruta orcada, funil do CRM, orcamentos por situacao e alertas.
// Dado ausente aparece como lacuna explicada, nunca como zero.
import { api } from "../../data/api.js";
import { formatBRL } from "../../domain/format.js";
import { h, method, panel, stamp, stat, table } from "../dom.js";
import { barrasMensais } from "../grafico.js";
import { resumoPainel, soma } from "../../domain/painel.js";

const SIT = { accepted: "Aceitos", draft: "Rascunho", sent: "Enviados", declined: "Recusados", expired: "Expirados", invoiced: "Faturados" };

import { SEV_ROTULO, SEV_TOM, setorPorId } from "../componentes.js";

const brl = (v) => (v === null || v === undefined ? "—" : formatBRL(String(Number(v).toFixed(2))));
const mil = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".", ",")} mi` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(Math.round(v)));
export async function telaPainel(root) {
  const p = await api.painel();
  const r = resumoPainel(p);
  const meses = p.meses.map((m) => m.mes);
  const alertasPorSetor = Object.entries(p.alertas.reduce((acc, a) => {
    (acc[a.setor] ??= {})[a.severidade] = a.qtd;
    return acc;
  }, {}));

  root.append(
    h("div", { class: "grid-4" },
      stat("Vendas aceitas (12 meses)", brl(r.vendas12), `orçamentos aceitos no Zoho Books · últimos 3 meses: ${brl(r.vendas3)}`),
      stat("Faturado (12 meses)", r.faturado12 === null ? "sem dados" : brl(r.faturado12), p.tem_nf || p.tem_faturas_zoho ? "notas registradas no VEOS + faturas do Zoho" : "nenhuma NF registrada e o Books não tem faturas"),
      stat("A receber", brl(p.a_receber?.aberto), p.a_receber?.vencido ? `vencido: ${brl(p.a_receber.vencido)}` : p.tem_parcelas ? "nada vencido" : "sem parcelas de pedidos"),
      stat("Conversão de orçamentos", r.conversao === null ? "—" : `${r.conversao}%`, r.totalFechados ? `aceitos ÷ (aceitos + recusados + expirados), ${r.totalFechados} decididos em 12 meses` : "sem orçamentos decididos")),
    panel({ title: "Vendas aceitas por mês", subtitle: "Soma dos orçamentos aceitos no Zoho Books (data do orçamento)." },
      barrasMensais({ titulo: "Vendas aceitas por mês", meses, series: [{ nome: "Vendas aceitas", valores: p.meses.map((m) => m.vendas_total) }], formatar: brl, compacto: mil })),
    panel({ title: "Caixa: previsto × recebido", subtitle: "Parcelas dos pedidos do VEOS: previsto pelo vencimento, recebido pela data do recebimento." },
      p.tem_parcelas
        ? barrasMensais({ titulo: "Caixa previsto e recebido por mês", meses, series: [{ nome: "Previsto", valores: p.meses.map((m) => m.caixa_previsto) }, { nome: "Recebido", valores: p.meses.map((m) => m.caixa_recebido) }], formatar: brl, compacto: mil })
        : h("p", { class: "result-empty" }, "Ainda não há pedidos com parcelas no VEOS. O gráfico aparece quando o primeiro pedido for criado (Operação → Pedidos).")),
    panel({ title: "Faturado por mês", subtitle: "Notas fiscais registradas no VEOS (emissão manual) e faturas do Zoho Books." },
      p.tem_nf || p.tem_faturas_zoho
        ? barrasMensais({ titulo: "Faturado por mês", meses, series: [{ nome: "Faturado", valores: p.meses.map((m) => soma([m.nf_total, m.faturas_zoho_total])) }], formatar: brl, compacto: mil })
        : h("p", { class: "result-empty" }, "Lacuna: nenhuma nota fiscal registrada no VEOS e o Zoho Books não tem faturas. O faturamento passa a aparecer quando as NFs dos pedidos forem registradas.")),
    h("div", { class: "grid-2" },
      panel({ title: "Pedidos (12 meses)", subtitle: "Pedidos não cancelados." },
        p.pedidos.qtd
          ? h("div", { class: "stack-s" },
            h("p", null, `${p.pedidos.qtd} pedido(s) · ${brl(p.pedidos.valor)}`),
            h("p", null, "Margem bruta orçada: ", p.pedidos.margem_bruta_orcada_pct === null ? "— (sem custo informado)" : h("strong", null, `${String(p.pedidos.margem_bruta_orcada_pct).replace(".", ",")}%`),
              ` (${p.pedidos.qtd_com_custo} com custo)`),
            h("p", { class: "field-hint" }, "Preço − custo direto, sobre o preço. Não é a margem de contribuição oficial da Política V1 (que desconta impostos, comissão e provisão); a margem realizada depende de compras e horas (backlog P1.9)."))
          : h("p", { class: "result-empty" }, "Nenhum pedido criado no VEOS ainda.")),
      panel({ title: "Funil do CRM", subtitle: "Negócios abertos e fechados no Zoho CRM, por etapa." },
        p.funil_crm.length
          ? table({ caption: "Negócios por etapa", head: ["Etapa", "Negócios", "Valor"], align: ["", "r", "r"],
            rows: p.funil_crm.map((f) => [f.etapa ?? "sem etapa", String(f.qtd), f.valor === null ? "não informado" : brl(f.valor)]) })
          : h("p", { class: "result-empty" }, "Nenhum negócio no CRM."),
        p.funil_crm.length && p.funil_crm.every((f) => f.valor === null) ? h("p", { class: "field-hint" }, "Os negócios do CRM estão sem valor (campo Amount vazio no Zoho).") : null)),
    h("div", { class: "grid-2" },
      panel({ title: "Orçamentos por situação (12 meses)", subtitle: "Zoho Books." },
        table({ caption: "Orçamentos", head: ["Situação", "Qtd.", "Total"], align: ["", "r", "r"], rows: p.orcamentos.map((o) => [SIT[o.status] ?? o.status, String(o.qtd), brl(o.total)]) })),
      panel({ title: "Alertas ativos por setor", subtitle: "Regras vivas, fluxo, Biblioteca e saúde do sistema." },
        alertasPorSetor.length
          ? h("ul", { class: "list-plain stack-s" }, alertasPorSetor.map(([setor, sev]) => h("li", { class: "row" },
            h("a", { href: `#/setor/${setor}` }, setorPorId[setor] ? `${setorPorId[setor].sigla} · ${setorPorId[setor].nome}` : setor),
            ["CRITICO", "ALTO", "MEDIO", "INFO"].filter((k) => sev[k]).map((k) => stamp(`${sev[k]} ${SEV_ROTULO[k]}`, SEV_TOM[k])))))
          : h("p", { class: "notice notice-ok" }, "Nenhum alerta ativo."))),
    method("Fontes e limites", `Período: ${p.de.split("-").reverse().join("/")} a ${p.ate.split("-").reverse().join("/")}.`,
      "Vendas e orçamentos: espelho do Zoho Books (sincronização automática). Funil: espelho do Zoho CRM. Pedidos, parcelas e NF: fluxo do VEOS.",
      "Valores sem dado aparecem como “—” ou como lacuna explicada; nada é estimado."),
  );
}
