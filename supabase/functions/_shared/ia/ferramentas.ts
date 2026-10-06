// Ferramentas do motor de raciocinio dos diretores. O modelo de IA NAO calcula: ele pede uma
// ferramenta e recebe o resultado das MESMAS funcoes das telas (copiadas para _shared/dominio pelo
// gerador). Cada ferramenta respeita o papel de quem perguntou (as mesmas regras da API) e devolve
// dados minimizados: clientes pelo codigo (CLI-xx), sem nome, e-mail, telefone ou endereco.
// deno-lint-ignore-file no-explicit-any
import { servico } from "../banco.ts";
import { rbt12 } from "../zoho.ts";
import { serieDolar } from "../cambio.ts";
import { CATALOGO } from "../setores/catalogo.ts";
import { MANUAIS } from "./manuais.ts";
import { semContato } from "./texto.ts";
import type { DefFerramenta, Esquema } from "./provedores.ts";
import { buscarSolto } from "../dominio/busca.js";
import { parametros } from "../dominio/formulario_cfo.js";
import { diagnosticoParams, impostosSimulados } from "../dominio/cfo_cenarios.js";
import { analisarOrcamento } from "../dominio/analise_orcamento.js";
import { custoNoBrasil, faixa, fatorProduto, margem, precoPolitica, variacaoDolar } from "../dominio/formacao_preco.js";
import { resumir } from "../dominio/diagnostico.js";
import { margemPorReal, mixPraticado, oQueFalta, pontoEquilibrio, saidasMensais } from "../dominio/equilibrio.js";
import { projetos } from "../dominio/estoque_sugerido.js";
import { condicaoSugerida } from "../dominio/condicao.js";
import { projetar, reserva } from "../dominio/caixa13.js";
import { dre } from "../dominio/dre.js";
import { indicadores } from "../dominio/indicadores.js";
import { contasComSaldo, dadosFechamento, dadosIndicadores, dadosSemanas, hojeSP } from "../caixa_dados.ts";
import { caixaPedido } from "../../api/compras.ts";

export type Fonte = { titulo: string; natureza: string; url?: string | null };
export type Contexto = {
  usuario: string;
  papel: string;
  setor: string;
  perguntaId: string;
  fontes: Map<string, Fonte>;
  bib: Map<string, { titulo: string; tipo: string; estado: string }>;
  procedimentos: Set<string>;
  cache: Map<string, Promise<any>>;
};
type Ferramenta = DefFerramenta & { papeis?: string[]; executar(a: Record<string, any>, ctx: Contexto): Promise<unknown> };

const FIN = ["direcao", "financas"];
const r2 = (v: number) => Math.round(v * 100) / 100;
const r1 = (v: number) => Math.round(v * 10) / 10;
const obj = (properties: Record<string, Esquema>, required: string[] = []): Esquema => ({ type: "object", properties, required });
const str = (description: string, extra: Partial<Esquema> = {}): Esquema => ({ type: "string", description, ...extra });
const num = (description: string): Esquema => ({ type: "number", description });
const sem = (t: unknown) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fonte = (ctx: Contexto, titulo: string, natureza: string, url: string | null = null) => ctx.fontes.set(titulo, { titulo, natureza, url });
const memo = <T>(ctx: Contexto, k: string, f: () => Promise<T>): Promise<T> => {
  if (!ctx.cache.has(k)) ctx.cache.set(k, f());
  return ctx.cache.get(k)!;
};
const rpc = (nome: string, corpo: unknown) => servico(`/rest/v1/rpc/${nome}`, { method: "POST", body: JSON.stringify(corpo) });

// ---------------------------------------------------------------- carregadores (memorizados por execucao)
function carregarParametros(ctx: Contexto) {
  return memo(ctx, "parametros", async () => {
    const [linhas, rb] = await Promise.all([rpc("formulario_vigente", { p_formulario: "cfo" }), rbt12()]);
    const respostas: Record<string, any> = {};
    for (const l of linhas ?? []) respostas[l.secao] = { dados: l.dados, em: l.em, versoes: l.versoes };
    const p = parametros(respostas);
    const sim = impostosSimulados(rb);
    const dp = diagnosticoParams(p, sim);
    fonte(ctx, "Formulário do CFO (respostas do fundador)", "informado pelo fundador");
    if (dp.simulado) fonte(ctx, "Simulação de impostos do VEOS (Simples, faturamento de 12 meses pelo Zoho)", "simulação");
    return { respostas, p, rb, sim, params: dp.params, simulado: dp.simulado, textoSimulacao: dp.texto };
  });
}

/** Orcamentos do espelho do Zoho no formato das telas (linhas com tipo e custo do item); cliente = codigo. */
function carregarOrcamentos(ctx: Contexto) {
  return memo(ctx, "orcamentos", async () => {
    const [ests, itens] = await Promise.all([
      servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&select=dados&limit=5000"),
      servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&excluido=is.false&select=zoho_id,tipo:dados->>product_type,custo:dados->>purchase_rate,unidade:dados->>unit&limit=10000"),
    ]);
    fonte(ctx, "Zoho Books · orçamentos e cadastro de itens (espelho do VEOS)", "dado");
    return montarOrcamentos(ests.map((x: any) => x.dados), itens);
  });
}

const PAGAMENTO_RE = /(entrada|sinal|parcela|parcelad|à vista|a vista|pix|boleto|cart[aã]o|\d+\s*x\b|\d+\s*%)/i;
const codigoCliente = (e: any) => e.contact_number || (e.customer_id ? `cliente-${String(e.customer_id).slice(-5)}` : "cliente");

function montarOrcamentos(estimativas: any[], itens: any[]) {
  const item = new Map(itens.map((i: any) => [i.zoho_id, i]));
  return estimativas.map((e) => ({
    numero: e.estimate_number, data: e.date, status: e.status, cliente: codigoCliente(e), cliente_id: e.customer_id,
    validade: e.expiry_date ?? null,
    desconto: Number(e.discount_total) || 0, ajuste: Number(e.adjustment) || 0, total: Number(e.total) || 0, imposto: Number(e.tax_total) || 0,
    condicao_pagamento: PAGAMENTO_RE.test(`${e.terms ?? ""} ${e.notes ?? ""}`),
    assunto: semContato(e.subject_content ?? "").slice(0, 200),
    linhas: (e.line_items ?? []).map((l: any) => {
      const it: any = item.get(String(l.item_id ?? ""));
      return { item_id: String(l.item_id ?? ""), ordem: Number(l.item_order) || null, nome: String(l.name ?? "").slice(0, 120), qtd: Number(l.quantity) || 0, preco: Number(l.rate) || 0, total: Number(l.item_total) || 0, tipo: it?.tipo ?? null, custo: it?.custo == null ? null : Number(it.custo), unidade: l.unit || it?.unidade || null };
    }),
  }));
}

