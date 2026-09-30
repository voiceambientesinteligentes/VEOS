// Servidor local de teste para dist/ em http://127.0.0.1:8878, com os mesmos
// cabecalhos de seguranca do netlify.toml (CSP etc.). Uso: node scripts/serve-web.mjs
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const RAIZ = new URL("../dist/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
const toml = readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
const CABECALHOS = Object.fromEntries([...toml.matchAll(/^\s+([A-Za-z-]+) = "(.*)"$/gm)].map((m) => [m[1], m[2]]));

createServer((req, res) => {
  const caminho = new URL(req.url, "http://x").pathname;
  const rel = normalize(caminho === "/" ? "/index.html" : caminho).replace(/^([/\\])+/, "");
  if (rel.startsWith("..")) return res.writeHead(400).end();
  try {
    const corpo = readFileSync(join(RAIZ, rel));
    res.writeHead(200, { ...CABECALHOS, "Content-Type": TIPOS[extname(rel)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(corpo);
  } catch {
    res.writeHead(404, CABECALHOS).end("nao encontrado");
  }
}).listen(8878, "127.0.0.1", () => console.log("VEOS online (local) em http://127.0.0.1:8878"));
