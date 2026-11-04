// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/prospeccao.js - nao editar a mao.
// PROSPECCAO ATIVA da VOICE (sem DOM): para cada publico, onde encontrar (buscas publicas abertas
// numa nova aba: Google Maps, Instagram, LinkedIn, mostras), como abordar (roteiro e mensagem 1:1
// personalizada) e os cuidados legais. O alvo encontrado vira "parceiro" (prospectado) no setor
// Comercial: a cadencia de parceiro (e-mail, ligacao, case, visita) cria as tarefas e os rascunhos.
// Nada e enviado em massa nem automaticamente: cada mensagem e personalizada e enviada por uma pessoa
// (LGPD: legitimo interesse B2B, com opcao de sair; regra de prospeccao BIB-0107 ainda em decisao).

const q = (s) => encodeURIComponent(s);
const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const hashtag = (s) => semAcento(s).replace(/[^A-Za-z0-9]/g, "").toLowerCase();

export const PUBLICOS = [
  { id: "arquitetos", nome: "Escritórios de arquitetura", tipo_parceiro: "arquiteto", oferta: "Café técnico de 40 min no escritório + caderno técnico de infraestrutura (pontos, rack, blocos CAD).",
    termos: ["arquitetura de interiores", "escritório de arquitetura", "arquiteto residencial alto padrão"], hashtags: ["arquitetura", "arquiteturadeinteriores", "interiores"],
    qualificar: ["Faz residencial de alto padrão?", "Quantas obras por ano?", "Já especifica automação? Com quem?", "Quem do escritório decide fornecedores?"],
    mensagem: "Olá, {{contato}}! Sou {{remetente}}, da VOICE Ambientes Inteligentes (automação e redes para alto padrão aqui em {{cidade}}). Vi o projeto {{projeto_visto}} de vocês e gostei muito de {{detalhe}}. Queria oferecer um café técnico de 40 minutos no escritório para mostrar como evitamos retrabalho de infraestrutura na obra, e deixar nosso caderno técnico. Faz sentido para vocês em alguma tarde da próxima semana? Se preferir não receber contato, é só me avisar." },
  { id: "designers", nome: "Designers de interiores", tipo_parceiro: "designer_interiores", oferta: "Visita ao showroom/obra entregue e guia de acabamentos de teclados e sonorização embutida.",
    termos: ["design de interiores", "designer de interiores"], hashtags: ["designdeinteriores", "decoracao", "interiores"],
    qualificar: ["Trabalha com reforma ou obra nova?", "Clientes pedem automação/som?", "Indica fornecedores ao cliente?"],
    mensagem: "Olá, {{contato}}! Aqui é {{remetente}}, da VOICE (automação, som e iluminação inteligente em {{cidade}}). Acompanho seus projetos — {{detalhe}} ficou lindo. Posso te mostrar em 30 minutos como integramos teclados e caixas de som sem brigar com o design? Se não fizer sentido, sem problema." },
  { id: "construtoras", nome: "Construtoras e incorporadoras", tipo_parceiro: "construtora", oferta: "Proposta-padrão por unidade (upgrade de automação/rede) e infraestrutura pronta no empreendimento.",
    termos: ["construtora alto padrão", "incorporadora", "lançamento imobiliário alto padrão"], hashtags: ["lancamentoimobiliario", "altopadrao", "construtora"],
    qualificar: ["Quantos lançamentos por ano?", "Oferece personalização ao comprador?", "Quem cuida de fornecedores de sistemas?"],
    mensagem: "Olá, {{contato}}! Sou {{remetente}}, da VOICE Ambientes Inteligentes. Vi o lançamento {{projeto_visto}} em {{cidade}}. Trabalhamos com infraestrutura de rede e automação por unidade, com proposta-padrão para o comprador fazer o upgrade sem atrasar a obra. Posso apresentar em 20 minutos?" },
  { id: "lojas", nome: "Lojas parceiras (iluminação, marcenaria, cortinas, home theater)", tipo_parceiro: "outro", oferta: "Indicação cruzada e demonstração conjunta com o cliente.",
    termos: ["loja de iluminação", "cortinas e persianas", "marcenaria planejados alto padrão", "home theater"], hashtags: ["iluminacao", "cortinas", "marcenaria"],
    qualificar: ["Atende o mesmo cliente de alto padrão?", "Já indica instaladores?", "Faria demonstração conjunta?"],
    mensagem: "Olá, {{contato}}! Sou {{remetente}}, da VOICE (automação em {{cidade}}). Atendemos o mesmo cliente que vocês e muitas vezes o projeto de {{detalhe}} precisa de automação. Que tal trocarmos indicações e fazer uma demonstração conjunta? Posso passar aí para conversar?" },
  { id: "condominios", nome: "Condomínios e síndicos", tipo_parceiro: "outro", oferta: "Diagnóstico gratuito do Wi-Fi das áreas comuns.",
    termos: ["condomínio residencial alto padrão", "administradora de condomínios"], hashtags: ["condominio", "sindico"],
    qualificar: ["Quantas unidades?", "Problemas de rede nas áreas comuns?", "Quem aprova melhorias (síndico, conselho)?"],
    mensagem: "Olá, {{contato}}! Sou {{remetente}}, da VOICE. Fazemos um diagnóstico gratuito do Wi-Fi das áreas comuns em condomínios de {{cidade}}. Posso agendar uma visita de 30 minutos?" },
  { id: "corretores", nome: "Corretores de alto padrão", tipo_parceiro: "outro", oferta: "Laudo de tecnologia do imóvel para valorizar a venda.",
    termos: ["imobiliária alto padrão", "corretor de imóveis de luxo"], hashtags: ["imoveisdeluxo", "corretordeimoveis"],
    qualificar: ["Trabalha com imóveis acima de R$ 2 milhões?", "Clientes pedem casa inteligente?"],
    mensagem: "Olá, {{contato}}! Sou {{remetente}}, da VOICE (automação e redes em {{cidade}}). Fazemos um laudo de tecnologia do imóvel que ajuda a valorizar a venda e a explicar o que a casa já tem. Posso te mostrar um exemplo?" },
  { id: "corporativo", nome: "Corporativo, hotelaria e saúde", tipo_parceiro: "outro", oferta: "Rede e Wi-Fi corporativo, salas de reunião e automação de ambientes.",
    termos: ["clínica médica", "hotel boutique", "escritório corporativo"], hashtags: [],
    qualificar: ["Quantos pontos/salas?", "Problemas de Wi-Fi ou salas de reunião?", "Quem decide (TI, administrativo)?"],
    mensagem: "Olá, {{contato}}! Sou {{remetente}}, da VOICE. Ajudamos empresas de {{cidade}} com rede, Wi-Fi e salas de reunião que funcionam de primeira. Posso entender em 15 minutos como está a estrutura de vocês? Se preferir não receber contato, é só avisar." },
];

