import assert from "node:assert/strict";
import { test } from "node:test";

import { classificar, composicao, converterAntigos, minutos } from "../../apps/web/js/domain/tempos.js";
import { comCompatibilidade, numeroBR, parametros, temTextoExtra } from "../../apps/web/js/domain/formulario_cfo.js";

test("tempo escrito do jeito do fundador", () => {
  assert.equal(minutos("18 MINUTOS").min, 18);
  assert.equal(minutos("16 HORAS").min, 960);
  assert.equal(minutos("8 horas").min, 480);
  assert.equal(minutos("36 MINUTOS CADA CAIXA").min, 36);
  assert.equal(minutos("1h30").min, 90);
  assert.deepEqual(minutos("25"), { min: 25, semUnidade: true });
  assert.equal(minutos("2", "h").min, 120);
  assert.equal(minutos(""), null);
});

test("números com texto junto", () => {
  assert.equal(numeroBR("3600 MêS"), 3600);
  assert.equal(numeroBR("150 DIA"), 150);
  assert.equal(numeroBR("1500 (VARIAVEL)"), 1500);
  assert.equal(numeroBR("127,5"), 127.5);
  assert.equal(numeroBR("R$ 7.000,00"), 7000);
  assert.equal(numeroBR("sem valor"), null);
  assert.ok(temTextoExtra("3600 MêS"));
  assert.ok(!temTextoExtra("3.600,00"));
});

test("classificação da lista antiga", () => {
  assert.deepEqual(classificar("FIAÇÃO PARA INTERRUPTORES DE AUTOMAÇÃO SEM FIO"), { dispositivo: "interruptor", atividade: "fiacao", tecnologia: "sem_fio" });
  assert.deepEqual(classificar("SERVIÇO DE CONFIGURAÇÃO DE REDE (ANTENA)"), { dispositivo: "ap", atividade: "configuracao", tecnologia: "na" });
  assert.equal(classificar("ESTRUTURA DO QUADRO GERENCIAL DE REDE").dispositivo, "quadro_rede");
  const c = converterAntigos([{ servico: "INSTALAÇÃO PARA INTERRUPTORES DE AUTOMAÇÃO CABEADA", horas: "25", unidade: "1" }]);
  assert.equal(c[0].tempo, "25");
  assert.match(c[0].obs, /sem unidade/);
});

const CAT = converterAntigos([
  { servico: "FIAÇÃO PARA INTERRUPTORES DE AUTOMAÇÃO SEM FIO", horas: "15 MINUTOS" },
  { servico: "INSTALAÇÃO PARA INTERRUPTORES DE AUTOMAÇÃO SEM FIO", horas: "20 MINUTOS" },
  { servico: "SERVIÇO DE CONFIGURAÇÃO DE AUTOMAÇÃO SEM FIO (INTERRUPTOR)", horas: "5 MINUTOS" },
  { servico: "CABEAMENTO DE REDE ESTRUTRADA PARA PONTOS DE WIFI", horas: "18 MINUTOS" },
  { servico: "SERVIÇO DE CONFIGURAÇÃO DE REDE (ANTENA)", horas: "30 MINUTOS" },
  { servico: "ESTRUTURA DO QUADRO GERENCIAL DE REDE", horas: "16 HORAS" },
  { servico: "INSTALAÇÃO DE SENSORES SEM FIO PARA AUTOMAÇÃO SEM FIO", horas: "10 MINUTOS" },
  { servico: "INSTALAÇÃO DE SENSORES COM FIO PARA AUTOMAÇÃO SEM FIO", horas: "15 MINUTOS" },
]);

test("composição: horas-padrão a partir dos equipamentos", () => {
  const linhas = [
    { nome: "Interruptores Touch Branco SEM FIO", qtd: 10, tipo: "goods" },
    { nome: "ACCESS POINT U7 - LITE", qtd: 2, tipo: "goods" },
    { nome: "Injetor PoE - 48V 15W", qtd: 2, tipo: "goods" },
    { nome: "SWITCH 16 P GB", qtd: 1, tipo: "goods" },
    { nome: "Sensor de Presença", qtd: 1, tipo: "goods" },
    { nome: "Fechadura TESTE", qtd: 1, tipo: "goods" },
    { nome: "INSTALAÇÃO DA AUTOMAÇÃO", qtd: 12, tipo: "service", unidade: "Hr" },
  ];
  const r = composicao(linhas, CAT);
  // interruptor 40 x 10 + AP config 30 x 2 + cabo AP 18 x 2 + quadro 960 + sensor 10 (alternativa nao soma)
  assert.equal(r.minutos, 400 + 60 + 36 + 960 + 10);
  assert.equal(r.horasCobradas, 12);
  assert.deepEqual(r.faltam.map((f) => f.dispositivo), ["fechadura"]);
  // sem switch nao ha quadro de rede; injetor nao conta
  const s = composicao(linhas.filter((l) => !/SWITCH/.test(l.nome)), CAT);
  assert.equal(s.linhas.some((l) => l.dispositivo === "quadro_rede"), false);
});

test("compatibilidade v1 -> v2 e parâmetros", () => {
  const v1 = {
    equipe: { dados: { tempos: [{ servico: "FIAÇÃO PARA INTERRUPTORES DE AUTOMAÇÃO SEM FIO", horas: "15 MINUTOS" }], pessoas: [{ nome: "T", vinculo: "pj", valor: "3000 MêS", horas_mes: "160", campo_pct: "100" }], produtividade_pct: "100", veiculo_mes: "4000" } },
    fixos: { dados: { itens: [{ descricao: "ALUGUEL", valor: "7000" }, { descricao: "MKT", valor: "900 (VARIAVEL)" }], pro_labore: "0", retirada_real: "12000" } },
    vendas: { dados: { paga_indicacao: "sim", indicacao_pct: "10", comissao_vendedor_pct: "5", taxa_cartao_pct: "4,5", vendas_cartao_pct: "0" } },
  };
  const c = comCompatibilidade(v1);
  assert.equal(c.tempos.dados.itens[0].dispositivo, "interruptor");
  assert.equal(c.voce.dados.retirada_media_real, "12000");
  const p = parametros(v1);
  assert.equal(p.fixos, 7900);
  assert.equal(p.v, 15);
  assert.equal(p.retirada, 12000);
  assert.equal(p.hora.custoHora, 43.75); // (3000 + 4000) / 160
  assert.equal(p.tempos.length, 1);
});

test("serviço a valor fechado entra como valor, não como horas", () => {
  const cat = [...CAT, { descricao: "Fechadura", dispositivo: "fechadura", atividade: "instalacao", tecnologia: "na", unidade: "dispositivo", tempo: "", valor_fechado: "250" }];
  const r = composicao([{ nome: "Fechadura TESTE", qtd: 2, tipo: "goods" }], cat);
  assert.equal(r.valorFechado, 500);
  assert.equal(r.minutos, 0);
  assert.equal(r.faltam.length, 0);
});
