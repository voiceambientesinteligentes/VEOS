// Monta dist/ (site estatico do VEOS online para a Netlify): estilos e componentes
// reaproveitados do portal local + arquivos proprios de apps/web. Sem dependencias.
import { cpSync, mkdirSync, rmSync } from "node:fs";

const PORTAL = "apps/portal/web";
const REUSO = [
  "css", "favicon.svg",
  "js/domain/format.js", "js/domain/controls.js", "js/domain/rooms.js",
  "js/ui/dom.js", "js/ui/motion.js", "js/ui/shell.js", "js/ui/views/cfo_vigia.js",
];
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
for (const p of REUSO) cpSync(`${PORTAL}/${p}`, `dist/${p}`, { recursive: true });
cpSync("apps/web", "dist", { recursive: true });
console.log(`dist/ pronto: ${REUSO.length} itens do portal + apps/web`);
