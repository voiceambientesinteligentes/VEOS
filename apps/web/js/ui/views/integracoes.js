// Integracoes: estado da conexao com o Zoho (somente leitura). A direcao conecta/desconecta;
// o login acontece no proprio Zoho e os tokens ficam so no servidor.
import { api } from "../../data/api.js";
import { formatDateTime } from "../../domain/format.js";
import { codigoDaPonte, PASSOS_PONTE, urlDaPonteValida } from "../../domain/ponte_google.js";
import { chaveBrevoValida, ehChaveSmtpBrevo, LINKS_BREVO, PASSOS_BREVO, ROTULO_EVENTO } from "../../domain/brevo.js";
import { clear, errorNotice, h, method, panel, stamp, table } from "../dom.js";

const RETORNO = {
  ok: ["Zoho conectado. O VEOS já pode ler orçamentos, faturas, negócios e projetos.", "ok"],
  recusado: ["Você não autorizou no Zoho. Nada foi conectado.", "warn"],
  "erro-estado": ["O pedido de conexão expirou ou não é válido. Clique em Conectar de novo.", "risk"],
  "erro-codigo": ["O Zoho não devolveu o código de autorização. Tente de novo.", "risk"],
  "erro-config": ["As credenciais do Zoho não estão configuradas no servidor.", "risk"],
  erro: ["O Zoho recusou a troca de autorização. Tente de novo; se repetir, confira o Redirect URI no console do Zoho.", "risk"],
};
const USOS = [
  ["Negociação ao Vivo", "importa orçamentos do Books com itens e preço de compra; a receita dos 12 meses (Simples) vem das faturas."],
  ["Etapas do CRM", "lidas do campo Estágio dos Negócios; o VEOS nunca inventa etapa."],
  ["Próximos passos", "alertas de fatura vencida, orçamento sem resposta, negócio parado e projeto parado."],
];

const COMANDO_ENTREVISTA = "Vamos fazer a entrevista guiada da VOICE no VEOS. Use o conector VEOS Entrevista: chame iniciar_entrevista, faça uma pergunta por vez em português simples, grave cada resposta e, no fim, gere o arquivo de respostas para eu baixar.";

function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }));
  const a = h("a", { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function copiavel(texto, rotulo = "Copiar") {
  const b = h("button", { class: "btn btn-ghost", type: "button" }, rotulo);
  b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(texto); b.textContent = "Copiado"; } catch { b.textContent = "Selecione e copie"; } });
  return b;
}

