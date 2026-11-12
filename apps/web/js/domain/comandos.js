// Interpretacao deterministica de comandos de voz/texto do VEOS (sem IA): pedido de tela abre a tela;
// o resto vai ao diretor indicado aqui, que responde pelo motor de IA do servidor (ui/assistente.js).

const normalizar = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Ordem importa: o primeiro que casar vence.
const NAVEGACAO = [
  { rota: "#/hoje", fala: "Abrindo o seu dia.", termos: ["hoje", "inicio", "tela inicial", "pagina inicial", "meu dia"] },
  { rota: "#/orcamentos/novo", fala: "Abrindo um orçamento novo.", termos: ["novo orcamento", "orcamento novo", "montar orcamento", "fazer orcamento"] },
  { rota: "#/radar", fala: "Abrindo o radar de alertas e tarefas.", termos: ["radar", "alertas", "pendencias", "tarefas"] },
  { rota: "#/conselho", fala: "Abrindo o conselho consultivo.", termos: ["conselho", "diretores"] },
  { rota: "#/projetos", fala: "Abrindo projetos e caixa.", termos: ["projetos", "caixa", "exposicao"] },
  { rota: "#/setor/vendas", fala: "Abrindo o setor Comercial.", termos: ["comercial", "setor comercial", "vendas"] },
  { rota: "#/setor/marketing", fala: "Abrindo o setor de Marketing.", termos: ["setor de marketing", "marketing"] },
  { rota: "#/setor/operacoes", fala: "Abrindo o setor de Operações.", termos: ["operacoes", "setor de operacoes", "obras"] },
  { rota: "#/setor/tecnologia", fala: "Abrindo Tecnologia e Engenharia.", termos: ["tecnologia", "engenharia"] },
  { rota: "#/setor/posvenda", fala: "Abrindo Pós-venda.", termos: ["pos venda", "posvenda", "chamados"] },
  { rota: "#/setor/pessoas", fala: "Abrindo Administrativo e Pessoas.", termos: ["pessoas", "administrativo", "rh"] },
  { rota: "#/setor/secretaria", fala: "Abrindo a Secretaria Executiva.", termos: ["secretaria"] },
  { rota: "#/setor/direcao", fala: "Abrindo a Direção Geral.", termos: ["direcao", "direcao geral"] },
  { rota: "#/setor/financas", fala: "Abrindo o Financeiro.", termos: ["financeiro", "setor financeiro"] },
  { rota: "#/historico", fala: "Abrindo o histórico de orçamentos.", termos: ["historico", "orcamentos salvos", "orcamentos registrados"] },
  { rota: "#/orcamentos", fala: "Abrindo os orçamentos.", termos: ["orcamentos", "lista de orcamentos"] },
  { rota: "#/clientes", fala: "Abrindo os clientes.", termos: ["clientes", "cadastro de clientes"] },
  { rota: "#/contato", fala: "Abrindo o contato rápido.", termos: ["contato rapido", "novo contato", "novo lead"] },
  { rota: "#/pedidos", fala: "Abrindo os pedidos.", termos: ["pedidos"] },
  { rota: "#/cfo", fala: "Abrindo os avisos do CFO.", termos: ["avisos do cfo", "aviso do cfo", "vigia", "conferir orcamento"] },
  { rota: "#/orbita", fala: "Abrindo a órbita dos setores.", termos: ["orbita", "setores em orbita"] },
  { rota: "#/visao", fala: "Abrindo a visão geral.", termos: ["visao geral", "resumo", "painel"] },
];

// Mesmas palavras-chave usadas pela Secretaria do portal local (rooms.py), ampliadas para os 9 setores.
// Empate de palavras: vence o setor mais especifico (ordem abaixo). Ex.: "abra um chamado para o cliente" = CXO.
const DIRETORES = [
  { sigla: "CXO", nome: "Pós-venda", termos: ["chamado", "chamados", "suporte", "garantia", "manutencao", "preventiva", "reclamacao", "satisfacao", "nps", "pos venda", "posvenda", "cxo"] },
  { sigla: "CHRO", nome: "Pessoas", termos: ["colaborador", "colaboradores", "funcionario", "funcionarios", "ferias", "ausencia", "atestado", "admissao", "contratar", "contratacao", "vaga", "vagas", "candidato", "treinamento", "treinamentos", "salario", "rh", "chro"] },
  { sigla: "COO", nome: "Operações", termos: ["operacao", "operacoes", "obra", "obras", "instalacao", "cronograma", "fornecedor", "fornecedores", "compra", "compras", "cotacao", "cotar", "estoque", "ocorrencia", "retrabalho", "checklist", "coo"] },
  { sigla: "CIO", nome: "Tecnologia e dados", termos: ["sistema", "sistemas", "tecnologia", "dados", "software", "integracao", "zoho", "rede", "firmware", "homologacao", "incidente", "cio"] },
  { sigla: "CMO", nome: "Marketing", termos: ["marketing", "marca", "campanha", "campanhas", "conteudo", "conteudos", "post", "posts", "instagram", "site", "evento", "eventos", "case", "cases", "cmo"] },
  { sigla: "CFO", nome: "Finanças", termos: ["caixa", "margem", "financeiro", "financas", "custo", "custos", "pagamento", "pagar", "conta a pagar", "contas a pagar", "boleto", "recebimento", "parcela", "parcelas", "cobranca", "cobrar", "inadimplente", "desconto", "nota fiscal", "imposto", "dre", "fechamento", "cfo"] },
  { sigla: "CSO", nome: "Vendas", termos: ["venda", "vendas", "comercial", "orcamento", "orcamentos", "proposta", "propostas", "cliente", "clientes", "lead", "leads", "arquiteto", "arquitetos", "arquiteta", "arquitetas", "arquitetura", "escritorio", "escritorios", "designer", "designers", "construtora", "construtoras", "incorporadora", "parceiro", "parceiros", "prospeccao", "prospectar", "oportunidade", "oportunidades", "funil", "follow up", "cso"] },
  { sigla: "SEC", nome: "Secretaria", termos: ["agenda", "reuniao", "reunioes", "compromisso", "compromissos", "ata", "contato", "contatos", "email", "emails", "e mail", "e mails", "caixa de entrada", "lembrete", "secretaria", "sec"] },
  { sigla: "CEO", nome: "Direção geral", termos: ["estrategia", "visao", "prioridade", "prioridades", "socio", "socios", "meta", "metas", "risco", "riscos", "frente", "frentes", "delegue", "delegar", "ceo"] },
];

