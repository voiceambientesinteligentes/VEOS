// CALENDARIO EDITORIAL do Instagram da VOICE (sem DOM). Banco de pautas por pilar (os mesmos pilares
// do registro "conteudo" do setor Marketing), com legenda pronta, roteiro de video curto, chamada e
// hashtags. O gerador distribui as pautas nas semanas (seg/qua/sex por padrao) alternando pilares e
// formatos, e coloca produtos reais do catalogo nas pautas de produto. Tudo e RASCUNHO: a pessoa
// revisa, grava/fotografa e publica (o VEOS nao publica nada). Regras: imagem de cliente so com
// autorizacao (registro "case"); nada de numeros inventados; credito ao arquiteto so autorizado.

export const PILARES = [
  ["tecnologia_invisivel", "Tecnologia invisível"], ["conforto_e_experiencia", "Conforto e experiência"], ["seguranca_e_tranquilidade", "Segurança e tranquilidade"],
  ["parceria_com_arquitetura", "Parceria com a arquitetura"], ["bastidores_e_engenharia", "Bastidores e engenharia"], ["cases", "Projetos entregues (cases)"],
];
export const FORMATOS = [["post", "Post (foto única)"], ["carrossel", "Carrossel"], ["reel_video", "Reel (vídeo curto)"]];
export const DIAS_PADRAO = [1, 3, 5]; // segunda, quarta, sexta

const TAGS_BASE = ["#automacaoresidencial", "#casainteligente", "#arquiteturadeinteriores", "#altopadrao", "#voiceambientesinteligentes"];

