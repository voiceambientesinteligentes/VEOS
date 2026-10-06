// Leva o texto integral das politicas canonicas VIGENTES (04 - PADROES do VOICE_360) para a tabela
// documentos_canonicos, onde o motor de IA dos diretores consulta. So LE os arquivos (nunca altera) e
// grava nova linha apenas quando o conteudo muda (codigo + sha256). O texto fica so no banco: o
// repositorio e publico. Uso: node scripts/online.mjs scripts/carregar-politicas.mjs
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PADROES = join(process.cwd(), "..", "04 - PADROES");
const DOCS = [
  { codigo: "POL-FIN-V1", biblioteca: "BIB-0011", arquivo: "VOICE - Politica de Saude Financeira - V1.md" },
  { codigo: "POL-FIN-V1-1", biblioteca: "BIB-0012", arquivo: "VOICE - Politica de Saude Financeira - V1.1 - Clarificacao de posicao e exposicao de caixa.md" },
];
const { SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
if (!URL_BASE || !KEY) throw new Error("rode por: node scripts/online.mjs scripts/carregar-politicas.mjs");

for (const d of DOCS) {
  const bruto = readFileSync(join(PADROES, d.arquivo), "utf8").replace(/\r\n/g, "\n");
  const status = /^status:\s*(\S+)/m.exec(bruto)?.[1];
  if (status !== "active") throw new Error(`${d.arquivo}: status ${status} (só políticas ativas entram)`);
  const titulo = /^title:\s*"?(.+?)"?\s*$/m.exec(bruto)?.[1] ?? d.codigo;
  const texto = bruto.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  const sha256 = createHash("sha256").update(texto).digest("hex");
  const r = await fetch(`${URL_BASE}/rest/v1/documentos_canonicos?on_conflict=codigo,sha256`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({ codigo: d.codigo, titulo, biblioteca: d.biblioteca, texto, sha256, origem: `04 - PADROES/${d.arquivo}` }),
  });
  if (!r.ok) throw new Error(`${d.codigo}: ${r.status} ${await r.text()}`);
  const novo = await r.json();
  console.log(`${d.codigo}: ${novo.length ? "nova versão gravada" : "já estava em dia"} (sha256 ${sha256.slice(0, 12)}…, ${texto.length} caracteres)`);
}