// MCP REMOTO DEFINITIVO: link para o ChatGPT ou o Claude consultarem e pedirem coisas ao VEOS como o dono.
const COMANDO_MCP = "Use o conector VEOS. Comece chamando veos_resumo_do_dia e veos_radar e me diga, em português simples, o que precisa da minha atenção hoje. Daqui em diante, quando eu pedir para FAZER algo em qualquer setor (cadastrar, achar empresas e contatos, preparar e-mails, agendar), execute com as ferramentas do VEOS: procure antes para não duplicar e nunca invente dado. E-mail: prepare com veos_preparar_email, me mostre destinatário, assunto e texto, e só envie com veos_enviar_email(confirmado=true) depois que eu disser que pode. Antes de recomendar algo relevante, consulte veos_consultar_precedentes. Pagar, aceitar orçamento e gerar pedido eu faço na tela.";
function painelMcpRemoto(eu) {
  const direcao = eu?.papel === "direcao";
  const corpo = h("div", { class: "stack" });
  const saida = h("div", { role: "status" });
  const caixa = panel({ title: "MCP do VEOS — ChatGPT e Claude como o dono", subtitle: "Um link para conectar o ChatGPT ou o Claude ao VEOS: você pergunta e pede em linguagem natural (resumo do dia, caixa, funil, pedidos, cadastrar cliente, rascunho de orçamento, tarefa). Vale como você no VEOS." }, corpo, saida);

  async function desenhar() {
    clear(corpo);
    let est;
    try { est = await api.mcpRemoto(); } catch (e) { corpo.append(errorNotice(e.message)); return; }
    const escopo = h("select", { class: "input", "aria-label": "O que o link pode fazer", disabled: !direcao },
      h("option", { value: "completo" }, "Consultar e fazer (cadastros de todos os setores, tarefas, pesquisa, e-mail com a sua confirmação)"),
      h("option", { value: "consulta" }, "Só consultar (nada é criado nem alterado)"));
    const rotulo = h("input", { class: "input", type: "text", maxlength: "60", placeholder: "Nome do link (ex.: ChatGPT do celular)", "aria-label": "Nome do link", disabled: !direcao });
    const dias = h("select", { class: "input", "aria-label": "Validade", disabled: !direcao }, [["30", "Vale 30 dias"], ["7", "Vale 7 dias"], ["90", "Vale 90 dias"]].map(([v, r]) => h("option", { value: v }, r)));
    const criar = h("button", { class: "btn btn-primary", type: "button", disabled: !direcao }, "Criar link");
    criar.addEventListener("click", async () => {
      criar.disabled = true;
      clear(saida);
      try {
        const r = await api.mcpRemotoLink({ escopo: escopo.value, rotulo: rotulo.value, dias: Number(dias.value) });
        await desenhar();
        saida.append(
          h("p", { class: "notice notice-warn" }, r.aviso),
          h("p", null, h("strong", null, "1. Link do MCP"), " (cole no conector):"),
          h("pre", { class: "rascunho-corpo mfa-chave" }, r.url),
          h("div", { class: "row" }, copiavel(r.url, "Copiar link")),
          h("p", null, h("strong", null, "2. No ChatGPT"), ": Configurações → Conectores (ou Aplicativos) → Avançado → Modo desenvolvedor → Criar. Nome: VEOS. URL do servidor MCP: o link acima. Autenticação: nenhuma."),
          h("p", null, h("strong", null, "3. No Claude"), " (claude.ai): Configurações → Conectores → Adicionar conector personalizado. Nome: VEOS. URL: o link acima. Deixe em branco a parte de autenticação avançada."),
          h("p", null, h("strong", null, "4. Primeiro comando"), " (numa conversa nova, com o conector ligado):"),
          h("pre", { class: "rascunho-corpo" }, COMANDO_MCP),
          h("div", { class: "row" }, copiavel(COMANDO_MCP, "Copiar comando")),
          h("p", { class: "field-hint" }, "Os nomes dos menus mudam com o tempo e conectores próprios dependem do plano do ChatGPT/Claude."));
      } catch (e) { saida.append(errorNotice(e.message)); criar.disabled = !direcao; }
    });
    const lista = est.links.length
      ? h("ul", { class: "list-plain stack-s" }, est.links.map((l) => {
        const rev = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao }, "Revogar");
        rev.addEventListener("click", async () => {
          if (!confirm("Revogar este link? O ChatGPT/Claude conectado com ele deixa de funcionar.")) return;
          try { await api.mcpRemotoRevogar(l.id); clear(saida); await desenhar(); } catch (e) { clear(saida); saida.append(errorNotice(e.message)); }
        });
        return h("li", { class: "row" }, stamp(l.escopo === "consulta" ? "Só consulta" : "Consulta e cadastro", l.escopo === "consulta" ? "neutral" : "live"),
          h("span", null, `${l.rotulo || "sem nome"} · vale até ${formatDateTime(l.expira_em)} · ${l.usos} chamada(s)${l.ultimo_uso ? ` · último uso ${formatDateTime(l.ultimo_uso)}` : " · ainda não usado"}`), rev);
      }))
      : h("p", { class: "field-hint" }, direcao ? "Nenhum link ativo. Crie um abaixo." : "Só a direção cria o link do MCP.");
    const uso = est.chamadas.length
      ? table({ caption: "Últimas chamadas feitas pelo ChatGPT/Claude", head: ["Quando", "Ferramenta", "Rota", "Resultado"], rows: est.chamadas.slice(0, 12).map((c) => [formatDateTime(c.em), c.ferramenta, c.rota || "—", c.ok ? "ok" : `recusada: ${c.detalhe ?? ""}`]) })
      : null;
    corpo.append(...[
      lista,
      h("div", { class: "row" }, escopo, rotulo, dias, criar),
      uso,
      method("Segurança", "Quem tiver o link age como você no VEOS dentro do escopo escolhido, sem pedir senha nem código MFA: trate como uma senha. Só o código do link fica guardado (não dá para recuperá-lo), ele expira e você revoga quando quiser. Cada chamada fica registrada acima. No escopo completo o conector cadastra em todos os setores, pesquisa na web e envia e-mail (pela Brevo ou pelo Gmail da VOICE) SÓ com a sua confirmação explícita (ele mostra o texto e espera o seu OK); não paga, não aceita orçamento, não gera pedido e não altera política, meta, alçada nem imposto.",
        "O que você escreve no ChatGPT ou no Claude, e o que o VEOS devolve a eles (clientes, valores, caixa), também fica com a OpenAI ou a Anthropic nessas conversas. Use só em contas suas e revogue o link se trocar de aparelho.")].filter(Boolean));
  }
  desenhar();
  return caixa;
}

