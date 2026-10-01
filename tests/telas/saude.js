import { api } from "../js/data/api.js";
import { telaSaude } from "../js/ui/views/sistema.js";
import { rodar } from "./_kit.js";

const problemas = location.hash === "#problemas";
const agora = "2026-10-01T12:00:00Z";
api.sistemaSaude = async () => ({
  agora, limites: { banco_bytes: 524288000, armazenamento_bytes: 1073741824 },
  banco_bytes: problemas ? 450 * 1048576 : 38 * 1048576,
  tabelas: [{ tabela: "zoho_registros", bytes: 30 * 1048576, linhas: 12000 }, { tabela: "biblioteca_registros", bytes: 400000, linhas: 45 }],
  armazenamento: [{ bucket: "anexos", arquivos: 3, bytes: 900000 }],
  zoho_conectado: true,
  zoho_modulos: [
    { produto: "books", modulo: "invoices", estado: "ok", total: 812, ultima_execucao_em: problemas ? "2026-10-01T10:00:00Z" : "2026-10-01T11:58:00Z", ultima_volta_em: "2026-10-01T11:00:00Z", erro: null },
    { produto: "crm", modulo: "Deals", estado: problemas ? "erro" : "ok", total: null, ultima_execucao_em: "2026-10-01T11:58:00Z", ultima_volta_em: null, erro: problemas ? "401 TESTE token expirado" : null },
  ],
  zoho_24h: { rodadas: 700, chamadas: 5400, gravados: 120, rodadas_com_erro: problemas ? 4 : 0, ultima_em: agora },
  zoho_erros: problemas ? [{ em: "2026-10-01T11:00:00Z", erros: ["\"crm Deals: 401 TESTE\""] }] : [],
  agendamentos: [
    { nome: "veos-saude-sistema", quando: "*/10 * * * *", ativo: true, ultima: { status: "succeeded", inicio: "2026-10-01T11:50:00Z", fim: "2026-10-01T11:50:01Z", mensagem: "1 row" }, falhas_24h: 0 },
    { nome: "veos-zoho-sync", quando: "*/2 * * * *", ativo: true, ultima: problemas ? { status: "failed", inicio: "2026-10-01T11:58:00Z", fim: null, mensagem: "TESTE erro" } : null, falhas_24h: problemas ? 3 : 0 },
  ],
  http_6h: { total: 180, falhas: problemas ? 5 : 0, ultima_falha: null },
  varreduras: [{ em: "2026-10-01T06:17:00Z", origem: "automatica", novos: 1, resolvidos: 0, ativos: 12, ms: 900 }],
  usuarios: { contas: 4, membros_ativos: 4 },
  alertas: problemas ? [
    { codigo: "SIS_ZOHO_SYNC_PARADO", chave: "SIS_ZOHO_SYNC_PARADO", severidade: "ALTO", titulo: "Sincronização do Zoho parada", mensagem: "A última sincronização foi em 01/10/2026 07:00." },
    { codigo: "SIS_BANCO_LIMITE", chave: "SIS_BANCO_LIMITE", severidade: "ALTO", titulo: "Banco perto do limite do plano gratuito", mensagem: "O banco usa 450 MB de 500 MB." },
  ] : [],
});

rodar(async (v) => {
  await telaSaude(v);
  const t = v.textContent;
  if (problemas ? !t.includes("Sincronização do Zoho parada") : !t.includes("Tudo funcionando")) throw new Error("situação errada");
  if (!t.includes("8% de 500,0 MB") && !problemas) throw new Error("uso do banco errado");
});
