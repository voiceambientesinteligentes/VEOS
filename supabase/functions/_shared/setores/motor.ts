// Motor das sentinelas (regras vivas) dos setores do VEOS.
// Le o catalogo (setores/*.json, formato em docs/SETORES_ESQUEMA.md) e os registros do
// setor e devolve alertas com as acoes resolvidas (tarefas, rascunhos, notificacoes).
// Puro e deterministico: recebe "hoje"; nao grava nada, nao envia nada.

export type Campo = { id: string; rotulo: string; tipo: string; opcoes?: string[]; obrigatorio?: boolean };
export type TipoRegistro = {
  tipo: string; nome: string; descricao?: string; responsavel?: string;
  estados: string[]; estado_inicial: string; estados_finais: string[]; campos: Campo[];
};
export type Filtro = { campo: string; igual?: unknown; em?: unknown[]; diferente?: unknown; nao_em?: unknown[] };
export type Gatilho = {
  tipo: "contagem" | "soma" | "parado" | "vencido" | "faltando";
  registro: string; filtros?: Filtro[]; janela_dias?: number; data_campo?: string;
  operador?: "<" | "<=" | ">" | ">=" | "=="; valor?: number; campo?: string; dias?: number; antecedencia_dias?: number;
};
export type Acao = { tipo: "tarefa" | "rascunho" | "notificar"; titulo?: string; papel?: string; prazo_dias?: number; modelo?: string; para?: string };
export type Sentinela = { id: string; titulo: string; severidade: string; status?: string; gatilho: Gatilho; mensagem: string; acoes?: Acao[]; fonte?: string };
export type Modelo = { id: string; tipo: string; assunto?: string; corpo: string };
export type Setor = {
  id: string; sigla: string; nome: string; missao?: string;
  diretor: Record<string, unknown>; equipe: { papel: string; nome: string }[];
  processos?: unknown[]; registros: TipoRegistro[]; rotinas?: unknown[]; indicadores?: unknown[];
  sentinelas: Sentinela[]; modelos?: Modelo[];
};
export type Registro = {
  id: string; tipo: string; titulo: string; estado: string; responsavel?: string | null;
  prazo?: string | null; valor?: string | number | null; criado_em: string; atualizado_em: string;
  dados?: Record<string, unknown>;
};
export type Alerta = {
  chave: string; setor: string; sentinela: string; severidade: string; titulo: string; mensagem: string;
  registro_id: string | null; fonte: string;
  tarefas: { titulo: string; papel: string | null; prazo: string }[];
  rascunhos: { modelo: string; tipo: string; assunto: string; corpo: string }[];
  notificar: string[];
};

export const SEVERIDADES = ["INFO", "MEDIO", "ALTO", "CRITICO"];
const GATILHOS = ["contagem", "soma", "parado", "vencido", "faltando"];
const OPERADORES = ["<", "<=", ">", ">=", "=="];
const TIPOS_CAMPO = ["texto", "texto_longo", "dinheiro", "numero", "data", "opcao", "email", "telefone", "sim_nao"];
export const CAMPOS_BASE = ["titulo", "estado", "responsavel", "criado_em", "atualizado_em", "prazo", "valor"];
const DIA = 86_400_000;

// ---------------------------------------------------------------- utilidades
export function valorDe(r: Registro, campo: string): unknown {
  if (CAMPOS_BASE.includes(campo)) return (r as Record<string, unknown>)[campo] ?? null;
  return r.dados?.[campo] ?? null;
}

const vazio = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

function data(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v.length === 10 ? `${v}T00:00:00Z` : v);
  return Number.isNaN(t) ? null : t;
}

/** Dia (UTC, meia-noite) de um instante. */
const diaDe = (t: number) => Math.floor(t / DIA) * DIA;

function centavos(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v * 100);
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) return Math.round(Number(v) * 100);
  return null;
}

function passaFiltros(r: Registro, filtros: Filtro[] = []) {
  return filtros.every((f) => {
    const v = valorDe(r, f.campo);
    const s = v === null ? null : String(v);
    if ("igual" in f) return s === String(f.igual);
    if ("diferente" in f) return s !== String(f.diferente);
    if (f.em) return f.em.map(String).includes(s ?? "\u0000");
    if (f.nao_em) return !f.nao_em.map(String).includes(s ?? "\u0000");
    return true;
  });
}

function compara(a: number, op: string, b: number) {
  return op === "<" ? a < b : op === "<=" ? a <= b : op === ">" ? a > b : op === ">=" ? a >= b : a === b;
}

