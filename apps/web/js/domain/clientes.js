// CADASTRO DE CLIENTES do VEOS (sem DOM; usado no navegador e na Edge Function "api").
// Normaliza e valida o que a pessoa digitou: documento e telefone so com digitos, CPF/CNPJ com
// digito verificador, e-mail e UF. As listas (origem, tipo de imovel, fase da obra) sao as mesmas
// do lead e da oportunidade do setor Comercial (setores/vendas.json), para o funil bater.

export const ORIGENS = [
  ["indicacao_arquiteto", "Indicação de arquiteto"], ["indicacao_designer", "Indicação de designer"], ["indicacao_construtora", "Indicação de construtora"],
  ["indicacao_cliente", "Indicação de cliente"], ["cliente_antigo_reativacao", "Cliente antigo (reativação)"], ["prospeccao_ativa", "Prospecção ativa"],
  ["site", "Site"], ["instagram", "Instagram"], ["google", "Google (perfil da empresa)"], ["whatsapp", "WhatsApp"], ["showroom_evento", "Showroom ou evento"], ["outro", "Outro"],
];
export const TIPOS_IMOVEL = [
  ["casa_alto_padrao", "Casa alto padrão"], ["apartamento_alto_padrao", "Apartamento alto padrão"], ["casa_campo_praia", "Casa de campo/praia"],
  ["escritorio_corporativo", "Escritório/corporativo"], ["comercial_varejo", "Comercial/varejo"], ["hotelaria_restaurante", "Hotelaria/restaurante"], ["outro", "Outro"],
];
export const FASES_OBRA = [
  ["projeto_arquitetonico", "Projeto arquitetônico"], ["fundacao_estrutura", "Fundação/estrutura"], ["alvenaria_infraestrutura", "Alvenaria/infraestrutura"],
  ["acabamento", "Acabamento"], ["pronto_reforma", "Pronto (reforma/retrofit)"],
];
export const UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");
export const rotulo = (lista, v) => lista.find(([k]) => k === v)?.[1] ?? (v || "—");

const digitos = (v) => String(v ?? "").replace(/\D/g, "");
const txt = (v, max) => { const s = String(v ?? "").trim().replace(/\s+/g, " "); return s ? s.slice(0, max) : null; };

export function cpfValido(c) {
  const d = digitos(c);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
export function cnpjValido(c) {
  const d = digitos(c);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (n) => { const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = pesos.reduce((a, p, i) => a + Number(d[i]) * p, 0); const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

export function formatarDocumento(doc) {
  const d = digitos(doc);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc ?? "";
}
export function formatarTelefone(tel) {
  let d = digitos(tel);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return tel ?? "";
}

/**
 * Normaliza a entrada do formulario. `parcial` = alteracao (so os campos enviados).
 * Retorna { dados, erros }: dados no formato da tabela `clientes`.
 */
export function normalizarCliente(e = {}, { parcial = false } = {}) {
  const erros = [], dados = {};
  const tem = (k) => !parcial || Object.prototype.hasOwnProperty.call(e, k);
  if (tem("tipo")) dados.tipo = e.tipo === "pj" ? "pj" : "pf";
  if (tem("nome")) {
    dados.nome = txt(e.nome, 200);
    if (!dados.nome || dados.nome.length < 2) erros.push("Informe o nome do cliente.");
  }
  if (tem("documento")) {
    const d = digitos(e.documento);
    dados.documento = d || null;
    if (d && !(d.length === 11 ? cpfValido(d) : d.length === 14 ? cnpjValido(d) : false)) erros.push("CPF ou CNPJ inválido (confira os números).");
    if (d && dados.tipo && (dados.tipo === "pf") !== (d.length === 11)) erros.push(dados.tipo === "pf" ? "Pessoa física usa CPF (11 dígitos)." : "Empresa usa CNPJ (14 dígitos).");
  }
  if (tem("telefone")) {
    const d = digitos(e.telefone);
    dados.telefone = d || null;
    if (d && (d.length < 10 || d.length > 13)) erros.push("Telefone inválido: use DDD + número.");
  }
  if (tem("email")) {
    dados.email = txt(e.email, 200)?.toLowerCase() ?? null;
    if (dados.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(dados.email)) erros.push("E-mail inválido.");
  }
  if (tem("uf")) {
    dados.uf = txt(e.uf, 2)?.toUpperCase() ?? null;
    if (dados.uf && !UFS.includes(dados.uf)) erros.push("UF inválida.");
  }
  for (const [k, max] of [["contato_nome", 120], ["cidade", 120], ["endereco_obra", 300], ["parceiro", 200], ["observacao", 2000]]) if (tem(k)) dados[k] = txt(e[k], max);
  for (const [k, lista] of [["origem", ORIGENS], ["tipo_imovel", TIPOS_IMOVEL], ["fase_obra", FASES_OBRA]]) {
    if (!tem(k)) continue;
    dados[k] = e[k] ? String(e[k]) : null;
    if (dados[k] && !lista.some(([v]) => v === dados[k])) erros.push(`Opção inválida em ${k}.`);
  }
  if (tem("aceita_contato")) dados.aceita_contato = e.aceita_contato !== false && e.aceita_contato !== "nao";
  if (parcial && Object.prototype.hasOwnProperty.call(e, "estado")) {
    if (!["ativo", "inativo"].includes(e.estado)) erros.push("Situação inválida.");
    else dados.estado = e.estado;
  }
  if (!parcial && !dados.telefone && !dados.email) erros.push("Informe pelo menos um contato: telefone ou e-mail.");
  return { dados, erros };
}

/** Cliente a partir de um contato do Zoho Books (retomada de orcamento antigo). */
export function clienteDoZoho(c = {}) {
  const p = (c.contact_persons ?? []).find((x) => x.is_primary_contact) ?? (c.contact_persons ?? [])[0] ?? {};
  const end = c.shipping_address?.address ? c.shipping_address : c.billing_address ?? {};
  const bruto = digitos(c.cf_cpf_cnpj ?? c.gst_no ?? c.tax_reg_no ?? "");
  const doc = (bruto.length === 11 && cpfValido(bruto)) || (bruto.length === 14 && cnpjValido(bruto)) ? bruto : null;
  const tel = digitos(c.mobile || p.mobile || c.phone || p.phone);
  return {
    tipo: doc ? (doc.length === 14 ? "pj" : "pf") : c.customer_sub_type === "business" ? "pj" : "pf",
    nome: c.contact_name || c.company_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Cliente do Zoho",
    documento: doc,
    contato_nome: [p.first_name, p.last_name].filter(Boolean).join(" ") || null,
    telefone: tel.length >= 10 && tel.length <= 13 ? tel : null,
    email: (c.email || p.email || "").toLowerCase() || null,
    cidade: end.city || null, uf: /^[A-Z]{2}$/.test(String(end.state_code ?? "")) ? end.state_code : null,
    endereco_obra: [end.address, end.street2].filter(Boolean).join(", ") || null,
    origem: "cliente_antigo_reativacao",
  };
}
