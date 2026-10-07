// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/base_orcamentos.js - nao editar a mao.
// BASE DE PRECOS: qualidade de TODOS os orcamentos do Zoho (aceitos, enviados e rascunhos), versoes do
// mesmo cliente contadas uma vez. Decisao do fundador (06/10/2026): os orcamentos antigos sao da epoca sem
// controle e nao viram pedido; servem de BASE para saber se o preco estava certo. Mesma analise da tela
// Diagnostico (analise_orcamento.js) aplicada a cada projeto. Sem DOM.
import { analisarOrcamento } from "./analise_orcamento.js";
import { projetos } from "./estoque_sugerido.js";

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const pct = (n, d) => (d > 0 ? r1((n / d) * 100) : null);

/** base = parametros da analise (tProduto, tServico, v, custoHora, produtividade...); tempos = catalogo de tempos. */
export function qualidadeDaBase(orcamentos, base, tempos, { desde = null, ate = null, situacoes = null } = {}) {
  const lista = projetos(orcamentos).filter((o) => (!desde || o.data >= desde) && (!ate || o.data <= ate) && (!situacoes || situacoes.includes(o.status)) && Number(o.total) > 0);
  const realista = base.produtividade !== null && base.produtividade !== undefined && base.produtividade >= 90 ? { ...base, produtividade: 65 } : base;
  const linhas = lista.map((o) => {
    const a = analisarOrcamento(o, base, tempos);
    const ar = realista === base ? a : analisarOrcamento(o, realista, tempos);
    const naoAprovados = a.produtos.abaixo.filter((x) => x.mc !== null && x.mc < 25).length;
    return {
      numero: o.numero, data: o.data, situacao: o.status, cliente: o.cliente, total: r2(Number(o.total)),
      produtos: a.produtos.venda, multiplicador: a.produtos.multiplicador, margem_produtos: a.produtos.mc?.pct ?? null,
      itens_abaixo_30: a.produtos.abaixo.length, itens_abaixo_25: naoAprovados, margem_total: a.mcTotal?.pct ?? null,
      horas_cobradas: a.mo.horasCobradas, horas_calculadas: ar.mo.horasReais,
      sem_condicao: !o.condicao_pagamento, sem_imposto: !(Number(o.imposto) > 0), desconto: r2((Number(o.desconto) || 0) + Math.max(0, -(Number(o.ajuste) || 0))),
    };
  });
  const n = linhas.length;
  const total = r2(linhas.reduce((s, l) => s + l.total, 0));
  const comMargem = linhas.filter((l) => l.margem_produtos !== null);
  const vendaProd = linhas.reduce((s, l) => s + (l.produtos || 0), 0);
  const multMedio = (() => { const ls = linhas.filter((l) => l.multiplicador); const v = ls.reduce((s, l) => s + l.produtos, 0), c = ls.reduce((s, l) => s + l.produtos / l.multiplicador, 0); return c > 0 ? r2(v / c) : null; })();
  const hc = linhas.reduce((s, l) => s + (l.horas_cobradas || 0), 0), hr = linhas.filter((l) => l.horas_cobradas).reduce((s, l) => s + (l.horas_calculadas || 0), 0);
  const porSituacao = {};
  for (const l of linhas) porSituacao[l.situacao] = (porSituacao[l.situacao] ?? 0) + 1;
  return {
    resumo: {
      projetos: n, total, por_situacao: porSituacao, venda_de_produtos: r2(vendaProd), multiplicador_medio_produtos: multMedio,
      pct_produtos_abaixo_de_30: pct(comMargem.filter((l) => l.margem_produtos < 30).length, comMargem.length),
      pct_com_item_nao_aprovado_25: pct(linhas.filter((l) => l.itens_abaixo_25 > 0).length, n),
      pct_margem_total_abaixo_de_30: pct(linhas.filter((l) => l.margem_total !== null && l.margem_total < 30).length, linhas.filter((l) => l.margem_total !== null).length),
      horas_cobradas: r1(hc), horas_calculadas_realistas: r1(hr), horas_cobradas_sobre_calculadas_pct: hr > 0 ? r1((hc / hr) * 100) : null,
      pct_sem_condicao_de_pagamento: pct(linhas.filter((l) => l.sem_condicao).length, n),
      pct_sem_imposto_no_preco: pct(linhas.filter((l) => l.sem_imposto).length, n),
      produtividade_usada: realista.produtividade ?? null,
    },
    linhas: linhas.sort((a, b) => String(b.data).localeCompare(String(a.data))),
    piores: [...linhas].filter((l) => l.margem_produtos !== null).sort((a, b) => a.margem_produtos - b.margem_produtos).slice(0, 10),
  };
}
