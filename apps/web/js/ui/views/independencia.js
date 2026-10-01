// Independencia do Zoho: mapa por modulo (uso real x cobertura do VEOS) e roteiro de desligamento.
import { api } from "../../data/api.js";
import { MODULOS_ZOHO, resumoIndependencia, ROTEIRO_DESLIGAR } from "../../domain/independencia.js";
import { h, method, panel, stamp, stat, table } from "../dom.js";

const SIT = { coberto: ["Coberto", "ok"], parcial: ["Parcial", "warn"], nao: ["Depende do Zoho", "risk"] };

export async function telaIndependencia(root) {
  const espelho = await api.zohoEspelho();
  const contagem = (p, m) => Number(espelho.contagens.find((c) => c.produto === p && c.modulo === m)?.total ?? 0);
  const r = resumoIndependencia(MODULOS_ZOHO, contagem);
  const ordem = [...MODULOS_ZOHO].sort((a, b) => (contagem(b.produto, b.modulo) > 0) - (contagem(a.produto, a.modulo) > 0));
  root.append(
    h("div", { class: "grid-4" },
      stat("Módulos com dados", String(r.usados), "registros no espelho do Zoho"),
      stat("Cobertos pelo VEOS", String(r.coberto)), stat("Parciais", String(r.parcial)), stat("Dependem do Zoho", String(r.nao))),
    panel({ title: "Mapa de independência do Zoho", subtitle: "Por módulo: uso real, o que o VEOS já faz e o que falta. Avaliação técnica (opinião do Claude, 01/10/2026); desligar é decisão do fundador." },
      table({ caption: "Módulos", head: ["Módulo", "Registros", "Situação", "No VEOS hoje", "Falta para desligar"], align: ["", "r", "", "", ""],
        rows: ordem.map((m) => [`${m.nome} (${m.produto === "books" ? "Books" : m.produto === "crm" ? "CRM" : "Projects"})`, String(contagem(m.produto, m.modulo)), stamp(...SIT[m.situacao]), m.veos, m.falta]) })),
    panel({ title: "Roteiro para desligar um módulo" },
      h("ol", { class: "stack-s" }, ROTEIRO_DESLIGAR.map((p) => h("li", null, p))),
      method("Por onde começar (sugestão técnica)", "1. Catálogo de itens próprio: é a base de estoque, compras e pedidos (maior dependência).",
        "2. Clientes e fornecedores próprios, unificando Books e CRM.", "3. Orçamento criado no VEOS (a Negociação já calcula; falta salvar o orçamento completo).",
        "4. Funil comercial próprio (leads e negócios). Projects por último: já está ligado ao pedido.")),
  );
}
