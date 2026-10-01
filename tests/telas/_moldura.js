// Moldura de celular: o Edge headless nao abre janela com menos de ~490px, entao a tela
// roda num iframe com a largura pedida (?w=390) e o resultado e copiado para este <body>.
const q = new URLSearchParams(location.search);
const f = document.createElement("iframe");
f.width = q.get("w") || "390";
f.height = q.get("h") || "844";
f.src = q.get("src");
f.style.border = "0";
document.body.append(f);
const t = setInterval(() => {
  const b = f.contentDocument?.body;
  if (b?.dataset.pronto !== "1") return;
  clearInterval(t);
  for (const [k, v] of Object.entries(b.dataset)) document.body.dataset[k] = v;
}, 50);
