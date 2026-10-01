// CAIXA DE SAIDA e RESUMO DO DIA. O VEOS prepara; uma pessoa abre no e-mail/WhatsApp, envia e
// marca como enviada (fica registrado quem e quando). Nada sai sozinho.
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
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
    const { mensagens } = await api.mensagens(estado);
    const abas = h("div", { class: "row" }, Object.entries({ rascunho: "Para enviar", enviada: "Enviadas", descartada: "Descartadas" }).map(([k, rot]) => {
      const b = h("button", { class: "btn btn-ghost", type: "button", "aria-pressed": String(k === estado) }, rot);
      b.addEventListener("click", () => { estado = k; desenhar(); });
      return b;
    }));
    const cartao = (m) => {
      const saida = h("div", { role: "status" });
      const acoes = h("div", { class: "row" });
      if (m.estado === "rascunho") {
        acoes.append(h("a", { class: "btn btn-primary", href: linkEnvio(m), target: m.canal === "whatsapp" ? "_blank" : null, rel: "noopener noreferrer" }, `Abrir no ${CANAL[m.canal]}`));
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
      return h("li", { class: "panel panel-tight stack-s" },
        h("div", { class: "row" }, stamp(CANAL[m.canal], "live"), h("strong", null, m.assunto ?? (m.destinatario || "Sem destinatário")), m.setor_id ? h("span", { class: "field-hint" }, NOMES[m.setor_id] ?? m.setor_id) : null),
        h("p", { class: "field-hint" }, [m.destinatario ? `Para: ${m.destinatario}` : "Destinatário escolhido no app", `criada por ${m.autor} em ${formatDateTime(m.criado_em)}`,
          m.estado === "enviada" ? `enviada por ${m.enviada_por_nome} em ${formatDateTime(m.enviada_em)}` : null, m.estado === "descartada" ? `descartada: ${m.motivo_descarte}` : null].filter(Boolean).join(" · ")),
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
      panel({ title: "Caixa de saída", subtitle: "Mensagens preparadas pelo VEOS ou pela equipe. Abra, revise, envie você mesmo e marque como enviada.", actions: abas },
        mensagens.length ? h("ul", { class: "list-plain stack-s" }, mensagens.map(cartao)) : h("p", { class: "result-empty" }, "Nada aqui.")),
      panel({ title: "Nova mensagem" }, form,
        method("Regras", "O VEOS não envia e-mail nem WhatsApp sozinho: envio automático a clientes é uma decisão de alçada ainda não tomada.", "Marcar como enviada registra quem enviou e quando; descartar exige motivo. A trilha não pode ser alterada.")),
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
