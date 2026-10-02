// Formulario do CFO: o que o fundador precisa informar para o preco correto dos produtos, o preco
// da mao de obra e o diagnostico de pedidos, impostos e dividas. Cada secao e gravada a parte
// (historico preservado no banco). Daqui saem os parametros de preco; o que faltar vira lacuna.
import { custoHora } from "./formacao_preco.js";

const SN = [["sim", "Sim"], ["nao", "Não"], ["nao_sei", "Não sei"]];

export const SECOES = [
  {
    id: "impostos", titulo: "1. Impostos e contador",
    porque: "Imposto sai de cada real vendido. Sem a alíquota certa, o preço fica errado e o imposto é pago com o lucro (ou vira dívida). A Receita mostra a VOICE no Simples desde 01/01/2024 com exclusão registrada em 31/12/2026: o preço de 2027 depende do novo regime.",
    campos: [
      { id: "contador", rotulo: "Contador ou escritório (nome e contato)", tipo: "texto" },
      { id: "motivo_exclusao", rotulo: "Por que a exclusão do Simples em 31/12/2026? (débitos, faturamento, outro)", tipo: "area" },
      { id: "regime_2027", rotulo: "Regime a partir de 2027 (confirmado pelo contador)", tipo: "opcao", opcoes: [["presumido", "Lucro Presumido"], ["real", "Lucro Real"], ["simples", "Volta ao Simples (regularização)"], ["nao_sei", "Ainda não sei"]] },
      { id: "anexo_servicos", rotulo: "Anexo do Simples usado nos serviços (veja a guia do DAS)", tipo: "opcao", opcoes: [["III", "Anexo III"], ["IV", "Anexo IV"], ["V", "Anexo V"], ["nao_sei", "Não sei"]] },
      { id: "faturamento_12m", rotulo: "Faturamento dos últimos 12 meses (RBT12 da guia do DAS)", tipo: "moeda" },
      { id: "aliquota_produto_pct", rotulo: "Alíquota efetiva sobre venda de produto hoje (%)", tipo: "pct", ajuda: "Peça ao contador: imposto pago ÷ faturamento de produto." },
      { id: "aliquota_servico_pct", rotulo: "Alíquota efetiva sobre serviço hoje (%)", tipo: "pct" },
      { id: "aliquota_produto_2027_pct", rotulo: "Alíquota sobre produto em 2027, com ICMS (%)", tipo: "pct" },
      { id: "aliquota_servico_2027_pct", rotulo: "Alíquota sobre serviço em 2027, com ISS (%)", tipo: "pct" },
      { id: "inss_fora_das", rotulo: "Paga INSS patronal (20% da folha e pró-labore) fora do DAS?", tipo: "opcao", opcoes: SN },
      { id: "nf_produto", rotulo: "Emite nota fiscal de venda de produto?", tipo: "opcao", opcoes: [["sempre", "Sempre"], ["as_vezes", "Às vezes"], ["nunca", "Nunca"]] },
      { id: "nf_servico", rotulo: "Emite nota fiscal de serviço?", tipo: "opcao", opcoes: [["sempre", "Sempre"], ["as_vezes", "Às vezes"], ["nunca", "Nunca"]] },
    ],
  },
  {
    id: "compras", titulo: "2. Compras e importação",
    porque: "O custo real do produto é o que chega na sua mão: preço + frete + impostos de importação + perdas. Nos pedidos do AliExpress o total pago é, em média, 1,45× o preço unitário da planilha.",
    campos: [
      { id: "comprador", rotulo: "As compras no AliExpress são feitas no CPF ou no CNPJ?", tipo: "opcao", opcoes: [["cpf", "CPF (pessoa física)"], ["cnpj", "CNPJ da VOICE"], ["ambos", "Os dois"]] },
      { id: "preco_inclui_impostos", rotulo: "O \"preço unitário pago\" da planilha já inclui os impostos de importação?", tipo: "opcao", opcoes: SN },
      { id: "fator_manual", rotulo: "Se souber: quanto o produto custa a mais até chegar (ex.: 1,45 = 45% a mais)", tipo: "numero", ajuda: "Em branco = o VEOS usa o fator medido nos seus pedidos." },
      { id: "cambio", rotulo: "Câmbio do dólar que você usa para conta (R$ por US$)", tipo: "numero", ajuda: "Para aplicar a regra do Remessa Conforme acima de US$ 50." },
      { id: "perdas_pct", rotulo: "Perdas: % de peças com defeito, extravio ou devolução", tipo: "pct" },
      { id: "pagamento_compras", rotulo: "Como paga as compras", tipo: "opcao", opcoes: [["cartao_parcelado", "Cartão parcelado"], ["cartao_vista", "Cartão à vista"], ["pix", "Pix/boleto à vista"], ["misto", "Misto"]] },
      { id: "cartao_titular", rotulo: "Cartão usado é da empresa ou pessoal?", tipo: "opcao", opcoes: [["pj", "Da empresa"], ["pf", "Pessoal"], ["ambos", "Os dois"]] },
      { id: "juros_compras_pct", rotulo: "Juros do parcelamento das compras (% ao mês)", tipo: "pct" },
      { id: "prazo_entrega_dias", rotulo: "Prazo médio de entrega das importações (dias)", tipo: "numero" },
      { id: "compra_antes_sinal", rotulo: "Costuma comprar o material antes de receber o sinal do cliente?", tipo: "opcao", opcoes: SN },
    ],
  },
  {
    id: "equipe", titulo: "3. Equipe e mão de obra",
    porque: "O preço da hora vem de quanto custa manter quem executa, dividido pelas horas que de fato viram serviço vendido. Hoje os serviços no Zoho têm custo R$ 1,00 (sem base) e a hora varia de R$ 180 a R$ 385.",
    campos: [
      { id: "pessoas", rotulo: "Quem executa (inclua você se vai para a obra)", tipo: "lista", campos: [
        { id: "nome", rotulo: "Nome / função", tipo: "texto" },
        { id: "vinculo", rotulo: "Vínculo", tipo: "opcao", opcoes: [["clt", "CLT"], ["pj", "PJ / prestador fixo"], ["diarista", "Diarista"], ["socio", "Sócio (pró-labore)"]] },
        { id: "valor", rotulo: "Salário, valor mensal ou diária (R$)", tipo: "moeda" },
        { id: "encargos_pct", rotulo: "Encargos CLT (%)", tipo: "pct", ajuda: "Contador informa (férias, 13º, FGTS, INSS...)." },
        { id: "beneficios", rotulo: "Benefícios por mês (R$)", tipo: "moeda" },
        { id: "dias_mes", rotulo: "Dias por mês (diarista)", tipo: "numero" },
        { id: "horas_mes", rotulo: "Horas trabalhadas por mês", tipo: "numero" },
        { id: "campo_pct", rotulo: "% do tempo em obra/serviço", tipo: "pct" },
      ] },
      { id: "produtividade_pct", rotulo: "Das horas em obra, quantas % são de serviço vendido? (tira deslocamento, espera, retrabalho)", tipo: "pct" },
      { id: "veiculo_mes", rotulo: "Veículo por mês: combustível, manutenção, seguro, parcela (R$)", tipo: "moeda" },
      { id: "ferramentas_mes", rotulo: "Ferramentas, EPI e consumíveis por mês (R$)", tipo: "moeda" },
      { id: "terceiros", rotulo: "Terceiros (eletricista, gesseiro...): quem e quanto cobram", tipo: "area" },
      { id: "tempos", rotulo: "Tempo médio por serviço (para preço por ponto)", tipo: "lista", campos: [
        { id: "servico", rotulo: "Serviço (ex.: instalar interruptor, configurar cena, instalar AP)", tipo: "texto" },
        { id: "unidade", rotulo: "Unidade (ponto, ambiente, equipamento)", tipo: "texto" },
        { id: "horas", rotulo: "Horas por unidade", tipo: "numero" },
      ] },
    ],
  },
  {
    id: "fixos", titulo: "4. Custos fixos do mês",
    porque: "A margem de cada venda precisa pagar a estrutura. Somando os fixos, o VEOS calcula quanto precisa vender por mês para não fechar no vermelho.",
    campos: [
      { id: "itens", rotulo: "Custos fixos mensais", tipo: "lista", campos: [
        { id: "descricao", rotulo: "Descrição (aluguel, showroom, contador, sistemas, internet, marketing...)", tipo: "texto" },
        { id: "valor", rotulo: "Valor mensal (R$)", tipo: "moeda" },
      ] },
      { id: "pro_labore", rotulo: "Seu pró-labore / retirada mensal (R$)", tipo: "moeda" },
      { id: "retirada_real", rotulo: "Quanto você realmente retirou por mês nos últimos 6 meses (média, R$)", tipo: "moeda" },
    ],
  },
  {
    id: "vendas", titulo: "5. Vendas e recebimento",
    porque: "Taxa de cartão, comissão e indicação saem do preço de cada venda. Se não estão no preço, saem do seu lucro.",
    campos: [
      { id: "taxa_cartao_pct", rotulo: "Taxa média do cartão/maquininha nas vendas (%)", tipo: "pct" },
      { id: "vendas_cartao_pct", rotulo: "% das vendas recebidas no cartão", tipo: "pct" },
      { id: "comissao_vendedor_pct", rotulo: "Comissão de vendedor (%)", tipo: "pct" },
      { id: "paga_indicacao", rotulo: "Paga comissão ou RT a arquitetos/indicadores?", tipo: "opcao", opcoes: SN },
      { id: "indicacao_pct", rotulo: "Se paga: quanto (%)", tipo: "pct", ajuda: "O CAU proíbe o arquiteto de receber RT (BIB-0078): isto é para diagnóstico." },
      { id: "condicao_usual", rotulo: "Condição de pagamento que você costuma dar ao cliente", tipo: "area" },
      { id: "garantia_meses", rotulo: "Garantia oferecida (meses)", tipo: "numero" },
      { id: "visitas_garantia", rotulo: "Visitas de garantia/suporte por obra (média)", tipo: "numero" },
    ],
  },
  {
    id: "dividas", titulo: "6. Dívidas e parcelamentos",
    porque: "Para montar o plano de saída: quanto entra de margem por mês, quanto sai em parcelas e qual dívida custa mais caro (juros) ou trava a empresa (imposto).",
    campos: [
      { id: "lista", rotulo: "Dívidas", tipo: "lista", campos: [
        { id: "credor", rotulo: "Credor (Receita, PGFN, banco, cartão, fornecedor...)", tipo: "texto" },
        { id: "tipo", rotulo: "Tipo", tipo: "opcao", opcoes: [["simples", "Simples/DAS"], ["inss", "INSS"], ["iss", "ISS / prefeitura"], ["outro_imposto", "Outro imposto"], ["cartao", "Cartão (compras parceladas)"], ["emprestimo", "Empréstimo/financiamento"], ["fornecedor", "Fornecedor"], ["pessoal", "Pessoal do sócio"], ["outro", "Outro"]] },
        { id: "saldo", rotulo: "Saldo devedor hoje (R$)", tipo: "moeda" },
        { id: "parcela", rotulo: "Valor da parcela (R$)", tipo: "moeda" },
        { id: "parcelas_restantes", rotulo: "Parcelas restantes", tipo: "numero" },
        { id: "juros_pct", rotulo: "Juros (% ao mês)", tipo: "pct" },
        { id: "atraso", rotulo: "Está em atraso?", tipo: "opcao", opcoes: [["nao", "Não"], ["sim", "Sim"]] },
      ] },
      { id: "caixa_hoje", rotulo: "Saldo em conta hoje, somando todas (R$)", tipo: "moeda" },
      { id: "a_receber", rotulo: "Total a receber de clientes (R$)", tipo: "moeda" },
    ],
  },
  {
    id: "pedidos", titulo: "7. O que aconteceu nos pedidos",
    porque: "O Zoho só tem os orçamentos: não há faturas, recebimentos nem contas lançadas, e os 85 orçamentos de 2026 estão todos em rascunho. Para saber o que fechou e a margem real de cada obra preciso do que foi recebido e do que custou a mais.",
    campos: [{ id: "por_orcamento", rotulo: "Por orçamento (aceitos e rascunhos desde 2025)", tipo: "orcamentos", campos: [
      { id: "situacao", rotulo: "Situação", tipo: "opcao", opcoes: [["nao_fechou", "Não fechou"], ["concluida", "Fechou · obra concluída"], ["andamento", "Fechou · em andamento"], ["parada", "Fechou · parada"], ["cancelada", "Fechou e foi cancelada"]] },
      { id: "recebido", rotulo: "Recebido (R$)", tipo: "moeda" },
      { id: "a_receber", rotulo: "Falta receber (R$)", tipo: "moeda" },
      { id: "custo_extra", rotulo: "Custo a mais (R$)", tipo: "moeda" },
      { id: "obs", rotulo: "O que deu errado", tipo: "texto" },
    ] }],
  },
];

