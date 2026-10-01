// SISTEMA na funcao "api": saude do VEOS (direcao e tecnologia).
//   GET  /sistema/saude   retrato (banco, arquivos, Zoho, agendamentos, HTTP, varreduras) + alertas SIS_*
// As regras dos alertas ficam no banco (sistema_saude); a tela e a vigia usam a mesma funcao.
import { HttpError, type Membro, servico } from "../_shared/banco.ts";

const rpc = (fn: string, corpo: unknown) => servico(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(corpo) });

export async function rotearSistema(req: Request, partes: string[], eu: Membro) {
  const [, a] = partes;
  if (!["direcao", "tecnologia"].includes(eu.papel)) throw new HttpError(403, "somente direção e tecnologia");
  if (req.method === "GET" && a === "saude") return await rpc("sistema_saude", {});
  throw new HttpError(404, "rota inexistente");
}
