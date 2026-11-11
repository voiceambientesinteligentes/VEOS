// CAIXA DE SAIDA e RESUMO DO DIA. O VEOS (ou a IA) prepara; a pessoa confirma: e-mail sai pela Brevo ou pelo Gmail
// da VOICE com "Enviar" (o que estiver ligado em Integracoes) ou ela abre no e-mail/WhatsApp, envia e marca como
// enviada. Fica registrado quem enviou, quando e por onde; o VEOS acompanha a entrega (Brevo) e a resposta (Gmail).
// Nada sai sozinho.
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { escolherViaEmail, VIAS_EMAIL } from "../../domain/brevo.js";
import { formatDateTime } from "../../domain/format.js";
import { telefoneWhatsApp } from "../../domain/proposta.js";
import { textoResumo } from "../../domain/notificacoes.js";
import { clear, errorNotice, field, h, method, panel, stamp } from "../dom.js";

const NOMES = Object.fromEntries(CATALOGO.map((s) => [s.id, `${s.sigla} · ${s.nome}`]));
const CANAL = { email: "E-mail", whatsapp: "WhatsApp" };

export function linkEnvio(m) {
  if (m.canal === "whatsapp") return `https://wa.me/${telefoneWhatsApp(m.destinatario)}?text=${encodeURIComponent(m.corpo)}`;
  return `mailto:${encodeURIComponent(m.destinatario ?? "")}?subject=${encodeURIComponent(m.assunto ?? "")}&body=${encodeURIComponent(m.corpo)}`;
}

/** Botao que guarda um rascunho na caixa de saida. */
export function botaoCaixaSaida(dados, rotulo = "Levar à caixa de saída") {
  const b = h("button", { class: "btn btn-ghost", type: "button" }, rotulo);
  b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      await api.mensagemCriar(dados);
      b.textContent = "Na caixa de saída ✓";
    } catch (e) {
      b.disabled = false;
      b.textContent = e.message;
    }
  });
  return b;
}

