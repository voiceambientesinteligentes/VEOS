// Notificacoes (sem DOM): texto do resumo do dia e escolha dos alertas que viram aviso no navegador.

const SEV = { CRITICO: "crítico", ALTO: "alto", MEDIO: "atenção", INFO: "info" };
const dataBR = (iso) => String(iso).slice(0, 10).split("-").reverse().join("/");

/** Texto do resumo do dia (para copiar ou levar a caixa de saida). nomes: {setor_id: "SIGLA · Nome"} */
export function textoResumo(resumos, nomes = {}) {
  const linhas = [];
  for (const r of resumos) {
    const partes = [`${r.alertas_ativos} alerta(s) ativo(s)`];
    if (r.alertas_novos_24h.length) partes.push(`${r.alertas_novos_24h.length} novo(s) em 24 h`);
    if (r.resolvidos_24h) partes.push(`${r.resolvidos_24h} resolvido(s)`);
    partes.push(`${r.tarefas_abertas} tarefa(s) aberta(s)`);
    if (r.tarefas_atrasadas.length) partes.push(`${r.tarefas_atrasadas.length} atrasada(s)`);
    if (r.tarefas_hoje) partes.push(`${r.tarefas_hoje} para hoje`);
    if (r.mensagens_rascunho) partes.push(`${r.mensagens_rascunho} mensagem(ns) para enviar`);
    linhas.push(`${nomes[r.setor] ?? r.setor}: ${partes.join(", ")}.`);
    for (const a of r.alertas_novos_24h.slice(0, 3)) linhas.push(`  • [${SEV[a.severidade] ?? a.severidade}] ${a.titulo}`);
    for (const t of r.tarefas_atrasadas.slice(0, 3)) linhas.push(`  • atrasada desde ${dataBR(t.prazo)}: ${t.titulo}`);
  }
  return `Resumo do dia ${resumos[0] ? dataBR(resumos[0].data) : ""} · VEOS\n\n${linhas.join("\n")}`;
}

/** Alertas que merecem aviso no navegador: ALTO/CRITICO ainda nao avisados. Devolve [novos, vistos]. */
export function alertasParaAvisar(alertas, vistos = []) {
  const ja = new Set(vistos);
  const novos = alertas.filter((a) => ["ALTO", "CRITICO"].includes(a.severidade) && !ja.has(a.chave));
  // guarda so as chaves ainda ativas (lista nao cresce para sempre)
  const ativos = new Set(alertas.map((a) => a.chave));
  return [novos, [...new Set([...vistos.filter((c) => ativos.has(c)), ...novos.map((a) => a.chave)])]];
}
