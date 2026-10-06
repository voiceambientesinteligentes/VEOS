// CAIXA REAL (Ferramentas do CFO): extrato bancario e conciliacao, contas fixas e dividas recorrentes,
// fluxo de caixa de 13 semanas, fechamento do mes (DRE gerencial) e indicadores da Politica.
// Calculos em domain/{extrato,caixa13,dre,indicadores}.js (os mesmos usados pelo CFO no motor de IA).
import { api } from "../../data/api.js";
import { formatBRL, formatDate } from "../../domain/format.js";
import { codificacaoOFX, lerCSV, lerOFX, resumoExtrato } from "../../domain/extrato.js";
import { projetar, reserva } from "../../domain/caixa13.js";
import { dre } from "../../domain/dre.js";
import { indicadores } from "../../domain/indicadores.js";
import { parametros } from "../../domain/formulario_cfo.js";
import { diagnosticoParams, impostosSimulados } from "../../domain/cfo_cenarios.js";
import { resumir } from "../../domain/diagnostico.js";
import { clear, errorNotice, field, h, method, panel, stamp, stat, table } from "../dom.js";

const brl = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : formatBRL(String(Number(v).toFixed(2))));
const pct = (v) => (v === null || v === undefined ? "—" : `${String(v).replace(".", ",")}%`);
const mesAtual = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 7);
const LOTE = 400;
const TOM = { ok: "ok", atencao: "warn", risco: "risk", lacuna: "neutral", info: "live" };
const SIT = { ok: "Dentro", atencao: "Atenção", risco: "Fora", lacuna: "Lacuna", info: "Acompanhar" };
const GRUPO = { receita: "Receitas", deducao: "Deduções", custo_variavel: "Custos variáveis", despesa_fixa: "Despesas fixas", retirada: "Retirada", financeiro: "Financeiro", investimento: "Investimentos", transferencia: "Transferências", nao_operacional: "Não operacional" };
const ok = (msg) => h("p", { class: "notice notice-ok", role: "status" }, msg);

function seletorCategoria(plano, valor, natureza) {
  const opcoes = plano.filter((p) => p.ativo && (p.natureza === "ambas" || !natureza || p.natureza === natureza));
  return h("select", { class: "select" }, h("option", { value: "" }, "— classificar —"),
    Object.entries(GRUPO).map(([g, rot]) => {
      const itens = opcoes.filter((p) => p.grupo === g);
      return itens.length ? h("optgroup", { label: rot }, itens.map((p) => h("option", { value: p.codigo, selected: p.codigo === valor }, `${p.codigo} ${p.nome}`))) : null;
    }));
}

/** Le o arquivo com a codificacao certa (OFX: cabecalho; CSV: UTF-8, senao Windows-1252). */
async function lerArquivo(arquivo) {
  const buf = await arquivo.arrayBuffer();
  const ascii = new TextDecoder("latin1").decode(buf.slice(0, 600));
  if (/<OFX>|OFXHEADER/i.test(ascii)) return lerOFX(new TextDecoder(codificacaoOFX(ascii)).decode(buf));
  let texto = new TextDecoder("utf-8").decode(buf);
  if (texto.includes("�")) texto = new TextDecoder("windows-1252").decode(buf);
  const r = lerCSV(texto);
  r.texto = texto;
  return r;
}

