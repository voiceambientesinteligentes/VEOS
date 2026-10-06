// Setores vivos na funcao "api": registros por setor (validados pelo catalogo), tarefas,
// alertas e Radar. Toda gravacao roda a varredura do setor: alertas reagem na hora.
//   GET  /radar                  alertas ativos + tarefas abertas + resumo por setor
//   POST /radar/varrer           varre todos os setores acessiveis
//   GET  /setor/:id              registros, tarefas e alertas do setor
//   POST /registros              cria  {setor, tipo, titulo, estado?, responsavel?, prazo?, valor?, dados}
//   POST /registros/:id          altera (parcial) {setor, ...}
//   POST /tarefas                cria tarefa manual {setor, titulo, papel?, prazo?}
//   POST /tarefas/:id            {estado: feita|cancelada}
//   POST /alertas/:id            {estado: dispensado}
import { CATALOGO } from "../_shared/setores/catalogo.ts";
import type { Setor } from "../_shared/setores/motor.ts";
import { RegistroInvalido, tipoDoSetor, validarRegistro } from "../_shared/setores/registros.ts";
import { varrer } from "../_shared/setores/varredura.ts";
import { vigiarBiblioteca, vigiarFluxo } from "../_shared/fluxo_vigia.ts";
import { vigiarCaixa } from "../_shared/caixa_vigia.ts";
import { HttpError, lerCorpo, type Membro, servico } from "../_shared/banco.ts";

// Setores com dados sensiveis: so direcao e o proprio setor.
const RESTRITOS: Record<string, string[]> = { financas: ["direcao", "financas"], pessoas: ["direcao", "pessoas"] };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const SETORES = CATALOGO as unknown as Setor[];

export const podeVer = (eu: Membro, setor: string) => !RESTRITOS[setor] || RESTRITOS[setor].includes(eu.papel);
export const acessiveis = (eu: Membro) => SETORES.filter((s) => podeVer(eu, s.id)).map((s) => s.id);

function setorDe(eu: Membro, id: unknown): Setor {
  const s = SETORES.find((x) => x.id === id);
  if (!s) throw new HttpError(404, "setor inexistente");
  if (!podeVer(eu, s.id)) throw new HttpError(403, `acesso restrito ao setor ${s.nome}`);
  return s;
}

function chave(req: Request, eu: Membro) {
  const c = req.headers.get("Idempotency-Key") ?? "";
  if (!CHAVE_RE.test(c)) throw new HttpError(400, "Idempotency-Key obrigatorio (16-64 caracteres)");
  return `${eu.user_id}:${c}`;
}

