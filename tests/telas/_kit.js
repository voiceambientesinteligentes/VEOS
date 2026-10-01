// Kit das telas simuladas: roda a tela com a API substituida por dados TESTE e grava o
// resultado em <body data-*> para o scripts/testar-telas.mjs ler (Edge headless --dump-dom).
// Confere: tela pronta, erros de JS, rolagem lateral e textos "null"/"undefined"/"NaN".
const erros = [];
window.addEventListener("error", (e) => erros.push(String(e.message)));
window.addEventListener("unhandledrejection", (e) => erros.push(String(e.reason?.stack || e.reason)));

export async function rodar(fn, { esperar = 0 } = {}) {
  const b = document.body;
  try {
    await fn(document.getElementById("view"));
    if (esperar) await new Promise((r) => setTimeout(r, esperar));
  } catch (e) {
    erros.push(String(e?.stack || e));
  }
  const texto = document.getElementById("view").innerText;
  const ruins = (texto.match(/\b(null|undefined|NaN)\b/g) || []);
  b.dataset.largura = String(window.innerWidth);
  b.dataset.overflow = String(document.documentElement.scrollWidth > window.innerWidth + 1);
  b.dataset.ruins = ruins.join(",");
  b.dataset.erros = erros.join(" | ").slice(0, 2000);
  b.dataset.pronto = "1";
}