function preencher(texto: string, vars: Record<string, unknown>) {
  return String(texto ?? "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

const isoDia = (t: number) => new Date(t).toISOString().slice(0, 10);

// ---------------------------------------------------------------- avaliacao
/** Avalia todas as sentinelas de um setor. `hoje` em ms (Date.now()). */
export function avaliarSetor(setor: Setor, registros: Registro[], hoje: number): Alerta[] {
  const tipos = Object.fromEntries(setor.registros.map((t) => [t.tipo, t]));
  const modelos = Object.fromEntries((setor.modelos ?? []).map((m) => [m.id, m]));
  const hojeDia = diaDe(hoje);
  const alertas: Alerta[] = [];

  for (const s of setor.sentinelas) {
    const g = s.gatilho;
    const tipo = tipos[g.registro];
    if (!tipo) continue;
    const finais = new Set(tipo.estados_finais);
    const doTipo = registros.filter((r) => r.tipo === g.registro && passaFiltros(r, g.filtros));
    // Regras por registro ignoram estados finais, salvo quando a propria regra filtra o
    // estado (ex.: "oportunidade ganha sem passagem para Operacoes").
    const filtraEstado = (g.filtros ?? []).some((f) => f.campo === "estado");
    const abertos = filtraEstado ? doTipo : doTipo.filter((r) => !finais.has(r.estado));

    const emitir = (r: Registro | null, vars: Record<string, unknown>) => {
      const base = { setor: setor.nome, sigla: setor.sigla, hoje: isoDia(hojeDia), ...vars };
      const v = r ? { ...base, ...r.dados, titulo: r.titulo, estado: r.estado, responsavel: r.responsavel ?? "", valor: r.valor ?? "", prazo: r.prazo ?? "" } : base;
      const acoes = s.acoes ?? [];
      alertas.push({
        chave: r ? `${s.id}:${r.id}` : s.id,
        setor: setor.id, sentinela: s.id, severidade: s.severidade,
        titulo: preencher(s.titulo, v), mensagem: preencher(s.mensagem, v),
        registro_id: r ? r.id : null, fonte: s.fonte ?? "",
        tarefas: acoes.filter((a) => a.tipo === "tarefa").map((a) => ({
          titulo: preencher(a.titulo ?? s.titulo, v), papel: a.papel ?? null, prazo: isoDia(hojeDia + (a.prazo_dias ?? 1) * DIA),
        })),
        rascunhos: acoes.filter((a) => a.tipo === "rascunho" && a.modelo && modelos[a.modelo]).map((a) => {
          const m = modelos[a.modelo!];
          return { modelo: m.id, tipo: m.tipo, assunto: preencher(m.assunto ?? "", v), corpo: preencher(m.corpo, v) };
        }),
        notificar: acoes.filter((a) => a.tipo === "notificar" && a.para).map((a) => a.para!),
      });
    };

    if (g.tipo === "contagem" || g.tipo === "soma") {
      const campoData = g.data_campo ?? "criado_em";
      const desde = hojeDia - (g.janela_dias ?? 30) * DIA;
      const naJanela = doTipo.filter((r) => {
        const t = data(valorDe(r, campoData));
        return t !== null && t >= desde && t <= hoje;
      });
      let total: number;
      if (g.tipo === "contagem") total = naJanela.length;
      else total = naJanela.reduce((acc, r) => acc + (centavos(valorDe(r, g.campo ?? "valor")) ?? 0), 0) / 100;
      const alvo = g.valor ?? 0;
      if (compara(total, g.operador ?? "<", alvo)) emitir(null, { total, janela_dias: g.janela_dias ?? 30, meta: alvo });
    } else if (g.tipo === "parado") {
      for (const r of abertos) {
        const t = data(valorDe(r, g.data_campo ?? "atualizado_em"));
        if (t === null) continue;
        const dias = Math.floor((hojeDia - diaDe(t)) / DIA);
        if (dias > (g.dias ?? 7)) emitir(r, { dias });
      }
    } else if (g.tipo === "vencido") {
      const antecedencia = g.antecedencia_dias ?? 0;
      for (const r of abertos) {
        const t = data(valorDe(r, g.campo ?? "prazo"));
        if (t === null) continue;
        const falta = Math.round((diaDe(t) - hojeDia) / DIA);
        if (falta < 0 || (antecedencia > 0 && falta <= antecedencia)) emitir(r, { dias: Math.abs(falta), vence_em: isoDia(diaDe(t)) });
      }
    } else if (g.tipo === "faltando") {
      for (const r of abertos) if (vazio(valorDe(r, g.campo ?? ""))) emitir(r, {});
    }
  }
  alertas.sort((a, b) => SEVERIDADES.indexOf(b.severidade) - SEVERIDADES.indexOf(a.severidade));
  return alertas;
}

// ---------------------------------------------------------------- validacao do catalogo
/** Confere formato e referencias cruzadas de todos os setores. Retorna lista de erros. */
export function validarCatalogo(setores: Setor[]): string[] {
  const erros: string[] = [];
  const tiposGlobais = new Map<string, string>();
  const sentinelasGlobais = new Map<string, string>();
  for (const s of setores) {
    const e = (m: string) => erros.push(`${s.id ?? "?"}: ${m}`);
    for (const k of ["id", "sigla", "nome", "missao"]) if (typeof (s as Record<string, unknown>)[k] !== "string") e(`campo ${k} ausente`);
    if (!s.diretor || typeof s.diretor.nome !== "string" || typeof s.diretor.titulo !== "string") e("diretor sem nome/titulo");
    const papeis = new Set((s.equipe ?? []).map((p) => p.papel));
    if (papeis.size < 2) e("equipe com menos de 2 papéis");
    const modelos = new Set((s.modelos ?? []).map((m) => m.id));
    const tipos = new Map<string, TipoRegistro>();
    for (const t of s.registros ?? []) {
      if (!/^[a-z_]+$/.test(t.tipo)) e(`tipo de registro inválido ${t.tipo}`);
      if (tiposGlobais.has(t.tipo)) e(`tipo ${t.tipo} repetido (também em ${tiposGlobais.get(t.tipo)})`);
      tiposGlobais.set(t.tipo, s.id);
      tipos.set(t.tipo, t);
      if (!Array.isArray(t.estados) || !t.estados.includes(t.estado_inicial)) e(`${t.tipo}: estado_inicial fora de estados`);
      for (const f of t.estados_finais ?? []) if (!t.estados.includes(f)) e(`${t.tipo}: estado final ${f} fora de estados`);
      const ids = new Set<string>();
      for (const c of t.campos ?? []) {
        if (!/^[a-z_0-9]+$/.test(c.id)) e(`${t.tipo}: campo id inválido ${c.id}`);
        if (CAMPOS_BASE.includes(c.id)) e(`${t.tipo}: campo ${c.id} repete campo base`);
        if (ids.has(c.id)) e(`${t.tipo}: campo ${c.id} repetido`);
        ids.add(c.id);
        if (!TIPOS_CAMPO.includes(c.tipo)) e(`${t.tipo}.${c.id}: tipo de campo inválido ${c.tipo}`);
        if (c.tipo === "opcao" && !(c.opcoes?.length)) e(`${t.tipo}.${c.id}: opcao sem opções`);
      }
      if (t.responsavel && !papeis.has(t.responsavel)) e(`${t.tipo}: responsavel ${t.responsavel} não está na equipe`);
    }
    const campoExiste = (tipo: TipoRegistro, c: string) => CAMPOS_BASE.includes(c) || tipo.campos.some((x) => x.id === c);
    for (const st of s.sentinelas ?? []) {
      const q = (m: string) => e(`sentinela ${st.id}: ${m}`);
      if (!/^[A-Z][A-Z0-9_]+$/.test(st.id)) q("id inválido");
      if (sentinelasGlobais.has(st.id)) q(`id repetido (também em ${sentinelasGlobais.get(st.id)})`);
      sentinelasGlobais.set(st.id, s.id);
      if (!SEVERIDADES.includes(st.severidade)) q(`severidade ${st.severidade}`);
      const g = st.gatilho;
      if (!g || !GATILHOS.includes(g.tipo)) { q(`gatilho inválido`); continue; }
      const tipo = tipos.get(g.registro);
      if (!tipo) { q(`registro ${g.registro} não existe no setor`); continue; }
      for (const f of g.filtros ?? []) {
        if (!campoExiste(tipo, f.campo)) q(`filtro em campo inexistente ${f.campo}`);
        if (f.campo === "estado") for (const v of [f.igual, f.diferente, ...(f.em ?? []), ...(f.nao_em ?? [])].filter((x) => x !== undefined)) if (!tipo.estados.includes(String(v))) q(`filtro usa estado inexistente ${v}`);
      }
      if (["contagem", "soma"].includes(g.tipo)) {
        if (!OPERADORES.includes(g.operador ?? "")) q("operador inválido");
        if (typeof g.valor !== "number") q("valor deve ser número");
        if (typeof g.janela_dias !== "number" || g.janela_dias <= 0) q("janela_dias inválida");
      }
      if (g.tipo === "soma" && !campoExiste(tipo, g.campo ?? "")) q(`campo ${g.campo} inexistente`);
      if (g.data_campo && !campoExiste(tipo, g.data_campo)) q(`data_campo ${g.data_campo} inexistente`);
      if (g.tipo === "parado" && typeof g.dias !== "number") q("parado sem dias");
      if (["vencido", "faltando"].includes(g.tipo) && !campoExiste(tipo, g.campo ?? "")) q(`campo ${g.campo} inexistente`);
      for (const a of st.acoes ?? []) {
        if (!["tarefa", "rascunho", "notificar"].includes(a.tipo)) q(`ação inválida ${a.tipo}`);
        if (a.tipo === "tarefa" && a.papel && !papeis.has(a.papel) && a.papel !== s.sigla) q(`tarefa para papel inexistente ${a.papel}`);
        if (a.tipo === "rascunho" && !modelos.has(a.modelo ?? "")) q(`rascunho com modelo inexistente ${a.modelo}`);
      }
    }
  }
  erros.push(...validarEstrutura(setores));
  return erros;
}

// ---------------------------------------------------------------- estrutura organizacional
export const NIVEIS = ["gestao", "assessoria", "execucao"];
export const FASES = ["essencial", "crescimento"];
export const FREQ_ATIVIDADE = ["diaria", "semanal", "mensal"];
type Papel = { papel: string; nome: string; reporta_a?: string; nivel?: string; fase?: string; cobre_enquanto_vago?: string; atividades?: Record<string, unknown>; entregas?: unknown; decide?: unknown; escala?: unknown };

/** Hierarquia: cada cargo reporta a um papel do proprio setor ou ao diretor; sem ciclos; atividades por frequencia.
 *  cobre_enquanto_vago aceita papel do setor, sigla de qualquer diretor ou "setor:papel". */
export function validarEstrutura(setores: Setor[]): string[] {
  const erros: string[] = [];
  const siglas = new Set(setores.map((s) => s.sigla));
  const papelGlobal = new Set(setores.flatMap((s) => (s.equipe ?? []).map((p) => `${s.id}:${p.papel}`)));
  for (const s of setores) {
    const e = (m: string) => erros.push(`${s.id}: ${m}`);
    const equipe = (s.equipe ?? []) as Papel[];
    const porPapel = new Map(equipe.map((p) => [p.papel, p]));
    const dir = s.diretor as Record<string, unknown>;
    if (dir.reporta_a != null && !siglas.has(String(dir.reporta_a))) e(`diretor reporta a sigla inexistente ${dir.reporta_a}`);
    if (dir.atividades !== undefined) checarAtividades(dir.atividades, (m) => e(`diretor: ${m}`));
    for (const p of equipe) {
      const q = (m: string) => e(`cargo ${p.papel}: ${m}`);
      const chefe = p.reporta_a ?? s.sigla;
      if (chefe !== s.sigla && !porPapel.has(chefe)) q(`reporta a ${chefe}, que não existe no setor`);
      if (chefe === p.papel) q("reporta a si mesmo");
      if (p.nivel !== undefined && !NIVEIS.includes(p.nivel)) q(`nivel inválido ${p.nivel}`);
      if (p.fase !== undefined && !FASES.includes(p.fase)) q(`fase inválida ${p.fase}`);
      const cob = p.cobre_enquanto_vago;
      if (cob !== undefined) {
        const ok = siglas.has(cob) || porPapel.has(cob) || (cob.includes(":") && papelGlobal.has(cob));
        if (!ok) q(`cobre_enquanto_vago inexistente ${cob}`);
        if (cob === p.papel) q("cobre_enquanto_vago aponta para o próprio cargo");
      }
      if (p.atividades !== undefined) checarAtividades(p.atividades, q);
      for (const k of ["entregas", "decide", "escala"] as const) if (p[k] !== undefined && !(Array.isArray(p[k]) && (p[k] as unknown[]).every((x) => typeof x === "string"))) q(`${k} deve ser lista de textos`);
      // ciclo: subir a cadeia de chefes ate o diretor
      const vistos = new Set<string>();
      let atual: string | undefined = p.papel;
      while (atual && atual !== s.sigla && porPapel.has(atual)) {
        if (vistos.has(atual)) { q("ciclo na hierarquia"); break; }
        vistos.add(atual);
        atual = porPapel.get(atual)!.reporta_a ?? s.sigla;
      }
    }
  }
  return erros;
}

function checarAtividades(a: unknown, q: (m: string) => void) {
  if (!a || typeof a !== "object" || Array.isArray(a)) return q("atividades deve ser objeto {diaria, semanal, mensal}");
  const o = a as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!FREQ_ATIVIDADE.includes(k)) q(`frequência de atividade inválida ${k}`);
  let total = 0;
  for (const k of FREQ_ATIVIDADE) {
    const v = o[k];
    if (v === undefined) continue;
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && x.trim())) q(`atividades.${k} deve ser lista de textos`);
    else total += v.length;
  }
  if (!total) q("atividades sem nenhum item");
}
