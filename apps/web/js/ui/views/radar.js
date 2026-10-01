// Radar: central de comando. Alertas ativos de todos os setores (por severidade),
// tarefas abertas por prazo e resumo por setor. "Varrer agora" roda as regras vivas.
import { api } from "../../data/api.js";
import { CATALOGO } from "../../data/catalogo.js";
import { formatDateTime } from "../../domain/format.js";
import { cartaoAlerta, linhaTarefa, SEV_ROTULO, SEV_TOM } from "../componentes.js";
import { clear, errorNotice, h, panel, stamp, testTag } from "../dom.js";
import { painelResumoDia } from "./mensagens.js";

const ORDEM_SEV = ["CRITICO", "ALTO", "MEDIO", "INFO"];

export async function telaRadar(root, signal) {
  const conteudo = h("div", { class: "stack" });
  root.append(conteudo);

  async function carregar(msg) {
    const [r, resumo] = await Promise.all([api.radar(), api.resumo().catch(() => null)]);
    if (signal.aborted) return;
    const porSetor = CATALOGO.filter((s) => r.setores.includes(s.id)).map((s) => {
      const al = r.alertas.filter((a) => a.setor_id === s.id);
      const pior = ORDEM_SEV.find((x) => al.some((a) => a.severidade === x));
      return h("a", { class: `radar-setor${pior ? ` tom-${SEV_TOM[pior]}` : ""}`, href: `#/setor/${s.id}` },
        h("span", { class: "radar-setor-sigla" }, s.sigla),
        h("span", { class: "radar-setor-nome" }, s.nome),
        h("span", { class: "radar-setor-num" }, `${al.length} alerta${al.length === 1 ? "" : "s"} · ${r.tarefas.filter((t) => t.setor_id === s.id).length} tarefas`));
    });
    const varrer = h("button", { class: "btn btn-primary", type: "button" }, "Varrer agora");
    varrer.addEventListener("click", async () => {
      varrer.disabled = true;
      varrer.textContent = "Varrendo…";
      try {
        const v = await api.varrer();
        await carregar(`Varredura feita: ${v.novos} novo(s), ${v.resolvidos} resolvido(s), ${v.ativos} ativo(s).`);
      } catch (e) {
        varrer.disabled = false;
        varrer.textContent = "Varrer agora";
        conteudo.prepend(errorNotice(e.message));
      }
    });
    const u = r.ultima_varredura;
    const contagem = ORDEM_SEV.map((sv) => [sv, r.alertas.filter((a) => a.severidade === sv).length]).filter(([, n]) => n);
    clear(conteudo).append(
      panel({ title: "Radar da VOICE", subtitle: u ? `Última varredura ${formatDateTime(u.em)} (${u.origem.split(":")[0]}). As regras vivas também rodam sozinhas todo dia.` : "Nenhuma varredura ainda.", actions: h("div", { class: "row" }, testTag(), varrer) },
        msg ? h("p", { class: "field-hint", role: "status" }, msg) : null,
        h("div", { class: "row radar-contagem" }, contagem.length ? contagem.map(([sv, n]) => stamp(`${n} ${SEV_ROTULO[sv]}`, SEV_TOM[sv])) : stamp("Tudo em ordem", "ok")),
        h("div", { class: "radar-setores" }, porSetor)),
      resumo ? painelResumoDia(resumo.resumos) : h("div"),
      h("div", { class: "radar-colunas" },
        panel({ title: `Alertas ativos (${r.alertas.length})`, subtitle: "Do mais grave ao mais leve. Cada um traz a regra de origem e as ações preparadas." },
          r.alertas.length
            ? h("ul", { class: "list-plain stack-s" }, [...r.alertas].sort((a, b) => ORDEM_SEV.indexOf(a.severidade) - ORDEM_SEV.indexOf(b.severidade)).map((a) => cartaoAlerta(a, { aoDispensar: () => carregar() })))
            : h("p", { class: "result-empty" }, "Nenhum alerta ativo.")),
        panel({ title: `Tarefas abertas (${r.tarefas.length})`, subtitle: "Geradas pelas regras vivas ou criadas pela equipe." },
          r.tarefas.length
            ? h("ul", { class: "list-plain stack-s" }, r.tarefas.map((t) => linhaTarefa(t, { aoConcluir: () => carregar() })))
            : h("p", { class: "result-empty" }, "Nenhuma tarefa aberta."))),
    );
  }
  await carregar();
}
