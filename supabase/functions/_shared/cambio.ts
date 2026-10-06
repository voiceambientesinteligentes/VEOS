// Dolar PTAX do Banco Central (API Olinda, publica e gratuita). Usado pela tela de precos do CFO e
// pelo motor de IA (custo no Brasil hoje). Falha da API vira lista vazia com aviso, nunca excecao.
const mdy = (d: Date) => `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}-${d.getUTCFullYear()}`;

/** Serie diaria [{data, venda, compra}] desde a data (max. 2 anos; sem data, 45 dias). */
export async function serieDolar(desde: string | null) {
  const fim = new Date();
  const limite = Date.now() - 730 * 864e5;
  const pedido = desde && /^\d{4}-\d{2}-\d{2}$/.test(desde) ? Math.max(Date.parse(desde), limite) : Date.now() - 45 * 864e5;
  const ini = new Date(pedido);
  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${mdy(ini)}'&@dataFinalCotacao='${mdy(fim)}'&$top=800&$format=json`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    const serie = (d.value ?? []).map((x: { cotacaoVenda: number; cotacaoCompra: number; dataHoraCotacao: string }) => ({ data: String(x.dataHoraCotacao).slice(0, 10), venda: x.cotacaoVenda, compra: x.cotacaoCompra }));
    return { serie, fonte: "Banco Central do Brasil · PTAX (API Olinda)", ok: serie.length > 0 };
  } catch (e) {
    return { serie: [] as { data: string; venda: number; compra: number }[], fonte: "Banco Central do Brasil · PTAX (API Olinda)", ok: false, erro: `cotação indisponível agora (${(e as Error).message})` };
  }
}
