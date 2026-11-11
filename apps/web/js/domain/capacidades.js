// O QUE A IA DO VEOS FAZ EM CADA SETOR (sem DOM). Rotinas de uma empresa completa, com um pedido de exemplo
// para cada uma e o que o VEOS faz por baixo. Usado pela tela IA VEOS ("O que posso pedir"), pelo MCP
// (instrucoes) e pelos testes. "precisa": envio = sai por e-mail (Brevo ou Gmail ligado em Integracoes);
// gmail = depende da ponte do Gmail (ler a caixa, as respostas e a agenda);
// tela = a ultima etapa e humana na tela (pagar, aceitar, decidir). Nada aqui decide no lugar do dono.

export const CAPACIDADES = [
  { setor: "direcao", sigla: "CEO", nome: "Direção", itens: [
    { pedido: "Como está a empresa hoje? O que precisa da minha atenção?", faz: "Junta painel, Radar, caixa e funil e aponta o que é urgente." },
    { pedido: "Delegue ao comercial: ligar para os 5 orçamentos parados há mais tempo, prazo sexta.", faz: "Cria as tarefas no setor certo, com prazo." },
    { pedido: "Registre o risco de atraso na importação dos roteadores, impacto alto.", faz: "Cria o registro de risco com probabilidade, impacto e dono." },
    { pedido: "Abra a frente 'showroom próprio' com a próxima ação: levantar 3 imóveis.", faz: "Cria a frente na Direção e a tarefa da próxima ação." },
    { pedido: "Proponha uma meta de faturamento para dezembro com base no histórico.", faz: "Calcula pelo histórico e registra como PROPOSTA (a meta só vale aprovada por você)." },
    { pedido: "Pesquise empresas de automação concorrentes em Balneário Camboriú.", faz: "Pesquisa na web, lê os sites e resume quem são, o que oferecem e os contatos." },
    { pedido: "Prepare o resumo da semana e mande para o meu e-mail.", faz: "Monta o resumo e prepara o e-mail; você confirma o envio.", precisa: "envio" },
  ] },
  { setor: "financas", sigla: "CFO", nome: "Financeiro", itens: [
    { pedido: "Lance a conta de luz de R$ 480,00 vencendo dia 20.", faz: "Cria a conta a pagar (o pagamento é marcado por você na tela).", precisa: "tela" },
    { pedido: "Quais parcelas estão atrasadas? Prepare a cobrança para cada cliente.", faz: "Lista os recebíveis atrasados e prepara um e-mail de cobrança por cliente; você confirma.", precisa: "envio" },
    { pedido: "Registre a nota fiscal 1234 recebida do fornecedor Intelbras.", faz: "Cria o documento fiscal para conferência." },
    { pedido: "Abra o fechamento de novembro.", faz: "Cria o fechamento do mês com prazo e a lista do que conferir." },
    { pedido: "Quanto devo cobrar no orçamento ORV-00012 para fechar a margem?", faz: "Analisa pelo preço da Política V1 e mostra margem e alçada." },
    { pedido: "Como fica o caixa nas próximas 13 semanas?", faz: "Projeta o caixa com contas, parcelas e contratos." },
  ] },
  { setor: "vendas", sigla: "CSO", nome: "Comercial", itens: [
    { pedido: "Ache 5 escritórios de arquitetura em Itajaí, pegue os e-mails e mande uma apresentação da VOICE.", faz: "Pesquisa na web, lê os sites, pega o e-mail de contato, cadastra cada escritório como parceiro prospectado (o follow-up começa sozinho) e prepara um e-mail 1:1 para cada um; você confirma o envio.", precisa: "envio" },
    { pedido: "Cadastre o lead Maria Souza, 47 99999-1234, indicação do arquiteto João, casa em obra.", faz: "Cria o lead com a origem; a cadência de resposta em 1 hora começa." },
    { pedido: "Crie o cliente Carlos Lima e um orçamento em rascunho com 3 pontos de Wi-Fi.", faz: "Cadastra o cliente e monta o rascunho (enviar e aceitar ficam com você).", precisa: "tela" },
    { pedido: "Mova a oportunidade da Casa Praia para negociação e marque o próximo passo para sexta.", faz: "Atualiza a etapa e a data do próximo passo." },
    { pedido: "Algum arquiteto respondeu? Prepare a resposta.", faz: "Lê as respostas no Gmail e prepara a resposta na mesma conversa; você confirma.", precisa: "gmail" },
    { pedido: "Faça o follow-up das propostas enviadas há mais de 10 dias.", faz: "Acha as propostas paradas e prepara um e-mail curto para cada uma.", precisa: "envio" },
  ] },
  { setor: "marketing", sigla: "CMO", nome: "Marketing", itens: [
    { pedido: "Crie a pauta de 4 posts para arquitetos neste mês.", faz: "Cria os conteúdos (ideia) com formato, canal, pilar e data." },
    { pedido: "Planeje a campanha do café técnico com meta de 10 leads.", faz: "Cria a campanha com objetivo, público, mensagem, canais e meta." },
    { pedido: "Organize um evento para arquitetos e convide os parceiros ativos.", faz: "Cria o evento e prepara um convite por parceiro; você confirma o envio.", precisa: "envio" },
    { pedido: "Pesquise tendências de automação residencial para alto padrão.", faz: "Pesquisa na web e resume com as fontes." },
    { pedido: "Registre o case da obra do cliente Silva (aguardando autorização).", faz: "Cria o case no estado certo; publicação só com autorização do cliente." },
  ] },
  { setor: "operacoes", sigla: "COO", nome: "Operações", itens: [
    { pedido: "Abra a obra do pedido PED-00003 com entrega prevista para 15/12.", faz: "Cria a obra com cliente, contrato, endereço, escopo e prazo." },
    { pedido: "Crie a requisição de compra de 3 roteadores para a obra da Casa Praia.", faz: "Cria a compra em requisição, ligada à obra." },
    { pedido: "Ache distribuidores de cabo de rede em SC e peça cotação por e-mail.", faz: "Pesquisa fornecedores, pega os contatos e prepara o pedido de cotação; você confirma.", precisa: "envio" },
    { pedido: "Registre a ocorrência de retrabalho na obra do apartamento 1201.", faz: "Cria a ocorrência com gravidade e categoria para análise da causa." },
    { pedido: "Cadastre o fornecedor Elétrica Silva, CNPJ 12.345.678/0001-90.", faz: "Cadastra o fornecedor (CNPJ conferido)." },
  ] },
  { setor: "tecnologia", sigla: "CIO", nome: "Tecnologia", itens: [
    { pedido: "Registre o incidente: a rede do cliente X caiu hoje de manhã.", faz: "Cria o incidente com severidade, sistemas afetados e se envolve dado pessoal." },
    { pedido: "Abra a homologação do roteador TP-Link Deco X50.", faz: "Cria a homologação com fabricante, modelo e categoria." },
    { pedido: "Pesquise o firmware mais novo do controlador Control4.", faz: "Pesquisa na web e mostra a fonte oficial." },
    { pedido: "Planeje a mudança da rede do cliente Y para sábado.", faz: "Cria a mudança com impacto, janela e plano de reversão." },
  ] },
  { setor: "posvenda", sigla: "CXO", nome: "Pós-venda", itens: [
    { pedido: "Abra um chamado: cliente João, Wi-Fi lento, prioridade alta.", faz: "Cria o chamado com prazos de resposta e solução." },
    { pedido: "Mande a pesquisa de satisfação para os clientes entregues este mês.", faz: "Cria as pesquisas e prepara um e-mail por cliente; você confirma.", precisa: "envio" },
    { pedido: "Agende a visita de manutenção preventiva do contrato do cliente Silva.", faz: "Cria a visita e marca na agenda do Google.", precisa: "gmail" },
    { pedido: "Cadastre o contrato de suporte de R$ 300,00 por mês do cliente Lima.", faz: "Cria o contrato; as cobranças mensais entram na previsão de caixa." },
  ] },
  { setor: "pessoas", sigla: "CHRO", nome: "Pessoas", itens: [
    { pedido: "Cadastre o técnico novo, Pedro, começando dia 1º, CLT.", faz: "Cria o colaborador em pré-admissão com as exigências (NR-10, NR-35, ASO)." },
    { pedido: "Registre as férias do Pedro de 10 a 20 de janeiro.", faz: "Cria a ausência para aprovação." },
    { pedido: "Quais treinamentos vencem nos próximos 60 dias?", faz: "Lista os treinamentos a vencer por pessoa." },
    { pedido: "Pesquise o salário de técnico de redes em Santa Catarina.", faz: "Pesquisa na web e resume com as fontes." },
  ] },
  { setor: "secretaria", sigla: "SEC", nome: "Secretaria", itens: [
    { pedido: "Quais e-mails importantes chegaram hoje?", faz: "Lê a caixa do Gmail e resume o que pede resposta.", precisa: "gmail" },
    { pedido: "Marque reunião com o arquiteto Paulo na quinta às 15h.", faz: "Coloca na agenda do Google; convite para outras pessoas só com a sua confirmação.", precisa: "gmail" },
    { pedido: "O que tenho na agenda esta semana?", faz: "Lê a agenda do Google.", precisa: "gmail" },
    { pedido: "Registre a ata da reunião de hoje e crie as tarefas combinadas.", faz: "Cria a reunião com a ata e uma tarefa por encaminhamento." },
    { pedido: "Guarde o contato do fornecedor Ana, da Elétrica Silva, 47 98888-7777.", faz: "Cria o contato na Secretaria." },
  ] },
];

/** Exemplos de um setor (ou de todos) em texto curto, para instrucoes de IA. */
export function exemplosDePedidos(setor = null, max = 3) {
  return CAPACIDADES.filter((c) => !setor || c.setor === setor).map((c) => `${c.sigla}: ${c.itens.slice(0, max).map((i) => `"${i.pedido}"`).join("; ")}`).join("\n");
}
