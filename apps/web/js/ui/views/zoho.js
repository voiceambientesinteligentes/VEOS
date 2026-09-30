// Aba Zoho: espelho completo do Zoho (Books, CRM, Projects) dentro do VEOS. Cada registro
// e guardado inteiro; a ficha mostra TODOS os campos que a API do Zoho entrega.
// Rotas: #/zoho/<produto>[/<modulo>[/<id>]]. Sincronizacao automatica a cada 2 minutos.
import { api } from "../../data/api.js";
import { formatBRL, formatDate, formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, h, panel, stamp } from "../dom.js";
import { formularioZoho, podeEditar } from "./zoho_edicao.js";

export const PRODUTOS = {
  books: { nome: "Books", sub: "Clientes, itens, orçamentos, vendas, compras e financeiro" },
  crm: { nome: "CRM", sub: "Leads, contas, contatos, negócios e atividades" },
  projects: { nome: "Projects", sub: "Projetos, tarefas e issues" },
};

// modulo -> [rotulo, colunas da lista [caminho, titulo, formato]]
const MODULOS = {
  books: {
    contacts: ["Clientes e fornecedores", [["contact_name", "Nome"], ["company_name", "Empresa"], ["contact_type", "Tipo", "tipo"], ["email", "E-mail"], ["mobile", "Celular"], ["outstanding_receivable_amount", "A receber", "brl"], ["status", "Situação", "tipo"]]],
    items: ["Itens", [["name", "Nome"], ["sku", "SKU"], ["product_type", "Tipo", "tipo"], ["rate", "Preço de venda", "brl"], ["purchase_rate", "Preço de compra", "brl"], ["stock_on_hand", "Estoque"], ["status", "Situação", "tipo"]]],
    estimates: ["Orçamentos", [["date", "Data", "data"], ["estimate_number", "Número"], ["reference_number", "Referência"], ["customer_name", "Cliente"], ["status", "Situação", "tipo"], ["total", "Total", "brl"]]],
    salesorders: ["Pedidos de venda", [["date", "Data", "data"], ["salesorder_number", "Número"], ["customer_name", "Cliente"], ["status", "Situação", "tipo"], ["total", "Total", "brl"]]],
    invoices: ["Faturas", [["date", "Data", "data"], ["invoice_number", "Número"], ["customer_name", "Cliente"], ["status", "Situação", "tipo"], ["due_date", "Vencimento", "data"], ["total", "Total", "brl"], ["balance", "Saldo", "brl"]]],
    customerpayments: ["Pagamentos recebidos", [["date", "Data", "data"], ["payment_number", "Número"], ["customer_name", "Cliente"], ["payment_mode", "Forma"], ["amount", "Valor", "brl"]]],
    creditnotes: ["Notas de crédito", [["date", "Data", "data"], ["creditnote_number", "Número"], ["customer_name", "Cliente"], ["status", "Situação", "tipo"], ["total", "Total", "brl"]]],
    purchaseorders: ["Pedidos de compra", [["date", "Data", "data"], ["purchaseorder_number", "Número"], ["vendor_name", "Fornecedor"], ["status", "Situação", "tipo"], ["total", "Total", "brl"]]],
    bills: ["Contas a pagar", [["date", "Data", "data"], ["bill_number", "Número"], ["vendor_name", "Fornecedor"], ["status", "Situação", "tipo"], ["due_date", "Vencimento", "data"], ["total", "Total", "brl"], ["balance", "Saldo", "brl"]]],
    vendorpayments: ["Pagamentos a fornecedores", [["date", "Data", "data"], ["payment_number", "Número"], ["vendor_name", "Fornecedor"], ["amount", "Valor", "brl"]]],
    expenses: ["Despesas", [["date", "Data", "data"], ["account_name", "Conta"], ["description", "Descrição"], ["vendor_name", "Fornecedor"], ["total", "Total", "brl"]]],
    bankaccounts: ["Bancos e caixas", [["account_name", "Conta"], ["account_type", "Tipo", "tipo"], ["bank_name", "Banco"], ["balance", "Saldo", "brl"]]],
    chartofaccounts: ["Plano de contas", [["account_name", "Conta"], ["account_type", "Tipo", "tipo"], ["account_code", "Código"]]],
    taxes: ["Impostos", [["tax_name", "Nome"], ["tax_percentage", "%"], ["tax_type", "Tipo"]]],
  },
  crm: {
    Leads: ["Leads", [["Full_Name", "Nome"], ["Company", "Empresa"], ["Email", "E-mail"], ["Mobile", "Celular"], ["Lead_Status", "Situação"], ["Lead_Source", "Origem"], ["Owner.name", "Dono"]]],
    Contacts: ["Contatos", [["Full_Name", "Nome"], ["Account_Name.name", "Conta"], ["Email", "E-mail"], ["Mobile", "Celular"], ["Phone", "Telefone"], ["Owner.name", "Dono"]]],
    Accounts: ["Contas", [["Account_Name", "Conta"], ["Account_Type", "Tipo"], ["Phone", "Telefone"], ["Billing_City", "Cidade"], ["Owner.name", "Dono"]]],
    Deals: ["Negócios", [["Deal_Name", "Negócio"], ["Account_Name.name", "Conta"], ["Stage", "Estágio"], ["Amount", "Valor", "brl"], ["Closing_Date", "Fechamento", "data"], ["Owner.name", "Dono"]]],
    Tasks: ["Tarefas", [["Subject", "Assunto"], ["Status", "Situação"], ["Priority", "Prioridade"], ["Due_Date", "Vencimento", "data"], ["What_Id.name", "Relacionado a"], ["Owner.name", "Dono"]]],
    Events: ["Eventos", [["Event_Title", "Título"], ["Start_DateTime", "Início", "datahora"], ["End_DateTime", "Fim", "datahora"], ["Venue", "Local"], ["Owner.name", "Dono"]]],
    Calls: ["Chamadas", [["Subject", "Assunto"], ["Call_Type", "Tipo"], ["Call_Start_Time", "Início", "datahora"], ["Call_Duration", "Duração"], ["Owner.name", "Dono"]]],
    Products: ["Produtos", [["Product_Name", "Produto"], ["Product_Code", "Código"], ["Unit_Price", "Preço", "brl"], ["Qty_in_Stock", "Estoque"], ["Product_Active", "Ativo"]]],
    Vendors: ["Fornecedores", [["Vendor_Name", "Fornecedor"], ["Email", "E-mail"], ["Phone", "Telefone"], ["City", "Cidade"]]],
    Campaigns: ["Campanhas", [["Campaign_Name", "Campanha"], ["Type", "Tipo"], ["Status", "Situação"], ["Start_Date", "Início", "data"], ["End_Date", "Fim", "data"]]],
    Quotes: ["Cotações", [["Subject", "Assunto"], ["Quote_Stage", "Estágio"], ["Account_Name.name", "Conta"], ["Grand_Total", "Total", "brl"]]],
    Sales_Orders: ["Pedidos de venda", [["Subject", "Assunto"], ["Status", "Situação"], ["Account_Name.name", "Conta"], ["Grand_Total", "Total", "brl"]]],
    Purchase_Orders: ["Pedidos de compra", [["Subject", "Assunto"], ["Status", "Situação"], ["Vendor_Name.name", "Fornecedor"], ["Grand_Total", "Total", "brl"]]],
    Invoices: ["Faturas", [["Subject", "Assunto"], ["Status", "Situação"], ["Account_Name.name", "Conta"], ["Grand_Total", "Total", "brl"]]],
    Price_Books: ["Listas de preço", [["Price_Book_Name", "Nome"], ["Active", "Ativa"]]],
    Cases: ["Chamados", [["Subject", "Assunto"], ["Status", "Situação"], ["Priority", "Prioridade"], ["Account_Name.name", "Conta"]]],
    Solutions: ["Soluções", [["Solution_Title", "Título"], ["Status", "Situação"]]],
    Notes: ["Notas", [["Note_Title", "Título"], ["Parent_Id.name", "Relacionado a"], ["Created_Time", "Criada", "datahora"]]],
  },
  projects: {
    projects: ["Projetos", [["key", "Código"], ["name", "Projeto"], ["status.name", "Situação"], ["percent_complete", "% concluído"], ["start_date", "Início", "data"], ["end_date", "Fim", "data"], ["owner.name", "Dono"]]],
    tasks: ["Tarefas", [["prefix", "Código"], ["name", "Tarefa"], ["projeto.name", "Projeto"], ["status.name", "Situação"], ["priority", "Prioridade"], ["completion_percentage", "%"], ["end_date", "Prazo", "data"]]],
    issues: ["Issues", [["prefix", "Código"], ["name", "Issue"], ["projeto.name", "Projeto"], ["status.name", "Situação"], ["severity.value", "Severidade"], ["due_date", "Prazo", "data"]]],
  },
};

