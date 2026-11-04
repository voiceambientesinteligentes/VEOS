// Proposta comercial a partir do orcamento do Zoho Books (espelho): itens agrupados pelas secoes
// do proprio orcamento (header_name), totais e textos dos rascunhos de envio. Nada de custo de
// compra ou margem entra aqui: e o documento que vai para o cliente.

const n = (v) => Number(v ?? 0);

export function agruparItens(linhas = []) {
  const ordem = [...linhas].sort((a, b) => n(a.item_order) - n(b.item_order));
  const secoes = [];
  for (const [i, l] of ordem.entries()) {
    const nome = (l.header_name ?? "").trim() || "Itens";
    let s = secoes.find((x) => x.secao === nome);
    if (!s) secoes.push((s = { secao: nome, itens: [], subtotal: 0 }));
    s.itens.push({ numero: i + 1, nome: l.name || "Item", descricao: (l.description ?? "").trim(), quantidade: n(l.quantity), unidade: l.unit || "", unitario: n(l.rate), desconto: n(l.discount_amount), total: n(l.item_total) });
    s.subtotal = Math.round((s.subtotal + n(l.item_total)) * 100) / 100;
  }
  return secoes;
}

export function totaisProposta(est) {
  return { subtotal: n(est.sub_total), desconto: n(est.discount_total), impostos: n(est.tax_total), ajuste: n(est.adjustment), total: n(est.total) };
}

/** Itens do orcamento proprio do VEOS (CSO-04) no mesmo formato de linha do Zoho Books, para
 * reaproveitar agruparItens() sem duplicar a logica de secoes/numeracao. O tipo (produto/servico)
 * ja e conhecido por item (nao precisa adivinhar como no orcamento do Zoho). */
export function linhasDoOrcamentoVeos(itens = []) {
  return itens.map((i, k) => ({
    item_order: k + 1, header_name: i.secao ?? "", name: i.nome, description: i.descricao ?? "",
    quantity: n(i.quantidade), unit: i.unidade ?? "", rate: n(i.preco_unit), discount_amount: 0, item_total: Math.round(n(i.quantidade) * n(i.preco_unit) * 100) / 100,
    item_id: i.item_id ?? null, _tipo: i.tipo,
  }));
}

/** Totais do orcamento proprio: nao ha impostos/ajuste destacados (ficam no preco negociado). */
export function totaisDoOrcamentoVeos(orcamento) {
  const total = n(orcamento.valor_total), desconto = n(orcamento.desconto);
  return { subtotal: Math.round((total + desconto) * 100) / 100, desconto, impostos: 0, ajuste: 0, total };
}

const brl = (v) => `R$ ${n(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

/** Textos dos rascunhos (o envio e humano: o VEOS so prepara). */
export function rascunhosEnvio({ numero, cliente, total, validade, contato }) {
  const ate = validade ? ` (válida até ${validade.split("-").reverse().join("/")})` : "";
  const assunto = `Proposta ${numero} · VOICE Ambientes Inteligentes`;
  const corpo = `Olá, ${cliente}!\n\nSegue em anexo a proposta ${numero}${ate}, no valor de ${brl(total)}.\n\nFico à disposição para tirar dúvidas e ajustar o que for preciso.\n\n${contato || "Equipe VOICE"}\nVOICE Ambientes Inteligentes`;
  const whatsapp = `Olá, ${cliente}! Acabei de enviar a proposta ${numero}${ate}, no valor de ${brl(total)}. Posso te ligar para apresentar?`;
  return { assunto, corpo, whatsapp };
}

/** Telefone para o link do WhatsApp: so digitos, com 55 se for numero brasileiro sem DDI. */
export function telefoneWhatsApp(tel) {
  const d = String(tel ?? "").replace(/\D/g, "");
  if (d.length < 10) return "";
  return d.length <= 11 ? `55${d}` : d;
}
