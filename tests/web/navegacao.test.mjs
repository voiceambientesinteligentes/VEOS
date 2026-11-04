// Mapa de navegacao: 7 areas, abas por area, perfil, rota -> area/aba e busca.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { abaDaRota, itensDeBusca, menuDoPerfil, NOVOS, SECOES, secaoDaRota } from "../../apps/web/js/data/navegacao.js";

const main = readFileSync("apps/web/js/main.js", "utf8");

test("no maximo 7 areas no menu e nenhuma tela repetida", () => {
  assert.ok(SECOES.length <= 7);
  const hrefs = SECOES.flatMap((s) => s.itens.map(([h]) => h));
  assert.equal(new Set(hrefs).size, hrefs.length);
});

test("toda tela do mapa existe no roteador do site", () => {
  for (const s of SECOES) for (const [href] of s.itens) {
    const ok = main.includes(`"${href}"`) || /^#\/(setor|zoho|biblioteca)\//.test(href);
    assert.ok(ok, `rota sem tela: ${href}`);
  }
  for (const [href] of NOVOS) assert.ok(main.includes(`"${href.split("?")[0]}"`), href);
});

test("nenhuma tela do menu antigo ficou sem lugar (busca e areas cobrem todas)", () => {
  const antigas = ["#/operar", "#/pendencias", "#/visao", "#/painel-dono", "#/estrutura", "#/plano", "#/comercial", "#/orbita", "#/radar", "#/mensagens", "#/ia", "#/conselho", "#/diretores", "#/integracoes",
    "#/contato", "#/clientes", "#/orcamentos", "#/prospeccao", "#/conteudo", "#/cfo/diagnostico", "#/cfo/caixa", "#/cfo/fluxo", "#/cfo/fechamento", "#/cfo/indicadores", "#/cfo/recorrentes", "#/cfo/precos",
    "#/cfo/formulario", "#/cfo/estoque", "#/negociacao", "#/propostas", "#/calculadora", "#/projetos", "#/cfo", "#/historico", "#/biblioteca/governanca", "#/biblioteca/decisoes", "#/biblioteca/aprendizados",
    "#/biblioteca/referencias", "#/biblioteca/politicas", "#/biblioteca/revisoes", "#/biblioteca/consultar", "#/pedidos", "#/estoque", "#/produtos", "#/compras", "#/recebimentos", "#/contas-pagar",
    "#/zoho/books", "#/zoho/crm", "#/zoho/projects", "#/sistema/saude", "#/sistema/usuarios", "#/sistema/exportar", "#/sistema/independencia", "#/sistema/acessos", "#/sistema/validacao", "#/conta"];
  const direcao = itensDeBusca(menuDoPerfil("direcao")).map((i) => i.href);
  for (const a of antigas) assert.ok(direcao.includes(a), `tela sumiu para a direcao: ${a}`);
});

test("perfil: vendas nao ve Financeiro nem Usuarios; direcao ve tudo", () => {
  const v = menuDoPerfil("vendas");
  assert.ok(!v.some((s) => s.id === "financeiro"));
  assert.ok(!itensDeBusca(v).some((i) => i.href === "#/sistema/usuarios" || i.href === "#/contas-pagar"));
  assert.ok(v.some((s) => s.id === "vender"));
  const o = menuDoPerfil("operacoes");
  assert.ok(!o.some((s) => s.id === "vender") && o.some((s) => s.id === "operacao"));
  assert.equal(menuDoPerfil("direcao").length, SECOES.length);
});

test("rota -> area e aba (inclui fichas e setores)", () => {
  const m = menuDoPerfil("direcao");
  const caso = (r, area, aba) => { const s = secaoDaRota(r, m); assert.equal(s?.id, area, r); assert.equal(abaDaRota(r, s), aba, r); };
  caso("#/hoje", "hoje", "#/hoje");
  caso("#/orcamentos/novo", "vender", "#/orcamentos");
  caso("#/orcamentos?aba=zoho", "vender", "#/orcamentos");
  caso("#/compras/nova", "operacao", "#/compras");
  caso("#/produtos/revisao", "operacao", "#/produtos");
  caso("#/setor/vendas", "vender", "#/setor/vendas");
  caso("#/setor/financas", "empresa", "#/orbita");
  caso("#/zoho/crm", "ajustes", "#/zoho/crm");
  caso("#/cfo/caixa", "financeiro", "#/cfo/caixa");
});