export async function telaMensagens(root) {
  const conteudo = h("div", { class: "stack" });
  root.append(conteudo);
  let estado = "rascunho";
  async function desenhar(msg) {
    const [{ mensagens }, st] = await Promise.all([api.mensagens(estado), api.emailSituacao().catch(() => ({ conectado: false, envio: null }))]);
    const gmailOk = Boolean(st.conectado), brevoOk = Boolean(st.brevo?.pronta);
    // por onde ESTA mensagem sairia (resposta a conversa do Gmail sai pelo Gmail) e a alternativa, se os dois estao ligados
    const viaDe = (m) => escolherViaEmail({ gmail: gmailOk, brevo: brevoOk, padrao: st.padrao, responderA: m.responder_a });
    const contaDe = (via) => (via === "gmail" ? st.conta : st.brevo?.remetente?.email) ?? "conta conectada";
    const abas = h("div", { class: "row" }, Object.entries({ rascunho: "Para enviar", enviada: "Enviadas", descartada: "Descartadas" }).map(([k, rot]) => {
      const b = h("button", { class: "btn btn-ghost", type: "button", "aria-pressed": String(k === estado) }, rot);
      b.addEventListener("click", () => { estado = k; desenhar(); });
      return b;
    }));
    const cartao = (m) => {
      const saida = h("div", { role: "status" });
      const acoes = h("div", { class: "row" });
      const via = m.canal === "email" ? viaDe(m) : null;
      if (m.estado === "rascunho") {
        const botaoEnviar = (v, principal) => {
          const rotulo = `Enviar ${VIAS_EMAIL[v].pelo}`;
          const env = h("button", { class: `btn ${principal ? "btn-primary" : "btn-ghost"}`, type: "button" }, rotulo);
          env.addEventListener("click", async () => {
            if (!confirm(`Enviar agora ${VIAS_EMAIL[v].pelo} (${contaDe(v)}) para ${m.destinatario}?`)) return;
            env.disabled = true; env.textContent = "Enviando…";
            try { await api.mensagemEnviar(m.id, "tela", v); await desenhar(`E-mail enviado ${VIAS_EMAIL[v].pelo} para ${m.destinatario}.${gmailOk ? " O VEOS avisa quando houver resposta." : ""}`); }
            catch (e) { env.disabled = false; env.textContent = rotulo; saida.append(errorNotice(e.message)); }
          });
          return env;
        };
        if (via && m.destinatario) {
          acoes.append(botaoEnviar(via, true));
          const outra = via === "brevo" ? (gmailOk ? "gmail" : null) : (brevoOk ? "brevo" : null);
          if (outra) acoes.append(botaoEnviar(outra, false));
        }
        acoes.append(h("a", { class: `btn ${via ? "btn-ghost" : "btn-primary"}`, href: linkEnvio(m), target: m.canal === "whatsapp" ? "_blank" : null, rel: "noopener noreferrer" }, `Abrir no ${CANAL[m.canal]}`));
        const enviada = h("button", { class: "btn btn-ghost", type: "button" }, "Marquei como enviada");
        enviada.addEventListener("click", async () => {
          if (!confirm("Confirma que você enviou esta mensagem?")) return;
          try { await api.mensagemMarcar(m.id, "enviada"); await desenhar("Registrado como enviada."); } catch (e) { saida.append(errorNotice(e.message)); }
        });
        const descartar = h("button", { class: "btn btn-ghost", type: "button" }, "Descartar");
        descartar.addEventListener("click", async () => {
          const motivo = prompt("Por que descartar?");
          if (!motivo) return;
          try { await api.mensagemMarcar(m.id, "descartada", { motivo }); await desenhar("Mensagem descartada."); } catch (e) { saida.append(errorNotice(e.message)); }
        });
        acoes.append(enviada, descartar);
      }
      const TIPO = { prospeccao: "Prospecção", cobranca: "Cobrança", resposta: "Resposta", proposta: "Proposta", pos_venda: "Pós-venda", interna: "Interna" };
      const POR = { gmail: " pelo Gmail do VEOS", brevo: " pela Brevo", simulado: " (simulado, teste)" };
      // avisos da Brevo: entregue, aberto, clique, voltou, spam
      const avisos = m.estado === "enviada" ? [
        m.devolvida_em ? stamp("Voltou", "risk") : null,
        m.spam_em ? stamp("Marcou como spam", "risk") : null,
        m.ultimo_evento === "descadastro" ? stamp("Descadastrou", "warn") : null,
        m.entregue_em && !m.devolvida_em ? stamp("Entregue", "ok") : null,
        m.aberta_em ? stamp(m.aberturas > 1 ? `Aberto ${m.aberturas}x` : "Aberto", "live") : null,
        m.clicada_em ? stamp("Clicou no link", "live") : null,
        m.via === "brevo" && !m.entregue_em && !m.devolvida_em && m.ultimo_evento === "adiado" ? stamp("Entrega adiada", "warn") : null,
      ].filter(Boolean) : [];
      return h("li", { class: "panel panel-tight stack-s" },
        h("div", { class: "row" }, stamp(CANAL[m.canal], "live"), TIPO[m.tipo] ? stamp(TIPO[m.tipo], "neutral") : null, String(m.origem ?? "").startsWith("ia:") ? stamp("Preparada pela IA", "warn") : null,
          h("strong", null, m.assunto ?? (m.destinatario || "Sem destinatário")), m.setor_id ? h("span", { class: "field-hint" }, NOMES[m.setor_id] ?? m.setor_id) : null),
        h("p", { class: "field-hint" }, [m.destinatario ? `Para: ${m.destinatario}` : "Destinatário escolhido no app", `criada por ${m.autor} em ${formatDateTime(m.criado_em)}`,
          m.estado === "enviada" ? `enviada por ${m.enviada_por_nome} em ${formatDateTime(m.enviada_em)}${POR[m.via] ?? ""}` : null, m.estado === "descartada" ? `descartada: ${m.motivo_descarte}` : null].filter(Boolean).join(" · ")),
        avisos.length ? h("div", { class: "row" }, avisos) : null,
        m.estado === "enviada" && (m.devolvida_em || m.spam_em) && m.erro_envio ? h("p", { class: "notice notice-warn" }, `${m.erro_envio}. O endereço foi para a lista de bloqueio.`) : null,
        m.respondida_em ? h("p", { class: "notice notice-ok" }, `Respondeu em ${formatDateTime(m.respondida_em)}${m.resposta_de ? ` (${m.resposta_de})` : ""}: «${String(m.resposta_trecho ?? "").slice(0, 300)}»`) : null,
        m.estado === "enviada" && ["gmail", "brevo"].includes(m.via) && !m.respondida_em && !m.devolvida_em
          ? h("p", { class: "field-hint" }, gmailOk ? "Sem resposta ainda (o VEOS confere no Gmail e cria a tarefa “Responder” quando chegar)." : "A resposta chega no seu Gmail. Conecte o Gmail em Integrações para o VEOS avisar e criar a tarefa “Responder”.")
          : null,
        m.erro_envio && m.estado === "rascunho" ? h("p", { class: "notice notice-warn" }, `Última tentativa de envio falhou: ${m.erro_envio}`) : null,
        h("pre", { class: "rascunho-corpo" }, m.corpo), acoes, saida);
    };
    const canal = h("select", { class: "select", id: "ms-canal" }, h("option", { value: "email" }, "E-mail"), h("option", { value: "whatsapp" }, "WhatsApp"));
    const dest = h("input", { class: "input", id: "ms-dest", autocomplete: "off" }), assunto = h("input", { class: "input", id: "ms-assunto", autocomplete: "off" });
    const texto = h("textarea", { class: "input", id: "ms-corpo", rows: 4 });
    const setor = h("select", { class: "select", id: "ms-setor" }, h("option", { value: "" }, "—"), CATALOGO.map((s) => h("option", { value: s.id }, NOMES[s.id])));
    const erro = h("div", { role: "alert" });
    const criar = h("button", { class: "btn btn-primary", type: "submit" }, "Guardar rascunho");
    const form = h("form", { class: "stack-s", novalidate: true },
      h("div", { class: "form-grid" }, field(canal.id, "Canal", canal), field(dest.id, "Para (e-mail ou telefone)", dest), field(assunto.id, "Assunto", assunto), field(setor.id, "Setor", setor)),
      field(texto.id, "Mensagem *", texto), h("div", { class: "row" }, criar), erro);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clear(erro);
      if (!texto.value.trim()) return erro.append(errorNotice("Escreva a mensagem."));
      criar.disabled = true;
      try {
        await api.mensagemCriar({ canal: canal.value, destinatario: dest.value, assunto: assunto.value, corpo: texto.value, setor_id: setor.value || null });
        estado = "rascunho";
        await desenhar("Rascunho guardado.");
      } catch (err) { erro.append(errorNotice(err.message)); criar.disabled = false; }
    });
    clear(conteudo).append(...[
      msg ? h("p", { class: "notice notice-ok", role: "status" }, msg) : null,
      panel({ title: "Caixa de saída", subtitle: st.envio ? `Mensagens preparadas pelo VEOS, pela IA ou pela equipe. E-mail: revise e “Enviar ${st.envio.pelo}” (${st.envio.conta ?? "conta da VOICE"} · ${st.enviados_hoje ?? 0} enviado(s) hoje).` : "Mensagens preparadas pelo VEOS, pela IA ou pela equipe. Abra, revise, envie você mesmo e marque como enviada. Para o VEOS enviar, conecte a Brevo ou o Gmail em Integrações.", actions: abas },
        mensagens.length ? h("ul", { class: "list-plain stack-s" }, mensagens.map(cartao)) : h("p", { class: "result-empty" }, "Nada aqui.")),
      panel({ title: "Nova mensagem" }, form,
        method("Regras", "Nada sai sozinho: o e-mail só é enviado (pela Brevo ou pelo Gmail) quando uma pessoa confirma (botão, ou “confirmo” no chat da IA, ou o dono no ChatGPT/Claude). WhatsApp é sempre enviado pelo aplicativo.",
          "Quem pediu para não receber mensagens fica na lista de bloqueio e não recebe nada. Prospecção: até 30 por dia, 1:1, com a linha de “sair”, e no máximo uma apresentação por endereço a cada 30 dias.",
          "Enviar ou marcar como enviada registra quem, quando e por onde; descartar exige motivo. A trilha não pode ser alterada.")),
    ].filter(Boolean));
  }
  await desenhar();
}

