// PERGUNTAS AOS DIRETORES na funcao "api" (IA pela assinatura, sem API paga).
//   GET  /diretores/perguntas?estado=&setor=      fila e historico (com respostas)
//   POST /diretores/perguntas                     {setor_id, pergunta, contexto?}
//   POST /diretores/perguntas/:id/cancelar
//   POST /diretores/perguntas/:id/responder       {resposta, procedimento?, fontes?, motor}  (so direcao: sessao do Claude Code)
// Resposta de IA e opiniao rotulada: nunca decisao, nunca envio a cliente.
import { HttpError, lerCorpo, type Membro, servico } from "../_shared/banco.ts";
import { acessiveis, podeVer } from "./setores.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function rotearDiretores(req: Request, partes: string[], eu: Membro) {
  const [, a, b, c] = partes;
  if (a !== "perguntas") throw new HttpError(404, "rota inexistente");
  const post = req.method === "POST";
  const corpo = post ? ((await lerCorpo(req)) ?? {}) : {};
  if (post && !CHAVE_RE.test(req.headers.get("Idempotency-Key") ?? "")) throw new HttpError(400, "Idempotency-Key obrigatorio");
  const q = new URL(req.url).searchParams;

  if (!post && !b) {
    const est = ["pendente", "respondida", "cancelada"].includes(q.get("estado") ?? "") ? `&estado=eq.${q.get("estado")}` : "";
    const setor = /^[a-z]{3,12}$/.test(q.get("setor") ?? "") ? `&setor_id=eq.${q.get("setor")}` : "";
    const visivel = eu.papel === "direcao" ? "" : `&or=(autor.eq.${eu.user_id},setor_id.in.(${acessiveis(eu).join(",")}))`;
    const [perguntas, membros] = await Promise.all([
      servico(`/rest/v1/perguntas_diretores?select=*,respostas:respostas_diretores(id,resposta,procedimento,fontes,motor,em)${est}${setor}${visivel}&order=criada_em.desc&limit=200`),
      servico("/rest/v1/membros?select=user_id,nome"),
    ]);
    const nome = new Map(membros.map((m: { user_id: string; nome: string }) => [m.user_id, m.nome]));
    return { perguntas: perguntas.map((p: Record<string, any>) => ({ ...p, autor_nome: nome.get(p.autor) ?? "—", respostas: (p.respostas ?? []).sort((x: { id: number }, y: { id: number }) => x.id - y.id) })) };
  }
  if (post && !b) {
    const setor = txt(corpo.setor_id, 20);
    if (!setor || !podeVer(eu, setor)) throw new HttpError(403, "setor inválido ou fora do seu acesso");
    const pergunta = txt(corpo.pergunta, 4000);
    if (!pergunta || pergunta.length < 5) throw new HttpError(400, "escreva a pergunta");
    const [p] = await servico("/rest/v1/perguntas_diretores", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ setor_id: setor, pergunta, contexto: txt(corpo.contexto, 200), autor: eu.user_id }) });
    return { id: p.id, estado: p.estado };
  }
  if (post && b && UUID_RE.test(b)) {
    const [p] = await servico(`/rest/v1/perguntas_diretores?id=eq.${b}&select=id,autor,estado,setor_id`);
    if (!p) throw new HttpError(404, "pergunta inexistente");
    if (c === "cancelar") {
      if (p.autor !== eu.user_id && eu.papel !== "direcao") throw new HttpError(403, "só quem perguntou ou a direção cancela");
      if (p.estado !== "pendente") throw new HttpError(400, "só pergunta pendente pode ser cancelada");
      await servico(`/rest/v1/perguntas_diretores?id=eq.${b}`, { method: "PATCH", body: JSON.stringify({ estado: "cancelada" }) });
      return { ok: true };
    }
    if (c === "responder") {
      if (eu.papel !== "direcao") throw new HttpError(403, "respostas de IA são gravadas pela sessão da direção no Claude Code");
      const resposta = txt(corpo.resposta, 20000);
      const motor = txt(corpo.motor, 80);
      if (!resposta || resposta.length < 10) throw new HttpError(400, "resposta vazia");
      if (!motor) throw new HttpError(400, "informe o motor da IA (ex.: Claude via Claude Code)");
      const fontes = Array.isArray(corpo.fontes) ? corpo.fontes.slice(0, 20).map((f: Record<string, unknown>) => ({ titulo: txt(f?.titulo, 200), url: /^https?:\/\//.test(String(f?.url ?? "")) ? String(f.url).slice(0, 400) : null, natureza: txt(f?.natureza, 30) })) : [];
      return await servico("/rest/v1/rpc/pergunta_responder", { method: "POST", body: JSON.stringify({ p: { pergunta_id: b, resposta, procedimento: txt(corpo.procedimento, 300), fontes, motor, usuario: eu.user_id } }) });
    }
  }
  throw new HttpError(404, "rota inexistente");
}
