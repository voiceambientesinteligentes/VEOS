// Dados do CAIXA REAL usados pela API (/caixa) e pelo motor de IA do CFO: as mesmas consultas, os
// calculos ficam nos modulos de dominio (caixa13, dre, indicadores). Sem regra de permissao aqui:
// quem chama confere o papel.
// deno-lint-ignore-file no-explicit-any
import { servico } from "./banco.ts";
import { rbt12 } from "./zoho.ts";
import { parametros } from "./dominio/formulario_cfo.js";
import { impostosSimulados } from "./dominio/cfo_cenarios.js";

const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });
export const hojeSP = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
export const somaDias = (iso: string, d: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + d * 864e5).toISOString().slice(0, 10);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Aliquota media de imposto sobre as entradas (informada pelo contador ou SIMULACAO), ponderada pelo mix praticado. */
export async function aliquotaMedia() {
  const [linhas, rb, ests, itens] = await Promise.all([
    rpc("formulario_vigente", { p_formulario: "cfo" }),
    rbt12(),
    servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&dados->>status=in.(accepted,invoiced)&dados->>date=gte.${somaDias(hojeSP(), -365)}&select=linhas:dados->line_items&limit=500`),
    servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&excluido=is.false&select=zoho_id,tipo:dados->>product_type&limit=10000"),
  ]);
  const respostas: Record<string, unknown> = {};
  for (const l of linhas ?? []) respostas[l.secao] = { dados: l.dados };
  const p = parametros(respostas);
  const sim = impostosSimulados(rb);
  const tipo = new Map(itens.map((i: { zoho_id: string; tipo: string }) => [i.zoho_id, i.tipo]));
  let bens = 0, serv = 0;
  for (const e of ests) for (const l of e.linhas ?? []) (tipo.get(String(l.item_id)) === "goods" ? (bens += Number(l.item_total) || 0) : (serv += Number(l.item_total) || 0));
  const mix = bens + serv > 0 ? bens / (bens + serv) : null;
  const tP = p.tProduto ?? sim?.produto ?? null, tS = p.tServico ?? sim?.servico ?? null;
  const media = tP !== null && tS !== null && mix !== null ? Math.round((mix * tP + (1 - mix) * tS) * 100) / 100 : null;
  return {
    aliquota_media_pct: media, produto_pct: tP, servico_pct: tS, mix_produto: mix === null ? null : Math.round(mix * 1000) / 1000,
    origem: p.tProduto !== null && p.tServico !== null ? "informada (contador)" : media !== null ? "SIMULAÇÃO: Simples pelo faturamento estimado no Zoho (confirmar com o contador)" : "LACUNA",
    fixos_formulario: p.fixos, retirada_formulario: p.metas?.retirada_planejada ?? p.retirada ?? p.proLabore ?? null,
  };
}


/** Contas bancarias ativas com o saldo de hoje e pendencias de classificacao. */
export async function contasComSaldo() {
  const [contas, saldos, pend, ultimos] = await Promise.all([
    servico("/rest/v1/contas_bancarias?select=id,nome,banco,final_conta,tipo,ativa,saldo_inicial,saldo_inicial_em,criado_em&order=ativa.desc,nome"),
    rpc("saldo_contas", { p_data: hojeSP() }),
    servico("/rest/v1/movimentos_bancarios?categoria=is.null&select=conta_id"),
    servico("/rest/v1/extrato_importacoes?select=conta_id,periodo_ate,em,arquivo&order=em.desc&limit=200"),
  ]);
  return contas.map((k: Record<string, any>) => {
    const s = saldos.find((x: { conta_id: string }) => x.conta_id === k.id);
    return { ...k, saldo_hoje: s?.saldo ?? null, ancora_em: s?.ancora_em ?? null, ancora_origem: s?.origem ?? null, sem_categoria: pend.filter((x: { conta_id: string }) => x.conta_id === k.id).length, ultimo_extrato: ultimos.find((x: { conta_id: string }) => x.conta_id === k.id) ?? null };
  });
}

/** Dados do fluxo de N semanas (saldos, parcelas, contas, recorrentes, imposto e o recebido no mes). */
export async function dadosSemanas(n: number) {
  const semanas = Math.min(26, Math.max(4, n || 13));
  const hoje = hojeSP(), ate = somaDias(hoje, semanas * 7);
  const [saldos, parcelas, contas, recorrentes, imp, mesAtual] = await Promise.all([
    rpc("saldo_contas", { p_data: hoje }),
    servico(`/rest/v1/parcelas?estado=eq.aberta&vencimento=lte.${ate}&select=id,numero,vencimento,valor,pedido:pedidos!inner(numero,estado)&pedido.estado=neq.cancelado&order=vencimento&limit=2000`),
    servico(`/rest/v1/contas_pagar?estado=eq.aberta&vencimento=lte.${ate}&select=id,descricao,fornecedor,categoria,plano_conta,vencimento,valor,recorrente_id&order=vencimento&limit=3000`),
    servico("/rest/v1/contas_recorrentes?ativa=is.true&select=descricao,plano_conta,valor,parcelas,inicio"),
    aliquotaMedia(),
    rpc("caixa_resumo_mensal", { p_de: `${hoje.slice(0, 7)}-01`, p_ate: hoje }),
  ]);
  const entradasRealizadasMes = r2(mesAtual.filter((x: { grupo: string }) => x.grupo === "receita").reduce((t: number, x: { entradas: number }) => t + Number(x.entradas ?? 0), 0));
  return { hoje, semanas, entradas_realizadas_mes: entradasRealizadasMes, saldos, parcelas: parcelas.map((x: Record<string, any>) => ({ ...x, pedido: x.pedido?.numero })), contas, recorrentes, impostos: imp };
}

/** Dados do fechamento (DRE) de um mes AAAA-MM. */
export async function dadosFechamento(mes: string) {
  const ini = `${mes}-01`;
  const fim = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const [movs, plano, saldoIni, saldoFim, nfs, pagas, competencia, imp] = await Promise.all([
    servico(`/rest/v1/movimentos_bancarios?data=gte.${ini}&data=lte.${fim}&select=id,data,valor,descricao,categoria,parcela_id,conta_pagar_id&limit=5000`),
    servico("/rest/v1/plano_contas?select=codigo,nome,grupo,natureza"),
    rpc("saldo_contas", { p_data: somaDias(ini, -1) }),
    rpc("saldo_contas", { p_data: fim }),
    servico(`/rest/v1/notas_fiscais?emitida_em=gte.${ini}&emitida_em=lte.${fim}&select=tipo,valor,emitida_em`).catch(() => []),
    servico(`/rest/v1/contas_pagar?estado=eq.paga&pago_em=gte.${ini}&pago_em=lte.${fim}&select=valor_pago,categoria,plano_conta`),
    servico(`/rest/v1/contas_pagar?estado=neq.cancelada&competencia=eq.${mes}&select=valor,estado,plano_conta`),
    aliquotaMedia(),
  ]);
  return { mes, ini, fim, movimentos: movs.map((m: Record<string, any>) => ({ ...m, descricao: String(m.descricao).slice(0, 80) })), plano, saldo_inicio: saldoIni, saldo_fim: saldoFim, notas: nfs, contas_pagas: pagas, contas_competencia: competencia, impostos: imp };
}

/** Dados dos indicadores (12 meses). */
export async function dadosIndicadores() {
  const hoje = hojeSP(), de = somaDias(hoje, -365);
  const [resumo, parcelas, contas, ests, saldos, recorrentes, alertas, imp] = await Promise.all([
    rpc("caixa_resumo_mensal", { p_de: `${de.slice(0, 7)}-01`, p_ate: hoje }),
    servico(`/rest/v1/parcelas?select=vencimento,valor,estado,recebido_em,valor_recebido,pedido:pedidos!inner(estado)&pedido.estado=neq.cancelado&limit=5000`),
    servico("/rest/v1/contas_pagar?estado=eq.aberta&select=vencimento,valor,plano_conta&limit=5000"),
    servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&dados->>status=in.(accepted,invoiced)&dados->>date=gte.${de}&select=total:dados->>total,data:dados->>date,cliente:dados->>customer_id,codigo:dados->>contact_number&limit=2000`),
    rpc("saldo_contas", { p_data: hoje }),
    servico("/rest/v1/contas_recorrentes?ativa=is.true&select=plano_conta,valor,parcelas"),
    servico("/rest/v1/alertas?estado=eq.ativo&sentinela=eq.FLX_EXPOSICAO_PEDIDO&select=chave").catch(() => []),
    aliquotaMedia(),
  ]);
  return { hoje, resumo_mensal: resumo, parcelas: parcelas.map((x: Record<string, any>) => ({ ...x, pedido: undefined })), contas_abertas: contas, vendas: ests.map((e: Record<string, any>) => ({ total: Number(e.total), data: e.data, cliente: e.codigo || `cliente-${String(e.cliente).slice(-5)}` })), saldos, recorrentes, alertas_exposicao: alertas.length, impostos: imp };
}
