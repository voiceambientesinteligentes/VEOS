// CAPTACAO: as ferramentas de quem traz cliente.
//   #/contato           Contato rapido: quem chegou (Instagram, WhatsApp, site, indicacao) vira lead
//                       em 30 segundos; a cadencia "lead novo" cria a tarefa de responder em 1 hora
//                       e o rascunho da mensagem. Daqui vira cliente + orcamento.
//   #/prospeccao        Prospeccao ativa: publico + cidade -> onde achar, como abordar, mensagem 1:1;
//                       o alvo vira parceiro "prospectado" (cadencia de parceiro).
//   #/conteudo          Calendario do Instagram: pautas com legenda, roteiro e hashtags; cada post
//                       vira registro de conteudo no Marketing (ideia -> publicado).
// O VEOS prepara; uma pessoa envia e publica.
import { api } from "../../data/api.js";
import { FASES_OBRA, ORIGENS, TIPOS_IMOVEL } from "../../domain/clientes.js";
import { formatDate } from "../../domain/format.js";
import { gerarCalendario, registroConteudo, ROTINA_INSTAGRAM, rotuloFormato, rotuloPilar, textoPost } from "../../domain/conteudo.js";
import { CUIDADOS, mensagemPara, ondeEncontrar, PUBLICOS, registroParceiro } from "../../domain/prospeccao.js";
import { clear, errorNotice, field, h, method, panel, stamp, table } from "../dom.js";

