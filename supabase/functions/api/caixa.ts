// CAIXA REAL do VEOS (direcao e financas): contas bancarias, extrato importado (OFX/CSV lido no
// navegador e enviado em lotes), classificacao pelo plano de contas gerencial, conciliacao com parcelas
// e contas a pagar, contas recorrentes e os dados do fluxo de 13 semanas, do fechamento do mes (DRE)
// e dos indicadores da Politica (sec.13). Calculos: apps/web/js/domain/{caixa13,dre,indicadores}.js.
//   GET  /caixa/contas                         contas com saldo de hoje
//   POST /caixa/contas                         {nome, banco?, final_conta?, tipo?, saldo_inicial?, saldo_inicial_em?}
//   POST /caixa/contas/:id                     {nome?, ativa?, saldo_inicial?, saldo_inicial_em?}
//   POST /caixa/contas/:id/extrato             {arquivo, formato, saldo_final?, saldo_final_em?, linhas[<=400]}
//   GET  /caixa/movimentos?conta=&de=&ate=&filtro=pendentes|sem_categoria|todos
//   POST /caixa/movimentos/:id/classificar     {categoria, observacao?, padrao?}
//   POST /caixa/movimentos/:id/conciliar       {tipo: parcela|conta_pagar|transferencia|desfazer, alvo_id?}
//   GET  /caixa/sugestoes                      POST /caixa/sugestoes/aplicar   (so as sugestoes unicas)
//   GET  /caixa/plano                          POST /caixa/plano {codigo, nome, grupo, natureza}   POST /caixa/plano/:codigo {nome?, ativo?}
//   GET  /caixa/recorrentes                    POST /caixa/recorrentes {..}   POST /caixa/recorrentes/:id {..}
//   POST /caixa/recorrentes/importar           custos fixos, dividas e retirada do Formulario do CFO
//   GET  /caixa/semanas?semanas=13             dados do fluxo de 13 semanas
//   GET  /caixa/fechamento?mes=AAAA-MM         dados do DRE gerencial do mes
//   GET  /caixa/indicadores                    dados dos indicadores (12 meses)
import { HttpError, type Membro, registrarAcesso, servico } from "../_shared/banco.ts";
import { contasComSaldo, dadosFechamento, dadosIndicadores, dadosSemanas, hojeSP } from "../_shared/caixa_dados.ts";

const FINANCEIRO = ["direcao", "financas"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MES_RE = /^\d{4}-\d{2}$/;
const PLANO_RE = /^[1-9](\.[0-9]{1,2}){1,2}$/;
const GRUPOS = ["receita", "deducao", "custo_variavel", "despesa_fixa", "retirada", "financeiro", "investimento", "transferencia", "nao_operacional"];
const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });
const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100) / 100);
const data = (v: unknown, nome: string) => {
  if (v === null || v === undefined || v === "") return null;
  if (!DATA_RE.test(String(v))) throw new HttpError(400, `${nome}: data inválida`);
  return String(v);
};
const r2 = (v: number) => Math.round(v * 100) / 100;

async function historico(alvo: string, acao: string, detalhe: unknown, usuario: string) {
  await servico("/rest/v1/financeiro_historico", { method: "POST", body: JSON.stringify({ alvo, acao, detalhe, usuario }) });
}

