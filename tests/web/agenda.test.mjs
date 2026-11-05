import { test } from "node:test";
import assert from "node:assert/strict";
import { cargosDoSetor, chaveDaAgenda, segundaDa, slugAtividade, tarefasDaAgenda, ultimoDiaDoMes } from "../../apps/web/js/domain/agenda.js";
import { CATALOGO } from "../../apps/web/js/data/catalogo.js";

const ATIV = { diaria: ["Responder leads antes das 10h."], semanal: ["Montar a lista da semana."], mensal: ["Reativar a base."] };

test("agenda: quarta-feira gera diária, semanal (prazo sexta) e mensal (fim do mês)", () => {
  const t = tarefasDaAgenda(ATIV, "2026-11-04"); // quarta
  assert.deepEqual(t.map((x) => [x.periodo, x.prazo, x.periodoChave]), [["diaria", "2026-11-04", "2026-11-04"], ["semanal", "2026-11-06", "2026-11-02"], ["mensal", "2026-11-30", "2026-11"]]);
  assert.match(t[0].titulo, /^Hoje: Responder leads/);
});
test("agenda: fim de semana não gera nada; segunda de outra semana tem chave nova", () => {
  assert.deepEqual(tarefasDaAgenda(ATIV, "2026-11-07"), []);
  assert.deepEqual(tarefasDaAgenda(ATIV, "2026-11-08"), []);
  assert.equal(tarefasDaAgenda(ATIV, "2026-11-09").find((x) => x.periodo === "semanal").periodoChave, "2026-11-09");
});
test("agenda: datas auxiliares", () => {
  assert.equal(segundaDa("2026-11-08"), "2026-11-02");
  assert.equal(ultimoDiaDoMes("2028-02-10"), "2028-02-29");
  assert.equal(ultimoDiaDoMes("2026-12-31"), "2026-12-31");
});
test("agenda: chave é estável no período e diferente entre períodos", () => {
  const [a] = tarefasDaAgenda(ATIV, "2026-11-04"), [b] = tarefasDaAgenda(ATIV, "2026-11-05"), [c] = tarefasDaAgenda(ATIV, "2026-11-04");
  assert.equal(chaveDaAgenda("u", "sdr", a), chaveDaAgenda("u", "sdr", c));
  assert.notEqual(chaveDaAgenda("u", "sdr", a), chaveDaAgenda("u", "sdr", b));
  assert.notEqual(slugAtividade("A"), slugAtividade("B"));
});
test("agenda: todos os setores do catálogo têm cargos com atividades e o SDR do comercial está lá", () => {
  for (const s of CATALOGO) assert.ok(cargosDoSetor(s).length >= 2, s.id);
  const vendas = cargosDoSetor(CATALOGO.find((s) => s.id === "vendas"));
  assert.ok(vendas.some((c) => c.id === "sdr" && c.atividades.diaria.length));
  assert.ok(vendas.some((c) => c.id === "diretor"));
});
