// CATALOGO DE PRODUTOS do VEOS: grade com fotos, ficha completa (nomes, variantes de origem,
// ficha tecnica, compras, vinculos com o Zoho, historico de precos) e revisao de duplicados.
// Preco de compra = ultimo preco pago (sem frete/impostos). Preco de venda: so com alcada.
import { api } from "../../data/api.js";
import { parseMoneyInput } from "../../domain/controls.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { custoAquisicao, precoSugerido } from "../../domain/preco.js";
import { clear, errorNotice, field, h, method, panel, stamp, stat, table } from "../dom.js";

const brl = (v) => (v === null || v === undefined || v === "" ? "—" : formatBRL(String(Number(v).toFixed(2))));
const SIT = { ativo: ["Ativo", "ok"], inativo: ["Inativo", "neutral"], revisar: ["Conferir agrupamento", "warn"] };
const foto = (url, alt, cls = "produto-foto") => (url ? h("img", { src: url, alt, class: cls, loading: "lazy" }) : h("div", { class: `${cls} produto-sem-foto`, role: "img", "aria-label": "sem foto" }, "sem foto"));

export async function telaProdutos(root) {
  const busca = h("input", { class: "input", type: "search", placeholder: "Nome, código, marca ou modelo", "aria-label": "Buscar produto" });
  const sit = h("select", { class: "select", "aria-label": "Situação" }, h("option", { value: "" }, "Todas"), Object.entries(SIT).map(([k, [r]]) => h("option", { value: k }, r)));
  const conteudo = h("div", { class: "stack" });
  let pagina = 1, t;
  async function desenhar() {
    const d = await api.produtos({ busca: busca.value, situacao: sit.value, pagina });
    const paginas = Math.max(1, Math.ceil(d.total / 60));
    const nav = h("div", { class: "row" });
    if (pagina > 1) { const b = h("button", { class: "btn btn-ghost", type: "button" }, "‹ Anteriores"); b.addEventListener("click", () => { pagina--; desenhar(); }); nav.append(b); }
    nav.append(h("span", { class: "field-hint" }, `Página ${pagina} de ${paginas} · ${d.total} produto(s)`));
    if (pagina < paginas) { const b = h("button", { class: "btn btn-ghost", type: "button" }, "Próximos ›"); b.addEventListener("click", () => { pagina++; desenhar(); }); nav.append(b); }
    clear(conteudo).append(
      d.produtos.length
        ? h("ul", { class: "produtos-grade list-plain" }, d.produtos.map((p) => h("li", null, h("a", { class: "produto-cartao", href: `#/produtos/${p.id}` },
          foto(p.foto, p.nome),
          h("span", { class: "produto-codigo" }, p.codigo),
          h("strong", { class: "produto-nome" }, p.nome),
          h("span", { class: "field-hint" }, [p.marca, p.modelo].filter(Boolean).join(" · ") || " "),
          h("span", { class: "produto-precos" }, `Compra ${brl(p.custo_ultimo)}`, h("br"), p.preco_venda ? `Venda ${brl(p.preco_venda)}` : "Venda: não definido"),
          h("span", { class: "row" }, p.situacao !== "ativo" ? stamp(...SIT[p.situacao]) : null, p.duplicados_a_revisar ? stamp(`${p.duplicados_a_revisar} duplicado(s) a revisar`, "warn") : null)))))
        : h("p", { class: "result-empty" }, "Nenhum produto encontrado."),
      nav);
  }
  busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { pagina = 1; desenhar(); }, 300); });
  sit.addEventListener("change", () => { pagina = 1; desenhar(); });
  root.append(panel({ title: "Catálogo de produtos", subtitle: "Catálogo próprio do VEOS. Preço de compra = último preço pago (sem frete e impostos de importação).",
    actions: h("div", { class: "row" }, h("a", { class: "btn btn-ghost", href: "#/produtos/revisao" }, "Revisar duplicados"), busca, sit) }, conteudo));
  await desenhar();
}