// Rotulos em portugues para campos frequentes; o resto vira "Nome do campo" legivel.
const ROTULOS = {
  contact_name: "Nome", company_name: "Empresa", email: "E-mail", phone: "Telefone", mobile: "Celular", website: "Site", status: "Situação",
  contact_type: "Tipo de contato", customer_sub_type: "Pessoa", payment_terms_label: "Condição de pagamento", notes: "Observações", terms: "Termos e condições",
  billing_address: "Endereço de cobrança", shipping_address: "Endereço de entrega", contact_persons: "Pessoas de contato", addresses: "Endereços",
  name: "Nome", sku: "SKU", unit: "Unidade", description: "Descrição", rate: "Preço de venda", purchase_rate: "Preço de compra", purchase_description: "Descrição de compra",
  product_type: "Tipo de produto", item_type: "Tipo de item", brand: "Marca", manufacturer: "Fabricante", vendor_name: "Fornecedor", stock_on_hand: "Estoque em mãos",
  available_stock: "Estoque disponível", track_inventory: "Controla estoque", tax_name: "Imposto", tax_percentage: "Imposto (%)", account_name: "Conta",
  estimate_number: "Número do orçamento", reference_number: "Referência", date: "Data", expiry_date: "Validade", customer_name: "Cliente", salesperson_name: "Vendedor",
  line_items: "Itens", quantity: "Quantidade", item_total: "Total do item", discount: "Desconto", discount_total: "Total de desconto", sub_total: "Subtotal",
  tax_total: "Total de impostos", total: "Total", adjustment: "Ajuste", adjustment_description: "Descrição do ajuste", shipping_charge: "Frete", balance: "Saldo",
  due_date: "Vencimento", invoice_number: "Número da fatura", salesorder_number: "Número do pedido", created_time: "Criado em", last_modified_time: "Alterado em",
  created_by_name: "Criado por", header_name: "Seção", currency_code: "Moeda", template_name: "Modelo", zcrm_potential_name: "Negócio no CRM",
  Owner: "Dono", Full_Name: "Nome", First_Name: "Nome", Last_Name: "Sobrenome", Email: "E-mail", Phone: "Telefone", Mobile: "Celular", Company: "Empresa",
  Lead_Status: "Situação do lead", Lead_Source: "Origem", Account_Name: "Conta", Deal_Name: "Negócio", Stage: "Estágio", Amount: "Valor", Closing_Date: "Data de fechamento",
  Probability: "Probabilidade (%)", Next_Step: "Próximo passo", Description: "Descrição", Subject: "Assunto", Due_Date: "Vencimento", Priority: "Prioridade",
  Status: "Situação", Created_Time: "Criado em", Modified_Time: "Alterado em", Created_By: "Criado por", Modified_By: "Alterado por", Tag: "Etiquetas",
  Mailing_Street: "Rua", Mailing_City: "Cidade", Mailing_State: "Estado", Mailing_Zip: "CEP", Billing_Street: "Rua (cobrança)", Billing_City: "Cidade (cobrança)",
  Account_Type: "Tipo de conta", Industry: "Setor", Rating: "Classificação", Website: "Site", Product_Name: "Produto", Unit_Price: "Preço unitário",
  Qty_in_Stock: "Estoque", key: "Código", owner: "Dono", start_date: "Início", end_date: "Fim", percent_complete: "% concluído", completion_percentage: "% concluído",
  tasklist: "Lista de tarefas", milestone: "Fase", projeto: "Projeto", priority: "Prioridade", severity: "Severidade",
};
const DINHEIRO = /(^|_)(rate|total|sub_total|amount|balance|price|charge|adjustment|budget|cost|revenue|receivable|payable|credits?)($|_)|^(Amount|Unit_Price|Grand_Total|Sub_Total|Expected_Revenue|Annual_Revenue|Budgeted_Cost|Actual_Cost)$/i;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATAHORA_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const rotulo = (k) => ROTULOS[k] ?? k.replace(/__?/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const pegar = (o, caminho) => caminho.split(".").reduce((v, k) => (v === null || v === undefined ? v : v[k]), o);
const TIPOS = { customer: "Cliente", vendor: "Fornecedor", active: "Ativo", inactive: "Inativo", draft: "Rascunho", sent: "Enviado", accepted: "Aceito", declined: "Recusado", expired: "Expirado", invoiced: "Faturado", paid: "Pago", overdue: "Vencido", open: "Aberto", void: "Anulado", goods: "Produto", service: "Serviço", partially_paid: "Pago parcialmente" };

function formatar(valor, chave = "", formato) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (formato === "tipo") return TIPOS[valor] ?? String(valor);
  if (formato === "brl" || (typeof valor === "number" && DINHEIRO.test(chave))) return Number.isFinite(Number(valor)) ? formatBRL(Number(valor).toFixed(2)) : String(valor);
  if (formato === "data" || (typeof valor === "string" && DATA_RE.test(valor))) return DATA_RE.test(String(valor)) ? formatDate(valor) : String(valor);
  if (formato === "datahora" || (typeof valor === "string" && DATAHORA_RE.test(valor))) { const d = Date.parse(valor); return Number.isNaN(d) ? String(valor) : formatDateTime(new Date(d).toISOString()); }
  if (typeof valor === "object" && !Array.isArray(valor)) return valor.name ?? valor.display_value ?? valor.value ?? JSON.stringify(valor);
  if (Array.isArray(valor)) return valor.map((v) => (typeof v === "object" ? v?.name ?? JSON.stringify(v) : String(v))).join(", ");
  return String(valor);
}

