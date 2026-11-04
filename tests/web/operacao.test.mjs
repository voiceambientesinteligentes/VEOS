// Operacao comercial do zero: cadastro de clientes, montador de orcamento (margem e alcada pela
// Politica V1, preco sugerido), calendario do Instagram, prospeccao e o mapa atividade -> ferramenta.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CATALOGO } from "../../apps/web/js/data/catalogo.js";
import { clienteDoZoho, cnpjValido, cpfValido, formatarDocumento, formatarTelefone, normalizarCliente } from "../../apps/web/js/domain/clientes.js";
import { analise, errosOrcamento, linhasDosItens, paraSalvar, precoDoProduto, precoHora, proximoPasso, totais } from "../../apps/web/js/domain/orcamento.js";
import { gerarCalendario, PAUTAS, PILARES, registroConteudo, textoPost } from "../../apps/web/js/domain/conteudo.js";
import { mensagemPara, ondeEncontrar, PUBLICOS, registroParceiro } from "../../apps/web/js/domain/prospeccao.js";
import { ferramentaDaAtividade } from "../../apps/web/js/domain/estrutura.js";
import { margem, precoPolitica } from "../../apps/web/js/domain/formacao_preco.js";

// ---------------------------------------------------------------- clientes
test("CPF e CNPJ: digito verificador", () => {
  assert.ok(cpfValido("529.982.247-25"));
  assert.ok(!cpfValido("529.982.247-24"));
  assert.ok(!cpfValido("111.111.111-11"));
  assert.ok(cnpjValido("12.323.599/0001-83"), "CNPJ da VOICE");
  assert.ok(!cnpjValido("12.323.599/0001-84"));
  assert.equal(formatarDocumento("52998224725"), "529.982.247-25");
  assert.equal(formatarTelefone("5547999998888"), "(47) 99999-8888");
});

test("cliente: normaliza e exige nome e um contato", () => {
  const ok = normalizarCliente({ tipo: "pf", nome: "  Ana   Souza ", telefone: "(47) 99999-8888", email: "ANA@Email.com", documento: "529.982.247-25", uf: "sc", origem: "instagram" });
  assert.deepEqual(ok.erros, []);
  assert.equal(ok.dados.nome, "Ana Souza");
  assert.equal(ok.dados.telefone, "47999998888");
  assert.equal(ok.dados.email, "ana@email.com");
  assert.equal(ok.dados.documento, "52998224725");
  assert.equal(ok.dados.uf, "SC");
  const ruim = normalizarCliente({ nome: "A", documento: "123", email: "x@", origem: "tv" });
  assert.ok(ruim.erros.some((e) => /nome/.test(e)));
  assert.ok(ruim.erros.some((e) => /CPF ou CNPJ/.test(e)));
  assert.ok(ruim.erros.some((e) => /E-mail/.test(e)));
  assert.ok(ruim.erros.some((e) => /Opção inválida/.test(e)));
  assert.ok(normalizarCliente({ nome: "Fulano" }).erros.some((e) => /pelo menos um contato/.test(e)));
  // PJ com CPF: incoerente
  assert.ok(normalizarCliente({ tipo: "pj", nome: "Empresa X", telefone: "4733334444", documento: "52998224725" }).erros.some((e) => /CNPJ/.test(e)));
  // alteracao parcial: so o que veio
  assert.deepEqual(normalizarCliente({ cidade: "Itajaí" }, { parcial: true }), { dados: { cidade: "Itajaí" }, erros: [] });
});

test("cliente a partir do contato do Zoho: documento invalido e descartado", () => {
  const c = clienteDoZoho({ contact_name: "Casa TESTE", customer_sub_type: "individual", cf_cpf_cnpj: "123", mobile: "+55 47 98888-7777", email: "Casa@Teste.com",
    shipping_address: { address: "Rua A, 10", city: "Itapema", state_code: "SC" } });
  assert.equal(c.documento, null);
  assert.equal(c.telefone, "5547988887777");
  assert.equal(c.email, "casa@teste.com");
  assert.equal(c.uf, "SC");
  assert.equal(c.origem, "cliente_antigo_reativacao");
  assert.deepEqual(normalizarCliente(c).erros, []);
});

