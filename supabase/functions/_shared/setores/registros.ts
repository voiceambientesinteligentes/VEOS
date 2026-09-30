// Validacao de registros dos setores contra o catalogo (tipos de campo, obrigatorios,
// estados, papeis). O servidor e a autoridade: o navegador so ajuda no preenchimento.
import type { Campo, Setor, TipoRegistro } from "./motor.ts";

export class RegistroInvalido extends Error {}

const MONEY_RE = /^\d{1,13}(\.\d{1,2})?$/;
const NUM_RE = /^-?\d{1,13}(\.\d{1,6})?$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const FONE_RE = /^[+\d ()-]{8,20}$/;
const LIMITE = { texto: 500, texto_longo: 5000 };

type Obj = Record<string, unknown>;
const vazio = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

function dataValida(v: unknown) {
  return typeof v === "string" && DATA_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

function campo(c: Campo, v: unknown, ctx: string): unknown {
  const erro = (m: string) => new RegistroInvalido(`${ctx}: ${m}`);
  switch (c.tipo) {
    case "texto":
    case "texto_longo": {
      if (typeof v !== "string") throw erro("texto esperado");
      const max = LIMITE[c.tipo as "texto" | "texto_longo"];
      if ([...v].length > max) throw erro(`no máximo ${max} caracteres`);
      return v.trim();
    }
    case "dinheiro":
      if (typeof v !== "string" || !MONEY_RE.test(v)) throw erro("valor em reais no formato 1234.56");
      return v;
    case "numero":
      if (!(typeof v === "number" && Number.isFinite(v)) && !(typeof v === "string" && NUM_RE.test(v))) throw erro("número inválido");
      return String(v);
    case "data":
      if (!dataValida(v)) throw erro("data inválida (AAAA-MM-DD)");
      return v;
    case "opcao":
      if (typeof v !== "string" || !(c.opcoes ?? []).includes(v)) throw erro(`escolha uma das opções: ${(c.opcoes ?? []).join(", ")}`);
      return v;
    case "email":
      if (typeof v !== "string" || !EMAIL_RE.test(v.trim())) throw erro("e-mail inválido");
      return v.trim().toLowerCase();
    case "telefone":
      if (typeof v !== "string" || !FONE_RE.test(v.trim())) throw erro("telefone inválido");
      return v.trim();
    case "sim_nao":
      if (typeof v !== "boolean") throw erro("sim ou não");
      return v;
  }
  throw erro(`tipo de campo desconhecido ${c.tipo}`);
}

export function tipoDoSetor(setor: Setor, tipo: unknown): TipoRegistro {
  const t = setor.registros.find((r) => r.tipo === tipo);
  if (!t) throw new RegistroInvalido(`tipo de registro inexistente no setor ${setor.nome}: ${String(tipo)}`);
  return t;
}

/**
 * Normaliza uma criacao (existente = null) ou alteracao parcial de registro.
 * Retorna somente os campos que mudam: {titulo?, estado?, responsavel?, prazo?, valor?, dados?}.
 */
export function validarRegistro(setor: Setor, tipo: TipoRegistro, entrada: Obj, existente: Obj | null) {
  const criando = existente === null;
  const out: Obj = {};
  const permitidos = ["titulo", "estado", "responsavel", "prazo", "valor", "dados"];
  const extras = Object.keys(entrada).filter((k) => !permitidos.includes(k) && !["setor", "tipo"].includes(k));
  if (extras.length) throw new RegistroInvalido(`campos desconhecidos: ${extras.join(", ")}`);

  if (criando || "titulo" in entrada) {
    if (typeof entrada.titulo !== "string" || !entrada.titulo.trim() || [...entrada.titulo].length > 200) throw new RegistroInvalido("título: obrigatório, até 200 caracteres");
    out.titulo = entrada.titulo.trim();
  }
  if (criando || "estado" in entrada) {
    const estado = entrada.estado ?? (criando ? tipo.estado_inicial : undefined);
    if (!tipo.estados.includes(String(estado))) throw new RegistroInvalido(`estado inválido; use: ${tipo.estados.join(", ")}`);
    out.estado = estado;
  }
  const papeis = [...setor.equipe.map((p) => p.papel), setor.sigla];
  if (criando || "responsavel" in entrada) {
    const r = vazio(entrada.responsavel) ? (criando ? tipo.responsavel ?? null : null) : entrada.responsavel;
    if (r !== null && !papeis.includes(String(r))) throw new RegistroInvalido(`responsável inválido; use: ${papeis.join(", ")}`);
    out.responsavel = r;
  }
  if ("prazo" in entrada) {
    if (!vazio(entrada.prazo) && !dataValida(entrada.prazo)) throw new RegistroInvalido("prazo: data inválida (AAAA-MM-DD)");
    out.prazo = vazio(entrada.prazo) ? null : entrada.prazo;
  }
  if ("valor" in entrada) {
    if (!vazio(entrada.valor) && !(typeof entrada.valor === "string" && MONEY_RE.test(entrada.valor))) throw new RegistroInvalido("valor: reais no formato 1234.56");
    out.valor = vazio(entrada.valor) ? null : entrada.valor;
  }

  const dadosAtuais = (existente?.dados as Obj) ?? {};
  const novos = (entrada.dados ?? {}) as Obj;
  if (typeof novos !== "object" || Array.isArray(novos)) throw new RegistroInvalido("dados: objeto esperado");
  const ids = new Set(tipo.campos.map((c) => c.id));
  const desconhecidos = Object.keys(novos).filter((k) => !ids.has(k));
  if (desconhecidos.length) throw new RegistroInvalido(`campos inexistentes em ${tipo.nome}: ${desconhecidos.join(", ")}`);
  const dados: Obj = { ...dadosAtuais };
  for (const c of tipo.campos) {
    if (!(c.id in novos)) continue;
    const v = novos[c.id];
    if (vazio(v)) delete dados[c.id];
    else dados[c.id] = campo(c, v, c.rotulo || c.id);
  }
  for (const c of tipo.campos) if (c.obrigatorio && vazio(dados[c.id])) throw new RegistroInvalido(`${c.rotulo || c.id}: obrigatório`);
  if (criando || "dados" in entrada) out.dados = dados;
  return out;
}