// ================================================================ caixa e extrato
export async function telaCaixa(root) {
  const conteudo = h("div", { class: "stack" });
  root.append(conteudo);
  let filtro = { filtro: "pendentes", conta: "", de: "", ate: "" };

  async function desenhar(msg) {
    const [{ contas, hoje }, { plano }, { sugestoes }, { movimentos }] = await Promise.all([api.caixaContas(), api.caixaPlano(), api.caixaSugestoes(), api.caixaMovimentos(filtro)]);
    const ativas = contas.filter((k) => k.ativa);
    const total = ativas.filter((k) => k.saldo_hoje !== null).reduce((s, k) => s + Number(k.saldo_hoje), 0);
    const semSaldo = ativas.filter((k) => k.saldo_hoje === null);
    const saida = h("div", { role: "status" });

    // ---- importar extrato
    const contaSel = h("select", { class: "select", id: "cx-conta" }, ativas.map((k) => h("option", { value: k.id }, `${k.nome}${k.final_conta ? ` (…${k.final_conta})` : ""}`)));
    const arquivo = h("input", { class: "input", id: "cx-arquivo", type: "file", accept: ".ofx,.csv,.txt,.OFX,.CSV" });
    const previa = h("div", { class: "stack-s" });
    let lido = null;
    arquivo.addEventListener("change", async () => {
      clear(previa);
      lido = null;
      const f = arquivo.files?.[0];
      if (!f) return;
      try {
        lido = await lerArquivo(f);
        lido.nome = f.name;
        mostrarPrevia();
      } catch (e) { previa.append(errorNotice(`Não consegui ler o arquivo: ${e.message}`)); }
    });
    function mostrarPrevia() {
      clear(previa);
      if (lido.precisaMapa) {
        const sel = (id, rot) => h("select", { class: "select", id }, h("option", { value: "" }, "—"), lido.cabecalho.map((c, i) => h("option", { value: i }, `${i + 1}: ${c || "(vazia)"}`)));
        const sd = sel("cx-m-data"), sh = sel("cx-m-desc"), sv = sel("cx-m-valor");
        const aplicar = h("button", { class: "btn btn-ghost", type: "button" }, "Ler com estas colunas");
        aplicar.addEventListener("click", () => {
          if (!sd.value || !sv.value) return previa.append(errorNotice("Escolha pelo menos a data e o valor."));
          const nome = lido.nome, texto = lido.texto;
          lido = lerCSV(texto, { data: Number(sd.value), descricao: sh.value === "" ? undefined : Number(sh.value), valor: Number(sv.value) });
          lido.nome = nome; lido.texto = texto;
          mostrarPrevia();
        });
        previa.append(h("p", { class: "notice notice-warn" }, lido.avisos.join(" ")), h("div", { class: "form-grid" }, field(sd.id, "Coluna da data", sd), field(sh.id, "Coluna do histórico", sh), field(sv.id, "Coluna do valor", sv)), aplicar,
          table({ caption: "Primeiras linhas do arquivo", head: lido.cabecalho.map((c, i) => `${i + 1}: ${c}`), rows: lido.amostra.slice(0, 5) }));
        return;
      }
      const r = resumoExtrato(lido.linhas);
      const enviar = h("button", { class: "btn btn-primary", type: "button" }, `Importar ${r.quantidade} lançamento(s)`);
      enviar.addEventListener("click", async () => {
        enviar.disabled = true;
        let novas = 0, repetidas = 0;
        try {
          for (let i = 0; i < lido.linhas.length; i += LOTE) {
            const ultimo = i + LOTE >= lido.linhas.length;
            const res = await api.caixaImportar(contaSel.value, { arquivo: lido.nome, formato: lido.formato, linhas: lido.linhas.slice(i, i + LOTE), ...(ultimo ? { saldo_final: lido.saldo_final, saldo_final_em: lido.saldo_final_em } : {}) });
            novas += res.novas; repetidas += res.repetidas;
          }
          await desenhar(`Extrato importado: ${novas} lançamento(s) novo(s)${repetidas ? `, ${repetidas} já estavam no VEOS (não duplicados)` : ""}.`);
        } catch (e) { previa.append(errorNotice(e.message)); enviar.disabled = false; }
      });
      previa.append(
        h("div", { class: "cfo-stats" }, stat("Lançamentos", String(r.quantidade), `${formatDate(lido.de)} a ${formatDate(lido.ate)}`), stat("Entradas", brl(r.entradas), ""), stat("Saídas", brl(r.saidas), ""),
          stat("Saldo final do banco", brl(lido.saldo_final), lido.saldo_final !== null ? `em ${formatDate(lido.saldo_final_em)} (vira a âncora do saldo)` : "o arquivo não traz saldo: informe o saldo de uma data na conta")),
        lido.avisos.length ? h("p", { class: "notice notice-warn" }, lido.avisos.slice(0, 3).join(" ")) : null,
        table({ caption: "Prévia", head: ["Data", "Histórico", "Valor"], align: ["", "", "r"], rows: lido.linhas.slice(0, 8).map((l) => [formatDate(l.data), l.descricao, brl(l.valor)]) }),
        h("div", { class: "row" }, enviar));
    }

    // ---- nova conta / saldo informado
    const nNome = h("input", { class: "input", id: "cx-n-nome", placeholder: "Ex.: Itaú PJ" }), nBanco = h("input", { class: "input", id: "cx-n-banco" }), nFinal = h("input", { class: "input", id: "cx-n-final", placeholder: "últimos dígitos" });
    const nSaldo = h("input", { class: "input num", id: "cx-n-saldo", inputmode: "decimal" }), nData = h("input", { class: "input", id: "cx-n-data", type: "date" });
    const nTipo = h("select", { class: "select", id: "cx-n-tipo" }, [["corrente", "Conta corrente"], ["aplicacao", "Aplicação"], ["poupanca", "Poupança"], ["caixa", "Dinheiro em caixa"], ["cartao", "Cartão de crédito"]].map(([v, t]) => h("option", { value: v }, t)));
    const fConta = h("form", { class: "stack-s", novalidate: true }, h("div", { class: "form-grid" }, field(nNome.id, "Nome *", nNome), field(nBanco.id, "Banco", nBanco), field(nFinal.id, "Final da conta", nFinal), field(nTipo.id, "Tipo", nTipo), field(nSaldo.id, "Saldo numa data (opcional)", nSaldo, "Use quando o extrato não traz saldo"), field(nData.id, "Data desse saldo", nData)), h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "submit" }, "Cadastrar conta")));
    fConta.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api.caixaCriarConta({ nome: nNome.value, banco: nBanco.value, final_conta: nFinal.value, tipo: nTipo.value, ...(nSaldo.value ? { saldo_inicial: Number(nSaldo.value.replace(/\./g, "").replace(",", ".")), saldo_inicial_em: nData.value } : {}) });
        await desenhar("Conta cadastrada.");
      } catch (err) { fConta.append(errorNotice(err.message)); }
    });

    const linhaConta = (k) => {
      const saldoBtn = h("button", { class: "btn btn-ghost", type: "button" }, "Informar saldo");
      saldoBtn.addEventListener("click", async () => {
        const data = prompt("Data do saldo (AAAA-MM-DD):", hoje);
        if (!data) return;
        const v = prompt("Saldo no fim desse dia (R$):");
        if (v === null) return;
        try { await api.caixaAlterarConta(k.id, { saldo_inicial: Number(v.replace(/\./g, "").replace(",", ".")), saldo_inicial_em: data }); await desenhar("Saldo informado."); } catch (e) { saida.append(errorNotice(e.message)); }
      });
      return [h("strong", null, k.nome), k.banco ?? "—", k.final_conta ? `…${k.final_conta}` : "—", k.saldo_hoje === null ? stamp("Sem saldo", "neutral") : brl(k.saldo_hoje),
        k.ancora_em ? `${k.ancora_origem === "extrato" ? "extrato" : "informado"} em ${formatDate(k.ancora_em)}` : "—",
        k.ultimo_extrato ? `até ${formatDate(k.ultimo_extrato.periodo_ate)}` : "nenhum", k.sem_categoria ? stamp(`${k.sem_categoria} sem categoria`, "warn") : "", saldoBtn];
    };

    // ---- sugestoes de conciliacao
    const unicas = sugestoes.filter((s) => s.unica);
    const aplicar = h("button", { class: "btn btn-primary", type: "button", disabled: !unicas.length }, `Conciliar as ${unicas.length} sugestões únicas`);
    aplicar.addEventListener("click", async () => {
      aplicar.disabled = true;
      try { const r = await api.caixaAplicarSugestoes(); await desenhar(`${r.conciliadas} lançamento(s) conciliado(s)${r.erros.length ? `; ${r.erros.length} com erro` : ""}.`); } catch (e) { saida.append(errorNotice(e.message)); }
    });
    const porId = new Map(movimentos.map((m) => [m.id, m]));
    const linhaSug = (s) => {
      const b = h("button", { class: "btn btn-ghost", type: "button" }, "Conciliar");
      b.addEventListener("click", async () => { try { await api.caixaConciliar(s.movimento_id, { tipo: s.tipo, alvo_id: s.alvo_id }); await desenhar("Conciliado."); } catch (e) { saida.append(errorNotice(e.message)); } });
      const m = porId.get(s.movimento_id);
      const alvo = s.tipo === "parcela" ? `Parcela ${s.alvo.numero} do ${s.alvo.pedido} (vence ${formatDate(s.alvo.vencimento)})` : s.tipo === "conta_pagar" ? `${s.alvo.descricao} · ${s.alvo.fornecedor} (vence ${formatDate(s.alvo.vencimento)})` : `Transferência ${s.alvo.conta} em ${formatDate(s.alvo.data)}`;
      return [m ? `${formatDate(m.data)} · ${m.descricao}` : s.movimento_id.slice(0, 8), m ? brl(m.valor) : "", alvo, s.unica ? stamp("única", "ok") : stamp(`${s.dias} dia(s)`, "neutral"), b];
    };

    // ---- lancamentos
    const fConta2 = h("select", { class: "select", id: "cx-f-conta" }, h("option", { value: "" }, "Todas as contas"), ativas.map((k) => h("option", { value: k.id, selected: k.id === filtro.conta }, k.nome)));
    const fTipo = h("select", { class: "select", id: "cx-f-tipo" }, [["pendentes", "Pendentes (sem categoria ou sem título)"], ["sem_categoria", "Sem categoria"], ["todos", "Todos"]].map(([v, t]) => h("option", { value: v, selected: v === filtro.filtro }, t)));
    const fDe = h("input", { class: "input", id: "cx-f-de", type: "date", value: filtro.de }), fAte = h("input", { class: "input", id: "cx-f-ate", type: "date", value: filtro.ate });
    const filtrar = h("button", { class: "btn btn-ghost", type: "button" }, "Filtrar");
    filtrar.addEventListener("click", () => { filtro = { filtro: fTipo.value, conta: fConta2.value, de: fDe.value, ate: fAte.value }; desenhar(); });
    const nomeConta = new Map(contas.map((k) => [k.id, k.nome]));
    const linhaMov = (m) => {
      const sel = seletorCategoria(plano, m.categoria, m.valor > 0 ? "entrada" : "saida");
      const lembrar = h("input", { type: "checkbox", "aria-label": "lembrar para descrições parecidas" });
      const padrao = h("input", { class: "input", value: String(m.descricao).split(/\s+/).slice(0, 3).join(" "), "aria-label": "texto que identifica", style: "min-width:8rem" });
      sel.addEventListener("change", async () => {
        try {
          const r = await api.caixaClassificar(m.id, { categoria: sel.value, ...(lembrar.checked ? { padrao: padrao.value } : {}) });
          saida.replaceChildren(ok(`Classificado${r.outros_classificados ? ` (+${r.outros_classificados} parecido(s) pela regra)` : ""}.`));
          if (r.outros_classificados) await desenhar();
        } catch (e) { saida.replaceChildren(errorNotice(e.message)); }
      });
      const vinculo = m.parcela ? `Parcela ${m.parcela.numero} · ${m.parcela.pedido?.numero ?? ""}` : m.conta ? `${m.conta.descricao}` : m.transferencia_de ? "Transferência" : "";
      return [formatDate(m.data), nomeConta.get(m.conta_id) ?? "", m.descricao, h("span", { class: m.valor < 0 ? "neg" : "" }, brl(m.valor)), sel, h("label", { class: "row" }, lembrar, padrao), vinculo || (m.classificado_por === "regra" ? stamp("regra", "live") : "")];
    };

    // ---- plano de contas
    const pCod = h("input", { class: "input", id: "cx-p-cod", placeholder: "4.10" }), pNome = h("input", { class: "input", id: "cx-p-nome" });
    const pGrupo = h("select", { class: "select", id: "cx-p-grupo" }, Object.entries(GRUPO).map(([v, t]) => h("option", { value: v }, t)));
    const pNat = h("select", { class: "select", id: "cx-p-nat" }, [["saida", "Saída"], ["entrada", "Entrada"], ["ambas", "As duas"]].map(([v, t]) => h("option", { value: v }, t)));
    const fPlano = h("form", { class: "stack-s", novalidate: true }, h("div", { class: "form-grid" }, field(pCod.id, "Código", pCod), field(pNome.id, "Nome", pNome), field(pGrupo.id, "Grupo", pGrupo), field(pNat.id, "Natureza", pNat)), h("div", { class: "row" }, h("button", { class: "btn btn-ghost", type: "submit" }, "Acrescentar categoria")));
    fPlano.addEventListener("submit", async (e) => { e.preventDefault(); try { await api.caixaCriarCategoria({ codigo: pCod.value.trim(), nome: pNome.value, grupo: pGrupo.value, natureza: pNat.value }); await desenhar("Categoria criada."); } catch (err) { fPlano.append(errorNotice(err.message)); } });

    clear(conteudo).append(...[
      msg ? ok(msg) : null,
      h("div", { class: "cfo-stats" },
        stat("Saldo hoje (contas com saldo)", ativas.length ? brl(total) : "—", semSaldo.length ? `sem saldo: ${semSaldo.map((k) => k.nome).join(", ")} (LACUNA)` : `${ativas.length} conta(s)`),
        stat("A classificar", String(ativas.reduce((s, k) => s + k.sem_categoria, 0)), "lançamentos sem categoria (o DRE fica incompleto)"),
        stat("Sugestões de conciliação", String(sugestoes.length), `${unicas.length} única(s): um clique concilia todas`)),
      panel({ title: "Contas da empresa", subtitle: "Só o extrato comprova recebimento e pagamento (CFO). O saldo parte do saldo do banco no extrato OFX ou de um saldo que você informa numa data." },
        saida,
        contas.length ? table({ caption: "Contas", head: ["Conta", "Banco", "Final", "Saldo hoje", "Âncora do saldo", "Último extrato", "", ""], align: ["", "", "", "r", "", "", "", ""], rows: contas.map(linhaConta) }) : h("p", { class: "result-empty" }, "Nenhuma conta ainda: cadastre as contas da empresa abaixo."),
        method("Cadastrar conta", fConta)),
      ativas.length ? panel({ title: "Importar extrato", subtitle: "OFX (recomendado: no internet banking, 'exportar extrato' → OFX/Money) ou CSV. O arquivo é lido no seu navegador; reimportar não duplica." },
        h("div", { class: "form-grid" }, field(contaSel.id, "Conta", contaSel), field(arquivo.id, "Arquivo do extrato", arquivo)), previa) : null,
      panel({ title: "Conciliação", subtitle: "Lançamento do extrato × parcela de cliente, conta a pagar ou transferência entre contas (mesmo valor, até 10 dias). Conciliar recebe/paga o título na data do extrato.", actions: h("div", { class: "row" }, aplicar) },
        sugestoes.length ? table({ caption: "Sugestões", head: ["Lançamento", "Valor", "Título", "", ""], align: ["", "r", "", "", ""], rows: sugestoes.slice(0, 60).map(linhaSug) }) : h("p", { class: "result-empty" }, "Nenhuma sugestão agora.")),
      panel({ title: "Lançamentos do extrato", subtitle: "Classifique pelo plano de contas. Marque 'lembrar' para o VEOS classificar sozinho os próximos com o mesmo texto." },
        h("div", { class: "form-grid" }, field(fConta2.id, "Conta", fConta2), field(fTipo.id, "Mostrar", fTipo), field(fDe.id, "De", fDe), field(fAte.id, "Até", fAte)), h("div", { class: "row" }, filtrar),
        table({ caption: `${movimentos.length} lançamento(s)`, head: ["Data", "Conta", "Histórico", "Valor", "Categoria", "Lembrar", "Vínculo"], align: ["", "", "", "r", "", "", ""], rows: movimentos.map(linhaMov) })),
      panel({ title: "Plano de contas gerencial", subtitle: "Sugestão inicial (proposta PL-049): renomeie ou acrescente o que fizer sentido para a VOICE." },
        method(`Ver as ${plano.length} categorias`, ...Object.entries(GRUPO).map(([g, rot]) => `${rot}: ${plano.filter((p) => p.grupo === g).map((p) => `${p.codigo} ${p.nome}${p.ativo ? "" : " (inativa)"}`).join(" · ") || "—"}`)),
        fPlano),
    ].filter(Boolean));
  }
  await desenhar();
}

