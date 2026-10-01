// BIBLIOTECA na funcao "api": memoria institucional e governanca. As regras (autoridade,
// estados, versoes, trava contra alteracao silenciosa, pareceres) ficam no banco (bib_*);
// aqui: identidade do membro, validacao de entrada, visibilidade e efeitos no Radar (tarefas).
//   GET  /biblioteca?area=&busca=&setor=&tipo=&estado=&responsavel=&de=&ate=
//   GET  /biblioteca/governanca             fundador, autoridades, alcadas e lacunas, pendencias
//   GET  /biblioteca/:id                    registro completo (fontes, vinculos, pareceres, versoes, historico)
//   POST /biblioteca                        criar registro
//   POST /biblioteca/consultar              busca de precedentes (registrada)
//   POST /biblioteca/:id/(transicao|revisar|divergir|parecer|encaminhar|fonte|vinculo)
//   POST /biblioteca/pareceres/:pid/responder
import { HttpError, lerCorpo, type Membro, servico } from "../_shared/banco.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const AREAS: Record<string, string> = {
  decisoes: "decisao,excecao,preferencia",
  aprendizados: "incidente,aprendizado",
  referencias: "referencia",
  politicas: "politica",
  revisoes: "proposta,ideia",
};
const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });
const lista = (v: unknown, max = 20) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => String(x).trim().slice(0, 60)).slice(0, max) : []);
const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

async function podeVer(eu: Membro, id: string) {
  const ok = await rpc("bib_pode_ver", { p_usuario: eu.user_id, p_registro: id });
  if (!ok) throw new HttpError(403, "registro restrito: seu perfil não tem acesso");
}

function fontes(v: unknown) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 20).map((f: Record<string, unknown>, i) => {
    if (!["interna", "especialista", "pesquisa", "documentacao", "metodo"].includes(String(f.tipo))) throw new HttpError(400, `fonte ${i + 1}: tipo inválido`);
    if (!["fato_verificado", "opiniao_fonte", "inferencia", "hipotese"].includes(String(f.natureza))) throw new HttpError(400, `fonte ${i + 1}: natureza inválida`);
    if (!txt(f.titulo, 300)) throw new HttpError(400, `fonte ${i + 1}: título obrigatório`);
    if (f.link && !/^https?:\/\//.test(String(f.link))) throw new HttpError(400, `fonte ${i + 1}: link inválido`);
    return { tipo: f.tipo, natureza: f.natureza, autor: txt(f.autor, 200), titulo: txt(f.titulo, 300), data_fonte: txt(f.data_fonte, 40), link: txt(f.link, 500), trecho: txt(f.trecho, 3000), versao_periodo: txt(f.versao_periodo, 200), acessada: f.acessada === true };
  });
}

