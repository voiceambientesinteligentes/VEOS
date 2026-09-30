// Calculadora de Precos e Negociacao ao Vivo: casos de aceite, Simples Nacional e
// paridade das regras de margem/alcada com o motor do servidor (cfo.ts).
import assert from "node:assert/strict";
import { test } from "node:test";

import { aliquotaSimples, alcadaDesconto, anexoPorFatorR, calculadora, margemPolitica, negociacao, PrecoError } from "../../apps/web/js/domain/precificacao.js";
import * as cfo from "../../supabase/functions/_shared/regras/cfo.ts";

const R = (reais) => BigInt(Math.round(reais * 100)); // so para montar entradas de teste
const pct = (h) => ({ num: h, den: 100n }); // centesimos -> Razao %

test("aceite: custo extra % incide sobre o preco ja com desconto", () => {
  const r = negociacao({
    tabela: R(20000), desconto: { modo: "pct", valor: 1000n },
    custos: [{ tipo: "produto", total: R(8000) }],
    extras: [{ modo: "pct", valor: 1000n }],
    impostos: { produto: pct(400n), servico: pct(600n) },
  });
  assert.equal(r.liquido, R(18000));
  assert.equal(r.descontoRs, R(2000));
  assert.equal(r.extras[0].total, R(1800)); // 10% de 18.000, nao de 20.000
  assert.equal(r.custoExtras, R(1800));
});

test("negociacao: imposto rateado, provisao de 2% e faixa da Politica V1", () => {
  const r = negociacao({
    tabela: R(100000), desconto: { modo: "rs", valor: 0n },
    custos: [{ tipo: "produto", total: R(30000) }, { tipo: "servico", total: R(10000) }],
    extras: [], impostos: { produto: pct(400n), servico: pct(600n) },
  });
  assert.equal(r.receitaProduto, R(75000)); // 30/40 do liquido
  assert.equal(r.receitaServico, R(25000));
  assert.equal(r.impostoTotal, R(3000) + R(1500));
  assert.equal(r.rl, R(95500));
  assert.equal(r.risco, R(1910));
  assert.equal(r.mc, R(95500 - 40000 - 1910));
  assert.equal(r.faixa, "VERDE");
  assert.equal(r.alcada.nivel, "FLUXO NORMAL");
  assert.equal(r.ticket.abaixo_do_desejado, false);
});

test("negociacao: desconto acima de 2% pede direcao; ticket abaixo de 100 mil e meta, nao bloqueio", () => {
  const r = negociacao({
    tabela: R(50000), desconto: { modo: "pct", valor: 300n },
    custos: [{ tipo: "servico", total: R(20000) }], impostos: { produto: pct(400n), servico: pct(600n) },
  });
  assert.equal(r.alcada.nivel, "DIRECAO");
  assert.equal(r.ticket.abaixo_do_desejado, true);
  assert.match(r.ticket.texto, /meta, não bloqueio/);
});

test("negociacao sem custo ou sem imposto nao inventa margem", () => {
  const a = negociacao({ tabela: R(50000), custos: [], impostos: { produto: pct(400n), servico: pct(600n) } });
  assert.equal(a.mc, null);
  assert.equal(a.faixa, "NAO RESOLVIDO");
  assert.equal(a.pendencias.length, 1);
  const b = negociacao({ tabela: R(50000), custos: [{ tipo: "produto", total: R(1) }], impostos: null });
  assert.equal(b.faixa, "NAO RESOLVIDO");
  assert.throws(() => negociacao({ tabela: R(1), custos: [{ tipo: "x", total: 1n }] }), PrecoError);
});

