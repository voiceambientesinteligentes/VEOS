// Roteador da funcao "api", separado da autenticacao para ser usado tambem pelo MCP remoto (funcao "mcp"), que
// chama estas MESMAS rotas com o membro dono do link (mesmas permissoes e regras do banco).
import { avaliarOrcamento, RegraError } from "../_shared/regras/vigia.ts";
import { ANON, HttpError, lerCorpo, type Membro, SERVICE, servico, URL_BASE } from "../_shared/banco.ts";
import { rotearFinanceiro } from "./financeiro.ts";
import { rotearSetores } from "./setores.ts";
import { rotearZoho } from "./zoho.ts";
import { rotearFluxo } from "./fluxo.ts";
import { rotearBiblioteca } from "./biblioteca.ts";
import { rotearSistema } from "./sistema.ts";
import { rotearNotificacoes } from "./notificacoes.ts";
import { rotearConta } from "./conta.ts";
import { rotearEntrevista } from "./entrevista.ts";
import { rotearProdutos } from "./produtos.ts";
import { rotearDiretores } from "./diretores.ts";
import { rotearCfo } from "./cfo.ts";
import { rotearPlano } from "./plano.ts";
import { rotearCaixa } from "./caixa.ts";
import { rotearComercial } from "./comercial.ts";
import { rotearMcpRemoto } from "./mcp_remoto.ts";
import { rotearAcoes } from "./acoes.ts";

const CHAVE_RE = /^[A-Za-z0-9-]{16,64}$/;

export async function rotearComMembro(req: Request, rota: string, eu: Membro) {
  const partes = rota.split("/");
  if (partes[0] === "zoho") return await rotearZoho(req, partes, eu);
  if (partes[0] === "fluxo") return await rotearFluxo(req, partes, eu);
  if (partes[0] === "biblioteca") return await rotearBiblioteca(req, partes, eu);
  if (partes[0] === "sistema") return await rotearSistema(req, partes, eu);
  if (partes[0] === "conta") return await rotearConta(req, partes, eu);
  if (partes[0] === "entrevista") return await rotearEntrevista(req, partes, eu);
  if (partes[0] === "mcp-remoto") return await rotearMcpRemoto(req, partes, eu);
  if (partes[0] === "produtos") return await rotearProdutos(req, partes, eu);
  if (partes[0] === "diretores") return await rotearDiretores(req, partes, eu);
  if (partes[0] === "cfo") return await rotearCfo(req, partes, eu);
  if (partes[0] === "plano") return await rotearPlano(req, partes, eu);
  if (partes[0] === "comercial") return await rotearComercial(req, partes, eu);
  if (partes[0] === "pesquisa" || partes[0] === "email" || partes[0] === "agenda") return await rotearAcoes(req, partes, eu);
  if (partes[0] === "caixa") {
    const corpo = req.method === "POST" ? ((await lerCorpo(req)) ?? {}) : {};
    if (req.method === "POST" && !CHAVE_RE.test(req.headers.get("Idempotency-Key") ?? "")) throw new HttpError(400, "Idempotency-Key obrigatorio");
    return await rotearCaixa(req, partes, eu, corpo);
  }
  if (partes[0] === "mensagens" || partes[0] === "resumo" || partes[0] === "push") return await rotearNotificacoes(req, partes, eu);
  if (partes[0] === "projetos") return await rotearFinanceiro(req, partes, eu);
  if (["radar", "setor", "registros", "tarefas", "alertas"].includes(partes[0])) return await rotearSetores(req, partes, eu);
  if (req.method === "GET" && rota === "me") return eu;
  if (req.method === "GET" && rota === "painel") {
    if (!["direcao", "financas"].includes(eu.papel)) throw new HttpError(403, "somente direção e finanças");
    return await servico("/rest/v1/rpc/painel_executivo", { method: "POST", body: JSON.stringify({ p_meses: 12 }) });
  }
  if (req.method === "GET" && rota === "setores") {
    const [setores, diretores] = await Promise.all([
      servico("/rest/v1/setores?select=id,sigla,nome,descricao&ativo=is.true&order=sigla"),
      servico("/rest/v1/diretores?select=id,setor_id,sigla,nome&ativo=is.true&order=sigla"),
    ]);
    return { setores, diretores };
  }
  if (req.method === "GET" && rota === "orcamentos") {
    return {
      orcamentos: await servico(
        "/rest/v1/orcamentos?select=id,codigo,ambiente,vendedor,cliente,valor_total_informado,criado_em," +
          "avisos(severidade,codigo,titulo,situacao)&order=criado_em.desc&limit=20",
      ),
    };
  }
  if (req.method === "POST" && rota === "orcamentos") {
    const chave = req.headers.get("Idempotency-Key") ?? "";
    if (!CHAVE_RE.test(chave)) throw new HttpError(400, "Idempotency-Key obrigatorio (16-64 caracteres)");
    const entrada = (await lerCorpo(req))?.entrada;
    const resultado = avaliarOrcamento(entrada); // RegraError -> 400
    const reg = await servico("/rest/v1/rpc/registrar_orcamento", {
      method: "POST",
      body: JSON.stringify({ p: { chave: `${eu.user_id}:${chave}`, usuario_id: eu.user_id, orcamento: entrada, resultado } }),
    });
    const nota = reg.repetido
      ? "Envio repetido: este orçamento TESTE já estava registrado com estes avisos. Nada foi duplicado ou aprovado."
      : "Orçamento TESTE registrado com os avisos do CFO (histórico não pode ser alterado). Nada foi aprovado.";
    return { ...resultado, ...reg, nota };
  }
  throw new HttpError(404, "rota inexistente");
}