function painelPreco(d, recarregar) {
  const p = d.produto;
  const saida = h("div", { role: "status" });
  const inp = (id, rot, dica) => field(id, rot, h("input", { class: "input num", id, inputmode: "decimal", autocomplete: "off" }), dica);
  const resultado = h("div", { class: "stack-s" });
  const ler = (id) => document.getElementById(id)?.value?.trim() ?? "";
  const calc = () => {
    const custo = custoAquisicao(p.custo_ultimo, parseMoneyInput(ler("pr-frete") || "0"), parseMoneyInput(ler("pr-imp") || "0"));
    const r = precoSugerido(custo, ler("pr-dv"), ler("pr-df"), ler("pr-ml"));
    clear(resultado).append(
      h("p", null, "Custo de aquisição considerado: ", h("strong", null, brl(custo)), ler("pr-frete") || ler("pr-imp") ? "" : " (sem frete/impostos: informe para não subestimar)"),
      r ? h("p", null, `Markup ${String(r.markup).replace(".", ",")} → preço sugerido `, h("strong", null, brl(r.preco)), " (simulação)")
        : h("p", { class: "field-hint" }, "Preencha DV, DF e ML (a soma precisa ser menor que 100%)."));
    return r;
  };
  const form = h("div", { class: "form-grid" },
    inp("pr-frete", "Frete por unidade (R$)", "Rateio do frete da compra."), inp("pr-imp", "Impostos de importação por unidade (R$)", "Ex.: imposto de importação e ICMS pagos."),
    inp("pr-dv", "DV · despesas variáveis (%)", "Impostos sobre a venda, comissão, taxas de cartão."), inp("pr-df", "DF · despesas fixas (%)", "Despesas fixas ÷ faturamento médio."), inp("pr-ml", "ML · margem de lucro (%)", "Meta desejada."));
  form.addEventListener("input", calc);
  const definir = h("button", { class: "btn btn-primary", type: "button" }, "Registrar como preço de venda");
  definir.addEventListener("click", async () => {
    const r = calc();
    if (!r) return saida.append(errorNotice("Complete a simulação antes."));
    const motivo = prompt(`Registrar ${brl(r.preco)} como preço de venda? Informe a base (ex.: markup Sebrae DV x DF y ML z):`, `Markup Sebrae: DV ${ler("pr-dv")}% DF ${ler("pr-df")}% ML ${ler("pr-ml")}% sobre custo de aquisição`);
    if (!motivo) return;
    try { await api.produtoPreco(p.id, { campo: "preco_venda", valor: r.preco.toFixed(2), motivo }); await recarregar("Preço de venda registrado (histórico guardado)."); } catch (e) { saida.append(errorNotice(e.message)); }
  });
  calc();
  return panel({ title: "Formação de preço (simulação)", subtitle: "Método de markup do Sebrae: Markup = 100 ÷ [100 − (DV + DF + ML)]. Os percentuais da VOICE ainda não estão definidos." },
    h("div", { class: "grid-4" }, stat("Último preço pago", brl(p.custo_ultimo), p.custo_data ? `em ${formatDate(p.custo_data)}` : ""), stat("Menor / maior pago", `${brl(p.custo_min)} / ${brl(p.custo_max)}`),
      stat("Preço de venda", p.preco_venda ? brl(p.preco_venda) : "não definido", p.preco_venda ? "" : "lacuna: definir com a alçada"), stat("Margem bruta", p.preco_venda && p.custo_ultimo ? `${(((p.preco_venda - p.custo_ultimo) / p.preco_venda) * 100).toFixed(1).replace(".", ",")}%` : "—", "sobre o último preço pago")),
    form, resultado, d.pode.preco ? h("div", { class: "row" }, definir) : h("p", { class: "field-hint" }, "Só a direção registra preço de venda (proposta de alçada na Biblioteca)."), saida,
    method("Fonte e cuidados", "Sebrae: formação de preço por markup (despesas variáveis, fixas e margem de lucro em % do preço).", "O preço pago no AliExpress não inclui frete nem impostos de importação: o custo real é maior.",
      "A margem de contribuição oficial da Política V1 continua sendo conferida na Negociação ao Vivo."));
}

