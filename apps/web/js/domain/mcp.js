// Ferramentas do MCP do VEOS e o tratador JSON-RPC, SEM E/S (usado pelo MCP local do Claude Code e pelo MCP REMOTO
// do site). Cada ferramenta chama a MESMA API do site: permissoes e regras do banco valem igual. Escritas so criam o que
// a governanca permite (ideia, proposta, rascunho, cadastro, tarefa); decisao/politica, aprovacao, pagamento e envio
// continuam humanos, pela tela.
import { MODELO_NEGOCIO } from "./empresa.js";
import { buscar, buscarSolto } from "./busca.js";

export const SETORES = ["direcao", "financas", "vendas", "marketing", "operacoes", "tecnologia", "posvenda", "pessoas", "secretaria"];

/** Manual de atuacao do diretor. lerSetor(id) -> catalogo do setor; lerManual(id) -> manual ou null. Com "pedido": os procedimentos mais proximos + o essencial. */
export function manualDiretorCom({ setor, pedido }, lerSetor, lerManual) {
  if (!SETORES.includes(setor)) throw new Error(`setor invalido; use: ${SETORES.join(", ")}`);
  const s = lerSetor(setor);
  const m = lerManual(setor);
  if (!m) return { diretor: s.diretor, aviso: "manual ainda nao pesquisado: use o perfil, metodos e principios do diretor" };
  const base = { diretor: { titulo: s.diretor.titulo, nome: s.diretor.nome, perfil: s.diretor.perfil, principios: s.diretor.principios, limites: s.diretor.limites }, resumo: m.resumo,
    regras_do_veos: "Persona ficticia. Precedente orienta, nao autoriza (consulte veos_consultar_precedentes). Nao invente meta, alcada, politica nem regime tributario: registre como ideia/proposta. Diferencie fato, opiniao, inferencia e hipotese." };
  if (!pedido) return { ...base, competencias: m.competencias, frameworks: m.frameworks.map((f) => ({ nome: f.nome, autor_ou_origem: f.autor_ou_origem, quando_usar: f.quando_usar })), procedimentos: m.procedimentos.map((p) => p.pedido), indicadores: m.indicadores, rotinas: m.rotinas, armadilhas: m.armadilhas, aplicacao_voice: m.aplicacao_voice };
  const itens = m.procedimentos.map((p, i) => ({ titulo: [p.pedido, ...(p.sinonimos ?? [])].join(" · "), extra: [...(p.passos ?? []), p.entregavel].join(" "), i }));
  const exatos = buscar(pedido, itens, 3);
  const achados = (exatos.length ? exatos : buscarSolto(pedido, itens, 3)).map((a) => m.procedimentos[a.i]);
  return { ...base, pedido, procedimentos: achados.length ? achados : m.procedimentos.slice(0, 3), aviso: achados.length ? undefined : "nenhum procedimento com essas palavras: veja os primeiros e adapte",
    frameworks_relacionados: buscarSolto(pedido, m.frameworks.map((f, i) => ({ titulo: f.nome, extra: `${f.quando_usar} ${f.como_aplicar.join(" ")}`, i })), 3).map((a) => m.frameworks[a.i]),
    indicadores: m.indicadores, armadilhas: m.armadilhas };
}



const obj = (props, req = []) => ({ type: "object", properties: props, required: req, additionalProperties: false });
const str = (description, extra = {}) => ({ type: "string", description, ...extra });

// Texto devolvido ao Claude: no maximo 60 mil caracteres e SEMPRE JSON valido. Se passar, corta as maiores listas
// (nao o texto no meio) e avisa em "truncado" quantos itens existem e quantos foram mostrados.
const LIMITE_TEXTO = 60000;
export function textoMcp(dados) {
  let s = JSON.stringify(dados, null, 1);
  if (s.length <= LIMITE_TEXTO || dados === null || typeof dados !== "object") return s.slice(0, LIMITE_TEXTO);
  const copia = JSON.parse(s);
  const truncado = {};
  for (let volta = 0; volta < 40 && s.length > LIMITE_TEXTO; volta++) {
    const listas = Object.entries(copia).filter(([, v]) => Array.isArray(v) && v.length > 1).sort((a, b) => JSON.stringify(b[1]).length - JSON.stringify(a[1]).length);
    if (!listas.length) break;
    const [k, v] = listas[0];
    truncado[k] = { total: truncado[k]?.total ?? v.length, mostrados: Math.ceil(v.length / 2) };
    copia[k] = v.slice(0, truncado[k].mostrados);
    s = JSON.stringify({ ...copia, truncado }, null, 1);
  }
  return s.length <= LIMITE_TEXTO ? s : s.slice(0, LIMITE_TEXTO);
}