// ENVIO PELA BREVO (plano gratis, 300 por dia): o VEOS envia por ela o que a pessoa confirma e recebe os avisos de
// cada e-mail (entregue, aberto, voltou, spam). As respostas chegam no Gmail: com o Gmail conectado o VEOS as ve.
const novaAba = (href, rotulo) => h("a", { class: "btn btn-ghost", href, target: "_blank", rel: "noopener noreferrer" }, rotulo);
function painelBrevo(eu) {
  const direcao = eu?.papel === "direcao";
  const corpo = h("div", { class: "stack" });
  const saida = h("div", { role: "status" });
  const caixa = panel({ title: "Envio de e-mails — Brevo", subtitle: "A Brevo envia os e-mails que você confirma no VEOS (plano grátis: 300 por dia, sem cartão) e avisa se cada um foi entregue, aberto, se voltou ou se foi marcado como spam. As respostas chegam no seu Gmail." }, corpo, saida);
  const avisar = (texto, tom = "ok") => { clear(saida); saida.append(h("p", { class: `notice notice-${tom}` }, texto)); };

  async function desenhar(msg) {
    clear(corpo);
    let st;
    try { st = await api.emailSituacao(); } catch (e) { corpo.append(errorNotice(e.message)); return; }
    const b = st.brevo ?? { conectado: false };
    if (msg) corpo.append(h("p", { class: `notice notice-${msg[1]}`, role: "status" }, msg[0]));
    corpo.append(h("div", { class: "row" },
      b.conectado ? stamp(b.pronta ? "Conectada" : "Falta confirmar o remetente", b.pronta ? "ok" : "warn") : stamp("Não conectada", "neutral"),
      b.conta ? h("strong", null, b.conta) : null,
      b.conectado && b.plano?.texto ? stamp(b.plano.texto, "neutral") : null,
      b.pronta ? stamp(`${st.enviados_hoje_brevo ?? 0} de ${st.limite_brevo} hoje`, "live") : null,
      b.conectado ? stamp(b.avisos ? "avisos ligados" : "avisos desligados", b.avisos ? "live" : "warn") : null));
    if (b.conectado && b.detalhe) corpo.append(h("p", { class: "notice notice-warn" }, b.detalhe));
    if (!b.conectado) passos();
    else {
      if (b.remetente && !b.remetente.ativo) corpo.append(confirmarCodigo(b.remetente.email));
      corpo.append(acoesConectada(b));
    }
    if (st.conectado && b.pronta) corpo.append(escolhaDoPadrao(st));
    corpo.append(method("Como funciona",
      "Nada sai sozinho: cada e-mail sai depois da sua confirmação (botão Enviar, “confirmo” no chat ou o seu OK no ChatGPT/Claude). Até 280 por dia pela Brevo (o plano grátis dá 300); prospecção até 30 por dia somando Brevo e Gmail, 1:1 e com a linha de “sair”.",
      "Sem domínio próprio, a Brevo troca o remetente @gmail.com por um endereço dela (…@brevosend.com): quem recebe vê o nome VOICE Ambientes Inteligentes e a resposta volta para o seu Gmail. Para prospecção 1:1 o Gmail costuma chegar melhor na caixa de entrada; com domínio próprio (pendência CIO-07) a Brevo passa a usar o endereço da VOICE.",
      "Endereço que voltou, marcou spam ou se descadastrou entra sozinho na lista de bloqueio, e o VEOS cria a tarefa para você procurar outro contato. A chave fica cifrada no servidor do VEOS e nunca volta para o navegador."));
  }

  function passos() {
    const chave = h("input", { class: "input", type: "password", autocomplete: "off", placeholder: "xkeysib-…", "aria-label": "Chave de API da Brevo", disabled: !direcao });
    const conectar = h("button", { class: "btn btn-primary", type: "button", disabled: !direcao }, "Conectar");
    conectar.addEventListener("click", async () => {
      clear(saida);
      const v = chave.value.trim();
      if (ehChaveSmtpBrevo(v)) { saida.append(errorNotice("Essa é a chave SMTP (começa com xsmtpsib-). Gere uma chave de API: SMTP e API → aba Chaves de API (começa com xkeysib-).")); return; }
      if (!chaveBrevoValida(v)) { saida.append(errorNotice("Cole a chave de API inteira (começa com xkeysib-).")); return; }
      conectar.disabled = true; conectar.textContent = "Conferindo…";
      try {
        const r = await api.brevoConectar(v);
        chave.value = "";
        await desenhar(r.remetente?.ativo
          ? [`Brevo conectada: ${r.conta}. ${r.avisos ? "Os avisos (entregue, aberto, voltou, spam) estão ligados." : "Os avisos não ligaram: veja o detalhe acima."}`, "ok"]
          : [`Brevo conectada: ${r.conta}. Falta confirmar o remetente${r.codigo_enviado ? `: a Brevo mandou um código de 6 números para ${r.remetente?.email ?? "o seu e-mail"}` : ""}.`, "warn"]);
      } catch (e) { saida.append(errorNotice(e.message)); conectar.disabled = !direcao; conectar.textContent = "Conectar"; }
    });
    corpo.append(...[h("ol", { class: "stack-s" }, PASSOS_BREVO.map((p) => h("li", null, p))),
      h("div", { class: "row" }, novaAba(LINKS_BREVO.cadastro, "Abrir a Brevo (criar a conta)"), novaAba(LINKS_BREVO.chaves, "Chaves de API"), novaAba(LINKS_BREVO.ips, "IPs autorizados")),
      h("div", { class: "row" }, chave, conectar),
      direcao ? null : h("p", { class: "field-hint" }, "Só a direção conecta a Brevo.")].filter(Boolean));
  }

  function confirmarCodigo(email) {
    const codigo = h("input", { class: "input", type: "text", inputmode: "numeric", maxlength: "6", autocomplete: "one-time-code", placeholder: "6 números", "aria-label": "Código da Brevo", disabled: !direcao });
    const ok = h("button", { class: "btn btn-primary", type: "button", disabled: !direcao }, "Confirmar o remetente");
    ok.addEventListener("click", async () => {
      clear(saida);
      const v = codigo.value.replace(/\D/g, "");
      if (v.length !== 6) { saida.append(errorNotice("O código tem 6 números.")); return; }
      ok.disabled = true;
      try {
        const r = await api.brevoCodigo(v);
        await desenhar(r.remetente?.ativo ? [`Remetente confirmado: ${r.remetente.email}. A Brevo já pode enviar.`, "ok"] : ["A Brevo ainda não confirmou o remetente. Confira o código.", "warn"]);
      } catch (e) { saida.append(errorNotice(e.message)); ok.disabled = !direcao; }
    });
    return h("div", { class: "stack-s" },
      h("p", null, `A Brevo mandou um código de 6 números para ${email} (veja também o spam). Digite aqui:`),
      h("div", { class: "row" }, codigo, ok, novaAba(LINKS_BREVO.remetentes, "Remetentes na Brevo")));
  }

  function acoesConectada(b) {
    const atualizar = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao }, "Atualizar");
    atualizar.addEventListener("click", async () => {
      atualizar.disabled = true; clear(saida);
      try { await api.brevoTestar(false); await desenhar(["Situação atualizada com a Brevo.", "ok"]); } catch (e) { saida.append(errorNotice(e.message)); atualizar.disabled = !direcao; }
    });
    const teste = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao || !b.pronta }, "Mandar um teste para mim");
    teste.addEventListener("click", async () => {
      if (!confirm(`Mandar um e-mail de teste pela Brevo para ${b.remetente?.email ?? b.conta}?`)) return;
      teste.disabled = true; clear(saida);
      try { const r = await api.brevoTestar(true); await desenhar([`Teste enviado para ${r.enviado_para}. Em alguns minutos aparece aqui o aviso “entregue” que a Brevo manda de volta (clique em Atualizar).`, "ok"]); }
      catch (e) { saida.append(errorNotice(e.message)); teste.disabled = !direcao || !b.pronta; }
    });
    const desligar = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao }, "Desconectar");
    desligar.addEventListener("click", async () => {
      if (!confirm("Desconectar a Brevo? O VEOS deixa de enviar por ela até conectar de novo.")) return;
      try { const r = await api.brevoDesconectar(); clear(saida); await desenhar([r.aviso, "warn"]); } catch (e) { clear(saida); saida.append(errorNotice(e.message)); }
    });
    const ultimo = b.ultimo_aviso ? `Último aviso da Brevo: ${ROTULO_EVENTO[b.ultimo_aviso.evento] ?? b.ultimo_aviso.evento} em ${formatDateTime(b.ultimo_aviso.em)}.` : "Nenhum aviso da Brevo ainda (chega depois do primeiro envio).";
    return h("div", { class: "stack-s" },
      h("div", { class: "row" }, atualizar, teste, desligar),
      h("p", { class: "field-hint" }, `Conectada em ${formatDateTime(b.conectado_em)}${b.remetente?.ativo ? ` · remetente ${b.remetente.email}` : ""}. ${ultimo}`));
  }

  function escolhaDoPadrao(st) {
    const sel = h("select", { class: "select", "aria-label": "Por onde o e-mail sai", disabled: !direcao },
      h("option", { value: "brevo" }, "Brevo (avisos de entregue, aberto, voltou e spam)"),
      h("option", { value: "gmail" }, "Gmail (sai do seu Gmail e aparece em Enviados)"));
    sel.value = st.envio?.via ?? "brevo";
    sel.addEventListener("change", async () => {
      try { await api.emailPadrao(sel.value); avisar(`Pronto: os e-mails saem ${sel.value === "gmail" ? "pelo Gmail" : "pela Brevo"}. A resposta a uma conversa do Gmail continua saindo pelo Gmail.`); }
      catch (e) { clear(saida); saida.append(errorNotice(e.message)); }
    });
    return h("div", { class: "row" }, h("strong", null, "Com Brevo e Gmail conectados, o e-mail sai por:"), sel);
  }
  desenhar();
  return caixa;
}

