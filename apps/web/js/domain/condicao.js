// Condicao de pagamento sugerida pelo CFO (Politica V1.1: exposicao de caixa limitada). O sinal cobre
// pelo menos o custo do material com folga de 10%, arredondado para cima em multiplos de 5%; o resto
// vai em etapas. Validade curta e dolar de referencia escritos; sem clausula de reajuste cambial
// (vinculo a moeda estrangeira com consumidor e, em regra, nulo: Lei 10.192/2001 e 14.286/2021).
// Texto comercial, nao juridico: contrato com advogado.

const teto5 = (v) => Math.ceil(v / 5) * 5;
const dataBR = (iso) => String(iso ?? "").slice(0, 10).split("-").reverse().join("/");

export function condicaoSugerida({ custoProdutos = 0, total, entradaMinima = 40, validadeDias = 7, ptax = null, hoje = new Date() }) {
  if (!(total > 0)) return { sinal: null, texto: "" };
  const cobre = teto5(((custoProdutos * 1.1) / total) * 100);
  const sinal = Math.min(90, Math.max(entradaMinima, cobre));
  const resto = 100 - sinal;
  const instalacao = resto > 10 ? teto5(resto * 0.6) : 0;
  const entrega = resto - instalacao;
  const validade = new Date(hoje.getTime() + validadeDias * 864e5).toISOString().slice(0, 10);
  const partes = [`${sinal}% de sinal na assinatura (cobre os equipamentos, comprados em até 48 h após o sinal)`];
  if (instalacao) partes.push(`${instalacao}% no início da instalação`);
  if (entrega) partes.push(`${entrega}% na entrega técnica`);
  const texto = `${partes.join("; ")}. Proposta válida até ${dataBR(validade)}${ptax ? `; equipamentos importados cotados com dólar de referência R$ ${String(ptax.venda).replace(".", ",")} (PTAX ${dataBR(ptax.data)}). Após a validade, os importados são recotados em nova proposta` : ""}.`;
  return { sinal, instalacao, entrega, validade, texto };
}