// ---------------------------------------------------------------- orcamento
const L = (o) => ({ secao: "Sala", tipo: "produto", nome: "Item", quantidade: "1", preco_unit: "100", custo_unit: "40", ...o });

test("totais por ambiente e desconto", () => {
  const linhas = [L({ quantidade: "2", preco_unit: "1000", custo_unit: "400" }), L({ secao: "Cozinha", tipo: "servico", quantidade: "10", preco_unit: "150", custo_unit: "60" })];
  const t = totais(linhas, { modo: "pct", valor: 5 });
  assert.equal(t.produtos, 2000);
  assert.equal(t.servicos, 1500);
  assert.equal(t.subtotal, 3500);
  assert.equal(t.desconto, 175);
  assert.equal(t.total, 3325);
  assert.equal(t.custo, 1400);
  assert.deepEqual(t.secoes.map((s) => [s.secao, s.total]), [["Sala", 2000], ["Cozinha", 1500]]);
  assert.equal(totais(linhas, { modo: "rs", valor: 9999 }).total, 0, "desconto nunca passa do subtotal");
});

test("analise usa o motor da Negociacao ao Vivo (MC oficial e alcada)", () => {
  const linhas = [L({ preco_unit: "10000", custo_unit: "5000" })];
  const imp = { produto: 6, servico: 6 };
  const sem = analise(linhas, { modo: "pct", valor: 0 }, { imp, v: 0 });
  assert.equal(sem.resolvido, true);
  // MC = RL - C - 2% RL; RL = 10000 x 0,94 = 9400; MC = 9400 - 5000 - 188 = 4212 -> 44,8%
  assert.equal(Math.round(sem.mcPct * 10) / 10, 44.8);
  assert.equal(Math.round(margem(10000, 5000, { t: 6 }).pct * 10) / 10, 44.8, "mesma formula do CFO");
  assert.equal(sem.faixa, "VERDE");
  assert.equal(sem.alcada, "FLUXO NORMAL");
  const desc = analise(linhas, { modo: "pct", valor: 4 }, { imp, v: 0 });
  assert.equal(desc.alcada, "DIRECAO", "desconto acima de 2% vai para a direcao");
  const semCusto = analise([L({ custo_unit: "" })], { modo: "pct", valor: 0 }, { imp });
  assert.equal(semCusto.resolvido, false);
  assert.match(semCusto.motivo, /sem custo/);
  assert.equal(analise(linhas, { modo: "pct", valor: 0 }, { imp: { produto: null, servico: null } }).resolvido, false);
});

test("preco sugerido: Politica V1 (MC 35%) e preco de tabela tem prioridade", () => {
  const prod = { id: "p1", custo_ultimo: 200, preco_venda: null };
  const semCfo = precoDoProduto(prod, null);
  assert.equal(semCfo.custo, 241, "200 x fator medio 1,205");
  assert.equal(semCfo.preco, null, "sem aliquota nao sugere preco");
  const comT = precoDoProduto(prod, { tProduto: 6, v: 0 });
  assert.equal(comT.preco, precoPolitica(241, { t: 6, v: 0, alvo: 35 }));
  assert.ok(margem(comT.preco, 241, { t: 6 }).pct >= 35);
  assert.equal(precoDoProduto({ ...prod, preco_venda: "999" }, { tProduto: 6 }).preco, 999);
  assert.equal(precoHora(80, 6, 0), precoPolitica(80, { t: 6, v: 0, alvo: 35 }));
  assert.equal(precoHora(null, 6), null);
});

