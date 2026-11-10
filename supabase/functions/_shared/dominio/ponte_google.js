// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/ponte_google.js - nao editar a mao.
// PONTE DO VEOS COM O GMAIL E A AGENDA DO GOOGLE (sem DOM; usado pela tela Integracoes e pelos testes).
// Por que uma ponte no Google Apps Script: e GRATIS, nao pede cartao, nem dominio proprio, nem app verificado
// pelo Google. O e-mail sai do proprio Gmail da VOICE (aparece em "Enviados", as respostas chegam na caixa de
// entrada) e o VEOS consegue ler as respostas e a agenda. O Fernando cola o codigo em script.google.com e
// implanta como "App da Web" (executar como: eu; acesso: qualquer pessoa). Sem o SEGREDO, a ponte nao faz nada.
// Limite do Google para contas gratuitas: cerca de 100 destinatarios por dia.

export const VERSAO_PONTE = 1;

/** Codigo .gs da ponte com o segredo embutido (gerado pelo servidor; aparece uma vez na tela). */
export function codigoDaPonte(segredo) {
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(String(segredo ?? ""))) throw new Error("segredo inválido");
  return `// PONTE DO VEOS — Gmail e Agenda do Google da VOICE Ambientes Inteligentes (versão ${VERSAO_PONTE})
// Como usar: em script.google.com → Novo projeto → apague tudo → cole este código → Salvar.
// Depois: Implantar → Nova implantação → tipo "App da Web" → Executar como: EU → Quem pode acessar: QUALQUER PESSOA
// → Implantar → Autorizar acesso. Copie o "URL do app da Web" (termina em /exec) e cole no VEOS (Integrações).
// O VEOS só consegue usar esta ponte com o código secreto abaixo: NÃO compartilhe este arquivo.
// Para desligar: Implantar → Gerenciar implantações → Arquivar (ou apague o projeto).

var SEGREDO = "${segredo}";
var VERSAO = ${VERSAO_PONTE};

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return saida({ ok: false, erro: "pedido inválido" }); }
  if (!req || req.segredo !== SEGREDO) return saida({ ok: false, erro: "não autorizado" });
  var acao = ACOES[req.acao];
  if (!acao) return saida({ ok: false, erro: "ação desconhecida: " + req.acao });
  try {
    var r = acao(req) || {};
    r.ok = true;
    r.versao = VERSAO;
    return saida(r);
  } catch (x) {
    return saida({ ok: false, erro: String((x && x.message) || x).slice(0, 300) });
  }
}

function doGet() {
  return saida({ ok: true, servico: "ponte do VEOS", versao: VERSAO });
}

function saida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function minhaConta() {
  return String(Session.getEffectiveUser().getEmail() || "").toLowerCase();
}

function resumoMensagem(m) {
  return { id: m.getId(), de: m.getFrom(), para: m.getTo(), em: m.getDate().toISOString(), assunto: m.getSubject(), trecho: m.getPlainBody().slice(0, 500) };
}

var ACOES = {
  ping: function () {
    return { conta: minhaConta(), cota_email: MailApp.getRemainingDailyQuota() };
  },

  // envia um e-mail novo ou responde uma conversa (thread_id); devolve os ids para o VEOS acompanhar a resposta
  enviar: function (r) {
    var op = { name: r.nome_remetente || "VOICE Ambientes Inteligentes" };
    if (r.responder_para) op.replyTo = r.responder_para;
    if (r.cc) op.cc = r.cc;
    var rascunho;
    if (r.thread_id) {
      var t = GmailApp.getThreadById(r.thread_id);
      if (!t) throw new Error("conversa não encontrada no Gmail");
      rascunho = t.createDraftReply(r.corpo, op);
    } else {
      if (!r.para) throw new Error("falta o destinatário");
      rascunho = GmailApp.createDraft(r.para, r.assunto || "(sem assunto)", r.corpo, op);
    }
    var m = rascunho.send();
    return { id: m.getId(), thread_id: m.getThread().getId(), cota_email: MailApp.getRemainingDailyQuota() };
  },

  // conversas da caixa (busca no formato do Gmail, ex.: "in:inbox newer_than:2d", "from:arquiteto@x.com")
  buscar: function (r) {
    var max = Math.min(Number(r.max) || 15, 40);
    var threads = GmailApp.search(r.busca || "in:inbox newer_than:2d", 0, max);
    return {
      conversas: threads.map(function (t) {
        var ms = t.getMessages();
        var u = ms[ms.length - 1];
        return { thread_id: t.getId(), assunto: t.getFirstMessageSubject(), mensagens: ms.length, nao_lida: t.isUnread(), ultima_em: u.getDate().toISOString(), de: u.getFrom(), para: u.getTo(), trecho: u.getPlainBody().slice(0, 400) };
      }),
    };
  },

  conversa: function (r) {
    var t = GmailApp.getThreadById(r.thread_id);
    if (!t) throw new Error("conversa não encontrada no Gmail");
    return {
      assunto: t.getFirstMessageSubject(),
      mensagens: t.getMessages().slice(-10).map(function (m) {
        var x = resumoMensagem(m);
        x.texto = m.getPlainBody().slice(0, 4000);
        return x;
      }),
    };
  },

  // para o vigia do VEOS: quais conversas receberam mensagem de OUTRA pessoa depois do envio
  respostas: function (r) {
    var eu = minhaConta();
    return {
      conversas: (r.threads || []).slice(0, 60).map(function (x) {
        try {
          var t = GmailApp.getThreadById(x.thread_id);
          if (!t) return { thread_id: x.thread_id, erro: "não encontrada" };
          var desde = new Date(x.desde);
          var novas = t.getMessages().filter(function (m) { return m.getDate() > desde && String(m.getFrom()).toLowerCase().indexOf(eu) < 0; });
          var u = novas[novas.length - 1];
          return { thread_id: x.thread_id, respostas: novas.length, ultima_em: u ? u.getDate().toISOString() : null, de: u ? u.getFrom() : null, trecho: u ? u.getPlainBody().slice(0, 600) : null };
        } catch (e) {
          return { thread_id: x.thread_id, erro: String((e && e.message) || e).slice(0, 120) };
        }
      }),
    };
  },

  agenda: function (r) {
    var de = r.de ? new Date(r.de) : new Date();
    var ate = r.ate ? new Date(r.ate) : new Date(de.getTime() + 7 * 86400000);
    return {
      eventos: CalendarApp.getDefaultCalendar().getEvents(de, ate).slice(0, 100).map(function (ev) {
        return { id: ev.getId(), titulo: ev.getTitle(), inicio: ev.getStartTime().toISOString(), fim: ev.getEndTime().toISOString(), local: ev.getLocation(), convidados: ev.getGuestList().map(function (g) { return g.getEmail(); }) };
      }),
    };
  },

  evento: function (r) {
    var op = { description: r.descricao || "", location: r.local || "" };
    if (r.convidados && r.convidados.length) { op.guests = r.convidados.join(","); op.sendInvites = true; }
    var ev = CalendarApp.getDefaultCalendar().createEvent(r.titulo, new Date(r.inicio), new Date(r.fim), op);
    return { id: ev.getId() };
  },
};
`;
}

/** Passo a passo mostrado na tela (o servidor testa a ponte antes de ligar). */
export const PASSOS_PONTE = [
  "Clique em “Gerar o código da ponte” e copie o código (ou baixe o arquivo).",
  "Entre em script.google.com com a conta Google da VOICE → Novo projeto → apague o que estiver escrito → cole o código → Salvar (dê o nome “Ponte VEOS”).",
  "Clique em Implantar → Nova implantação → na engrenagem escolha “App da Web”. Executar como: Eu. Quem pode acessar: Qualquer pessoa. Clique em Implantar.",
  "O Google pede autorização: Autorizar acesso → escolha a conta da VOICE → “Avançado” → “Acessar Ponte VEOS (não seguro)” → Permitir. (O aviso aparece porque o projeto é seu e não foi publicado na loja do Google.)",
  "Copie o “URL do app da Web” (termina em /exec), cole aqui embaixo e clique em Conectar. O VEOS testa e mostra a conta ligada.",
];

/** O endereco colado e de um App da Web do Apps Script? */
export function urlDaPonteValida(url) {
  return /^https:\/\/script\.google\.com\/(?:a\/[A-Za-z0-9.-]+\/)?macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(String(url ?? "").trim());
}