export async function rotearSetores(req: Request, partes: string[], eu: Membro) {
  const [raiz, id, sub] = partes;
  try {
    if (raiz === "radar" && req.method === "GET" && !id) {
      const lista = acessiveis(eu).join(",");
      const [alertas, tarefas, ultima] = await Promise.all([
        servico(`/rest/v1/alertas?estado=eq.ativo&setor_id=in.(${lista})&select=id,chave,setor_id,sentinela,severidade,titulo,mensagem,fonte,registro_id,rascunhos,notificar,criado_em,atualizado_em&order=atualizado_em.desc&limit=500`),
        servico(`/rest/v1/tarefas?estado=eq.aberta&setor_id=in.(${lista})&select=id,setor_id,titulo,papel,prazo,origem,registro_id,criado_em&order=prazo.asc.nullslast&limit=500`),
        servico("/rest/v1/varreduras?select=origem,alertas_ativos,novos,resolvidos,ms,em&order=em.desc&limit=1"),
      ]);
      return { alertas, tarefas, ultima_varredura: ultima[0] ?? null, setores: acessiveis(eu) };
    }
    if (raiz === "radar" && req.method === "POST" && id === "varrer") {
      const r = await varrer(SETORES, acessiveis(eu), `manual:${eu.email}`);
      if (eu.papel !== "direcao") return r;
      // direcao: tambem as vigias proprias (fluxo/compras/caixa e Biblioteca)
      const [fluxo, biblioteca, caixa] = await Promise.all([vigiarFluxo(), vigiarBiblioteca(), vigiarCaixa().catch((e) => { console.error("vigia do caixa", e); return null; })]);
      return { ...r, fluxo, biblioteca, caixa };
    }

    if (raiz === "setor" && req.method === "GET" && id) {
      const s = setorDe(eu, id);
      const [registros, tarefas, alertas] = await Promise.all([
        servico(`/rest/v1/registros?setor_id=eq.${s.id}&ambiente=eq.TESTE&select=id,tipo,titulo,estado,responsavel,prazo,valor::text,dados,criado_em,atualizado_em&order=atualizado_em.desc&limit=500`),
        servico(`/rest/v1/tarefas?setor_id=eq.${s.id}&estado=eq.aberta&select=id,titulo,papel,prazo,origem,registro_id,criado_em&order=prazo.asc.nullslast&limit=300`),
        servico(`/rest/v1/alertas?setor_id=eq.${s.id}&estado=eq.ativo&select=id,sentinela,severidade,titulo,mensagem,fonte,registro_id,rascunhos,notificar,atualizado_em&order=atualizado_em.desc&limit=300`),
      ]);
      return { setor: s.id, registros, tarefas, alertas };
    }

    if (raiz === "registros" && req.method === "POST") {
      const b = (await lerCorpo(req)) as Record<string, unknown>;
      const s = setorDe(eu, b.setor);
      const k = chave(req, eu);
      let tipo, existente = null, registroId: string | null = null;
      if (id) {
        if (!UUID_RE.test(id)) throw new HttpError(404, "registro inexistente");
        const rows = await servico(`/rest/v1/registros?id=eq.${id}&setor_id=eq.${s.id}&select=id,tipo,dados`);
        if (!rows.length) throw new HttpError(404, "registro inexistente");
        existente = rows[0];
        registroId = id;
        tipo = tipoDoSetor(s, existente.tipo);
      } else {
        tipo = tipoDoSetor(s, b.tipo);
      }
      const { setor: _s, tipo: _t, ...entrada } = b;
      const campos = validarRegistro(s, tipo, entrada, existente);
      const reg = await servico("/rest/v1/rpc/salvar_registro", {
        method: "POST",
        body: JSON.stringify({ p: { chave: k, usuario_id: eu.user_id, modo: id ? "alterar" : "criar", registro_id: registroId, setor: s.id, tipo: tipo.tipo, campos } }),
      });
      const varredura = await varrer(SETORES, [s.id], `registro:${eu.email}`);
      const alertas = await servico(`/rest/v1/alertas?setor_id=eq.${s.id}&estado=eq.ativo&registro_id=eq.${reg.id}&select=severidade,titulo,mensagem`);
      return { ...reg, varredura, alertas_do_registro: alertas };
    }

    if (raiz === "tarefas" && req.method === "POST" && !id) {
      const b = (await lerCorpo(req)) as Record<string, unknown>;
      const s = setorDe(eu, b.setor);
      chave(req, eu);
      if (typeof b.titulo !== "string" || !b.titulo.trim() || b.titulo.length > 240) throw new HttpError(400, "título obrigatório (até 240)");
      if (b.prazo && !(typeof b.prazo === "string" && DATA_RE.test(b.prazo))) throw new HttpError(400, "prazo inválido (AAAA-MM-DD)");
      const papeis = [...s.equipe.map((p) => p.papel), s.sigla];
      if (b.papel && !papeis.includes(String(b.papel))) throw new HttpError(400, `papel inválido; use: ${papeis.join(", ")}`);
      const [t] = await servico("/rest/v1/tarefas", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ setor_id: s.id, titulo: b.titulo.trim(), papel: b.papel || null, prazo: b.prazo || null, origem: "manual", criado_por: eu.user_id }),
      });
      return t;
    }
    if (raiz === "tarefas" && req.method === "POST" && id) {
      if (!UUID_RE.test(id)) throw new HttpError(404, "tarefa inexistente");
      const b = (await lerCorpo(req)) as Record<string, unknown>;
      if (!["feita", "cancelada"].includes(String(b.estado))) throw new HttpError(400, "estado: feita ou cancelada");
      const [t] = await servico(`/rest/v1/tarefas?id=eq.${id}&select=setor_id`);
      if (!t) throw new HttpError(404, "tarefa inexistente");
      setorDe(eu, t.setor_id);
      await servico(`/rest/v1/tarefas?id=eq.${id}&estado=eq.aberta`, {
        method: "PATCH", body: JSON.stringify({ estado: b.estado, concluida_em: new Date().toISOString(), concluida_por: eu.user_id }),
      });
      return { id, estado: b.estado };
    }
    if (raiz === "alertas" && req.method === "POST" && id) {
      if (!UUID_RE.test(id)) throw new HttpError(404, "alerta inexistente");
      const b = (await lerCorpo(req)) as Record<string, unknown>;
      if (b.estado !== "dispensado") throw new HttpError(400, "estado: dispensado");
      const [a] = await servico(`/rest/v1/alertas?id=eq.${id}&select=setor_id`);
      if (!a) throw new HttpError(404, "alerta inexistente");
      setorDe(eu, a.setor_id);
      await servico(`/rest/v1/alertas?id=eq.${id}&estado=eq.ativo`, {
        method: "PATCH", body: JSON.stringify({ estado: "dispensado", dispensado_por: eu.user_id, atualizado_em: new Date().toISOString() }),
      });
      return { id, estado: "dispensado" };
    }
  } catch (e) {
    if (e instanceof RegistroInvalido) throw new HttpError(400, e.message);
    throw e;
  }
  throw new HttpError(404, "rota inexistente");
}