const opc = (lista, atual, vazio) => [vazio ? h("option", { value: "" }, vazio) : null, ...lista.map(([v, t]) => h("option", { value: v, selected: v === atual }, t))];
const copiar = (texto, rotulo = "Copiar") => {
  const b = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, rotulo);
  b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(texto); b.textContent = "Copiado ✓"; } catch { b.textContent = "Selecione e copie"; } setTimeout(() => { b.textContent = rotulo; }, 2000); });
  return b;
};
const hoje = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- contato rapido
export async function telaContatoRapido(root) {
  const inp = (id, attrs = {}) => h("input", { class: "input", id, type: "text", autocomplete: "off", ...attrs });
  const nome = inp("ct-nome", { placeholder: "Nome da pessoa" });
  const tel = inp("ct-tel", { inputmode: "tel", placeholder: "(47) 99999-9999" });
  const email = inp("ct-email", { type: "email", placeholder: "opcional" });
  const origem = h("select", { class: "select", id: "ct-origem" }, opc(ORIGENS.filter(([v]) => !["google", "whatsapp"].includes(v)), "indicacao_arquiteto"));
  const imovel = h("select", { class: "select", id: "ct-imovel" }, opc(TIPOS_IMOVEL, "casa_alto_padrao"));
  const fase = h("select", { class: "select", id: "ct-fase" }, opc(FASES_OBRA, "", "Não sei ainda"));
  const cidade = inp("ct-cidade", { placeholder: "Cidade da obra" });
  const interesse = h("textarea", { class: "input", id: "ct-interesse", rows: 2, placeholder: "O que a pessoa quer: automação da casa, Wi-Fi, cinema, segurança…" });
  const parceiro = inp("ct-parceiro", { placeholder: "Arquiteto/designer que indicou (se houver)" });
  const erro = h("div", { role: "alert" });
  const resultado = h("div", { class: "stack-s", "aria-live": "polite" });
  const botao = h("button", { class: "btn btn-primary", type: "submit" }, "Registrar contato");
  const form = h("form", { class: "stack-s", novalidate: true },
    h("div", { class: "form-grid" }, field("ct-nome", "Nome *", nome), field("ct-tel", "Telefone / WhatsApp *", tel), field("ct-origem", "Como chegou *", origem), field("ct-imovel", "Tipo de imóvel *", imovel),
      field("ct-fase", "Fase da obra", fase), field("ct-cidade", "Cidade", cidade), field("ct-email", "E-mail", email), field("ct-parceiro", "Quem indicou", parceiro)),
    field("ct-interesse", "Interesse", interesse), h("div", { class: "row" }, botao), erro);
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clear(erro); clear(resultado);
    const probs = [];
    if (nome.value.trim().length < 2) probs.push("Informe o nome.");
    if (tel.value.replace(/\D/g, "").length < 10) probs.push("Informe o telefone com DDD.");
    if (probs.length) return erro.append(h("ul", { class: "list-plain" }, probs.map((p) => h("li", { class: "field-error" }, p))));
    const dados = { nome_contato: nome.value.trim(), telefone: tel.value.trim(), origem: origem.value, tipo_imovel: imovel.value };
    if (email.value.trim()) dados.email = email.value.trim();
    if (fase.value) dados.fase_obra = fase.value;
    if (cidade.value.trim()) dados.cidade = cidade.value.trim();
    if (interesse.value.trim()) dados.interesse = interesse.value.trim();
    if (parceiro.value.trim()) dados.parceiro_indicador = parceiro.value.trim();
    botao.disabled = true;
    try {
      const r = await api.criarRegistro({ setor: "vendas", tipo: "lead", titulo: `${nome.value.trim()}${cidade.value.trim() ? ` · ${cidade.value.trim()}` : ""}`.slice(0, 200), estado: "novo", responsavel: "sdr", dados });
      const virarCliente = h("button", { class: "btn btn-primary", type: "button" }, "Já é projeto: cadastrar como cliente e orçar");
      virarCliente.addEventListener("click", async () => {
        virarCliente.disabled = true;
        try {
          const c = await api.clienteSalvar({ tipo: "pf", nome: dados.nome_contato, telefone: dados.telefone, email: dados.email ?? "", cidade: dados.cidade ?? "", tipo_imovel: dados.tipo_imovel, fase_obra: dados.fase_obra ?? "", origem: dados.origem, parceiro: dados.parceiro_indicador ?? "", observacao: dados.interesse ?? "" });
          await api.alterarRegistro(r.id, { setor: "vendas", estado: "convertido", dados: { cliente_ref: c.codigo } }).catch(() => null);
          location.hash = `#/orcamentos/novo?cliente=${c.id}`;
        } catch (e) { virarCliente.disabled = false; resultado.append(errorNotice(e.message)); }
      });
      resultado.append(h("p", { class: "notice notice-ok" }, `Contato registrado. ${r.cadencia?.toques_gerados ? `A tarefa "responder em até 1 hora"${r.cadencia.rascunhos ? " e o rascunho da primeira mensagem" : ""} já ${r.cadencia.rascunhos ? "estão" : "está"} no Radar${r.cadencia.rascunhos ? " e na Caixa de saída" : ""}.` : "Ele entrou no funil do Comercial (Leads) com a cadência de primeiro contato."}`),
        h("div", { class: "row" }, virarCliente, h("a", { class: "btn btn-ghost", href: "#/mensagens" }, "Caixa de saída"), h("a", { class: "btn btn-ghost", href: "#/setor/vendas/registros" }, "Ver no funil")));
      form.reset();
      origem.value = dados.origem;
    } catch (e) { erro.append(errorNotice(e.message)); } finally { botao.disabled = false; }
  });
  root.append(panel({ title: "Contato rápido", subtitle: "Chegou alguém pelo Instagram, WhatsApp, site ou indicação? Registre aqui em 30 segundos. O VEOS cria a tarefa de responder em 1 hora e prepara a mensagem." }, form, resultado),
    panel({ title: "Depois de registrar", subtitle: "Roteiro do primeiro contato (cadência \"lead novo\")" }, h("ol", { class: "stack-s" },
      h("li", null, "Responder em até 1 hora: agradecer, perguntar cidade e fase da obra, oferecer a visita técnica."),
      h("li", null, "Se for projeto de verdade: cadastrar como cliente e montar o orçamento (botão que aparece após registrar)."),
      h("li", null, "Se não for perfil (avulso, fora da região): marcar o lead como desqualificado com o motivo — isso ensina quais canais trazem cliente bom."))));
  nome.focus();
}

