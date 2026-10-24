// SETOR COMERCIAL: segmentos de cliente, leitura da base real (orcamentos do Zoho), cadencias de
// follow-up (plano de toques: viram tarefa + rascunho; quem envia e sempre uma pessoa), canais de
// aquisicao, implantacao do setor (onboarding) e mapa de quem define cada meta.
// Fontes: pesquisa de 07/10/2026 (BIB-0101, BIB-0102), base real (BIB-0103), propostas BIB-0105 a 0107.
// Nada aqui inventa meta: valor sem dado e LACUNA. Sem DOM.

export const SEGMENTOS = {
  especificador: "Arquitetos e designers (escritório como cliente)",
  construtora: "Construtoras, incorporadoras e empreendimentos",
  corporativo: "Corporativo, hotelaria e saúde",
  cliente_final: "Cliente final (pessoa física)",
};

const SEM_ACENTO = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Mesmo cliente escrito de jeitos diferentes ("Studio We.Arch" e "Studio WeArch") vira a mesma chave. */
export function chaveCliente(nome) {
  return SEM_ACENTO(nome).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Segmento provavel pelo nome do cliente no Zoho (automatico: conferir). */
export function segmentoPorNome(nome) {
  const t = SEM_ACENTO(nome).toLowerCase();
  if (/\b(studio|estudio|arq|arquitet\w*|architect\w*|design\w*|interiores|atelie\w*|paisag\w*)\b/.test(t)) return "especificador";
  if (/\b(empreendimentos?|construtora|construcoes|incorporadora|incorporacoes|spe|engenharia|residence|palace|tower|torre|edificio|condominio)\b/.test(t)) return "construtora";
  if (/\b(ltda|eireli|s\/?a|hotel|inn|pousada|medical|clinica|igreja|escola|restaurante|loja|comercio|tech)\b/.test(t)) return "corporativo";
  return "cliente_final";
}

const GANHO = new Set(["accepted", "invoiced"]);
const PERDIDO = new Set(["declined", "expired"]);
const r2 = (v) => Math.round(v * 100) / 100;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

/**
 * Le a base de orcamentos (formato de api.cfoOrcamentos: numero, data, status, cliente, total) e devolve
 * totais, segmentos, especificadores e alertas de qualidade. "aberto" = rascunho/enviado sem decisao.
 */
export function baseComercial(orcamentos = [], { desde = null, segmentoDe = segmentoPorNome } = {}) {
  const lista = orcamentos.filter((o) => !desde || String(o.data ?? "") >= desde);
  const situacao = (o) => (GANHO.has(o.status) ? "ganho" : PERDIDO.has(o.status) ? "perdido" : "aberto");
  const clientes = new Map();
  for (const o of lista) {
    const k = chaveCliente(o.cliente);
    const c = clientes.get(k) ?? { chave: k, codigo: o.codigo ?? null, nomes: new Set(), segmento: segmentoDe(o.cliente), orcamentos: 0, ganhos: 0, perdidos: 0, abertos: 0, orcado: 0, ganho: 0, ultimo: "" };
    c.nomes.add(String(o.cliente ?? "").trim());
    c.orcamentos++;
    c[situacao(o) === "ganho" ? "ganhos" : situacao(o) === "perdido" ? "perdidos" : "abertos"]++;
    c.orcado += Number(o.total) || 0;
    if (situacao(o) === "ganho") c.ganho += Number(o.total) || 0;
    if (String(o.data ?? "") > c.ultimo) c.ultimo = String(o.data ?? "");
    clientes.set(k, c);
  }
  const cl = [...clientes.values()].map((c) => ({ ...c, nomes: [...c.nomes], orcado: r2(c.orcado), ganho: r2(c.ganho) }));
  const soma = (f) => lista.filter(f).reduce((s, o) => s + (Number(o.total) || 0), 0);
  const ganhos = lista.filter((o) => situacao(o) === "ganho"), perdidos = lista.filter((o) => situacao(o) === "perdido");
  const valores = lista.map((o) => Number(o.total) || 0).sort((a, b) => a - b);
  const mediana = valores.length ? (valores.length % 2 ? valores[(valores.length - 1) / 2] : (valores[valores.length / 2 - 1] + valores[valores.length / 2]) / 2) : null;
  const porSegmento = Object.keys(SEGMENTOS).map((s) => {
    const cs = cl.filter((c) => c.segmento === s);
    const g = cs.reduce((a, c) => a + c.ganhos, 0), p = cs.reduce((a, c) => a + c.perdidos, 0);
    return { segmento: s, nome: SEGMENTOS[s], clientes: cs.length, orcamentos: cs.reduce((a, c) => a + c.orcamentos, 0), ganhos: g, perdidos: p, abertos: cs.reduce((a, c) => a + c.abertos, 0),
      orcado: r2(cs.reduce((a, c) => a + c.orcado, 0)), ganho: r2(cs.reduce((a, c) => a + c.ganho, 0)), ticket_ganho: g ? r2(cs.reduce((a, c) => a + c.ganho, 0) / g) : null, taxa_ganho_decididos: pct(g, g + p) };
  });
  const maior = [...cl].sort((a, b) => b.orcamentos - a.orcamentos)[0] ?? null;
  return {
    orcamentos: lista.length, clientes: cl.length, ganhos: ganhos.length, perdidos: perdidos.length, abertos: lista.length - ganhos.length - perdidos.length,
    pct_abertos: pct(lista.length - ganhos.length - perdidos.length, lista.length),
    ticket_ganho: ganhos.length ? r2(soma((o) => situacao(o) === "ganho") / ganhos.length) : null,
    mediana_orcamento: mediana === null ? null : r2(mediana),
    taxa_ganho_decididos: pct(ganhos.length, ganhos.length + perdidos.length),
    por_segmento: porSegmento,
    especificadores: cl.filter((c) => c.segmento === "especificador").sort((a, b) => b.orcamentos - a.orcamentos),
    clientes_lista: cl.sort((a, b) => b.orcamentos - a.orcamentos),
    concentracao: maior ? { nomes: maior.nomes, orcamentos: maior.orcamentos, pct: pct(maior.orcamentos, lista.length) } : null,
    duplicados: cl.filter((c) => c.nomes.length > 1).map((c) => c.nomes),
  };
}

// ---------------------------------------------------------------- cadencias de follow-up
// Cada passo vira, no dia, uma TAREFA para o papel indicado e, quando houver texto, um RASCUNHO na
// Caixa de saida. A cadencia para sozinha quando o registro sai do estado que a iniciou.
// {{nome}} {{empresa}} {{vendedor}} sao trocados pelos dados do registro.
export const CADENCIAS = [
  {
    id: "lead_novo", nome: "Lead novo (contato que chegou)", gatilho: { tipo: "lead", estado: "novo" }, papel: "sdr",
    porque: "Responder em até 1 hora multiplica a chance de qualificar (HBR, 2.241 empresas).",
    passos: [
      { dia: 0, canal: "whatsapp", acao: "Responder em até 1 hora: agradecer, fazer 2 perguntas (cidade e fase da obra) e oferecer a visita técnica",
        texto: "Olá, {{nome}}! Aqui é {{vendedor}}, da VOICE. Obrigado pelo contato. Para te orientar bem: o imóvel fica em qual cidade e em que fase está a obra (projeto, infraestrutura, acabamento ou pronto)? Se fizer sentido, agendo uma visita técnica sem custo." },
      { dia: 1, canal: "ligacao", acao: "Ligar se não respondeu: entender o projeto (GPCT: objetivo, plano, desafio, prazo) e marcar a visita" },
      { dia: 3, canal: "whatsapp", acao: "Mandar um projeto parecido (case com foto e o arquiteto creditado) e repetir o convite",
        texto: "{{nome}}, separei um projeto parecido com o seu para você ter uma ideia do resultado. Quer que eu reserve um horário para a visita técnica esta semana?" },
      { dia: 7, canal: "email", acao: "E-mail curto com o que a VOICE faz no tipo de imóvel dele e um link de agenda",
        assunto: "Automação para o seu projeto", texto: "Olá, {{nome}}.\n\nRetomando seu contato com a VOICE: cuidamos de automação, Wi-Fi, áudio e vídeo e segurança, integrados ao projeto de arquitetura, sem quebrar o acabamento.\n\nSe quiser, agende a visita técnica no horário que preferir respondendo este e-mail.\n\n{{vendedor}}\nVOICE Ambientes Inteligentes" },
      { dia: 14, canal: "whatsapp", acao: "Último convite com algo novo (dica de infraestrutura para a fase da obra dele)",
        texto: "{{nome}}, uma dica que evita retrabalho: a infraestrutura de automação e rede precisa entrar antes do acabamento. Se ainda estiver nessa fase, consigo te ajudar sem compromisso." },
      { dia: 30, canal: "email", acao: "Encerramento educado: perguntar se pode encerrar por enquanto (quem responde costuma reabrir)",
        assunto: "Posso encerrar por enquanto?", texto: "Olá, {{nome}}.\n\nComo não conseguimos conversar, vou encerrar seu atendimento por enquanto para não incomodar. Quando a obra chegar na fase certa, é só responder este e-mail.\n\n{{vendedor}}\nVOICE" },
    ],
  },
  {
    id: "proposta_enviada", nome: "Proposta enviada", gatilho: { tipo: "proposta", estado: "enviada" }, papel: "consultor",
    porque: "A proposta precisa ser apresentada e acompanhada; o retorno nos dias 2, 5, 10, 20 e 35 cobre a decisão do casal, do arquiteto e da obra.",
    passos: [
      { dia: 2, canal: "ligacao", acao: "Ligar para tirar dúvidas e combinar a reunião de apresentação (se ainda não houve)" },
      { dia: 5, canal: "whatsapp", acao: "Mandar um case do mesmo tipo de imóvel e perguntar o que falta para decidir",
        texto: "{{nome}}, conseguiu olhar a proposta? Separei um projeto parecido que entregamos. Ficou alguma dúvida que eu possa resolver?" },
      { dia: 10, canal: "email", acao: "Lembrar a validade (preço de itens importados depende do dólar) e oferecer ajuste de escopo",
        assunto: "Sua proposta VOICE", texto: "Olá, {{nome}}.\n\nPassando para lembrar que a proposta tem validade curta por causa dos itens importados. Se quiser, ajusto o escopo para caber no momento da obra.\n\n{{vendedor}}\nVOICE" },
      { dia: 20, canal: "ligacao", acao: "Ligar: entender a objeção real (preço, prazo, outro fornecedor, fase da obra) e registrar" },
      { dia: 35, canal: "whatsapp", acao: "Encerramento: perguntar se pode encerrar e registrar o motivo de perda se for o caso",
        texto: "{{nome}}, vou encerrar a proposta por aqui para não te incomodar. Se mudar algo na obra, me chama que retomamos de onde paramos." },
    ],
  },
  {
    id: "parceiro_prospeccao", nome: "Parceiro em prospecção (escritório de arquitetura, designer, construtora)", gatilho: { tipo: "parceiro", estado: "prospectado" }, papel: "gestor_parceiros",
    porque: "Relacionamento por conteúdo técnico e capacitação; sem WhatsApp frio (só com autorização) e e-mail 1:1 com opção de sair (BIB-0107).",
    passos: [
      { dia: 0, canal: "email", acao: "E-mail 1:1 personalizado (cite um projeto do escritório) oferecendo o café técnico de 40 minutos e o caderno técnico",
        assunto: "Automação sem quebrar o acabamento — café técnico", texto: "Olá, {{nome}}.\n\nSou {{vendedor}}, da VOICE (automação, Wi-Fi, áudio e vídeo de alto padrão). Vi o trabalho do {{empresa}} e acredito que podemos facilitar seus projetos: levo ao escritório 40 minutos sobre o que precisa estar previsto (tubulação, quadros, rack, pontos de Wi-Fi) e deixo nosso caderno técnico.\n\nTem um horário na próxima semana?\n\n{{vendedor}}\nVOICE Ambientes Inteligentes\n(Se preferir não receber mais mensagens, é só responder \"sair\".)" },
      { dia: 4, canal: "ligacao", acao: "Ligar para o escritório e agendar o café técnico" },
      { dia: 10, canal: "email", acao: "Mandar um case com o arquiteto creditado (com autorização) e repetir o convite",
        assunto: "Um projeto que entregamos com arquitetura", texto: "Olá, {{nome}}.\n\nCompartilho um projeto entregue em parceria com um escritório de arquitetura, para mostrar como a automação some no acabamento. Continuo à disposição para o café técnico.\n\n{{vendedor}}\nVOICE\n(Para não receber mais mensagens, responda \"sair\".)" },
      { dia: 20, canal: "visita", acao: "Convidar para visitar uma obra entregue ou evento/showroom" },
      { dia: 45, canal: "email", acao: "Retomar com conteúdo novo (norma, tendência, checklist de infraestrutura) ou marcar como inativo" },
    ],
  },
  {
    id: "reativacao", nome: "Reativação de cliente ou orçamento antigo", gatilho: { tipo: "lead", estado: "novo", origem: "cliente_antigo_reativacao" }, papel: "consultor",
    porque: "A base do Zoho tem dezenas de orçamentos sem decisão registrada (BIB-0103): é o canal mais barato.",
    passos: [
      { dia: 0, canal: "whatsapp", acao: "Mensagem pessoal lembrando o projeto e oferecendo revisão (novidades: Wi-Fi mais rápido, comando por voz, segurança)",
        texto: "Olá, {{nome}}! Aqui é {{vendedor}}, da VOICE. Lembrei do seu projeto conosco e de algumas novidades que podem fazer sentido para você. Posso te mandar uma revisão rápida do que dá para melhorar?" },
      { dia: 4, canal: "ligacao", acao: "Ligar para entender o momento (obra concluída? mudou algo?) e oferecer visita" },
      { dia: 14, canal: "email", acao: "E-mail com uma novidade concreta e convite para visita técnica" },
    ],
  },
  {
    id: "pos_venda", nome: "Pós-venda e indicação", gatilho: { tipo: "oportunidade", estado: "ganha" }, papel: "consultor",
    porque: "Cliente satisfeito é a melhor fonte de indicação; pedir na hora certa (entrega, 30 e 90 dias).",
    passos: [
      { dia: 1, canal: "whatsapp", acao: "Boas-vindas e próximos passos da obra", modelo: "whatsapp_boas_vindas" },
      { dia: 30, canal: "whatsapp", acao: "Pesquisa de satisfação (NPS 0 a 10) depois da entrega",
        texto: "{{nome}}, tudo funcionando como você imaginou? De 0 a 10, quanto você recomendaria a VOICE a um amigo? Sua resposta ajuda muito." },
      { dia: 90, canal: "ligacao", acao: "Ligação de 90 dias: ajustes, treinamento e pedido de indicação (amigos, arquiteto, síndico)" },
      { dia: 365, canal: "visita", acao: "Revisão anual e oferta de plano de manutenção/suporte" },
    ],
  },
];

/** Cadencia que se aplica ao registro (a mais especifica primeiro). */
export function cadenciaDoRegistro(reg) {
  const casa = (c) => c.gatilho.tipo === reg.tipo && c.gatilho.estado === reg.estado && (!c.gatilho.origem || c.gatilho.origem === reg.dados?.origem);
  return CADENCIAS.filter((c) => c.gatilho.origem).find(casa) ?? CADENCIAS.filter((c) => !c.gatilho.origem).find(casa) ?? null;
}

const DIA = 86_400_000;
/** Data de cada passo a partir do inicio (sabado e domingo passam para segunda). */
export function agendaCadencia(cadencia, inicioISO) {
  const base = Date.parse(`${String(inicioISO).slice(0, 10)}T12:00:00Z`);
  return cadencia.passos.map((p, i) => {
    let t = base + p.dia * DIA;
    const dow = new Date(t).getUTCDay();
    if (dow === 6) t += 2 * DIA; else if (dow === 0) t += DIA;
    return { ...p, ordem: i + 1, data: new Date(t).toISOString().slice(0, 10) };
  });
}

/** Troca {{campo}} pelos dados do registro (o que faltar fica entre colchetes para a pessoa completar). */
export function preencher(texto, vars) {
  return String(texto ?? "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ? String(vars[k]) : `[${k}]`));
}

// ---------------------------------------------------------------- canais de aquisicao
// dono = setor que responde pelo canal; ia = o que o VEOS/diretores fazem; cuidado = limite legal/decisao.
export const CANAIS = [
  { id: "especificadores", canal: "Arquitetos e designers de interiores", dono: "vendas", apoio: "marketing", cadencia: "parceiro_prospeccao",
    oferta: "Café técnico de 40 min no escritório + caderno técnico (pontos, infraestrutura, blocos CAD, memorial) + visita a obra entregue",
    metrica: "Especificadores ativos (indicaram em 90 dias), orçamentos e vendas por especificador", ia: "Pesquisa o escritório em fontes públicas, rascunha o e-mail 1:1, lembra o próximo toque e prepara o resumo antes do café",
    ferramenta: "VEOS (parceiros e cadência), Gmail, Google Agenda ou Cal.com (grátis)", cuidado: "RT a arquiteto com registro no CAU: decidir com advogado (BIB-0105)" },
  { id: "construtoras", canal: "Construtoras e incorporadoras", dono: "vendas", apoio: "direcao", cadencia: "parceiro_prospeccao",
    oferta: "Infraestrutura preparada por unidade, decorado integrado e pacote de upgrade com preço fechado para o comprador",
    metrica: "Empreendimentos em conversa, unidades com upgrade ÷ unidades vendidas", ia: "Acompanha lançamentos publicados (notícias e sites das construtoras) e monta a proposta-padrão por unidade",
    ferramenta: "VEOS, LinkedIn (consulta manual)", cuidado: "Venda em lote: margem (CFO) e capacidade de instalação (COO) antes de fechar" },
  { id: "inbound", canal: "Contatos que chegam (site, Instagram, Google, WhatsApp)", dono: "vendas", apoio: "marketing", cadencia: "lead_novo",
    oferta: "Visita técnica / diagnóstico sem custo", metrica: "Tempo até a primeira resposta (meta: até 1 hora útil), lead → visita",
    ia: "Rascunha a primeira resposta e as perguntas de qualificação (GPCT), avisa lead parado", ferramenta: "WhatsApp Business (etiquetas por etapa, respostas rápidas, ausência), formulário Tally ou Google Forms",
    cuidado: "WhatsApp só com quem deu o número e aceitou (opt-in)" },
  { id: "google", canal: "Perfil da Empresa no Google", dono: "marketing", apoio: "vendas", cadencia: null,
    oferta: "Fotos de obras, categorias corretas, respostas a avaliações", metrica: "Avaliações, ligações e pedidos de rota por mês",
    ia: "Rascunha respostas às avaliações e o pedido de avaliação no pós-venda", ferramenta: "Perfil da Empresa no Google (grátis)", cuidado: "Proibido incentivo por avaliação e pedir só aos satisfeitos" },
  { id: "instagram", canal: "Instagram", dono: "marketing", apoio: "vendas", cadencia: null,
    oferta: "Obras reais, antes e depois, o arquiteto marcado", metrica: "Mensagens qualificadas por mês (origem registrada no lead)",
    ia: "Calendário editorial, legendas e roteiro de vídeos curtos", ferramenta: "Instagram + link com UTM", cuidado: "Imagem de cliente só com termo de autorização" },
  { id: "indicacao", canal: "Indicação de clientes", dono: "posvenda", apoio: "vendas", cadencia: "pos_venda",
    oferta: "Pedido de indicação na entrega, aos 30 e aos 90 dias", metrica: "Indicações por cliente entregue", ia: "Lembra o momento certo e rascunha o pedido",
    ferramenta: "VEOS (cadência de pós-venda)", cuidado: "Comissão de indicação (5%) precisa de contrato e tratamento fiscal (LACUNA: contador)" },
  { id: "reativacao", canal: "Reativação da base (clientes e orçamentos antigos do Zoho)", dono: "vendas", apoio: null, cadencia: "reativacao",
    oferta: "Revisão do projeto e novidades (Wi-Fi, voz, segurança)", metrica: "Orçamentos reabertos e vendas da base",
    ia: "Prioriza a base por valor e data e rascunha mensagens personalizadas", ferramenta: "VEOS (base comercial)", cuidado: "Só quem já é cliente ou contato" },
  { id: "lojas", canal: "Lojas parceiras (iluminação, marcenaria, cortinas, home theater)", dono: "vendas", apoio: null, cadencia: "parceiro_prospeccao",
    oferta: "Indicação cruzada e demonstração conjunta", metrica: "Contatos por loja por mês", ia: "Lista as lojas da região e rascunha a proposta de parceria", ferramenta: "VEOS", cuidado: "Indicação remunerada: contrato" },
  { id: "corporativo", canal: "Corporativo, hotelaria e saúde", dono: "vendas", apoio: "tecnologia", cadencia: "parceiro_prospeccao",
    oferta: "Rede e Wi-Fi corporativo, salas de reunião, automação de ambientes", metrica: "Oportunidades corporativas por trimestre",
    ia: "Mapeia empresas da região por dados abertos e rascunha a abordagem", ferramenta: "Dados abertos do CNPJ (Receita)", cuidado: "E-mail 1:1 com opção de sair" },
  { id: "prospeccao", canal: "Prospecção ativa por dados abertos", dono: "vendas", apoio: null, cadencia: "parceiro_prospeccao",
    oferta: "Escritórios de arquitetura (CNAE 7111-1/00) e design de interiores (7410-2/02) em BC, Itapema, Itajaí, Porto Belo e Florianópolis",
    metrica: "Contatos novos por semana, taxa de resposta", ia: "Prioriza a lista e personaliza cada e-mail", ferramenta: "Dados abertos do CNPJ, elencos de mostras (CASACOR), NCD",
    cuidado: "Sem raspagem e sem lista comprada; origem e base legal registradas; quem pedir sai na hora (BIB-0107)" },
  { id: "eventos", canal: "Mostras e eventos (CASACOR, NCD, DW!)", dono: "marketing", apoio: "vendas", cadencia: "parceiro_prospeccao",
    oferta: "Ambiente automatizado com arquiteto parceiro, captação com QR e agenda", metrica: "Contatos, reuniões e vendas em 12 meses", ia: "Organiza a lista do elenco e o follow-up pós-evento",
    ferramenta: "VEOS", cuidado: "Custo de participação: decisão do CEO com o CFO" },
  { id: "condominios", canal: "Condomínios e síndicos", dono: "vendas", apoio: null, cadencia: "parceiro_prospeccao",
    oferta: "Diagnóstico gratuito do Wi-Fi das áreas comuns", metrica: "Diagnósticos e apartamentos convertidos por prédio", ia: "Rascunha o relatório do diagnóstico", ferramenta: "VEOS", cuidado: "—" },
  { id: "corretores", canal: "Corretores de alto padrão", dono: "vendas", apoio: null, cadencia: "parceiro_prospeccao",
    oferta: "Laudo de tecnologia do imóvel para valorizar a revenda", metrica: "Indicações por corretor", ia: "Modelo de laudo", ferramenta: "VEOS", cuidado: "Indicação remunerada: contrato" },
  { id: "recorrente", canal: "Plano de manutenção e suporte (receita recorrente)", dono: "posvenda", apoio: "financas", cadencia: "pos_venda",
    oferta: "Suporte remoto, atualizações e vistoria anual", metrica: "Adesão ao plano entre clientes entregues", ia: "Lembra a oferta na revisão anual", ferramenta: "VEOS (recorrentes)", cuidado: "Preço do plano: alçada do CFO/CEO" },
];

// ---------------------------------------------------------------- implantacao do setor (onboarding)
// Checklist para o comercial funcionar de verdade. dono = setor; decisao = depende do fundador.
export const IMPLANTACAO = [
  { grupo: "Decisões do fundador", itens: [
    { codigo: "COM-D1", titulo: "Decidir a RT a arquitetos com registro no CAU (com advogado)", dono: "direcao", decisao: true, ref: "BIB-0105" },
    { codigo: "COM-D2", titulo: "Aprovar quem define cada meta e definir faturamento e mix por segmento", dono: "direcao", decisao: true, ref: "BIB-0106" },
    { codigo: "COM-D3", titulo: "Aprovar as regras de prospecção e mensagens", dono: "direcao", decisao: true, ref: "BIB-0107" },
    { codigo: "COM-D4", titulo: "Definir quem faz cada função (pré-vendas, consultor, parcerias, pós-venda)", dono: "direcao", decisao: true },
  ] },
  { grupo: "Base e processo", itens: [
    { codigo: "COM-B1", titulo: "Registrar todo contato novo no VEOS como lead, com a origem", dono: "vendas", como: "Setor Comercial → Lead. A origem alimenta a medição por canal." },
    { codigo: "COM-B2", titulo: "Dar situação aos orçamentos sem decisão no Zoho (ganho, perdido ou aberto, com motivo)", dono: "vendas", ref: "BIB-0103" },
    { codigo: "COM-B3", titulo: "Unificar clientes duplicados no Zoho", dono: "vendas", como: "A Base comercial aponta os nomes que parecem o mesmo cliente." },
    { codigo: "COM-B4", titulo: "Conferir o segmento de cada cliente (classificação automática pelo nome)", dono: "vendas" },
    { codigo: "COM-B5", titulo: "Registrar motivo de perda em toda oportunidade perdida", dono: "vendas" },
  ] },
  { grupo: "Canais de atendimento", itens: [
    { codigo: "COM-C1", titulo: "WhatsApp Business: perfil, catálogo, etiquetas por etapa, respostas rápidas, saudação e ausência", dono: "vendas" },
    { codigo: "COM-C2", titulo: "Agenda online para visitas técnicas (Google Agenda ou Cal.com, grátis)", dono: "secretaria" },
    { codigo: "COM-C3", titulo: "Formulário de qualificação (cidade, fase da obra, tipo de imóvel, faixa de investimento, arquiteto)", dono: "marketing", ref: "BIB-0108" },
    { codigo: "COM-C4", titulo: "E-mail com domínio próprio, assinatura padrão e SPF/DKIM (confirmar se já existe)", dono: "tecnologia" },
    { codigo: "COM-C5", titulo: "Perfil da Empresa no Google revisado (categorias, fotos, avaliações)", dono: "marketing" },
    { codigo: "COM-C6", titulo: "Instagram: bio, destaques (Projetos, Arquitetos, Como funciona) e link com UTM", dono: "marketing" },
    { codigo: "COM-C7", titulo: "Republicar o site sem a chave exposta e com as melhorias comerciais", dono: "tecnologia", ref: "BIB-0104" },
  ] },
  { grupo: "Material de venda", itens: [
    { codigo: "COM-M1", titulo: "Portfólio com fotos reais e termo de autorização de imagem", dono: "marketing" },
    { codigo: "COM-M2", titulo: "Caderno técnico do arquiteto (pontos, infraestrutura, blocos CAD, memorial)", dono: "tecnologia" },
    { codigo: "COM-M3", titulo: "Roteiro da visita técnica (SPIN) e lista de objeções com respostas", dono: "vendas" },
    { codigo: "COM-M4", titulo: "Cases por segmento (residência, apartamento, corporativo, empreendimento)", dono: "marketing" },
  ] },
  { grupo: "Prospecção e relacionamento", itens: [
    { codigo: "COM-P1", titulo: "Lista-alvo de escritórios de arquitetura (CASACOR SC, NCD, dados abertos do CNPJ)", dono: "vendas" },
    { codigo: "COM-P2", titulo: "Lista de construtoras com lançamentos em BC, Itapema, Itajaí e Porto Belo", dono: "vendas" },
    { codigo: "COM-P3", titulo: "Agenda de cafés técnicos com arquitetos (meta de atividade: proposta)", dono: "vendas" },
    { codigo: "COM-P4", titulo: "Campanha de reativação da base antiga do Zoho", dono: "vendas" },
  ] },
  { grupo: "Rotina e medição", itens: [
    { codigo: "COM-R1", titulo: "Bloco diário de prospecção e revisão semanal do pipeline", dono: "vendas" },
    { codigo: "COM-R2", titulo: "Reunião semanal marketing–comercial (leads por canal, follow-ups atrasados)", dono: "vendas" },
    { codigo: "COM-R3", titulo: "Scorecard semanal: leads, visitas, propostas, ganhos, tempo de resposta", dono: "direcao" },
  ] },
  { grupo: "Pessoas", itens: [
    { codigo: "COM-G1", titulo: "Trilha do vendedor 30/60/90 dias (imersão, execução assistida, autonomia)", dono: "pessoas" },
    { codigo: "COM-G2", titulo: "Treinamento técnico de produto e acompanhamento de um ciclo completo", dono: "tecnologia" },
  ] },
];

// ---------------------------------------------------------------- quem define cada meta (BIB-0106)
// medido = de onde o VEOS tira o numero real; meta sem decisao = LACUNA (nunca zero).
export const DONOS_METAS = [
  { meta: "Faturamento do ano e do mês", define: "direcao", persegue: "vendas", medido: "Pedidos e recebimentos do VEOS (a partir de 06/10/2026)" },
  { meta: "Mix de faturamento por segmento", define: "direcao", persegue: "vendas", medido: "Base comercial (segmento do cliente)" },
  { meta: "Margem mínima e alçada de desconto", define: "financas", persegue: "vendas", medido: "Política de Saúde Financeira V1/V1.1 (já vigente)" },
  { meta: "Verba de marketing e custo máximo por cliente (CAC)", define: "financas", persegue: "marketing", medido: "Contas a pagar (plano de contas de marketing) ÷ clientes novos" },
  { meta: "Taxas de conversão por etapa e atividades por semana", define: "vendas", persegue: "vendas", medido: "Registros do setor Comercial (lead → oportunidade → proposta)" },
  { meta: "Tempo até a primeira resposta", define: "vendas", persegue: "vendas", medido: "Lead criado → primeiro contato registrado" },
  { meta: "Leads por canal e custo por lead", define: "marketing", persegue: "marketing", medido: "Origem do lead" },
  { meta: "Especificadores ativos", define: "marketing", persegue: "vendas", medido: "Parceiros com indicação nos últimos 90 dias" },
  { meta: "Capacidade de instalação por mês", define: "operacoes", persegue: "operacoes", medido: "Agenda de obras e horas da equipe" },
  { meta: "NPS e indicações por cliente entregue", define: "posvenda", persegue: "posvenda", medido: "Cadência de pós-venda" },
];
