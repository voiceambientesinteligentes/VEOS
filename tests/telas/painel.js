import { api } from "../js/data/api.js";
import { telaPainel } from "../js/ui/views/painel.js";
import { rodar } from "./_kit.js";

const cheio = location.hash === "#cheio";
const meses = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 10 + i, 1));
  const v = cheio ? (i % 4 === 0 ? null : 20000 + i * 9000) : null;
  return { mes: d.toISOString().slice(0, 7), vendas_qtd: v ? 2 : 0, vendas_total: v, nf_total: cheio && i > 8 ? 30000 : null, faturas_zoho_total: null,
    caixa_previsto: cheio && i > 7 ? 25000 + i * 1000 : null, caixa_recebido: cheio && i > 8 && i < 11 ? 20000 : null };
});
api.painel = async () => ({
  de: "2025-11-01", ate: "2026-10-01", meses, tem_faturas_zoho: false, tem_nf: cheio, tem_parcelas: cheio,
  pedidos: cheio ? { qtd: 3, valor: 90000, custo: 54000, qtd_com_custo: 3, margem_bruta_orcada_pct: 40, por_estado: { entregue: 2 } } : { qtd: 0, valor: null, custo: null, qtd_com_custo: 0, margem_bruta_orcada_pct: null, por_estado: {} },
  a_receber: cheio ? { aberto: 45000, vencido: 5000 } : { aberto: null, vencido: null },
  orcamentos: [{ status: "draft", qtd: 89, total: 900000 }, { status: "accepted", qtd: 45, total: 1200000 }, { status: "declined", qtd: 32, total: 500000 }, { status: "expired", qtd: 5, total: 10000 }],
  funil_crm: [{ etapa: "Análise de Necessidades", qtd: 1, valor: null, probabilidade: 30 }, { etapa: "Ganho", qtd: 1, valor: null, probabilidade: 100 }],
  alertas: cheio ? [{ setor: "financas", severidade: "ALTO", qtd: 2 }, { setor: "tecnologia", severidade: "MEDIO", qtd: 1 }] : [],
});

rodar(async (v) => {
  await telaPainel(v);
  const t = v.textContent;
  if (!t.includes("55%")) throw new Error("conversao 45/(45+32+5)=55% ausente");
  if (cheio) {
    if (v.querySelectorAll("svg.grafico").length !== 3) throw new Error("esperava 3 graficos");
    if (!v.querySelector(".grafico-legenda")) throw new Error("legenda do caixa ausente");
    if (!t.includes("40%")) throw new Error("margem bruta ausente");
  } else {
    if (v.querySelectorAll("svg.grafico").length !== 1) throw new Error("so vendas deveria ter grafico");
    if (!t.includes("Lacuna: nenhuma nota fiscal")) throw new Error("lacuna do faturamento ausente");
  }
});
