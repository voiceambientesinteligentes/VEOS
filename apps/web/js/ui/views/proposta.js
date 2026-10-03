// PROPOSTA COMERCIAL em PDF com a identidade da VOICE, a partir do orcamento do Zoho Books
// (espelho): secoes do proprio orcamento, descricoes, termos e notas escritos pela VOICE no Zoho.
// Custo e margem nunca aparecem. Envio: rascunho de e-mail ou WhatsApp + botao (envio humano).
import { condicaoSugerida } from "../../domain/condicao.js";
import { parametros } from "../../domain/formulario_cfo.js";
import { api } from "../../data/api.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { agruparItens, rascunhosEnvio, telefoneWhatsApp, totaisProposta } from "../../domain/proposta.js";
import { clear, errorNotice, field, h, panel, s, stamp, table } from "../dom.js";
import { botaoCaixaSaida } from "./mensagens.js";

const brl = (v) => formatBRL(String(Number(v ?? 0).toFixed(2)));
const qtd = (v) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const STATUS = { draft: ["Rascunho", "neutral"], sent: ["Enviado", "live"], accepted: ["Aceito", "ok"], declined: ["Recusado", "risk"], expired: ["Expirado", "neutral"], invoiced: ["Faturado", "ok"] };
const endereco = (e) => (e ? [e.address, e.street2, [e.city, e.state].filter(Boolean).join(" - "), e.zip].filter(Boolean).join(", ") : "");

// marca VOICE (mesmo desenho do portal), em SVG para sair nitida no PDF
function marca() {
  return s("svg", { viewBox: "0 0 36 36", class: "proposta-marca", "aria-hidden": "true" },
    s("circle", { cx: 18, cy: 18, r: 16.5, fill: "none", stroke: "#a8862f", "stroke-opacity": ".8" }),
    s("circle", { cx: 18, cy: 18, r: 10, fill: "none", stroke: "#2fa3bb", "stroke-opacity": ".7", "stroke-dasharray": "3 3" }),
    s("circle", { cx: 18, cy: 18, r: 3.2, fill: "#a8862f" }),
    s("circle", { cx: 18, cy: 1.5, r: 2, fill: "#ffffff", stroke: "#a8862f", "stroke-width": 1.4 }));
}

export async function telaPropostas(root) {
  const conteudo = h("div", { class: "stack" });
  const busca = h("input", { class: "input", type: "search", placeholder: "Buscar por número ou cliente", "aria-label": "Buscar orçamento" });
  let t;
  busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => desenhar(busca.value), 300); });
  root.append(panel({ title: "Propostas comerciais", subtitle: "Escolha um orçamento do Zoho Books para gerar a proposta em PDF com a identidade da VOICE.", actions: busca }, conteudo));
  async function desenhar(q = "") {
    const d = await api.zohoEspelhoLista("books", "estimates", q, 1);
    clear(conteudo).append(d.linhas.length
      ? table({ caption: "Orçamentos", head: ["Orçamento", "Cliente", "Data", "Total", "Situação"], align: ["", "", "", "r", ""],
        rows: d.linhas.map((l) => [h("a", { href: `#/propostas/${l.id}` }, l.campos?.estimate_number ?? l.nome), l.campos?.customer_name ?? "—", l.campos?.date ? formatDate(l.campos.date) : "—",
          l.campos?.total !== undefined ? brl(l.campos.total) : "—", stamp(...(STATUS[l.campos?.status] ?? [l.campos?.status ?? "—", "neutral"]))]) })
      : h("p", { class: "result-empty" }, "Nenhum orçamento encontrado no espelho do Zoho."));
  }
  await desenhar();
}

/** Totais por grupo (CDC art. 40: discriminar mao de obra, materiais e equipamentos) sem preco unitario. */
function gruposGlobais(linhas, tipos) {
  const g = { "Equipamentos e materiais": 0, "Mão de obra (instalação, configuração e programação)": 0, "Outros": 0 };
  for (const l of linhas) {
    const t = tipos.get(String(l.item_id ?? "")) ?? (/instala|configura|m[aã]o de obra|programa/i.test(l.name ?? "") ? "service" : "goods");
    g[t === "service" ? "Mão de obra (instalação, configuração e programação)" : t === "goods" ? "Equipamentos e materiais" : "Outros"] += Number(l.item_total) || 0;
  }
  return Object.entries(g).filter(([, v]) => v > 0);
}