function painelDuplicados(d, recarregar) {
  const saida = h("div", { role: "status" });
  const linhas = d.vinculos.map((v) => {
    const acoes = h("div", { class: "row" });
    if (d.pode.duplicados && v.situacao === "a_revisar") {
      for (const [pref, rot] of [["novo", "É o mesmo: fica o novo"], ["ambos", "É o mesmo: manter os dois"]]) {
        const b = h("button", { class: "btn btn-ghost", type: "button" }, rot);
        b.addEventListener("click", async () => { try { await api.produtoVinculo(v.id, { situacao: "confirmado", preferencia: pref }); await recarregar("Decisão registrada."); } catch (e) { saida.append(errorNotice(e.message)); } });
        acoes.append(b);
      }
      const nao = h("button", { class: "btn btn-ghost", type: "button" }, "Não é o mesmo");
      nao.addEventListener("click", async () => { try { await api.produtoVinculo(v.id, { situacao: "descartado" }); await recarregar("Registrado: são produtos diferentes."); } catch (e) { saida.append(errorNotice(e.message)); } });
      acoes.append(nao);
    }
    return h("li", { class: "panel panel-tight stack-s" },
      h("div", { class: "row" }, stamp(v.relacao === "mesmo_produto" ? "Mesmo produto" : "Possível duplicado", v.relacao === "mesmo_produto" ? "live" : "warn"),
        stamp(v.situacao === "a_revisar" ? "A revisar" : v.situacao === "confirmado" ? `Confirmado · fica ${v.preferencia === "novo" ? "o novo" : v.preferencia === "antigo" ? "o antigo" : "os dois"}` : "Descartado", v.situacao === "a_revisar" ? "warn" : "ok")),
      h("p", null, h("strong", null, "Item do Zoho: "), v.zoho ? `${v.zoho.nome}${v.zoho.sku ? ` · ${v.zoho.sku}` : ""} · compra ${brl(v.zoho.compra)} · venda ${brl(v.zoho.venda)}` : v.zoho_item_id, " ",
        h("a", { href: `#/zoho/books/items/${v.zoho_item_id}` }, "abrir")),
      h("p", { class: "field-hint" }, v.evidencia), acoes);
  });
  return panel({ title: "Itens parecidos no Zoho", subtitle: "Duplicado certo (mesmo anúncio): preferência pelo cadastro novo. Só nome parecido: os dois ficam até você decidir." },
    linhas.length ? h("ul", { class: "list-plain stack-s" }, linhas) : h("p", { class: "result-empty" }, "Nenhum item parecido no Zoho."), saida);
}

