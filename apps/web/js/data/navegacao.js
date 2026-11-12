// MAPA DE NAVEGACAO do VEOS: 9 areas no menu lateral (Orbita e IA VEOS como areas proprias, pedido do Fernando em 04/11); as telas de cada area aparecem como abas no
// topo so quando a pessoa esta nela (padrao de apps de gestao como Pipedrive, HubSpot e Linear).
// O mesmo mapa alimenta a busca global (Ctrl+K) e respeita o perfil (papeis) de cada tela.
// Sem DOM: testado em tests/web/navegacao.test.mjs.

const DIR = ["direcao"], FIN = ["direcao", "financas"], VENDER = ["direcao", "financas", "vendas", "marketing", "posvenda"];

export const SECOES = [
  { id: "hoje", rotulo: "Hoje", icone: "hoje", itens: [
    ["#/hoje", "Hoje"], ["#/radar", "Alertas e tarefas"], ["#/mensagens", "Mensagens a enviar"], ["#/operar", "Começar a operar"],
  ] },
  { id: "orbita", rotulo: "Órbita", icone: "orbita", itens: [["#/orbita", "Órbita dos setores"]] },
  { id: "ia", rotulo: "IA VEOS", icone: "ia", itens: [["#/ia", "IA VEOS"]] },
  { id: "vender", rotulo: "Vender", icone: "vender", papeis: VENDER, itens: [
    ["#/orcamentos", "Orçamentos"], ["#/clientes", "Clientes"], ["#/contato", "Contato rápido"], ["#/prospeccao", "Prospecção"], ["#/modelos", "Modelos de e-mail"],
    ["#/conteudo", "Instagram"], ["#/setor/vendas", "Funil"], ["#/comercial", "Plano comercial"], ["#/negociacao", "Negociação ao vivo"], ["#/propostas", "Propostas do Zoho"],
  ] },
  { id: "operacao", rotulo: "Operação", icone: "operacao", itens: [
    ["#/pedidos", "Pedidos"], ["#/compras", "Compras"], ["#/fornecedores", "Fornecedores"], ["#/estoque", "Estoque"], ["#/produtos", "Catálogo"], ["#/recebimentos", "Recebimentos"],
    ["#/contas-pagar", "Contas a pagar", FIN], ["#/projetos", "Projetos e caixa"],
  ] },
  { id: "financeiro", rotulo: "Financeiro", icone: "financeiro", papeis: FIN, itens: [
    ["#/visao", "Visão geral"], ["#/cfo/caixa", "Caixa e extrato"], ["#/cfo/fluxo", "13 semanas"], ["#/cfo/fechamento", "Fechamento"], ["#/cfo/indicadores", "Indicadores"],
    ["#/cfo/recorrentes", "Contas fixas"], ["#/contratos", "Contratos de suporte"], ["#/cfo/precos", "Preços"], ["#/cfo/formulario", "Formulário do CFO"], ["#/cfo/diagnostico", "Diagnóstico"],
    ["#/cfo/estoque", "Estoque estratégico"], ["#/calculadora", "Calculadora"], ["#/cfo", "Avisos de orçamento"], ["#/historico", "Histórico"],
  ] },
  { id: "empresa", rotulo: "Empresa", icone: "empresa", itens: [
    ["#/painel-dono", "Painel do dono", FIN], ["#/plano", "Plano da VOICE"], ["#/estrutura", "Estrutura"], ["#/diretores", "Perguntar aos diretores"],
    ["#/conselho", "Conselho"],
  ] },
  { id: "biblioteca", rotulo: "Biblioteca", icone: "biblioteca", itens: [
    ["#/biblioteca/decisoes", "Decisões"], ["#/biblioteca/politicas", "Políticas"], ["#/biblioteca/revisoes", "Revisões"], ["#/biblioteca/aprendizados", "Aprendizados"],
    ["#/biblioteca/referencias", "Referências"], ["#/biblioteca/governanca", "Governança"], ["#/biblioteca/consultar", "Consultar precedentes"],
  ] },
  { id: "ajustes", rotulo: "Ajustes", icone: "ajustes", itens: [
    ["#/conta", "Minha conta"], ["#/sistema/usuarios", "Usuários", DIR], ["#/integracoes", "Integrações"], ["#/zoho/books", "Zoho Books"], ["#/zoho/crm", "Zoho CRM"],
    ["#/zoho/projects", "Zoho Projects"], ["#/sistema/saude", "Saúde do sistema", ["direcao", "tecnologia"]], ["#/sistema/exportar", "Exportar", DIR],
    ["#/sistema/independencia", "Independência do Zoho", DIR], ["#/sistema/acessos", "Acessos (LGPD)", DIR], ["#/sistema/validacao", "Validação guiada"], ["#/pendencias", "Pendências do projeto", DIR],
  ] },
];

/** Atalhos do botao "+ Novo" (o que mais se cria no dia a dia). */
export const NOVOS = [
  ["#/contato", "Contato que chegou", "Lead em 30 segundos", VENDER],
  ["#/orcamentos/novo", "Orçamento", "Cliente, ambientes, produtos e mão de obra", VENDER],
  ["#/clientes?novo=1", "Cliente", "Cadastro com contato e obra", VENDER],
  ["#/compras/nova", "Compra", "Itens, fornecedor e parcelas", ["direcao", "financas", "operacoes"]],
  ["#/fornecedores?novo=1", "Fornecedor", "Cadastro com prazos e condições", ["direcao", "financas", "operacoes"]],
  ["#/diretores", "Pergunta a um diretor", "Resposta da IA na voz do diretor", null],
];

const pode = (papeis, papel) => !papeis || papeis.includes(papel);

/** Areas e abas visiveis para o perfil. */
export function menuDoPerfil(papel) {
  return SECOES.filter((s) => pode(s.papeis, papel))
    .map((s) => ({ ...s, itens: s.itens.filter(([, , p]) => pode(p, papel)).map(([href, rotulo]) => ({ href, rotulo })) }))
    .filter((s) => s.itens.length);
}

/** Area da rota atual (a rota ja vem normalizada pelo roteador, ex.: "#/pedidos"). */
export function secaoDaRota(rota, menu) {
  const r = String(rota ?? "").split("?")[0];
  if (/^#\/setor\//.test(r)) return menu.find((s) => s.id === (r.startsWith("#/setor/vendas") ? "vender" : "orbita")) ?? null;
  const exata = menu.find((s) => s.itens.some((i) => i.href === r));
  if (exata) return exata;
  // prefixo mais longo (ex.: #/orcamentos/novo -> Vender)
  let melhor = null, tam = 0;
  for (const s of menu) for (const i of s.itens) if (r.startsWith(`${i.href}/`) && i.href.length > tam) { melhor = s; tam = i.href.length; }
  return melhor;
}

/** Aba ativa dentro da area. */
export function abaDaRota(rota, secao) {
  const r = String(rota ?? "").split("?")[0];
  if (!secao) return null;
  return secao.itens.find((i) => i.href === r)?.href
    ?? secao.itens.filter((i) => r.startsWith(`${i.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href
    ?? (/^#\/setor\//.test(r) ? (r.startsWith("#/setor/vendas") ? "#/setor/vendas" : "#/orbita") : null);
}

/** Itens para a busca global (todas as telas do perfil, com a area). */
export const itensDeBusca = (menu) => menu.flatMap((s) => s.itens.map((i) => ({ titulo: i.rotulo, href: i.href, tipo: "Tela", extra: s.rotulo })));
