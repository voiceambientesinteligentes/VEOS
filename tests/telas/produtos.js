import { api } from "../js/data/api.js";
import { telaProduto, telaProdutos, telaRevisaoProdutos } from "../js/ui/views/produtos.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
const FOTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10' fill='%23ccc'/></svg>";
const ID = "11111111-1111-1111-1111-111111111111";
const enviados = [];
const P = { id: ID, codigo: "PRD-0001", nome: "Abridor de Portão de Garagem ESP32C3 (adaptador EU) - IoTorero TESTE", marca: "IoTorero", modelo: null, unidade: "un", tipo: "produto", situacao: "revisar",
  custo_ultimo: 124.59, custo_data: "2026-04-13", custo_min: 120, custo_max: 130.5, preco_venda: null, zoho_item_id: null, origem: "aliexpress", imagem: "PRD-0001.jpg", foto: FOTO, descricao: null, categoria: null };
Object.assign(api, {
  produtos: async () => ({ total: 2, pagina: 1, produtos: [{ ...P, duplicados_a_revisar: 1 }, { ...P, id: "22222222-2222-2222-2222-222222222222", codigo: "PRD-0002", nome: "Sensor TESTE", situacao: "ativo", foto: null, preco_venda: 300, duplicados_a_revisar: 0 }] }),
  produto: async () => ({ produto: P, pode: { custo: true, preco: true, editar: true, duplicados: true },
    fontes: [{ sku_interno: "AE-1005008477848028-01", variante: "EU Adaptor", fornecedor: "Loja oficial TESTE", nome_fornecedor: "O abridor de porta de garagem IoTorero Homekit ESP32C3 funciona com assistente doméstico TESTE", situacao_anuncio: "Anúncio removido do AliExpress (página não encontrada)",
      ultimo_preco: 124.59, ultima_compra: "2026-04-13", qtd_total: 1, n_pedidos: 1, link: "https://pt.aliexpress.com/item/1.html", agrupamento_a_confirmar: true, foto: FOTO, descricao: "Descrição TESTE",
      ficha: [{ atributo: "Método de comunicação", valor: "Wi-Fi" }, { atributo: "Tensão", valor: "5V" }] }],
    compras: [{ data: "2026-04-13", pedido: "8210135306873314", loja: "Loja TESTE", variante: "EU Adaptor", quantidade: 1, preco_unit: 124.59, status: "Concluído" }],
    vinculos: [{ id: 7, relacao: "possivel_duplicado", situacao: "a_revisar", preferencia: null, zoho_item_id: "4823000000999", evidencia: "Só o nome parece (35% das palavras em comum).", zoho: { nome: "ABRIDOR PORTAO TESTE", sku: "ABR.1", compra: "120", venda: null } }],
    historico: [{ campo: "custo_ultimo", de: null, para: 124.59, motivo: "Importação AliExpress", origem: "importacao_aliexpress", em: "2026-10-01T12:00:00Z", quem: "importação" }] }),
  produtosRevisao: async () => ({ vinculos: [{ id: 7, relacao: "possivel_duplicado", evidencia: "Só o nome parece.", zoho_item_id: "4823000000999", zoho: { nome: "ABRIDOR TESTE" }, produto: { id: ID, codigo: "PRD-0001", nome: "Abridor TESTE" }, foto: FOTO }],
    agrupamentos: [{ id: ID, codigo: "PRD-0014", nome: "Controle Remoto IR TESTE", foto: FOTO }] }),
  produtoPreco: async (id, d) => { enviados.push(["preco", d]); return { ok: true }; },
  produtoVinculo: async (id, d) => { enviados.push(["vinculo", id, d]); return { ok: true }; },
  produtoEditar: async (id, d) => { enviados.push(["editar", d]); return { ok: true }; },
});
window.prompt = (m, padrao) => padrao ?? "TESTE";
const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const set = (v, id, val) => { const el = v.querySelector(`#${id}`); el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); };

rodar(async (v) => {
  if (caso === "lista") {
    await telaProdutos(v);
    if (!v.textContent.includes("1 duplicado(s) a revisar") || !v.textContent.includes("Venda: não definido") || !v.querySelector(".produto-sem-foto")) throw new Error("lista incompleta");
  }
  if (caso === "ficha" || caso === "preco") {
    await telaProduto(v, ID);
    const t = v.textContent;
    for (const x of ["AE-1005008477848028-01", "Anúncio removido", "Conferir foto", "Método de comunicação", "Possível duplicado", "8210135306873314", "não definido"]) if (!t.includes(x)) throw new Error(`faltou: ${x}`);
    if (caso === "preco") {
      set(v, "pr-frete", "10,00"); set(v, "pr-imp", "50,00"); set(v, "pr-dv", "15"); set(v, "pr-df", "12"); set(v, "pr-ml", "18");
      if (!v.textContent.includes("R$ 184,59") || !v.textContent.includes("R$ 335,62")) throw new Error("simulacao errada: " + v.querySelector(".stack-s")?.textContent);
      [...v.querySelectorAll("button")].find((b) => b.textContent === "Registrar como preço de venda").click();
      await espera();
      if (enviados[0]?.[1]?.valor !== "335.62" || enviados[0][1].campo !== "preco_venda") throw new Error(JSON.stringify(enviados));
    }
  }
  if (caso === "revisao") {
    await telaRevisaoProdutos(v);
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Não é o mesmo").click();
    await espera();
    if (JSON.stringify(enviados[0]) !== JSON.stringify(["vinculo", 7, { situacao: "descartado", preferencia: null }])) throw new Error(JSON.stringify(enviados));
    if (!v.textContent.includes("PRD-0014")) throw new Error("agrupamento ausente");
  }
});
