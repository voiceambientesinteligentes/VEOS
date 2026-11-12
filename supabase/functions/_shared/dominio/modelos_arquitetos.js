// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/modelos_arquitetos.js - nao editar a mao.
// MODELOS DE CHAMADA PARA ARQUITETOS (sem DOM): cada modelo responde UMA duvida tipica de quem projeta e
// termina com um unico convite: reuniao curta (cafe tecnico de 20 a 40 min). Ficam como PROPOSTA ate o
// Fernando aprovar o tom. Regras: 1:1 e personalizado; nada de preco, prazo ou comissao inventados;
// comissao/RT so depois do advogado (BIB-0105); sempre com a opcao de nao receber mais contato.
//
// De onde vieram as duvidas (pesquisa de 12/11/2026, trabalhos academicos e blogs do setor; NAO ha pesquisa
// com arquitetos, entao sao HIPOTESES a validar nas primeiras conversas):
//  - infraestrutura prevista ja no projeto eletrico/dados, senao se perde o potencial do sistema;
//  - compatibilizacao projeto x obra e equipamentos que nao conversam entre si;
//  - custo percebido como "artigo de luxo" e duvida de quanto reservar;
//  - pouca mao de obra especializada e falta de padrao entre solucoes (quem responde pela obra e pelo suporte);
//  - estetica: casas novas ja saem sem interruptores tradicionais (paineis limpos, sensores ocultos).

export const MODELOS_ARQUITETO = [
  { id: "infraestrutura", rotulo: "O que prever na planta", duvida: "O que preciso deixar previsto no projeto elétrico e de dados para a automação funcionar depois?",
    assunto: "{{detalhe}}: o que prever na planta para a automação",
    corpo: "Olá, {{contato}}!\n\nVi o projeto {{projeto_visto}} e gostei muito de {{detalhe}}.\n\nA dúvida que mais ouvimos de arquitetos é: o que precisa estar previsto na planta (eletrodutos, neutro nos pontos de comando, rack, rede) para a automação entrar sem quebra-quebra na obra? Montamos um caderno técnico com isso, com blocos para o CAD.\n\nPosso te mostrar em 20 minutos, no escritório ou por vídeo, e deixar o caderno com você? Qual dia da próxima semana fica melhor?\n\nAbraço,\n{{remetente}}" },
  { id: "estetica", rotulo: "Parede limpa, sem brigar com o projeto", duvida: "A automação vai estragar o desenho das paredes e o acabamento?",
    assunto: "Parede limpa em {{projeto_visto}}: como a automação entra sem aparecer",
    corpo: "Olá, {{contato}}!\n\nEm projetos como {{projeto_visto}}, o acabamento é parte do desenho. Muita gente teme que a automação traga teclados e aparelhos que brigam com ele.\n\nA gente resolve isso com o projeto: poucos pontos de comando, acabamentos que combinam com o ambiente e tudo o que pode ficar embutido ou escondido, fica. Posso te mostrar exemplos reais em 20 minutos?\n\nTem um horário na próxima semana?\n\nAbraço,\n{{remetente}}" },
  { id: "compatibilidade", rotulo: "Sistemas que conversam entre si", duvida: "E se cada equipamento for de uma marca e nada conversar?",
    assunto: "Um só comando para luz, som, cortina e rede, em {{cidade}}",
    corpo: "Olá, {{contato}}!\n\nUm risco comum em obra de alto padrão é cada fornecedor entregar um sistema, e nenhum falar com o outro: o cliente acaba com três aplicativos e controles diferentes.\n\nA VOICE projeta e integra iluminação, som, cortinas e rede como um sistema só, e se responsabiliza pelo conjunto. Posso te explicar como funciona em 20 minutos e ver se faz sentido para o próximo projeto de vocês?\n\nQual dia da próxima semana é melhor?\n\nAbraço,\n{{remetente}}" },
  { id: "custo", rotulo: "Quanto reservar no orçamento", duvida: "Quanto devo reservar para a automação no orçamento da obra do cliente?",
    assunto: "Quanto reservar para automação no orçamento do cliente",
    corpo: "Olá, {{contato}}!\n\nQuando o cliente pergunta \"quanto custa automatizar?\", a resposta depende do que ele quer: só luz e cortina é bem diferente de casa inteira. Por isso é difícil o arquiteto reservar um valor sem sair chutando.\n\nPosso te mostrar em 20 minutos como separamos a automação por nível, para você apresentar ao cliente com segurança e sem prometer o que não cabe. Sem compromisso.\n\nQue tal na próxima semana?\n\nAbraço,\n{{remetente}}" },
  { id: "obra", rotulo: "Obra sem atraso e suporte depois", duvida: "Quem responde pela instalação e pelo suporte, e como isso não atrasa a obra?",
    assunto: "Automação sem atrasar a obra e com suporte depois",
    corpo: "Olá, {{contato}}!\n\nEntre as preocupações de quem projeta, duas se repetem: a automação atrasar a obra e ninguém atender quando algo falha depois da entrega.\n\nNós trabalhamos junto com a equipe da obra, no tempo certo de cada etapa, e ficamos responsáveis pelo suporte depois. Posso te explicar como fazemos em 20 minutos?\n\nTem um horário na próxima semana?\n\nAbraço,\n{{remetente}}" },
  { id: "cliente_pediu", rotulo: "Cliente pediu casa inteligente", duvida: "Meu cliente pediu casa inteligente e não quero depender de quem não conheço.",
    assunto: "Seu cliente pediu casa inteligente? Podemos ajudar",
    corpo: "Olá, {{contato}}!\n\nQuando um cliente pede \"casa inteligente\" no meio do projeto, o arquiteto costuma ficar entre a vontade do cliente e a falta de um parceiro técnico de confiança.\n\nA VOICE pode apoiar vocês nisso: atendemos o cliente, entregamos a proposta técnica e o escritório continua conduzindo o projeto. Se fizer sentido, posso me apresentar em 20 minutos.\n\nQual dia fica bom?\n\nAbraço,\n{{remetente}}" },
  { id: "retomada", rotulo: "Segundo toque (sem resposta)", duvida: "Retomar quem não respondeu ao primeiro e-mail, sem insistir.",
    assunto: "Re: {{detalhe}}: deixo o caderno técnico com você?",
    corpo: "Olá, {{contato}}!\n\nSei que a agenda de obra é corrida, então serei breve: se for útil, posso só enviar o caderno técnico de infraestrutura para automação, sem reunião. Se preferir conversar, bastam 20 minutos.\n\nMe diga qual formato é melhor para você.\n\nAbraço,\n{{remetente}}" },
];