test("erros, payload da API e volta para o montador", () => {
  assert.deepEqual(errosOrcamento({ cliente: null, linhas: [] }), ["Escolha ou cadastre o cliente.", "Inclua pelo menos um item."]);
  assert.ok(errosOrcamento({ cliente: { id: "c" }, linhas: [L({ quantidade: "0" })] })[0].includes("quantidade"));
  const linhas = [L({ quantidade: "2,5".replace(",", "."), preco_unit: "100", custo_unit: "", produto_id: "11111111-1111-1111-1111-111111111111" })];
  const p = paraSalvar({ cliente: { id: "c1", nome: "Cliente TESTE" }, linhas, desconto: { modo: "rs", valor: 50 }, condicao: "40/60", validade: "2026-11-20", prazo: "30 dias", observacao: "obs", analise: { resolvido: false, motivo: "x" } });
  assert.equal(p.valor_total, "200.00");
  assert.equal(p.desconto, "50.00");
  assert.equal(p.itens[0].quantidade, "2.5");
  assert.equal(p.itens[0].custo_unit, null);
  assert.equal(p.itens[0].produto_id, "11111111-1111-1111-1111-111111111111");
  assert.deepEqual(p.resumo, { pendente: "x" });
  const volta = linhasDosItens([{ secao: "Sala", tipo: "produto", nome: "X", quantidade: "2.000", preco_unit: "10.00", custo_unit: null, produto_id: null }]);
  assert.equal(volta[0].quantidade, "2");
  assert.equal(volta[0].custo_unit, "");
});

test("proximo passo de cada situacao", () => {
  assert.match(proximoPasso({ estado: "rascunho" }), /PDF/);
  assert.match(proximoPasso({ estado: "enviado", validade: "2026-01-01" }, "2026-02-01"), /vencida/);
  assert.match(proximoPasso({ estado: "aceito" }), /Pedido/);
});