// E-MAIL E AGENDA (Gmail da VOICE): ponte gratuita no Google Apps Script. Com ela o VEOS ve as respostas (tambem dos
// e-mails que sairam pela Brevo), le a caixa e a agenda e pode ENVIAR pelo proprio Gmail o que a pessoa confirma.
function painelGmail(eu) {
  const direcao = eu?.papel === "direcao";
  const corpo = h("div", { class: "stack" });
  const saida = h("div", { role: "status" });
  const caixa = panel({ title: "E-mail e agenda — Gmail da VOICE", subtitle: "Liga o VEOS ao Gmail e à Agenda do Google da empresa. Com ele o VEOS vê as respostas (também dos e-mails enviados pela Brevo), lê a caixa e a agenda e pode enviar pelo próprio Gmail (aparece em Enviados). Grátis, sem cartão." }, corpo, saida);

  async function desenhar(aviso) {
    clear(corpo);
    let st;
    try { st = await api.emailSituacao(); } catch (e) { corpo.append(errorNotice(e.message)); return; }
    if (aviso) corpo.append(h("p", { class: `notice notice-${aviso[1]}`, role: "status" }, aviso[0]));
    corpo.append(h("div", { class: "row" },
      st.conectado ? stamp("Conectado", "ok") : stamp("Não conectado", "neutral"),
      st.conectado && st.conta ? h("strong", null, st.conta) : null,
      st.conectado ? stamp(`${st.enviados_hoje_gmail ?? 0} de ${st.limite_gmail ?? 80} e-mails hoje pelo Gmail`, "live") : null,
      st.conectado ? stamp(`prospecção: ${st.prospeccao_hoje} de ${st.limite_prospeccao}`, "neutral") : null,
      st.conectado && st.detalhe ? stamp("Último teste com problema", "warn") : null));
    if (st.conectado && st.detalhe) corpo.append(h("p", { class: "notice notice-warn" }, st.detalhe));

    if (st.conectado) {
      const testar = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao }, "Testar a conexão");
      testar.addEventListener("click", async () => {
        testar.disabled = true; clear(saida);
        try { const r = await api.emailTestar(); saida.append(h("p", { class: "notice notice-ok" }, `Funcionando: ${r.conta}. O Google ainda aceita ${r.cota_email ?? "?"} destinatário(s) hoje.`)); }
        catch (e) { saida.append(errorNotice(e.message)); } finally { testar.disabled = !direcao; }
      });
      const desligar = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao }, "Desconectar");
      desligar.addEventListener("click", async () => {
        if (!confirm("Desconectar o Gmail? O VEOS deixa de enviar e de ver as respostas até conectar de novo.")) return;
        try { await api.emailDesconectar(); clear(saida); await desenhar(["Gmail desconectado. Para desligar de vez, arquive a implantação no Apps Script.", "warn"]); } catch (e) { saida.append(errorNotice(e.message)); }
      });
      const refazer = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao }, "Trocar a ponte (código novo)");
      refazer.addEventListener("click", () => passos(true));
      corpo.append(h("div", { class: "row" }, testar, refazer, desligar),
        h("p", { class: "field-hint" }, `Conectado em ${formatDateTime(st.conectado_em)}. As respostas são conferidas a cada 20 minutos: viram a tarefa “Responder …” no Hoje e no chat da IA; quem responder “SAIR” vai para a lista de bloqueio.`));
    } else {
      passos(false);
    }
    corpo.append(method("Segurança e limites",
      "A ponte é um pequeno programa seu no Google Apps Script (script.google.com). Ela só obedece a quem tiver o código secreto, que fica cifrado no servidor do VEOS e aparece uma única vez, na hora de gerar.",
      "O VEOS nunca envia sozinho: cada e-mail sai depois de uma confirmação sua (botão Enviar, “confirmo” no chat ou o OK no ChatGPT/Claude). Até 80 e-mails por dia pelo Gmail (prospecção até 30 somando Gmail e Brevo, 1:1, com a linha de “sair”); o Gmail gratuito aceita cerca de 100 destinatários por dia.",
      "Para ler respostas e a agenda, o Google pede permissão de Gmail e Agenda para a SUA ponte; o VEOS só lê as respostas dos e-mails que enviou (pelo Gmail ou pela Brevo) e o que você pedir (direção). Quando você pede à IA para resumir e-mails, o texto vai para o motor de IA.",
      "Já conectou a ponte antes de 11/11/2026? Gere o código novo (versão 2) e cole por cima no Apps Script: é ela que acha as respostas dos e-mails enviados pela Brevo."));
  }

  function passos(trocando) {
    const area = h("div", { class: "stack-s" });
    const gerar = h("button", { class: "btn btn-primary", type: "button", disabled: !direcao }, trocando ? "Gerar código novo da ponte" : "Gerar o código da ponte");
    const url = h("input", { class: "input", type: "url", placeholder: "https://script.google.com/macros/s/…/exec", "aria-label": "URL do app da Web", disabled: !direcao });
    const conectar = h("button", { class: "btn btn-primary", type: "button", disabled: !direcao }, "Conectar");
    gerar.addEventListener("click", async () => {
      if (trocando && !confirm("Gerar um código novo? A ponte atual continua funcionando até você colar a nova e conectar.")) return;
      gerar.disabled = true; clear(saida);
      try {
        const { segredo, aviso } = await api.emailPrepararPonte();
        const codigo = codigoDaPonte(segredo);
        clear(area).append(
          h("p", { class: "notice notice-warn" }, aviso),
          h("pre", { class: "rascunho-corpo mfa-chave codigo-ponte" }, codigo),
          h("div", { class: "row" }, copiavel(codigo, "Copiar o código"), (() => { const b = h("button", { class: "btn btn-ghost", type: "button" }, "Baixar (.gs)"); b.addEventListener("click", () => baixar("ponte-veos.gs", codigo, "text/plain")); return b; })()));
      } catch (e) { saida.append(errorNotice(e.message)); } finally { gerar.disabled = !direcao; }
    });
    conectar.addEventListener("click", async () => {
      clear(saida);
      if (!urlDaPonteValida(url.value)) { saida.append(errorNotice("Cole o URL do app da Web: começa com https://script.google.com/macros/s/ e termina em /exec.")); return; }
      conectar.disabled = true; conectar.textContent = "Testando…";
      try { const r = await api.emailConectar(url.value.trim()); await desenhar([`Gmail conectado: ${r.conta}. O VEOS já pode enviar o que você confirmar.`, "ok"]); }
      catch (e) { saida.append(errorNotice(e.message)); conectar.disabled = !direcao; conectar.textContent = "Conectar"; }
    });
    corpo.append(...[h("ol", { class: "stack-s" }, PASSOS_PONTE.map((p) => h("li", null, p))),
      h("div", { class: "row" }, gerar, h("a", { class: "btn btn-ghost", href: "https://script.new", target: "_blank", rel: "noopener noreferrer" }, "Abrir um projeto novo no Apps Script")),
      area,
      h("div", { class: "row" }, url, conectar),
      direcao ? null : h("p", { class: "field-hint" }, "Só a direção conecta o Gmail.")].filter(Boolean));
  }
  desenhar();
  return caixa;
}

