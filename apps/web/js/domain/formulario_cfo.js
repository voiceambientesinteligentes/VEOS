// Formulario do CFO (v2): o que o fundador precisa informar para o preco correto dos produtos, o preco
// da mao de obra, o diagnostico e o plano. Cada secao e gravada a parte (historico no banco).
// Campos do tipo "grupo" so subdividem a tela. Daqui saem os parametros; o que faltar vira lacuna.
import { custoHora } from "./formacao_preco.js";
import { ATIVIDADES, converterAntigos, DISPOSITIVOS, TECNOLOGIAS, UNIDADES } from "./tempos.js";

const SN = [["sim", "Sim"], ["nao", "Não"], ["nao_sei", "Não sei"]];
const grupo = (id, rotulo, ajuda) => ({ id, rotulo, tipo: "grupo", ajuda });

export const SECOES = [
  {
    id: "impostos", titulo: "1. Impostos e contador",
    porque: "Imposto sai de cada real vendido. Sem a alíquota certa, o preço fica errado e o imposto é pago com o lucro (ou vira dívida). A Receita mostra a VOICE no Simples desde 01/01/2024 com exclusão registrada em 31/12/2026: o preço de 2027 depende do novo regime. Leve esta seção ao contador.",
    campos: [
      grupo("g_contador", "Contador"),
      { id: "contador", rotulo: "Contador ou escritório (nome e contato)", tipo: "texto" },
      { id: "motivo_exclusao", rotulo: "Por que a exclusão do Simples em 31/12/2026? (débitos, faturamento, outro)", tipo: "area" },
      grupo("g_hoje", "Impostos hoje (Simples)"),
      { id: "anexo_servicos", rotulo: "Anexo do Simples usado nos serviços (veja a guia do DAS)", tipo: "opcao", opcoes: [["III", "Anexo III"], ["IV", "Anexo IV"], ["V", "Anexo V"], ["nao_sei", "Não sei"]] },
      { id: "faturamento_12m", rotulo: "Faturamento dos últimos 12 meses (RBT12 da guia do DAS)", tipo: "moeda" },
      { id: "aliquota_produto_pct", rotulo: "Alíquota efetiva sobre venda de produto hoje", tipo: "pct", ajuda: "Peça ao contador: imposto pago ÷ faturamento de produto." },
      { id: "aliquota_servico_pct", rotulo: "Alíquota efetiva sobre serviço hoje", tipo: "pct" },
      { id: "inss_fora_das", rotulo: "Paga INSS patronal (20% da folha e pró-labore) fora do DAS?", tipo: "opcao", opcoes: SN },
      grupo("g_2027", "A partir de 2027"),
      { id: "regime_2027", rotulo: "Regime a partir de 2027 (confirmado pelo contador)", tipo: "opcao", opcoes: [["presumido", "Lucro Presumido"], ["real", "Lucro Real"], ["simples", "Volta ao Simples (regularização)"], ["nao_sei", "Ainda não sei"]] },
      { id: "aliquota_produto_2027_pct", rotulo: "Alíquota sobre produto em 2027, com ICMS", tipo: "pct" },
      { id: "aliquota_servico_2027_pct", rotulo: "Alíquota sobre serviço em 2027, com ISS", tipo: "pct" },
      grupo("g_notas", "Notas fiscais e cadastro"),
      { id: "nf_produto", rotulo: "Emite nota fiscal de venda de produto?", tipo: "opcao", opcoes: [["sempre", "Sempre"], ["as_vezes", "Às vezes"], ["nunca", "Nunca"]] },
      { id: "nf_servico", rotulo: "Emite nota fiscal de serviço?", tipo: "opcao", opcoes: [["sempre", "Sempre"], ["as_vezes", "Às vezes"], ["nunca", "Nunca"]] },
      { id: "cnae_comercio", rotulo: "O contador confirmou CNAE de comércio para vender equipamentos?", tipo: "opcao", opcoes: SN },
    ],
  },
  {
    id: "compras", titulo: "2. Compras e importação",
    porque: "O custo real do produto é o que chega na sua mão: preço + frete + impostos de importação + perdas. O dólar do dia vem automático do Banco Central; aqui você define a folga para a variação até a compra.",
    campos: [
      grupo("g_origem", "Onde e como compra"),
      { id: "comprador", rotulo: "As compras no AliExpress são feitas no CPF ou no CNPJ?", tipo: "opcao", opcoes: [["cpf", "CPF (pessoa física)"], ["cnpj", "CNPJ da VOICE"], ["ambos", "Os dois"]] },
      { id: "preco_inclui_impostos", rotulo: "O \"preço unitário pago\" da planilha já inclui os impostos de importação?", tipo: "opcao", opcoes: SN, ajuda: "Confira num pedido do AliExpress: compare o preço unitário com o total pago (com impostos)." },
      { id: "fator_manual", rotulo: "Se souber: quanto o produto custa a mais até chegar (ex.: 1,20 = 20% a mais)", tipo: "numero", ajuda: "Em branco = o VEOS mede nos seus pedidos." },
      { id: "perdas_pct", rotulo: "Perdas: % de peças com defeito, extravio ou devolução", tipo: "pct" },
      { id: "prazo_entrega_dias", rotulo: "Prazo médio de entrega das importações (dias)", tipo: "numero" },
      grupo("g_dolar", "Dólar e momento da compra"),
      { id: "quando_compra", rotulo: "Quando você compra o material da obra?", tipo: "opcao", opcoes: [["antes_sinal", "Antes de receber o sinal"], ["apos_sinal", "Logo após o sinal"], ["inicio_obra", "Quando a obra vai começar"], ["varia", "Varia"]] },
      { id: "margem_cambial_pct", rotulo: "Folga sobre o dólar do dia para cobrir a variação até a compra", tipo: "pct", ajuda: "Pesquisa: 3 a 5% para quem compra em até 30 dias." },
      { id: "validade_proposta_dias", rotulo: "Validade que você dá às propostas (dias)", tipo: "numero" },
      grupo("g_pagamento", "Como paga as compras"),
      { id: "pagamento_compras", rotulo: "Forma de pagamento", tipo: "opcao", opcoes: [["cartao_parcelado", "Cartão parcelado"], ["cartao_vista", "Cartão à vista"], ["pix", "Pix/boleto à vista"], ["misto", "Misto"]] },
      { id: "cartao_titular", rotulo: "Cartão usado é da empresa ou pessoal?", tipo: "opcao", opcoes: [["pj", "Da empresa"], ["pf", "Pessoal"], ["ambos", "Os dois"]] },
      { id: "juros_compras_pct", rotulo: "Juros do parcelamento das compras (% ao mês)", tipo: "pct" },
      { id: "compra_antes_sinal", rotulo: "Costuma comprar o material antes de receber o sinal do cliente?", tipo: "opcao", opcoes: SN },
    ],
  },
  {
    id: "equipe", titulo: "3. Equipe e custo da hora",
    porque: "O preço da hora vem de quanto custa manter quem executa, dividido pelas horas que de fato viram serviço vendido. Pesquisa: em obra, só 60–75% das horas pagas viram execução (deslocamento, montagem, espera, retrabalho).",
    campos: [
      { id: "pessoas", rotulo: "Quem executa (inclua você enquanto estiver na função de técnico)", tipo: "lista", campos: [
        { id: "nome", rotulo: "Nome", tipo: "texto" },
        { id: "funcao", rotulo: "Função", tipo: "opcao", opcoes: [["tecnico", "Técnico"], ["auxiliar", "Auxiliar/ajudante"], ["eletricista", "Eletricista"], ["programador", "Programador/configuração"], ["socio_tecnico", "Sócio atuando como técnico"]] },
        { id: "vinculo", rotulo: "Vínculo", tipo: "opcao", opcoes: [["clt", "CLT"], ["pj", "PJ / prestador fixo"], ["diarista", "Diarista"], ["socio", "Sócio"]] },
        { id: "valor", rotulo: "Valor pago (R$)", tipo: "moeda", ajuda: "Salário mensal, valor mensal PJ ou valor da diária." },
        { id: "dias_mes", rotulo: "Dias trabalhados por mês", tipo: "numero" },
        { id: "horas_mes", rotulo: "Horas trabalhadas por mês", tipo: "numero" },
        { id: "campo_pct", rotulo: "% do tempo em obra/serviço", tipo: "pct" },
        { id: "encargos_pct", rotulo: "Encargos CLT", tipo: "pct", ajuda: "No Simples (Anexo III) ≈ 29% a 40% do salário; o contador confirma." },
        { id: "alimentacao", rotulo: "Alimentação por mês (R$)", tipo: "moeda" },
        { id: "transporte", rotulo: "Transporte por mês (R$)", tipo: "moeda" },
        { id: "beneficios", rotulo: "Outros benefícios por mês (R$)", tipo: "moeda" },
      ] },
      grupo("g_prod", "Produtividade"),
      { id: "produtividade_pct", rotulo: "Das horas em obra, quantas % são de execução? (o resto é deslocamento, montagem, espera, retrabalho)", tipo: "pct", ajuda: "Pesquisa: 60–75% em obra; 50% em visitas avulsas. Se não souber, deixe 65%." },
      grupo("g_operacao", "Custos da operação de campo (por mês)"),
      { id: "combustivel_mes", rotulo: "Combustível (R$)", tipo: "moeda" },
      { id: "manutencao_veiculo_mes", rotulo: "Manutenção e pneus (R$)", tipo: "moeda" },
      { id: "seguro_veiculo_mes", rotulo: "Seguro, IPVA e licenciamento (rateado por mês, R$)", tipo: "moeda" },
      { id: "parcela_veiculo_mes", rotulo: "Parcela ou aluguel do veículo (R$)", tipo: "moeda" },
      { id: "veiculo_mes", rotulo: "Total do veículo, se não souber separar (R$)", tipo: "moeda" },
      { id: "ferramentas_mes", rotulo: "Ferramentas, EPI e consumíveis (R$)", tipo: "moeda" },
      { id: "terceiros_lista", rotulo: "Terceiros que você chama", tipo: "lista", campos: [
        { id: "funcao", rotulo: "Função (eletricista, técnico, gesseiro...)", tipo: "texto" },
        { id: "valor", rotulo: "Valor (R$)", tipo: "moeda" },
        { id: "unidade", rotulo: "Por", tipo: "opcao", opcoes: [["dia", "dia"], ["hora", "hora"], ["servico", "serviço"]] },
      ] },
    ],
  },
  {
    id: "tempos", titulo: "4. Tempos de serviço (por dispositivo e atividade)",
    porque: "Com o tempo de cada atividade, o VEOS calcula as horas de qualquer orçamento a partir dos equipamentos (composição) e confere se as horas cobradas estão certas. Converti a sua lista antiga; confira dispositivo, atividade e tecnologia de cada linha. Sugestões da pesquisa entram marcadas para você confirmar.",
    campos: [
      { id: "itens", rotulo: "Atividades", tipo: "lista", campos: [
        { id: "descricao", rotulo: "Descrição", tipo: "texto" },
        { id: "dispositivo", rotulo: "Dispositivo", tipo: "opcao", opcoes: DISPOSITIVOS },
        { id: "atividade", rotulo: "Atividade", tipo: "opcao", opcoes: ATIVIDADES },
        { id: "tecnologia", rotulo: "Tecnologia", tipo: "opcao", opcoes: TECNOLOGIAS },
        { id: "unidade", rotulo: "Unidade", tipo: "opcao", opcoes: UNIDADES },
        { id: "tempo", rotulo: "Tempo", tipo: "numero" },
        { id: "unidade_tempo", rotulo: "Em", tipo: "opcao", opcoes: [["min", "minutos"], ["h", "horas"]] },
        { id: "origem", rotulo: "Origem", tipo: "opcao", opcoes: [["voce", "Medido por você"], ["pesquisa", "Sugestão da pesquisa (confirmar)"]] },
        { id: "obs", rotulo: "Observação", tipo: "texto" },
      ] },
      grupo("g_obra", "Por obra"),
      { id: "metros_por_ponto", rotulo: "Metros médios de cabo por ponto de rede/AV", tipo: "numero", ajuda: "Usado para transformar a metragem do orçamento em pontos. Sem resposta: 25 m." },
      { id: "comissionamento_pct", rotulo: "Testes e comissionamento finais (% sobre as horas)", tipo: "pct", ajuda: "Pesquisa: 8–15%." },
      { id: "entrega_horas", rotulo: "Entrega e treinamento do cliente (horas por obra)", tipo: "numero", ajuda: "Pesquisa: 1–4 h." },
    ],
  },
  {
    id: "voce", titulo: "5. Você, Fernando: retirada e papel na empresa",
    porque: "Hoje você retira conforme a necessidade e trabalha como técnico. Para o plano, separo três coisas: o que a função de técnico custa (vai para o custo da hora), o pró-labore de gestor (custo fixo) e o lucro (só depois de apurado).",
    campos: [
      grupo("g_hoje_voce", "Como é hoje"),
      { id: "retirada_media_real", rotulo: "Quanto você retira por mês, em média (R$)", tipo: "moeda" },
      { id: "retirada_minima", rotulo: "Mínimo pessoal que você precisa por mês para viver (R$)", tipo: "moeda" },
      { id: "horas_tecnico_semana", rotulo: "Horas por semana como técnico em obra", tipo: "numero" },
      { id: "horas_gestao_semana", rotulo: "Horas por semana em gestão (vendas, compras, financeiro)", tipo: "numero" },
      grupo("g_ideal", "O ideal"),
      { id: "salario_tecnico", rotulo: "Quanto vale a função de técnico que você faz (R$/mês)", tipo: "moeda", ajuda: "Pesquisa SC: técnico em automação R$ 2,6–3,1 mil; experiente em BC R$ 3,5–5 mil (hipótese)." },
      { id: "pro_labore_gestor", rotulo: "Pró-labore justo para você como gestor/CEO (R$/mês)", tipo: "moeda" },
      { id: "prazo_sair_operacao", rotulo: "Em quanto tempo quer deixar a função de técnico?", tipo: "opcao", opcoes: [["3m", "Até 3 meses"], ["6m", "Até 6 meses"], ["12m", "Até 12 meses"], ["sem_prazo", "Sem prazo"]] },
      { id: "quem_substitui", rotulo: "Quem poderia assumir a parte técnica (alguém da equipe ou contratar)?", tipo: "area" },
      { id: "dividendos", rotulo: "Lucros/dividendos já retirados ou a retirar (observações)", tipo: "area" },
    ],
  },
  {
    id: "fixos", titulo: "6. Custos fixos do mês",
    porque: "A margem de cada venda precisa pagar a estrutura. Separe por tipo para o plano mostrar onde cortar ou renegociar.",
    campos: [
      { id: "itens", rotulo: "Custos mensais", tipo: "lista", campos: [
        { id: "descricao", rotulo: "Descrição", tipo: "texto" },
        { id: "categoria", rotulo: "Tipo", tipo: "opcao", opcoes: [["ocupacao", "Aluguel/showroom/condomínio"], ["utilidades", "Luz, água, internet, telefone"], ["sistemas", "Sistemas e assinaturas"], ["contador", "Contador/jurídico"], ["marketing", "Marketing"], ["bancos", "Tarifas bancárias/maquininha"], ["administrativo", "Pessoal administrativo"], ["veiculo_adm", "Veículo administrativo"], ["outros", "Outros"]] },
        { id: "valor", rotulo: "Valor por mês (R$)", tipo: "moeda" },
        { id: "natureza", rotulo: "Fixo ou varia?", tipo: "opcao", opcoes: [["fixo", "Fixo"], ["variavel", "Varia"]] },
        { id: "contrato_ate", rotulo: "Contrato até (se houver)", tipo: "texto" },
      ] },
    ],
  },
  {
    id: "vendas", titulo: "7. Vendas e recebimento",
    porque: "Taxa de cartão, comissão e indicação saem do preço de cada venda. Se não estão no preço, saem do seu lucro.",
    campos: [
      grupo("g_custos_venda", "Custos de cada venda"),
      { id: "taxa_cartao_pct", rotulo: "Taxa média do cartão/maquininha", tipo: "pct" },
      { id: "vendas_cartao_pct", rotulo: "% das vendas recebidas no cartão", tipo: "pct" },
      { id: "taxa_boleto", rotulo: "Custo por boleto emitido (R$)", tipo: "moeda" },
      { id: "comissao_vendedor_pct", rotulo: "Comissão de vendedor", tipo: "pct" },
      { id: "paga_indicacao", rotulo: "Paga comissão a indicadores?", tipo: "opcao", opcoes: SN },
      { id: "indicacao_pct", rotulo: "Quanto paga por indicação", tipo: "pct" },
      { id: "indicacao_quem", rotulo: "Quem recebe a indicação", tipo: "opcao", opcoes: [["arquitetos", "Arquitetos/designers"], ["outros", "Outros parceiros (eletricista, marceneiro, cliente)"], ["ambos", "Os dois"]], ajuda: "O CAU proíbe o arquiteto de receber RT (BIB-0078)." },
      grupo("g_receber", "Como recebe"),
      { id: "condicao_usual", rotulo: "Condições de pagamento que você oferece", tipo: "area" },
      { id: "entrada_pct", rotulo: "Entrada/sinal usual (% do contrato)", tipo: "pct" },
      { id: "parcelas_max", rotulo: "Número máximo de parcelas", tipo: "numero" },
      { id: "desconto_pix_pct", rotulo: "Desconto à vista no Pix", tipo: "pct" },
      grupo("g_pos", "Garantia e pós-venda"),
      { id: "garantia_meses", rotulo: "Garantia oferecida (meses)", tipo: "numero" },
      { id: "visitas_garantia", rotulo: "Visitas de garantia/suporte por obra (média)", tipo: "numero" },
    ],
  },
  {
    id: "dividas", titulo: "8. Dívidas e caixa",
    porque: "Para o plano de saída: quanto entra de margem por mês, quanto sai em parcelas e qual dívida custa mais caro (juros) ou trava a empresa (imposto). Sem controle de caixa, deixe em branco: o plano começa por criar esse controle.",
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
      grupo("g_caixa", "Caixa (se souber)"),
      { id: "caixa_hoje", rotulo: "Saldo em conta hoje, somando todas (R$)", tipo: "moeda" },
      { id: "a_receber", rotulo: "Total a receber de clientes (R$)", tipo: "moeda" },
      { id: "a_pagar_30d", rotulo: "Contas a pagar nos próximos 30 dias (R$)", tipo: "moeda" },
    ],
  },
  {
    id: "pedidos", titulo: "9. O que aconteceu nos orçamentos",
    porque: "O Zoho só tem os orçamentos (sem faturas nem recebimentos) e os de 2026 estão em rascunho. Marque os que fecharam e os perdidos: isso mede a taxa de fechamento, base das metas de venda.",
    campos: [{ id: "por_orcamento", rotulo: "Por orçamento (aceitos e rascunhos desde 2025)", tipo: "orcamentos", campos: [
      { id: "situacao", rotulo: "Situação", tipo: "opcao", opcoes: [["nao_fechou", "Não fechou"], ["concluida", "Fechou · obra concluída"], ["andamento", "Fechou · em andamento"], ["parada", "Fechou · parada"], ["cancelada", "Fechou e foi cancelada"], ["versao", "Era só uma versão/opção"]] },
      { id: "motivo_perda", rotulo: "Se não fechou: por quê", tipo: "opcao", opcoes: [["preco", "Preço"], ["concorrente", "Fechou com concorrente"], ["desistiu", "Desistiu/adiou a obra"], ["sem_retorno", "Sem retorno"], ["outro", "Outro"]] },
      { id: "recebido", rotulo: "Recebido (R$)", tipo: "moeda" },
      { id: "a_receber", rotulo: "Falta receber (R$)", tipo: "moeda" },
      { id: "custo_extra", rotulo: "Custo a mais (R$)", tipo: "moeda" },
      { id: "obs", rotulo: "Observação", tipo: "texto" },
    ] }],
  },
];

