// Ferramentas do MCP do VEOS e o tratador JSON-RPC (sem E/S: testavel). Cada ferramenta chama a
// MESMA API do site com a sessao do usuario: permissoes e regras do banco valem igual. Escritas
// so criam o que a governanca permite a qualquer membro (ideia, proposta, rascunho, tarefa);
// decisao/politica, aprovacao e envio continuam humanos, pela tela.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { criarMcp, manualDiretorCom, textoMcp } from "../../apps/web/js/domain/mcp.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "../..");
const lerJson = (f) => JSON.parse(readFileSync(join(RAIZ, f), "utf8"));

/** Manual de atuacao do diretor (local, sem rede), lendo os arquivos do repositorio. */
export const manualDiretor = (args) => manualDiretorCom(args, (id) => lerJson(`setores/${id}.json`), (id) => (existsSync(join(RAIZ, `setores/manuais/${id}.json`)) ? lerJson(`setores/manuais/${id}.json`) : null));

// MCP local (Claude Code): le os manuais dos arquivos. O MCP remoto do site usa os manuais embutidos (supabase/functions/mcp).
const { FERRAMENTAS, responder } = criarMcp({ manualDiretor });
export { FERRAMENTAS, responder, textoMcp };