/** Buscas publicas para encontrar alvos (abrem numa nova aba; nada e coletado automaticamente). */
export function ondeEncontrar(publico, cidade) {
  const c = cidade?.trim() || "Balneário Camboriú";
  const links = publico.termos.map((t) => ({ rotulo: `Google Maps: ${t} em ${c}`, url: `https://www.google.com/maps/search/${q(`${t} ${c}`)}` }));
  for (const t of publico.hashtags) links.push({ rotulo: `Instagram: #${t}${hashtag(c)}`, url: `https://www.instagram.com/explore/tags/${q(`${t}${hashtag(c)}`)}/` });
  links.push({ rotulo: `LinkedIn: ${publico.termos[0]} em ${c}`, url: `https://www.linkedin.com/search/results/companies/?keywords=${q(`${publico.termos[0]} ${c}`)}` });
  if (["arquitetos", "designers"].includes(publico.id)) links.push({ rotulo: "CASACOR (elenco de profissionais das mostras)", url: "https://casacor.abril.com.br/" });
  return links;
}

export function mensagemPara(publico, vars = {}) {
  return publico.mensagem.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] && String(vars[k]).trim()) || `[${k.replace(/_/g, " ")}]`);
}

/** Registro "parceiro" (prospectado) do setor Comercial. */
export function registroParceiro(publico, { escritorio, contato, telefone, email, nivel = "B" }, hoje = new Date().toISOString().slice(0, 10)) {
  const erros = [];
  if (!String(escritorio ?? "").trim()) erros.push("Informe o escritório/empresa.");
  if (!String(contato ?? "").trim()) erros.push("Informe a pessoa de contato (ou 'a descobrir').");
  if (!String(telefone ?? "").trim() && !String(email ?? "").trim()) erros.push("Informe telefone ou e-mail.");
  if (erros.length) return { erros };
  const dados = { tipo_parceiro: publico.tipo_parceiro, escritorio: escritorio.trim(), contato: contato.trim(), nivel, ultimo_contato: hoje };
  if (String(telefone ?? "").trim()) dados.telefone = telefone.trim();
  if (String(email ?? "").trim()) dados.email = email.trim();
  return { erros: [], registro: { setor: "vendas", tipo: "parceiro", titulo: `${escritorio.trim()} (${publico.nome})`.slice(0, 200), estado: "prospectado", dados } };
}

export const CUIDADOS = [
  "Mensagem sempre 1:1 e personalizada (cite um projeto real do escritório). Nada de disparo em massa.",
  "Ofereça a opção de não receber mais contato. Quem pedir para sair vai para a lista de bloqueio (Setor comercial → Follow-up).",
  "Use só dados públicos de empresa (site, perfil comercial, Google). Não compre listas.",
  "Não automatize seguir/curtir no Instagram: viola as regras e derruba a conta.",
  "Comissão/RT para arquiteto: só depois da decisão com o advogado (BIB-0105). Não prometa na primeira conversa.",
];
