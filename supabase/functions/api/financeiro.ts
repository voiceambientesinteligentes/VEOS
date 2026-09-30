// Setor Financeiro (CFO) na funcao "api": projetos, fases, recebimentos, compromissos
// e cenario de compra proposta. Cada gravacao devolve a reavaliacao do caixa (vigia).
// Acesso: papeis direcao e financas. Somente ambiente TESTE.
import { avaliarCaixaProjeto } from "../_shared/regras/caixa.ts";
import { centavos, centavosOuNulo, RegraError } from "../_shared/regras/dinheiro.ts";
import { HttpError, lerCorpo, type Membro, servico } from "./comum.ts";

const PAPEIS = ["direcao", "financas"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COD_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;

const SELECAO =
  "id,codigo,nome,cliente,valor_contrato::text,status,criado_em," +
  "fases(id,codigo,nome,custos::text,encargos::text)," +
  "recebimentos(id,data,valor::text,fase_id,descricao,criado_em)," +
  "compromissos(id,descricao,contraparte,valor::text,pago::text,vencimento,criado_em)";

type Obj = Record<string, unknown>;

function texto(v: unknown, ctx: string, max: number, obrigatorio = true): string | null {
  if (v === null || v === undefined || v === "") {
    if (obrigatorio) throw new RegraError(`${ctx}: obrigatorio`);
    return null;
  }
  if (typeof v !== "string" || [...v].length > max) throw new RegraError(`${ctx}: texto de ate ${max} caracteres`);
  return v.trim();
}

function data(v: unknown, ctx: string, obrigatorio = true): string | null {
  if (v === null || v === undefined || v === "") {
    if (obrigatorio) throw new RegraError(`${ctx}: obrigatoria (AAAA-MM-DD)`);
    return null;
  }
  if (typeof v !== "string" || !DATA_RE.test(v) || Number.isNaN(Date.parse(v))) throw new RegraError(`${ctx}: data invalida (AAAA-MM-DD)`);
  return v;
}

/** Converte o registro do banco na entrada das regras de caixa. */
export function paraRegras(p: Obj, compra?: Obj) {
  const fases = (p.fases as Obj[]) ?? [];
  const codigoDaFase = Object.fromEntries(fases.map((f) => [f.id, f.codigo]));
  return {
    codigo: p.codigo,
    valor_contrato: p.valor_contrato ?? null,
    fases: fases.map((f) => ({ id: f.codigo, nome: f.nome, custos: f.custos, encargos: f.encargos })),
    recebimentos: ((p.recebimentos as Obj[]) ?? []).map((r) => ({ valor: r.valor, fase: r.fase_id ? codigoDaFase[r.fase_id as string] : null })),
    compromissos: ((p.compromissos as Obj[]) ?? []).map((c) => ({ valor: c.valor })),
    ...(compra ? { compra_proposta: compra } : {}),
  };
}

async function carregar(id: string) {
  if (!UUID_RE.test(id)) throw new HttpError(404, "projeto inexistente");
  const rows = await servico(`/rest/v1/projetos?id=eq.${id}&ambiente=eq.TESTE&select=${SELECAO}`);
  if (!rows?.length) throw new HttpError(404, "projeto inexistente");
  return rows[0] as Obj;
}

async function registrar(eu: Membro, req: Request, tipo: string, projetoId: string | null, dados: Obj) {
  const chave = req.headers.get("Idempotency-Key") ?? "";
  if (!CHAVE_RE.test(chave)) throw new HttpError(400, "Idempotency-Key obrigatorio (16-64 caracteres)");
  return await servico("/rest/v1/rpc/registrar_financeiro", {
    method: "POST",
    body: JSON.stringify({ p: { chave: `${eu.user_id}:${chave}`, usuario_id: eu.user_id, tipo, projeto_id: projetoId, dados } }),
  });
}

export async function rotearFinanceiro(req: Request, partes: string[], eu: Membro) {
  if (!PAPEIS.includes(eu.papel)) throw new HttpError(403, "acesso restrito a Direção e Finanças");
  const [, id, sub] = partes;

  // GET /projetos -> lista com avaliacao de caixa
  if (req.method === "GET" && !id) {
    const rows: Obj[] = await servico(`/rest/v1/projetos?ambiente=eq.TESTE&select=${SELECAO}&order=criado_em.desc&limit=50`);
    return {
      projetos: rows.map((p) => {
        const a = avaliarCaixaProjeto(paraRegras(p));
        return { id: p.id, codigo: p.codigo, nome: p.nome, cliente: p.cliente, status: p.status, situacao: a.situacao, resumo: a.resumo, avisos: a.avisos.length };
      }),
    };
  }
  // POST /projetos -> novo projeto TESTE
  if (req.method === "POST" && !id) {
    const b = (await lerCorpo(req)) as Obj;
    const codigo = texto(b.codigo, "codigo", 64)!;
    if (!COD_RE.test(codigo) || !codigo.includes("TESTE")) throw new RegraError("codigo: use letras/números e inclua 'TESTE' (ex.: PRJ-TESTE-001)");
    const vc = centavosOuNulo(b.valor_contrato === "" ? null : b.valor_contrato, "valor_contrato");
    if (vc !== null && vc <= 0n) throw new RegraError("valor_contrato: deve ser maior que zero (ou vazio se ainda não definido)");
    const reg = await registrar(eu, req, "projeto", null, {
      codigo, nome: texto(b.nome, "nome", 160), cliente: texto(b.cliente, "cliente", 160, false), valor_contrato: b.valor_contrato || null,
    });
    const p = await carregar(reg.id);
    return { ...reg, projeto: p, avaliacao: avaliarCaixaProjeto(paraRegras(p)) };
  }

  const p = await carregar(id);
  // GET /projetos/:id -> detalhe + avaliacao
  if (req.method === "GET" && !sub) return { projeto: p, avaliacao: avaliarCaixaProjeto(paraRegras(p)) };

  if (req.method === "POST" && sub === "compra-proposta") {
    // cenario: nada e gravado nem aprovado
    const b = (await lerCorpo(req)) as Obj;
    centavos(b.valor, "valor", true);
    const compra = { valor: b.valor, fase: b.fase || null, descricao: texto(b.descricao, "descricao", 200, false) ?? "compra proposta" };
    return { projeto: { id: p.id, codigo: p.codigo, nome: p.nome }, avaliacao: avaliarCaixaProjeto(paraRegras(p, compra)) };
  }

  let tipo: string, dados: Obj;
  const b = (await lerCorpo(req)) as Obj;
  if (req.method === "POST" && sub === "fases") {
    const codigo = texto(b.codigo, "codigo", 64)!;
    if (!COD_RE.test(codigo)) throw new RegraError("codigo da fase: letras, números, '.', '_' ou '-'");
    centavos(b.custos, "custos");
    centavos(b.encargos, "encargos");
    tipo = "fase";
    dados = { codigo, nome: texto(b.nome, "nome", 120), custos: b.custos, encargos: b.encargos };
  } else if (req.method === "POST" && sub === "recebimentos") {
    centavos(b.valor, "valor", true);
    tipo = "recebimento";
    dados = { valor: b.valor, data: data(b.data, "data"), fase_codigo: texto(b.fase_codigo, "fase_codigo", 64, false), descricao: texto(b.descricao, "descricao", 200, false) };
  } else if (req.method === "POST" && sub === "compromissos") {
    const valor = centavos(b.valor, "valor", true);
    const pago = b.pago === undefined || b.pago === null || b.pago === "" ? 0n : centavos(b.pago, "pago");
    if (pago > valor) throw new RegraError("pago: não pode passar do valor do compromisso");
    tipo = "compromisso";
    dados = { descricao: texto(b.descricao, "descricao", 200), contraparte: texto(b.contraparte, "contraparte", 160, false), valor: b.valor, pago: b.pago || "0", vencimento: data(b.vencimento, "vencimento", false) };
  } else {
    throw new HttpError(404, "rota inexistente");
  }
  const reg = await registrar(eu, req, tipo, p.id as string, dados);
  const atualizado = await carregar(p.id as string);
  return { ...reg, projeto: atualizado, avaliacao: avaliarCaixaProjeto(paraRegras(atualizado)) };
}
