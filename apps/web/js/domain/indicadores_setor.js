// INDICADORES DOS SETORES CALCULADOS SOZINHOS (sem DOM): Marketing e Pos-venda (incl. satisfacao/NPS).
// Calcula a partir dos registros do setor (ultimos 90 dias) e devolve, por indicador, o valor + a fonte, ou
// LACUNA com o motivo quando o dado nao existe (nunca zero inventado). A meta continua sendo a do catalogo
// (PROPOSTA ate a direcao aprovar); aqui so se calcula o valor.
//   calcularIndicadoresSetor(setorId, registros, { hoje, mrr }) -> { [indicadorId]: { valor, texto, fonte } | { lacuna } }

const JANELA = 90;
const dias = (a, b) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 864e5);
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
const brl = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lacuna = (motivo) => ({ lacuna: motivo });
const ok = (valor, texto, fonte) => ({ valor, texto, fonte });
const noPeriodo = (data, hoje) => Boolean(data) && dias(hoje, String(data).slice(0, 10)) >= 0 && dias(hoje, String(data).slice(0, 10)) <= JANELA;

function marketing(regs, hoje) {
  const tipo = (t) => regs.filter((r) => r.tipo === t);
  const camp = tipo("campanha").filter((r) => noPeriodo(r.dados?.data_fim ?? r.dados?.data_inicio, hoje) && r.estado !== "cancelada");
  const ev = tipo("evento").filter((r) => noPeriodo(r.dados?.data_evento, hoje) && r.estado !== "cancelado");
  const soma = (lista, c) => lista.reduce((s, r) => s + (num(r.dados?.[c]) ?? 0), 0);
  const tem = (lista, c) => lista.some((r) => num(r.dados?.[c]) !== null);
  const F = "Registros de Marketing (campanhas e eventos, últimos 90 dias)";
  const r = {};
  const leads = soma(camp, "leads_gerados") + soma(ev, "leads_gerados");
  const temLeads = tem(camp, "leads_gerados") || tem(ev, "leads_gerados");
  r.leads_gerados = temLeads ? ok(leads, `${leads} lead(s) em 90 dias`, F) : lacuna("nenhuma campanha ou evento com leads gerados registrado nos últimos 90 dias");
  const opp = soma(camp, "oportunidades_geradas");
  r.oportunidades_marketing = tem(camp, "oportunidades_geradas") ? ok(opp, `${opp} oportunidade(s) em 90 dias`, F) : lacuna("campanhas sem oportunidades geradas registradas");
  r.taxa_lead_oportunidade = temLeads && leads > 0 && tem(camp, "oportunidades_geradas") ? ok(pct(opp, leads), `${pct(opp, leads)}% (${opp} de ${leads})`, F) : lacuna("falta leads gerados e oportunidades geradas nas campanhas");
  const inv = soma(camp, "investimento_realizado");
  r.custo_por_lead = tem(camp, "investimento_realizado") && leads > 0 ? ok(Math.round((inv / leads) * 100) / 100, `${brl(inv / leads)} por lead (${brl(inv)} ÷ ${leads})`, F) : lacuna("falta investimento realizado ou leads gerados");
  const realizados = ev.filter((r2) => ["realizado", "follow_up_concluido"].includes(r2.estado) && num(r2.dados?.convidados) > 0 && num(r2.dados?.presentes) !== null);
  const conv = soma(realizados, "convidados"), pres = soma(realizados, "presentes");
  r.comparecimento_eventos = realizados.length ? ok(pct(pres, conv), `${pct(pres, conv)}% (${pres} de ${conv} convidados, ${realizados.length} evento(s))`, F) : lacuna("nenhum evento realizado com convidados e presentes registrados");
  const cases = tipo("case").filter((x) => x.estado === "publicado" && noPeriodo(x.atualizado_em, hoje));
  r.cases_publicados = ok(cases.length, `${cases.length} case(s) publicado(s) em 90 dias`, "Registros de Marketing (cases)");
  const pub = tipo("conteudo").filter((x) => x.estado === "publicado" && noPeriodo(x.dados?.data_publicacao ?? x.atualizado_em, hoje));
  r.publicacoes_semana = ok(Math.round((pub.length / (JANELA / 7)) * 10) / 10, `${pub.length} publicação(ões) em 90 dias (≈ ${(pub.length / (JANELA / 7)).toFixed(1)} por semana)`, "Registros de Marketing (conteúdos publicados)");
  r.receita_influenciada = lacuna("exige ligar a origem de cada venda ganha à campanha/evento (o lead ainda não guarda a campanha)");
  r.arquitetos_engajados = lacuna("exige registrar a participação de cada escritório em eventos e visitas ao showroom");
  return r;
}

