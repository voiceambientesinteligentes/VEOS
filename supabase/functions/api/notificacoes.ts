// NOTIFICACOES na funcao "api": caixa de saida (rascunhos que uma pessoa envia) e resumo do dia.
//   GET  /mensagens?estado=rascunho|enviada|descartada
//   POST /mensagens                       {canal, destinatario?, assunto?, corpo, setor_id?, origem?}
//   POST /mensagens/:id/(enviada|descartada)   {motivo?}
//   GET  /resumo                          resumo do dia dos setores que o perfil acessa
// O VEOS nao envia nada: "enviada" e a confirmacao de quem enviou pelo e-mail/WhatsApp.
import { HttpError, lerCorpo, type Membro, servico } from "../_shared/banco.ts";
import { acessiveis, podeVer } from "./setores.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });
const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function rotearNotificacoes(req: Request, partes: string[], eu: Membro) {
  const [raiz, id, acao] = partes;
  const post = req.method === "POST";
  const corpo = post ? ((await lerCorpo(req)) ?? {}) : {};
  const chave = req.headers.get("Idempotency-Key") ?? "";
  if (post && !CHAVE_RE.test(chave)) throw new HttpError(400, "Idempotency-Key obrigatorio");
  const setores = acessiveis(eu);
  // direcao ve tudo; os demais, as mensagens dos setores que acessam e as que criaram
  const visivel = eu.papel === "direcao" ? "" : `&or=(setor_id.in.(${setores.join(",")}),criado_por.eq.${eu.user_id})`;

  if (raiz === "resumo" && !post) {
    return { resumos: await Promise.all(setores.map((s) => rpc("resumo_setor", { p_setor: s }))) };
  }
  if (raiz === "mensagens" && !post && !id) {
    const est = ["rascunho", "enviada", "descartada"].includes(new URL(req.url).searchParams.get("estado") ?? "") ? new URL(req.url).searchParams.get("estado") : "rascunho";
    const [mensagens, membros] = await Promise.all([
      servico(`/rest/v1/mensagens_saida?estado=eq.${est}${visivel}&select=*&order=criado_em.desc&limit=300`),
      servico("/rest/v1/membros?select=user_id,nome"),
    ]);
    const nome = new Map(membros.map((m: { user_id: string; nome: string }) => [m.user_id, m.nome]));
    return { mensagens: mensagens.map((m: Record<string, string>) => ({ ...m, autor: nome.get(m.criado_por) ?? "—", enviada_por_nome: m.enviada_por ? nome.get(m.enviada_por) ?? "—" : null })) };
  }
  if (raiz === "mensagens" && post && !id) {
    if (!["email", "whatsapp"].includes(String(corpo.canal))) throw new HttpError(400, "canal: email ou whatsapp");
    const texto = txt(corpo.corpo, 5000);
    if (!texto) throw new HttpError(400, "escreva a mensagem");
    const setor = txt(corpo.setor_id, 20);
    if (setor && !podeVer(eu, setor)) throw new HttpError(403, "setor fora do seu acesso");
    const origem = txt(corpo.origem, 120) ?? "manual";
    if (!/^(manual|(alerta|proposta|resumo|pedido):[^\s]{1,110})$/.test(origem)) throw new HttpError(400, "origem inválida");
    return await rpc("mensagem_criar", { p: { chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, canal: corpo.canal, destinatario: txt(corpo.destinatario, 200), assunto: txt(corpo.assunto, 300), corpo: texto, setor_id: setor, origem } });
  }
  if (raiz === "mensagens" && post && id && UUID_RE.test(id) && ["enviada", "descartada"].includes(acao)) {
    const [m] = await servico(`/rest/v1/mensagens_saida?id=eq.${id}${visivel}&select=id`);
    if (!m) throw new HttpError(404, "mensagem não encontrada");
    return await rpc("mensagem_marcar", { p_id: id, p_estado: acao, p_usuario: eu.user_id, p_motivo: txt(corpo.motivo, 500) });
  }
  throw new HttpError(404, "rota inexistente");
}
