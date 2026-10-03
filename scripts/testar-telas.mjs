// Testes de tela com dados simulados: monta dist/, copia tests/telas para dist/_teste, sobe o
// servidor local e abre cada pagina no Edge headless em 1366px e 390px (celular).
// Uso: node scripts/testar-telas.mjs [filtro]   (o ambiente bloqueia sessao de login de teste)
import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "/usr/bin/microsoft-edge", "/usr/bin/chromium", "/usr/bin/google-chrome"]
  .find((p) => existsSync(p));
if (!EDGE) throw new Error("navegador (Edge/Chromium) nao encontrado");
execFileSync(process.execPath, ["scripts/build-web.mjs"], { stdio: "inherit" });
cpSync("tests/telas", "dist/_teste", { recursive: true });
const servidor = spawn(process.execPath, ["scripts/serve-web.mjs"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));

const filtro = process.argv[2] ?? "";
const paginas = readdirSync("tests/telas").filter((f) => f.endsWith(".html") && !f.startsWith("_") && f.includes(filtro));
const casos = paginas.flatMap((p) => {
  const hashes = (/<!--\s*casos:\s*([^>]*?)\s*-->/.exec(readFileSync(`tests/telas/${p}`, "utf8"))?.[1] ?? "").split(/\s+/).filter(Boolean);
  return (hashes.length ? hashes : [""]).flatMap((hs) => [[p, hs, 1366, 900], [p, hs, 390, 844]]);
});
let falhas = 0;
/** Abre a tela no navegador headless e devolve o DOM final ("" se o navegador travar). */
function abrir(p, hs, w, hgt) {
  const perfil = mkdtempSync(join(tmpdir(), "veos-edge-"));
  try {
    return execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--no-first-run", ...(process.platform === "linux" ? ["--no-sandbox"] : []), `--user-data-dir=${perfil}`, `--window-size=${Math.max(w, 600)},${hgt + 100}`, "--virtual-time-budget=10000", "--dump-dom", w < 500 ? `http://127.0.0.1:8878/_teste/_moldura.html?w=${w}&h=${hgt}&src=${encodeURIComponent(`${p}${hs ? `#${hs}` : ""}`)}` : `http://127.0.0.1:8878/_teste/${p}${hs ? `#${hs}` : ""}`], { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    return String(e.stdout ?? "");
  }
}
for (const [p, hs, w, hgt] of casos) {
  let dom = abrir(p, hs, w, hgt);
  // navegador headless as vezes trava ao abrir (0 bytes, visto no CI): tenta UMA vez de novo.
  // So o travamento repete; falha da tela (erro JS, rolagem, texto ruim) nunca e repetida.
  if (!/data-pronto="1"/.test(dom) && dom.length < 200) {
    console.log(`aviso ${p}${hs ? `#${hs}` : ""} @${w}px: navegador não terminou (${dom.length} bytes); repetindo uma vez`);
    dom = abrir(p, hs, w, hgt);
  }
  const attr = (n) => (new RegExp(`<body[^>]*\\sdata-${n}="([^"]*)"`).exec(dom) ?? [])[1];
  const prob = [];
  if (attr("pronto") !== "1") prob.push(`tela nao terminou (${dom.length} bytes)`);
  if (attr("erros")) prob.push(`erros JS: ${attr("erros")}`);
  if (attr("overflow") === "true") prob.push(`rolagem lateral${attr("largos") ? ` (${attr("largos")})` : ""}`);
  if (w < 500 && Number(attr("largura")) !== w) prob.push(`largura real ${attr("largura")}px`);
  if (attr("ruins")) prob.push(`texto ruim: ${attr("ruins")}`);
  if (prob.length) falhas++;
  console.log(`${prob.length ? "FALHA" : "ok   "} ${p}${hs ? `#${hs}` : ""} @${w}px${prob.length ? ` -> ${prob.join("; ")}` : ""}`);
  // no GitHub Actions a falha vira anotacao (legivel pela API publica de check-runs, sem login)
  if (prob.length && process.env.GITHUB_ACTIONS) console.log(`::error title=Tela ${p} @${w}px::${prob.join("; ").replace(/[\r\n]+/g, " ").slice(0, 900)}`);
}
servidor.kill();
console.log(`${casos.length - falhas}/${casos.length} telas aprovadas`);
process.exit(falhas ? 1 : 0);