async function umOrcamento(ctx: Contexto, numero: unknown) {
  const dig = String(numero ?? "").replace(/\D/g, "");
  if (!dig) throw new Error("informe o número do orçamento (ex.: 966 ou EST-000966)");
  const est = `EST-${dig.padStart(6, "0")}`;
  return await memo(ctx, `orc:${est}`, async () => {
    const r = await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&dados->>estimate_number=eq.${est}&select=dados&limit=1`);
    if (!r?.length) {
      const todos = await servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&select=n:dados->>estimate_number,d:dados->>date,t:dados->>total&order=dados->>estimate_number.desc&limit=8");
      return { erro: `O orçamento ${est} não existe no espelho do Zoho Books.`, mais_recentes: todos.map((x: any) => `${x.n} (${x.d}, R$ ${x.t})`) };
    }
    const e = r[0].dados;
    const ids = [...new Set((e.line_items ?? []).map((l: any) => String(l.item_id ?? "")).filter((x: string) => /^\d{1,40}$/.test(x)))];
    const itens = ids.length ? await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=in.(${ids.join(",")})&select=zoho_id,tipo:dados->>product_type,custo:dados->>purchase_rate,unidade:dados->>unit,rate:dados->>rate`) : [];
    fonte(ctx, `Zoho Books · ${est} (espelho do VEOS)`, "dado");
    const [o] = montarOrcamentos([e], itens);
    return { o, e, catalogo: new Map(itens.map((i: any) => [i.zoho_id, Number(i.rate) || null])) };
  });
}

function canalDe(p: any, nome: unknown) {
  const n = sem(nome);
  if (!n) return p.canais.find((c: any) => c.nome === p.canalPadrao) ?? p.canais[0];
  return p.canais.find((c: any) => sem(c.nome) === n)
    ?? p.canais.find((c: any) => (/rt|indica/.test(n) && /rt|indica/.test(sem(c.nome))) || (/direto/.test(n) && /direto/.test(sem(c.nome))) || (/turn/.test(n) && /turn/.test(sem(c.nome))))
    ?? p.canais.find((c: any) => c.nome === p.canalPadrao) ?? p.canais[0];
}

function premissas(par: any, canal: any) {
  return {
    imposto_produto_pct: par.params.tProduto, imposto_servico_pct: par.params.tServico,
    origem_imposto: par.simulado ? `SIMULAÇÃO (confirmar com o contador): ${par.textoSimulacao}` : (par.params.tProduto === null ? "LACUNA: alíquotas não informadas" : "informado pelo fundador (contador)"),
    canal: canal?.nome, despesas_sobre_preco_pct: canal?.v, detalhe_canal: canal ? { comissao_pct: canal.comissao, rt_indicacao_pct: canal.rt, outros_pct: canal.outros } : null,
    custo_hora: par.p.hora?.custoHora ?? null, produtividade_informada_pct: par.p.produtividade,
    provisao_risco_pct: 2, faixas_politica: "meta 35% · mínimo 30% · piso 25% (Política V1 seção 3)",
  };
}

const REDE = new Set(["roteador", "ap", "ap_cabo", "ponto_rede", "ponto_av", "quadro_rede", "switch"]);
function horasPorGrupo(a: any, o: any) {
  let rede = 0, auto = 0;
  for (const l of a.mo.linhas ?? []) (REDE.has(l.dispositivo) ? (rede += l.minTotal) : (auto += l.minTotal));
  const cenas = /(\d+) cena/.exec(a.mo.premissas?.cenas ?? "");
  const minCena = /de (\d+) min/.exec(a.mo.premissas?.cenas ?? "");
  if (cenas && minCena) auto += Number(cenas[1]) * Number(minCena[1]);
  const k = (1 + (a.mo.premissas.comissionamento ?? 10) / 100) / ((a.mo.premissas.produtividade ?? 65) / 100);
  const cobradas = { rede: 0, automacao: 0 };
  for (const l of o.linhas) if (l.tipo === "service" && /^h(r|ora)s?$/i.test(String(l.unidade ?? "").trim())) (/rede|wi-?fi/i.test(l.nome) ? (cobradas.rede += l.qtd) : (cobradas.automacao += l.qtd));
  return { calculadas: { rede: r1((rede / 60) * k), automacao: r1((auto / 60) * k), entrega: r1((a.mo.premissas.entrega ?? 0) / ((a.mo.premissas.produtividade ?? 65) / 100)) }, cobradas };
}

// ---------------------------------------------------------------- custo real (catalogo do VEOS)
async function custosDoCatalogo(ctx: Contexto, itemIds: string[], par: any) {
  if (!itemIds.length) return new Map<string, any>();
  const vinc = await servico(`/rest/v1/produto_vinculos_zoho?zoho_item_id=in.(${itemIds.join(",")})&situacao=neq.descartado&select=zoho_item_id,relacao,situacao,produto:produtos(id,codigo,nome,custo_ultimo,custo_data)`);
  const prodIds = [...new Set(vinc.map((v: any) => v.produto?.id).filter(Boolean))];
  const compras = prodIds.length ? await servico(`/rest/v1/produto_compras_origem?produto_id=in.(${prodIds.join(",")})&select=produto_id,pedido,data,preco_unit,quantidade,total_pedido&order=data.desc&limit=2000`) : [];
  const pedidos = [...new Set(compras.map((c: any) => c.pedido))];
  const linhasPorPedido = new Map<string, number>();
  if (pedidos.length) {
    for (let i = 0; i < pedidos.length; i += 150) {
      const lote = pedidos.slice(i, i + 150).map((x) => `"${String(x).replace(/"/g, "")}"`).join(",");
      const todas = await servico(`/rest/v1/produto_compras_origem?pedido=in.(${lote})&select=pedido`);
      for (const t of todas) linhasPorPedido.set(t.pedido, (linhasPorPedido.get(t.pedido) ?? 0) + 1);
    }
  }
  const datas = compras.map((c: any) => c.data).filter(Boolean).sort();
  const dolar = await memo(ctx, `ptax:${datas[0] ?? ""}`, () => serieDolar(datas[0] ?? null));
  if (dolar.ok) fonte(ctx, "Banco Central · dólar PTAX (API Olinda)", "dado oficial", "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/");
  const ptax = dolar.serie.length ? dolar.serie[dolar.serie.length - 1] : null;
  const cambio = ptax ? Math.round(ptax.venda * (1 + (par.p.margemCambial ?? 0) / 100) * 10000) / 10000 : null;
  const porItem = new Map<string, any>();
  for (const id of itemIds) {
    const vs = vinc.filter((v: any) => v.zoho_item_id === id && v.produto);
    if (!vs.length) continue;
    const info = vs.map((v: any) => {
      const cs = compras.filter((c: any) => c.produto_id === v.produto.id).map((c: any) => ({ ...c, unico: linhasPorPedido.get(c.pedido) === 1 }));
      const x = { custo: Number(v.produto.custo_ultimo), compras: cs };
      const f = fatorProduto(x, { ...par.p.fator, cambio, compra: "atual" });
      const ultima = cs.map((c: any) => c.data).filter(Boolean).sort().pop() ?? null;
      const vd = ultima ? variacaoDolar(ultima, dolar.serie) : null;
      const fatorDolar = vd ? vd.fator * (1 + (par.p.spreadAliexpress ?? 0) / 100) : 1;
      const custoHoje = f.fator === null ? null : custoNoBrasil(x.custo * fatorDolar, { fator: f.fator, perdas: par.p.perdas });
      return { produto: v.produto.codigo, nome: v.produto.nome, relacao: v.relacao, situacao: v.situacao, preco_pago: x.custo, ultima_compra: ultima, fator_importacao: f.fator, origem_fator: f.origem, variacao_dolar: vd ? r2((vd.fator - 1) * 100) : null, custo_no_brasil_hoje: custoHoje };
    });
    const confirmados = info.filter((i: any) => i.relacao === "mesmo_produto" && i.situacao === "confirmado" && i.custo_no_brasil_hoje !== null);
    porItem.set(id, { usar: confirmados.length === 1 ? confirmados[0].custo_no_brasil_hoje : null, motivo: confirmados.length > 1 ? "vários produtos confirmados para o mesmo item (mistura desconhecida): mantido o custo do Zoho" : confirmados.length ? "compra confirmada no catálogo do VEOS" : "vínculo ainda a revisar: mantido o custo do Zoho", vinculos: info });
  }
  fonte(ctx, "Catálogo de produtos do VEOS (compras de origem e vínculos com o Zoho)", "dado");
  return porItem;
}