// ---------------------------------------------------------------- conteudo
test("calendario do Instagram: datas, pilares alternados, produto real e registro valido", () => {
  const marketing = CATALOGO.find((s) => s.id === "marketing");
  const conteudo = marketing.registros.find((r) => r.tipo === "conteudo");
  const opc = (id) => conteudo.campos.find((c) => c.id === id).opcoes;
  for (const [p] of PILARES) assert.ok(opc("pilar").includes(p), `pilar ${p} existe no registro`);
  for (const p of PAUTAS) assert.ok(opc("formato").includes(p.formato), `formato ${p.formato}`);
  const posts = gerarCalendario({ inicio: "2026-11-04", semanas: 4, cidade: "Balneário Camboriú", produtos: [{ nome: "Interruptor TESTE" }] });
  assert.equal(posts.length, 12, "3 por semana x 4");
  assert.equal(posts[0].data, "2026-11-09", "comeca na proxima segunda");
  assert.ok(posts.every((p) => [1, 3, 5].includes(new Date(`${p.data}T12:00:00Z`).getUTCDay())));
  assert.equal(new Set(posts.slice(0, 6).map((p) => p.pilar)).size, 6, "seis pilares diferentes nos 6 primeiros");
  assert.ok(posts.some((p) => p.produto === "Interruptor TESTE" && p.legenda.includes("Interruptor TESTE")));
  assert.ok(posts.every((p) => !/\{\{/.test(textoPost(p))), "sem variavel por preencher");
  assert.ok(posts.every((p) => p.hashtags.includes("#balneariocamboriu")));
  const r = registroConteudo(posts[0]);
  for (const c of conteudo.campos.filter((x) => x.obrigatorio)) assert.ok(r.dados[c.id], `obrigatorio ${c.id}`);
  assert.ok(conteudo.estados.includes(r.estado));
  // sem produto no catalogo: nenhuma pauta de produto
  assert.ok(gerarCalendario({ inicio: "2026-11-04", semanas: 2, produtos: [] }).every((p) => !p.produto));
});

// ---------------------------------------------------------------- prospeccao
test("prospeccao: links publicos, mensagem personalizada e registro de parceiro valido", () => {
  const vendas = CATALOGO.find((s) => s.id === "vendas");
  const parceiro = vendas.registros.find((r) => r.tipo === "parceiro");
  const tipos = parceiro.campos.find((c) => c.id === "tipo_parceiro").opcoes;
  for (const p of PUBLICOS) assert.ok(tipos.includes(p.tipo_parceiro), p.id);
  const arq = PUBLICOS.find((p) => p.id === "arquitetos");
  const links = ondeEncontrar(arq, "Itajaí");
  assert.ok(links.some((l) => l.url.startsWith("https://www.google.com/maps/search/") && l.url.includes("Itaja%C3%AD")));
  assert.ok(links.some((l) => l.url.includes("instagram.com/explore/tags/arquiteturaitajai")));
  const m = mensagemPara(arq, { contato: "Marina", remetente: "Fernando", cidade: "Itajaí", projeto_visto: "Casa Praia", detalhe: "a marcenaria" });
  assert.ok(m.includes("Marina") && m.includes("Casa Praia") && /não receber contato/.test(m));
  assert.match(mensagemPara(arq, {}), /\[contato\]/, "faltando dado: aparece o colchete para preencher");
  const { erros, registro } = registroParceiro(arq, { escritorio: "Studio TESTE", contato: "Marina", email: "m@studio.com" }, "2026-11-04");
  assert.deepEqual(erros, []);
  for (const c of parceiro.campos.filter((x) => x.obrigatorio)) assert.ok(registro.dados[c.id], `obrigatorio ${c.id}`);
  assert.equal(registro.estado, "prospectado");
  assert.ok(registroParceiro(arq, { escritorio: "", contato: "" }).erros.length >= 2);
});

// ---------------------------------------------------------------- atividade -> ferramenta
test("atividades dos cargos apontam para a ferramenta certa", () => {
  assert.equal(ferramentaDaAtividade("Montar orçamentos e propostas")?.href, "#/orcamentos");
  assert.equal(ferramentaDaAtividade("Responder leads em até 1 hora")?.href, "#/contato");
  assert.equal(ferramentaDaAtividade("Publicar conteúdo no Instagram")?.href, "#/conteudo");
  assert.equal(ferramentaDaAtividade("Café técnico com arquitetos")?.href, "#/prospeccao");
  assert.equal(ferramentaDaAtividade("Visitar a obra"), null);
  // boa parte da agenda dos cargos comerciais tem ferramenta
  const vendas = CATALOGO.find((s) => s.id === "vendas");
  const ativs = vendas.equipe.flatMap((p) => Object.values(p.atividades ?? {}).flat());
  const com = ativs.filter((a) => ferramentaDaAtividade(a));
  assert.ok(com.length / ativs.length >= 0.5, `${com.length} de ${ativs.length} atividades do Comercial com ferramenta`);
});

// ---------------------------------------------------------------- formulario do CFO: estimativas
import { completarComEstimativas, estimadosQueFicam, valoresEstimados } from "../../apps/web/js/domain/formulario_cfo.js";

test("estimativas: so completam campo vazio, ficam marcadas e somem ao ajustar", () => {
  const respostas = { vendas: { dados: { entrada_pct: "50", taxa_cartao_pct: "4,5" } }, compras: { dados: {} } };
  const novas = completarComEstimativas(respostas, "2026-11-04T00:00:00Z");
  assert.equal(novas.vendas.entrada_pct, "50", "valor do fundador nunca é trocado");
  assert.equal(novas.vendas._estimados.entrada_pct, undefined);
  assert.equal(novas.vendas.parcelas_max, "6");
  assert.equal(novas.compras.margem_cambial_pct, "4");
  assert.ok(novas.compras._estimados.margem_cambial_pct.fonte.includes("3–5%"));
  const depois = Object.fromEntries(Object.entries(novas).map(([s, d]) => [s, { dados: d }]));
  const lista = valoresEstimados(depois);
  assert.ok(lista.some((e) => e.campo === "parcelas_max" && e.secao === "vendas"));
  assert.ok(!lista.some((e) => e.campo === "entrada_pct"));
  // completar de novo nao mexe no que ja foi estimado
  assert.deepEqual(Object.keys(completarComEstimativas(depois)), []);
  // ajustou um campo: a marca dele some; as outras ficam
  const fica = estimadosQueFicam(novas.vendas._estimados, { ...novas.vendas, parcelas_max: "10" });
  assert.equal(fica.parcelas_max, undefined);
  assert.ok(fica.desconto_pix_pct);
  assert.equal(estimadosQueFicam({}, {}), null);
});
