// Integracoes: estado da conexao com o Zoho (somente leitura). A direcao conecta/desconecta;
// o login acontece no proprio Zoho e os tokens ficam so no servidor.
import { api } from "../../data/api.js";
import { formatDateTime } from "../../domain/format.js";
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
const COMANDO_MCP = "Use o conector VEOS. Comece chamando veos_resumo_do_dia e veos_radar e me diga, em português simples, o que precisa da minha atenção hoje. Antes de recomendar algo relevante, consulte veos_consultar_precedentes. Para criar algo (cliente, orçamento em rascunho, conta a pagar, tarefa), procure antes para não duplicar e me mostre o que vai criar. Você nunca paga, envia mensagem, aceita orçamento nem gera pedido: isso eu faço na tela.";
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
      h("option", { value: "completo" }, "Consultar e cadastrar (cliente, rascunho de orçamento, conta a pagar, tarefa, ideia)"),
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
      method("Segurança", "Quem tiver o link age como você no VEOS dentro do escopo escolhido, sem pedir senha nem código MFA: trate como uma senha. Só o código do link fica guardado (não dá para recuperá-lo), ele expira e você revoga quando quiser. Cada chamada fica registrada acima. Mesmo no escopo completo, o conector não paga, não envia mensagem a ninguém, não aceita orçamento, não gera pedido e não altera política, meta, alçada nem imposto: isso continua sendo seu, pela tela.",
        "O que você escreve no ChatGPT ou no Claude, e o que o VEOS devolve a eles (clientes, valores, caixa), também fica com a OpenAI ou a Anthropic nessas conversas. Use só em contas suas e revogue o link se trocar de aparelho.")].filter(Boolean));
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
  root.append(conteudo, painelMcpRemoto(eu), painelEntrevista(eu));

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
