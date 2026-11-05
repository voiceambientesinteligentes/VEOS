// Agenda por pessoa: para cada membro ATIVO com cargo definido, as atividades diarias/semanais/mensais do
// cargo (Estrutura da empresa) viram tarefas dele (origem "agenda", responsavel = a pessoa). So gera para
// cargos com pessoa: cargo vago nao cria tarefa. Tarefas da agenda vencidas e nao feitas sao encerradas
// (a atividade do periodo passou), para nao virar fila de atraso.
import { servico } from "./banco.ts";
import { CATALOGO } from "./setores/catalogo.ts";
import { cargosDoSetor, chaveDaAgenda, tarefasDaAgenda } from "./dominio/agenda.js";
import { hojeSP } from "./caixa_dados.ts";

export async function vigiarAgenda(agora = Date.now()) {
  const hoje = hojeSP();
  const membros: { user_id: string; papel: string; cargo: string }[] = await servico("/rest/v1/membros?ativo=is.true&cargo=not.is.null&select=user_id,papel,cargo&limit=500");
  const tarefas: Record<string, unknown>[] = [];
  for (const m of membros) {
    // o cargo e procurado no setor do membro; a direcao pode ocupar o cargo de qualquer setor ("setor:cargo")
    const [setorId, cargoId] = m.cargo.includes(":") ? m.cargo.split(":") : [m.papel, m.cargo];
    const setor = (CATALOGO as unknown as { id: string }[]).find((s) => s.id === setorId);
    const cargo = setor ? cargosDoSetor(setor).find((c: { id: string }) => c.id === cargoId) : null;
    if (!cargo) continue;
    for (const t of tarefasDaAgenda(cargo.atividades, hoje)) {
      tarefas.push({ setor_id: setorId, titulo: t.titulo, papel: cargo.nome.slice(0, 80), prazo: t.prazo, origem: "agenda", responsavel: m.user_id, chave: chaveDaAgenda(m.user_id, `${setorId}.${cargoId}`, t) });
    }
  }
  if (tarefas.length) await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(tarefas) });
  const agoraIso = new Date(agora).toISOString();
  const vencidas = await servico(`/rest/v1/tarefas?origem=eq.agenda&estado=eq.aberta&prazo=lt.${hoje}&select=id&limit=2000`);
  if (vencidas.length) {
    await servico(`/rest/v1/tarefas?id=in.(${vencidas.map((x: { id: string }) => x.id).join(",")})`, { method: "PATCH", body: JSON.stringify({ estado: "cancelada", concluida_em: agoraIso }) });
  }
  return { membros: membros.length, geradas: tarefas.length, encerradas: vencidas.length };
}
