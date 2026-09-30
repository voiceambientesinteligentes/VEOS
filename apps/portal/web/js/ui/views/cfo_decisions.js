// Aba da sala CFO: decisoes financeiras locais (append-only, cadeia SHA-256).
// Toda gravacao exige acao explicita do usuario; nada e aprovado, executado,
// transferido, faturado, enviado ou pago. Autoria declarada, nao autenticada.

import { api } from "../../data/api.js";
import { formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, method, panel, stamp, table } from "../dom.js";

const TIPOS = [
  ["geral", "Geral / briefing"],
  ["desconto", "Desconto"],
  ["ticket", "Ticket"],
  ["fases", "Cobertura por fase"],
  ["reserva", "Reserva"],
  ["indicadores", "Indicadores"],
];
const ESTADOS = [
  ["proposto", "Proposto"],
  ["registrado_pelo_usuario", "Registrado pelo usuário"],
  ["rejeitado", "Rejeitado"],
];
const ESTADO_TONE = { proposto: "live", registrado_pelo_usuario: "ok", rejeitado: "risk" };

export function mountDecisions(box, ctx) {
  let entrada = { periodo: ctx.forms.periodo_atual };
  const listBox = h("div");
  const status = h("p", { class: "field-hint", role: "status", "aria-live": "polite" });
  const tipo = h("select", { class: "select", id: "dc-tipo" }, TIPOS.map(([v, l]) => h("option", { value: v }, l)));
  const estado = h("select", { class: "select", id: "dc-estado" }, ESTADOS.map(([v, l]) => h("option", { value: v }, l)));
  const refere = h("select", { class: "select", id: "dc-ref" }, h("option", { value: "" }, "—"));
  const assunto = h("input", { class: "input", id: "dc-assunto", maxlength: "200", autocomplete: "off" });
  const motivo = h("textarea", { class: "textarea", id: "dc-motivo", maxlength: "2000" });
  const autor = h("input", { class: "input", id: "dc-autor", maxlength: "80", autocomplete: "off" });
  const deps = h("textarea", { class: "textarea", id: "dc-deps", rows: 2, placeholder: "Uma dependência por linha (ex.: autorização da direção)" });
  const entradaView = h("pre", { class: "mono" });
  const confirm = h("input", { type: "checkbox", id: "dc-confirm" });
  const submit = h("button", { class: "btn btn-primary", type: "submit", disabled: true }, "Gravar registro");
  confirm.addEventListener("change", () => { submit.disabled = !confirm.checked; });

  let prefilled = null;
  function showEntrada() {
    entradaView.textContent = JSON.stringify(entrada, null, 2);
  }
  // Decisao sobre calculo exige a entrada do calculo (vinda da aba Controles);
  // geral/indicadores usam o periodo atual.
  tipo.addEventListener("change", () => {
    if (prefilled && prefilled.tipo === tipo.value) entrada = prefilled.entrada;
    else if (tipo.value === "geral" || tipo.value === "indicadores") entrada = { periodo: ctx.forms.periodo_atual };
    else {
      entrada = {};
      status.textContent = "Para este tipo, calcule na aba Controles e use “Registrar decisão sobre este cálculo”.";
    }
    showEntrada();
  });

  const form = h(
    "form",
    { class: "stack-s", novalidate: true },
    h("div", { class: "form-grid" }, field("dc-tipo", "Tipo", tipo), field("dc-estado", "Estado", estado), field("dc-ref", "Resolve a proposta nº", refere, "Somente para registrado/rejeitado."), field("dc-autor", "Autor declarado", autor, "Declaração; o portal não autentica identidade.")),
    field("dc-assunto", "Assunto", assunto),
    field("dc-motivo", "Motivo / justificativa", motivo),
    field("dc-deps", "Dependências", deps),
    method("Contexto calculado que será recalculado pelo servidor e guardado com hash", entradaView),
    h("label", { class: "checkline" }, confirm, "Revisei e este registro é uma ação minha. Ele não aprova, não executa, não transfere, não fatura, não envia e-mail e não paga nada."),
    h("div", { class: "row" }, submit, status),
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm.checked) return;
    submit.disabled = true;
    try {
      const ev = await api.registrarDecisao({
        tipo: tipo.value,
        estado: estado.value,
        refere_seq: refere.value ? Number.parseInt(refere.value, 10) : null,
        assunto: assunto.value,
        motivo: motivo.value,
        autor_declarado: autor.value,
        dependencias: deps.value.split("\n").map((x) => x.trim()).filter(Boolean),
        entrada,
        confirmacao: true,
      });
      status.textContent = `Registro nº ${ev.seq} gravado (hash ${ev.hash.slice(0, 12)}…).`;
      confirm.checked = false;
      motivo.value = "";
      await refresh();
    } catch (err) {
      status.textContent = `Nada foi gravado: ${err.message}`;
    } finally {
      submit.disabled = !confirm.checked;
    }
  });

  async function refresh() {
    clear(listBox);
    let d;
    try {
      d = await api.decisoes();
    } catch (e) {
      listBox.append(errorNotice(e.message));
      return;
    }
    const resolvidas = new Set(d.decisoes.filter((x) => x.refere_seq).map((x) => x.refere_seq));
    clear(refere).append(h("option", { value: "" }, "—"), ...d.decisoes.filter((x) => x.estado === "proposto" && !resolvidas.has(x.seq)).map((x) => h("option", { value: String(x.seq) }, `nº ${x.seq} · ${x.assunto.slice(0, 60)}`)));
    listBox.append(
      panel(
        {
          title: "Registro local",
          subtitle: d.aviso_autoria,
          actions: d.integridade.ok ? stamp(`Cadeia íntegra · ${d.integridade.eventos}`, "ok") : stamp("Integridade violada", "risk"),
        },
        d.integridade.ok ? null : errorNotice(`Registro recusado: ${d.integridade.erro}. Novas gravações ficam bloqueadas.`),
        table({
          head: ["Nº", "Quando", "Tipo", "Estado", "Assunto", "Autor declarado", "Evidência"],
          rows: [...d.decisoes].reverse().map((x) => [
            String(x.seq),
            formatDateTime(x.ts),
            x.tipo,
            stamp(ESTADOS.find((s) => s[0] === x.estado)?.[1] || x.estado, ESTADO_TONE[x.estado]),
            h("span", null, x.assunto, x.refere_seq ? h("span", { class: "muted" }, ` · resolve nº ${x.refere_seq}`) : null),
            x.autor_declarado,
            method("Motivo, dependências e hashes", `Motivo: ${x.motivo}`, x.dependencias.length ? `Dependências: ${x.dependencias.join("; ")}` : null, h("span", { class: "hash" }, `snapshot ${x.snapshot_sha256}`), h("span", { class: "hash" }, `hash ${x.hash}`), h("span", { class: "hash" }, `prev ${x.prev}`), `Registrado no SO por: ${x.registrado_por_so}`),
          ]),
        }),
      ),
    );
  }

  clear(box).append(panel({ title: "Registrar decisão", subtitle: "Proposta, registro do usuário ou rejeição — com motivo, autor declarado e dependências." }, form), listBox);
  showEntrada();
  refresh();

  return {
    prefill(detail) {
      prefilled = { tipo: detail.tipo, entrada: detail.entrada || {} };
      tipo.value = detail.tipo;
      entrada = prefilled.entrada;
      status.textContent = "";
      if (detail.assunto) assunto.value = detail.assunto;
      estado.value = "proposto";
      showEntrada();
      assunto.focus();
    },
  };
}