const temTermo = (texto, termo) => ` ${texto} `.includes(` ${termo} `);

// Pedido para FAZER (nao so perguntar): verbo no imperativo/infinitivo de acao no inicio ou "pode ...".
const VERBOS_ACAO = "ache|achar|encontre|encontrar|procure|procurar|busque|buscar|pesquise|pesquisar|mande|mandar|envie|enviar|escreva|escrever|redija|redigir|prepare|preparar|responda|responder|crie|criar|cadastre|cadastrar|registre|registrar|lance|lancar|abra um|abra uma|abrir um|abrir uma|agende|agendar|marque|marcar|mova|mover|atualize|atualizar|mude|mudar|altere|alterar|conclua|concluir|cancele|cancelar|delegue|delegar|convide|convidar|cobre|cobrar|monte|montar|organize|organizar|planeje|planejar|guarde|guardar|anote|anotar|peca|pedir|contate|contatar|faca o follow up|faca um orcamento|faca uma proposta";
const ACAO_RE = new RegExp(`(?:^(?:(?:oi|ola|ei)\\s+)?(?:veos\\s+)?|\\b(?:pode|podes|voce pode|consegue|quero que|preciso que|gostaria que|favor|por favor)\\s+(?:voce\\s+|me\\s+|nos\\s+)?)(?:${VERBOS_ACAO})\\b`);

/** O texto pede para executar algo (e nao so uma opiniao)? */
export function pedidoDeAcao(bruto) {
  const t = normalizar(bruto);
  if (!t) return false;
  if (ACAO_RE.test(t) || /\b(e (mande|envie|mandar|enviar|cadastre|crie|agende|marque))\b/.test(t)) return true;
  // verbo no comeco de uma frase depois de ":", ".", "!", "?" ou quebra de linha ("Teste do e-mail: prepare um e-mail...")
  return String(bruto).split(/[:.!?;\n]+/).slice(1).some((frase) => {
    const f = normalizar(frase);
    return Boolean(f) && ACAO_RE.test(f);
  });
}

/** Retorna {texto, rota?, fala, diretor?, acao} para um comando falado ou digitado. */
export function interpretar(bruto) {
  const texto = normalizar(bruto);
  if (!texto) return { texto, fala: "Não entendi. Tente de novo." };
  const palavras = texto.split(" ").length;
  const querNavegar = /\b(abrir|abre|abra|ir|va|vai|mostrar|mostre|mostra|ver|voltar|volte)\b/.test(texto);
  const nav = NAVEGACAO.find((n) => n.termos.some((t) => temTermo(texto, t)));
  const acao = pedidoDeAcao(bruto);
  // pedido curto de tela abre a tela; pedido longo de acao ("abra um chamado para o cliente X") vai para a IA
  if (nav && ((querNavegar && (palavras <= 6 || !acao)) || palavras <= 3)) return { texto, rota: nav.rota, fala: nav.fala, acao: false };
  const pontos = DIRETORES.map((d, i) => ({ d, i, n: d.termos.filter((t) => temTermo(texto, t)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.i - b.i);
  const diretor = pontos[0]?.d ?? null;
  const quem = diretor ? `o ${diretor.sigla}, ${diretor.nome}` : "a Direção";
  return {
    texto,
    diretor,
    acao,
    fala: acao
      ? `Pedido para ${quem}. Vou executar com as ferramentas do VEOS e te mostro o que foi feito.`
      : diretor
        ? `Pedido para o ${diretor.sigla}, ${diretor.nome}. Ele vai analisar com os dados do VEOS e responder.`
        : "Pedido para a Direção. Vou analisar com os dados do VEOS e responder.",
  };
}

// "confirmo", "sim, pode mandar", "pode enviar todos", "manda agora"... (so palavras de confirmacao; "nao", datas ou
// perguntas ficam de fora). "ok" e "isso" sozinhos NAO confirmam envio.
const CONFIRMA = new Set(["sim", "confirmo", "confirmado", "confirma", "pode", "envia", "envie", "enviar", "manda", "mande", "mandar", "dispara", "disparar", "autorizo", "aprovado", "aprovo"]);
const ACOMPANHA = new Set(["ok", "isso", "agora", "tudo", "todos", "todas", "os", "o", "a", "as", "email", "emails", "e", "mail", "mails", "eles", "elas", "ja", "por", "favor", "pf", "pode", "sim", "veos", "entao", "isso ai", "ai", "pra", "mim", "obrigado", "valeu"]);
/** Resposta curta que confirma o envio dos e-mails pendentes? */
export function confirmacaoDeEnvio(bruto) {
  if (/\?/.test(String(bruto ?? ""))) return false;
  const p = normalizar(bruto).split(" ").filter(Boolean);
  if (!p.length || p.length > 8) return false;
  return p.some((x) => CONFIRMA.has(x)) && p.every((x) => CONFIRMA.has(x) || ACOMPANHA.has(x));
}