test("Simples Nacional: aliquota efetiva pela LC 123", () => {
  assert.equal(aliquotaSimples(0n, "III").efetivaH, 600n);
  assert.equal(aliquotaSimples(R(150000), "I").efetivaH, 400n);
  const a = aliquotaSimples(R(360000), "I"); // (360000 x 7,3% - 5.940) / 360000
  assert.equal(a.faixa, 2);
  assert.equal(a.efetivaH, 565n);
  assert.equal(aliquotaSimples(R(1000000), "III").efetivaH, 1244n); // (160000 - 35640)/1e6 = 12,436%
  assert.throws(() => aliquotaSimples(R(4800001), "I"), /fora do Simples/);
  assert.equal(anexoPorFatorR(R(28000), R(100000)), "III");
  assert.equal(anexoPorFatorR(R(27999), R(100000)), "V");
  assert.equal(anexoPorFatorR(null, R(100000)), null);
});

test("calculadora: preco minimo atinge a margem alvo depois de imposto e provisao", () => {
  const c = calculadora({ materiais: R(10000), horas: 4000n, valorHora: R(150), alvo: 3500n, imposto: pct(600n) });
  assert.equal(c.maoDeObra, R(6000));
  assert.equal(c.custo, R(16000));
  assert.equal(c.preco, R(27017.91)); // 16000 / (0,94 x 0,63) = 27.017,89 -> +centavos ate a MC fechar em 35%
  assert.ok(c.pctH >= 3500n, `margem ${c.pctH}`);
  assert.equal(c.faixa, "VERDE");
  const sem = calculadora({});
  assert.equal(sem.preco, 0n);
  assert.equal(sem.pendencias.length, 1);
  assert.throws(() => calculadora({ materiais: 1n, alvo: 9800n }), PrecoError);
});

test("paridade com o motor do servidor (cfo.ts): margem, faixa e alcada", () => {
  let semente = 7;
  const rnd = (n) => ((semente = (semente * 1103515245 + 12345) % 2147483648) % n);
  for (let i = 0; i < 400; i++) {
    const rl = BigInt(rnd(20_000_000) - 1_000_000);
    const custos = BigInt(rnd(15_000_000));
    const js = margemPolitica(rl, custos), ts = cfo.margem(rl, custos);
    assert.equal(js.mc, ts.mc);
    assert.equal(js.faixa, ts.faixa);
    const desc = { num: BigInt(rnd(1000)), den: 100n };
    assert.deepEqual(alcadaDesconto(desc, js.pct).nivel, cfo.alcadaDesconto(desc, ts.pct).nivel, `rl=${rl} custos=${custos} desc=${desc.num}`);
  }
});

test("salvar como proposta: campos que as regras vivas do Comercial vigiam", async () => {
  const { paraProposta } = await import("../../apps/web/js/domain/precificacao.js");
  const base = { custos: [{ tipo: "servico", total: R(20000) }], impostos: { produto: pct(400n), servico: pct(600n) } };
  const ok = paraProposta(negociacao({ tabela: R(120000), desconto: { modo: "pct", valor: 150n }, ...base }), { cliente: "Cliente TESTE", referencia: "EST-1", condicao: "30/70" });
  assert.equal(ok.estado, "rascunho");
  assert.equal(ok.valor, "118200.00");
  assert.equal(ok.dados.faixa_desconto, "ate_2_autonomia");
  assert.equal(ok.dados.faixa_margem, "VERDE");
  assert.equal(ok.dados.aprovacao_direcao, "nao_necessaria");
  const dir = paraProposta(negociacao({ tabela: R(30000), desconto: { modo: "pct", valor: 1000n }, ...base }), { cliente: "X TESTE", referencia: "EST-2", condicao: "à vista" });
  assert.equal(dir.estado, "aguardando_direcao");
  assert.equal(dir.dados.faixa_desconto, "acima_5_analise_integral");
  assert.equal(dir.dados.aprovacao_direcao, "pendente");
  assert.ok(["ATENCAO", "NAO_APROVADO"].includes(dir.dados.faixa_margem));
  assert.throws(() => paraProposta(negociacao({ tabela: R(1000), custos: [], impostos: base.impostos }), { cliente: "a", referencia: "b", condicao: "c" }), /não resolvida/);
  assert.throws(() => paraProposta(negociacao({ tabela: R(120000), ...base }), { cliente: "a", referencia: "", condicao: "c" }), /referência/);
});
