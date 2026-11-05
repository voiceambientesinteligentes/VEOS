// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/avisos.js - nao editar a mao.
// AVISOS DO ASSISTENTE (sem DOM): decide o que entra como aviso novo no chat flutuante.
//  - alertas ALTO/CRITICO do Radar;
//  - tarefas atrasadas e as tarefas da MINHA agenda para hoje;
//  - respostas dos diretores a perguntas feitas por mim em "Perguntar aos diretores" (as feitas pelo
//    chat ja aparecem na conversa; o assistente marca o id delas como vistas).
// Cada aviso tem uma `chave` estavel; quem chama guarda as chaves ja vistas para nao repetir.

const SIGLAS = { financas: "CFO", vendas: "CSO", marketing: "CMO", operacoes: "COO", tecnologia: "CIO", posvenda: "CXO", pessoas: "CHRO", secretaria: "SEC", direcao: "CEO" };
const sigla = (s) => SIGLAS[s] ?? s;
const resumo = (t, n = 140) => { const s = String(t ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };

export function avisosNovos({ alertas = [], tarefas = [], perguntas = [], vistos = new Set(), hoje, euId = null, agora = Date.now() } = {}) {
  const lista = [];
  for (const a of alertas) {
    if (!["CRITICO", "ALTO"].includes(a.severidade)) continue;
    lista.push({ chave: a.chave ?? a.id, tipo: "alerta", texto: `${a.severidade === "CRITICO" ? "Crítico" : "Alerta"} · ${sigla(a.setor_id)}: ${a.titulo}`, href: `#/setor/${a.setor_id}` });
  }
  for (const t of tarefas) {
    if (!t.prazo) continue;
    const minha = euId && t.responsavel === euId;
    if (t.prazo < hoje) lista.push({ chave: `t:${t.id}:atrasada`, tipo: "tarefa", texto: `Tarefa atrasada · ${sigla(t.setor_id)}: ${resumo(t.titulo)}`, href: `#/setor/${t.setor_id}` });
    else if (minha && t.prazo === hoje) lista.push({ chave: `t:${t.id}:hoje`, tipo: "tarefa", texto: `Na sua agenda de hoje: ${resumo(t.titulo)}`, href: "#/hoje" });
  }
  for (const p of perguntas) {
    if (p.estado !== "respondida" || !euId || p.autor !== euId) continue;
    const r = (p.respostas ?? []).slice(-1)[0];
    if (!r || agora - Date.parse(r.em) > 3 * 86_400_000) continue;
    lista.push({ chave: `p:${p.id}`, tipo: "resposta", texto: `O ${sigla(p.setor_id)} respondeu: «${resumo(p.pergunta, 80)}»`, href: `#/diretores?conversa=${p.conversa_id ?? p.id}` });
  }
  return lista.filter((x) => !vistos.has(x.chave));
}