// ---------------------------------------------------------------- prospeccao
export async function telaProspeccao(root) {
  const publico = h("select", { class: "select", id: "pp-publico" }, PUBLICOS.map((p) => h("option", { value: p.id }, p.nome)));
  const cidade = h("input", { class: "input", id: "pp-cidade", value: "Balneário Camboriú", autocomplete: "off" });
  const remetente = h("input", { class: "input", id: "pp-remetente", placeholder: "Seu nome", autocomplete: "off" });
  const guia = h("div", { class: "stack" });
  const lista = h("div");
  function desenharGuia() {
    const p = PUBLICOS.find((x) => x.id === publico.value);
    const vars = { cidade: cidade.value, remetente: remetente.value };
    const campos = { escritorio: h("input", { class: "input", id: "pa-esc", autocomplete: "off" }), contato: h("input", { class: "input", id: "pa-contato", autocomplete: "off", placeholder: "Nome (ou 'a descobrir')" }),
      telefone: h("input", { class: "input", id: "pa-tel", inputmode: "tel", autocomplete: "off" }), email: h("input", { class: "input", id: "pa-email", type: "email", autocomplete: "off" }),
      projeto: h("input", { class: "input", id: "pa-proj", autocomplete: "off", placeholder: "Projeto que você viu (para personalizar)" }), detalhe: h("input", { class: "input", id: "pa-det", autocomplete: "off", placeholder: "O que gostou nele" }) };
    const nivel = h("select", { class: "select", id: "pa-nivel" }, [["A", "A — faz alto padrão com frequência"], ["B", "B — faz alto padrão às vezes"], ["C", "C — potencial a confirmar"]].map(([v, t]) => h("option", { value: v, selected: v === "B" }, t)));
    const msg = h("pre", { class: "rascunho-corpo" });
    const atualizarMsg = () => { msg.textContent = mensagemPara(p, { ...vars, contato: campos.contato.value, projeto_visto: campos.projeto.value, detalhe: campos.detalhe.value }); };
    for (const el of Object.values(campos)) el.addEventListener("input", atualizarMsg);
    atualizarMsg();
    const bMsg = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Copiar mensagem");
    bMsg.addEventListener("click", async () => { try { await navigator.clipboard.writeText(msg.textContent); bMsg.textContent = "Copiado ✓"; } catch { bMsg.textContent = "Selecione e copie"; } setTimeout(() => { bMsg.textContent = "Copiar mensagem"; }, 2000); });
    const erro = h("div", { role: "alert" });
    const salvar = h("button", { class: "btn btn-primary", type: "button" }, "Adicionar alvo e iniciar a cadência");
    salvar.addEventListener("click", async () => {
      clear(erro);
      const { erros, registro } = registroParceiro(p, { escritorio: campos.escritorio.value, contato: campos.contato.value, telefone: campos.telefone.value, email: campos.email.value, nivel: nivel.value });
      if (erros.length) return erro.append(h("ul", { class: "list-plain" }, erros.map((x) => h("li", { class: "field-error" }, x))));
      salvar.disabled = true;
      try {
        await api.criarRegistro(registro);
        erro.append(h("p", { class: "notice notice-ok" }, `${registro.dados.escritorio} adicionado. A cadência de parceiro criou o primeiro toque (e-mail 1:1) no Radar.`));
        for (const el of Object.values(campos)) el.value = "";
        atualizarMsg();
        await desenharLista();
      } catch (e) { erro.append(errorNotice(e.message)); } finally { salvar.disabled = false; }
    });
    clear(guia).append(
      panel({ title: `1. Onde encontrar: ${p.nome}`, subtitle: "Abre a busca pública numa nova aba. Escolha quem faz o perfil da VOICE (alto padrão na região)." },
        h("div", { class: "row pp-links" }, ondeEncontrar(p, cidade.value).map((l) => h("a", { class: "btn btn-ghost btn-mini", href: l.url, target: "_blank", rel: "noopener noreferrer" }, l.rotulo))),
        h("p", null, h("strong", null, "Para qualificar: "), p.qualificar.join(" · "))),
      panel({ title: "2. Registrar o alvo e preparar a mensagem", subtitle: `Oferta: ${p.oferta}` },
        h("div", { class: "form-grid" }, field("pa-esc", "Escritório / empresa *", campos.escritorio), field("pa-contato", "Pessoa de contato *", campos.contato), field("pa-tel", "Telefone / WhatsApp", campos.telefone),
          field("pa-email", "E-mail", campos.email), field("pa-nivel", "Nível", nivel), field("pa-proj", "Projeto visto", campos.projeto), field("pa-det", "Detalhe que gostou", campos.detalhe)),
        h("div", { class: "stack-s" }, h("div", { class: "row" }, h("strong", null, "Mensagem 1:1 (revise antes de enviar)"), bMsg), msg),
        h("div", { class: "row" }, salvar), erro),
      panel({ title: "Cuidados" }, h("ul", { class: "stack-s" }, CUIDADOS.map((c) => h("li", null, c)))));
  }
  async function desenharLista() {
    try {
      const d = await api.setor("vendas");
      const parceiros = d.registros.filter((r) => r.tipo === "parceiro");
      const est = { prospectado: ["Prospectado", "neutral"], ativo: ["Ativo", "ok"], inativo: ["Inativo", "warn"], encerrado: ["Encerrado", "risk"] };
      clear(lista).append(panel({ title: "Parceiros e alvos", subtitle: `${parceiros.filter((p) => p.estado === "prospectado").length} em prospecção · ${parceiros.filter((p) => p.estado === "ativo").length} ativos (indicaram)` },
        parceiros.length ? table({ head: ["Escritório", "Contato", "Nível", "Situação", "Último contato", "Próximo"],
          rows: parceiros.map((p) => [p.dados?.escritorio ?? p.titulo, p.dados?.contato ?? "—", p.dados?.nivel ?? "—", stamp(...(est[p.estado] ?? [p.estado, "neutral"])), p.dados?.ultimo_contato ? formatDate(p.dados.ultimo_contato) : "—", p.dados?.proximo_contato ? formatDate(p.dados.proximo_contato) : "—"]) })
          : h("p", { class: "result-empty" }, "Nenhum alvo ainda. Meta sugerida (PROPOSTA): 10 alvos novos por semana, 3 cafés técnicos por mês.")));
    } catch (e) { clear(lista).append(errorNotice(e.message)); }
  }
  for (const el of [publico, cidade, remetente]) el.addEventListener("change", desenharGuia);
  root.append(panel({ title: "Prospecção ativa", subtitle: "Quem indica obra de alto padrão: arquitetos, designers, construtoras, lojas. Escolha o público e a cidade." },
    h("div", { class: "form-grid" }, field("pp-publico", "Público", publico), field("pp-cidade", "Cidade", cidade), field("pp-remetente", "Quem assina a mensagem", remetente))), guia, lista);
  desenharGuia();
  await desenharLista();
}