const ESCRITA = /^veos_(criar_|registrar_|responder_|rascunho_)/;
// Rotas que a ferramenta generica de leitura (veos_ler) pode consultar: so GET, so dados do negocio.
const LEITURA_PERMITIDA = /^(radar|resumo|painel|setores|setor\/[a-z]+|cfo|caixa|comercial|plano|fluxo|biblioteca|produtos|projetos|diretores|zoho|sistema\/saude|mensagens)(\/|\?|$)/;

/** Monta as ferramentas e o tratador JSON-RPC. manualDiretor(args) e fornecido por quem hospeda (Node le arquivos; o servidor usa os manuais embutidos). */
export function criarMcp({ manualDiretor, nome = "veos", escopo = "completo" }) {
const FERRAMENTAS_TODAS = [
  { name: "veos_manual_diretor", description: "Manual de atuação do diretor de um setor (profissional sênior: competências, métodos, procedimentos passo a passo, indicadores, erros a evitar, fontes). Use ANTES de agir como diretor: com 'pedido', devolve os procedimentos mais próximos do que foi pedido.",
    inputSchema: obj({ setor: str("setor", { enum: SETORES }), pedido: str("o que o fundador pediu (opcional)") }, ["setor"]), local: manualDiretor },
  { name: "veos_perguntas_pendentes", description: "Fila de perguntas feitas aos diretores no site, aguardando resposta. Para cada uma: leia veos_manual_diretor(setor, pergunta), consulte dados/precedentes se precisar e responda com veos_responder_pergunta.",
    inputSchema: obj({ setor: str("setor (opcional)") }), rota: (a) => ["GET", `diretores/perguntas?estado=pendente${a.setor ? `&setor=${encodeURIComponent(a.setor)}` : ""}`] },
  { name: "veos_responder_pergunta", description: "Grava a resposta do diretor (IA) a uma pergunta da fila. Responda na voz do diretor seguindo o procedimento do manual; diferencie fato, opinião, inferência e hipótese; nunca decida no lugar do fundador nem invente meta, alçada, política ou regime tributário; liste as fontes usadas.",
    inputSchema: obj({ pergunta_id: str("id da pergunta"), resposta: str("texto da resposta (pode usar listas)"), procedimento: str("procedimento do manual seguido"), fontes: { type: "array", items: { type: "object" } }, motor: str("ex.: Claude (Claude Code, plano Max)") }, ["pergunta_id", "resposta", "motor"]),
    rota: (a) => ["POST", `diretores/perguntas/${encodeURIComponent(a.pergunta_id)}/responder`, { resposta: a.resposta, procedimento: a.procedimento, fontes: a.fontes ?? [], motor: a.motor }] },
  { name: "veos_radar", description: "Alertas ativos e tarefas abertas dos setores que o usuário acessa.", inputSchema: obj({}), rota: () => ["GET", "radar"] },
  { name: "veos_resumo_do_dia", description: "Resumo do dia por setor: alertas novos, tarefas atrasadas, mensagens a enviar.", inputSchema: obj({}), rota: () => ["GET", "resumo"] },
  { name: "veos_painel", description: "Painel executivo (direção e finanças): vendas aceitas, faturado, caixa, funil do CRM, alertas.", inputSchema: obj({}), rota: () => ["GET", "painel"] },
  { name: "veos_saude", description: "Saúde do sistema (direção e tecnologia): banco, sincronização do Zoho, agendamentos, alertas SIS.", inputSchema: obj({}), rota: () => ["GET", "sistema/saude"] },
  { name: "veos_consultar_precedentes", description: "OBRIGATÓRIO antes de recomendar ou executar algo relevante: consulta decisões, políticas, aprendizados e propostas da Biblioteca (a consulta fica registrada). Precedente orienta, não autoriza.",
    inputSchema: obj({ termos: str("palavras-chave (ex.: desconto margem)"), setor: str("id do setor (opcional)"), referencia: str("objeto relacionado, ex.: pedido:<id> (opcional)") }, ["termos"]),
    rota: (a) => ["POST", "biblioteca/consultar", { termos: a.termos, setor: a.setor, referencia: a.referencia, contexto: "mcp" }] },
  { name: "veos_biblioteca_listar", description: "Lista registros da Biblioteca por área (decisoes, aprendizados, referencias, politicas, revisoes) e busca.",
    inputSchema: obj({ area: str("área", { enum: ["decisoes", "aprendizados", "referencias", "politicas", "revisoes"] }), busca: str("texto (opcional)") }, ["area"]),
    rota: (a) => ["GET", `biblioteca?${new URLSearchParams({ area: a.area, ...(a.busca ? { busca: a.busca } : {}) })}`] },
  { name: "veos_biblioteca_registro", description: "Registro completo da Biblioteca (versões, fontes, pareceres, histórico).", inputSchema: obj({ id: str("uuid do registro") }, ["id"]), rota: (a) => ["GET", `biblioteca/${encodeURIComponent(a.id)}`] },
  { name: "veos_registrar_ideia_ou_proposta", description: "Registra uma IDEIA ou PROPOSTA na Biblioteca (nunca decisão: frase solta não vira decisão). Use para sugestões que dependem de aprovação.",
    inputSchema: obj({ tipo: str("ideia ou proposta", { enum: ["ideia", "proposta"] }), titulo: str("título"), conteudo: str("o que, por que, evidências e riscos"), assuntos: { type: "array", items: { type: "string" } } }, ["tipo", "titulo", "conteudo"]),
    rota: (a) => ["POST", "biblioteca", { tipo: a.tipo, titulo: a.titulo, conteudo: `${a.conteudo}\n\n(Registrado pelo Claude Code via MCP.)`, assuntos: a.assuntos ?? [] }] },
  { name: "veos_pedidos", description: "Lista pedidos (opcional: estado rascunho/confirmado/entregue/faturado/concluido/cancelado).", inputSchema: obj({ estado: str("estado (opcional)") }),
    rota: (a) => ["GET", `fluxo/pedidos${a.estado ? `?estado=${encodeURIComponent(a.estado)}` : ""}`] },
  { name: "veos_pedido", description: "Pedido completo: itens, estoque, parcelas, NF, caixa (V1.1), compras, horas, margem orçada x realizada.", inputSchema: obj({ id: str("uuid do pedido") }, ["id"]), rota: (a) => ["GET", `fluxo/pedidos/${encodeURIComponent(a.id)}`] },
  { name: "veos_faltas_e_compras", description: "Faltas de estoque dos pedidos e o que já está em compra.", inputSchema: obj({}), rota: () => ["GET", "fluxo/compras/faltas"] },
  { name: "veos_previsao_caixa", description: "Previsão de caixa (entradas − saídas) de 2 meses atrás a 6 à frente (direção e finanças).", inputSchema: obj({}), rota: () => ["GET", "fluxo/caixa"] },
  { name: "veos_criar_tarefa", description: "Cria uma tarefa num setor (aparece no Radar).", inputSchema: obj({ setor: str("id do setor"), titulo: str("o que fazer"), prazo: str("AAAA-MM-DD (opcional)") }, ["setor", "titulo"]),
    rota: (a) => ["POST", "tarefas", { setor: a.setor, titulo: a.titulo, prazo: a.prazo ?? null }] },
  // ---- criacao pela API com as permissoes da pessoa (cadastros e rascunhos; nada e pago, enviado ou aceito por aqui)
  { name: "veos_clientes", description: "Busca clientes do VEOS por nome, código, telefone, e-mail ou cidade. Use antes de criar para não duplicar.", inputSchema: obj({ busca: str("texto da busca (opcional)") }),
    rota: (a) => ["GET", `comercial/clientes${a.busca ? `?busca=${encodeURIComponent(a.busca)}` : ""}`] },
  { name: "veos_criar_cliente", description: "Cadastra um cliente no VEOS (PF ou PJ). Precisa de nome e de telefone OU e-mail. CPF/CNPJ é validado. Procure antes com veos_clientes. Não inventa dado: o que não souber, deixe em branco.",
    inputSchema: obj({ nome: str("nome ou razão social"), tipo: str("pf ou pj", { enum: ["pf", "pj"] }), telefone: str("com DDD"), email: str("e-mail"), documento: str("CPF ou CNPJ (opcional)"), cidade: str("cidade"), uf: str("UF"), endereco_obra: str("endereço da obra"),
      origem: str("origem do contato, ex.: indicacao_arquiteto, instagram, site, showroom_evento, prospeccao_ativa, outro"), parceiro: str("arquiteto/designer/construtora que indicou"), observacao: str("observação") }, ["nome"]),
    rota: (a) => ["POST", "comercial/clientes", a] },
  { name: "veos_criar_orcamento_rascunho", description: "Cria um ORÇAMENTO em RASCUNHO (nunca enviado nem aceito: enviar, aceitar e gerar pedido são ações humanas na tela). Informe o preço negociado de cada item; o VEOS mostra margem e alçada na ficha. Não invente preço: use preço de tabela, custo real ou a Política V1; se faltar, registre como ideia/proposta.",
    inputSchema: obj({ cliente_id: str("uuid do cliente (veos_clientes)"), cliente_nome: str("nome do cliente"), valor_total: str("total ao cliente, ex.: 12800.00"), condicao: str("condição de pagamento (opcional)"), validade: str("AAAA-MM-DD (opcional)"), prazo_execucao: str("prazo (opcional)"), referencia: str("referência (opcional)"),
      itens: { type: "array", description: "itens do orçamento", items: { type: "object", properties: { tipo: { type: "string", enum: ["produto", "servico"] }, nome: { type: "string" }, quantidade: { type: "string" }, unidade: { type: "string" }, preco_unit: { type: "string" }, custo_unit: { type: "string" }, produto_id: { type: "string" }, secao: { type: "string" } }, required: ["tipo", "nome", "quantidade", "preco_unit"] } } }, ["cliente_nome", "valor_total", "itens"]),
    rota: (a) => ["POST", "comercial/orcamentos", a] },
  { name: "veos_criar_conta_a_pagar", description: "Lança uma CONTA A PAGAR (compromisso com vencimento). Só registra: o pagamento é feito e confirmado por uma pessoa na tela (Contas a pagar). Exige perfil financeiro ou direção.",
    inputSchema: obj({ descricao: str("o que é"), fornecedor: str("fornecedor/favorecido"), categoria: str("categoria", { enum: ["servico_terceiro", "frete", "imposto", "despesa_fixa", "outro"] }), vencimento: str("AAAA-MM-DD"), valor: str("valor, ex.: 350.00"), fornecedor_id: str("uuid do fornecedor cadastrado (opcional)") }, ["descricao", "fornecedor", "categoria", "vencimento", "valor"]),
    rota: (a) => ["POST", "fluxo/contas-pagar", a] },
  { name: "veos_fornecedores", description: "Lista/busca fornecedores cadastrados no VEOS.", inputSchema: obj({ busca: str("texto (opcional)") }), rota: (a) => ["GET", `fluxo/fornecedores${a.busca ? `?busca=${encodeURIComponent(a.busca)}` : ""}`] },
  { name: "veos_criar_fornecedor", description: "Cadastra um fornecedor (nome obrigatório; CNPJ/CPF validado). Procure antes com veos_fornecedores.",
    inputSchema: obj({ nome: str("nome"), documento: str("CNPJ/CPF (opcional)"), categoria: str("equipamentos, importacao, infraestrutura, servico_terceiro, frete, software ou outro"), contato_nome: str("contato"), telefone: str("telefone"), email: str("e-mail"), cidade: str("cidade"), uf: str("UF"),
      prazo_pagamento_dias: str("prazo de pagamento em dias (opcional)"), prazo_entrega_dias: str("prazo de entrega em dias (opcional)"), condicao: str("condição comercial (opcional)") }, ["nome"]),
    rota: (a) => ["POST", "fluxo/fornecedores", a] },
  { name: "veos_criar_contrato_suporte", description: "Cadastra um CONTRATO DE SUPORTE (receita recorrente): o VEOS gera as cobranças mensais e as põe na previsão de caixa. Perfil financeiro, pós-venda ou direção.",
    inputSchema: obj({ cliente_nome: str("cliente"), cliente_id: str("uuid do cliente (opcional)"), descricao: str("o que cobre"), valor_mensal: str("valor mensal, ex.: 1200.00"), dia_vencimento: str("1 a 28 (opcional, padrão 10)"), inicio: str("AAAA-MM-DD"), fim: str("AAAA-MM-DD (opcional)") }, ["cliente_nome", "descricao", "valor_mensal", "inicio"]),
    rota: (a) => ["POST", "fluxo/contratos-suporte", a] },
  { name: "veos_rascunho_mensagem", description: "Guarda um rascunho na caixa de saída (e-mail ou WhatsApp). O VEOS não envia: uma pessoa revisa e envia.",
    inputSchema: obj({ canal: str("email ou whatsapp", { enum: ["email", "whatsapp"] }), corpo: str("texto"), destinatario: str("e-mail ou telefone (opcional)"), assunto: str("assunto (opcional)"), setor_id: str("setor (opcional)") }, ["canal", "corpo"]),
    rota: (a) => ["POST", "mensagens", { canal: a.canal, corpo: a.corpo, destinatario: a.destinatario, assunto: a.assunto, setor_id: a.setor_id, origem: "manual" }] },
  { name: "veos_ler", description: "Leitura livre de qualquer tela de dados do VEOS (somente consulta, nada é alterado). Exemplos de rota: cfo/orcamentos?resumo=1, caixa/saldos, caixa/fluxo, caixa/dre, caixa/indicadores, comercial/clientes, comercial/orcamentos, plano, fluxo/pedidos, fluxo/contas-pagar, fluxo/contratos-suporte, produtos, setor/vendas, projetos, zoho/... Se a rota não existir, o erro diz.",
    inputSchema: obj({ rota: str("caminho da API sem barra inicial, com ?filtros se precisar. Só os grupos: radar, resumo, painel, setores, setor/<id>, cfo, caixa, comercial, plano, fluxo, biblioteca, produtos, projetos, diretores, zoho, sistema/saude, mensagens") }, ["rota"]),
    rota: (a) => {
      const r = String(a.rota ?? "").replace(/^\/+/, "").replace(/^api\//, "");
      if (r.includes("..") || r.includes("//") || !LEITURA_PERMITIDA.test(r)) throw new Error("rota fora da leitura permitida (use os grupos listados na descrição)");
      return ["GET", r];
    } },
];
const FERRAMENTAS = FERRAMENTAS_TODAS.filter((f) => escopo === "completo" || !ESCRITA.test(f.name));

const INSTRUCOES = "VEOS da VOICE Ambientes Inteligentes. " + MODELO_NEGOCIO + " Para criar no VEOS use as ferramentas veos_criar_* (cliente, orçamento em rascunho, conta a pagar, fornecedor, contrato de suporte, tarefa): procure antes para não duplicar, nunca invente dado, e lembre que pagar, enviar, aceitar orçamento e gerar pedido são ações humanas na tela. Para agir como um diretor (CEO, CFO, CMO...), leia antes veos_manual_diretor com o pedido. Antes de recomendar ou executar algo relevante, use veos_consultar_precedentes. Precedente orienta, não autoriza. Não deduza regime tributário, alçada, meta ou política: registre como ideia/proposta. Diferencie fato, opinião, inferência e hipótese. Nada é enviado a clientes pelo VEOS.";

/** Trata uma mensagem JSON-RPC. chamar(metodo, rota, corpo) -> dados da API (ou lanca erro). */
async function responder(msg, chamar) {
  const ok = (result) => ({ jsonrpc: "2.0", id: msg.id, result });
  if (msg.id === undefined || msg.id === null) return null; // notificacao
  switch (msg.method) {
    case "initialize":
      return ok({ protocolVersion: msg.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: nome, version: "1.0.0" }, instructions: INSTRUCOES });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: FERRAMENTAS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const f = FERRAMENTAS.find((x) => x.name === msg.params?.name);
      if (!f) return { jsonrpc: "2.0", id: msg.id, error: { code: -32602, message: `ferramenta desconhecida: ${msg.params?.name}` } };
      const args = msg.params?.arguments ?? {};
      const faltando = (f.inputSchema.required ?? []).filter((k) => args[k] === undefined || args[k] === "");
      if (faltando.length) return ok({ content: [{ type: "text", text: `Faltou: ${faltando.join(", ")}` }], isError: true });
      try {
        if (f.local) return ok({ content: [{ type: "text", text: textoMcp(f.local(args)) }] });
        const [metodo, rota, corpo] = f.rota(args);
        const dados = await chamar(metodo, rota, corpo);
        return ok({ content: [{ type: "text", text: textoMcp(dados) }] });
      } catch (e) {
        return ok({ content: [{ type: "text", text: `Erro do VEOS: ${e.message}` }], isError: true });
      }
    }
    default:
      return { jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `método não suportado: ${msg.method}` } };
  }
}
  return { FERRAMENTAS, responder };
}
