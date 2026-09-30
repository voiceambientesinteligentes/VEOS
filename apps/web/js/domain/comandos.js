// Interpretacao deterministica de comandos de voz/texto do VEOS (sem IA).
// Hoje: navegacao entre telas e indicacao do diretor que receberia o pedido.
// Quando a IA for integrada, o pedido vai ao diretor indicado aqui.

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
  { rota: "#/cfo", fala: "Abrindo os avisos do CFO.", termos: ["avisos", "aviso do cfo", "vigia", "novo orcamento", "conferir orcamento"] },
  { rota: "#/orbita", fala: "Abrindo a órbita dos setores.", termos: ["orbita", "setores em orbita", "inicio", "tela inicial"] },
  { rota: "#/visao", fala: "Abrindo a visão geral.", termos: ["visao geral", "resumo", "painel"] },
];

// Mesmas palavras-chave usadas pela Secretaria do portal local (rooms.py).
const DIRETORES = [
  { sigla: "CFO", nome: "Finanças", termos: ["caixa", "margem", "financeiro", "financas", "custo", "custos", "orcamento", "pagamento", "recebimento", "desconto", "nota fiscal", "cfo"] },
  { sigla: "CSO", nome: "Vendas", termos: ["venda", "vendas", "comercial", "proposta", "propostas", "cliente", "clientes", "lead", "leads", "cso"] },
  { sigla: "CMO", nome: "Marketing", termos: ["marketing", "marca", "campanha", "conteudo", "instagram", "site", "cmo"] },
  { sigla: "COO", nome: "Operações", termos: ["operacao", "operacoes", "instalacao", "prazo", "cronograma", "fornecedor", "compra", "coo"] },
  { sigla: "CIO", nome: "Tecnologia e dados", termos: ["sistema", "sistemas", "tecnologia", "dados", "software", "integracao", "zoho", "rede", "cio"] },
  { sigla: "CEO", nome: "Direção geral", termos: ["estrategia", "visao", "prioridade", "prioridades", "socio", "socios", "meta", "metas", "ceo"] },
];

const temTermo = (texto, termo) => ` ${texto} `.includes(` ${termo} `);

/** Retorna {texto, rota?, fala, diretor?} para um comando falado ou digitado. */
export function interpretar(bruto) {
  const texto = normalizar(bruto);
  if (!texto) return { texto, fala: "Não entendi. Tente de novo." };
  const querNavegar = /\b(abrir|abre|abra|ir|va|vai|mostrar|mostre|mostra|ver|voltar|volte)\b/.test(texto);
  const nav = NAVEGACAO.find((n) => n.termos.some((t) => temTermo(texto, t)));
  if (nav && (querNavegar || texto.split(" ").length <= 3)) return { texto, rota: nav.rota, fala: nav.fala };
  const pontos = DIRETORES.map((d) => ({ d, n: d.termos.filter((t) => temTermo(texto, t)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const diretor = pontos[0]?.d ?? null;
  return {
    texto,
    diretor,
    fala: diretor
      ? `Pedido para o ${diretor.sigla}, ${diretor.nome}. A inteligência artificial ainda não está integrada; quando estiver, ele responderá.`
      : "Pedido recebido. A inteligência artificial ainda não está integrada; quando estiver, a Secretaria vai encaminhar.",
  };
}
