// Pendencias do Radar por setor, para a Orbita piscar o setor que tem aviso (sem DOM).
const GRAVIDADE = { CRITICO: 0, ALTO: 1, MEDIO: 2, INFO: 3 };

/** Resumo do Radar por setor (sem DOM): contagens, o que esta pendente (mais grave primeiro) e se o setor deve piscar. */
export function atividadeDoRadar(setores, radar) {
  const alertas = radar?.alertas ?? [], tarefas = radar?.tarefas ?? [], acessiveis = radar?.setores ?? [];
  return Object.fromEntries(setores.map((s) => {
    const meus = alertas.filter((a) => a.setor_id === s.id);
    const minhasTarefas = tarefas.filter((t) => t.setor_id === s.id);
    const pendencias = [
      ...meus.map((a) => ({ tipo: "alerta", titulo: a.titulo, detalhe: a.mensagem ?? "", sev: a.severidade, peso: GRAVIDADE[a.severidade] ?? 3 })),
      ...minhasTarefas.map((t) => ({ tipo: "tarefa", titulo: t.titulo, detalhe: t.prazo ? `Prazo: ${t.prazo.split("-").reverse().join("/")}` : "", sev: null, peso: 2.5 })),
    ].sort((a, b) => a.peso - b.peso);
    return [s.id, { alertas: meus.length, tarefas: minhasTarefas.length, acessivel: acessiveis.includes(s.id), pendencias }];
  }));
}