// ================================================================ contas fixas e dividas
export async function telaRecorrentes(root) {
  const conteudo = h("div", { class: "stack" });
  root.append(conteudo);
  async function desenhar(msg) {
    const [{ recorrentes }, { plano }] = await Promise.all([api.caixaRecorrentes(), api.caixaPlano()]);
    const saida = h("div", { role: "status" });
    const nomePlano = new Map(plano.map((p) => [p.codigo, p.nome]));
    const ativas = recorrentes.filter((r) => r.ativa);
    const fixos = ativas.filter((r) => String(r.plano_conta).startsWith("4.")).reduce((s, r) => s + Number(r.valor), 0);
    const res = reserva({ recorrentes: ativas });
    const linha = (r) => {
      const valor = h("button", { class: "btn btn-ghost", type: "button" }, "Alterar valor");
      valor.addEventListener("click", async () => {
        const v = prompt(`Novo valor de "${r.descricao}" (vale para os meses ainda não pagos):`, String(r.valor).replace(".", ","));
        if (!v) return;
        try { await api.caixaSalvarRecorrente(r.id, { valor: Number(v.replace(/\./g, "").replace(",", ".")) }); await desenhar("Valor alterado nas contas futuras."); } catch (e) { saida.append(errorNotice(e.message)); }
      });
      const liga = h("button", { class: "btn btn-ghost", type: "button" }, r.ativa ? "Desativar" : "Reativar");
      liga.addEventListener("click", async () => {
        if (r.ativa && !confirm(`Desativar "${r.descricao}"? As contas futuras em aberto serão canceladas.`)) return;
        try { await api.caixaSalvarRecorrente(r.id, { ativa: !r.ativa }); await desenhar(r.ativa ? "Desativada." : "Reativada."); } catch (e) { saida.append(errorNotice(e.message)); }
      });
      return [h("strong", null, r.descricao), r.fornecedor, `${r.plano_conta} ${nomePlano.get(r.plano_conta) ?? ""}`, brl(r.valor), `dia ${r.dia_vencimento}`, r.parcelas ? `${r.parcelas} parcela(s) desde ${formatDate(r.inicio)}` : "todo mês",
        r.proxima ? formatDate(r.proxima.vencimento) : "—", r.ativa ? "" : stamp("Inativa", "neutral"), h("div", { class: "row" }, valor, liga)];
    };
    const d = h("input", { class: "input", id: "rc-desc" }), f = h("input", { class: "input", id: "rc-forn" }), v = h("input", { class: "input num", id: "rc-valor", inputmode: "decimal" });
    const dia = h("input", { class: "input num", id: "rc-dia", type: "number", min: 1, max: 28, value: 10 }), parc = h("input", { class: "input num", id: "rc-parc", type: "number", min: 1, max: 360, placeholder: "vazio = todo mês" });
    const cat = seletorCategoria(plano, "4.9", "saida");
    cat.id = "rc-cat";
    const form = h("form", { class: "stack-s", novalidate: true }, h("div", { class: "form-grid" }, field(d.id, "Descrição *", d), field(f.id, "Fornecedor / credor", f), field(cat.id, "Categoria *", cat), field(v.id, "Valor (R$) *", v), field(dia.id, "Dia do vencimento (1–28) *", dia), field(parc.id, "Parcelas restantes", parc, "Para dívida/parcelamento")), h("div", { class: "row" }, h("button", { class: "btn btn-primary", type: "submit" }, "Cadastrar")));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await api.caixaSalvarRecorrente(null, { descricao: d.value, fornecedor: f.value, plano_conta: cat.value, valor: Number(v.value.replace(/\./g, "").replace(",", ".")), dia_vencimento: Number(dia.value), parcelas: parc.value || null }); await desenhar("Cadastrada: as contas dos próximos meses já estão em Contas a pagar."); } catch (err) { form.append(errorNotice(err.message)); }
    });
    const importar = h("button", { class: "btn btn-ghost", type: "button" }, "Trazer do Formulário do CFO");
    importar.addEventListener("click", async () => { try { const r = await api.caixaImportarRecorrentes(); await desenhar(`${r.criadas} recorrente(s) criada(s). ${r.observacao}`); } catch (e) { saida.append(errorNotice(e.message)); } });
    clear(conteudo).append(...[
      msg ? ok(msg) : null,
      h("div", { class: "cfo-stats" }, stat("Despesas fixas por mês", brl(fixos), "contas recorrentes do grupo 4"), stat("Reserva da Política (3 meses)", brl(res.meta), "Política V1 sec.12: meta de pelo menos 3 meses de custos fixos médios"), stat("Recorrentes ativas", String(ativas.length), "geram as contas a pagar dos próximos 3 meses")),
      panel({ title: "Contas fixas, dívidas e retirada", subtitle: "Cada recorrente vira conta a pagar todo mês (até ~100 dias à frente, renovado todo dia). Assim o fluxo de caixa já nasce com os custos fixos.", actions: importar },
        saida, recorrentes.length ? table({ caption: "Recorrentes", head: ["Descrição", "Fornecedor", "Categoria", "Valor", "Vencimento", "Duração", "Próxima", "", ""], align: ["", "", "", "r", "", "", "", "", ""], rows: recorrentes.map(linha) }) : h("p", { class: "result-empty" }, "Nenhuma recorrente. Use 'Trazer do Formulário do CFO' ou cadastre abaixo.")),
      panel({ title: "Nova recorrente" }, form, method("Regras", "Alterar valor ou dia muda só as contas futuras ainda em aberto; as pagas ficam como foram.", "Desativar cancela as contas futuras em aberto; o histórico fica guardado.", "Dívida com parcelas para depois da última.")),
    ].filter(Boolean));
  }
  await desenhar();
}

