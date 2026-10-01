// Validacao real guiada (P0): o roteiro na tela, marcado passo a passo pelo usuario logado.
// O progresso fica so neste navegador ate registrar; ao registrar, cada falha vira um
// incidente aberto na Biblioteca e a rodada vira uma referencia (evidencia interna).
import { api } from "../../data/api.js";
import { RESULTADOS, ROTEIRO, resumoValidacao } from "../../domain/validacao.js";
import { clear, errorNotice, h, method, panel, stamp } from "../dom.js";

const CHAVE = "veos.validacao";
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch { return {}; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch { /* sem armazenamento: vale ate fechar a aba */ } };
const TOM = { ok: "ok", falhou: "risk", na: "neutral" };

export function telaValidacao(root, aviso = null) {
  let respostas = ler();
  const placar = h("div", { class: "row" });
  const saida = h("div", { role: "status" });
  const botao = h("button", { class: "btn btn-primary", type: "button" }, "Registrar na Biblioteca");

  function atualizarPlacar() {
    const r = resumoValidacao(respostas);
    clear(placar).append(stamp(`${r.ok} funcionaram`, "ok"), stamp(`${r.falhou} falharam`, r.falhou ? "risk" : "neutral"), stamp(`${r.na} não se aplicam`, "neutral"), stamp(`${r.pendentes} pendentes`, r.pendentes ? "warn" : "ok"));
  }

  const passos = ROTEIRO.map((p, i) => {
    const marca = h("span", null);
    const obs = h("textarea", { class: "input", rows: "2", id: `val-${p.id}-obs`, placeholder: "O que aconteceu (obrigatório se falhou)", "aria-label": `Observação: ${p.titulo}` }, respostas[p.id]?.obs ?? "");
    const pintar = () => clear(marca).append(respostas[p.id]?.resultado ? stamp(RESULTADOS[respostas[p.id].resultado], TOM[respostas[p.id].resultado]) : stamp("Pendente", "warn"));
    const botoes = Object.entries(RESULTADOS).map(([k, rot]) => {
      const b = h("button", { class: "btn btn-ghost", type: "button", "aria-pressed": String(respostas[p.id]?.resultado === k) }, rot);
      b.addEventListener("click", () => {
        respostas[p.id] = { ...(respostas[p.id] ?? {}), resultado: k };
        gravar(respostas);
        botoes.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        pintar();
        atualizarPlacar();
      });
      return b;
    });
    obs.addEventListener("input", () => { respostas[p.id] = { ...(respostas[p.id] ?? {}), obs: obs.value }; gravar(respostas); });
    pintar();
    return h("li", { class: "panel panel-tight stack-s" },
      h("div", { class: "row" }, h("strong", null, `${i + 1}. ${p.titulo}`), h("span", { class: "field-hint" }, p.area), marca),
      h("p", null, h("strong", null, "Faça: "), p.fazer),
      h("p", null, h("strong", null, "Deve acontecer: "), p.esperado),
      h("div", { class: "row" }, botoes),
      obs);
  });

  botao.addEventListener("click", async () => {
    clear(saida);
    const r = resumoValidacao(respostas);
    if (r.problemas.length) return saida.append(errorNotice(r.problemas.join(" ")));
    if (r.pendentes === r.total) return saida.append(errorNotice("Marque ao menos um passo antes de registrar."));
    if (r.pendentes && !confirm(`${r.pendentes} passo(s) continuam pendentes. Registrar mesmo assim?`)) return;
    botao.disabled = true;
    try {
      const data = new Date().toISOString().slice(0, 10);
      const incidentes = [];
      for (const f of r.falhas) {
        const reg = await api.bibCriar({
          tipo: "incidente", titulo: `Validação guiada: ${f.titulo} falhou`.slice(0, 200),
          conteudo: `Passo: ${f.fazer}\nEsperado: ${f.esperado}\nObservado: ${f.obs.trim()}`, assuntos: ["validação", f.area.toLowerCase()],
          dados: { origem: "validacao_guiada", passo: f.id, data },
        });
        incidentes.push(reg.codigo);
      }
      const ref = await api.bibCriar({
        tipo: "referencia", titulo: `Validação real guiada de ${data}: ${r.ok}/${r.total} funcionaram`,
        conteudo: `${r.texto}\n\nIncidentes abertos: ${incidentes.join(", ") || "nenhum"}.`, assuntos: ["validação", "teste"],
        fontes: [{ tipo: "interna", natureza: "fato_verificado", titulo: "Roteiro de validação executado no site com login real", data_fonte: data, acessada: true }],
        dados: { origem: "validacao_guiada", ok: r.ok, falhou: r.falhou, na: r.na, pendentes: r.pendentes, incidentes },
      });
      respostas = {};
      gravar(respostas);
      clear(root);
      return telaValidacao(root, h("p", { class: "notice notice-ok", role: "status" }, `Registrado: ${ref.codigo}${incidentes.length ? ` e incidentes ${incidentes.join(", ")}` : ""}. `, h("a", { href: `#/biblioteca/r/${ref.id}` }, "Abrir na Biblioteca")));
    } catch (e) {
      saida.append(errorNotice(`Não foi possível registrar: ${e.message}`));
    } finally {
      botao.disabled = false;
    }
  });

  const limpar = h("button", { class: "btn btn-ghost", type: "button" }, "Recomeçar");
  limpar.addEventListener("click", () => {
    if (!confirm("Apagar as marcações desta rodada (ainda não registradas)?")) return;
    respostas = {};
    gravar(respostas);
    clear(root);
    telaValidacao(root);
  });

  const lista = h("ol", { class: "list-plain stack-s" }, passos);
  atualizarPlacar();
  root.append(
    panel({ title: "Validação real guiada", subtitle: "Faça cada passo logado no site e marque o resultado. Use dados de teste no Zoho sempre que possível.", actions: h("div", { class: "row" }, limpar, botao) },
      aviso, placar, saida,
      method("Como o resultado é guardado", "As marcações ficam só neste navegador até você clicar em Registrar na Biblioteca.",
        "Cada passo que falhou vira um incidente aberto (com o que era esperado e o que aconteceu); a rodada inteira vira uma referência com o placar.",
        "Nada é marcado como funcionando sem a sua marcação.")),
    lista,
  );
}