export async function telaProduto(root, id) {
  async function desenhar(msg) {
    const d = await api.produto(id);
    const p = d.produto;
    const recarregar = (m) => desenhar(m);
    const nomeEd = h("input", { class: "input", id: "pd-nome", value: p.nome });
    const descEd = h("textarea", { class: "input", id: "pd-desc", rows: 3 }, p.descricao ?? "");
    const catEd = h("input", { class: "input", id: "pd-cat", value: p.categoria ?? "" });
    const sitEd = h("select", { class: "select", id: "pd-sit" }, Object.entries(SIT).map(([k, [r]]) => h("option", { value: k, selected: k === p.situacao }, r)));
    const saida = h("div", { role: "status" });
    const salvar = h("button", { class: "btn btn-ghost", type: "button" }, "Salvar dados");
    salvar.addEventListener("click", async () => {
      try { await api.produtoEditar(p.id, { nome: nomeEd.value, descricao: descEd.value, categoria: catEd.value, situacao: sitEd.value }); await desenhar("Dados salvos."); } catch (e) { saida.append(errorNotice(e.message)); }
    });
    const fichaUnica = [];
    const vistos = new Set();
    for (const f of d.fontes) for (const a of f.ficha ?? []) { const k = `${a.atributo}=${a.valor}`; if (!vistos.has(k)) { vistos.add(k); fichaUnica.push(a); } }
    clear(root).append(...[
      h("p", null, h("a", { href: "#/produtos" }, "‹ Catálogo")),
      msg ? h("p", { class: "notice notice-ok", role: "status" }, msg) : null,
      panel({ title: `${p.codigo} · ${p.nome}`, subtitle: [p.marca, p.modelo, p.unidade].filter(Boolean).join(" · "), actions: stamp(...SIT[p.situacao]) },
        h("div", { class: "produto-topo" }, foto(p.foto, p.nome, "produto-foto produto-foto-grande"),
          h("div", { class: "stack-s produto-dados" },
            d.pode.editar ? h("div", { class: "form-grid" }, field(nomeEd.id, "Nome interno", nomeEd), field(catEd.id, "Categoria", catEd), field(sitEd.id, "Situação", sitEd)) : null,
            d.pode.editar ? field(descEd.id, "Descrição (aparece na proposta)", descEd) : (p.descricao ? h("p", null, p.descricao) : null),
            d.pode.editar ? h("div", { class: "row" }, salvar) : null, saida,
            h("p", { class: "field-hint" }, `Origem: ${p.origem}${p.zoho_item_id ? ` · item do Zoho ${p.zoho_item_id}` : " · ainda não está no Zoho"}`)))),
      painelPreco(d, recarregar),
      panel({ title: `Anúncios e variantes de origem (${d.fontes.length})`, subtitle: "Nome do fornecedor exatamente como no pedido. Um produto pode ter vários anúncios/fornecedores." },
        h("ul", { class: "list-plain stack-s" }, d.fontes.map((f) => h("li", { class: "panel panel-tight produto-fonte" },
          foto(f.foto, f.variante ?? f.sku_interno, "produto-foto produto-foto-mini"),
          h("div", { class: "stack-s" },
            h("div", { class: "row" }, h("strong", null, f.sku_interno), f.variante ? stamp(f.variante, "neutral") : null, f.agrupamento_a_confirmar ? stamp("Conferir foto", "warn") : null,
              /removido|não está mais/i.test(f.situacao_anuncio ?? "") ? stamp("Anúncio removido", "risk") : null),
            h("p", null, f.nome_fornecedor ?? ""),
            h("p", { class: "field-hint" }, [f.fornecedor, f.ultimo_preco ? `último ${brl(f.ultimo_preco)} em ${f.ultima_compra ? formatDate(f.ultima_compra) : "—"}` : null, f.qtd_total ? `${f.qtd_total} comprado(s) em ${f.n_pedidos ?? "?"} pedido(s)` : null].filter(Boolean).join(" · ")),
            h("div", { class: "row" }, f.link ? h("a", { href: f.link, target: "_blank", rel: "noopener noreferrer" }, "Anúncio") : null, f.link_alternativo ? h("a", { href: f.link_alternativo, target: "_blank", rel: "noopener noreferrer" }, "Anúncio alternativo") : null),
            f.descricao ? h("details", { class: "method" }, h("summary", null, "Descrição do fornecedor"), h("div", { class: "zoho-texto" }, f.descricao)) : null))))),
      panel({ title: `Ficha técnica (${fichaUnica.length})`, subtitle: "Da página do anúncio (ou do retrato do pedido quando o anúncio foi removido)." },
        fichaUnica.length ? table({ caption: "Ficha técnica", head: ["Atributo", "Valor"], rows: fichaUnica.map((a) => [a.atributo, a.valor ?? "—"]) }) : h("p", { class: "result-empty" }, "Sem ficha técnica.")),
      painelDuplicados(d, recarregar),
      panel({ title: `Compras de origem (${d.compras.length})` },
        table({ caption: "Pedidos", head: ["Data", "Pedido", "Loja", "Variante", "Qtd", "Preço unit.", "Situação"], align: ["", "", "", "", "r", "r", ""],
          rows: d.compras.map((c) => [c.data ? formatDate(c.data) : "—", c.pedido, c.loja ?? "—", c.variante ?? "—", String(c.quantidade ?? "—"), brl(c.preco_unit), c.status ?? "—"]) })),
      panel({ title: "Histórico de preços", subtitle: "Não pode ser alterado." },
        table({ caption: "Histórico", head: ["Quando", "Campo", "De", "Para", "Quem", "Motivo"], rows: d.historico.map((x) => [formatDateTime(x.em), x.campo === "preco_venda" ? "Venda" : "Compra", brl(x.de), brl(x.para), x.quem, x.motivo ?? ""]) })),
    ].filter(Boolean));
  }
  await desenhar();
}