// ================================================================ fluxo de 13 semanas
export async function telaFluxo13(root) {
  const d = await api.caixaSemanas(13);
  const res = reserva({ recorrentes: d.recorrentes, fixosFormulario: d.impostos?.fixos_formulario ?? null, retirada: d.impostos?.retirada_formulario ?? null });
  const imp = h("input", { type: "checkbox", id: "fx-imp", checked: true });
  const corpo = h("div", { class: "stack" });
  function desenhar() {
    const f = projetar({ hoje: d.hoje, semanas: d.semanas, saldos: d.saldos, parcelas: d.parcelas, contas: d.contas, impostos: d.impostos, incluirImpostos: imp.checked, entradasRealizadasMes: d.entradas_realizadas_mes, reservaMeta: res.meta });
    const max = Math.max(1, ...f.semanas.map((s) => Math.abs(s.saldo_final ?? 0)));
    clear(corpo).append(
      h("div", { class: "cfo-stats" },
        stat("Saldo hoje", brl(f.saldoHoje), f.saldoHoje === null ? "LACUNA: importe o extrato" : f.semSaldo.length ? `parcial: falta ${f.semSaldo.join(", ")}` : "extrato das contas ativas"),
        stat("Menor saldo nas 13 semanas", f.menorSaldo ? brl(f.menorSaldo.valor) : "—", f.menorSaldo ? `semana ${f.menorSaldo.semana} (${formatDate(f.menorSaldo.inicio)})` : ""),
        stat("Reserva da Política", brl(res.meta), res.fixosMes ? `3 × ${brl(res.fixosMes)} de fixos (${res.origem})` : "LACUNA: cadastre as contas fixas"),
        stat("Necessidade de caixa", f.necessidade.d90 === null ? "—" : brl(f.necessidade.d90), "para não ficar negativo em 90 dias"),
        stat("A receber atrasado", brl(f.atrasadas.receber), "fora da projeção: cobrar")),
      f.alertas.length ? h("ul", { class: "stack-s cfo-pontos" }, f.alertas.map((a) => h("li", null, a))) : h("p", { class: "notice notice-ok" }, "Sem alerta nas 13 semanas."),
      table({ caption: "Semana a semana", head: ["Semana", "Período", "Entradas", "Saídas", "Impostos", "Saldo no fim", ""], align: ["", "", "r", "r", "r", "r", ""],
        rows: f.semanas.map((s) => [String(s.n), `${formatDate(s.inicio)} a ${formatDate(s.fim)}`, brl(s.entradas), brl(s.saidas), brl(s.impostos), h("strong", { class: s.saldo_final !== null && s.saldo_final < 0 ? "neg" : "" }, brl(s.saldo_final)),
          s.saldo_final === null ? "" : h("span", { class: "barra-saldo", style: `display:inline-block;height:.6rem;width:${Math.round((Math.abs(s.saldo_final) / max) * 120)}px;background:${s.saldo_final < 0 ? "var(--risk, #c0392b)" : res.meta && s.saldo_final < res.meta ? "var(--warn, #d4a017)" : "var(--ok, #2e8b57)"}` })]) }),
      method("Do que é feita a projeção", ...f.semanas.filter((s) => s.itens.length).slice(0, 6).map((s) => `Semana ${s.n}: ${s.itens.map((i) => `${i.descricao} ${brl(i.valor)}`).join(" · ")}`),
        `Imposto: ${f.impostos.aliquota !== null ? `${String(f.impostos.aliquota).replace(".", ",")}% sobre as entradas (${f.impostos.origem})` : "LACUNA (sem alíquota)"}. Vence no dia 20 do mês seguinte; se o DAS já estiver lançado em Contas a pagar, não é somado de novo.`,
        "Contas atrasadas entram na semana 1. Parcelas de clientes atrasadas não entram como certas (cobrar)."));
  }
  imp.addEventListener("change", desenhar);
  root.append(panel({ title: "Fluxo de caixa de 13 semanas", subtitle: "Saldo real do extrato + parcelas a receber − contas a pagar (inclusive as recorrentes) − imposto estimado. Rotina proposta: toda segunda-feira (PL-002).", actions: h("label", { class: "row" }, imp, "Incluir imposto estimado") }, corpo));
  desenhar();
}