// ---------------------------------------------------------------- ferramentas
const FERRAMENTAS: Ferramenta[] = [
  {
    nome: "manual_do_diretor",
    descricao: "Seu manual de atuação: resumo, lista numerada de procedimentos, os mais próximos do pedido, indicadores, armadilhas e aplicação na VOICE.",
    parametros: obj({ pedido: str("o que foi pedido, em poucas palavras") }, ["pedido"]),
    async executar(a, ctx) {
      const m = MANUAIS[ctx.setor];
      if (!m) return { aviso: "manual ainda não pesquisado para este setor" };
      fonte(ctx, `Manual de atuação do diretor (${ctx.setor})`, "manual do VEOS");
      const itens = m.procedimentos.map((p: any, i: number) => ({ titulo: [p.pedido, ...(p.sinonimos ?? [])].join(" · "), extra: [...(p.passos ?? []), p.entregavel].join(" "), i }));
      const perto = buscarSolto(String(a.pedido ?? ""), itens, 3).map((x: any) => ({ numero: x.i + 1, pedido: m.procedimentos[x.i].pedido }));
      return {
        resumo: m.resumo, procedimentos: m.procedimentos.map((p: any, i: number) => `${i + 1}. ${p.pedido}`), mais_proximos_por_palavras: perto,
        indicadores: m.indicadores.map((k: any) => ({ nome: k.nome, formula: k.formula })), armadilhas: m.armadilhas, aplicacao_voice: m.aplicacao_voice,
      };
    },
  },
  {
    nome: "procedimento_do_manual",
    descricao: "Procedimento completo do seu manual (perguntas antes, passos, entregável, critérios de qualidade, quando escalar), pelo número da lista.",
    parametros: obj({ numero: { type: "integer", description: "número do procedimento (1, 2, ...)" } }, ["numero"]),
    async executar(a, ctx) {
      const m = MANUAIS[ctx.setor];
      const p = m?.procedimentos?.[Number(a.numero) - 1];
      if (!p) throw new Error(`procedimento ${a.numero} não existe (há ${m?.procedimentos?.length ?? 0})`);
      ctx.procedimentos.add(p.pedido);
      fonte(ctx, `Manual de atuação do diretor (${ctx.setor})`, "manual do VEOS");
      return p;
    },
  },
  {
    nome: "consultar_precedentes",
    descricao: "Consulta a Biblioteca do VEOS (decisões, políticas, aprendizados, propostas, incidentes) com palavras-chave; a consulta fica registrada. Use 'or' entre palavras para ampliar (ex.: 'desconto or margem').",
    parametros: obj({ termos: str("palavras-chave") }, ["termos"]),
    async executar(a, ctx) {
      const r = await rpc("bib_consultar", { p: { usuario: ctx.usuario, termos: String(a.termos ?? "").slice(0, 200), setor: ctx.setor, contexto: "ia:diretor", referencia: `pergunta:${ctx.perguntaId}` } });
      for (const c of r.considerados ?? []) ctx.bib.set(c.codigo, { titulo: c.titulo, tipo: c.tipo, estado: c.estado });
      return { considerados: (r.considerados ?? []).map((c: any) => ({ codigo: c.codigo, tipo: c.tipo, estado: c.estado, titulo: c.titulo, vale_como_regra: c.aplicavel, motivo: c.motivo })), conflitos: r.conflitos, faltantes: r.faltantes };
    },
  },
  {
    nome: "ler_registro_da_biblioteca",
    descricao: "Lê um registro da Biblioteca pelo código (ex.: BIB-0011): conteúdo, tipo, estado, versão e autoridade.",
    parametros: obj({ codigo: str("código BIB-0000") }, ["codigo"]),
    async executar(a, ctx) {
      const cod = String(a.codigo ?? "").toUpperCase().trim();
      if (!/^BIB-\d{4,6}$/.test(cod)) throw new Error("código inválido (formato BIB-0000)");
      const r = await servico(`/rest/v1/biblioteca_registros?codigo=eq.${cod}&select=id,codigo,tipo,estado,titulo,conteudo,versao,autoridade,vigente_desde,valido_ate`);
      if (!r?.length) return { erro: `${cod} não existe` };
      const ok = await rpc("bib_pode_ver", { p_usuario: ctx.usuario, p_registro: r[0].id });
      if (!ok) return { erro: `${cod} é restrito para quem perguntou` };
      const { id: _id, ...reg } = r[0];
      ctx.bib.set(cod, { titulo: reg.titulo, tipo: reg.tipo, estado: reg.estado });
      return { ...reg, conteudo: String(reg.conteudo ?? "").slice(0, 6000) };
    },
  },
  {
    nome: "politica_financeira",
    descricao: "Texto integral da Política de Saúde Financeira da VOICE (V1 e a clarificação V1.1, vigentes). Opcional: uma seção (número ou palavra, ex.: '9' ou 'descontos').",
    parametros: obj({ secao: str("número ou palavra da seção (opcional)") }),
    async executar(a, ctx) {
      const docs = await servico("/rest/v1/documentos_canonicos?codigo=in.(POL-FIN-V1,POL-FIN-V1-1)&select=codigo,titulo,biblioteca,texto,sha256,carregado_em&order=carregado_em.desc");
      const ultimos = [...new Map(docs.map((d: any) => [d.codigo, d])).values()] as any[];
      if (!ultimos.length) return { aviso: "texto integral ainda não carregado no banco; use ler_registro_da_biblioteca BIB-0011 e BIB-0012 (resumos)" };
      const s = sem(a.secao);
      return {
        documentos: ultimos.map((d) => {
          fonte(ctx, `${d.titulo} (texto integral)`, "política vigente");
          if (!s) return { codigo: d.codigo, titulo: d.titulo, biblioteca: d.biblioteca, texto: d.texto.split("## Adoção e proveniência")[0] };
          const secoes = d.texto.split(/\n(?=## )/).filter((x: string) => { const t = sem(x.split("\n")[0]); return t.includes(s) || new RegExp(`^## ${s}\\.`).test(t); });
          return { codigo: d.codigo, titulo: d.titulo, biblioteca: d.biblioteca, secoes: secoes.length ? secoes : ["seção não encontrada; peça sem o parâmetro secao para o texto todo"] };
        }),
      };
    },
  },
  {
    nome: "plano_da_voice",
    descricao: "Itens do Plano da VOICE (metas, ações, rotinas, regras e decisões por fase), com estado (proposto/aprovado/feito). Opcional: área (setor).",
    parametros: obj({ area: str("setor (opcional): direcao, financas, vendas, marketing, operacoes, tecnologia, posvenda, pessoas, secretaria") }),
    async executar(a, ctx) {
      const area = /^[a-z]{3,12}$/.test(String(a.area ?? "")) ? String(a.area) : null;
      if (ctx.papel !== "direcao" && area && area !== ctx.papel) return { erro: "quem perguntou só vê o plano da própria área" };
      const filtro = ctx.papel !== "direcao" ? `&area=eq.${ctx.papel}` : area ? `&area=eq.${area}` : "";
      const r = await servico(`/rest/v1/plano_itens?estado=neq.cancelado${filtro}&select=codigo,area,fase,tipo,titulo,estado,alvo,indicador,prazo&order=fase,ordem&limit=80`);
      fonte(ctx, "Plano da VOICE (VEOS)", "dado");
      return { itens: r, nota: "Meta com estado 'proposto' é PROPOSTA até o fundador aprovar." };
    },
  },
  {
    nome: "parametros_financeiros",
    papeis: FIN,
    descricao: "Parâmetros do CFO: impostos (informados ou SIMULAÇÃO), canais de venda e % de comissão/RT, custo da hora, produtividade, custos fixos, saídas do mês, dívidas, ponto de equilíbrio por canal e o que falta no formulário.",
    parametros: obj({}),
    async executar(_a, ctx) {
      const par = await carregarParametros(ctx);
      const orc = await carregarOrcamentos(ctx);
      const p = par.p;
      const umAno = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
      const proj = projetos(orc).filter((o: any) => o.data >= umAno && Number(o.total) > 500);
      const mix = mixPraticado(proj);
      const saidas = saidasMensais(p, par.respostas);
      const tP = par.params.tProduto, tS = par.params.tServico;
      const equilibrio = p.canais.map((c: any) => {
        const mc = tP !== null && mix.multiplicador ? margemPorReal({ tProduto: tP, tServico: tS, v: c.v, multiplicador: mix.multiplicador, mixProduto: mix.mixProduto }) : null;
        return { canal: c.nome, despesas_sobre_preco_pct: c.v, margem_por_real_pct: mc, ponto_de_equilibrio_mes: mc ? pontoEquilibrio(saidas, mc) : null };
      });
      return {
        impostos: { produto_pct: tP, servico_pct: tS, origem: par.simulado ? `SIMULAÇÃO: ${par.textoSimulacao}` : tP === null ? "LACUNA" : "informado (contador)", faturamento_12_meses: par.rb, aliquotas_2027: { produto_pct: p.tProduto2027, servico_pct: p.tServico2027 } },
        canais: p.canais.map((c: any) => ({ nome: c.nome, padrao: c.nome === p.canalPadrao, comissao_pct: c.comissao, rt_indicacao_pct: c.rt, outros_pct: c.outros, total_sobre_preco_pct: c.v })),
        mao_de_obra: { custo_hora: p.hora?.custoHora ?? null, custo_mensal_equipe: p.hora?.custoMensal ?? null, horas_vendaveis_mes: p.hora?.horasVendaveis ?? null, produtividade_pct: p.produtividade, lacunas: p.hora?.lacunas },
        compras: { perdas_pct: p.perdas, folga_cambial_pct: p.margemCambial, spread_aliexpress_pct: p.spreadAliexpress, prazo_entrega_dias: p.prazoEntrega },
        vendas: { entrada_pct: p.entradaPct, validade_proposta_dias: p.validadeDias },
        custos_fixos_mes: p.fixos, dividas: { quantidade: p.dividas, parcelas_mes: p.parcelasMes, saldo: p.saldoDividas },
        saidas_do_mes: { itens: saidas.linhas.map(([n, v]: [string, number]) => ({ item: n, valor: v })), total: saidas.total, sem_valor: saidas.semValor },
        mix_praticado_12_meses: mix, ponto_de_equilibrio_por_canal: equilibrio,
        metas: p.metas, lacunas: p.lacunas,
        o_que_falta: oQueFalta(p, par.respostas).filter((x: any) => !x.ok).map((x: any) => `${x.texto} (seção ${x.secao})`),
      };
    },
  },
  {
    nome: "buscar_orcamentos",
    papeis: FIN,
    descricao: "Lista orçamentos do Zoho Books (espelho): número, data, situação, total, cliente (código) e assunto. Filtros opcionais: texto (número, código do cliente ou palavra do assunto) e situação.",
    parametros: obj({ texto: str("número, código do cliente ou palavra do assunto (opcional)"), situacao: str("draft, sent, accepted, invoiced, declined ou expired (opcional)"), limite: { type: "integer", description: "máx. 30" } }),
    async executar(a, ctx) {
      const orc = await carregarOrcamentos(ctx);
      const t = sem(a.texto), dig = String(a.texto ?? "").replace(/\D/g, "");
      const st = String(a.situacao ?? "");
      const lista = orc.filter((o: any) => (!st || o.status === st) && (!t || (dig && o.numero.endsWith(dig.padStart(Math.min(dig.length, 6), "0"))) || sem(o.cliente).includes(t) || sem(o.assunto).includes(t)))
        .sort((x: any, y: any) => String(y.numero).localeCompare(String(x.numero)))
        .slice(0, Math.min(30, Number(a.limite) || 15));
      return { quantidade: lista.length, orcamentos: lista.map((o: any) => ({ numero: o.numero, data: o.data, validade: o.validade, situacao: o.status, total: o.total, cliente: o.cliente, assunto: o.assunto })) };
    },
  },
  {
    nome: "analisar_orcamento",
    papeis: FIN,
    descricao: "Análise oficial de UM orçamento (mesma da tela Diagnóstico): cada produto com custo, preço, margem e preços da Política (meta 35%, mínimo 30%, piso 25%); mão de obra (horas cobradas x calculadas pelos tempos-padrão, por grupo rede/automação); margem total; pontos de atenção; outras versões do mesmo cliente.",
    parametros: obj({ numero: str("número do orçamento (ex.: 966 ou EST-000966)"), canal: str("canal de venda (opcional): 'Com RT/indicação', 'Direto' ou 'Turn key'; padrão = o do formulário") }, ["numero"]),
    async executar(a, ctx) {
      const u = await umOrcamento(ctx, a.numero);
      if ((u as any).erro) return u;
      const { o } = u as any;
      const par = await carregarParametros(ctx);
      const canal = canalDe(par.p, a.canal);
      const base = { ...par.params, v: canal.v, produtividade: par.p.produtividade, comissionamento: par.p.comissionamento, entregaHoras: par.p.entregaHoras, metrosPorPonto: par.p.metrosPorPonto };
      const an = analisarOrcamento(o, base, par.p.tempos);
      const a65 = par.p.produtividade !== null && par.p.produtividade >= 90 ? analisarOrcamento(o, { ...base, produtividade: 65 }, par.p.tempos) : null;
      const tP = par.params.tProduto;
      const itens = o.linhas.map((l: any, i: number) => {
        const n = l.ordem ?? i + 1;
        if (l.tipo === "service") return { linha: n, nome: l.nome, tipo: "serviço", qtd: l.qtd, unidade: l.unidade, preco: l.preco, total: l.total, custo_cadastrado_zoho: l.custo, obs: "custo de serviço no Zoho não é custo-hora real" };
        const c = Number(l.custo) > 1 ? Number(l.custo) : null;
        if (c === null) return { linha: n, nome: l.nome, tipo: l.tipo ?? "sem cadastro", qtd: l.qtd, preco: l.preco, total: l.total, custo: l.custo, obs: "LACUNA: sem custo real cadastrado (R$ 1,00 ou vazio)" };
        const m = tP === null ? null : margem(l.preco, c, { t: tP, v: canal.v });
        return {
          linha: n, nome: l.nome, tipo: "produto", qtd: l.qtd, unidade: l.unidade, preco: l.preco, total: l.total, custo: c, multiplicador: r2(l.preco / c),
          margem_pct: m?.pct ?? null, faixa: m ? faixa(m.pct) : "NAO RESOLVIDO",
          preco_meta_35: tP === null ? null : precoPolitica(c, { t: tP, v: canal.v, alvo: 35 }), preco_minimo_30: tP === null ? null : precoPolitica(c, { t: tP, v: canal.v, alvo: 30 }), preco_piso_25: tP === null ? null : precoPolitica(c, { t: tP, v: canal.v, alvo: 25 }),
        };
      });
      const orcs = await carregarOrcamentos(ctx);
      const versoes = orcs.filter((x: any) => x.cliente_id === o.cliente_id && x.numero !== o.numero && Math.abs(Date.parse(x.data) - Date.parse(o.data)) <= 10 * 864e5).map((x: any) => ({ numero: x.numero, data: x.data, total: x.total, assunto: x.assunto }));
      const semL11 = (() => { const ls = o.linhas.filter((l: any) => l.tipo === "goods" && Number(l.custo) > 1 && Number(l.custo) * 10 > l.preco); const v = ls.reduce((s: number, l: any) => s + l.total, 0), c = ls.reduce((s: number, l: any) => s + Number(l.custo) * l.qtd, 0); return tP === null || !v ? null : margem(v, c, { t: tP, v: canal.v })?.pct ?? null; })();
      return {
        orcamento: { numero: o.numero, data: o.data, validade: o.validade, situacao: o.status, cliente: o.cliente, assunto: o.assunto, total: o.total, desconto: o.desconto, ajuste: o.ajuste, imposto_destacado: o.imposto, tem_condicao_de_pagamento: o.condicao_pagamento },
        premissas: premissas(par, canal),
        produtos: { venda: an.produtos.venda, custo: an.produtos.custo, venda_sem_custo: an.produtos.semCusto, multiplicador_medio: an.produtos.multiplicador, margem: an.produtos.mc, preco_meta_do_bloco_35: an.produtos.precoMeta, margem_sem_itens_acima_de_10x_custo_pct: semL11 },
        mao_de_obra: { valor: an.mo.valor, horas_cobradas: an.mo.horasCobradas, valor_por_hora: an.mo.porHora, horas_padrao_execucao: an.mo.horasPadrao, horas_calculadas: an.mo.horasReais, horas_calculadas_com_65pct: a65?.mo.horasReais ?? null, diferenca_horas: an.mo.diferencaHoras, custo: an.mo.custo, custo_com_65pct: a65?.mo.custo ?? null, preco_hora_meta_35: an.mo.precoHoraMeta, por_grupo: horasPorGrupo(a65 ?? an, o), premissas: an.mo.premissas, sem_tempo_no_catalogo: an.mo.faltam },
        margem_total: an.mcTotal ? { ...an.mcTotal, faixa: faixa(an.mcTotal.pct) } : null,
        margem_total_com_produtividade_65: a65?.mcTotal ? { ...a65.mcTotal, faixa: faixa(a65.mcTotal.pct) } : null,
        pontos_de_atencao: an.pontos, itens, outras_versoes_do_cliente: versoes,
      };
    },
  },
  {
    nome: "simular_correcao_orcamento",
    papeis: FIN,
    descricao: "Refaz um orçamento pela Política: cada produto abaixo do alvo sobe para o preço do alvo (35% ou 30%), com o custo mais confiável (compra confirmada no catálogo do VEOS com o dólar de hoje; senão o custo do Zoho); itens sem custo e mão de obra ficam como estão. Devolve linhas que mudam, novo total, margens, descontos possíveis pela alçada e condição de pagamento.",
    parametros: obj({ numero: str("número do orçamento"), alvo: { type: "integer", description: "35 (meta, padrão) ou 30 (mínimo)" }, canal: str("canal de venda (opcional)") }, ["numero"]),
    async executar(a, ctx) {
      const u = await umOrcamento(ctx, a.numero);
      if ((u as any).erro) return u;
      const { o } = u as any;
      const par = await carregarParametros(ctx);
      const tP = par.params.tProduto;
      if (tP === null) return { erro: "LACUNA: sem alíquota (nem simulação) não há preço pela Política" };
      const canal = canalDe(par.p, a.canal);
      const alvo = Number(a.alvo) === 30 ? 30 : 35;
      const ids = [...new Set(o.linhas.filter((l: any) => l.tipo === "goods").map((l: any) => l.item_id).filter((x: string) => /^\d{1,40}$/.test(x)))] as string[];
      const cat = await custosDoCatalogo(ctx, ids, par);
      const custos: any[] = [];
      const novas = o.linhas.map((l: any, i: number) => {
        const n = l.ordem ?? i + 1;
        if (l.tipo !== "goods") return { ...l };
        const zoho = Number(l.custo) > 1 ? Number(l.custo) : null;
        const c0 = cat.get(l.item_id);
        const custo = c0?.usar ?? zoho;
        if (c0) custos.push({ linha: n, nome: l.nome, custo_zoho: zoho, custo_usado: custo, motivo: c0.motivo, vinculos: c0.vinculos });
        if (custo === null) return { ...l, obs: "sem custo: mantido (LACUNA)" };
        const alvoP = precoPolitica(custo, { t: tP, v: canal.v, alvo });
        if (l.preco >= alvoP) return { ...l, custo, obs: "já no alvo ou acima: mantido" };
        return { ...l, custo, de: l.preco, preco: alvoP, total: r2(alvoP * l.qtd), mudou: true };
      });
      const total = r2(novas.reduce((s: number, l: any) => s + l.total, 0));
      const o2 = { ...o, total, imposto: 0, condicao_pagamento: true, linhas: novas };
      const base = { ...par.params, v: canal.v, produtividade: par.p.produtividade, comissionamento: par.p.comissionamento, entregaHoras: par.p.entregaHoras, metrosPorPonto: par.p.metrosPorPonto };
      const an = analisarOrcamento(o2, base, par.p.tempos);
      const a65 = analisarOrcamento(o2, { ...base, produtividade: 65 }, par.p.tempos);
      const descontos = [2, 5].map((d) => {
        const ls = novas.map((l: any) => ({ ...l, preco: l.preco * (1 - d / 100), total: l.total * (1 - d / 100) }));
        const od = { ...o2, total: r2(total * (1 - d / 100)), linhas: ls };
        const x = analisarOrcamento(od, base, par.p.tempos), x65 = analisarOrcamento(od, { ...base, produtividade: 65 }, par.p.tempos);
        const mc = x.mcTotal?.pct ?? null;
        const alcada = mc !== null && mc < 30 ? "direção (margem abaixo de 30%)" : d <= 2 && mc !== null && mc >= 32 ? "autonomia comercial (até 2% com margem ≥ 32%)" : d <= 5 ? "autorização da direção, registrada" : "excepcional: nova análise integral";
        return { desconto_pct: d, total: od.total, margem_pct: mc, margem_pct_produtividade_65: x65.mcTotal?.pct ?? null, margem_produtos_pct: x.produtos.mc?.pct ?? null, alcada_politica_secao_9: alcada };
      });
      const custoMaterial = r2(novas.filter((l: any) => l.tipo === "goods" && Number(l.custo) > 1).reduce((s: number, l: any) => s + Number(l.custo) * l.qtd, 0));
      const p50 = r2(total * 0.5), p40 = r2(total * 0.4);
      const dolar = await memo(ctx, "ptax:hoje", () => serieDolar(null));
      const ptax = dolar.serie.length ? dolar.serie[dolar.serie.length - 1] : null;
      fonte(ctx, "Política de Saúde Financeira V1 (BIB-0011): preço pela margem de contribuição, alçada de desconto e recebimento por fase", "política vigente");
      return {
        numero: o.numero, alvo_pct: alvo, premissas: premissas(par, canal),
        custos_usados: custos,
        mudam: novas.filter((l: any) => l.mudou).map((l: any) => ({ nome: l.nome, qtd: l.qtd, unidade: l.unidade, de: l.de, para: l.preco, total_linha: l.total, custo: l.custo })),
        mantidos: novas.filter((l: any) => !l.mudou).map((l: any) => ({ nome: l.nome, qtd: l.qtd, preco: l.preco, total_linha: l.total, obs: l.obs ?? (l.tipo === "service" ? "mão de obra mantida" : "") })),
        total_antes: o.total, total_novo: total, diferenca: r2(total - o.total), diferenca_pct: r1((total / o.total - 1) * 100),
        produtos: { venda: an.produtos.venda, margem: an.produtos.mc }, mao_de_obra: an.mo.valor,
        margem_total: an.mcTotal ? { ...an.mcTotal, faixa: faixa(an.mcTotal.pct) } : null, margem_total_produtividade_65: a65.mcTotal,
        descontos, custo_do_material: custoMaterial,
        pagamento_referencia_politica_secao_10: { assinatura_50: p50, antes_da_instalacao_40: p40, entrega_tecnica_10: r2(total - p50 - p40), cobre_material: p50 >= custoMaterial },
        condicao_sugerida_proposta_bib_0090: condicaoSugerida({ custoProdutos: custoMaterial, total, entradaMinima: par.p.entradaPct ?? 40, validadeDias: par.p.validadeDias ?? 7, ptax }),
        nota: "Rascunho para o fundador revisar: nada foi criado nem alterado no Zoho.",
      };
    },
  },
  {
    nome: "preco_pela_politica",
    papeis: FIN,
    descricao: "Preço de venda para um custo nas faixas da Política (meta 35%, mínimo 30%, piso 25%), com imposto, provisão de 2% e comissão/RT do canal. Fórmula oficial: P = C / [(1 − t)(1 − 2% − alvo) − v].",
    parametros: obj({ custo: num("custo unitário em reais"), tipo: str("produto ou servico", { enum: ["produto", "servico"] }), canal: str("canal de venda (opcional)") }, ["custo", "tipo"]),
    async executar(a, ctx) {
      const par = await carregarParametros(ctx);
      const canal = canalDe(par.p, a.canal);
      const t = a.tipo === "servico" ? par.params.tServico : par.params.tProduto;
      const c = Number(a.custo);
      if (!(c > 0)) throw new Error("custo precisa ser maior que zero");
      if (t === null) return { erro: "LACUNA: alíquota não informada" };
      return { custo: c, imposto_pct: t, despesas_canal_pct: canal.v, canal: canal.nome, origem_imposto: premissas(par, canal).origem_imposto, meta_35: precoPolitica(c, { t, v: canal.v, alvo: 35 }), minimo_30: precoPolitica(c, { t, v: canal.v, alvo: 30 }), piso_25: precoPolitica(c, { t, v: canal.v, alvo: 25 }) };
    },
  },
  {
    nome: "margem_de_um_preco",
    papeis: FIN,
    descricao: "Margem de contribuição (fórmula oficial da Política) de um preço já praticado, com a faixa (VERDE, ACEITÁVEL, ATENÇÃO, NÃO APROVADO).",
    parametros: obj({ preco: num("preço de venda unitário"), custo: num("custo unitário"), tipo: str("produto ou servico", { enum: ["produto", "servico"] }), canal: str("canal (opcional)") }, ["preco", "custo", "tipo"]),
    async executar(a, ctx) {
      const par = await carregarParametros(ctx);
      const canal = canalDe(par.p, a.canal);
      const t = a.tipo === "servico" ? par.params.tServico : par.params.tProduto;
      if (t === null) return { erro: "LACUNA: alíquota não informada" };
      const m = margem(Number(a.preco), Number(a.custo), { t, v: canal.v });
      return { ...m, faixa: m ? faixa(m.pct) : null, imposto_pct: t, despesas_canal_pct: canal.v, canal: canal.nome };
    },
  },
  {
    nome: "diagnostico_dos_orcamentos",
    papeis: FIN,
    descricao: "Diagnóstico da carteira de orçamentos aceitos do Zoho contra a Política: total vendido, descontos, acima da alçada, mão de obra dada no desconto, sinais mais frequentes e margem estimada por orçamento.",
    parametros: obj({}),
    async executar(_a, ctx) {
      const [par, orc] = await Promise.all([carregarParametros(ctx), carregarOrcamentos(ctx)]);
      const r = resumir(orc, par.params);
      return {
        quantidade: r.quantidade, total: r.total, bruto: r.bruto, desconto: r.desconto, desconto_pct: r.descPct, acima_da_alcada_5pct: r.acimaAlcada, mao_de_obra_dada: r.maoDeObraDada, conversao_pct: r.conversaoPct, situacoes: r.status, margens_completas: r.margensCompletas,
        sinais: r.sinais, impostos: par.simulado ? "SIMULAÇÃO" : "informados",
        aceitos: r.aceitos.slice(0, 50).map((x: any) => ({ numero: x.numero, data: x.data, cliente: x.cliente, total: x.total, desconto_pct: x.descPct, margem_bruta_produtos_pct: x.margemBensPct, margem_estimada_pct: x.margem?.pct ?? null, faixa: x.faixa, completa: x.margemCompleta, sinais: x.sinais })),
      };
    },
  },
  {
    nome: "previsao_de_caixa",
    papeis: FIN,
    descricao: "Previsão de caixa do VEOS (entradas de parcelas − saídas de compras e contas) de 2 meses atrás a 6 à frente, por mês, com o que já foi recebido/pago.",
    parametros: obj({}),
    async executar(_a, ctx) {
      const hoje = new Date();
      const de = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 2, 1)).toISOString().slice(0, 10);
      const ate = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 6, 1)).toISOString().slice(0, 10);
      const r = await rpc("caixa_previsao", { p_de: de, p_ate: ate });
      fonte(ctx, "Previsão de caixa do VEOS (parcelas, compras e contas a pagar)", "dado");
      return { ...r, mes_atual: hoje.toISOString().slice(0, 7), aviso: "Sem saldo bancário inicial importado: a previsão mostra fluxo, não saldo (LACUNA)." };
    },
  },
  {
    nome: "painel_executivo",
    papeis: FIN,
    descricao: "Painel executivo: vendas aceitas por mês, faturado (NF registradas), caixa previsto x recebido, pedidos com margem bruta orçada, funil do CRM e alertas.",
    parametros: obj({}),
    async executar(_a, ctx) {
      const r = await rpc("painel_executivo", { p_meses: 12 });
      fonte(ctx, "Painel executivo do VEOS", "dado");
      const cortar = (v: any): any => Array.isArray(v) ? v.slice(0, 24).map(cortar) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !/cliente|contato|email|telefone|nome_cliente/i.test(k)).map(([k, x]) => [k, cortar(x)])) : v;
      return cortar(r);
    },
  },
  {
    nome: "custo_real_do_produto",
    papeis: FIN,
    descricao: "Custo real de um produto do catálogo do VEOS (compras de origem, fator de importação medido, variação do dólar desde a compra, custo no Brasil hoje) e o preço pela Política; vínculos com itens do Zoho.",
    parametros: obj({ busca: str("nome, marca, modelo ou código PRD-0000") }, ["busca"]),
    async executar(a, ctx) {
      const q = String(a.busca ?? "").replace(/[^\p{L}\p{N} .-]/gu, " ").trim().slice(0, 60);
      if (q.length < 2) throw new Error("busca muito curta");
      const termo = encodeURIComponent(`*${q.replace(/\s+/g, "*")}*`);
      const prods = await servico(`/rest/v1/produtos?situacao=in.(ativo,revisar)&or=(nome.ilike.${termo},codigo.ilike.${termo},modelo.ilike.${termo},marca.ilike.${termo})&select=id,codigo,nome,marca,modelo,custo_ultimo,custo_data,preco_venda&limit=5`);
      if (!prods.length) return { aviso: "nenhum produto do catálogo do VEOS com esse termo" };
      const vinc = await servico(`/rest/v1/produto_vinculos_zoho?produto_id=in.(${prods.map((p: any) => p.id).join(",")})&select=produto_id,zoho_item_id,relacao,situacao`);
      const ids = [...new Set(vinc.map((v: any) => v.zoho_item_id))] as string[];
      const par = await carregarParametros(ctx);
      const cat = await custosDoCatalogo(ctx, ids, par);
      const zoho = ids.length ? await servico(`/rest/v1/zoho_registros?produto=eq.books&modulo=eq.items&zoho_id=in.(${ids.join(",")})&select=zoho_id,nome,custo:dados->>purchase_rate,preco:dados->>rate`) : [];
      const canal = canalDe(par.p, null);
      return {
        produtos: prods.map((p: any) => {
          const meus = vinc.filter((v: any) => v.produto_id === p.id);
          const det = meus.map((v: any) => (cat.get(v.zoho_item_id)?.vinculos ?? []).find((x: any) => x.produto === p.codigo)).find(Boolean) ?? null;
          const custoHoje = det?.custo_no_brasil_hoje ?? null;
          return {
            codigo: p.codigo, nome: p.nome, marca: p.marca, modelo: p.modelo, preco_pago_ultimo: p.custo_ultimo, data: p.custo_data, preco_venda_definido: p.preco_venda,
            custo_no_brasil_hoje: custoHoje, detalhe: det,
            preco_meta_35: custoHoje && par.params.tProduto !== null ? precoPolitica(custoHoje, { t: par.params.tProduto, v: canal.v, alvo: 35 }) : null, canal: canal.nome,
            itens_zoho: meus.map((v: any) => ({ ...v, ...(zoho.find((z: any) => z.zoho_id === v.zoho_item_id) ?? {}) })),
          };
        }),
      };
    },
  },
  {
    nome: "pedidos_e_recebiveis",
    papeis: FIN,
    descricao: "Pedidos do VEOS (orçamentos aceitos que viraram pedido): situação, valor, parcelas recebidas/abertas/atrasadas, exposição de caixa pela Política V1.1 e margem orçada x realizada. Opcional: número do pedido para o detalhe.",
    parametros: obj({ numero: str("número do pedido PED-00001 (opcional)"), situacao: str("rascunho, confirmado, entregue, faturado, concluido (opcional)") }),
    async executar(a, ctx) {
      const num = String(a.numero ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
      const est = /^[a-z]{5,10}$/.test(String(a.situacao ?? "")) ? `&estado=eq.${a.situacao}` : "&estado=neq.cancelado";
      const filtro = num ? `&numero=eq.${num}` : est;
      const peds = await servico(`/rest/v1/pedidos?select=id,numero,orcamento_numero,cliente_zoho_id,estado,valor_total,custo_total,criado_em,confirmado_em,entregue_em,faturado_em${filtro}&order=criado_em.desc&limit=${num ? 1 : 30}`);
      fonte(ctx, "Pedidos, parcelas e contas do VEOS (fluxo vivo)", "dado");
      if (!peds.length) return { aviso: num ? `pedido ${num} não existe` : "nenhum pedido no VEOS: os orçamentos aceitos ainda não viraram pedido (Operação → Pedidos)" };
      const ids = peds.map((p: any) => p.id).join(",");
      const parcelas = await servico(`/rest/v1/parcelas?pedido_id=in.(${ids})&select=pedido_id,numero,vencimento,valor,estado,recebido_em,valor_recebido&order=vencimento`);
      const hoje = hojeSP();
      const lista = [];
      for (const p of peds) {
        const ps = parcelas.filter((x: any) => x.pedido_id === p.id);
        const item: Record<string, unknown> = {
          numero: p.numero, orcamento: p.orcamento_numero, situacao: p.estado, valor_total: Number(p.valor_total), custo_orcado: p.custo_total === null ? null : Number(p.custo_total),
          recebido: r2(ps.filter((x: any) => x.estado === "recebida").reduce((s: number, x: any) => s + Number(x.valor_recebido ?? x.valor), 0)),
          a_receber: r2(ps.filter((x: any) => x.estado === "aberta").reduce((s: number, x: any) => s + Number(x.valor), 0)),
          atrasado: r2(ps.filter((x: any) => x.estado === "aberta" && x.vencimento < hoje).reduce((s: number, x: any) => s + Number(x.valor), 0)),
          parcelas: ps.map((x: any) => ({ numero: x.numero, vencimento: x.vencimento, valor: Number(x.valor), situacao: x.estado, recebido_em: x.recebido_em })),
        };
        if (num || peds.length <= 10) item.caixa_politica_v1_1 = await caixaPedido(p.id, p.valor_total);
        if (num) item.margem = await rpc("pedido_margem", { p_pedido: p.id });
        lista.push(item);
      }
      return { pedidos: lista };
    },
  },
  {
    nome: "caixa_e_contas",
    papeis: FIN,
    descricao: "Contas bancárias da empresa com o saldo de hoje (pelo extrato importado ou saldo informado), data da âncora do saldo, último extrato importado e lançamentos sem categoria.",
    parametros: obj({}),
    async executar(_a, ctx) {
      const contas = await contasComSaldo();
      fonte(ctx, "Extrato bancário importado no VEOS (Caixa e extrato)", "dado");
      const ativas = contas.filter((k: any) => k.ativa);
      return {
        hoje: hojeSP(), contas: ativas.map((k: any) => ({ nome: k.nome, tipo: k.tipo, saldo_hoje: k.saldo_hoje, ancora: k.ancora_em ? `${k.ancora_origem} em ${k.ancora_em}` : "LACUNA: sem saldo", ultimo_extrato_ate: k.ultimo_extrato?.periodo_ate ?? null, sem_categoria: k.sem_categoria })),
        saldo_total_com_saldo: ativas.some((k: any) => k.saldo_hoje !== null) ? r2(ativas.filter((k: any) => k.saldo_hoje !== null).reduce((s: number, k: any) => s + Number(k.saldo_hoje), 0)) : null,
        aviso: ativas.length ? null : "LACUNA: nenhuma conta bancária cadastrada no VEOS (Ferramentas do CFO → Caixa e extrato).",
      };
    },
  },
  {
    nome: "fluxo_13_semanas",
    papeis: FIN,
    descricao: "Fluxo de caixa de 13 semanas: saldo real de hoje + parcelas a receber − contas a pagar (inclusive recorrentes) − imposto estimado; menor saldo, necessidade de caixa em 30/60/90 dias, reserva da Política (3 meses de fixos) e alertas.",
    parametros: obj({ semanas: { type: "integer", description: "4 a 26 (padrão 13)" } }),
    async executar(a, ctx) {
      const d = await dadosSemanas(Number(a.semanas) || 13);
      const res = reserva({ recorrentes: d.recorrentes, fixosFormulario: d.impostos?.fixos_formulario ?? null, retirada: d.impostos?.retirada_formulario ?? null });
      const f = projetar({ hoje: d.hoje, semanas: d.semanas, saldos: d.saldos, parcelas: d.parcelas, contas: d.contas, impostos: d.impostos, entradasRealizadasMes: d.entradas_realizadas_mes, reservaMeta: res.meta });
      fonte(ctx, "Fluxo de 13 semanas do VEOS (extrato, parcelas, contas a pagar e recorrentes)", "dado");
      if (String(d.impostos?.origem ?? "").startsWith("SIMULA")) fonte(ctx, "Simulação de impostos do VEOS (Simples, faturamento de 12 meses pelo Zoho)", "simulação");
      return { hoje: d.hoje, saldo_hoje: f.saldoHoje, contas_sem_saldo: f.semSaldo, reserva_politica: res, menor_saldo: f.menorSaldo, necessidade_de_caixa: f.necessidade, atrasadas: f.atrasadas, impostos: { aliquota: f.impostos.aliquota, origem: f.impostos.origem, provisoes: f.impostos.provisoes },
        semanas: f.semanas.map((s: any) => ({ semana: s.n, de: s.inicio, ate: s.fim, entradas: s.entradas, saidas: s.saidas, impostos: s.impostos, saldo_final: s.saldo_final, principais: s.itens.slice(0, 5).map((i: any) => `${i.data} ${i.descricao} ${i.valor}`) })), alertas: f.alertas };
    },
  },
  {
    nome: "fechamento_do_mes",
    papeis: FIN,
    descricao: "DRE gerencial de um mês pelo extrato classificado no plano de contas: receita, deduções, receita líquida, margem de contribuição, despesas fixas, resultado operacional, retirada, financeiro, resultado de caixa; pendências de classificação e conferência com o saldo.",
    parametros: obj({ mes: str("mês AAAA-MM (padrão: mês atual)") }),
    async executar(a, ctx) {
      const mes = /^\d{4}-\d{2}$/.test(String(a.mes ?? "")) ? String(a.mes) : hojeSP().slice(0, 7);
      const d = await dadosFechamento(mes);
      if (!d.movimentos.length) {
        return { mes, lacuna: "Nenhum lançamento de extrato no mês: sem extrato importado não há DRE pelo caixa (Ferramentas do CFO → Caixa e extrato).", faturado_nf: r2((d.notas ?? []).reduce((s: number, n: any) => s + Number(n.valor), 0)), recorrentes_do_mes: r2((d.contas_competencia ?? []).reduce((s: number, k: any) => s + Number(k.valor), 0)) };
      }
      const soma = (l: any[]) => (l ?? []).filter((s) => s.saldo !== null).reduce((t: number, s: any) => t + Number(s.saldo), 0);
      const tem = (l: any[]) => (l ?? []).some((s) => s.saldo !== null);
      const r = dre({ movimentos: d.movimentos, plano: d.plano, impostos: d.impostos, saldoInicio: tem(d.saldo_inicio) ? soma(d.saldo_inicio) : null, saldoFim: tem(d.saldo_fim) ? soma(d.saldo_fim) : null });
      fonte(ctx, `Fechamento do mês ${mes} (extrato classificado no plano de contas)`, "dado");
      return { mes, linhas: r.linhas.map((l: any) => ({ linha: l.nome, valor: l.valor, pct_receita_liquida: l.pct ?? null })), indicadores: r.indicadores, por_categoria: r.categorias, pendentes: r.pendentes, imposto: r.imposto, conferencia: r.conferencia, completo: r.completo, avisos: r.avisos,
        faturado_nf: r2((d.notas ?? []).reduce((s: number, n: any) => s + Number(n.valor), 0)), recorrentes_do_mes: r2((d.contas_competencia ?? []).reduce((s: number, k: any) => s + Number(k.valor), 0)) };
    },
  },
  {
    nome: "indicadores_da_politica",
    papeis: FIN,
    descricao: "Indicadores da Política de Saúde Financeira (sec.13) e reserva (sec.12): vendido, recebido, receita líquida, margem de contribuição consolidada, margem operacional, ticket médio, contas a receber e a pagar com aging, prazo médio de recebimento, inadimplência, exposição, necessidade de caixa, concentração por cliente, % abaixo da margem mínima e reserva em meses — cada um com fórmula, meta da Política e LACUNA quando falta dado.",
    parametros: obj({}),
    async executar(_a, ctx) {
      const [d, s, par, orc] = await Promise.all([dadosIndicadores(), dadosSemanas(13), carregarParametros(ctx), carregarOrcamentos(ctx)]);
      const fluxo = projetar({ hoje: s.hoje, saldos: s.saldos, parcelas: s.parcelas, contas: s.contas, impostos: s.impostos, entradasRealizadasMes: s.entradas_realizadas_mes });
      const umAno = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
      const diagnostico = resumir(orc.filter((o: any) => o.data >= umAno), par.params);
      const r = indicadores(d, { fluxo, diagnostico });
      fonte(ctx, "Indicadores da Política no VEOS (extrato, pedidos, contas, Zoho)", "dado");
      return { indicadores: r.indicadores.map((i: any) => ({ nome: i.nome, valor: i.valor, unidade: i.unidade, meta: i.meta, situacao: i.situacao, lacuna: i.lacuna ?? null, formula: i.formula, detalhe: i.detalhe ?? null, nota: i.nota ?? null })), meses: r.meses, reserva: r.reserva, tem_extrato: r.temExtrato };
    },
  },
];

