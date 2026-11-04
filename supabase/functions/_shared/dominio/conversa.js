// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/conversa.js - nao editar a mao.
// CONVERSAS COM OS DIRETORES (sem DOM): agrupa as perguntas em conversas (a primeira abre; as
// seguintes apontam para ela por conversa_id) e quebra a resposta do diretor em blocos legiveis
// (titulos, paragrafos, listas, aviso da conferencia) para o formato de chat.

/** perguntas (da API) -> conversas [{ id, setor, titulo, turnos[], ultima, pendente, estado }] mais recentes primeiro. */
export function agruparConversas(perguntas = []) {
  const mapa = new Map();
  for (const p of perguntas) {
    const id = p.conversa_id ?? p.id;
    if (!mapa.has(id)) mapa.set(id, { id, setor: p.setor_id, turnos: [] });
    mapa.get(id).turnos.push(p);
  }
  const lista = [...mapa.values()].map((c) => {
    c.turnos.sort((a, b) => String(a.criada_em).localeCompare(String(b.criada_em)));
    const raiz = c.turnos.find((t) => !t.conversa_id) ?? c.turnos[0];
    const ult = c.turnos[c.turnos.length - 1];
    const quando = (t) => t.respostas?.at(-1)?.em ?? t.respondida_em ?? t.criada_em;
    return {
      ...c, setor: raiz.setor_id, titulo: String(raiz.pergunta).replace(/\s+/g, " ").slice(0, 90),
      ultima: c.turnos.map(quando).sort().at(-1), pendente: c.turnos.some((t) => t.estado === "pendente"),
      analisando: c.turnos.some((t) => t.ia_analisando), estado: ult.estado,
      previa: String(ult.respostas?.at(-1)?.resposta ?? ult.pergunta).replace(/^ATENÇÃO[^\n]*\n+/, "").replace(/^\s*(RESUMO|RESPOSTA)\s*\n/i, "").replace(/\s+/g, " ").trim().slice(0, 110),
    };
  });
  return lista.sort((a, b) => String(b.ultima).localeCompare(String(a.ultima)));
}

const TITULO = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ()/.,:-]{2,80}$/; // linha toda em maiusculas: titulo ("RESUMO", "PENDÊNCIAS")
const ITEM = /^\s*(?:[•\-*]|\d{1,2}[.)])\s+(.*)$/;

/** Texto da resposta -> blocos { tipo: titulo|paragrafo|lista|aviso|conferencia|base, texto|itens }. */
export function blocosDaResposta(texto = "") {
  const blocos = [];
  let lista = null;
  const fecharLista = () => { if (lista) { blocos.push(lista); lista = null; } };
  for (const bruta of String(texto).replace(/\r/g, "").split("\n")) {
    const l = bruta.trim();
    if (!l || /^-{3,}$/.test(l)) { fecharLista(); continue; }
    if (/^ATENÇÃO \(conferência do VEOS\)/.test(l)) { fecharLista(); blocos.push({ tipo: "aviso", texto: l }); continue; }
    if (/^Conferência automática do VEOS:/.test(l)) { fecharLista(); blocos.push({ tipo: "conferencia", texto: l }); continue; }
    if (/^Base:/.test(l)) { fecharLista(); blocos.push({ tipo: "base", texto: l }); continue; }
    const it = ITEM.exec(l);
    if (it && !TITULO.test(l)) { (lista ??= { tipo: "lista", itens: [] }).itens.push(it[1]); continue; }
    fecharLista();
    const semNumero = l.replace(/^\d{1,2}[.)]\s+/, "");
    if (TITULO.test(semNumero) && semNumero.length <= 80 && /[A-ZÁÉÍÓÚÇ]{3}/.test(semNumero)) blocos.push({ tipo: "titulo", texto: semNumero.replace(/:$/, "") });
    else if (/^[^.!?]{2,70}:$/.test(l)) blocos.push({ tipo: "titulo", texto: l.replace(/:$/, "") });
    else blocos.push({ tipo: "paragrafo", texto: l });
  }
  fecharLista();
  return blocos;
}

/** Sugestoes de continuacao (botoes rapidos abaixo da ultima resposta). */
export const SUGESTOES = ["Use os dados do VEOS e refaça", "Detalhe o primeiro passo", "Resuma em 3 ações para esta semana", "O que eu preciso decidir?"];
