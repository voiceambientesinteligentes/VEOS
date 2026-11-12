// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/modelos_whatsapp.js - nao editar a mao.
// MODELOS DE WHATSAPP PARA ARQUITETOS (sem DOM). Mensagens curtas, 1:1, um unico convite (conversa/reuniao de
// 20 min). PROPOSTA ate o Fernando aprovar o tom. Sem preco, prazo, numero de clientes ou comissao inventados.
// Quem envia e uma pessoa: o VEOS so abre a conversa com o texto pronto (nada sai sozinho). Ver as duvidas de
// origem em domain/modelos_arquitetos.js (hipoteses da pesquisa de 12/11/2026).

export const MODELOS_WHATSAPP = [
  { id: "apresentacao", rotulo: "Primeiro contato", quando: "Primeira mensagem, depois de ver um projeto do escritório.",
    texto: "Olá, {{contato}}! Tudo bem? Aqui é {{remetente}}, da VOICE Ambientes Inteligentes (automação e redes para alto padrão em {{cidade}}). Vi o projeto {{projeto_visto}} e gostei muito de {{detalhe}}. Posso te mostrar em 20 minutos como evitamos retrabalho de infraestrutura na obra? Se não for o momento, sem problema." },
  { id: "infraestrutura", rotulo: "O que prever na planta", quando: "Para quem está com projeto em andamento.",
    texto: "Olá, {{contato}}! Aqui é {{remetente}}, da VOICE. Tenho um caderno técnico curto com o que prever na planta para a automação entrar sem quebra-quebra (eletrodutos, neutro nos pontos de comando, rack, rede), com blocos para o CAD. Posso te mandar por aqui? Se preferir, explico em 20 minutos." },
  { id: "estetica", rotulo: "Parede limpa", quando: "Para escritórios de interiores, que se preocupam com o acabamento.",
    texto: "Olá, {{contato}}! {{remetente}}, da VOICE. Em projetos como {{projeto_visto}}, o acabamento é parte do desenho. A gente integra luz, cortina e som com poucos pontos de comando e o que dá para esconder fica escondido. Posso te mostrar exemplos reais em 20 minutos?" },
  { id: "cliente_pediu", rotulo: "Cliente pediu casa inteligente", quando: "Quando o escritório tem cliente pedindo automação.",
    texto: "Olá, {{contato}}! {{remetente}}, da VOICE. Se algum cliente seu pedir casa inteligente, a gente atende e entrega a proposta técnica, e o escritório segue conduzindo o projeto. Posso me apresentar em 20 minutos?" },
  { id: "depois_do_email", rotulo: "Depois do e-mail", quando: "1 a 2 dias depois do e-mail, sem resposta.",
    texto: "Olá, {{contato}}! {{remetente}}, da VOICE. Te mandei um e-mail com o assunto \"{{assunto}}\". Se for mais fácil por aqui, me diga um dia da próxima semana para eu te mostrar em 20 minutos. Se não fizer sentido, é só avisar." },
  { id: "retomada", rotulo: "Retomar depois de um tempo", quando: "Quem não respondeu e você quer retomar sem insistir.",
    texto: "Olá, {{contato}}! {{remetente}}, da VOICE. Sei que a agenda de obra é corrida. Se for útil, deixo o caderno técnico com você, sem reunião. Qual formato é melhor para você?" },
];

/** Preenche as variaveis; o que falta fica entre colchetes para a pessoa completar. */
export function whatsPreenchido(modelo, vars = {}) {
  return String(modelo.texto).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] && String(vars[k]).trim()) || `[${k.replace(/_/g, " ")}]`);
}

/** Endereco que abre a conversa com o texto pronto (sem telefone, so o texto: a pessoa escolhe o contato). */
export function linkWhatsapp(telefone, texto) {
  let d = String(telefone ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  const ok = d.length >= 12 && d.length <= 13 && d.startsWith("55");
  return `https://wa.me/${ok ? d : ""}?text=${encodeURIComponent(texto)}`;
}