const ehObjeto = (v) => v && typeof v === "object" && !Array.isArray(v);
const ehListaDeObjetos = (v) => Array.isArray(v) && v.length > 0 && v.every(ehObjeto);

/** Ficha completa: todos os campos. Simples em grade; objetos em blocos; listas de objetos em tabela. */
function ficha(dados, profundidade = 0) {
  const simples = [], blocos = [];
  for (const [k, v] of Object.entries(dados ?? {})) {
    if (ehListaDeObjetos(v)) blocos.push(tabelaCampos(rotulo(k), v, profundidade));
    else if (ehObjeto(v) && Object.keys(v).length > 2 && profundidade < 3) blocos.push(h("details", { class: "zoho-bloco", open: profundidade === 0 }, h("summary", null, rotulo(k)), ficha(v, profundidade + 1)));
    else simples.push(h("div", { class: "zoho-campo" }, h("dt", null, rotulo(k)), h("dd", null, formatar(v, k))));
  }
  return h("div", { class: "stack-s" }, simples.length ? h("dl", { class: "zoho-grade" }, simples) : null, blocos);
}

function tabelaCampos(titulo, linhas, profundidade) {
  const chaves = [...new Set(linhas.flatMap((l) => Object.keys(l)))];
  return h("details", { class: "zoho-bloco", open: profundidade === 0 },
    h("summary", null, `${titulo} (${linhas.length})`),
    h("div", { class: "table-wrap" }, h("table", { class: "table zoho-tabela" },
      h("thead", null, h("tr", null, chaves.map((c) => h("th", { scope: "col" }, rotulo(c))))),
      h("tbody", null, linhas.map((l) => h("tr", null, chaves.map((c) => h("td", null, formatar(l[c], c)))))))));
}