function posvenda(regs, hoje, ctx) {
  const tipo = (t) => regs.filter((r) => r.tipo === t);
  const r = {};
  const pesq = tipo("pesquisa_satisfacao").filter((x) => num(x.dados?.nota_nps) !== null && noPeriodo(x.dados?.data_resposta ?? x.atualizado_em, hoje));
  const F = "Registros do Pós-venda (últimos 90 dias)";
  if (pesq.length) {
    const prom = pesq.filter((x) => num(x.dados.nota_nps) >= 9).length, det = pesq.filter((x) => num(x.dados.nota_nps) <= 6).length;
    const nps = Math.round(((prom - det) / pesq.length) * 100);
    r.nps = ok(nps, `NPS ${nps} (${prom} promotor(es), ${det} detrator(es), ${pesq.length} resposta(s))${pesq.length < 10 ? " · amostra pequena" : ""}`, `${F} · pesquisas respondidas`);
  } else r.nps = lacuna("nenhuma pesquisa de satisfação respondida nos últimos 90 dias");
  const fechados = tipo("chamado").filter((x) => ["resolvido", "fechado"].includes(x.estado) && noPeriodo(x.atualizado_em, hoje));
  if (fechados.length) {
    const reinc = fechados.filter((x) => x.dados?.reincidente === "sim").length;
    r.chamados_reincidentes = ok(pct(reinc, fechados.length), `${pct(reinc, fechados.length)}% (${reinc} de ${fechados.length} chamados fechados)`, `${F} · chamados`);
    const comPrazo = fechados.filter((x) => x.dados?.data_limite_solucao);
    r.cumprimento_sla = lacuna(comPrazo.length ? "o chamado ainda não guarda a data em que foi resolvido (só a do prazo): falta o campo para comparar" : "chamados fechados sem prazo de solução registrado");
  } else {
    r.chamados_reincidentes = lacuna("nenhum chamado fechado nos últimos 90 dias");
    r.cumprimento_sla = lacuna("nenhum chamado fechado nos últimos 90 dias");
  }
  r.tempo_primeira_resposta = lacuna("o chamado guarda só a data da primeira resposta, sem a hora: não dá para medir em horas");
  r.resolucao_remota = lacuna("o chamado ainda não registra se houve visita");
  const rep = tipo("pesquisa_satisfacao").filter((x) => x.dados?.data_repasse_comercial && noPeriodo(x.dados.data_repasse_comercial, hoje));
  const com = tipo("pesquisa_satisfacao").filter((x) => ["indicacao", "ampliacao", "ambas"].includes(x.dados?.indicacao_ou_ampliacao));
  r.indicacoes_repassadas = com.length || rep.length ? ok(rep.length, `${rep.length} repassada(s) ao Comercial em 90 dias (${com.length} pesquisa(s) com indicação ou ampliação)`, `${F} · pesquisas`) : lacuna("nenhuma pesquisa com indicação ou ampliação registrada");
  const vis = tipo("visita_manutencao").filter((x) => noPeriodo(x.dados?.data_prevista, hoje) && x.estado !== "cancelada");
  const prazo = vis.filter((x) => x.dados?.data_realizada && x.dados?.data_prevista);
  r.preventivas_no_prazo = prazo.length ? ok(pct(prazo.filter((x) => x.dados.data_realizada <= x.dados.data_prevista).length, vis.length), `${pct(prazo.filter((x) => x.dados.data_realizada <= x.dados.data_prevista).length, vis.length)}% (${prazo.filter((x) => x.dados.data_realizada <= x.dados.data_prevista).length} de ${vis.length} visita(s) previstas)`, `${F} · visitas`) : lacuna("nenhuma visita de manutenção realizada com data prevista e data realizada");
  r.receita_recorrente = ctx.mrr != null ? ok(ctx.mrr, `${brl(ctx.mrr)} por mês (${ctx.contratosAtivos ?? 0} contrato(s) ativo(s))`, "Contratos de suporte do VEOS (Financeiro → Contratos de suporte)") : lacuna("sem acesso à tela de contratos de suporte");
  r.taxa_renovacao = lacuna("exige registrar o resultado da oferta de continuidade de cada contrato (renovou ou não)");
  r.custo_garantia = lacuna("exige o custo real de garantia/assistência por projeto, que ainda não é registrado");
  return r;
}

export function calcularIndicadoresSetor(setorId, registros = [], { hoje, mrr = null, contratosAtivos = null } = {}) {
  if (setorId === "marketing") return marketing(registros, hoje);
  if (setorId === "posvenda") return posvenda(registros, hoje, { mrr, contratosAtivos });
  return {};
}
