// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/cfo_cenarios.js - nao editar a mao.
// Cenario de impostos do CFO quando o contador ainda nao informou as aliquotas: SIMULACAO rotulada
// pelo Simples Nacional (regime registrado na Receita ate 31/12/2026, BIB-0035), produto no Anexo I e
// servico no Anexo III (LC 123 art. 18 §5-B IX: instalacao e manutencao; BIB-0040 ainda em consulta),
// com o faturamento de 12 meses estimado pelos orcamentos aceitos no Zoho (BIB-0038, em consulta).
import { aliquotaSimples, PrecoError } from "./precificacao.js";

const pts = (h) => Number(h) / 100; // centesimos de ponto -> pontos

export function impostosSimulados(rbt12) {
  const valor = Number(rbt12?.valor);
  if (!Number.isFinite(valor) || valor < 0) return null;
  try {
    const c = BigInt(Math.round(valor * 100));
    const i = aliquotaSimples(c, "I"), iii = aliquotaSimples(c, "III");
    return { rbt12: valor, produto: pts(i.efetivaH), servico: pts(iii.efetivaH), faixaI: i.faixa, faixaIII: iii.faixa, inicio: rbt12.inicio ?? null, fim: rbt12.fim ?? null };
  } catch (e) {
    if (e instanceof PrecoError) return null;
    throw e;
  }
}

/** Parametros do diagnostico: aliquotas do formulario; sem elas, a simulacao (sempre avisada). */
export function diagnosticoParams(p, sim) {
  const base = { v: p.v ?? 0, custoHora: p.hora?.custoHora ?? null };
  if (p.tProduto !== null && p.tServico !== null) return { params: { ...base, tProduto: p.tProduto, tServico: p.tServico }, simulado: false, texto: null };
  if (sim) {
    return {
      params: { ...base, tProduto: p.tProduto ?? sim.produto, tServico: p.tServico ?? sim.servico },
      simulado: true,
      texto: `MC estimada com SIMULAÇÃO de impostos: Simples Anexo I ${String(sim.produto).replace(".", ",")}% (produto) e Anexo III ${String(sim.servico).replace(".", ",")}% (serviço), pelo faturamento estimado no Zoho. Confirme com o contador.`,
    };
  }
  return { params: { ...base, tProduto: null, tServico: null }, simulado: false, texto: null };
}
