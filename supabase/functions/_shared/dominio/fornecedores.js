// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/fornecedores.js - nao editar a mao.
// CADASTRO DE FORNECEDORES do VEOS (sem DOM; usado no navegador e na Edge Function "api").
// Mesmas regras de documento, telefone e e-mail do cadastro de clientes.
import { cnpjValido, cpfValido, formatarDocumento, formatarTelefone, UFS } from "./clientes.js";

export { formatarDocumento, formatarTelefone, UFS };
export const CATEGORIAS_FORNECEDOR = [
  ["equipamentos", "Equipamentos (nacional)"], ["importacao", "Importação"], ["infraestrutura", "Infraestrutura e cabos"], ["servico_terceiro", "Serviço de terceiros"],
  ["frete", "Frete e logística"], ["software", "Software e licenças"], ["outro", "Outro"],
];
export const rotuloCategoria = (v) => CATEGORIAS_FORNECEDOR.find(([k]) => k === v)?.[1] ?? (v || "—");

const digitos = (v) => String(v ?? "").replace(/\D/g, "");
const txt = (v, max) => { const s = String(v ?? "").trim().replace(/\s+/g, " "); return s ? s.slice(0, max) : null; };
const dias = (v) => { if (v === "" || v === null || v === undefined) return { v: null }; const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= 365 ? { v: n } : { erro: true }; };

/** Normaliza o formulario. `parcial` = alteracao (so os campos enviados). Retorna { dados, erros }. */
export function normalizarFornecedor(e = {}, { parcial = false } = {}) {
  const erros = [], dados = {};
  const tem = (k) => !parcial || Object.prototype.hasOwnProperty.call(e, k);
  if (tem("nome")) {
    dados.nome = txt(e.nome, 200);
    if (!dados.nome || dados.nome.length < 2) erros.push("Informe o nome do fornecedor.");
  }
  if (tem("documento")) {
    const d = digitos(e.documento);
    dados.documento = d || null;
    if (d && !(d.length === 11 ? cpfValido(d) : d.length === 14 ? cnpjValido(d) : false)) erros.push("CPF ou CNPJ inválido (confira os números).");
  }
  if (tem("categoria")) {
    dados.categoria = e.categoria ? String(e.categoria) : "outro";
    if (!CATEGORIAS_FORNECEDOR.some(([k]) => k === dados.categoria)) erros.push("Categoria inválida.");
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
  for (const [k, rot] of [["prazo_pagamento_dias", "Prazo de pagamento"], ["prazo_entrega_dias", "Prazo de entrega"]]) {
    if (!tem(k)) continue;
    const r = dias(e[k]);
    if (r.erro) erros.push(`${rot}: use um número de dias entre 0 e 365.`); else dados[k] = r.v;
  }
  for (const [k, max] of [["contato_nome", 120], ["cidade", 120], ["condicao", 300], ["observacao", 2000]]) if (tem(k)) dados[k] = txt(e[k], max);
  if (parcial && Object.prototype.hasOwnProperty.call(e, "estado")) {
    if (!["ativo", "inativo"].includes(e.estado)) erros.push("Situação inválida.");
    else dados.estado = e.estado;
  }
  return { dados, erros };
}

/** Fornecedor a partir de um contato "vendor" do Zoho Books. */
export function fornecedorDoZoho(c = {}) {
  const p = (c.contact_persons ?? []).find((x) => x.is_primary_contact) ?? (c.contact_persons ?? [])[0] ?? {};
  const end = c.billing_address ?? {};
  const bruto = digitos(c.cf_cpf_cnpj ?? c.gst_no ?? c.tax_reg_no ?? "");
  const tel = digitos(c.mobile || p.mobile || c.phone || p.phone);
  return {
    nome: c.contact_name || c.company_name || "Fornecedor do Zoho",
    documento: (bruto.length === 11 && cpfValido(bruto)) || (bruto.length === 14 && cnpjValido(bruto)) ? bruto : null,
    contato_nome: [p.first_name, p.last_name].filter(Boolean).join(" ") || null,
    telefone: tel.length >= 10 && tel.length <= 13 ? tel : null,
    email: (c.email || p.email || "").toLowerCase() || null,
    cidade: end.city || null, uf: /^[A-Z]{2}$/.test(String(end.state_code ?? "")) ? end.state_code : null,
  };
}