// PESQUISA NA WEB: o VEOS usa o DuckDuckGo sem chave; uma chave gratuita (Tavily/Brave/Serper) deixa mais estavel.
function painelPesquisa(eu) {
  const direcao = eu?.papel === "direcao";
  const corpo = h("div", { class: "stack" });
  const saida = h("div", { role: "status" });
  const caixa = panel({ title: "Pesquisa na web (para a IA achar empresas e contatos)", subtitle: "A IA pesquisa na web e lê os sites das empresas para achar arquitetos, fornecedores e concorrentes com o contato público. Funciona sem chave; com uma chave gratuita fica mais estável." }, corpo, saida);
  async function desenhar() {
    clear(corpo);
    let st;
    try { st = await api.pesquisaSituacao(); } catch (e) { corpo.append(errorNotice(e.message)); return; }
    corpo.append(h("ul", { class: "list-plain stack-s" }, st.provedores.map((p) => h("li", { class: "row" }, stamp(p.ativo ? "Ligado" : "Sem chave", p.ativo ? "ok" : "neutral"), h("strong", null, p.nome), h("span", { class: "field-hint" }, p.nota)))));
    if (!direcao) return;
    const prov = h("select", { class: "select", "aria-label": "Provedor" }, h("option", { value: "tavily" }, "Tavily (recomendado)"), h("option", { value: "brave" }, "Brave Search"), h("option", { value: "serper" }, "Serper"));
    const chave = h("input", { class: "input", type: "password", autocomplete: "off", placeholder: "cole a chave (vazio = remover)", "aria-label": "Chave" });
    const salvar = h("button", { class: "btn btn-ghost", type: "button" }, "Guardar chave");
    salvar.addEventListener("click", async () => {
      clear(saida); salvar.disabled = true;
      try { await api.pesquisaChave(prov.value, chave.value.trim()); chave.value = ""; await desenhar(); saida.append(h("p", { class: "notice notice-ok" }, "Guardado (cifrado no servidor).")); }
      catch (e) { saida.append(errorNotice(e.message)); } finally { salvar.disabled = false; }
    });
    corpo.append(h("div", { class: "row" }, prov, chave, salvar),
      h("p", { class: "field-hint" }, "Tavily: crie a conta grátis em app.tavily.com (sem cartão), copie a API key e cole aqui. Só dados públicos de empresas são buscados; Instagram, LinkedIn e Google não são lidos (só o link)."));
  }
  desenhar();
  return caixa;
}

