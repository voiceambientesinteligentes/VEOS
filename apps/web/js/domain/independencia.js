// Mapa de independencia do Zoho (P2): para cada modulo, o que o VEOS ja faz sozinho e o que falta.
// Avaliacao tecnica do Claude em 01/10/2026 (opiniao, revisar a cada entrega). Desligar qualquer
// modulo e decisao do fundador; o roteiro abaixo so organiza o caminho.
// situacao: coberto (o VEOS ja faz o trabalho) | parcial (le/edita no Zoho ou cobre parte) | nao (depende do Zoho)

export const MODULOS_ZOHO = [
  { produto: "books", modulo: "contacts", nome: "Clientes e fornecedores", situacao: "parcial", veos: "Espelho completo, edição pelo VEOS (grava no Zoho), clientes nos pedidos e na proposta.", falta: "Cadastro próprio de clientes/fornecedores no VEOS (hoje a fonte é o Zoho)." },
  { produto: "books", modulo: "items", nome: "Itens (catálogo)", situacao: "nao", veos: "Estoque, compras e pedidos usam o catálogo espelhado; edição pelo VEOS grava no Zoho.", falta: "Catálogo próprio (preço de venda, preço de compra, tipo) — base de estoque, compras e pedidos." },
  { produto: "books", modulo: "estimates", nome: "Orçamentos", situacao: "parcial", veos: "Negociação ao Vivo, proposta em PDF com identidade VOICE, pedido a partir do aceito, painel de conversão.", falta: "Criar e editar o orçamento inteiro no VEOS (hoje nasce no Zoho)." },
  { produto: "books", modulo: "salesorders", nome: "Pedidos de venda", situacao: "coberto", veos: "Pedidos do VEOS (estoque, parcelas, NF, obra, margem).", falta: "—" },
  { produto: "books", modulo: "invoices", nome: "Faturas", situacao: "coberto", veos: "NF manual registrada no pedido; o Books não tem faturas em uso.", falta: "Emissão integrada de NF (P2.15, decisão de custo)." },
  { produto: "books", modulo: "customerpayments", nome: "Recebimentos", situacao: "coberto", veos: "Parcelas e recebimentos dos pedidos; previsão de caixa.", falta: "Conciliação bancária." },
  { produto: "books", modulo: "purchaseorders", nome: "Pedidos de compra", situacao: "coberto", veos: "Compras do VEOS (faltas, recebimento, estoque).", falta: "—" },
  { produto: "books", modulo: "bills", nome: "Contas a pagar", situacao: "coberto", veos: "Contas a pagar do VEOS (parcelas de compras e avulsas).", falta: "—" },
  { produto: "books", modulo: "expenses", nome: "Despesas", situacao: "parcial", veos: "Contas avulsas (frete, terceiros, despesa fixa).", falta: "Categorias contábeis e anexos de comprovante." },
  { produto: "books", modulo: "bankaccounts", nome: "Bancos", situacao: "nao", veos: "Só o espelho.", falta: "Saldo bancário e conciliação (a previsão de caixa não tem saldo inicial)." },
  { produto: "books", modulo: "chartofaccounts", nome: "Plano de contas", situacao: "nao", veos: "Só o espelho.", falta: "Contabilidade (normalmente fica com o contador)." },
  { produto: "books", modulo: "taxes", nome: "Impostos", situacao: "parcial", veos: "Negociação calcula impostos pela tela validada / Simples pela LC 123.", falta: "Regime tributário confirmado com o contador (BIB-0040)." },
  { produto: "crm", modulo: "Leads", nome: "Leads", situacao: "nao", veos: "Só o espelho (edição grava no Zoho).", falta: "Funil próprio: captação, qualificação e distribuição." },
  { produto: "crm", modulo: "Deals", nome: "Negócios", situacao: "parcial", veos: "Funil do CRM no painel executivo; edição grava no Zoho.", falta: "Funil próprio com etapas, valores e previsão." },
  { produto: "crm", modulo: "Accounts", nome: "Contas", situacao: "nao", veos: "Só o espelho.", falta: "Unificar com clientes do VEOS." },
  { produto: "crm", modulo: "Contacts", nome: "Contatos", situacao: "nao", veos: "Só o espelho.", falta: "Unificar com clientes do VEOS." },
  { produto: "crm", modulo: "Tasks", nome: "Tarefas e atividades", situacao: "parcial", veos: "Tarefas do Radar (regras vivas e manuais).", falta: "Migrar tarefas abertas do CRM e agenda de atividades." },
  { produto: "crm", modulo: "Vendors", nome: "Fornecedores (CRM)", situacao: "parcial", veos: "Nomes usados nas compras.", falta: "Cadastro próprio de fornecedores." },
  { produto: "projects", modulo: "projects", nome: "Projetos", situacao: "parcial", veos: "Projeto ligado ao pedido; obra, horas, aceite e garantia no VEOS.", falta: "Projeto/cronograma próprio no VEOS." },
  { produto: "projects", modulo: "tasks", nome: "Tarefas de obra", situacao: "parcial", veos: "Checklist da obra no pedido (lido do Zoho; conclusão grava no Zoho).", falta: "Checklist próprio com modelos por tipo de obra." },
];

export const ROTEIRO_DESLIGAR = [
  "Decisão do fundador registrada na Biblioteca (qual módulo, a partir de quando).",
  "O VEOS cobre o trabalho do módulo (situação “coberto”) e a equipe usou por pelo menos um ciclo completo.",
  "Congelar a escrita no Zoho (ninguém edita mais lá) e fazer a última leitura completa para o espelho.",
  "Exportar o módulo (CSV do Zoho + backup criptografado do VEOS) e conferir as contagens.",
  "Desligar a sincronização do módulo e arquivar o espelho como histórico (somente leitura).",
  "Cancelar a assinatura do Zoho só quando todos os módulos usados estiverem desligados (decisão de custo).",
];

export function resumoIndependencia(mods = MODULOS_ZOHO, contagem = () => 0) {
  const usados = mods.filter((m) => contagem(m.produto, m.modulo) > 0);
  const conta = (s) => usados.filter((m) => m.situacao === s).length;
  return { usados: usados.length, coberto: conta("coberto"), parcial: conta("parcial"), nao: conta("nao") };
}
