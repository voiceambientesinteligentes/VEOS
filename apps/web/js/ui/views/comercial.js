// SETOR COMERCIAL: visao com a base real, implantacao do setor (onboarding), canais de aquisicao,
// follow-up (cadencias que viram tarefa + rascunho; envio humano), mapa de quem define cada meta,
// base de clientes por segmento e o plano comercial (meta a semana, roteiros, showroom, eventos).
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { CADENCIAS, CANAIS, DONOS_METAS, IMPLANTACAO, SEGMENTOS } from "../../domain/comercial.js";
import { formatBRL, formatDate } from "../../domain/format.js";
import { clear, errorNotice, field, h, panel, stamp, stat, table } from "../dom.js";
import { telaComercial } from "./painel_dono.js";

const brl = (v) => (v === null || v === undefined ? "—" : formatBRL(String(Number(v).toFixed(2))));
const pct = (v) => (v === null || v === undefined ? "—" : `${String(v).replace(".", ",")}%`);
const SIGLA = Object.fromEntries(CATALOGO.map((s) => [s.id, s.sigla]));
const CANAL = { whatsapp: "WhatsApp", email: "E-mail", ligacao: "Ligação", visita: "Visita" };
const ESTADO = { a_fazer: ["A fazer", "neutral"], em_andamento: ["Em andamento", "live"], feito: ["Feito", "ok"], nao_se_aplica: ["Não se aplica", "neutral"] };
const ABAS = [["visao", "Visão"], ["implantacao", "Implantação"], ["canais", "Canais"], ["followup", "Follow-up"], ["metas", "Metas e donos"], ["base", "Base de clientes"], ["plano", "Plano e roteiros"]];
const perguntar = (setor, pergunta, rotulo) => h("a", { class: "btn btn-ghost btn-mini", href: `#/diretores?setor=${setor}&pergunta=${encodeURIComponent(pergunta)}` }, rotulo);