// ---------------------------------------------------------------- tela
export async function telaZoho(root, rota, eu) {
  const [, produto = "books", modulo, id] = rota; // ["zoho", produto, modulo, id]
  const [status, espelho] = await Promise.all([api.zohoStatus(), api.zohoEspelho()]);
  const contagem = (p, m) => espelho.contagens.find((c) => c.produto === p && c.modulo === m)?.total ?? 0;
  const syncDe = (p, m) => espelho.sync.find((s) => s.produto === p && s.modulo === m);
  if (!espelho.produtos.includes(produto)) return root.append(errorNotice("Seu perfil não acessa este produto do Zoho."));

  // cabecalho: produtos, estado da sincronizacao, acoes
  const r = espelho.ultima_rodada;
  const sincronizar = h("button", { class: "btn btn-ghost", type: "button", disabled: eu?.papel !== "direcao" }, "Sincronizar agora");
  const saidaSync = h("span", { class: "field-hint", role: "status" });
  sincronizar.addEventListener("click", async () => {
    sincronizar.disabled = true;
    saidaSync.textContent = "Sincronizando… (até 1 minuto)";
    try {
      const x = await api.zohoSincronizar();
      saidaSync.textContent = `Pronto: ${x.gravados} registros atualizados, ${x.detalhes} fichas completas lidas${x.erros.length ? `, ${x.erros.length} aviso(s)` : ""}.`;
      setTimeout(() => location.reload(), 1200);
    } catch (e) { saidaSync.textContent = e.message; sincronizar.disabled = false; }
  });
  root.append(...[
    status.precisa_reconectar ? h("p", { class: "notice notice-warn" }, "Novas permissões do Zoho disponíveis (edição nos dois sentidos). A direção reconecta uma vez: ", h("a", { href: "#/integracoes" }, "Integrações → Desconectar → Conectar Zoho"), ".") : null,
    h("div", { class: "row zoho-topo" },
      h("nav", { class: "segmented", "aria-label": "Produto do Zoho" }, espelho.produtos.map((p) => h("a", { class: `zoho-produto${p === produto ? " ativo" : ""}`, href: `#/zoho/${p}`, "aria-current": p === produto ? "page" : null }, `Zoho ${PRODUTOS[p].nome}`))),
      h("span", { class: "field-hint" }, r ? `Última sincronização: ${formatDateTime(r.em)} · automática a cada 2 min` : "Aguardando a primeira sincronização"),
      sincronizar, saidaSync),
  ].filter(Boolean));

  const mods = Object.entries(MODULOS[produto]);
  const menu = h("nav", { class: "zoho-modulos", "aria-label": `Módulos do Zoho ${PRODUTOS[produto].nome}` }, mods.map(([m, [nome]]) => {
    const st = syncDe(produto, m);
    return h("a", { class: `zoho-modulo${m === modulo ? " ativo" : ""}`, href: `#/zoho/${produto}/${m}`, "aria-current": m === modulo ? "page" : null },
      h("span", null, nome), h("span", { class: `zoho-num${st?.estado === "erro" ? " erro" : ""}`, title: st?.erro ?? "" }, st?.estado === "erro" && !contagem(produto, m) ? "!" : String(contagem(produto, m))));
  }));
  const area = h("div", { class: "stack" });
  root.append(h("div", { class: "zoho-layout" }, menu, area));

  if (!modulo) {
    area.append(panel({ title: `Zoho ${PRODUTOS[produto].nome}`, subtitle: PRODUTOS[produto].sub },
      h("div", { class: "grade-cartoes" }, mods.map(([m, [nome]]) => {
        const st = syncDe(produto, m);
        return h("a", { class: "panel panel-tight zoho-cartao", href: `#/zoho/${produto}/${m}` }, h("strong", null, nome), h("span", { class: "stat-figure" }, String(contagem(produto, m))),
          h("span", { class: "field-hint" }, st?.estado === "erro" ? `Sem permissão ou erro: ${st.erro}` : st?.ultima_volta_em ? `Atualizado ${formatDateTime(st.ultima_volta_em)}` : "Aguardando sincronização"));
      }))));
    return;
  }
  const def = MODULOS[produto][modulo];
  if (!def) return area.append(errorNotice("Módulo desconhecido."));
  if (id) return fichaRegistro(area, produto, modulo, id, def);
  return listaRegistros(area, produto, modulo, def);
}

