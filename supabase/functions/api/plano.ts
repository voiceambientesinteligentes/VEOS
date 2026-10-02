// PLANO DA VOICE na funcao "api": metas, acoes, rotinas e regras propostas pelos diretores e decididas
// pelo fundador. Itens nascem "proposto"; so a direcao aprova, cancela ou cria. Quem e do setor do item
// marca andamento/feito e registra notas. Todo movimento fica em plano_historico.
//   GET  /plano                       itens (com historico recente)
//   POST /plano/itens                 {area, fase, tipo, titulo, descricao, responsavel?, indicador?, alvo?, prazo?}  (direcao)
//   POST /plano/itens/:id             {estado?, campos?, nota?}
import { HttpError, lerCorpo, type Membro, servico } from "../_shared/banco.ts";
import { acessiveis, podeVer } from "./setores.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const FASES = ["0-30", "30-90", "90-180", "180-365"];
const TIPOS = ["meta", "acao", "rotina", "regra", "decisao"];
const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function rotearPlano(req: Request, partes: string[], eu: Membro) {
  const [, a, b] = partes;
  const post = req.method === "POST";
  if (post && !CHAVE_RE.test(req.headers.get("Idempotency-Key") ?? "")) throw new HttpError(400, "Idempotency-Key obrigatorio");
  const direcao = eu.papel === "direcao";

  if (!post && !a) {
    const areas = acessiveis(eu).join(",");
    const [itens, membros] = await Promise.all([
      servico(`/rest/v1/plano_itens?area=in.(${areas})&select=*,historico:plano_historico(acao,de,para,nota,usuario,em)&order=fase,ordem,codigo&limit=500`),
      servico("/rest/v1/membros?select=user_id,nome"),
    ]);
    const nome = new Map(membros.map((m: { user_id: string; nome: string }) => [m.user_id, m.nome]));
    return {
      pode: { aprovar: direcao, criar: direcao },
      itens: itens.map((i: Record<string, any>) => ({
        ...i,
        historico: (i.historico ?? []).sort((x: { em: string }, y: { em: string }) => y.em.localeCompare(x.em)).slice(0, 20).map((h: Record<string, unknown>) => ({ ...h, quem: nome.get(h.usuario as string) ?? "—", usuario: undefined })),
      })),
    };
  }
  const corpo = post ? ((await lerCorpo(req)) ?? {}) : {};
  if (post && a === "itens" && !b) {
    if (!direcao) throw new HttpError(403, "só a direção cria itens do plano");
    const area = txt(corpo.area, 20);
    if (!area || !podeVer(eu, area)) throw new HttpError(400, "área inválida");
    if (!FASES.includes(corpo.fase)) throw new HttpError(400, "fase inválida");
    if (!TIPOS.includes(corpo.tipo)) throw new HttpError(400, "tipo inválido");
    const titulo = txt(corpo.titulo, 200), descricao = txt(corpo.descricao, 6000);
    if (!titulo || titulo.length < 3 || !descricao) throw new HttpError(400, "título e descrição são obrigatórios");
    const prazo = txt(corpo.prazo, 10);
    if (prazo && !DATA_RE.test(prazo)) throw new HttpError(400, "prazo inválido");
    const [r] = await servico("/rest/v1/plano_itens", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ area, fase: corpo.fase, tipo: corpo.tipo, titulo, descricao, responsavel: txt(corpo.responsavel, 120), indicador: txt(corpo.indicador, 300), alvo: txt(corpo.alvo, 300), prazo, origem: `Direção (${eu.nome})`, criado_por: eu.user_id }) });
    await servico("/rest/v1/plano_historico", { method: "POST", body: JSON.stringify({ item_id: r.id, acao: "criado", para: { estado: r.estado }, usuario: eu.user_id }) });
    return { id: r.id, codigo: r.codigo };
  }
  if (post && a === "itens" && b && UUID_RE.test(b)) {
    const [i] = await servico(`/rest/v1/plano_itens?id=eq.${b}&select=id,area,estado`);
    if (!i) throw new HttpError(404, "item inexistente");
    if (!podeVer(eu, i.area)) throw new HttpError(403, "item fora do seu acesso");
    const estado = txt(corpo.estado, 20);
    if (estado && ["aprovado", "cancelado"].includes(estado) && !direcao) throw new HttpError(403, "só a direção aprova ou cancela itens do plano");
    const campos = corpo.campos && typeof corpo.campos === "object" ? corpo.campos : undefined;
    if (campos && !direcao) throw new HttpError(403, "só a direção edita itens do plano");
    if (campos?.prazo && !DATA_RE.test(String(campos.prazo))) throw new HttpError(400, "prazo inválido");
    // regras de transicao e campos editaveis ficam no banco (plano_mudar): violacao vira 400 com a mensagem
    return await servico("/rest/v1/rpc/plano_mudar", { method: "POST", body: JSON.stringify({ p: { item_id: b, estado, campos, nota: txt(corpo.nota, 2000), usuario: eu.user_id } }) });
  }
  throw new HttpError(404, "rota inexistente");
}