// Entrevista guiada da empresa: link do MCP para o ChatGPT conduzir as perguntas; o arquivo final volta para o Claude Code.
function painelEntrevista(eu) {
  const direcao = eu?.papel === "direcao";
  const corpo = h("div", { class: "stack" });
  const saida = h("div", { role: "status" });
  const caixa = panel({ title: "Entrevista guiada da empresa (ChatGPT)", subtitle: "Você conecta este link no ChatGPT, aperta iniciar e responde o que puder. No fim sai um arquivo com as respostas: você envia ao Claude Code para preencher o VEOS." }, corpo, saida);

  async function desenhar() {
    clear(corpo);
    let est;
    try { est = await api.entrevista(); } catch (e) { corpo.append(errorNotice(e.message)); return; }
    const p = est.progresso, l = est.link;
    const criar = h("button", { class: `btn ${l ? "btn-ghost" : "btn-primary"}`, type: "button", disabled: !direcao }, l ? "Criar link novo (cancela o atual)" : "Criar link do MCP");
    criar.addEventListener("click", async () => {
      if (l && !confirm("Criar um link novo? O link atual para de funcionar.")) return;
      criar.disabled = true;
      clear(saida);
      try {
        const r = await api.entrevistaLink();
        await desenhar();
        saida.append(
          h("p", { class: "notice notice-warn" }, r.aviso),
          h("p", null, h("strong", null, "1. Link do MCP"), " (cole no ChatGPT):"),
          h("pre", { class: "rascunho-corpo mfa-chave" }, r.url),
          h("div", { class: "row" }, copiavel(r.url, "Copiar link")),
          h("p", null, h("strong", null, "2. No ChatGPT"), ": Configurações → Conectores (ou Aplicativos) → Avançado → ative o Modo desenvolvedor → Criar. Nome: VEOS Entrevista. URL do servidor MCP: o link acima. Autenticação: nenhuma. Os nomes dos menus mudam de tempos em tempos e conectores próprios dependem do seu plano do ChatGPT."),
          h("p", null, h("strong", null, "3. Comando para iniciar"), " (cole numa conversa nova com o conector ligado):"),
          h("pre", { class: "rascunho-corpo" }, COMANDO_ENTREVISTA),
          h("div", { class: "row" }, copiavel(COMANDO_ENTREVISTA, "Copiar comando")));
      } catch (e) { saida.append(errorNotice(e.message)); criar.disabled = !direcao; }
    });
    const revogar = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao || !l }, "Revogar link");
    revogar.addEventListener("click", async () => {
      if (!confirm("Revogar o link? O ChatGPT deixa de conseguir gravar respostas.")) return;
      try { await api.entrevistaRevogar(); clear(saida); await desenhar(); } catch (e) { saida.append(errorNotice(e.message)); }
    });
    const arquivo = async (tipo) => {
      try {
        const a = await api.entrevistaArquivo();
        const dia = new Date().toISOString().slice(0, 10);
        if (tipo === "md") baixar(`entrevista-voice-${dia}.md`, a.markdown, "text/markdown");
        else baixar(`entrevista-voice-${dia}.json`, JSON.stringify(a.json, null, 2), "application/json");
      } catch (e) { clear(saida); saida.append(errorNotice(e.message)); }
    };
    const md = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao || !p.respondidas }, "Baixar respostas (.md)");
    const js = h("button", { class: "btn btn-ghost", type: "button", disabled: !direcao || !p.respondidas }, "Baixar respostas (.json)");
    md.addEventListener("click", () => arquivo("md"));
    js.addEventListener("click", () => arquivo("json"));
    corpo.append(
      h("div", { class: "row" },
        l ? stamp("Link ativo", "ok") : stamp("Sem link ativo", "neutral"),
        stamp(`${p.respondidas} de ${p.total} perguntas (${p.porcentagem}%)`, p.respondidas ? "live" : "neutral"),
        p.nao_sei ? stamp(`${p.nao_sei} "não sei"`, "warn") : null),
      l ? h("p", { class: "field-hint" }, `Vale até ${formatDateTime(l.expira_em)} · ${l.usos} chamada(s)${l.ultimo_uso ? ` · último uso ${formatDateTime(l.ultimo_uso)}` : " · ainda não usado"}.`) : h("p", null, direcao ? "Crie o link, conecte no ChatGPT e comece. Você pode parar e continuar depois: as respostas ficam salvas." : "Só a direção cria o link da entrevista."),
      h("div", { class: "row" }, criar, revogar, md, js),
      method("Segurança", "O link só permite ao ChatGPT ler as perguntas e gravar as respostas da entrevista; ele não enxerga nenhum outro dado do VEOS. Só o código do link fica guardado (não dá para recuperá-lo), vale 21 dias e você revoga quando quiser. Não responda senhas, chaves nem número de cartão: o servidor recusa respostas que parecem conter isso.",
        "Lembre-se de que o que você escreve no ChatGPT também fica com a OpenAI. Responda só o que a empresa aceita compartilhar."));
  }
  desenhar();
  return caixa;
}

