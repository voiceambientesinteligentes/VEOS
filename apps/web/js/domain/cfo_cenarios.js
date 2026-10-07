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

/** Parametros do diagnostico: aliquotas do formulario; sem elas, a simulacao (adotada pelo fundador ou so simulada, sempre avisada). */
export function diagnosticoParams(p, sim) {
  const base = { v: p.v ?? 0, custoHora: p.hora?.custoHora ?? null };
  if (p.tProduto !== null && p.tServico !== null) return { params: { ...base, tProduto: p.tProduto, tServico: p.tServico }, simulado: false, adotada: false, rotulo: "INFORMADA", texto: null };
  if (sim) {
    const aliq = `Simples Anexo I ${String(sim.produto).replace(".", ",")}% (produto) e Anexo III ${String(sim.servico).replace(".", ",")}% (serviço), faixa pelo faturamento de 12 meses no Zoho`;
    return {
      params: { ...base, tProduto: p.tProduto ?? sim.produto, tServico: p.tServico ?? sim.servico },
      simulado: true, adotada: Boolean(p.simulacaoAdotada), rotulo: p.simulacaoAdotada ? "ADOTADA" : "SIMULAÇÃO",
      texto: p.simulacaoAdotada ? `Impostos ADOTADOS pelo fundador até o contador confirmar: ${aliq}.` : `MC estimada com SIMULAÇÃO de impostos: ${aliq}. Confirme com o contador.`,
    };
  }
  return { params: { ...base, tProduto: null, tServico: null }, simulado: false, adotada: false, rotulo: "LACUNA", texto: null };
}