// ================================================================ fechamento do mes (DRE)
export async function telaFechamento(root) {
  const mes = h("input", { class: "input", id: "fe-mes", type: "month", value: mesAtual() });
  const corpo = h("div", { class: "stack" });
  async function desenhar() {
    clear(corpo).append(h("p", { class: "field-hint" }, "Calculando…"));
    const d = await api.caixaFechamento(mes.value);
    const soma = (lista) => (lista ?? []).filter((s) => s.saldo !== null).reduce((t, s) => t + Number(s.saldo), 0);
    const temSaldo = (lista) => (lista ?? []).some((s) => s.saldo !== null);
    const r = dre({ movimentos: d.movimentos, plano: d.plano, impostos: d.impostos, saldoInicio: temSaldo(d.saldo_inicio) ? soma(d.saldo_inicio) : null, saldoFim: temSaldo(d.saldo_fim) ? soma(d.saldo_fim) : null });
    const faturado = (d.notas ?? []).reduce((s, n) => s + Number(n.valor), 0);
    const fixasComp = (d.contas_competencia ?? []).reduce((s, k) => s + Number(k.valor), 0);
    clear(corpo).append(
      h("div", { class: "cfo-stats" },
        stat("Receita recebida", brl(r.indicadores.receita), `faturado (NF) no mês: ${brl(faturado)}`),
        stat("Margem de contribuição", pct(r.indicadores.margemContribuicaoPct), "Política: alvo 35%, mínimo 30% por projeto"),
        stat("Margem operacional", pct(r.indicadores.margemOperacionalPct), "meta inicial 12% a 15% (sec.13)"),
        stat("Resultado de caixa", brl(r.indicadores.resultadoCaixa), r.conferencia.bate === false ? "não bate com a variação do saldo" : r.completo ? "completo" : "INCOMPLETO")),
      r.avisos.length ? h("ul", { class: "stack-s cfo-pontos" }, r.avisos.map((a) => h("li", null, a))) : h("p", { class: "notice notice-ok" }, "Mês completo: tudo classificado e o saldo confere."),
      table({ caption: `DRE gerencial pelo caixa · ${mes.value}`, head: ["", "Valor", "% da receita líquida"], align: ["", "r", "r"],
        rows: r.linhas.map((l) => [l.destaque ? h("strong", null, l.nome) : h("span", { style: `padding-left:${l.nivel}rem` }, l.nome), l.destaque ? h("strong", null, brl(l.valor)) : brl(l.valor), l.pct === undefined ? "" : pct(l.pct)]) }),
      method(`Por categoria (${r.categorias.length})`, ...r.categorias.map((c) => `${c.codigo} ${c.nome}: ${brl(c.valor)} (${c.quantidade} lançamento(s))`)),
      method("Competência e imposto",
        `Imposto sobre a receita deste mês (vence dia 20 do próximo): ${brl(r.imposto.estimadoSobreReceita)} · ${r.imposto.aliquota !== null ? `${String(r.imposto.aliquota).replace(".", ",")}%` : "sem alíquota"} (${r.imposto.origem ?? "LACUNA"}).`,
        `Despesas recorrentes com competência no mês (pagas ou não): ${brl(fixasComp)}.`,
        `Notas fiscais emitidas no mês: ${(d.notas ?? []).length} · ${brl(faturado)}.`,
        `Conferência: soma dos lançamentos ${brl(r.conferencia.somaLancamentos)} × variação do saldo ${brl(r.conferencia.variacaoSaldo)}.`));
  }
  mes.addEventListener("change", () => desenhar().catch((e) => corpo.replaceChildren(errorNotice(e.message))));
  root.append(panel({ title: "Fechamento do mês", subtitle: "DRE gerencial pelo extrato classificado (Política V1 sec.4: receita líquida, margem de contribuição; sec.13: margem operacional). Rotina proposta: fechar até o dia 10 (PL-048).", actions: field(mes.id, "Mês", mes) }, corpo));
  await desenhar();
}