// Sugestoes da pesquisa (02/10/2026) para atividades que faltavam na lista do fundador. Entram como
// "pesquisa" (a confirmar). Fontes: SINAPI 07/2026 (98307, 98302), IPVM, fabricantes e mercado (BIB).
export const SUGESTOES_TEMPOS = [
  ["Visita técnica / levantamento", "projeto", "outro", "na", "projeto", 60, "Mercado: 30–90 min"],
  ["Projeto de automação e rede (rateado por ambiente)", "projeto", "outro", "na", "ambiente", 60, "Inferência: 40–90 min por ambiente"],
  ["Mobilização/desmobilização (carregar, organizar, limpar)", "obra", "outro", "na", "dia", 45, "Inferência: 30–60 min por dia; já coberto pela produtividade se < 100%"],
  ["Instalação física do access point (fixação no teto/parede)", "ap", "instalacao", "na", "dispositivo", 20, "Inferência a confirmar"],
  ["Tomada de rede RJ45 (montagem e conector)", "ponto_rede", "instalacao", "na", "ponto", 26, "SINAPI 98307: 26 min de eletricista"],
  ["Crimpagem e identificação no patch panel", "quadro_rede", "outro", "na", "ponto", 15, "SINAPI 98302: ≈14,5 min por porta"],
  ["Certificação/teste de cabo de rede", "ponto_rede", "teste", "na", "ponto", 2, "Fluke: autoteste 8–10 s + deslocamento"],
  ["Câmera IP: fixação e conector", "camera", "instalacao", "na", "dispositivo", 60, "Mercado: 45–120 min"],
  ["Câmera IP: configuração, mira e foco", "camera", "configuracao", "na", "dispositivo", 66, "IPVM: 0,5 + 0,6 h-homem"],
  ["Gravador NVR: instalar e configurar acesso remoto", "nvr", "configuracao", "na", "dispositivo", 90, "Inferência: 60–180 min"],
  ["Fechadura eletrônica (porta já preparada)", "fechadura", "instalacao", "na", "dispositivo", 60, "Mercado: 30–90 min; com usinagem 120"],
  ["Motor de cortina + trilho motorizado (até 3 m)", "motor_cortina", "instalacao", "na", "dispositivo", 60, "Mercado: 45–90 min; +10 min por metro acima de 3 m"],
  ["Película inteligente (aplicação)", "pelicula", "instalacao", "na", "m2", 30, "Mercado (fraca): 20–60 min/m² + 20 min por fonte"],
  ["Fita de LED em perfil (corte, solda, fixação)", "led", "instalacao", "na", "metro", 25, "Mercado: 15–35 min/m; driver +20 min"],
  ["Projetor: suporte de teto e ajuste", "projetor", "instalacao", "na", "dispositivo", 150, "Mercado: 120–210 min; tela +90"],
  ["Calibração de áudio (Audyssey/Dirac)", "receiver", "configuracao", "na", "dispositivo", 45, "Inferência: 30–90 min"],
  ["Vídeo-porteiro (externo + interno + app)", "outro", "instalacao", "na", "dispositivo", 120, "Inferência: 90–180 min"],
  ["Documentação as-built", "obra", "outro", "na", "projeto", 240, "Inferência: 2–8 h"],
].map(([descricao, dispositivo, atividade, tecnologia, unidade, tempo, obs]) => ({ descricao, dispositivo, atividade, tecnologia, unidade, tempo: String(tempo), unidade_tempo: "min", origem: "pesquisa", obs }));

