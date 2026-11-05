import { test } from "node:test";
import assert from "node:assert/strict";
import { etapaDoZoho, jaImportado, leadDoCrm, negocioDoCrm, origemDoZoho } from "../../apps/web/js/domain/crm_import.js";

test("CRM: origem e etapa do Zoho viram opções do VEOS", () => {
  assert.equal(origemDoZoho("Casa Hall Shopping"), "showroom_evento");
  assert.equal(origemDoZoho("Exposição Profissional"), "showroom_evento");
  assert.equal(origemDoZoho("Instagram"), "instagram");
  assert.equal(origemDoZoho("Google"), "outro");
  assert.equal(origemDoZoho(null), "outro");
  assert.deepEqual(["Ganho", "Negociação", "Orçamento", "Análise de Necessidades", "Perdido"].map(etapaDoZoho), ["ganha", "negociacao", "proposta", "qualificacao", "perdida"]);
});
test("CRM: lead mantém a origem e o id do Zoho e não inventa campos", () => {
  const l = leadDoCrm({ id: "99", Full_Name: "Maria Souza", Mobile: "(47) 99999-1111", Email: "MARIA@X.com", Lead_Source: "Casa Hall Shopping", Company: "Studio M", City: "Itajaí" });
  assert.equal(l.titulo, "Maria Souza");
  assert.equal(l.estado, "novo");
  assert.deepEqual([l.dados.telefone, l.dados.email, l.dados.origem, l.dados.cidade], ["47999991111", "maria@x.com", "showroom_evento", "Itajaí"]);
  assert.match(l.dados.interesse, /Leads 99/);
  assert.match(l.dados.interesse, /Casa Hall Shopping/);
  assert.equal(l.dados.tipo_imovel, undefined);
  assert.equal(leadDoCrm({ id: "1", Full_Name: "A B", Converted__s: true }).estado, "convertido");
  assert.equal("telefone" in leadDoCrm({ id: "2", Full_Name: "Sem Fone", Phone: "123" }).dados, false);
});
test("CRM: negócio ganho leva valor, data e a marca de origem; fase da obra fica em branco", () => {
  const n = negocioDoCrm({ id: "55", Deal_Name: "Casa Praia Brava", Stage: "Ganho", Amount: 85000, Account_Name: { name: "Família Lima" }, Closing_Date: "2025-08-20", Lead_Source: "Parceiro", Next_Step: "Entregar" });
  assert.equal(n.estado, "ganha");
  assert.equal(n.valor, 85000);
  assert.equal(n.dados.valor_estimado, "85000.00");
  assert.equal(n.dados.cliente_nome, "Família Lima");
  assert.equal(n.dados.data_ganho, "2025-08-20");
  assert.match(n.dados.proximo_passo, /Deals 55/);
  assert.match(n.dados.proximo_passo, /Parceiro/);
  assert.equal(n.dados.fase_obra, undefined);
  assert.equal(negocioDoCrm({ id: "56", Deal_Name: "X", Stage: "Negociação" }).dados.data_ganho, undefined);
});
test("CRM: reconhece o que já foi levado ao funil", () => {
  const regs = [{ id: "r1", dados: { interesse: "Importado do Zoho CRM (Leads 99; origem no Zoho: x)." } }];
  assert.equal(jaImportado(regs, "Leads", "99")?.id, "r1");
  assert.equal(jaImportado(regs, "Leads", "100"), null);
  assert.equal(jaImportado(regs, "Deals", "99"), null);
});