// ================================================================ indicadores da Politica
export async function telaIndicadores(root) {
  const [d, s, form, orc] = await Promise.all([api.caixaIndicadores(), api.caixaSemanas(13).catch(() => null), api.cfoFormulario().catch(() => null), api.cfoOrcamentos().catch(() => null)]);
  const fluxo = s ? projetar({ hoje: s.hoje, saldos: s.saldos, parcelas: s.parcelas, contas: s.contas, impostos: s.impostos, entradasRealizadasMes: s.entradas_realizadas_mes }) : null;
  let diagnostico = null;
  if (form && orc) {
    const p = parametros(form.respostas);
    const { params } = diagnosticoParams(p, impostosSimulados(orc.rbt12));
    const umAno = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
    diagnostico = resumir(orc.orcamentos.filter((o) => o.data >= umAno), params);
  }
  const r = indicadores(d, { fluxo, diagnostico });
  const valor = (i) => (i.valor === null ? "—" : i.unidade === "R$" ? brl(i.valor) : i.unidade === "%" ? pct(i.valor) : `${String(i.valor).replace(".", ",")} ${i.unidade}`);
  root.append(
    panel({ title: "Indicadores da Política de Saúde Financeira", subtitle: "Os indicadores que a Política V1 (sec.13) manda acompanhar, com a fórmula, a meta quando a Política define e a fonte. Sem dado = LACUNA, nunca zero." },
      h("div", { class: "cfo-stats" }, r.indicadores.map((i) => h("div", { class: "panel panel-tight stat" },
        h("span", { class: "stat-label" }, i.nome), h("span", { class: "stat-figure" }, valor(i)),
        h("span", { class: "row" }, stamp(SIT[i.situacao], TOM[i.situacao]), i.meta ? h("span", { class: "field-hint" }, `Meta: ${i.meta}`) : null),
        h("span", { class: "stat-context" }, i.lacuna ? `LACUNA: ${i.lacuna}` : i.nota ?? ""),
        method("Como é calculado", `Fórmula: ${i.formula}`, `Fonte: ${i.fonte}`, i.detalhe ? `Detalhe: ${Object.entries(i.detalhe).map(([k, v]) => `${k.replace(/_/g, " ")} ${typeof v === "number" && i.unidade === "R$" ? brl(v) : v}`).join(" · ")}` : null))))),
    r.meses.length ? panel({ title: "Mês a mês pelo extrato" }, table({ caption: "DRE resumido", head: ["Mês", "Receita", "Receita líquida", "Margem de contribuição", "Resultado operacional", "Margem operacional", "A classificar"], align: ["", "r", "r", "r", "r", "r", "r"],
      rows: r.meses.map((m) => [m.mes.split("-").reverse().join("/"), brl(m.receita), brl(m.receitaLiquida), `${brl(m.margemContribuicao)} (${pct(m.margemContribuicaoPct)})`, brl(m.resultadoOperacional), pct(m.margemOperacionalPct), brl(m.a_classificar)]) })) : null,
  );
}