const vazio = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);

/** Respostas com as conversoes da v1 -> v2 (sem gravar): tempos antigos, retirada que estava em "fixos". */
export function comCompatibilidade(respostas = {}) {
  const r = { ...respostas };
  const antigos = r.equipe?.dados?.tempos;
  if (!r.tempos && Array.isArray(antigos) && antigos.length) r.tempos = { dados: { itens: converterAntigos(antigos) }, convertido: true };
  const f = r.fixos?.dados ?? {};
  if (!r.voce && (f.retirada_real || f.pro_labore)) r.voce = { dados: { retirada_media_real: f.retirada_real ?? "", pro_labore_gestor: f.pro_labore && f.pro_labore !== "0" ? f.pro_labore : "" }, convertido: true };
  return r;
}

/** Quantos campos de cada secao foram respondidos (grupos nao contam). */
export function progresso(respostas = {}) {
  return SECOES.map((s) => {
    const d = respostas[s.id]?.dados ?? {};
    const campos = s.campos.filter((c) => c.tipo !== "grupo");
    const feitos = campos.filter((c) => !vazio(d[c.id])).length;
    return { id: s.id, titulo: s.titulo, feitos, total: campos.length, em: respostas[s.id]?.em ?? null, por: respostas[s.id]?.autor_nome ?? null, convertido: Boolean(respostas[s.id]?.convertido) };
  });
}