async function listaRegistros(area, produto, modulo, [nome, colunas]) {
  const busca = h("input", { class: "input", type: "search", id: "zoho-busca-lista", placeholder: "Buscar por nome ou número", autocomplete: "off" });
  const corpo = h("div", { class: "stack-s", "aria-live": "polite" });
  let pagina = 1, t;
  async function carregar() {
    clear(corpo).append(h("p", { class: "muted" }, "Carregando…"));
    try {
      const d = await api.zohoEspelhoLista(produto, modulo, busca.value.trim(), pagina);
      const paginas = Math.max(1, Math.ceil(d.total / 50));
      const ant = h("button", { class: "btn btn-ghost", type: "button", disabled: pagina <= 1 }, "‹ Anterior");
      const prox = h("button", { class: "btn btn-ghost", type: "button", disabled: pagina >= paginas }, "Próxima ›");
      ant.addEventListener("click", () => { pagina--; carregar(); });
      prox.addEventListener("click", () => { pagina++; carregar(); });
      clear(corpo).append(
        d.linhas.length
          ? h("div", { class: "table-wrap" }, h("table", { class: "table zoho-tabela" },
              h("caption", null, `${nome}: ${d.total} registro(s)`),
              h("thead", null, h("tr", null, colunas.map(([, t_]) => h("th", { scope: "col" }, t_)), h("th", { scope: "col" }, ""))),
              h("tbody", null, d.linhas.map((l) => h("tr", null,
                colunas.map(([c, , f], i) => h("td", { class: f === "brl" ? "r num" : null }, i === 0 ? h("a", { href: `#/zoho/${produto}/${modulo}/${encodeURIComponent(l.id)}` }, formatar(pegar(l.campos, c), c, f)) : formatar(pegar(l.campos, c), c, f))),
                h("td", null, h("a", { class: "btn btn-ghost", href: `#/zoho/${produto}/${modulo}/${encodeURIComponent(l.id)}` }, "Abrir")))))))
          : h("p", { class: "result-empty" }, busca.value ? "Nada encontrado." : "Nenhum registro neste módulo."),
        d.total > 50 ? h("div", { class: "row" }, ant, h("span", { class: "field-hint" }, `Página ${pagina} de ${paginas}`), prox) : "");
    } catch (e) { clear(corpo).append(errorNotice(e.message)); }
  }
  busca.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { pagina = 1; carregar(); }, 350); });
  const novo = podeEditar(produto, modulo) && !(produto === "projects") ? h("button", { class: "btn btn-primary", type: "button" }, "+ Novo") : null;
  novo?.addEventListener("click", () => {
    clear(area);
    formularioZoho(area, { produto, modulo, id: null, registro: null, nomeModulo: nome, aoSalvar: (nid) => { location.hash = `#/zoho/${produto}/${modulo}/${encodeURIComponent(nid)}`; } })
      .catch((e) => area.append(errorNotice(e.message)));
  });
  area.append(panel({ title: nome, subtitle: `Zoho ${PRODUTOS[produto].nome} · cópia completa, sincronizada a cada 2 min`, actions: h("div", { class: "row" }, busca, novo) }, corpo));
  await carregar();
}