export async function telaIntegracoes(root, eu) {
  const retorno = new URLSearchParams(location.hash.split("?")[1] ?? "").get("zoho");
  if (retorno) history.replaceState(null, "", "#/integracoes");
  const conteudo = h("div", { class: "stack" });
  root.append(painelBrevo(eu), painelGmail(eu), painelPesquisa(eu), conteudo, painelMcpRemoto(eu), painelEntrevista(eu));

  async function desenhar(aviso) {
    const st = await api.zohoStatus();
    const direcao = eu?.papel === "direcao";
    const botao = h("button", { class: `btn ${st.conectado ? "btn-ghost" : "btn-primary"}`, type: "button", disabled: !direcao || !st.configurado }, st.conectado ? "Desconectar" : "Conectar Zoho");
    const saida = h("div", { role: "status" });
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      clear(saida);
      try {
        if (st.conectado) {
          if (!confirm("Desconectar o Zoho? O VEOS deixa de ler os dados até conectar de novo.")) { botao.disabled = false; return; }
          await api.zohoDesconectar();
          await desenhar(["Zoho desconectado. Os tokens foram apagados do servidor.", "neutral"]);
        } else {
          const { url } = await api.zohoConectar();
          location.assign(url); // login e consentimento no proprio Zoho
        }
      } catch (e) {
        botao.disabled = false;
        saida.append(errorNotice(e.message));
      }
    });
    clear(conteudo).append(...[
      aviso ? h("p", { class: `notice notice-${aviso[1] === "ok" ? "ok" : aviso[1] === "risk" ? "risk" : "warn"}`, role: "status" }, aviso[0]) : null,
      st.conectado && st.precisa_reconectar ? h("p", { class: "notice notice-warn" }, "Há permissões novas para liberar (edição nos dois sentidos e módulos novos). Clique em Desconectar e depois em Conectar Zoho, e aceite no Zoho.") : null,
      panel({ title: "Zoho (Books, CRM e Projects)", subtitle: `Organização VOICE AMBIENTES INTELIGENTES · ${st.somente_leitura ? "somente leitura" : "leitura e edição"}`, actions: botao },
        h("div", { class: "row" },
          st.conectado ? stamp("Conectado", "ok") : stamp("Não conectado", "neutral"),
          st.conectado ? stamp(st.somente_leitura ? "Somente leitura" : "Leitura e edição", "live") : null,
          st.configurado ? null : stamp("Credenciais ausentes no servidor", "risk")),
        st.conectado ? h("p", null, `Conectado em ${formatDateTime(st.conectado_em)}${st.conectado_por ? ` por ${st.conectado_por}` : ""}.`) : h("p", null, direcao ? "Clique em Conectar Zoho: você entra na sua conta do Zoho e autoriza o VEOS a ler e editar os dados." : "Só a direção pode conectar o Zoho."),
        saida,
        h("ul", { class: "list-plain stack-s" }, USOS.map(([t, d]) => h("li", null, h("strong", null, `${t}: `), d))),
        method("Segurança", "O VEOS lê tudo e só cria ou altera (nunca exclui) contatos, itens, orçamentos, registros do CRM e tarefas; cada gravação pede confirmação na tela e fica registrada com quem fez.",
          "Client ID e segredo ficam nos segredos do servidor; o token de acesso fica numa tabela que só o servidor lê. Nada disso chega ao navegador.",
          st.escopos.length ? `Permissões concedidas: ${st.escopos.join(", ")}` : null)),
    ].filter(Boolean));
  }
  await desenhar(retorno ? RETORNO[retorno] ?? RETORNO.erro : null);
}
