// Estrutura organizacional da VOICE a partir do catalogo dos setores (sem DOM, testavel).
// Cargo = funcao (nao pessoa). Enquanto a empresa e pequena, varias funcoes ficam com a mesma pessoa:
// "cobre_enquanto_vago" diz quem acumula. Tudo marcado PROPOSTA ate a direcao aprovar.

export const NIVEL_ROTULO = { diretor: "Diretor", gestao: "Gestão", assessoria: "Assessoria", execucao: "Execução" };
export const FASE_ROTULO = { essencial: "Essencial agora", crescimento: "Quando crescer" };
export const FREQ_ROTULO = { diaria: "Todo dia", semanal: "Toda semana", mensal: "Todo mês" };

const chefeDe = (setor, p) => p.reporta_a ?? setor.sigla;

/** Arvore de um setor: diretor no topo e cada cargo abaixo do seu chefe. */
export function arvoreSetor(setor) {
  const filhosDe = (id) => setor.equipe.filter((p) => chefeDe(setor, p) === id && p.papel !== id)
    .map((p) => ({ papel: p.papel, cargo: p, filhos: filhosDe(p.papel) }));
  return { papel: setor.sigla, cargo: null, filhos: filhosDe(setor.sigla) };
}

/** Arvore da empresa: o setor cujo diretor nao reporta a ninguem fica no topo; os demais diretores abaixo dele. */
export function arvoreEmpresa(setores) {
  const raiz = setores.find((s) => s.diretor.reporta_a == null) ?? null;
  const porSigla = new Map(setores.map((s) => [s.sigla, s]));
  const diretoresDe = (sigla) => setores.filter((s) => s !== raiz && (s.diretor.reporta_a ?? raiz?.sigla) === sigla)
    .map((s) => ({ setor: s, arvore: arvoreSetor(s), diretores: diretoresDe(s.sigla) }));
  return raiz ? { setor: raiz, arvore: arvoreSetor(raiz), diretores: diretoresDe(raiz.sigla), porSigla } : null;
}

/** Profundidade de cada cargo (1 = responde direto ao diretor). */
export function niveisHierarquia(setor) {
  const prof = {};
  const visitar = (no, d) => no.filhos.forEach((f) => { prof[f.papel] = d; visitar(f, d + 1); });
  visitar(arvoreSetor(setor), 1);
  return prof;
}

/** Nome legivel de quem cobre: papel do setor, sigla de diretor ou "setor:papel". */
export function nomeCobertura(setores, setor, ref) {
  if (!ref) return null;
  const diretor = setores.find((s) => s.sigla === ref);
  if (diretor) return `${diretor.sigla} · ${diretor.diretor.titulo}`;
  const [sid, papel] = ref.includes(":") ? ref.split(":") : [setor.id, ref];
  const s = setores.find((x) => x.id === sid);
  const p = s?.equipe.find((x) => x.papel === papel);
  if (!p) return ref;
  return s.id === setor.id ? p.nome : `${p.nome} (${s.sigla})`;
}

/** Quem acumula cada cargo, resolvendo a cadeia ate quem esta ocupado de fato.
 *  Hipotese da proposta: cargos "essencial" existem desde ja; os de "crescimento" ficam com quem os cobre.
 *  Devolve, por responsavel final, a lista de cargos que ele acumula. */
export function acumulos(setores) {
  const chave = (s, papel) => `${s.id}:${papel}`;
  const cargos = new Map(setores.flatMap((s) => s.equipe.map((p) => [chave(s, p.papel), { s, p }])));
  const resolve = (s, ref, vistos = new Set()) => {
    const siglaDir = setores.find((x) => x.sigla === ref);
    if (siglaDir) return { tipo: "diretor", id: ref, setor: siglaDir };
    const k = ref.includes(":") ? ref : chave(s, ref);
    const alvo = cargos.get(k);
    if (!alvo || vistos.has(k)) return { tipo: "desconhecido", id: ref };
    vistos.add(k);
    if (alvo.p.fase !== "crescimento" || !alvo.p.cobre_enquanto_vago) return { tipo: "cargo", id: k, setor: alvo.s, cargo: alvo.p };
    return resolve(alvo.s, alvo.p.cobre_enquanto_vago, vistos);
  };
  const mapa = new Map();
  for (const s of setores) for (const p of s.equipe) {
    if (p.fase !== "crescimento" || !p.cobre_enquanto_vago) continue;
    const quem = resolve(s, p.cobre_enquanto_vago, new Set([chave(s, p.papel)]));
    const id = quem.id;
    if (!mapa.has(id)) mapa.set(id, { quem, cargos: [] });
    mapa.get(id).cargos.push({ setor: s, cargo: p });
  }
  return [...mapa.values()].sort((a, b) => b.cargos.length - a.cargos.length);
}

/** Numeros da estrutura: cargos por nivel e fase, e cargos sem atividade definida. */
export function resumoEstrutura(setores) {
  const todos = setores.flatMap((s) => s.equipe.map((p) => ({ s, p })));
  const conta = (f) => todos.filter(f).length;
  return {
    diretores: setores.length,
    cargos: todos.length,
    gestao: conta(({ p }) => p.nivel === "gestao"),
    execucao: conta(({ p }) => p.nivel === "execucao"),
    assessoria: conta(({ p }) => p.nivel === "assessoria"),
    essenciais: conta(({ p }) => p.fase === "essencial"),
    crescimento: conta(({ p }) => p.fase === "crescimento"),
    semAtividades: todos.filter(({ p }) => !p.atividades).map(({ s, p }) => `${s.sigla}:${p.papel}`),
    atividades: todos.reduce((n, { p }) => n + Object.values(p.atividades ?? {}).reduce((m, l) => m + l.length, 0), 0),
  };
}
