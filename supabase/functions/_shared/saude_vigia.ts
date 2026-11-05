// Vigia da SAUDE do proprio VEOS (setor Tecnologia, alertas SAUDE_*): o sistema olha para si mesmo e avisa o CIO.
import { servico } from "./banco.ts";
import { sincronizarAlertas } from "./fluxo_vigia.ts";
import { avaliarSaude } from "./saude_regras.ts";

const FONTE = "Registros internos do VEOS (execuções da IA, perguntas aos diretores, sincronização do Zoho)";

export async function vigiarSaude(agora = Date.now()) {
  const desde = new Date(agora - 24 * 3600_000).toISOString();
  const [iaExecucoes, perguntasPendentes, zohoSync] = await Promise.all([
    servico(`/rest/v1/ia_execucoes?em=gte.${desde}&select=ok,provedor,em&limit=2000`),
    servico("/rest/v1/perguntas_diretores?estado=eq.pendente&select=id,criada_em&limit=200"),
    servico("/rest/v1/zoho_sync?select=produto,modulo,estado,erro,ultima_execucao_em&limit=100"),
  ]);
  const alertas = avaliarSaude({ agora, iaExecucoes, perguntasPendentes, zohoSync });
  const hoje = new Date(agora).toISOString().slice(0, 10);
  // deno-lint-ignore no-explicit-any
  const alvos = new Map<string, any>();
  for (const a of alertas) {
    alvos.set(a.chave, { chave: a.chave, setor: "tecnologia", sentinela: a.chave, severidade: a.severidade, titulo: a.titulo, mensagem: a.mensagem, fonte: FONTE, notificar: ["CIO"], rascunhos: [],
      tarefas: [{ titulo: a.tarefa, papel: "CIO", prazo: hoje }] });
  }
  return sincronizarAlertas("SAUDE_", alvos, agora);
}
