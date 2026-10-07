// COBRADO x O QUE DEVERIA: cada linha de um orcamento comparada com o preco pela Politica V1
// (P = C / [(1 - t)(1 - 2% - alvo) - v]). Produto abaixo do alvo sobe para o preco do alvo; produto no
// alvo ou acima fica; produto sem custo real e servico ficam como estao (servico se confere pelas horas).
// Usado pela tela Diagnostico e pelo CFO (simular_correcao_orcamento). Sem DOM.
import { faixa, margem, precoPolitica } from "./formacao_preco.js";

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * o = orcamento no formato das telas (linhas: nome, qtd, preco, total, tipo, custo, unidade, item_id?);
 * t = imposto sobre produto (%); v = comissao/RT/cartao do canal (%); alvo = 35 (meta) ou 30 (minimo);
 * custos = Map item_id -> custo mais confiavel (opcional; senao o custo do cadastro).
 */
export function corrigirOrcamento(o, { t, v = 0, alvo = 35, custos = null }) {
  if (t === null || t === undefined) return { erro: "LACUNA: sem alíquota não há preço pela Política" };
  const linhas = (o.linhas ?? []).map((l, i) => {
    const base = { ordem: l.ordem ?? i + 1, nome: l.nome, tipo: l.tipo, qtd: Number(l.qtd) || 0, unidade: l.unidade ?? null, preco: Number(l.preco) || 0, total: Number(l.total) || 0 };
    if (l.tipo === "service") return { ...base, situacao: "servico", novo_preco: base.preco, novo_total: base.total };
    if (l.tipo !== "goods") return { ...base, situacao: "sem_cadastro", novo_preco: base.preco, novo_total: base.total };
    const cadastro = Number(l.custo) > 1 ? Number(l.custo) : null;
    const custo = custos?.get?.(l.item_id) ?? cadastro;
    if (custo === null || custo === undefined) return { ...base, custo: null, situacao: "sem_custo", novo_preco: base.preco, novo_total: base.total };
    const meta = precoPolitica(custo, { t, v, alvo: 35 });
    const minimo = precoPolitica(custo, { t, v, alvo: 30 });
    const piso = precoPolitica(custo, { t, v, alvo: 25 });
    const alvoP = alvo === 30 ? minimo : meta;
    const m = margem(base.preco, custo, { t, v });
    const sobe = base.preco < alvoP;
    const novo = sobe ? alvoP : base.preco;
    return {
      ...base, custo: r2(custo), custo_cadastro: cadastro, multiplicador: r2(base.preco / custo), margem_atual: m?.pct ?? null, faixa_atual: m ? faixa(m.pct) : "NAO RESOLVIDO",
      preco_meta_35: meta, preco_minimo_30: minimo, preco_piso_25: piso,
      situacao: sobe ? "abaixo" : "ok", novo_preco: novo, novo_total: r2(novo * base.qtd), diferenca: r2((novo - base.preco) * base.qtd),
    };
  });
  const totalAtual = r2(linhas.reduce((s, l) => s + l.total, 0));
  const totalNovo = r2(linhas.reduce((s, l) => s + l.novo_total, 0));
  return {
    alvo, imposto_pct: t, despesas_canal_pct: v, linhas,
    total_atual: totalAtual, total_novo: totalNovo, diferenca: r2(totalNovo - totalAtual), diferenca_pct: totalAtual > 0 ? Math.round((totalNovo / totalAtual - 1) * 1000) / 10 : null,
    abaixo: linhas.filter((l) => l.situacao === "abaixo").length, sem_custo: linhas.filter((l) => l.situacao === "sem_custo").length,
  };
}
