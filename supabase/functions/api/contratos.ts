// Contratos de suporte / receita recorrente (dentro de /fluxo). Regras no banco (contrato_*); aqui: permissao e validacao.
//   GET  /fluxo/contratos-suporte[?estado=]                            contratos + cobrancas + indicadores (MRR)
//   GET  /fluxo/contratos-suporte/:id                                  contrato, cobrancas e historico
//   POST /fluxo/contratos-suporte                                      {cliente_id?, cliente_nome, descricao, valor_mensal, dia_vencimento?, inicio, fim?, observacao?}
//   POST /fluxo/contratos-suporte/:id                                  {descricao?, valor_mensal?, dia_vencimento?, fim?, observacao?, estado?, motivo?}
//   POST /fluxo/contratos-suporte/:id/cobrancas/:cid/receber           {data, valor}
import { HttpError, type Membro, servico } from "../_shared/banco.ts";
import { indicadoresRecorrencia, normalizarContrato } from "../_shared/dominio/contratos.js";
import { ehTeste, filtroAutor, idsTeste } from "../_shared/teste.ts";

const VER = ["direcao", "financas", "posvenda", "vendas"];
const EDITAR = ["direcao", "financas", "posvenda"];
const RECEBER = ["direcao", "financas"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONEY_RE = /^\d{1,12}(\.\d{1,2})?$/;
const COLS = "id,codigo,cliente_id,cliente_nome,descricao,valor_mensal,dia_vencimento,inicio,fim,estado,observacao,criado_por,criado_em,atualizado_em";
const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });
const exigir = (eu: Membro, papeis: string[]) => { if (!papeis.includes(eu.papel)) throw new HttpError(403, "seu perfil não pode fazer esta operação"); };
const hojeSP = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

async function contratoVisivel(eu: Membro, id: string) {
  if (!UUID_RE.test(id)) throw new HttpError(404, "contrato inexistente");
  const [c] = await servico(`/rest/v1/contratos_suporte?id=eq.${id}&select=${COLS}`);
  // o proprio autor sempre enxerga o que criou (o cache de robos de teste pode estar velho num usuario recem-criado)
  if (!c || (c.criado_por !== eu.user_id && (await idsTeste()).includes(c.criado_por) !== ehTeste(eu))) throw new HttpError(404, "contrato inexistente");
  return c;
}

export async function rotearContratos(req: Request, partes: string[], eu: Membro, corpo: Record<string, unknown>, chave: string) {
  const [, , b, c, d, e] = partes; // fluxo/contratos-suporte/:id/cobrancas/:cid/receber
  const post = req.method === "POST";
  const q = new URL(req.url).searchParams;

  if (!post && !b) {
    exigir(eu, VER);
    const estado = ["ativo", "suspenso", "encerrado"].includes(q.get("estado") ?? "") ? `&estado=eq.${q.get("estado")}` : "";
    const contratos = await servico(`/rest/v1/contratos_suporte?select=${COLS}${estado}${await filtroAutor(eu)}&order=cliente_nome&limit=500`);
    const ids = contratos.map((x: { id: string }) => x.id);
    const cobrancas = ids.length ? await servico(`/rest/v1/contrato_cobrancas?contrato_id=in.(${ids.join(",")})&estado=in.(aberta,recebida)&vencimento=gte.${new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10)}&select=id,contrato_id,competencia,vencimento,valor,estado,recebido_em,valor_recebido&order=vencimento&limit=5000`) : [];
    const lista = contratos.map(({ criado_por: _c, ...x }: Record<string, unknown>) => x);
    return { contratos: lista, cobrancas, indicadores: indicadoresRecorrencia(lista, cobrancas, hojeSP()) };
  }
  if (!post && b) {
    exigir(eu, VER);
    const ct = await contratoVisivel(eu, b);
    const [cobrancas, historico] = await Promise.all([
      servico(`/rest/v1/contrato_cobrancas?contrato_id=eq.${b}&select=id,competencia,vencimento,valor,estado,recebido_em,valor_recebido&order=competencia&limit=200`),
      servico(`/rest/v1/contratos_suporte_historico?contrato_id=eq.${b}&select=acao,detalhe,em&order=id.desc&limit=50`),
    ]);
    const { criado_por: _c, ...contrato } = ct;
    return { contrato, cobrancas, historico };
  }
  if (post && !b) {
    exigir(eu, EDITAR);
    const { dados, erros } = normalizarContrato(corpo);
    if (erros.length) throw new HttpError(400, erros.join(" "));
    return await rpc("contrato_suporte_salvar", { p: { chave: `${eu.user_id}:${chave}`, usuario: eu.user_id, dados } });
  }
  if (post && b && !c) {
    exigir(eu, EDITAR);
    await contratoVisivel(eu, b);
    const { dados, erros } = normalizarContrato(corpo, { parcial: true });
    if (erros.length) throw new HttpError(400, erros.join(" "));
    if (!Object.keys(dados).length) throw new HttpError(400, "nada para alterar");
    return await rpc("contrato_suporte_salvar", { p: { id: b, usuario: eu.user_id, dados, motivo: typeof corpo.motivo === "string" ? corpo.motivo.slice(0, 500) : null } });
  }
  if (post && b && c === "cobrancas" && d && e === "receber") {
    exigir(eu, RECEBER);
    await contratoVisivel(eu, b);
    if (!UUID_RE.test(d)) throw new HttpError(400, "cobrança inválida");
    if (!DATA_RE.test(String(corpo.data))) throw new HttpError(400, "data do recebimento inválida");
    if (!MONEY_RE.test(String(corpo.valor)) || Number(corpo.valor) <= 0) throw new HttpError(400, "valor recebido inválido");
    const [cb] = await servico(`/rest/v1/contrato_cobrancas?id=eq.${d}&contrato_id=eq.${b}&select=id`);
    if (!cb) throw new HttpError(404, "cobrança inexistente neste contrato");
    return await rpc("contrato_cobranca_receber", { p: { cobranca: d, data: corpo.data, valor: corpo.valor, usuario: eu.user_id } });
  }
  throw new HttpError(404, "rota inexistente");
}
