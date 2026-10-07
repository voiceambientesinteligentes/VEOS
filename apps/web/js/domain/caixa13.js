// FLUXO DE CAIXA DE 13 SEMANAS (rotina proposta PL-002) e RESERVA (Politica V1 sec.12: meta de pelo menos
// 3 meses de custos fixos medios). Sem DOM. Regras conservadoras de CFO:
//   - parte do saldo REAL de hoje (extrato); conta sem saldo informado e LACUNA (nunca zero);
//   - contas a pagar atrasadas entram na semana 1 (vao ter de ser pagas);
//   - parcelas de clientes atrasadas NAO entram como certas (aparecem a parte, "a cobrar");
//   - imposto sobre as entradas do mes (DAS) entra no dia 20 do mes seguinte, salvo se ja houver
//     conta de imposto (2.1) lancada para aquele mes; aliquota informada pelo contador ou SIMULACAO.

const r2 = (v) => Math.round(v * 100) / 100;
const dia = (iso, d) => new Date(Date.parse(`${iso}T12:00:00Z`) + d * 864e5).toISOString().slice(0, 10);
const proximoMes20 = (mes) => { const [a, m] = mes.split("-").map(Number); const d = new Date(Date.UTC(a, m, 20)); return d.toISOString().slice(0, 10); };

/** Custos fixos do mes (recorrentes 4.x; sem recorrentes, o formulario) e a meta da reserva (3 meses). */
export function reserva({ recorrentes = [], fixosFormulario = null, retirada = null } = {}) {
  const fixos = recorrentes.filter((r) => String(r.plano_conta).startsWith("4.") && (r.parcelas === null || r.parcelas === undefined || r.parcelas > 0)).reduce((s, r) => s + Number(r.valor), 0);
  const base = fixos > 0 ? fixos : fixosFormulario;
  const origem = fixos > 0 ? "contas recorrentes do grupo 4 (despesas fixas)" : fixosFormulario ? "custos fixos do Formulário do CFO" : null;
  return {
    fixosMes: base === null || base === undefined ? null : r2(base), origem,
    meta: base ? r2(base * 3) : null,
    comRetirada: base && retirada ? r2((base + Number(retirada)) * 3) : null,
  };
}

/**
 * hoje AAAA-MM-DD; saldos [{nome, saldo|null}]; parcelas [{vencimento, valor, pedido, numero}];
 * contas [{vencimento, valor, descricao, plano_conta}]; impostos {aliquota_media_pct, origem};
 * entradasRealizadasMes = recebido no mes atual ate hoje (para o DAS do mes); reservaMeta opcional.
 */