// {{produto}} = nome de um produto do catalogo; {{cidade}} = cidade escolhida
export const PAUTAS = [
  // tecnologia invisivel
  { pilar: "tecnologia_invisivel", formato: "carrossel", produto: false, titulo: "Onde a tecnologia some da parede",
    legenda: "Automação bem feita não aparece: aparece o ambiente. 🖤\n\nNeste projeto, os teclados seguem o acabamento, a rede fica no rack técnico e as caixas de som são embutidas no forro. O que sobra é a casa funcionando.\n\nVocê prefere ver os equipamentos ou só sentir o resultado?",
    roteiro: ["Plano aberto do ambiente pronto", "Close no teclado no mesmo tom da parede", "Rack técnico organizado (bastidor)", "Cena de luz mudando com um toque"], cta: "Salve para mostrar ao seu arquiteto." },
  { pilar: "tecnologia_invisivel", formato: "reel_video", produto: true, titulo: "{{produto}}: pequeno por fora, enorme no dia a dia",
    legenda: "{{produto}} parece um detalhe. No uso diário, é ele que faz a casa responder sem você pensar nisso.\n\nNo vídeo: como ele se integra às cenas da casa e por que a gente escolhe esse modelo nos projetos.",
    roteiro: ["Produto na mão (2 s)", "Instalado no ambiente", "Ação acontecendo (luz, cortina, som)", "Texto: 'pensado para sumir'"], cta: "Quer saber se cabe no seu projeto? Chame no direct." },
  { pilar: "tecnologia_invisivel", formato: "post", produto: false, titulo: "Uma tela, a casa inteira",
    legenda: "Iluminação, cortinas, clima, som e segurança no mesmo aplicativo — ou na voz. Sem cinco controles na mesa da sala.\n\nNa VOICE, cada sistema é integrado e testado antes da entrega.",
    roteiro: [], cta: "Comente 'APP' e mostramos como fica no celular." },
  { pilar: "tecnologia_invisivel", formato: "carrossel", produto: false, titulo: "3 decisões que precisam ser tomadas antes do reboco",
    legenda: "Automação começa na obra, não na mudança.\n\n1. Onde ficam os pontos de rede e o rack.\n2. Quais circuitos de luz serão dimerizados.\n3. Onde passam os cabos das cortinas e do som.\n\nDecidir depois custa quebrar parede.",
    roteiro: [], cta: "Envie para quem está construindo." },
  // conforto e experiencia
  { pilar: "conforto_e_experiencia", formato: "reel_video", produto: false, titulo: "Cena 'Chegar em casa'",
    legenda: "Você abre a porta e a casa já sabe: luz no caminho, clima ajustado, música baixa. É uma cena — programada uma vez, usada todo dia.\n\nQual cena faria mais diferença na sua rotina?",
    roteiro: ["Porta abrindo", "Luzes acendendo em sequência", "Cortina abrindo", "Som começando baixo"], cta: "Conta nos comentários a sua cena ideal." },
  { pilar: "conforto_e_experiencia", formato: "carrossel", produto: false, titulo: "Cinema em casa sem complicação",
    legenda: "Um botão: a luz baixa, a cortina fecha, a TV e o som ligam na entrada certa. Sem procurar controle.\n\nHome theater bom é o que a família inteira consegue usar.",
    roteiro: [], cta: "Salve para o seu projeto de sala de TV." },
  { pilar: "conforto_e_experiencia", formato: "post", produto: true, titulo: "{{produto}} no projeto",
    legenda: "Por que especificamos {{produto}}: qualidade de uso no dia a dia, suporte no Brasil e integração com o resto da casa.\n\nCada item do projeto é testado antes de ir para a obra.",
    roteiro: [], cta: "Dúvidas sobre o equipamento? Pergunte aqui." },
  { pilar: "conforto_e_experiencia", formato: "reel_video", produto: false, titulo: "Bom dia automático",
    legenda: "Cortina abrindo devagar no horário que você escolheu, luz suave, café na hora certa (com a tomada inteligente). Acordar fica diferente.",
    roteiro: ["Quarto escuro", "Cortina abrindo devagar", "Luz suave", "Pessoa se espreguiçando (sem rosto, se não houver autorização)"], cta: "Salve e mostre para quem acorda mal-humorado 😄" },
  // seguranca
  { pilar: "seguranca_e_tranquilidade", formato: "carrossel", produto: false, titulo: "Viajar tranquilo",
    legenda: "Câmeras no celular, simulação de presença com as luzes, fechadura com senha temporária para quem precisa entrar.\n\nSegurança é saber o que acontece em casa sem depender de ninguém.",
    roteiro: [], cta: "Envie para quem vai viajar nas férias." },
  { pilar: "seguranca_e_tranquilidade", formato: "reel_video", produto: true, titulo: "{{produto}} em 20 segundos",
    legenda: "Como o {{produto}} protege a casa e avisa no celular. Instalação limpa, sem fio aparente.",
    roteiro: ["Produto instalado", "Notificação no celular", "Ação (abrir/fechar/gravar)", "Logo VOICE"], cta: "Chame no direct para um diagnóstico da sua casa." },
  { pilar: "seguranca_e_tranquilidade", formato: "post", produto: false, titulo: "Wi-Fi forte é segurança também",
    legenda: "Câmera que perde sinal não grava. Fechadura sem rede não avisa. Por isso todo projeto da VOICE começa pela rede: access points certos, cabo onde precisa e tudo testado.",
    roteiro: [], cta: "Seu Wi-Fi cai no quarto? Conta pra gente." },
  // parceria com arquitetura
  { pilar: "parceria_com_arquitetura", formato: "carrossel", produto: false, titulo: "Para arquitetos: o que levar à primeira reunião de automação",
    legenda: "Arquiteto(a), estes 5 itens fazem a reunião render:\n1. Planta com layout de mobiliário\n2. Projeto luminotécnico (mesmo preliminar)\n3. Desejos do cliente por ambiente\n4. Fase e cronograma da obra\n5. Padrão de acabamento dos teclados\n\nA VOICE devolve o projeto de pontos para você aprovar.",
    roteiro: [], cta: "Salve e marque um colega de escritório." },
  { pilar: "parceria_com_arquitetura", formato: "post", produto: false, titulo: "Café técnico com escritórios",
    legenda: "Toda semana recebemos escritórios de arquitetura para um café técnico de 40 minutos: novidades, infraestrutura e como evitar retrabalho na obra.\n\nQuer marcar o do seu escritório?",
    roteiro: [], cta: "Chame no direct para agendar." },
  { pilar: "parceria_com_arquitetura", formato: "reel_video", produto: false, titulo: "Teclado no mesmo acabamento do projeto",
    legenda: "O teclado não precisa brigar com o projeto. Cores, materiais e gravações seguem a linguagem do ambiente — decisão do arquiteto, execução da VOICE.",
    roteiro: ["Amostras de acabamento", "Teclado instalado", "Close na gravação", "Ambiente completo"], cta: "Arquiteto(a): peça o nosso caderno técnico." },
  // bastidores
  { pilar: "bastidores_e_engenharia", formato: "reel_video", produto: false, titulo: "Por dentro de um rack bem feito",
    legenda: "Cabos identificados, ventilação, nobreak e espaço para crescer. É aqui que a casa inteligente fica estável por anos.",
    roteiro: ["Rack antes (cabos soltos) — só se for nosso", "Organização", "Etiquetas", "Rack pronto"], cta: "Salve para comparar com o da sua obra." },
  { pilar: "bastidores_e_engenharia", formato: "carrossel", produto: false, titulo: "Como testamos antes de entregar",
    legenda: "Antes da entrega: teste de cada cena, de cada ponto de rede, do sinal Wi-Fi em todos os ambientes e treinamento com a família. Só entregamos o que passou no checklist.",
    roteiro: [], cta: "Pergunte qual é o nosso checklist." },
  { pilar: "bastidores_e_engenharia", formato: "post", produto: true, titulo: "Chegou para a obra: {{produto}}",
    legenda: "Equipamento conferido e testado em bancada antes de ir para a obra. Pequeno passo, menos surpresa na instalação.",
    roteiro: [], cta: "Acompanhe nossas obras nos stories." },
  { pilar: "bastidores_e_engenharia", formato: "reel_video", produto: false, titulo: "Um dia de obra da equipe VOICE",
    legenda: "Infraestrutura, passagem de cabos, instalação e programação: um dia de obra em 30 segundos.",
    roteiro: ["Chegada na obra (EPI)", "Passagem de cabos", "Instalação", "Programação no notebook", "Teste final"], cta: "Siga para ver o projeto ficar pronto." },
  // cases
  { pilar: "cases", formato: "carrossel", produto: false, titulo: "Projeto entregue em {{cidade}}",
    legenda: "Mais um projeto entregue em {{cidade}}: [sistemas entregues]. [Crédito ao escritório de arquitetura, se autorizado].\n\nSOMENTE COM CASE AUTORIZADO (registro Case no Marketing).",
    roteiro: [], cta: "Quer um projeto assim? Chame no direct." },
  { pilar: "cases", formato: "reel_video", produto: false, titulo: "Antes e depois da automação",
    legenda: "O mesmo ambiente, antes e depois: menos interruptores, mais cenas, tudo no celular.\n\nSOMENTE COM CASE AUTORIZADO.",
    roteiro: ["Antes (parede cheia de interruptores)", "Depois (teclado único)", "Cena funcionando"], cta: "Salve para inspirar o seu projeto." },
];

