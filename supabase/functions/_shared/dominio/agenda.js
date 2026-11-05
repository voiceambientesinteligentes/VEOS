// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/agenda.js - nao editar a mao.
// AGENDA POR PESSOA (sem DOM; navegador e Edge Function): transforma as atividades diarias, semanais e
// mensais de um cargo (Estrutura da empresa) nas tarefas de um dia. Regras:
//  - diaria: de segunda a sexta, prazo no proprio dia;
//  - semanal: uma vez por semana (chave = segunda-feira), gerada em qualquer dia util, prazo na sexta;
//  - mensal: uma vez por mes (chave = AAAA-MM), prazo no ultimo dia do mes.
// Fins de semana nao geram nada. As atividades sao PROPOSTA ate a direcao aprovar a estrutura.

const dia = (iso) => new Date(`${iso}T12:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const soma = (d, n) => new Date(d.getTime() + n * 86_400_000);

/** Dia da semana 0 (domingo) a 6 (sabado) de uma data ISO. */
export const diaDaSemana = (data) => dia(data).getUTCDay();
export const ehDiaUtil = (data) => { const w = diaDaSemana(data); return w >= 1 && w <= 5; };

/** Segunda-feira da semana da data. */
export function segundaDa(data) {
  const w = diaDaSemana(data);
  return iso(soma(dia(data), w === 0 ? -6 : 1 - w));
}
/** Ultimo dia do mes da data. */
export function ultimoDiaDoMes(data) {
  const d = dia(data);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)));
}

/** Identificador curto e estavel da atividade (para a chave de repeticao). */
export function slugAtividade(texto) {
  const base = String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  let h = 5381;
  for (const c of String(texto)) h = ((h * 33) ^ c.codePointAt(0)) >>> 0;
  return `${base}-${h.toString(36)}`;
}

/** Cargos de um setor com atividades: o diretor (id "diretor") e cada papel da equipe. */
export function cargosDoSetor(setor) {
  const lista = [];
  if (setor?.diretor?.atividades) lista.push({ id: "diretor", nome: setor.diretor.titulo ?? "Diretor", atividades: setor.diretor.atividades });
  for (const e of setor?.equipe ?? []) if (e.atividades) lista.push({ id: e.papel, nome: e.nome ?? e.papel, atividades: e.atividades });
  return lista;
}

/**
 * Tarefas que a agenda do cargo pede na data. Devolve [{ titulo, periodo, slug, periodoChave, prazo }].
 * `titulo` ja vem com o prefixo da periodicidade para a pessoa saber a que se refere.
 */
export function tarefasDaAgenda(atividades, data) {
  if (!atividades || !ehDiaUtil(data)) return [];
  const segunda = segundaDa(data), sexta = iso(soma(dia(segunda), 4)), mes = data.slice(0, 7);
  const saida = [];
  const por = (lista, periodo, rotulo, periodoChave, prazo) => {
    for (const t of lista ?? []) {
      const titulo = String(t).trim();
      if (titulo) saida.push({ titulo: `${rotulo}: ${titulo}`.slice(0, 240), periodo, slug: slugAtividade(titulo), periodoChave, prazo });
    }
  };
  por(atividades.diaria, "diaria", "Hoje", data, data);
  por(atividades.semanal, "semanal", "Semana", segunda, sexta);
  por(atividades.mensal, "mensal", "Mês", mes, ultimoDiaDoMes(data));
  return saida;
}

/** Chave unica da tarefa (evita repetir no mesmo periodo). */
export const chaveDaAgenda = (userId, cargo, t) => `AGENDA:${userId}:${cargo}:${t.periodo}:${t.slug}:${t.periodoChave}`;
