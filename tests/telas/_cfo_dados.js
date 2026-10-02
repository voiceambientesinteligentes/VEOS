// Dados TESTE para as telas do CFO (sinteticos).
export const RESPOSTAS = {
  impostos: { dados: { contador: "Contador TESTE", faturamento_12m: "310.000" }, em: "2026-10-02T12:00:00Z", autor_nome: "Fernando TESTE", versoes: 1 },
  equipe: { dados: { pessoas: [{ nome: "Técnico TESTE", vinculo: "clt", valor: "3000 MÊS", encargos_pct: "40", beneficios: "600", horas_mes: "176", campo_pct: "100" }], produtividade_pct: "100", veiculo_mes: "1.200", tempos: [
    { servico: "FIAÇÃO PARA INTERRUPTORES DE AUTOMAÇÃO SEM FIO", unidade: "1", horas: "15 MINUTOS" },
    { servico: "INSTALAÇÃO PARA INTERRUPTORES DE AUTOMAÇÃO SEM FIO", unidade: "1", horas: "20 MINUTOS" },
    { servico: "SERVIÇO DE CONFIGURAÇÃO DE REDE (ANTENA)", unidade: "1", horas: "30 MINUTOS" },
    { servico: "ESTRUTURA DO QUADRO GERENCIAL DE REDE", unidade: "1", horas: "16 HORAS" },
    { servico: "INSTALAÇÃO PARA INTERRUPTORES DE AUTOMAÇÃO CABEADA", unidade: "1", horas: "25" }] }, em: "2026-10-02T12:10:00Z", autor_nome: "Fernando TESTE", versoes: 2 },
  fixos: { dados: { itens: [{ descricao: "Aluguel TESTE", valor: "3.500" }, { descricao: "Marketing TESTE", valor: "900 (VARIAVEL)" }], pro_labore: "0", retirada_real: "18000" }, em: "2026-10-02T12:20:00Z", autor_nome: "Fernando TESTE", versoes: 1 },
  vendas: { dados: { comissao_vendedor_pct: "5", paga_indicacao: "sim", indicacao_pct: "10", taxa_cartao_pct: "4,5", vendas_cartao_pct: "0" }, em: "2026-10-02T12:25:00Z", autor_nome: "Fernando TESTE", versoes: 1 },
  dividas: { dados: { lista: [{ credor: "Receita TESTE", tipo: "simples", saldo: "20.000", parcela: "700", parcelas_restantes: "30", atraso: "nao" }] }, em: "2026-10-02T12:30:00Z", autor_nome: "Fernando TESTE", versoes: 1 },
};
const L = (nome, qtd, preco, tipo, custo, unidade = "un") => ({ nome, qtd, preco, total: qtd * preco, tipo, custo, unidade });
export const ORCAMENTOS = {
  fonte: "Espelho do Zoho Books no VEOS (TESTE)",
  rbt12: { valor: "310655.00", inicio: "2025-09-01", fim: "2026-08-31" },
  orcamentos: [
    { numero: "EST-T001", data: "2026-08-25", status: "accepted", cliente: "Cliente TESTE A", vendedor: "VOICE AMBIENTES INTELIGENTES", desconto: 4200, ajuste: 0, total: 15800, imposto: 0, condicao_pagamento: false,
      linhas: [L("Interruptor Touch TESTE", 20, 286.8, "goods", 143.4), L("Módulo cortina TESTE", 10, 311.82, "goods", 180.73), L("INSTALAÇÃO DA AUTOMAÇÃO", 14, 330, "service", 50, "Hr")] },
    { numero: "EST-T002", data: "2026-04-30", status: "accepted", cliente: "Arquitetura TESTE com nome comprido para quebrar a linha no celular", vendedor: "Arquiteto TESTE", desconto: 0, ajuste: -5000, total: 20000, imposto: 0, condicao_pagamento: true,
      linhas: [L("Pacote anterior TESTE", 1, 0, "goods", 9537), L("Access Point TESTE", 2, 800, "goods", 899), L("Instalação de Rede TESTE", 12, 330, "service", 150, "Hr"), L("Projeto TESTE", 1, 18000, null, null)] },
    { numero: "EST-T003", data: "2026-03-01", status: "declined", cliente: "Cliente TESTE C", vendedor: "", desconto: 0, ajuste: 0, total: 9000, imposto: 0, condicao_pagamento: false, linhas: [L("Item TESTE", 1, 9000, "goods", 5000)] },
  ],
};
export const PRODUTOS = { produtos: [
  { id: "11111111-1111-1111-1111-111111111111", codigo: "PRD-T001", nome: "Interruptor Touch Zigbee TESTE", situacao: "ativo", custo: 92.69, preco_venda: null, compras: [{ pedido: "1", data: "2026-07-01", preco_unit: 92.69, quantidade: 1, total_pedido: 111.69, unico: true }], zoho: [{ nome: "Interruptor TESTE", venda: 286.8, custo: 143.4 }] },
  { id: "22222222-2222-2222-2222-222222222222", codigo: "PRD-T002", nome: "Projetor Laser 4K TESTE", situacao: "ativo", custo: 6017.06, preco_venda: null, compras: [], zoho: [{ nome: "Projetor TESTE", venda: 9000, custo: 11271 }] },
  { id: "33333333-3333-3333-3333-333333333333", codigo: "PRD-T003", nome: "Módulo de Cortina TESTE", situacao: "revisar", custo: 28.69, preco_venda: null, compras: [], zoho: [] },
] };

export const CAMBIO = { fonte: "Banco Central do Brasil · PTAX (TESTE)", ok: true, serie: [
  { data: "2026-09-25", venda: 5.30 }, { data: "2026-09-26", venda: 5.28 }, { data: "2026-09-29", venda: 5.25 }, { data: "2026-09-30", venda: 5.22 }, { data: "2026-10-01", venda: 5.2079 }] };

export const PLANO = { pode: { aprovar: true, criar: true }, itens: [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", codigo: "PL-001", area: "financas", fase: "0-30", tipo: "rotina", titulo: "Fluxo de caixa semanal TESTE", descricao: "Toda segunda-feira, atualizar.", responsavel: "Fernando", indicador: "Saldo previsto 13 semanas", alvo: "nunca negativo", prazo: "2026-10-09", estado: "proposto", origem: "CFO (Claude)", historico: [] },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", codigo: "PL-002", area: "vendas", fase: "0-30", tipo: "meta", titulo: "Meta de vendas TESTE", descricao: "R$ 100 mil por mês.", responsavel: null, indicador: null, alvo: "R$ 100.000/mês", prazo: null, estado: "proposto", origem: "CSO (Claude)", historico: [] },
  { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", codigo: "PL-003", area: "operacoes", fase: "90-180", tipo: "acao", titulo: "Contratar técnico TESTE", descricao: "Para o fundador sair da obra.", responsavel: "Fernando", indicador: null, alvo: null, prazo: null, estado: "aprovado", origem: "COO (Claude)", historico: [{ acao: "estado", de: "proposto", para: "aprovado", nota: null, quem: "Fernando TESTE", em: "2026-10-02T13:00:00Z" }] },
] };