const rotuloDe = (lista, v) => lista.find(([k]) => k === v)?.[1] ?? v;
export const rotuloPilar = (v) => rotuloDe(PILARES, v);
export const rotuloFormato = (v) => rotuloDe(FORMATOS, v);

const iso = (d) => d.toISOString().slice(0, 10);
const preencher = (t, vars) => String(t).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `[${k}]`);
const tagCidade = (cidade) => (cidade ? `#${String(cidade).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "").toLowerCase()}` : null);

/**
 * Calendario: { inicio: "AAAA-MM-DD", semanas, dias: [1..6], cidade, produtos: [{nome}] } -> posts.
 * Alterna pilares (ciclo fixo) e evita repetir a mesma pauta ate esgotar o banco. Determinístico.
 */
export function gerarCalendario({ inicio, semanas = 4, dias = DIAS_PADRAO, cidade = "", produtos = [], deslocamento = 0 } = {}) {
  const base = new Date(`${inicio}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) throw new Error("data de início inválida");
  // primeira segunda-feira a partir do inicio
  while (base.getUTCDay() !== 1) base.setUTCDate(base.getUTCDate() + 1);
  const ordemPilar = PILARES.map(([k]) => k);
  const usadas = new Set();
  const posts = [];
  let k = deslocamento, prod = deslocamento;
  for (let s = 0; s < Math.min(Math.max(1, semanas), 12); s++) {
    for (const dia of [...new Set(dias)].filter((x) => x >= 1 && x <= 6).sort()) {
      const data = new Date(base);
      data.setUTCDate(base.getUTCDate() + s * 7 + (dia - 1));
      const pilar = ordemPilar[k % ordemPilar.length];
      k += 1;
      const doPilar = PAUTAS.filter((p) => p.pilar === pilar && (p.produto ? produtos.length > 0 : true));
      let pauta = doPilar.find((p) => !usadas.has(p)) ?? doPilar[(s + dia) % Math.max(1, doPilar.length)];
      if (!pauta) continue;
      usadas.add(pauta);
      if (doPilar.every((p) => usadas.has(p))) for (const p of doPilar) usadas.delete(p);
      const produto = pauta.produto ? produtos[prod++ % produtos.length]?.nome : null;
      const vars = { produto: produto ?? "", cidade: cidade || "[cidade]" };
      posts.push({
        data: iso(data), pilar, formato: pauta.formato, titulo: preencher(pauta.titulo, vars), legenda: preencher(pauta.legenda, vars), roteiro: pauta.roteiro.map((r) => preencher(r, vars)),
        cta: pauta.cta, hashtags: [...TAGS_BASE, tagCidade(cidade)].filter(Boolean).join(" "), produto, exigeAutorizacao: pauta.pilar === "cases",
      });
    }
  }
  return posts;
}

/** Texto pronto para copiar (legenda + chamada + hashtags). */
export const textoPost = (p) => `${p.legenda}\n\n${p.cta}\n\n${p.hashtags}`;

/** Registro "conteudo" do setor Marketing a partir de um post do calendario (estado ideia). */
export const registroConteudo = (p) => ({
  setor: "marketing", tipo: "conteudo", titulo: p.titulo.slice(0, 200), estado: "ideia", prazo: p.data,
  dados: { formato: p.formato, canal: "instagram", pilar: p.pilar, data_publicacao: p.data, imagem_de_cliente: "nao" },
});

/** Rotina do Instagram (quem faz o que). Proposta para a direcao aprovar com a estrutura do Marketing. */
export const ROTINA_INSTAGRAM = [
  { quando: "Todo dia", quem: "SDR (hoje: vendedor)", o_que: "Responder directs e comentários em até 1 hora. Quem perguntar de projeto vira contato no VEOS (Contato rápido) — a cadência cuida do resto." },
  { quando: "Todo dia", quem: "Produtor de conteúdo (hoje: coordenação de marketing)", o_que: "Stories da obra do dia (sem rosto/endereço de cliente sem autorização) e repostar menções." },
  { quando: "Todo dia", quem: "Gestor de parceiros (hoje: CSO)", o_que: "Interagir de verdade com 5 a 10 perfis de arquitetos e designers da região (comentário útil, não só curtida). Sem automação de seguir/curtir: viola as regras do Instagram e derruba a conta." },
  { quando: "Seg/Qua/Sex", quem: "Produtor de conteúdo", o_que: "Publicar o post do calendário (gerado aqui) e marcar como publicado no registro de conteúdo." },
  { quando: "Toda semana", quem: "Coordenação de marketing", o_que: "Gerar o calendário das próximas 4 semanas, separar fotos/vídeos e conferir autorizações de imagem." },
  { quando: "Todo mês", quem: "Analista de performance (hoje: coordenação)", o_que: "Contar contatos vindos do Instagram (origem do cliente/lead) e o que virou orçamento. Ajustar pilares que trazem conversa." },
];
