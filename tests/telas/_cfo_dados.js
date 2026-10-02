// Dados TESTE para as telas do CFO (sinteticos).
export const RESPOSTAS = {
  impostos: { dados: { contador: "Contador TESTE", faturamento_12m: "310.000" }, em: "2026-10-02T12:00:00Z", autor_nome: "Fernando TESTE", versoes: 1 },
  equipe: { dados: { pessoas: [{ nome: "Técnico TESTE", vinculo: "clt", valor: "3.000", encargos_pct: "40", beneficios: "600", horas_mes: "176", campo_pct: "100" }], produtividade_pct: "70", veiculo_mes: "1.200", tempos: [{ servico: "Instalar interruptor", unidade: "ponto", horas: "0,5" }] }, em: "2026-10-02T12:10:00Z", autor_nome: "Fernando TESTE", versoes: 2 },
  fixos: { dados: { itens: [{ descricao: "Aluguel TESTE", valor: "3.500" }, { descricao: "Contador TESTE", valor: "900" }], pro_labore: "6.000" }, em: "2026-10-02T12:20:00Z", autor_nome: "Fernando TESTE", versoes: 1 },
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