/** Painel do resumo do dia (Radar). */
export function painelResumoDia(resumos) {
  const texto = textoResumo(resumos, NOMES);
  const copiar = h("button", { class: "btn btn-ghost", type: "button" }, "Copiar");
  copiar.addEventListener("click", async () => { try { await navigator.clipboard.writeText(texto); copiar.textContent = "Copiado"; } catch { copiar.textContent = "Não foi possível copiar"; } });
  const linhas = resumos.filter((r) => r.alertas_ativos || r.tarefas_abertas || r.mensagens_rascunho);
  return panel({ title: "Resumo do dia", subtitle: "Por setor: o que entrou nas últimas 24 h, o que está atrasado e o que falta enviar.",
    actions: h("div", { class: "row" }, copiar, botaoCaixaSaida({ canal: "email", assunto: texto.split("\n")[0], corpo: texto, origem: "resumo:dia" }, "Rascunho de e-mail")) },
    linhas.length
      ? h("ul", { class: "list-plain stack-s" }, linhas.map((r) => h("li", { class: "row" },
        h("a", { href: `#/setor/${r.setor}` }, NOMES[r.setor] ?? r.setor),
        r.alertas_novos_24h.length ? stamp(`${r.alertas_novos_24h.length} novo(s)`, "warn") : null,
        r.tarefas_atrasadas.length ? stamp(`${r.tarefas_atrasadas.length} atrasada(s)`, "risk") : null,
        r.tarefas_hoje ? stamp(`${r.tarefas_hoje} para hoje`, "live") : null,
        r.mensagens_rascunho ? h("a", { href: "#/mensagens" }, stamp(`${r.mensagens_rascunho} para enviar`, "neutral")) : null,
        h("span", { class: "field-hint" }, `${r.alertas_ativos} alerta(s) · ${r.tarefas_abertas} tarefa(s)`))))
      : h("p", { class: "notice notice-ok" }, "Nada pendente nos seus setores."));
}