const vazio = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
const num = (v) => (vazio(v) || Number.isNaN(Number(String(v).replace(",", "."))) ? null : Number(String(v).replace(",", ".")));

/** Quantos campos de cada secao foram respondidos. */
export function progresso(respostas = {}) {
  return SECOES.map((s) => {
    const d = respostas[s.id]?.dados ?? {};
    const feitos = s.campos.filter((c) => !vazio(d[c.id])).length;
    return { id: s.id, titulo: s.titulo, feitos, total: s.campos.length, em: respostas[s.id]?.em ?? null, por: respostas[s.id]?.autor_nome ?? null };
  });
}

/** Normaliza o texto digitado ("1.234,56" -> 1234.56) nas chaves numericas. */
export function numeroBR(v) {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().replace(/\s|R\$|%/g, "");
  const n = Number(s.includes(",") || /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s); // "4.000" = quatro mil
  return Number.isFinite(n) ? n : null;
}

/**
 * Parametros de preco a partir das respostas. Cada um vem com a origem; o que faltar fica null e
 * entra em `lacunas` (a tela mostra e oferece simulacao rotulada, nunca valor inventado em silencio).
 */
export function parametros(respostas = {}) {
  const g = (s, c) => respostas[s]?.dados?.[c];
  const n = (s, c) => numeroBR(g(s, c));
  const lacunas = [];
  const tProduto = n("impostos", "aliquota_produto_pct");
  const tServico = n("impostos", "aliquota_servico_pct");
  if (tProduto === null) lacunas.push("Alíquota sobre produto (contador)");
  if (tServico === null) lacunas.push("Alíquota sobre serviço (contador)");
  const cartao = n("vendas", "taxa_cartao_pct"), parteCartao = n("vendas", "vendas_cartao_pct");
  const comissao = n("vendas", "comissao_vendedor_pct") ?? 0;
  const indic = g("vendas", "paga_indicacao") === "sim" ? n("vendas", "indicacao_pct") ?? 0 : 0;
  if (cartao === null || parteCartao === null) lacunas.push("Taxa e participação do cartão nas vendas");
  const v = Math.round(((cartao ?? 0) * (parteCartao ?? 0) / 100 + comissao + indic) * 100) / 100;
  const fatorManual = n("compras", "fator_manual");
  const incluiImp = g("compras", "preco_inclui_impostos");
  const pessoas = (g("equipe", "pessoas") ?? []).map((p) => ({ ...p, valor: numeroBR(p.valor), encargos_pct: numeroBR(p.encargos_pct), beneficios: numeroBR(p.beneficios), dias_mes: numeroBR(p.dias_mes), horas_mes: numeroBR(p.horas_mes), campo_pct: numeroBR(p.campo_pct) }));
  const operacao = (n("equipe", "veiculo_mes") ?? 0) + (n("equipe", "ferramentas_mes") ?? 0);
  const hora = custoHora({ equipe: pessoas, operacao, produtividade: n("equipe", "produtividade_pct") });
  if (hora.custoHora === null) lacunas.push("Custo da hora (equipe e produtividade)");
  const fixosItens = g("fixos", "itens") ?? [];
  const fixos = fixosItens.length ? fixosItens.reduce((a, x) => a + (numeroBR(x.valor) ?? 0), 0) : null;
  if (fixos === null) lacunas.push("Custos fixos do mês");
  const dividas = g("dividas", "lista") ?? [];
  return {
    tProduto, tServico, v, cartaoInformado: cartao !== null,
    fator: { manual: fatorManual, incluiImpostos: incluiImp ?? null, cambio: n("compras", "cambio") },
    perdas: n("compras", "perdas_pct") ?? 0,
    tProduto2027: n("impostos", "aliquota_produto_2027_pct"), tServico2027: n("impostos", "aliquota_servico_2027_pct"),
    rbt12: n("impostos", "faturamento_12m"), anexoServicos: g("impostos", "anexo_servicos") ?? null,
    hora, fixos, proLabore: n("fixos", "pro_labore") ?? 0,
    parcelasMes: Math.round(dividas.reduce((a, d) => a + (numeroBR(d.parcela) ?? 0), 0) * 100) / 100,
    saldoDividas: Math.round(dividas.reduce((a, d) => a + (numeroBR(d.saldo) ?? 0), 0) * 100) / 100,
    dividas: dividas.length,
    lacunas,
  };
}
