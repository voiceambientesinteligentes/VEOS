// SETOR COMERCIAL na funcao "api".
//   GET  /comercial/base                   leitura da base real (orcamentos do Zoho): segmentos, especificadores, concentracao
//   GET  /comercial/implantacao            estado de cada item da implantacao do setor
//   POST /comercial/implantacao/:codigo    {estado: a_fazer|em_andamento|feito|nao_se_aplica, evidencia}
//   GET  /comercial/cadencias              registros reais em cadencia, toques abertos e rascunhos
//   POST /comercial/bloqueio               {contato: e-mail ou telefone, motivo}: quem pediu para sair
// Conteudo (itens, cadencias, canais, donos das metas) em apps/web/js/domain/comercial.js.
// deno-lint-ignore-file no-explicit-any
import { HttpError, lerCorpo, type Membro, registrarAcesso, servico } from "../_shared/banco.ts";
import { baseComercial, cadenciaDoRegistro, CADENCIAS, IMPLANTACAO } from "../_shared/dominio/comercial.js";
import { contatoDoRegistro } from "../_shared/comercial_vigia.ts";

const VER = ["direcao", "financas", "vendas", "marketing", "posvenda"];
const MARCAR = ["direcao", "vendas", "marketing", "posvenda", "tecnologia", "secretaria", "pessoas"];
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const exigir = (eu: Membro, papeis: string[]) => { if (!papeis.includes(eu.papel)) throw new HttpError(403, "seu perfil não pode fazer esta operação no comercial"); };
const ITENS = new Map(IMPLANTACAO.flatMap((g: any) => g.itens.map((i: any) => [i.codigo, i])));

export async function rotearComercial(req: Request, partes: string[], eu: Membro) {
  const [, a, b] = partes;
  const post = req.method === "POST";
  if (post && !CHAVE_RE.test(req.headers.get("Idempotency-Key") ?? "")) throw new HttpError(400, "Idempotency-Key obrigatorio");
  const corpo = post ? ((await lerCorpo(req)) ?? {}) as Record<string, any> : {};

  if (!post && a === "base") {
    exigir(eu, VER);
    const est = await servico("/rest/v1/zoho_registros?produto=eq.books&modulo=eq.estimates&excluido=is.false&select=numero:dados->>estimate_number,data:dados->>date,status:dados->>status,cliente:dados->>customer_name,total:dados->>total&limit=5000");
    await registrarAcesso(eu.user_id, "comercial:base");
    const base = baseComercial(est.map((e: any) => ({ ...e, total: Number(e.total) || 0 })));
    return { ...base, clientes_lista: base.clientes_lista.slice(0, 80), fonte: "Espelho do Zoho Books no VEOS (orçamentos)", segmento: "automático pelo nome do cliente: conferir" };
  }
  if (!post && a === "implantacao") {
    exigir(eu, VER.concat(MARCAR));
    const [estados, membros] = await Promise.all([
      servico("/rest/v1/comercial_implantacao?select=codigo,estado,evidencia,atualizado_por,atualizado_em&limit=500"),
      servico("/rest/v1/membros?select=user_id,nome"),
    ]);
    const nome = new Map(membros.map((m: any) => [m.user_id, m.nome]));
    return { estados: Object.fromEntries(estados.map((e: any) => [e.codigo, { ...e, quem: e.atualizado_por ? nome.get(e.atualizado_por) ?? "—" : null }])), papel: eu.papel };
  }
  if (post && a === "implantacao" && b) {
    exigir(eu, MARCAR);
    const item = ITENS.get(b) as any;
    if (!item) throw new HttpError(404, "item inexistente");
    if (item.decisao && eu.papel !== "direcao") throw new HttpError(403, "decisão do fundador: só a direção marca este item");
    return await servico("/rest/v1/rpc/comercial_implantacao_marcar", { method: "POST", body: JSON.stringify({ p_codigo: b, p_estado: String(corpo.estado ?? ""), p_evidencia: typeof corpo.evidencia === "string" ? corpo.evidencia.slice(0, 2000) : null, p_usuario: eu.user_id }) });
  }
  if (!post && a === "cadencias") {
    exigir(eu, VER);
    const [candidatos, tarefas, rascunhos] = await Promise.all([
      servico("/rest/v1/rpc/cadencia_candidatos", { method: "POST", body: "{}" }),
      servico("/rest/v1/tarefas?origem=like.cadencia:*&select=registro_id,estado,prazo,titulo&order=prazo.asc&limit=5000"),
      servico("/rest/v1/mensagens_saida?origem=like.cadencia:*&estado=eq.rascunho&select=origem&limit=5000"),
    ]);
    const lista = candidatos.map((r: any) => {
      const cad = cadenciaDoRegistro(r);
      if (!cad) return null;
      const ts = tarefas.filter((t: any) => t.registro_id === r.id);
      return { registro_id: r.id, titulo: r.titulo, tipo: r.tipo, estado: r.estado, cadencia: cad.id, cadencia_nome: cad.nome, desde: r.desde, contato: contatoDoRegistro(r).nome,
        toques: cad.passos.length, feitos: ts.filter((t: any) => t.estado === "feita").length, abertos: ts.filter((t: any) => t.estado === "aberta").length,
        proximo: ts.find((t: any) => t.estado === "aberta") ?? null, rascunhos: rascunhos.filter((m: any) => m.origem.startsWith(`cadencia:${r.id}:`)).length };
    }).filter(Boolean);
    return { em_cadencia: lista, cadencias: CADENCIAS.map((c: any) => ({ id: c.id, nome: c.nome, toques: c.passos.length })), desde: "2026-10-07" };
  }
  if (post && a === "bloqueio") {
    exigir(eu, ["direcao", "vendas", "marketing", "posvenda"]);
    const bruto = String(corpo.contato ?? "").trim();
    const email = bruto.includes("@");
    const contato = email ? bruto.toLowerCase() : bruto.replace(/\D/g, "");
    if (email ? !/^[^@\s]{1,64}@[^@\s]{1,255}\.[a-z]{2,}$/i.test(contato) : contato.length < 10) throw new HttpError(400, "informe um e-mail ou telefone válido");
    await servico("/rest/v1/contatos_bloqueio?on_conflict=contato", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ contato, canal: email ? "email" : "telefone", motivo: typeof corpo.motivo === "string" ? corpo.motivo.slice(0, 300) : null, registrado_por: eu.user_id }) });
    // rascunhos ja gerados para esse contato sao descartados
    await servico(`/rest/v1/mensagens_saida?destinatario=eq.${encodeURIComponent(contato)}&estado=eq.rascunho`, { method: "PATCH", body: JSON.stringify({ estado: "descartada", motivo_descarte: "contato pediu para não receber mensagens" }) });
    return { ok: true, contato };
  }
  throw new HttpError(404, "rota inexistente");
}