const SETORES_FIN = new Set(["financas", "direcao"]);

/** Ferramentas oferecidas ao diretor do setor (as financeiras vao para CFO e CEO). */
export function ferramentasDoSetor(setor: string): Ferramenta[] {
  return FERRAMENTAS.filter((f) => !f.papeis || SETORES_FIN.has(setor));
}

/** Executa uma ferramenta pelo nome com o papel de quem perguntou. */
export async function executarFerramenta(nome: string, args: Record<string, unknown>, ctx: Contexto) {
  const f = FERRAMENTAS.find((x) => x.nome === nome);
  if (!f) throw new Error(`ferramenta inexistente: ${nome}`);
  if (f.papeis && !f.papeis.includes(ctx.papel)) return { erro: `sem acesso: ${nome} é só para ${f.papeis.join(" e ")} (quem perguntou é ${ctx.papel})` };
  return await f.executar(args ?? {}, ctx);
}

export function diretorDoSetor(setor: string) {
  const s = (CATALOGO as any[]).find((x) => x.id === setor);
  return s ? { setorNome: s.nome as string, diretor: s.diretor } : null;
}

export function procedimentosDoSetor(setor: string): string[] {
  return (MANUAIS[setor]?.procedimentos ?? []).map((p: any) => `${p.pedido}${p.ferramentas_veos?.length ? ` → ferramentas: ${p.ferramentas_veos.join(", ")}` : ""}`);
}