export async function rotearBiblioteca(req: Request, partes: string[], eu: Membro) {
  const [, a, b, c] = partes; // biblioteca/:a/:b/:c
  const q = new URL(req.url).searchParams;
  const post = req.method === "POST";
  const corpo = post ? ((await lerCorpo(req)) ?? {}) : {};
  if (post && !CHAVE_RE.test(req.headers.get("Idempotency-Key") ?? "")) throw new HttpError(400, "Idempotency-Key obrigatorio");
  const u = eu.user_id;

  // ---------------------------------------------------------------- leitura
  if (!post && !a) {
    const area = q.get("area") ?? "";
    const tipos = AREAS[area] ?? (q.get("tipo") && /^[a-z]{4,12}$/.test(q.get("tipo")!) ? q.get("tipo")! : "");
    const filtros = { tipos, estado: q.get("estado") ?? "", setor: q.get("setor") ?? "", responsavel: (q.get("responsavel") ?? "").slice(0, 60), de: q.get("de") ?? "", ate: q.get("ate") ?? "", busca: (q.get("busca") ?? "").slice(0, 120), so_atuais: q.get("so_atuais") === "1" };
    for (const k of ["de", "ate"] as const) if (filtros[k] && !/^\d{4}-\d{2}-\d{2}$/.test(filtros[k])) throw new HttpError(400, "data inválida");
    let registros = await rpc("bib_listar", { p_usuario: u, f: filtros });
    if (area === "revisoes") registros = registros.filter((r: { estado: string }) => ["rascunho", "em_consulta", "aberta", "em_analise"].includes(r.estado));
    const pendentes = area === "revisoes" ? await servico("/rest/v1/biblioteca_pareceres?estado=eq.pendente&select=id,registro_id,setor_id,participacao,motivo,encaminhamento,prazo,responsavel_conclusao,solicitado_em,registro:biblioteca_registros(codigo,titulo)&order=solicitado_em.desc&limit=200") : [];
    return { registros: registros.map((r: Record<string, unknown>) => ({ id: r.id, codigo: r.codigo, tipo: r.tipo, estado: r.estado, titulo: r.titulo, setores: r.setores, assuntos: r.assuntos, autoridade: r.autoridade, autor_nome: r.autor_nome, responsavel: r.responsavel, registrado_em: r.registrado_em, vigente_desde: r.vigente_desde, versao: r.versao, restrito: r.restrito, hipotese: (r.dados as Record<string, unknown>)?.hipotese_a_validar === true })), pareceres_pendentes: pendentes };
  }
  if (!post && a === "governanca") {
    const [autoridades, alcadas, pendentes, meus] = await Promise.all([
      servico("/rest/v1/governanca_autoridades?select=autoridade,desde,membro:membros(nome,papel)"),
      servico("/rest/v1/governanca_alcadas?select=*&order=autoridade,assunto"),
      servico("/rest/v1/biblioteca_pareceres?estado=eq.pendente&encaminhamento=not.is.null&select=id,encaminhamento,motivo,prazo,registro:biblioteca_registros(id,codigo,titulo)"),
      servico(`/rest/v1/biblioteca_pareceres?estado=eq.pendente&setor_id=eq.${eu.papel}&select=id,participacao,motivo,prazo,registro:biblioteca_registros(id,codigo,titulo)`),
    ]);
    return { autoridades, alcadas, encaminhamentos: pendentes, meus_pareceres: meus, eu: { papel: eu.papel, autoridades: autoridades.filter((x: { membro: { nome: string } }) => x.membro?.nome === eu.nome).map((x: { autoridade: string }) => x.autoridade) } };
  }
  if (!post && a && UUID_RE.test(a)) {
    await podeVer(eu, a);
    const [[r], fontesL, vde, vpara, pareceres, historico] = await Promise.all([
      servico(`/rest/v1/biblioteca_registros?id=eq.${a}&select=*`),
      servico(`/rest/v1/biblioteca_fontes?registro_id=eq.${a}&select=*&order=id`),
      servico(`/rest/v1/biblioteca_vinculos?de_id=eq.${a}&select=relacao,para_externo,para:biblioteca_registros!biblioteca_vinculos_para_id_fkey(id,codigo,titulo,tipo,estado)&order=id`),
      servico(`/rest/v1/biblioteca_vinculos?para_id=eq.${a}&select=relacao,de:biblioteca_registros!biblioteca_vinculos_de_id_fkey(id,codigo,titulo,tipo,estado)&order=id`),
      servico(`/rest/v1/biblioteca_pareceres?registro_id=eq.${a}&select=*&order=solicitado_em`),
      servico(`/rest/v1/biblioteca_historico?registro_id=eq.${a}&select=acao,de_estado,para_estado,detalhe,em,membro:membros(nome)&order=id`),
    ]);
    const versoes = await servico(`/rest/v1/biblioteca_registros?serie=eq.${r.serie}&select=id,codigo,versao,estado,registrado_em,vigente_desde&order=versao`);
    const pode = await rpc("bib_tem_autoridade", { p_usuario: u, p_autoridade: r.autoridade });
    return { registro: r, fontes: fontesL, vinculos: [...vde.map((v: Record<string, unknown>) => ({ ...v, sentido: "de" })), ...vpara.map((v: Record<string, unknown>) => ({ ...v, sentido: "para" }))], pareceres, historico, versoes, eu: { tem_autoridade: Boolean(pode), papel: eu.papel } };
  }

  // ---------------------------------------------------------------- escrita
  if (post && a === "consultar") {
    const termos = txt(corpo.termos, 200);
    if (!termos) throw new HttpError(400, "informe os termos da consulta");
    return await rpc("bib_consultar", { p: { usuario: u, termos, setor: txt(corpo.setor, 20), contexto: txt(corpo.contexto, 40) ?? "biblioteca", referencia: txt(corpo.referencia, 80), data: txt(corpo.data, 10) } });
  }
  if (post && !a) {
    const tipo = String(corpo.tipo ?? "");
    const r = await rpc("bib_criar", { p: {
      usuario: u, tipo, estado: txt(corpo.estado, 20), titulo: txt(corpo.titulo, 200), conteudo: txt(corpo.conteudo, 20000), assuntos: lista(corpo.assuntos), setores: lista(corpo.setores, 10),
      autoridade: txt(corpo.autoridade, 30), justificativa: txt(corpo.justificativa, 5000), contexto: txt(corpo.contexto, 5000), condicoes: txt(corpo.condicoes, 3000), revisar_quando: txt(corpo.revisar_quando, 500),
      responsavel: txt(corpo.responsavel, 60), resultado_esperado: txt(corpo.resultado_esperado, 2000), vigente_desde: txt(corpo.vigente_desde, 10), valido_ate: txt(corpo.valido_ate, 10),
      restrito: corpo.restrito === true, confirmo_aprovacao: corpo.confirmo_aprovacao === true, excecao_de: txt(corpo.excecao_de, 36),
      dados: typeof corpo.dados === "object" && corpo.dados && !Array.isArray(corpo.dados) ? corpo.dados : {}, fontes: fontes(corpo.fontes),
    } });
    return r;
  }
  if (post && a === "pareceres" && b && UUID_RE.test(b) && c === "responder") {
    return await rpc("bib_responder_parecer", { p: { usuario: u, parecer_id: b, posicao: txt(corpo.posicao, 30), argumento: txt(corpo.argumento, 5000) } });
  }
  if (post && a && UUID_RE.test(a)) {
    await podeVer(eu, a);
    switch (b) {
      case "transicao":
        return await rpc("bib_transicao", { p: { usuario: u, registro_id: a, para: txt(corpo.para, 20), motivo: txt(corpo.motivo, 3000), verificacao: txt(corpo.verificacao, 3000), autoridade: txt(corpo.autoridade, 30), confirmo_aprovacao: corpo.confirmo_aprovacao === true } });
      case "revisar":
        return await rpc("bib_revisar", { p: { usuario: u, registro_id: a, titulo: txt(corpo.titulo, 200), conteudo: txt(corpo.conteudo, 20000), justificativa: txt(corpo.justificativa, 5000), condicoes: txt(corpo.condicoes, 3000),
          vigente_desde: txt(corpo.vigente_desde, 10), valido_ate: txt(corpo.valido_ate, 10), motivada_por: txt(corpo.motivada_por, 36), confirmo_aprovacao: corpo.confirmo_aprovacao === true } });
      case "divergir": {
        const d = (corpo.divergencia ?? {}) as Record<string, unknown>;
        const div = Object.fromEntries(["problema", "argumento", "aplicacao", "beneficios", "riscos", "limitacoes", "alternativa", "autoridade", "como_testar"].map((k) => [k, txt(d[k], 5000)]));
        return await rpc("bib_divergir", { p: { usuario: u, registro_id: a, titulo: txt(corpo.titulo, 200), divergencia: div, fontes: fontes(corpo.fontes) } });
      }
      case "parecer": {
        const setor = txt(corpo.setor_id, 20);
        if (!["informado", "consultado", "aprovador"].includes(String(corpo.participacao))) throw new HttpError(400, "participação: informado, consultado ou aprovador");
        const id = await rpc("bib_pedir_parecer", { p: { usuario: u, registro_id: a, setor_id: setor, participacao: corpo.participacao, motivo: txt(corpo.motivo, 2000), prazo: txt(corpo.prazo, 10), responsavel_conclusao: txt(corpo.responsavel_conclusao, 60) } });
        // vai para o Radar do setor como tarefa (depende de atuacao humana; nada e simulado)
        const [r] = await servico(`/rest/v1/biblioteca_registros?id=eq.${a}&select=codigo,titulo`);
        await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({
          setor_id: setor, titulo: `${corpo.participacao === "informado" ? "Tomar ciência" : corpo.participacao === "aprovador" ? "Decidir (alçada)" : "Dar parecer"}: ${r.codigo} ${r.titulo}`.slice(0, 240),
          prazo: txt(corpo.prazo, 10), origem: "BIBLIOTECA", chave: `parecer:${id}`, criado_por: u }) });
        return { parecer_id: id };
      }
      case "encaminhar": {
        const id = await rpc("bib_encaminhar", { p: { usuario: u, registro_id: a, nivel: txt(corpo.nivel, 10), motivo: txt(corpo.motivo, 3000), prazo: txt(corpo.prazo, 10) } });
        const [r] = await servico(`/rest/v1/biblioteca_registros?id=eq.${a}&select=codigo,titulo`);
        await servico("/rest/v1/tarefas?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({
          setor_id: "direcao", titulo: `Conflito encaminhado ${corpo.nivel === "fundador" ? "ao fundador" : "à CEO"}: ${r.codigo} ${r.titulo}`.slice(0, 240), prazo: txt(corpo.prazo, 10), origem: "BIBLIOTECA", chave: `parecer:${id}`, criado_por: u }) });
        return { parecer_id: id };
      }
      case "fonte": {
        const [f] = fontes([corpo]);
        await servico("/rest/v1/biblioteca_fontes", { method: "POST", body: JSON.stringify({ ...f, registro_id: a, adicionada_por: u }) });
        await rpc("bib_log", { p_registro: a, p_acao: "fonte_adicionada", p_de: null, p_para: null, p_usuario: u, p_detalhe: { titulo: f.titulo, natureza: f.natureza } });
        return { ok: true };
      }
      case "vinculo": {
        const rel = String(corpo.relacao ?? "");
        const para = txt(corpo.para_id, 36), ext = txt(corpo.para_externo, 80);
        if (para) await podeVer(eu, para);
        await servico("/rest/v1/biblioteca_vinculos", { method: "POST", body: JSON.stringify({ de_id: a, para_id: para, para_externo: para ? null : ext, relacao: rel, criado_por: u }) });
        await rpc("bib_log", { p_registro: a, p_acao: "vinculo", p_de: null, p_para: null, p_usuario: u, p_detalhe: { relacao: rel, para: para ?? ext } });
        return { ok: true };
      }
    }
  }
  throw new HttpError(404, "rota inexistente");
}