export async function rotearCaixa(req: Request, partes: string[], eu: Membro, corpo: Record<string, any>) {
  if (!FINANCEIRO.includes(eu.papel)) throw new HttpError(403, "caixa: só direção e financeiro");
  const [, a, b, c] = partes;
  const post = req.method === "POST";
  const q = new URL(req.url).searchParams;
  const u = eu.user_id;

  // ---------------------------------------------------------------- contas bancarias
  if (a === "contas" && !post && !b) return { contas: await contasComSaldo(), hoje: hojeSP() };
  if (a === "contas" && post && !b) {
    const nome = txt(corpo.nome, 80);
    if (!nome || nome.length < 2) throw new HttpError(400, "nome da conta obrigatório");
    const fc = txt(corpo.final_conta, 8);
    if (fc && !/^[0-9Xx-]{1,8}$/.test(fc)) throw new HttpError(400, "informe só os últimos dígitos da conta");
    const tipo = ["corrente", "poupanca", "aplicacao", "caixa", "cartao"].includes(String(corpo.tipo)) ? corpo.tipo : "corrente";
    const si = num(corpo.saldo_inicial), sie = data(corpo.saldo_inicial_em, "data do saldo");
    if ((si === null) !== (sie === null)) throw new HttpError(400, "saldo inicial precisa de valor e data juntos");
    const [k] = await servico("/rest/v1/contas_bancarias", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ nome, banco: txt(corpo.banco, 60), final_conta: fc, tipo, saldo_inicial: si, saldo_inicial_em: sie, criado_por: u }) });
    await historico(`conta:${k.id}`, "conta_criada", { nome, tipo, saldo_inicial: si, saldo_inicial_em: sie }, u);
    return { id: k.id };
  }
  if (a === "contas" && post && b && UUID_RE.test(b) && !c) {
    const [antes] = await servico(`/rest/v1/contas_bancarias?id=eq.${b}&select=*`);
    if (!antes) throw new HttpError(404, "conta inexistente");
    const mud: Record<string, unknown> = {};
    if (txt(corpo.nome, 80)) mud.nome = txt(corpo.nome, 80);
    if (typeof corpo.ativa === "boolean") mud.ativa = corpo.ativa;
    if ("saldo_inicial" in corpo || "saldo_inicial_em" in corpo) {
      const si = num(corpo.saldo_inicial), sie = data(corpo.saldo_inicial_em, "data do saldo");
      if ((si === null) !== (sie === null)) throw new HttpError(400, "saldo precisa de valor e data juntos");
      if (sie && sie > hojeSP()) throw new HttpError(400, "data do saldo no futuro");
      Object.assign(mud, { saldo_inicial: si, saldo_inicial_em: sie });
    }
    if (!Object.keys(mud).length) throw new HttpError(400, "nada para alterar");
    await servico(`/rest/v1/contas_bancarias?id=eq.${b}`, { method: "PATCH", body: JSON.stringify(mud) });
    await historico(`conta:${b}`, "conta_alterada", { antes: { nome: antes.nome, ativa: antes.ativa, saldo_inicial: antes.saldo_inicial, saldo_inicial_em: antes.saldo_inicial_em }, depois: mud }, u);
    return { ok: true };
  }
  if (a === "contas" && post && b && UUID_RE.test(b) && c === "extrato") {
    const linhas = Array.isArray(corpo.linhas) ? corpo.linhas : [];
    if (!linhas.length) throw new HttpError(400, "extrato sem lançamentos");
    if (linhas.length > 400) throw new HttpError(400, "envie no máximo 400 lançamentos por vez");
    const limpas = linhas.map((l: Record<string, unknown>, i: number) => {
      const d = data(l.data, `lançamento ${i + 1}`), v = num(l.valor);
      if (!d || v === null) throw new HttpError(400, `lançamento ${i + 1}: data e valor obrigatórios`);
      return { data: d, valor: v, descricao: txt(l.descricao, 300) ?? "(sem histórico)", documento: txt(l.documento, 60), id_externo: txt(l.id_externo, 120), seq: Number.isInteger(l.seq) ? l.seq : 1 };
    });
    const r = await rpc("extrato_importar", { p: { usuario: u, conta_id: b, arquivo: txt(corpo.arquivo, 200) ?? "extrato", formato: ["ofx", "csv", "manual"].includes(String(corpo.formato)) ? corpo.formato : "csv", saldo_final: num(corpo.saldo_final), saldo_final_em: data(corpo.saldo_final_em, "data do saldo final"), linhas: limpas } });
    return r;
  }

  // ---------------------------------------------------------------- lancamentos
  if (a === "movimentos" && !post) {
    const f: string[] = [];
    if (UUID_RE.test(q.get("conta") ?? "")) f.push(`conta_id=eq.${q.get("conta")}`);
    if (DATA_RE.test(q.get("de") ?? "")) f.push(`data=gte.${q.get("de")}`);
    if (DATA_RE.test(q.get("ate") ?? "")) f.push(`data=lte.${q.get("ate")}`);
    const filtro = q.get("filtro");
    if (filtro === "sem_categoria") f.push("categoria=is.null");
    if (filtro === "pendentes") f.push("or=(categoria.is.null,and(parcela_id.is.null,conta_pagar_id.is.null,transferencia_de.is.null,categoria.in.(1.1,3.1,3.2,3.3)))");
    const movs = await servico(`/rest/v1/movimentos_bancarios?select=id,conta_id,data,valor,descricao,documento,categoria,parcela_id,conta_pagar_id,transferencia_de,observacao,classificado_por,parcela:parcelas(numero,pedido:pedidos(id,numero)),conta:contas_pagar(id,descricao,fornecedor)&${f.join("&")}${f.length ? "&" : ""}order=data.desc,criado_em.desc&limit=${Math.min(1000, Number(q.get("limite")) || 300)}`);
    await registrarAcesso(u, "caixa:movimentos (histórico do extrato)");
    return { movimentos: movs };
  }
  if (a === "movimentos" && post && b && UUID_RE.test(b) && c === "classificar") {
    const cat = corpo.categoria === null || corpo.categoria === "" ? null : String(corpo.categoria ?? "");
    if (cat !== null && !PLANO_RE.test(cat)) throw new HttpError(400, "categoria inválida");
    return await rpc("movimento_classificar", { p: { usuario: u, movimento_id: b, categoria: cat ?? "", observacao: txt(corpo.observacao, 300), padrao: txt(corpo.padrao, 80) } });
  }
  if (a === "movimentos" && post && b && UUID_RE.test(b) && c === "conciliar") {
    const tipo = String(corpo.tipo ?? "");
    if (!["parcela", "conta_pagar", "transferencia", "desfazer"].includes(tipo)) throw new HttpError(400, "tipo de conciliação inválido");
    if (tipo !== "desfazer" && !UUID_RE.test(String(corpo.alvo_id ?? ""))) throw new HttpError(400, "informe o título a conciliar");
    return await rpc("movimento_conciliar", { p: { usuario: u, movimento_id: b, tipo, alvo_id: corpo.alvo_id ?? null } });
  }
  if (a === "sugestoes" && !post) return { sugestoes: await rpc("conciliacao_sugestoes", {}) };
  if (a === "sugestoes" && post && b === "aplicar") {
    const todas = await rpc("conciliacao_sugestoes", {});
    let feitas = 0;
    const erros: string[] = [];
    for (const s of todas.filter((x: { unica: boolean }) => x.unica)) {
      try {
        await rpc("movimento_conciliar", { p: { usuario: u, movimento_id: s.movimento_id, tipo: s.tipo, alvo_id: s.alvo_id } });
        feitas++;
      } catch (e) { erros.push((e as Error).message); }
    }
    return { conciliadas: feitas, erros };
  }

  // ---------------------------------------------------------------- plano de contas
  if (a === "plano" && !post) return { plano: await servico("/rest/v1/plano_contas?select=codigo,nome,grupo,natureza,ativo&order=codigo") };
  if (a === "plano" && post && !b) {
    const codigo = String(corpo.codigo ?? "");
    if (!PLANO_RE.test(codigo)) throw new HttpError(400, "código no formato 4.10 ou 4.1.2");
    const nome = txt(corpo.nome, 80);
    if (!nome) throw new HttpError(400, "nome obrigatório");
    if (!GRUPOS.includes(String(corpo.grupo))) throw new HttpError(400, "grupo inválido");
    if (!["entrada", "saida", "ambas"].includes(String(corpo.natureza))) throw new HttpError(400, "natureza inválida");
    await servico("/rest/v1/plano_contas", { method: "POST", body: JSON.stringify({ codigo, nome, grupo: corpo.grupo, natureza: corpo.natureza, criado_por: u }) });
    await historico(`plano:${codigo}`, "categoria_criada", { nome, grupo: corpo.grupo }, u);
    return { codigo };
  }
  if (a === "plano" && post && b && PLANO_RE.test(b)) {
    const mud: Record<string, unknown> = {};
    if (txt(corpo.nome, 80)) mud.nome = txt(corpo.nome, 80);
    if (typeof corpo.ativo === "boolean") mud.ativo = corpo.ativo;
    if (!Object.keys(mud).length) throw new HttpError(400, "nada para alterar");
    await servico(`/rest/v1/plano_contas?codigo=eq.${b}`, { method: "PATCH", body: JSON.stringify(mud) });
    await historico(`plano:${b}`, "categoria_alterada", mud, u);
    return { ok: true };
  }

  // ---------------------------------------------------------------- recorrentes
  if (a === "recorrentes" && !post) {
    const [lista, proximas] = await Promise.all([
      servico("/rest/v1/contas_recorrentes?select=*&order=ativa.desc,plano_conta,descricao"),
      servico(`/rest/v1/contas_pagar?recorrente_id=not.is.null&estado=eq.aberta&select=recorrente_id,vencimento,valor&order=vencimento&limit=500`),
    ]);
    return { recorrentes: lista.map((r: Record<string, any>) => ({ ...r, proxima: proximas.find((p: { recorrente_id: string }) => p.recorrente_id === r.id) ?? null })) };
  }
  if (a === "recorrentes" && post && b === "importar") return await importarDoFormulario(u);
  if (a === "recorrentes" && post && (!b || UUID_RE.test(b))) {
    const v = corpo.valor === undefined ? null : num(corpo.valor);
    const p: Record<string, unknown> = { usuario: u, id: b ?? null };
    if (!b || "descricao" in corpo) { const d = txt(corpo.descricao, 200); if (!d) throw new HttpError(400, "descrição obrigatória"); p.descricao = d; }
    if ("fornecedor" in corpo) p.fornecedor = txt(corpo.fornecedor, 200);
    if (!b || "plano_conta" in corpo) { if (!PLANO_RE.test(String(corpo.plano_conta ?? ""))) throw new HttpError(400, "categoria do plano de contas obrigatória"); p.plano_conta = corpo.plano_conta; }
    if (!b || "valor" in corpo) { if (!(v !== null && v > 0)) throw new HttpError(400, "valor maior que zero"); p.valor = v; }
    if (!b || "dia_vencimento" in corpo) { const d = Number(corpo.dia_vencimento); if (!(Number.isInteger(d) && d >= 1 && d <= 28)) throw new HttpError(400, "dia de vencimento de 1 a 28"); p.dia_vencimento = d; }
    if ("parcelas" in corpo) { const n = corpo.parcelas === null || corpo.parcelas === "" ? null : Number(corpo.parcelas); if (n !== null && !(Number.isInteger(n) && n >= 1 && n <= 360)) throw new HttpError(400, "parcelas de 1 a 360"); p.parcelas = n; }
    if ("inicio" in corpo) p.inicio = data(corpo.inicio, "início");
    if (typeof corpo.ativa === "boolean") p.ativa = corpo.ativa;
    return await rpc("recorrente_salvar", { p });
  }

  // ---------------------------------------------------------------- dados dos calculos
  if (a === "semanas" && !post) return await dadosSemanas(Number(q.get("semanas")) || 13);
  if (a === "fechamento" && !post) {
    const mes = MES_RE.test(q.get("mes") ?? "") ? q.get("mes")! : hojeSP().slice(0, 7);
    await registrarAcesso(u, `caixa:fechamento ${mes}`);
    return await dadosFechamento(mes);
  }
  if (a === "indicadores" && !post) return await dadosIndicadores();
  throw new HttpError(404, "rota inexistente");
}

