// Regras PURAS da saude do proprio VEOS (CIO): olham os registros que o sistema ja grava sobre si mesmo
// (execucoes da IA, perguntas paradas, sincronizacao do Zoho) e devolvem os alertas que devem existir.
export type Sev = "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
export type AlertaSaude = { chave: string; severidade: Sev; titulo: string; mensagem: string; tarefa: string };
export type DadosSaude = {
  agora: number;
  iaExecucoes: { ok: boolean; provedor: string; em: string }[]; // ultimas 24 h
  perguntasPendentes: { id: string; criada_em: string }[];
  zohoSync: { produto: string; modulo: string; estado: string; erro: string | null; ultima_execucao_em: string | null }[];
};

const MIN = 60_000;

export function avaliarSaude(d: DadosSaude): AlertaSaude[] {
  const out: AlertaSaude[] = [];
  const n = d.iaExecucoes.length;
  const falhas = d.iaExecucoes.filter((x) => !x.ok);
  if (n >= 6 && falhas.length / n >= 0.5) {
    const porProv = new Map<string, number>();
    for (const f of falhas) porProv.set(f.provedor, (porProv.get(f.provedor) ?? 0) + 1);
    const lista = [...porProv].sort((a, b) => b[1] - a[1]).map(([p, q]) => `${p} (${q})`).join(", ");
    out.push({ chave: "SAUDE_IA_FALHANDO", severidade: "ALTO", titulo: `IA dos diretores falhou em ${falhas.length} de ${n} tentativas nas últimas 24 h`,
      mensagem: `Provedores com falha: ${lista}. Provável cota gratuita esgotada ou chave inválida. O motor passa ao próximo provedor, mas as respostas podem atrasar. Confira os segredos de IA no Supabase (sem cadastrar cartão: regra de custo zero).`,
      tarefa: "Conferir as chaves e a cota dos provedores de IA" });
  }
  const paradas = d.perguntasPendentes.filter((p) => d.agora - Date.parse(p.criada_em) > 30 * MIN);
  if (paradas.length) {
    out.push({ chave: "SAUDE_PERGUNTAS_PARADAS", severidade: "MEDIO", titulo: `${paradas.length} pergunta(s) aos diretores sem resposta há mais de 30 minutos`,
      mensagem: "O motor de IA roda a cada 5 minutos. Pergunta parada indica que nenhum provedor respondeu. Abra Perguntar aos diretores e use \"Tentar de novo\" ou cancele.",
      tarefa: "Rever as perguntas paradas aos diretores" });
  }
  const comErro = d.zohoSync.filter((z) => z.estado === "erro");
  if (comErro.length) {
    out.push({ chave: "SAUDE_ZOHO_SYNC_ERRO", severidade: "ALTO", titulo: `Sincronização do Zoho com erro em ${comErro.length} módulo(s)`,
      mensagem: `Módulos: ${comErro.map((z) => `${z.produto}/${z.modulo}${z.erro ? ` (${z.erro.slice(0, 80)})` : ""}`).join("; ")}. Os dados do Zoho no VEOS podem estar desatualizados. Se o erro for de autorização, reautorize o Zoho em Sistema.`,
      tarefa: "Resolver o erro de sincronização do Zoho" });
  }
  const execs = d.zohoSync.map((z) => (z.ultima_execucao_em ? Date.parse(z.ultima_execucao_em) : 0));
  if (execs.length && d.agora - Math.max(...execs) > 60 * MIN) {
    out.push({ chave: "SAUDE_ZOHO_SYNC_PARADA", severidade: "MEDIO", titulo: "Sincronização do Zoho sem rodar há mais de 1 hora",
      mensagem: "A função zoho-sync deveria rodar a cada 2 minutos. Verifique o agendamento no Supabase e a conexão com o Zoho.",
      tarefa: "Verificar o agendamento da sincronização do Zoho" });
  }
  return out;
}