export async function telaProposta(root, id) {
  const { dados: e } = await api.zohoEspelhoRegistro("books", "estimates", id);
  let cli = {};
  if (e.customer_id) { try { cli = (await api.zohoEspelhoRegistro("books", "contacts", String(e.customer_id))).dados ?? {}; } catch { cli = {}; } }
  const secoes = agruparItens(e.line_items);
  // tipo de cada item (produto/servico) e custo dos produtos: so direcao/financas leem; sem acesso, segue sem
  let tipos = new Map(), custoProdutos = 0, ptax = null, pForm = null;
  try {
    const [orcs, cb, f] = await Promise.all([api.cfoOrcamentos(), api.cfoCambio().catch(() => ({ serie: [] })), api.cfoFormulario().catch(() => null)]);
    const este = orcs.orcamentos.find((x) => x.numero === e.estimate_number);
    for (const [i, l] of (este?.linhas ?? []).entries()) { const li = e.line_items[i]; if (li) tipos.set(String(li.item_id ?? ""), l.tipo); if (l.tipo === "goods" && Number(l.custo) > 1) custoProdutos += Number(l.custo) * (Number(l.qtd) || 0); }
    ptax = cb.serie?.length ? cb.serie[cb.serie.length - 1] : null;
    pForm = f ? parametros(f.respostas) : null;
  } catch { /* vendas: sem custos */ }
  const tot = totaisProposta(e);
  const contatoCli = (cli.contact_persons ?? []).find((c) => c.is_primary_contact) ?? (cli.contact_persons ?? [])[0] ?? {};
  const emailCli = cli.email || contatoCli.email || "";
  const foneCli = cli.mobile || contatoCli.mobile || cli.phone || contatoCli.phone || "";

  const cond = condicaoSugerida({ custoProdutos, total: tot.total, entradaMinima: pForm?.entradaPct ?? 40, validadeDias: pForm?.validadeDias ?? 7, ptax });
  const campo = (idc, rot, valor = "", attrs = {}, dica) => field(idc, rot, h("input", { class: "input", id: idc, type: "text", autocomplete: "off", value: valor, ...attrs }), dica);
  const area = (idc, rot, valor = "", dica) => field(idc, rot, h("textarea", { class: "input", id: idc, rows: 4 }, valor), dica);
  const v = (x) => document.getElementById(x)?.value?.trim() ?? "";
  const doc = h("article", { class: "contrato-doc proposta-doc" });

  function montar() {
    const linhasSecao = (sec) => [
      secoes.length > 1 || sec.secao !== "Itens" ? h("h3", { class: "proposta-secao" }, sec.secao) : null,
      h("table", { class: "contrato-tabela" },
        h("thead", null, h("tr", null, ["Item", "Qtd", "Valor unit.", "Total"].map((t, i) => h("th", { class: i ? "r" : null }, t)))),
        h("tbody", null, sec.itens.map((i) => h("tr", null,
          h("td", null, h("strong", null, i.nome), i.descricao ? h("div", { class: "proposta-desc" }, i.descricao) : null),
          h("td", { class: "r" }, `${qtd(i.quantidade)}${i.unidade ? ` ${i.unidade}` : ""}`), h("td", { class: "r" }, brl(i.unitario)), h("td", { class: "r" }, brl(i.total))))),
        secoes.length > 1 ? h("tfoot", null, h("tr", null, h("td", { colspan: 3 }, `Subtotal ${sec.secao}`), h("td", { class: "r" }, brl(sec.subtotal)))) : null),
    ];
    const global = v("pp-formato") !== "detalhado";
    const blocoEscopo = global
      ? [...secoes.flatMap((sec) => [
          secoes.length > 1 || sec.secao !== "Itens" ? h("h3", { class: "proposta-secao" }, sec.secao) : null,
          h("table", { class: "contrato-tabela" },
            h("thead", null, h("tr", null, h("th", null, "Item"), h("th", { class: "r" }, "Qtd"))),
            h("tbody", null, sec.itens.map((i) => h("tr", null, h("td", null, h("strong", null, i.nome), i.descricao ? h("div", { class: "proposta-desc" }, i.descricao) : null), h("td", { class: "r" }, `${qtd(i.quantidade)}${i.unidade ? ` ${i.unidade}` : ""}`)))))]),
        h("table", { class: "contrato-tabela" }, h("tbody", null, gruposGlobais(e.line_items, tipos).map(([g, val]) => h("tr", null, h("td", null, g), h("td", { class: "r" }, brl(val))))))]
      : secoes.flatMap(linhasSecao);
    clear(doc).append(...[
      h("header", { class: "proposta-topo" }, marca(), h("div", null, h("p", { class: "proposta-empresa" }, v("pp-emp")), h("p", { class: "proposta-dados" }, [v("pp-cnpj") && `CNPJ ${v("pp-cnpj")}`, v("pp-end"), v("pp-contato")].filter(Boolean).join(" · "))),
        h("div", { class: "proposta-num" }, h("span", null, "Proposta"), h("strong", null, e.estimate_number ?? ""), h("span", null, v("pp-data") ? formatDate(v("pp-data")) : ""))),
      h("h1", null, v("pp-titulo") || "Proposta comercial"),
      h("section", { class: "proposta-cliente" },
        h("p", null, h("strong", null, "Cliente: "), e.customer_name ?? ""),
        endereco(e.shipping_address) || endereco(e.billing_address) ? h("p", null, h("strong", null, "Local: "), endereco(e.shipping_address) || endereco(e.billing_address)) : null,
        e.reference_number ? h("p", null, h("strong", null, "Referência: "), e.reference_number) : null),
      v("pp-intro") ? h("div", { class: "zoho-texto" }, v("pp-intro")) : null,
      h("h2", null, "Escopo e investimento"),
      ...blocoEscopo,
      h("table", { class: "contrato-tabela proposta-totais" }, h("tbody", null,
        tot.desconto ? h("tr", null, h("td", null, "Subtotal"), h("td", { class: "r" }, brl(tot.subtotal))) : null,
        tot.desconto ? h("tr", null, h("td", null, "Desconto"), h("td", { class: "r" }, `− ${brl(tot.desconto)}`)) : null,
        tot.impostos ? h("tr", null, h("td", null, "Impostos destacados"), h("td", { class: "r" }, brl(tot.impostos))) : null,
        tot.ajuste ? h("tr", null, h("td", null, "Ajuste"), h("td", { class: "r" }, brl(tot.ajuste))) : null,
        h("tr", { class: "proposta-total" }, h("td", null, "Investimento total"), h("td", { class: "r" }, brl(tot.total))))),
      h("h2", null, "Condições"),
      v("pp-pag") ? h("p", null, h("strong", null, "Pagamento: "), v("pp-pag")) : h("p", { class: "contrato-modelo" }, "[Condições de pagamento a preencher]"),
      v("pp-prazo") ? h("p", null, h("strong", null, "Prazo: "), v("pp-prazo")) : null,
      h("p", null, h("strong", null, "Validade da proposta: "), v("pp-validade") ? formatDate(v("pp-validade")) : "____/____/______"),
      v("pp-termos") ? h("div", { class: "zoho-texto" }, v("pp-termos")) : null,
      h("div", { class: "contrato-assinaturas" }, h("div", null, h("span", null, "VOICE"), h("span", null, v("pp-contato"))), h("div", null, h("span", null, "DE ACORDO (CLIENTE)"), h("span", null, e.customer_name ?? ""))),
      h("p", { class: "contrato-rodape" }, `Orçamento ${e.estimate_number ?? ""} (Zoho Books) · gerado pelo VEOS em ${formatDateTime(new Date().toISOString())}.`)].filter(Boolean));
  }

  const imprimir = h("button", { class: "btn btn-primary", type: "button" }, "Imprimir / salvar em PDF");
  imprimir.addEventListener("click", () => { montar(); window.print(); });
  const envio = h("div", { class: "stack-s" });
  function desenharEnvio() {
    const r = rascunhosEnvio({ numero: e.estimate_number ?? "", cliente: (contatoCli.first_name || e.customer_name || "").trim(), total: tot.total, validade: v("pp-validade"), contato: v("pp-contato") });
    const tel = telefoneWhatsApp(foneCli);
    clear(envio).append(
      h("p", { class: "field-hint" }, "1. Salve o PDF (botão acima). 2. Abra o rascunho, anexe o PDF, revise e envie. O VEOS não envia nada sozinho."),
      h("div", { class: "row" },
        h("a", { class: "btn btn-ghost", href: `mailto:${encodeURIComponent(emailCli)}?subject=${encodeURIComponent(r.assunto)}&body=${encodeURIComponent(r.corpo)}` }, emailCli ? `E-mail para ${emailCli}` : "Rascunho de e-mail"),
        h("a", { class: "btn btn-ghost", href: `https://wa.me/${tel}?text=${encodeURIComponent(r.whatsapp)}`, target: "_blank", rel: "noopener noreferrer" }, tel ? "WhatsApp do cliente" : "WhatsApp (escolher contato)")),
      h("div", { class: "row" },
        botaoCaixaSaida({ canal: "email", destinatario: emailCli || null, assunto: r.assunto, corpo: r.corpo, origem: `proposta:${id}` }, "Guardar e-mail na caixa de saída"),
        botaoCaixaSaida({ canal: "whatsapp", destinatario: foneCli || null, corpo: r.whatsapp, origem: `proposta:${id}` }, "Guardar WhatsApp na caixa de saída")),
      h("details", { class: "rascunho" }, h("summary", null, "Ver texto do e-mail"), h("pre", { class: "rascunho-corpo" }, `${r.assunto}\n\n${r.corpo}`)));
  }
  const form = panel({ title: `Proposta do orçamento ${e.estimate_number ?? ""}`, subtitle: `${e.customer_name ?? ""} · ${brl(tot.total)} · confira, complete e gere o PDF.` },
    h("div", { class: "form-grid" },
      campo("pp-titulo", "Título", e.subject || `Automação para ${e.customer_name ?? "o seu ambiente"}`),
      campo("pp-data", "Data", e.date ?? new Date().toISOString().slice(0, 10), { type: "date" }),
      campo("pp-validade", "Validade", e.expiry_date ?? cond.validade ?? "", { type: "date" }, "Curta para itens importados (o CDC presume 10 dias se não estiver escrita)."),
      field("pp-formato", "Formato", h("select", { class: "select", id: "pp-formato" }, h("option", { value: "global" }, "Global: itens com quantidade e totais por grupo"), h("option", { value: "detalhado" }, "Detalhado: preço de cada item")), "O CDC pede mão de obra e materiais separados; o global mostra só os totais de cada grupo."),
      campo("pp-pag", "Condições de pagamento", cond.texto || (e.payment_terms_label ?? ""), {}, cond.texto ? "Sugerida pelo CFO: sinal cobre o material, etapas, validade e dólar do dia. Ajuste se precisar." : "Preencha conforme a negociação."),
      campo("pp-prazo", "Prazo de execução"),
      campo("pp-contato", "Responsável VOICE", e.salesperson_name ?? ""),
      campo("pp-emp", "Empresa", "VOICE Ambientes Inteligentes"), campo("pp-cnpj", "CNPJ", "12.323.599/0001-83"), campo("pp-end", "Endereço", "Balneário Camboriú/SC")),
    area("pp-intro", "Apresentação (opcional)", ""),
    area("pp-termos", "Termos e observações", [e.notes, e.terms].filter(Boolean).join("\n\n"), "Vêm das notas e termos do orçamento no Zoho; ajuste se precisar."),
    h("div", { class: "row" }, imprimir));
  form.classList.add("nao-imprimir");
  const painelEnvio = panel({ title: "Enviar ao cliente", subtitle: emailCli || foneCli ? `Contato do Zoho: ${[emailCli, foneCli].filter(Boolean).join(" · ")}` : "Cliente sem e-mail/telefone no Zoho." }, envio);
  painelEnvio.classList.add("nao-imprimir");
  form.addEventListener("input", () => { montar(); desenharEnvio(); });
  root.append(h("p", { class: "nao-imprimir" }, h("a", { href: "#/propostas" }, "‹ Propostas")), form, painelEnvio, doc);
  montar();
  desenharEnvio();
  if (!secoes.length) root.prepend(errorNotice("Este orçamento não tem itens no espelho do Zoho."));
}
