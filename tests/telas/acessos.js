import { api } from "../js/data/api.js";
import { telaAcessos } from "../js/ui/views/sistema.js";
import { rodar } from "./_kit.js";

api.sistemaAcessos = async () => ({ membros: [{ user_id: "u1", nome: "Fernando TESTE" }], acessos: [
  { user_id: "u1", nome: "Fernando TESTE", recurso: "zoho:books.contacts:4823000000555", acao: "leitura", em: "2026-10-01T12:00:00Z" },
  { user_id: "u1", nome: "Fernando TESTE", recurso: "pedido:11111111-1111-1111-1111-111111111111", acao: "leitura", em: "2026-10-01T11:00:00Z" },
  { user_id: "u1", nome: "Fernando TESTE", recurso: "exportar:pedidos", acao: "exportacao", em: "2026-10-01T10:00:00Z" }] });
rodar(async (v) => {
  await telaAcessos(v);
  if (!v.querySelector('a[href="#/zoho/books/contacts/4823000000555"]') || !v.textContent.includes("Exportação: pedidos")) throw new Error("acessos incompletos");
});