export function projetar({ hoje, semanas = 13, saldos = [], parcelas = [], contas = [], impostos = null, incluirImpostos = true, entradasRealizadasMes = 0, reservaMeta = null }) {
  const comSaldo = saldos.filter((s) => s.saldo !== null && s.saldo !== undefined);
  const semSaldo = saldos.filter((s) => s.saldo === null || s.saldo === undefined).map((s) => s.nome);
  const saldoHoje = comSaldo.length ? r2(comSaldo.reduce((t, s) => t + Number(s.saldo), 0)) : null;
  const fimHorizonte = dia(hoje, semanas * 7 - 1);
  const receberAtrasado = parcelas.filter((p) => p.vencimento < hoje);
  const pagarAtrasado = contas.filter((k) => k.vencimento < hoje);
  const eventos = [];
  for (const p of parcelas) if (p.vencimento >= hoje && p.vencimento <= fimHorizonte) eventos.push({ data: p.vencimento, valor: Number(p.valor), tipo: "entrada", descricao: `Parcela ${p.numero ?? ""} ${p.pedido ?? ""}`.trim() });
  for (const k of contas) eventos.push({ data: k.vencimento < hoje ? hoje : k.vencimento, valor: -Number(k.valor), tipo: k.vencimento < hoje ? "atrasada" : "saida", descricao: k.descricao, plano: k.plano_conta });

  // provisao de imposto sobre as entradas (DAS no dia 20 do mes seguinte)
  const aliq = Number(impostos?.aliquota_media_pct);
  const provisoes = [];
  if (incluirImpostos && Number.isFinite(aliq) && aliq > 0) {
    const porMes = new Map();
    porMes.set(hoje.slice(0, 7), Number(entradasRealizadasMes) || 0);
    for (const e of eventos.filter((x) => x.tipo === "entrada")) porMes.set(e.data.slice(0, 7), (porMes.get(e.data.slice(0, 7)) ?? 0) + e.valor);
    const lancados = new Set(contas.filter((k) => k.plano_conta === "2.1" || /\bdas\b|simples nacional/i.test(k.descricao ?? "")).map((k) => k.vencimento.slice(0, 7)));
    for (const [mes, total] of porMes) {
      const venc = proximoMes20(mes);
      if (total <= 0 || venc > fimHorizonte || venc < hoje || lancados.has(venc.slice(0, 7))) continue;
      const v = r2((total * aliq) / 100);
      provisoes.push({ data: venc, valor: -v, tipo: "imposto", descricao: `Imposto sobre as entradas de ${mes} (${impostos.origem?.startsWith("SIMULA") ? "SIMULAÇÃO" : impostos.origem?.startsWith("ADOTADA") ? "alíquota adotada" : "alíquota informada"} ${String(aliq).replace(".", ",")}%)` });
    }
    eventos.push(...provisoes);
  }

  const lista = [];
  let saldo = saldoHoje;
  for (let i = 0; i < semanas; i++) {
    const inicio = dia(hoje, i * 7), fim = dia(hoje, i * 7 + 6);
    const da = eventos.filter((e) => e.data >= inicio && e.data <= fim);
    const entradas = r2(da.filter((e) => e.valor > 0).reduce((s, e) => s + e.valor, 0));
    const saidas = r2(da.filter((e) => e.valor < 0 && e.tipo !== "imposto").reduce((s, e) => s + e.valor, 0));
    const imposto = r2(da.filter((e) => e.tipo === "imposto").reduce((s, e) => s + e.valor, 0));
    const liquido = r2(entradas + saidas + imposto);
    const saldoInicial = saldo;
    saldo = saldo === null ? null : r2(saldo + liquido);
    lista.push({ n: i + 1, inicio, fim, entradas, saidas, impostos: imposto, liquido, saldo_inicial: saldoInicial, saldo_final: saldo, itens: da.sort((a, b) => a.data.localeCompare(b.data)) });
  }
  const finais = lista.filter((s) => s.saldo_final !== null);
  const menor = finais.length ? finais.reduce((m, s) => (s.saldo_final < m.saldo_final ? s : m)) : null;
  const alertas = [];
  if (saldoHoje === null) alertas.push("LACUNA: nenhuma conta com saldo (importe um extrato com saldo ou informe o saldo de uma data).");
  if (semSaldo.length && saldoHoje !== null) alertas.push(`Saldo parcial: sem saldo em ${semSaldo.join(", ")}.`);
  const negativa = finais.find((s) => s.saldo_final < 0);
  if (negativa) alertas.push(`O caixa fica NEGATIVO na semana ${negativa.n} (${negativa.inicio.split("-").reverse().join("/")}): ${negativa.saldo_final.toFixed(2)}.`);
  if (reservaMeta && menor && menor.saldo_final >= 0 && menor.saldo_final < reservaMeta) alertas.push(`Abaixo da reserva da Política (3 meses de fixos) a partir da semana ${finais.find((s) => s.saldo_final < reservaMeta).n}.`);
  if (receberAtrasado.length) alertas.push(`${receberAtrasado.length} parcela(s) de cliente atrasada(s) fora da projeção (a cobrar): ${r2(receberAtrasado.reduce((s, p) => s + Number(p.valor), 0)).toFixed(2)}.`);
  if (pagarAtrasado.length) alertas.push(`${pagarAtrasado.length} conta(s) a pagar atrasada(s) lançada(s) na semana 1.`);
  return {
    saldoHoje, semSaldo, semanas: lista, menorSaldo: menor ? { semana: menor.n, valor: menor.saldo_final, inicio: menor.inicio } : null,
    atrasadas: { receber: r2(receberAtrasado.reduce((s, p) => s + Number(p.valor), 0)), pagar: r2(pagarAtrasado.reduce((s, k) => s + Number(k.valor), 0)) },
    impostos: { provisoes, aliquota: Number.isFinite(aliq) ? aliq : null, origem: impostos?.origem ?? null },
    necessidade: necessidadeDeCaixa(lista, saldoHoje),
    alertas,
  };
}

/** Necessidade de caixa em 30, 60 e 90 dias: quanto falta para nao ficar negativo (0 = nao falta). */
export function necessidadeDeCaixa(lista, saldoHoje) {
  if (saldoHoje === null) return { d30: null, d60: null, d90: null };
  const ate = (dias) => {
    const ss = lista.filter((s) => s.n <= Math.ceil(dias / 7)).map((s) => s.saldo_final);
    const min = Math.min(saldoHoje, ...ss);
    return min < 0 ? r2(-min) : 0;
  };
  return { d30: ate(30), d60: ate(60), d90: ate(90) };
}
