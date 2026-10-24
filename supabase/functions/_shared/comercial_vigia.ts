// Vigia das CADENCIAS de follow-up do setor Comercial: para cada registro real (lead, proposta,
// parceiro, oportunidade) que esta no estado que inicia uma cadencia, cria no dia de cada toque uma
// TAREFA para o papel responsavel e, quando ha texto, um RASCUNHO na Caixa de saida. Quem envia e
// sempre uma pessoa. Quando o registro sai do estado, os toques pendentes sao cancelados e os
// rascunhos descartados. Contato na lista de bloqueio nao recebe rascunho.
// deno-lint-ignore-file no-explicit-any
import { servico } from "./banco.ts";
import { CATALOGO } from "./setores/catalogo.ts";
import { agendaCadencia, CADENCIAS, cadenciaDoRegistro, preencher } from "./dominio/comercial.js";

const DIA = 86_400_000;
const ATRASO_MAX = 7; // toque com mais de 7 dias de atraso nao e gerado (evita enxurrada ao ligar)
const so = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
const fone = (v: unknown) => String(v ?? "").replace(/\D/g, "");

function modeloTexto(id: string) {
  const s = (CATALOGO as unknown as { id: string; modelos: { id: string; assunto?: string; corpo: string }[] }[]).find((x) => x.id === "vendas");
  return s?.modelos.find((m) => m.id === id) ?? null;
}

/** Nome, empresa e destinos de um registro, conforme o tipo. */
export function contatoDoRegistro(r: { tipo: string; titulo: string; dados: Record<string, any> }) {
  const d = r.dados ?? {};
  const nome = so(d.nome_contato) || so(d.contato) || so(d.cliente_nome) || r.titulo;
  return { nome, empresa: so(d.escritorio) || so(d.empresa) || so(d.cliente_nome), email: so(d.email).toLowerCase(), telefone: fone(d.telefone) };
}

export async function vigiarCadencias(agora = Date.now(), registroId: string | null = null) {
  const hoje = new Date(agora).toISOString().slice(0, 10);
  const limite = new Date(agora - ATRASO_MAX * DIA).toISOString().slice(0, 10);
  const [candidatos, bloqueio, abertas]: any[][] = await Promise.all([
    servico("/rest/v1/rpc/cadencia_candidatos", { method: "POST", body: "{}" }),
    servico("/rest/v1/contatos_bloqueio?select=contato&limit=10000"),
    servico("/rest/v1/tarefas?origem=like.cadencia:*&estado=eq.aberta&select=id,registro_id,origem,chave&limit=5000"),
  ]);
  const bloqueados = new Set(bloqueio.map((b) => b.contato));
  const tarefas: unknown[] = [], mensagens: unknown[] = [];
  const ativas = new Map<string, string>(); // registro -> cadencia em curso
  for (const r of candidatos) {
    if (registroId && r.id !== registroId) continue;
    const cad = cadenciaDoRegistro(r);
    if (!cad) continue;
    ativas.set(r.id, cad.id);
    const c = contatoDoRegistro(r);
    const vars = { nome: c.nome, empresa: c.empresa || c.nome, vendedor: r.autor || "Equipe VOICE", cliente_nome: c.nome };
    for (const p of agendaCadencia(cad, r.desde) as any[]) {
      if (p.data > hoje || p.data < limite) continue;
      const chave = `CAD:${r.id}:${cad.id}:${p.ordem}`;
      tarefas.push({ setor_id: "vendas", titulo: `Toque ${p.ordem}/${cad.passos.length} (${p.canal}) · ${r.titulo}: ${p.acao}`.slice(0, 240), papel: cad.papel, prazo: p.data,
        origem: `cadencia:${cad.id}`, registro_id: r.id, chave, criado_por: r.criado_por });
      const modelo = p.modelo ? modeloTexto(p.modelo) : null;
      const corpo = p.texto ?? modelo?.corpo;
      const canal = p.canal === "email" ? "email" : p.canal === "whatsapp" ? "whatsapp" : null;
      if (!corpo || !canal) continue;
      const destino = canal === "email" ? c.email : c.telefone;
      if (destino && bloqueados.has(destino)) continue;
      mensagens.push({ chave, canal, destinatario: destino || null, assunto: canal === "email" ? preencher(p.assunto ?? modelo?.assunto ?? cad.nome, vars) : null,
        corpo: preencher(corpo, vars).slice(0, 5000), setor_id: "vendas", origem: `cadencia:${r.id}:${cad.id}`, estado: "rascunho", criado_por: r.criado_por });
    }
  }
  if (tarefas.length) await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(tarefas) });
  if (mensagens.length) await servico("/rest/v1/mensagens_saida?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(mensagens) });

  // registro que saiu do estado: cancela toques pendentes e descarta rascunhos daquela cadencia
  const encerrar = abertas.filter((t) => (!registroId || t.registro_id === registroId) && ativas.get(t.registro_id) !== t.origem.slice("cadencia:".length));
  const agoraIso = new Date(agora).toISOString();
  if (encerrar.length) {
    await servico(`/rest/v1/tarefas?id=in.(${encerrar.map((t) => t.id).join(",")})&estado=eq.aberta`, { method: "PATCH", body: JSON.stringify({ estado: "cancelada", concluida_em: agoraIso }) });
    const chaves = encerrar.map((t) => `"${t.chave}"`).join(",");
    await servico(`/rest/v1/mensagens_saida?chave=in.(${chaves})&estado=eq.rascunho`, { method: "PATCH", body: JSON.stringify({ estado: "descartada", motivo_descarte: "cadência encerrada: o registro mudou de etapa" }) });
  }
  return { registros_em_cadencia: ativas.size, toques_gerados: tarefas.length, rascunhos: mensagens.length, encerrados: encerrar.length, cadencias: CADENCIAS.length };
}
