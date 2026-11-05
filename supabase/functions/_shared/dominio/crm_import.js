// GERADO por scripts/gerar-catalogo.mjs a partir de apps/web/js/domain/crm_import.js - nao editar a mao.
// HISTORICO DO CRM DO ZOHO -> FUNIL DO VEOS (sem DOM). Converte um lead ou um negocio do espelho do Zoho CRM
// no pre-preenchimento de um registro do setor Comercial (lead / oportunidade), SEM perder a origem:
// o id do Zoho e a origem original ficam escritos no texto do registro. So preenche o que o Zoho realmente
// tem; campo obrigatorio que o Zoho nao tem (tipo de imovel, fase da obra...) fica em branco para a pessoa
// preencher (nada e inventado).

const digitos = (v) => String(v ?? "").replace(/\D/g, "");
const nome = (v) => (v && typeof v === "object" ? v.name ?? "" : String(v ?? "")).trim();

/** Origem do Zoho -> opcao de origem do lead do VEOS (o resto vai para "outro"; o texto original fica no registro). */
export function origemDoZoho(fonte) {
  const f = String(fonte ?? "").toLowerCase();
  if (/casa hall|exposi|showroom|feira|evento/.test(f)) return "showroom_evento";
  if (/instagram/.test(f)) return "instagram";
  if (/site|web/.test(f)) return "site";
  if (/arquitet/.test(f)) return "indicacao_arquiteto";
  if (/designer/.test(f)) return "indicacao_designer";
  if (/construtora/.test(f)) return "indicacao_construtora";
  if (/indica|cliente/.test(f)) return "indicacao_cliente";
  return "outro";
}

/** Etapa do negocio no Zoho -> etapa da oportunidade do VEOS. */
export function etapaDoZoho(stage) {
  const s = String(stage ?? "").toLowerCase();
  if (/ganh|won/.test(s)) return "ganha";
  if (/perd|lost/.test(s)) return "perdida";
  if (/negocia/.test(s)) return "negociacao";
  if (/or[cç]amento|proposta|quote/.test(s)) return "proposta";
  if (/projeto/.test(s)) return "projeto";
  if (/visita/.test(s)) return "visita";
  return "qualificacao";
}

const marca = (modulo, id, origem) => `Importado do Zoho CRM (${modulo} ${id}${origem ? `; origem no Zoho: ${origem}` : ""}).`;

/** Pre-preenchimento de um LEAD do VEOS a partir de um lead do Zoho CRM. */
export function leadDoCrm(z = {}) {
  const tel = digitos(z.Mobile || z.Phone);
  const org = z.Lead_Source ? String(z.Lead_Source) : null;
  const nomeCompleto = String(z.Full_Name || [z.First_Name, z.Last_Name].filter(Boolean).join(" ") || z.Company || "Lead do Zoho").trim();
  const partes = [marca("Leads", z.id, org), z.Company ? `Empresa: ${z.Company}.` : "", z.Description ? String(z.Description) : ""].filter(Boolean);
  return {
    titulo: nomeCompleto.slice(0, 200),
    estado: z.Converted__s ? "convertido" : "novo",
    dados: {
      nome_contato: nomeCompleto.slice(0, 120),
      ...(tel.length >= 10 && tel.length <= 13 ? { telefone: tel } : {}),
      ...(z.Email ? { email: String(z.Email).toLowerCase() } : {}),
      origem: origemDoZoho(org),
      ...(z.City ? { cidade: String(z.City) } : {}),
      interesse: partes.join(" ").slice(0, 2000),
    },
  };
}

/** Pre-preenchimento de uma OPORTUNIDADE do VEOS a partir de um negocio do Zoho CRM. */
export function negocioDoCrm(z = {}) {
  const org = z.Lead_Source ? String(z.Lead_Source) : null;
  const cliente = nome(z.Account_Name) || nome(z.Contact_Name) || String(z.Deal_Name ?? "").trim();
  const etapa = etapaDoZoho(z.Stage);
  const valor = Number(z.Amount);
  const fechamento = String(z.Closing_Date ?? "").slice(0, 10);
  return {
    titulo: String(z.Deal_Name || cliente || "Negócio do Zoho").slice(0, 200),
    estado: etapa,
    ...(valor > 0 ? { valor } : {}),
    dados: {
      cliente_nome: cliente.slice(0, 200),
      ...(valor > 0 ? { valor_estimado: valor.toFixed(2) } : {}),
      proximo_passo: `${marca("Deals", z.id, org)} Etapa no Zoho: ${z.Stage ?? "—"}.${z.Next_Step ? ` Próximo passo no Zoho: ${z.Next_Step}.` : ""}`.slice(0, 500),
      ...(/^\d{4}-\d{2}-\d{2}$/.test(fechamento) ? { data_prevista_fechamento: fechamento } : {}),
      ...(etapa === "ganha" && /^\d{4}-\d{2}-\d{2}$/.test(fechamento) ? { data_ganho: fechamento } : {}),
      ...(z.Description ? { escopo_sistemas: String(z.Description).slice(0, 2000) } : {}),
    },
  };
}

/** O registro do VEOS ja foi criado a partir deste id do Zoho? (procura a marca no texto) */
export function jaImportado(registros, modulo, id) {
  return (registros ?? []).find((r) => { const t = JSON.stringify(r.dados ?? {}); return t.includes(`${modulo} ${id};`) || t.includes(`${modulo} ${id})`); }) ?? null;
}
