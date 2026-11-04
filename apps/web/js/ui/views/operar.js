// COMECAR A OPERAR (#/operar): o caminho da VOICE do zero ao primeiro pedido entregue, com a
// situacao real de cada etapa lida do VEOS (feito / falta) e o botao que abre a ferramenta certa.
// Nao decide nada: mostra o que falta e quem faz.
import { api } from "../../data/api.js";
import { parametros } from "../../domain/formulario_cfo.js";
import { h } from "../dom.js";

const contar = async (fn) => { try { return await fn(); } catch { return null; } };

export async function telaOperar(root) {
  const corpo = h("div", { class: "stack" });
  root.append(h("p", { class: "muted" }, "Conferindo o que já existe…"), corpo);
  const [form, clientes, orcs, vendas, mkt, produtos] = await Promise.all([
    contar(() => api.cfoFormulario()), contar(() => api.clientes()), contar(() => api.comercialOrcamentos()),
    contar(() => api.setor("vendas")), contar(() => api.setor("marketing")), contar(() => api.produtos({ situacao: "ativo" })),
  ]);
  root.querySelector(".muted")?.remove();
  const p = form ? parametros(form.respostas) : null;
  const regs = (d, tipo) => (d?.registros ?? []).filter((r) => r.tipo === tipo);
  const o = orcs?.orcamentos ?? null;
  const etapas = [
    { grupo: "Preparar (uma vez)", itens: [
      { t: "Preencher o Formulário do CFO: impostos, cartão, comissão/RT, equipe e custo da hora", feito: p ? !p.lacunas.some((l) => /Alíquota|Custo da hora/.test(l)) : null,
        info: p ? (p.lacunas.length ? `Faltam: ${p.lacunas.slice(0, 4).join("; ")}${p.lacunas.length > 4 ? "…" : ""}` : "Completo.") : "Só a direção/finanças veem.",
        quem: "Fernando (CEO) com o contador", href: "#/cfo/formulario", botao: "Abrir o formulário" },
      { t: "Conferir o catálogo de produtos (fotos, nomes, custo de compra)", feito: produtos ? produtos.total > 0 : null, info: produtos ? `${produtos.total} produtos ativos. Sem preço de tabela, o orçamento usa o preço sugerido pela Política (MC 35%).` : "",
        quem: "COO (compras) e CFO (preço)", href: "#/produtos", botao: "Abrir o catálogo" },
      { t: "Revisar o preço de cada produto e da hora pela Política V1", feito: null, info: "Tela do CFO com custo real de importação, dólar do dia e as faixas 35% / 30% / 25%.", quem: "CFO / direção", href: "#/cfo/precos", botao: "Preço dos produtos" },
      { t: "Dar acesso à equipe (cada pessoa no seu setor)", feito: null, info: "Vendedor no Comercial, técnico em Operações etc. Cada um vê só o que precisa.", quem: "Fernando", href: "#/sistema/usuarios", botao: "Usuários" },
    ] },
    { grupo: "Trazer cliente (todo dia)", itens: [
      { t: "Prospectar e cultivar escritórios de arquitetura e design (o cliente principal da VOICE)", feito: vendas ? regs(vendas, "parceiro").length > 0 : null, info: vendas ? `${regs(vendas, "parceiro").length} escritório(s)/parceiro(s). O arquiteto especifica e indica; o cliente final chega por ele.` : "", quem: "Gestor de parceiros (hoje: CSO)", href: "#/prospeccao", botao: "Prospecção" },
      { t: "Registrar toda indicação e todo contato que chega (arquiteto, Instagram, WhatsApp, site)", feito: vendas ? regs(vendas, "lead").length > 0 : null, info: vendas ? `${regs(vendas, "lead").length} contato(s) registrados.` : "", quem: "SDR (hoje: vendedor)", href: "#/contato", botao: "Contato rápido" },
      { t: "Publicar no Instagram com calendário", feito: mkt ? regs(mkt, "conteudo").length > 0 : null, info: mkt ? `${regs(mkt, "conteudo").length} conteúdo(s) no calendário.` : "", quem: "Produtor de conteúdo (hoje: marketing)", href: "#/conteudo", botao: "Calendário" },
      { t: "Responder no prazo e seguir a cadência (tarefas e rascunhos)", feito: null, info: "O Radar mostra os toques do dia; a Caixa de saída guarda as mensagens prontas.", quem: "Vendedor", href: "#/radar", botao: "Radar" },
    ] },
    { grupo: "Vender", itens: [
      { t: "Cadastrar o cliente", feito: clientes ? clientes.clientes.length > 0 : null, info: clientes ? `${clientes.clientes.length} cliente(s).` : "", quem: "Vendedor", href: "#/clientes?novo=1", botao: "Novo cliente" },
      { t: "Montar o orçamento (ambientes, produtos, mão de obra) e conferir a margem", feito: o ? o.length > 0 : null, info: o ? `${o.length} orçamento(s).` : "", quem: "Orçamentista / vendedor", href: "#/orcamentos/novo", botao: "Novo orçamento" },
      { t: "Retomar os orçamentos antigos do Zoho que não fecharam", feito: o ? o.some((x) => String(x.referencia ?? "").startsWith("Zoho")) : null, info: "Rascunhos, enviados e expirados: cliente criado junto, preço recalculado.", quem: "Vendedor", href: "#/orcamentos?aba=zoho", botao: "Retomar do Zoho" },
      { t: "Gerar a proposta em PDF e enviar (e-mail ou WhatsApp)", feito: o ? o.some((x) => ["enviado", "aceito", "recusado"].includes(x.estado)) : null, info: o ? `${o.filter((x) => x.estado === "enviado").length} enviado(s) aguardando resposta.` : "", quem: "Vendedor", href: "#/orcamentos", botao: "Orçamentos" },
      { t: "Cliente aceitou: gerar o pedido (um clique no orçamento)", feito: o ? o.some((x) => x.estado === "aceito") : null, info: o ? `${o.filter((x) => x.estado === "aceito").length} aceito(s).` : "", quem: "Vendedor + direção (alçada)", href: "#/orcamentos?estado=aceito", botao: "Ver aceitos" },
    ] },
    { grupo: "Entregar e receber", itens: [
      { t: "Parcelas do pedido (entram na previsão de caixa)", feito: null, info: "No pedido: defina as parcelas pela condição combinada.", quem: "CFO / financeiro", href: "#/pedidos", botao: "Pedidos" },
      { t: "Comprar o que falta (faltas de estoque do pedido)", feito: null, info: "Compras com cotação e conta a pagar.", quem: "Comprador (hoje: COO)", href: "#/compras", botao: "Compras" },
      { t: "Contrato, obra, horas e termo de aceite", feito: null, info: "Tudo gerado do pedido, em PDF.", quem: "Gerente de obras", href: "#/pedidos", botao: "Pedidos" },
      { t: "Nota fiscal e recebimento", feito: null, info: "NF emitida no emissor e registrada; recebimento baixa a parcela.", quem: "Financeiro", href: "#/recebimentos", botao: "Recebimentos" },
      { t: "Pós-venda: boas-vindas, NPS, indicação e plano de suporte", feito: null, info: "A cadência de pós-venda começa quando a oportunidade é ganha.", quem: "CXO", href: "#/setor/posvenda", botao: "Pós-venda" },
    ] },
  ];
  const verificaveis = etapas.flatMap((g) => g.itens).filter((i) => i.feito !== null);
  const feitos = verificaveis.filter((i) => i.feito).length;
  const pct = verificaveis.length ? Math.round((feitos / verificaveis.length) * 100) : 0;
  const proximo = etapas.flatMap((g) => g.itens).find((i) => i.feito === false);
  corpo.append(h("div", { class: "op-progresso" },
    h("div", { class: "row" }, h("strong", null, `${feitos} de ${verificaveis.length} etapas com movimento`), h("span", { class: "field-hint" }, `${pct}%`)),
    h("div", { class: "op-barra", role: "progressbar", "aria-valuenow": String(pct), "aria-valuemin": "0", "aria-valuemax": "100" }, h("span", { style: null, dataset: { pct: String(pct) } })),
    proximo ? h("p", null, "Próximo passo: ", h("a", { href: proximo.href }, proximo.t)) : h("p", { class: "field-hint" }, "As etapas que faltam dependem de um pedido real.")));
  // largura da barra sem style inline (a CSP nao permite): classe por faixa de 10%
  corpo.querySelector(".op-barra > span").className = `op-p${Math.round(pct / 10) * 10}`;
  for (const g of etapas) {
    const faltam = g.itens.filter((i) => i.feito === false).length;
    const grupo = h("details", { class: "op-grupo", open: faltam > 0 || g === etapas[0] },
      h("summary", null, h("span", null, g.grupo), h("small", null, faltam ? `${faltam} a fazer` : "em dia")),
      h("div", { class: "op-itens" }, g.itens.map((i) => {
        const estado = i.feito === null ? "acompanhar" : i.feito ? "feito" : "falta";
        return h("div", { class: `op-item ${estado}` },
          h("span", { class: "op-icone", "aria-label": estado }, i.feito ? "✓" : ""),
          h("div", { class: "op-texto" }, h("span", { class: "op-titulo" }, i.t), h("small", null, i.feito ? `Quem: ${i.quem}` : [i.info, `Quem: ${i.quem}`].filter(Boolean).join(" · "))),
          h("a", { class: `btn ${estado === "falta" ? "btn-primary" : "btn-ghost"} btn-mini`, href: i.href }, i.botao));
      })));
    corpo.append(grupo);
  }
}