export async function telaSetorComercial(root, signal) {
  const aba0 = new URLSearchParams(location.hash.split("?")[1] ?? "").get("aba") ?? "visao";
  const corpo = h("div", { class: "stack" });
  const cache = {};
  const carregar = async (k, f) => (cache[k] ??= await f().catch((e) => ({ erro: e.message })));
  const botoes = ABAS.map(([k, rotulo]) => {
    const b = h("button", { class: "tab", type: "button", role: "tab", "aria-selected": String(k === aba0) }, rotulo);
    b.addEventListener("click", () => {
      history.replaceState(null, "", `#/comercial?aba=${k}`);
      botoes.forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      mostrar(k);
    });
    return b;
  });
  root.append(
    panel({ title: "Setor comercial", subtitle: "Da captação ao pós-venda: Eduardo (CSO) cuida do funil, das propostas e dos parceiros; Camila (CMO) cuida de marca, Instagram, Google, eventos e do programa com arquitetos. Mensagens são sempre rascunho: quem envia é uma pessoa." },
      h("div", { class: "row" },
        perguntar("vendas", "Monte minha agenda comercial desta semana: follow-ups atrasados, cafés técnicos com arquitetos e reativação da base.", "Perguntar ao CSO"),
        perguntar("marketing", "Monte o calendário de conteúdo do mês para atrair arquitetos e clientes de alto padrão.", "Perguntar ao CMO"),
        h("a", { class: "btn btn-ghost btn-mini", href: "#/setor/vendas/registros" }, "Leads e oportunidades"),
        h("a", { class: "btn btn-ghost btn-mini", href: "#/mensagens" }, "Caixa de saída"))),
    h("div", { class: "tabs setor-abas", role: "tablist", "aria-label": "Abas do setor comercial" }, botoes),
    corpo);

  async function mostrar(k) {
    clear(corpo);
    try { await ({ visao, implantacao, canais, followup, metas, base, plano }[k] ?? visao)(); } catch (e) { corpo.append(errorNotice(e.message)); }
  }

  // ------------------------------------------------ Visao
  async function visao() {
    const [b, imp, cad] = await Promise.all([carregar("base", api.comercialBase), carregar("imp", api.comercialImplantacao), carregar("cad", api.comercialCadencias)]);
    const itens = IMPLANTACAO.flatMap((g) => g.itens);
    const est = imp.estados ?? {};
    const feitos = itens.filter((i) => ["feito", "nao_se_aplica"].includes(est[i.codigo]?.estado)).length;
    const decisoes = itens.filter((i) => i.decisao && !["feito", "nao_se_aplica"].includes(est[i.codigo]?.estado));
    const sinais = [];
    if (!b.erro && b.pct_abertos > 30) sinais.push(`${pct(b.pct_abertos)} dos orçamentos do Zoho estão sem decisão (rascunho/enviado): sem isso não há taxa de fechamento real nem follow-up. Implantação COM-B2.`);
    if (!b.erro && b.duplicados?.length) sinais.push(`${b.duplicados.length} cliente(s) com cadastro duplicado no Zoho (ex.: ${b.duplicados[0].join(" / ")}). Implantação COM-B3.`);
    if (!b.erro && b.concentracao?.pct > 15) sinais.push(`Concentração: ${b.concentracao.nomes[0]} responde por ${pct(b.concentracao.pct)} dos orçamentos. Vale entender por que poucos fecham.`);
    corpo.append(
      b.erro ? errorNotice(`Base comercial: ${b.erro}`) : panel({ title: "O que a base real mostra", subtitle: `${b.fonte}. Segmento ${b.segmento}.` },
        h("div", { class: "cfo-stats" },
          stat("Orçamentos", String(b.orcamentos), `${b.clientes} cliente(s)`),
          stat("Ganhos · perdidos · sem decisão", `${b.ganhos} · ${b.perdidos} · ${b.abertos}`, `${pct(b.pct_abertos)} sem decisão`),
          stat("Ticket médio dos ganhos", brl(b.ticket_ganho), `mediana dos orçamentos ${brl(b.mediana_orcamento)}`),
          stat("Ganho sobre decididos", pct(b.taxa_ganho_decididos), "não vale como fechamento real enquanto houver orçamentos sem decisão")),
        sinais.length ? h("ul", { class: "stack-s" }, sinais.map((s) => h("li", null, s))) : null),
      panel({ title: "Implantação do setor", subtitle: `${feitos} de ${itens.length} itens concluídos.` },
        decisoes.length ? h("div", { class: "stack-s" }, h("p", null, h("strong", null, "Decisões suas que travam o setor:")),
          h("ul", { class: "stack-s" }, decisoes.map((i) => h("li", null, `${i.titulo}${i.ref ? ` (${i.ref}, Biblioteca → Revisões em andamento)` : ""}`)))) : h("p", { class: "notice notice-ok" }, "Nenhuma decisão pendente."),
        h("a", { class: "btn btn-ghost btn-mini", href: "#/comercial?aba=implantacao" }, "Abrir a implantação")),
      panel({ title: "Follow-up", subtitle: "Cadências contam a partir de 07/10/2026 e só para registros de pessoas reais." },
        cad.erro ? errorNotice(cad.erro) : h("p", null, cad.em_cadencia.length ? `${cad.em_cadencia.length} registro(s) em cadência agora.` : "Nenhum registro em cadência ainda: registre o primeiro lead em Comercial → Registros e o primeiro toque nasce na hora."),
        h("a", { class: "btn btn-ghost btn-mini", href: "#/comercial?aba=followup" }, "Ver follow-ups")));
  }

  // ------------------------------------------------ Implantacao
  async function implantacao() {
    const imp = await carregar("imp", api.comercialImplantacao);
    if (imp.erro) return corpo.append(errorNotice(imp.erro));
    for (const g of IMPLANTACAO) {
      corpo.append(panel({ title: g.grupo }, h("ul", { class: "list-plain stack" }, g.itens.map((i) => {
        const e = imp.estados[i.codigo] ?? { estado: "a_fazer" };
        const saida = h("div", { role: "status" });
        const sel = h("select", { class: "select", "aria-label": `Situação de ${i.codigo}` }, Object.entries(ESTADO).map(([k, [r]]) => h("option", { value: k, selected: k === e.estado ? "" : null }, r)));
        const evid = h("input", { class: "input", type: "text", value: e.evidencia ?? "", placeholder: "O que foi feito (obrigatório para concluir)", "aria-label": `Evidência de ${i.codigo}` });
        const salvar = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Salvar");
        const bloqueado = i.decisao && imp.papel !== "direcao";
        if (bloqueado) [sel, evid, salvar].forEach((x) => x.setAttribute("disabled", ""));
        salvar.addEventListener("click", async () => {
          try {
            await api.comercialMarcar(i.codigo, { estado: sel.value, evidencia: evid.value });
            delete cache.imp;
            clear(saida).append(h("p", { class: "notice notice-ok" }, "Salvo."));
          } catch (x) { clear(saida).append(errorNotice(x.message)); }
        });
        return h("li", { class: "panel panel-tight stack-s" },
          h("div", { class: "row" }, h("span", { class: "produto-codigo" }, i.codigo), h("strong", null, i.titulo), stamp(...ESTADO[e.estado]), i.decisao ? stamp("Decisão do fundador", "warn") : null),
          h("p", { class: "field-hint" }, `Dono: ${SIGLA[i.dono] ?? i.dono}`, i.ref ? ` · ${i.ref}` : "", i.como ? ` · ${i.como}` : "", e.quem ? ` · por ${e.quem} em ${formatDate(e.atualizado_em)}` : ""),
          h("div", { class: "row" }, sel, evid, salvar), bloqueado ? h("p", { class: "field-hint" }, "Só a direção marca as decisões.") : null, saida);
      }))));
    }
  }

  // ------------------------------------------------ Canais
  function canais() {
    corpo.append(panel({ title: "Canais de aquisição", subtitle: "Onde estão os clientes, como abordar, quem responde, como medir, o que a IA faz e o cuidado de cada um. Fontes: pesquisa de 07/10/2026 (BIB-0101, BIB-0102)." },
      h("ul", { class: "list-plain stack" }, CANAIS.map((c) => h("li", { class: "panel panel-tight stack-s" },
        h("div", { class: "row" }, h("strong", null, c.canal), stamp(`Dono: ${SIGLA[c.dono] ?? c.dono}${c.apoio ? ` · apoio ${SIGLA[c.apoio] ?? c.apoio}` : ""}`, "neutral")),
        c.cadencia ? h("p", { class: "field-hint" }, h("strong", null, "Cadência de follow-up: "), CADENCIAS.find((x) => x.id === c.cadencia)?.nome ?? c.cadencia) : null,
        h("p", null, h("strong", null, "Oferta de entrada: "), c.oferta),
        h("p", null, h("strong", null, "Como medir: "), c.metrica),
        h("p", null, h("strong", null, "O que a IA faz: "), c.ia),
        h("p", null, h("strong", null, "Ferramenta (grátis): "), c.ferramenta),
        c.cuidado && c.cuidado !== "—" ? h("p", { class: "field-hint" }, h("strong", null, "Cuidado: "), c.cuidado) : null)))));
  }

  // ------------------------------------------------ Follow-up
  async function followup() {
    const cad = await carregar("cad", api.comercialCadencias);
    const saida = h("div", { role: "status" });
    const contato = h("input", { class: "input", type: "text", placeholder: "e-mail ou telefone", "aria-label": "Contato que pediu para sair" });
    const motivo = h("input", { class: "input", type: "text", placeholder: "motivo (opcional)", "aria-label": "Motivo do bloqueio" });
    const bloquear = h("button", { class: "btn btn-ghost btn-mini", type: "button" }, "Bloquear contato");
    bloquear.addEventListener("click", async () => {
      try { const r = await api.comercialBloqueio({ contato: contato.value, motivo: motivo.value }); clear(saida).append(h("p", { class: "notice notice-ok" }, `${r.contato} não recebe mais rascunhos; os pendentes foram descartados.`)); contato.value = ""; }
      catch (e) { clear(saida).append(errorNotice(e.message)); }
    });
    corpo.append(
      panel({ title: "Registros em cadência", subtitle: "Cada toque vira, no dia, uma tarefa no Radar e (quando há texto) um rascunho na Caixa de saída. Ao mudar a etapa do registro, os toques pendentes são cancelados." },
        cad.erro ? errorNotice(cad.erro) : cad.em_cadencia.length
          ? table({ head: ["Registro", "Cadência", "Desde", "Toques", "Próximo", "Rascunhos"], align: ["", "", "", "r", "", "r"],
            rows: cad.em_cadencia.map((r) => [r.titulo, r.cadencia_nome, formatDate(r.desde), `${r.feitos} feito(s) · ${r.abertos} aberto(s) de ${r.toques}`, r.proximo ? `${formatDate(r.proximo.prazo)}` : "—", String(r.rascunhos)]) })
          : h("p", { class: "result-empty" }, "Nenhum registro em cadência. As cadências começam quando um lead, proposta, parceiro ou venda é registrado no setor Comercial (a partir de 07/10/2026).")),
      ...CADENCIAS.map((c) => panel({ title: c.nome, subtitle: `Começa quando: ${c.gatilho.tipo} em "${c.gatilho.estado}"${c.gatilho.origem ? ` (origem ${c.gatilho.origem})` : ""} · responsável: ${c.papel}. ${c.porque}` },
        table({ head: ["Dia", "Canal", "O que fazer", "Rascunho"], align: ["r", "", "", ""],
          rows: c.passos.map((p) => [`D+${p.dia}`, CANAL[p.canal] ?? p.canal, p.acao, p.texto || p.modelo ? "sim" : "—"]) }))),
      panel({ title: "Quem pediu para não receber mensagens", subtitle: "LGPD e boas práticas (BIB-0107): pedido de saída vale na hora; o contato some das cadências." },
        h("div", { class: "row" }, contato, motivo, bloquear), saida));
  }

  // ------------------------------------------------ Metas e donos
  function metas() {
    corpo.append(panel({ title: "Quem define cada meta (proposta BIB-0106)", subtitle: "O CEO define faturamento e mix por segmento; cada diretor define as metas da sua área. Toda meta nasce como proposta no Plano da VOICE e só vale depois da sua aprovação. Sem número aprovado = lacuna, nunca zero." },
      table({ head: ["Meta", "Quem define", "Quem persegue", "Como o VEOS mede", "Meta"], rows: DONOS_METAS.map((m) => [m.meta, SIGLA[m.define] ?? m.define, SIGLA[m.persegue] ?? m.persegue, m.medido, h("a", { href: "#/plano" }, "Lacuna: propor no Plano")]) }),
      h("p", { class: "field-hint" }, "Segmentos para o mix: ", Object.values(SEGMENTOS).join(" · "), ". Desdobramento da meta em atividade da semana: aba Plano e roteiros.")));
  }

  // ------------------------------------------------ Base de clientes
  async function base() {
    const b = await carregar("base", api.comercialBase);
    if (b.erro) return corpo.append(errorNotice(b.erro));
    corpo.append(
      panel({ title: "Por segmento", subtitle: `Classificação automática pelo nome do cliente: conferir (implantação COM-B4). ${b.fonte}.` },
        table({ head: ["Segmento", "Clientes", "Orçamentos", "Ganhos", "Perdidos", "Sem decisão", "Orçado", "Ganho", "Ticket ganho", "Ganho/decididos"], align: ["", "r", "r", "r", "r", "r", "r", "r", "r", "r"],
          rows: b.por_segmento.map((s) => [s.nome, String(s.clientes), String(s.orcamentos), String(s.ganhos), String(s.perdidos), String(s.abertos), brl(s.orcado), brl(s.ganho), brl(s.ticket_ganho), pct(s.taxa_ganho_decididos)]) })),
      panel({ title: `Especificadores (${b.especificadores.length})`, subtitle: "Escritórios de arquitetura e design que aparecem como cliente nos orçamentos." },
        b.especificadores.length ? table({ head: ["Escritório", "Orçamentos", "Ganhos", "Perdidos", "Sem decisão", "Orçado", "Último"], align: ["", "r", "r", "r", "r", "r", ""],
          rows: b.especificadores.map((c) => [c.nomes.join(" / "), String(c.orcamentos), String(c.ganhos), String(c.perdidos), String(c.abertos), brl(c.orcado), c.ultimo ? formatDate(c.ultimo) : "—"]) }) : h("p", { class: "result-empty" }, "Nenhum.")),
      panel({ title: "Clientes com mais orçamentos", subtitle: b.duplicados.length ? `${b.duplicados.length} nome(s) parecem o mesmo cliente com cadastros diferentes no Zoho.` : null },
        table({ head: ["Cliente", "Segmento", "Orçamentos", "Ganhos", "Orçado", "Último"], align: ["", "", "r", "r", "r", ""],
          rows: b.clientes_lista.slice(0, 30).map((c) => [c.nomes.join(" / "), SEGMENTOS[c.segmento], String(c.orcamentos), String(c.ganhos), brl(c.orcado), c.ultimo ? formatDate(c.ultimo) : "—"]) })));
  }

  // ------------------------------------------------ Plano comercial (meta a semana, roteiros, showroom, eventos)
  async function plano() {
    await telaComercial(corpo, signal);
  }

  await mostrar(aba0);
}