// ---------------------------------------------------------------- calendario do Instagram
export async function telaConteudo(root) {
  const inicio = h("input", { class: "input", id: "ig-inicio", type: "date", value: hoje() });
  const semanas = h("select", { class: "select", id: "ig-semanas" }, [2, 4, 8].map((n) => h("option", { value: n, selected: n === 4 }, `${n} semanas`)));
  const ritmo = h("select", { class: "select", id: "ig-ritmo" }, [["1,3,5", "3 por semana (seg, qua, sex)"], ["2,4", "2 por semana (ter, qui)"], ["1,2,3,4,5", "5 por semana (seg a sex)"]].map(([v, t]) => h("option", { value: v }, t)));
  const cidade = h("input", { class: "input", id: "ig-cidade", value: "Balneário Camboriú", autocomplete: "off" });
  const gerar = h("button", { class: "btn btn-primary", type: "button" }, "Gerar calendário");
  const saida = h("div", { class: "stack" });
  const existentes = h("div");
  let produtos = [];
  try { produtos = ((await api.produtos({ situacao: "ativo" })).produtos ?? []).filter((p) => p.foto).slice(0, 30); } catch { produtos = []; }
  let deslocamento = 0;
  async function desenharExistentes() {
    try {
      const d = await api.setor("marketing");
      const cs = d.registros.filter((r) => r.tipo === "conteudo").sort((a, b) => String(a.dados?.data_publicacao).localeCompare(String(b.dados?.data_publicacao)));
      clear(existentes).append(panel({ title: "Conteúdos no Marketing", subtitle: "Ideia → produção → revisão da marca → aprovado → publicado. A regra viva avisa se as publicações caírem." },
        cs.length ? table({ head: ["Data", "Pauta", "Pilar", "Formato", "Situação"], rows: cs.map((c) => [c.dados?.data_publicacao ? formatDate(c.dados.data_publicacao) : "—", c.titulo, rotuloPilar(c.dados?.pilar), rotuloFormato(c.dados?.formato), c.estado]) })
          : h("p", { class: "result-empty" }, "Nenhum conteúdo no calendário ainda. Gere acima e clique em \"Levar ao Marketing\".")));
    } catch (e) { clear(existentes).append(errorNotice(e.message)); }
  }
  gerar.addEventListener("click", () => {
    const posts = gerarCalendario({ inicio: inicio.value || hoje(), semanas: Number(semanas.value), dias: ritmo.value.split(",").map(Number), cidade: cidade.value, produtos, deslocamento });
    deslocamento += 3;
    const todos = h("button", { class: "btn btn-primary", type: "button" }, `Levar os ${posts.length} posts ao Marketing`);
    const status = h("p", { class: "field-hint", "aria-live": "polite" });
    todos.addEventListener("click", async () => {
      todos.disabled = true;
      let ok = 0;
      for (const p of posts) { try { await api.criarRegistro(registroConteudo(p)); ok += 1; status.textContent = `${ok} de ${posts.length} criados…`; } catch (e) { status.textContent = `Parou no ${ok + 1}º: ${e.message}`; break; } }
      if (ok === posts.length) status.textContent = `${ok} conteúdos criados no Marketing (estado: ideia).`;
      await desenharExistentes();
    });
    clear(saida).append(h("div", { class: "row" }, todos, h("span", { class: "field-hint" }, "Ou leve um por um. Gerar de novo traz outras pautas."), status),
      ...posts.map((p) => {
        const um = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Levar ao Marketing");
        um.addEventListener("click", async () => { um.disabled = true; try { await api.criarRegistro(registroConteudo(p)); um.textContent = "No Marketing ✓"; await desenharExistentes(); } catch (e) { um.disabled = false; um.after(errorNotice(e.message)); } });
        return panel({ title: `${formatDate(p.data)} · ${p.titulo}`, subtitle: `${rotuloPilar(p.pilar)} · ${rotuloFormato(p.formato)}${p.produto ? ` · produto: ${p.produto}` : ""}` },
          p.exigeAutorizacao ? h("p", { class: "notice notice-warn" }, "Só publique com o case autorizado pelo cliente (registro Case no Marketing) e crédito ao arquiteto se autorizado.") : null,
          h("pre", { class: "rascunho-corpo" }, textoPost(p)),
          p.roteiro.length ? h("div", null, h("strong", null, "Roteiro: "), h("ol", null, p.roteiro.map((r) => h("li", null, r)))) : null,
          h("div", { class: "row" }, copiar(textoPost(p), "Copiar legenda"), um));
      }));
  });
  root.append(
    panel({ title: "Calendário do Instagram", subtitle: "Pautas prontas por pilar, com legenda, roteiro de vídeo e hashtags. Revise, produza e publique; o VEOS não publica sozinho." },
      h("div", { class: "form-grid" }, field("ig-inicio", "A partir de", inicio), field("ig-semanas", "Período", semanas), field("ig-ritmo", "Ritmo", ritmo), field("ig-cidade", "Cidade (hashtag e textos)", cidade)),
      h("div", { class: "row" }, gerar),
      method("De onde vêm as pautas", "Seis pilares do Marketing da VOICE (registro Conteúdo): tecnologia invisível, conforto, segurança, parceria com arquitetura, bastidores e cases.", "Pautas de produto usam produtos reais do catálogo com foto.", "Cases só com autorização de imagem do cliente (LGPD e direito de imagem).")),
    saida,
    panel({ title: "Rotina do Instagram: quem faz o quê", subtitle: "PROPOSTA: entra na estrutura do Marketing quando a direção aprovar." },
      table({ head: ["Quando", "Quem", "O que"], rows: ROTINA_INSTAGRAM.map((r) => [r.quando, r.quem, r.o_que]) })),
    existentes);
  await desenharExistentes();
}
