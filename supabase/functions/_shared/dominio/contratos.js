// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/contratos.js - nao editar a mao.
// CONTRATOS DE SUPORTE / RECEITA RECORRENTE (sem DOM; navegador e Edge Function).
// Valida o contrato e calcula os indicadores de recorrencia a partir das cobrancas.

const txt = (v, max) => { const s = String(v ?? "").trim().replace(/\s+/g, " "); return s ? s.slice(0, max) : null; };
const dinheiro = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; };
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
export const ESTADOS_CONTRATO = [["ativo", "Ativo"], ["suspenso", "Suspenso"], ["encerrado", "Encerrado"]];

/** Normaliza o formulario. `parcial` = alteracao. Retorna { dados, erros }. */
export function normalizarContrato(e = {}, { parcial = false } = {}) {
  const erros = [], dados = {};
  const tem = (k) => !parcial || Object.prototype.hasOwnProperty.call(e, k);
  if (tem("cliente_nome") && !parcial) { dados.cliente_nome = txt(e.cliente_nome, 200); if (!dados.cliente_nome || dados.cliente_nome.length < 2) erros.push("Informe o cliente."); }
  if (!parcial && e.cliente_id) dados.cliente_id = String(e.cliente_id);
  if (tem("descricao")) { dados.descricao = txt(e.descricao, 300); if (!dados.descricao || dados.descricao.length < 2) erros.push("Descreva o que o contrato cobre."); }
  if (tem("valor_mensal")) { const v = dinheiro(e.valor_mensal); if (!(v > 0)) erros.push("Informe o valor mensal (maior que zero)."); else dados.valor_mensal = v; }
  if (tem("dia_vencimento")) { const d = e.dia_vencimento === "" || e.dia_vencimento == null ? 10 : Number(e.dia_vencimento); if (!Number.isInteger(d) || d < 1 || d > 28) erros.push("Dia de vencimento: de 1 a 28."); else dados.dia_vencimento = d; }
  if (!parcial) { if (!DATA_RE.test(String(e.inicio ?? ""))) erros.push("Informe a data de início."); else dados.inicio = e.inicio; }
  if (tem("fim")) { if (e.fim) { if (!DATA_RE.test(String(e.fim))) erros.push("Data de fim inválida."); else dados.fim = e.fim; } else dados.fim = null; }
  if (!parcial && dados.inicio && dados.fim && dados.fim < dados.inicio) erros.push("O fim não pode ser antes do início.");
  if (tem("observacao")) dados.observacao = txt(e.observacao, 2000);
  if (parcial && Object.prototype.hasOwnProperty.call(e, "estado")) { if (!ESTADOS_CONTRATO.some(([k]) => k === e.estado)) erros.push("Situação inválida."); else dados.estado = e.estado; }
  return { dados, erros };
}

/** Receita mensal recorrente (MRR), contratos ativos, cobrancas em aberto/atrasadas e proximo recebimento. */
export function indicadoresRecorrencia(contratos = [], cobrancas = [], hoje) {
  const ativos = contratos.filter((c) => c.estado === "ativo");
  const mrr = ativos.reduce((s, c) => s + Number(c.valor_mensal), 0);
  const abertas = cobrancas.filter((c) => c.estado === "aberta");
  const atrasadas = abertas.filter((c) => c.vencimento < hoje);
  const proxima = abertas.filter((c) => c.vencimento >= hoje).sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0] ?? null;
  const soma = (l) => l.reduce((s, c) => s + Number(c.valor), 0);
  return { mrr, arr: mrr * 12, contratos_ativos: ativos.length, abertas: abertas.length, atrasadas: atrasadas.length, valor_atrasado: soma(atrasadas), proxima };
}
