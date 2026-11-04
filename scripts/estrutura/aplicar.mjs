// Funde scripts/estrutura/dados.mjs em setores/*.json (hierarquia e atividades de cada cargo).
// Idempotente: rodar de novo reescreve os mesmos campos. Nao muda ids de papel (registros e regras dependem deles).
// Uso: node scripts/estrutura/aplicar.mjs   (depois: node scripts/gerar-catalogo.mjs)
import { readFileSync, writeFileSync } from "node:fs";
import { ESTRUTURA } from "./dados.mjs";

const CAMPOS = ["nome", "nivel", "reporta_a", "missao", "fase", "cobre_enquanto_vago", "atividades", "entregas", "decide", "escala", "status"];
const ORDEM_NIVEL = { gestao: 0, assessoria: 1, execucao: 2 };

for (const [id, e] of Object.entries(ESTRUTURA)) {
  const arq = `setores/${id}.json`;
  const s = JSON.parse(readFileSync(arq, "utf8"));
  s.diretor.reporta_a = e.diretor.reporta_a;
  s.diretor.atividades = e.diretor.atividades;
  for (const novo of e.novos ?? []) {
    const i = s.equipe.findIndex((p) => p.papel === novo.papel);
    if (i >= 0) s.equipe[i] = { ...s.equipe[i], ...novo };
    else s.equipe.push(novo);
  }
  for (const [papel, extra] of Object.entries(e.papeis ?? {})) {
    const p = s.equipe.find((x) => x.papel === papel);
    if (!p) throw new Error(`${id}: papel ${papel} não existe`);
    for (const k of CAMPOS) if (extra[k] !== undefined) p[k] = extra[k];
  }
  const semDados = s.equipe.filter((p) => !p.atividades).map((p) => p.papel);
  if (semDados.length) throw new Error(`${id}: papéis sem estrutura: ${semDados.join(", ")}`);
  // Ordem estavel: gestao, assessoria, execucao (mantendo a ordem original dentro de cada nivel).
  s.equipe = s.equipe.map((p, i) => [p, i]).sort((a, b) => (ORDEM_NIVEL[a[0].nivel] - ORDEM_NIVEL[b[0].nivel]) || a[1] - b[1]).map(([p]) => p);
  writeFileSync(arq, `${JSON.stringify(s, null, 2)}\n`);
  console.log(`${id}: ${s.equipe.length} cargos`);
}