async function fichaRegistro(area, produto, modulo, id, [nome]) {
  const r = await api.zohoEspelhoRegistro(produto, modulo, id);
  const incompleto = produto === "books" && !r.detalhe_em;
  const editar = podeEditar(produto, modulo) && !r.excluido && !incompleto ? h("button", { class: "btn btn-primary", type: "button" }, "Editar") : null;
  editar?.addEventListener("click", () => {
    clear(area);
    area.append(h("p", null, h("a", { href: `#/zoho/${produto}/${modulo}/${encodeURIComponent(id)}` }, `‹ voltar à ficha`)));
    formularioZoho(area, { produto, modulo, id, registro: r, nomeModulo: nome, aoSalvar: () => location.reload() }).catch((e) => area.append(errorNotice(e.message)));
  });
  area.append(
    h("p", null, h("a", { href: `#/zoho/${produto}/${modulo}` }, `‹ ${nome}`)),
    panel({ title: r.nome ?? id, subtitle: `Zoho ${PRODUTOS[produto].nome} · ${nome} · id ${r.zoho_id}`,
      actions: h("div", { class: "row" }, r.excluido ? stamp("Excluído no Zoho", "risk") : null, incompleto ? stamp("Ficha resumida: completa na próxima sincronização", "warn") : stamp(`${Object.keys(r.dados).length} campos`, "live"), editar) },
      h("p", { class: "field-hint" }, `Alterado no Zoho: ${r.modificado_em ? formatDateTime(r.modificado_em) : "—"} · copiado para o VEOS: ${formatDateTime(r.sincronizado_em)}`),
      ficha(r.dados)));
}
