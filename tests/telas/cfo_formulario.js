import { api } from "../js/data/api.js";
import { telaFormularioCfo } from "../js/ui/views/cfo.js";
import { ORCAMENTOS, RESPOSTAS } from "./_cfo_dados.js";
import { rodar } from "./_kit.js";

const salvos = [];
const espera = () => new Promise((r) => setTimeout(r, 50));
api.cfoFormulario = async () => ({ respostas: structuredClone(RESPOSTAS) });
api.cfoOrcamentos = async () => ORCAMENTOS;
api.cfoSalvarSecao = async (secao, dados) => { salvos.push({ secao, dados }); return { id: 1, em: "2026-10-02T13:00:00Z" }; };
rodar(async (v) => {
  await telaFormularioCfo(v);
  const t = v.textContent;
  for (const s of ["1. Impostos e contador", "4. Tempos de serviço", "5. Você, Fernando", "8. Dívidas e caixa", "9. O que aconteceu nos orçamentos", "EST-T001", "Dólar e momento da compra", "convertido da versão anterior"]) if (!t.includes(s)) throw new Error(`falta: ${s}`);
  // lista antiga de tempos convertida para o formato estruturado
  const tempos = v.querySelector("#sec-tempos");
  if (tempos.querySelectorAll(".lista-linha").length !== 5 || tempos.querySelector("[data-sub=dispositivo]").value !== "interruptor") throw new Error("tempos não convertidos");
  if (![...tempos.querySelectorAll("[data-sub=obs]")].some((x) => x.value.includes("sem unidade no original"))) throw new Error("tempo sem unidade não sinalizado");
  [...tempos.querySelectorAll("button")].find((b) => b.textContent.includes("Sugestões da pesquisa")).click();
  if (tempos.querySelectorAll(".lista-sugestao").length < 10) throw new Error("sugestões não entraram");
  if (v.querySelector("#f-voce-retirada_media_real").value !== "18000") throw new Error("retirada não migrou para a seção 5");
  if (v.querySelector("[data-sub=nome]")?.value !== "Técnico TESTE") throw new Error("lista da equipe não carregou");
  if (t.includes("EST-T003")) throw new Error("orçamento recusado não entra na seção 7");
  // numero invalido e recusado; valido e gravado
  v.querySelector("#f-impostos-aliquota_produto_pct").value = "abc";
  v.querySelector("#form-impostos").requestSubmit();
  await espera();
  if (salvos.length) throw new Error("gravou número inválido");
  v.querySelector("#f-impostos-aliquota_produto_pct").value = "5,39";
  v.querySelector("#f-impostos-regime_2027").value = "presumido";
  v.querySelector("#form-impostos").requestSubmit();
  await espera();
  const g = salvos[0];
  if (g?.secao !== "impostos" || g.dados.aliquota_produto_pct !== "5,39" || g.dados.regime_2027 !== "presumido" || g.dados.contador !== "Contador TESTE") throw new Error(JSON.stringify(salvos));
  // lista: adicionar uma divida
  const sec = v.querySelector("#sec-dividas");
  [...sec.querySelectorAll("button")].find((b) => b.textContent.includes("Adicionar linha")).click();
  const linhas = sec.querySelectorAll(".lista-linha");
  linhas[1].querySelector("[data-sub=credor]").value = "Cartão TESTE";
  linhas[1].querySelector("[data-sub=parcela]").value = "1.000";
  v.querySelector("#form-dividas").requestSubmit();
  await espera();
  if (salvos[1]?.dados.lista?.length !== 2 || salvos[1].dados.lista[1].credor !== "Cartão TESTE") throw new Error(JSON.stringify(salvos[1]));
  // pedidos: responder um orcamento
  const det = v.querySelector(".cfo-orc");
  det.open = true;
  det.querySelector("[data-sub=recebido]").value = "10.000";
  v.querySelector("#form-pedidos").requestSubmit();
  await espera();
  if (salvos[2]?.dados.por_orcamento?.["EST-T001"]?.recebido !== "10.000") throw new Error(JSON.stringify(salvos[2]));
  // numero invalido dentro de uma lista e recusado
  const lt = tempos.querySelector(".lista-linha [data-sub=tempo]");
  lt.value = "muito";
  v.querySelector("#form-tempos").requestSubmit();
  await espera();
  if (salvos.length !== 3 || !tempos.textContent.includes("sem número")) throw new Error("lista com número inválido foi gravada");
  lt.value = "15";
  v.querySelector("#form-tempos").requestSubmit();
  await espera();
  if (salvos[3]?.secao !== "tempos" || salvos[3].dados.itens.length < 15) throw new Error(JSON.stringify(salvos[3]).slice(0, 200));
});