/** Cria recorrentes a partir do Formulario do CFO (custos fixos, dividas e retirada). Nao duplica (origem + descricao). */
async function importarDoFormulario(u: string) {
  const [linhas, existentes] = await Promise.all([
    rpc("formulario_vigente", { p_formulario: "cfo" }),
    servico("/rest/v1/contas_recorrentes?select=origem,descricao"),
  ]);
  const resp: Record<string, any> = {};
  for (const l of linhas ?? []) resp[l.secao] = l.dados;
  const ja = new Set(existentes.map((x: { origem: string; descricao: string }) => `${x.origem}|${x.descricao.toLowerCase()}`));
  const n = (v: unknown) => { const x = Number(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return Number.isFinite(x) && x > 0 ? r2(x) : null; };
  const criar: Record<string, unknown>[] = [];
  const PLANO_FIXO: [RegExp, string][] = [[/aluguel|condom|energia|luz|agua/i, "4.2"], [/contab|contador/i, "4.3"], [/sistema|software|zoho|google|microsoft|licen|assinatura/i, "4.4"], [/telefone|internet|celular|vivo|claro|tim\b/i, "4.5"], [/veicul|combust|seguro|carro|ipva/i, "4.6"], [/marketing|anuncio|instagram|meta ads|google ads/i, "4.7"], [/salario|funcion|encargo|fgts|inss|beneficio/i, "4.1"]];
  for (const f of resp.fixos?.itens ?? []) {
    const desc = String(f.descricao ?? f.nome ?? "").trim(), v = n(f.valor);
    if (!desc || !v || ja.has(`formulario:fixos|${desc.toLowerCase()}`)) continue;
    criar.push({ descricao: desc, fornecedor: desc, plano_conta: PLANO_FIXO.find(([re]) => re.test(desc))?.[1] ?? "4.9", valor: v, dia_vencimento: 10, origem: "formulario:fixos" });
  }
  for (const d of resp.dividas?.lista ?? []) {
    const credor = String(d.credor ?? d.tipo ?? "Dívida").trim(), v = n(d.parcela);
    const desc = `Parcela: ${credor}${d.tipo && d.tipo !== credor ? ` (${d.tipo})` : ""}`;
    if (!v || ja.has(`formulario:dividas|${desc.toLowerCase()}`)) continue;
    const parcelas = Number.isInteger(Number(d.parcelas_restantes)) && Number(d.parcelas_restantes) > 0 ? Number(d.parcelas_restantes) : null;
    criar.push({ descricao: desc, fornecedor: credor, plano_conta: /simples|das|imposto|pgfn|receita|parcelamento/i.test(`${credor} ${d.tipo ?? ""}`) ? "6.3" : "6.2", valor: v, dia_vencimento: 10, parcelas, origem: "formulario:dividas" });
  }
  const ret = n(resp.metas?.retirada_planejada) ?? n(resp.fixos?.pro_labore) ?? n(resp.fixos?.retirada_real);
  if (ret && !ja.has("formulario:retirada|retirada do sócio")) criar.push({ descricao: "Retirada do sócio", fornecedor: "Sócio", plano_conta: "5.1", valor: ret, dia_vencimento: 5, origem: "formulario:retirada" });
  const ids: string[] = [];
  for (const p of criar) ids.push((await rpc("recorrente_salvar", { p: { ...p, usuario: u } })).id);
  return { criadas: ids.length, observacao: ids.length ? "Vencimento padrão no dia 10 (retirada dia 5): ajuste cada uma se for diferente." : "Nada novo no formulário para trazer." };
}
