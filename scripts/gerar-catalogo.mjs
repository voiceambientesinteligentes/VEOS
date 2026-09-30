// Junta setores/*.json, valida pelo motor (formato + referencias cruzadas) e gera:
//   supabase/functions/_shared/setores/catalogo.ts  (servidor)
//   apps/web/js/data/catalogo.js                    (portal)
// Uso: node scripts/gerar-catalogo.mjs [--verificar]  (--verificar falha se os gerados estiverem desatualizados)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
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

const json = JSON.stringify(setores, null, 1);
const cabecalho = "// GERADO por scripts/gerar-catalogo.mjs a partir de setores/*.json - nao editar a mao.\n";
const saidas = {
  "supabase/functions/_shared/setores/catalogo.ts": `${cabecalho}export const CATALOGO = ${json};\n`,
  "apps/web/js/data/catalogo.js": `${cabecalho}export const CATALOGO = ${json};\n`,
};
if (process.argv.includes("--verificar")) {
  const velhos = Object.entries(saidas).filter(([f, c]) => { try { return readFileSync(f, "utf8") !== c; } catch { return true; } });
  if (velhos.length) {
    console.error(`Desatualizado: ${velhos.map(([f]) => f).join(", ")} — rode node scripts/gerar-catalogo.mjs`);
    process.exit(1);
  }
  console.log("catálogo gerado está em dia");
} else {
  for (const [f, c] of Object.entries(saidas)) writeFileSync(f, c);
  const n = (k) => setores.reduce((acc, s) => acc + (s[k]?.length ?? 0), 0);
  console.log(`${setores.length} setores · ${n("equipe")} papéis · ${n("registros")} tipos de registro · ${n("rotinas")} rotinas · ${n("indicadores")} indicadores · ${n("sentinelas")} sentinelas · ${n("modelos")} modelos`);
}