/**
 * Numero digitado em portugues: "1.234,56" -> 1234.56; "4.000" -> 4000; "3600 MÊS" -> 3600;
 * "1500 (variável)" -> 1500. Pega o primeiro numero do texto.
 */
export function numeroBR(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = /-?\d[\d.,]*/.exec(String(v).replace(/\s/g, ""));
  if (!m) return null;
  const s = m[0].replace(/[.,]$/, "");
  const n = Number(s.includes(",") || /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : null;
}

/** Texto com mais que o numero (ex.: "3600 MÊS"): a tela avisa como foi lido. */
export const temTextoExtra = (v) => typeof v === "string" && /\d/.test(v) && /[^\d.,\s%R$-]/.test(v.replace(/R\$/g, ""));

/**
 * Parametros de preco e do plano a partir das respostas. O que faltar fica null e entra em `lacunas`
 * (a tela mostra e oferece simulacao rotulada, nunca valor inventado em silencio).
 */
export function parametros(respostasBrutas = {}) {
  const respostas = comCompatibilidade(respostasBrutas);
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
  const pessoas = (g("equipe", "pessoas") ?? []).map((p) => ({
    ...p, valor: numeroBR(p.valor), encargos_pct: numeroBR(p.encargos_pct),
    beneficios: (numeroBR(p.beneficios) ?? 0) + (numeroBR(p.alimentacao) ?? 0) + (numeroBR(p.transporte) ?? 0),
    dias_mes: numeroBR(p.dias_mes), horas_mes: numeroBR(p.horas_mes), campo_pct: numeroBR(p.campo_pct),
  }));
  const partesVeiculo = ["combustivel_mes", "manutencao_veiculo_mes", "seguro_veiculo_mes", "parcela_veiculo_mes"].map((c) => n("equipe", c));
  const veiculo = partesVeiculo.some((x) => x !== null) ? partesVeiculo.reduce((a, x) => a + (x ?? 0), 0) : n("equipe", "veiculo_mes") ?? 0;
  const operacao = veiculo + (n("equipe", "ferramentas_mes") ?? 0);
  const prodInformada = n("equipe", "produtividade_pct");
  const hora = custoHora({ equipe: pessoas, operacao, produtividade: prodInformada });
  if (hora.custoHora === null) lacunas.push("Custo da hora (equipe e produtividade)");
  const fixosItens = g("fixos", "itens") ?? [];
  const fixos = fixosItens.length ? fixosItens.reduce((a, x) => a + (numeroBR(x.valor) ?? 0), 0) : null;
  if (fixos === null) lacunas.push("Custos fixos do mês");
  const dividas = g("dividas", "lista") ?? [];
  const tempos = g("tempos", "itens") ?? [];
  return {
    tProduto, tServico, v, cartaoInformado: cartao !== null,
    vDetalhe: { cartao: Math.round((cartao ?? 0) * (parteCartao ?? 0)) / 100, comissao, indicacao: indic },
    fator: { manual: n("compras", "fator_manual"), incluiImpostos: g("compras", "preco_inclui_impostos") ?? null },
    margemCambial: n("compras", "margem_cambial_pct"),
    perdas: n("compras", "perdas_pct") ?? 0,
    prazoEntrega: n("compras", "prazo_entrega_dias"),
    tProduto2027: n("impostos", "aliquota_produto_2027_pct"), tServico2027: n("impostos", "aliquota_servico_2027_pct"),
    rbt12: n("impostos", "faturamento_12m"), anexoServicos: g("impostos", "anexo_servicos") ?? null,
    hora, produtividade: prodInformada, fixos,
    retirada: n("voce", "retirada_media_real"), retiradaMinima: n("voce", "retirada_minima"),
    proLabore: n("voce", "pro_labore_gestor") ?? 0, salarioTecnico: n("voce", "salario_tecnico"),
    parcelasMes: Math.round(dividas.reduce((a, d) => a + (numeroBR(d.parcela) ?? 0), 0) * 100) / 100,
    saldoDividas: Math.round(dividas.reduce((a, d) => a + (numeroBR(d.saldo) ?? 0), 0) * 100) / 100,
    dividas: dividas.length,
    tempos, metrosPorPonto: n("tempos", "metros_por_ponto") ?? 25, comissionamento: n("tempos", "comissionamento_pct"), entregaHoras: n("tempos", "entrega_horas"),
    lacunas,
  };
}
