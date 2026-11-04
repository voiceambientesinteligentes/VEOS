// COMECAR A OPERAR (#/operar): o caminho da VOICE do zero ao primeiro pedido entregue, com a
// situacao real de cada etapa lida do VEOS (feito / falta) e o botao que abre a ferramenta certa.
// Nao decide nada: mostra o que falta e quem faz.
import { api } from "../../data/api.js";
import { parametros } from "../../domain/formulario_cfo.js";
import { h, panel, stamp } from "../dom.js";

const contar = async (fn) => { try { return await fn(); } catch { return null; } };

export async function telaOperar(root) {
  const corpo = h("div", { class: "stack" });
  root.append(panel({ title: "Começar a operar", subtitle: "Do primeiro contato ao pedido entregue. Cada etapa mostra o que já está feito no VEOS e abre a ferramenta." }, h("p", { class: "muted" }, "Conferindo o que já existe…")), corpo);
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
  const total = etapas.flatMap((g) => g.itens).filter((i) => i.feito !== null);
  const feitos = total.filter((i) => i.feito).length;
  corpo.append(h("p", { class: "notice" }, `${feitos} de ${total.length} etapas verificáveis já têm movimento no VEOS. As demais dependem de um pedido real para começar.`));
  for (const g of etapas) {
    corpo.append(panel({ title: g.grupo }, h("ol", { class: "list-plain stack-s operar-lista" }, g.itens.map((i) => h("li", { class: "panel panel-tight operar-item" },
      h("div", { class: "row" }, i.feito === null ? stamp("acompanhar", "neutral") : i.feito ? stamp("feito", "ok") : stamp("falta", "warn"), h("strong", null, i.t)),
      i.info ? h("p", { class: "field-hint" }, i.info) : null,
      h("div", { class: "row" }, h("span", { class: "field-hint" }, `Quem: ${i.quem}`), h("a", { class: "btn btn-ghost btn-mini", href: i.href }, i.botao)))))));
  }
}
