// Abre uma copia de seguranca do VEOS (arquivo .veosbk) numa pasta: tabelas/<nome>.json,
// arquivos/<bucket>/<caminho> e usuarios.json. NAO grava nada no banco: restaurar e decisao
// humana, feita tabela a tabela. Uso: BACKUP_SENHA=... node scripts/restaurar-backup.mjs <arquivo> <pasta>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { decifrar } from "./lib/cofre.mjs";

const [arquivo, pasta] = process.argv.slice(2);
if (!arquivo || !pasta) throw new Error("uso: node scripts/restaurar-backup.mjs <arquivo.veosbk> <pasta>");
const d = JSON.parse(decifrar(readFileSync(arquivo), process.env.BACKUP_SENHA).toString("utf8"));
const seguro = (p) => {
  const n = normalize(p).replace(/^([/\\])+/, "");
  if (n.startsWith("..")) throw new Error(`caminho invalido no backup: ${p}`);
  return n;
};
mkdirSync(join(pasta, "tabelas"), { recursive: true });
for (const [nome, linhas] of Object.entries(d.tabelas)) writeFileSync(join(pasta, "tabelas", `${seguro(nome)}.json`), JSON.stringify(linhas, null, 1));
for (const a of d.arquivos) {
  const destino = join(pasta, "arquivos", seguro(a.bucket), seguro(a.caminho));
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, Buffer.from(a.base64, "base64"));
}
writeFileSync(join(pasta, "usuarios.json"), JSON.stringify(d.usuarios, null, 1));
console.log(`backup de ${d.gerado_em}: ${Object.keys(d.tabelas).length} tabelas, ${d.arquivos.length} arquivo(s), ${d.usuarios.length} login(s) -> ${pasta}`);
