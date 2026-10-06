// Junta setores/*.json, valida pelo motor (formato + referencias cruzadas) e gera:
//   supabase/functions/_shared/setores/catalogo.ts  (servidor)
//   apps/web/js/data/catalogo.js                    (portal)
// Uso: node scripts/gerar-catalogo.mjs [--verificar]  (--verificar falha se os gerados estiverem desatualizados)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { validarCatalogo } from "../supabase/functions/_shared/setores/motor.ts";

const ORDEM = ["direcao", "financas", "vendas", "marketing", "operacoes", "tecnologia", "posvenda", "pessoas", "secretaria"];
const arquivos = readdirSync("setores").filter((f) => f.endsWith(".json"));
const setores = arquivos.map((f) => JSON.parse(readFileSync(`setores/${f}`, "utf8")))
  .sort((a, b) => ORDEM.indexOf(a.id) - ORDEM.indexOf(b.id));

const faltando = ORDEM.filter((id) => !setores.some((s) => s.id === id));
const erros = validarCatalogo(setores);
if (faltando.length) erros.push(`setores ausentes: ${faltando.join(", ")}`);
if (erros.length) {
  console.error(`Catálogo inválido (${erros.length}):\n- ${erros.join("\n- ")}`);
  process.exit(1);
}

// Manuais de atuacao dos diretores (setores/manuais/<id>.json): pesquisa com fontes, carregados sob demanda.
const MIN = { competencias: 8, frameworks: 6, procedimentos: 8, indicadores: 6, rotinas: 4, armadilhas: 4, aplicacao_voice: 3, formacao_referencia: 3, bibliografia: 3, fontes: 5 };
function validarManual(m, id) {
  const e = [];
  if (m.setor !== id) e.push(`${id}: campo setor diferente do arquivo`);
  if (typeof m.resumo !== "string" || m.resumo.length < 40) e.push(`${id}: resumo ausente/curto`);
  for (const [k, n] of Object.entries(MIN)) if (!Array.isArray(m[k]) || m[k].length < n) e.push(`${id}: ${k} precisa de pelo menos ${n} itens (tem ${m[k]?.length ?? 0})`);
  for (const [i, p] of (m.procedimentos ?? []).entries()) for (const c of ["pedido", "passos", "entregavel"]) if (!p[c] || (Array.isArray(p[c]) && !p[c].length)) e.push(`${id}: procedimento ${i + 1} sem ${c}`);
  for (const [i, f] of (m.frameworks ?? []).entries()) if (!f.nome || !Array.isArray(f.como_aplicar) || !f.como_aplicar.length) e.push(`${id}: framework ${i + 1} incompleto`);
  for (const [i, k] of (m.indicadores ?? []).entries()) if (!k.nome || !k.formula) e.push(`${id}: indicador ${i + 1} sem nome/fórmula`);
  for (const [i, f] of (m.fontes ?? []).entries()) if (!f.interna && !/^https?:\/\//.test(f.url ?? "")) e.push(`${id}: fonte ${i + 1} sem URL (ou marque interna: true)`);
  return e;
}
const manuais = existsSync("setores/manuais") ? readdirSync("setores/manuais").filter((f) => f.endsWith(".json")).sort().map((f) => [f.replace(".json", ""), JSON.parse(readFileSync(`setores/manuais/${f}`, "utf8"))]) : [];
const errosManuais = manuais.flatMap(([id, m]) => (ORDEM.includes(id) ? validarManual(m, id) : [`manual de setor inexistente: ${id}`]));
if (errosManuais.length) {
  console.error(`Manual inválido (${errosManuais.length}):\n- ${errosManuais.join("\n- ")}`);
  process.exit(1);
}

const json = JSON.stringify(setores, null, 1);
const cabecalho = "// GERADO por scripts/gerar-catalogo.mjs a partir de setores/*.json - nao editar a mao.\n";
const saidas = {
  "supabase/functions/_shared/setores/catalogo.ts": `${cabecalho}export const CATALOGO = ${json};\n`,
  "apps/web/js/data/catalogo.js": `${cabecalho}export const CATALOGO = ${json};\n`,
  "apps/web/js/data/manuais/indice.js": `${cabecalho}export const MANUAIS = ${JSON.stringify(manuais.map(([id]) => id).sort())};\n`,
};
for (const [id, m] of manuais) saidas[`apps/web/js/data/manuais/${id}.js`] = `${cabecalho}export default ${JSON.stringify(m, null, 1)};\n`;
// Motor de IA no servidor: os manuais e os MESMOS modulos de calculo do portal (sem DOM), para o diretor
// usar as contas das telas em vez de calcular de cabeca.
saidas["supabase/functions/_shared/ia/manuais.ts"] = `${cabecalho}// deno-lint-ignore no-explicit-any\nexport const MANUAIS: Record<string, any> = ${JSON.stringify(Object.fromEntries(manuais))};\n`;
const DOMINIO = "apps/web/js/domain";
for (const f of readdirSync(DOMINIO).filter((x) => x.endsWith(".js")).sort()) {
  saidas[`supabase/functions/_shared/dominio/${f}`] = `// GERADO por scripts/gerar-catalogo.mjs a partir de ${DOMINIO}/${f} - nao editar a mao.\n${readFileSync(`${DOMINIO}/${f}`, "utf8")}`;
}
if (process.argv.includes("--verificar")) {
  const velhos = Object.entries(saidas).filter(([f, c]) => { try { return readFileSync(f, "utf8") !== c; } catch { return true; } });
  if (velhos.length) {
    console.error(`Desatualizado: ${velhos.map(([f]) => f).join(", ")} — rode node scripts/gerar-catalogo.mjs`);
    process.exit(1);
  }
  console.log("catálogo gerado está em dia");
} else {
  for (const d of ["apps/web/js/data/manuais", "supabase/functions/_shared/ia", "supabase/functions/_shared/dominio"]) mkdirSync(d, { recursive: true });
  for (const [f, c] of Object.entries(saidas)) writeFileSync(f, c);
  if (manuais.length) console.log(`${manuais.length} manuais de diretor: ${manuais.map(([id, m]) => `${id} (${m.procedimentos.length} procedimentos)`).join(", ")}`);
  const n = (k) => setores.reduce((acc, s) => acc + (s[k]?.length ?? 0), 0);
  console.log(`${setores.length} setores · ${n("equipe")} papéis · ${n("registros")} tipos de registro · ${n("rotinas")} rotinas · ${n("indicadores")} indicadores · ${n("sentinelas")} sentinelas · ${n("modelos")} modelos`);
}