export async function telaRevisaoProdutos(root) {
  async function desenhar(msg) {
    const d = await api.produtosRevisao();
    const porProduto = new Map();
    for (const v of d.vinculos) { const k = v.produto.id; if (!porProduto.has(k)) porProduto.set(k, { produto: v.produto, foto: v.foto, vinculos: [] }); porProduto.get(k).vinculos.push(v); }
    const saida = h("div", { role: "status" });
    clear(root).append(...[
      h("p", null, h("a", { href: "#/produtos" }, "‹ Catálogo")),
      msg ? h("p", { class: "notice notice-ok", role: "status" }, msg) : null,
      panel({ title: `Possíveis duplicados (${porProduto.size} produto(s))`, subtitle: "Os dois cadastros ficam até você decidir. Abra o item do Zoho para comparar." },
        porProduto.size ? h("ul", { class: "list-plain stack-s" }, [...porProduto.values()].map((g) => h("li", { class: "panel panel-tight produto-fonte" },
          foto(g.foto, g.produto.nome, "produto-foto produto-foto-mini"),
          h("div", { class: "stack-s" }, h("a", { href: `#/produtos/${g.produto.id}` }, h("strong", null, `${g.produto.codigo} · ${g.produto.nome}`)),
            h("ul", { class: "list-plain stack-s" }, g.vinculos.map((v) => {
              const acoes = h("span", { class: "row" });
              for (const [sit, pref, rot] of [["confirmado", "novo", "Mesmo: fica o novo"], ["confirmado", "ambos", "Mesmo: manter os dois"], ["descartado", null, "Não é o mesmo"]]) {
                const b = h("button", { class: "btn btn-ghost", type: "button" }, rot);
                b.addEventListener("click", async () => { try { await api.produtoVinculo(v.id, { situacao: sit, preferencia: pref }); await desenhar("Decisão registrada."); } catch (e) { saida.append(errorNotice(e.message)); } });
                acoes.append(b);
              }
              return h("li", null, h("span", null, "Zoho: ", h("a", { href: `#/zoho/books/items/${v.zoho_item_id}` }, v.zoho?.nome ?? v.zoho_item_id), ` · ${v.evidencia}`), acoes);
            })))))) : h("p", { class: "notice notice-ok" }, "Nada a revisar."),
        saida),
      panel({ title: `Agrupamentos a conferir pela foto (${d.agrupamentos.length})`, subtitle: "Anúncios diferentes juntados no mesmo código por modelo/aparência. Abra e confira as fotos das variantes; depois marque como Ativo." },
        d.agrupamentos.length ? h("ul", { class: "produtos-grade list-plain" }, d.agrupamentos.map((p) => h("li", null, h("a", { class: "produto-cartao", href: `#/produtos/${p.id}` }, foto(p.foto, p.nome), h("span", { class: "produto-codigo" }, p.codigo), h("strong", { class: "produto-nome" }, p.nome)))))
          : h("p", { class: "notice notice-ok" }, "Nada a conferir.")),
    ].filter(Boolean));
  }
  await desenhar();
}