export const AVISO_SAIR = "\n\nSe preferir não receber mais contato, é só me avisar.";

/** Preenche as variaveis; o que falta fica entre colchetes para a pessoa completar antes de enviar. */
export function modeloPreenchido(modelo, vars = {}) {
  const sub = (t) => String(t).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] && String(vars[k]).trim()) || `[${k.replace(/_/g, " ")}]`);
  return { assunto: sub(modelo.assunto), corpo: sub(modelo.corpo) + AVISO_SAIR };
}

// Titulo grande e botao do e-mail bonito (montarEmail em domain/email_visual.js). O botao abre o WhatsApp da VOICE
// com a mensagem pronta: o arquiteto marca a reuniao com um toque.
const VISUAL = {
  infraestrutura: { titulo: "O que prever na planta para a automação funcionar", chamada: { rotulo: "Quero o caderno técnico", mensagem: "Olá! Recebi o e-mail da VOICE e quero o caderno técnico de infraestrutura para automação." } },
  estetica: { titulo: "Parede limpa: automação sem brigar com o projeto", chamada: { rotulo: "Marcar 20 minutos", mensagem: "Olá! Recebi o e-mail da VOICE sobre automação e acabamento e quero marcar 20 minutos." } },
  compatibilidade: { titulo: "Luz, som, cortina e rede em um só comando", chamada: { rotulo: "Marcar 20 minutos", mensagem: "Olá! Recebi o e-mail da VOICE sobre integração dos sistemas e quero marcar 20 minutos." } },
  custo: { titulo: "Quanto reservar para automação no orçamento", chamada: { rotulo: "Marcar 20 minutos", mensagem: "Olá! Recebi o e-mail da VOICE sobre quanto reservar para automação e quero marcar 20 minutos." } },
  obra: { titulo: "Automação sem atrasar a obra e com suporte depois", chamada: { rotulo: "Marcar 20 minutos", mensagem: "Olá! Recebi o e-mail da VOICE sobre obra e suporte e quero marcar 20 minutos." } },
  cliente_pediu: { titulo: "Seu cliente pediu casa inteligente?", chamada: { rotulo: "Falar com a VOICE", mensagem: "Olá! Recebi o e-mail da VOICE e tenho um cliente pedindo casa inteligente." } },
  retomada: { titulo: "Caderno técnico de infraestrutura, sem reunião", chamada: { rotulo: "Quero o caderno técnico", mensagem: "Olá! Quero receber o caderno técnico de infraestrutura para automação." } },
};
for (const m of MODELOS_ARQUITETO) Object.assign(m, VISUAL[m.id]);
