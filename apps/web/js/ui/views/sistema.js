// SISTEMA: saude do VEOS (direcao e tecnologia). Os alertas vem da mesma regra do banco que a
// vigia SIS_* usa a cada 10 min (alertas no setor Tecnologia e no Radar).
import { api } from "../../data/api.js";
import { formatDateTime } from "../../domain/format.js";
import { formatBytes, haQuanto, ultimaSincronizacao, usoLimite } from "../../domain/sistema.js";
import { nomeArquivo, paraCSV } from "../../domain/exportar.js";
import { clear, errorNotice, h, method, panel, stamp, stat, table } from "../dom.js";
import { SEV_ROTULO, SEV_TOM } from "../componentes.js";

const ESTADO_SYNC = { ok: ["Em dia", "ok"], pendente: ["Pendente", "neutral"], listando: ["Lendo lista", "live"], detalhando: ["Lendo detalhes", "live"], erro: ["Erro", "risk"] };
const STATUS_CRON = { succeeded: ["Ok", "ok"], failed: ["Falhou", "risk"], running: ["Rodando", "live"], starting: ["Iniciando", "live"] };

export async function telaSaude(root) {
  const conteudo = h("div", { class: "stack" });
  const atualizar = h("button", { class: "btn btn-ghost", type: "button" }, "Atualizar");
  root.append(conteudo);

  async function desenhar() {
    atualizar.disabled = true;
    let s;
    try {
      s = await api.sistemaSaude();
    } catch (e) {
      clear(conteudo).append(errorNotice(`Não foi possível ler a saúde do sistema: ${e.message}`));
      return;
    } finally {
      atualizar.disabled = false;
    }
    const agora = Date.parse(s.agora) || Date.now();
    const banco = usoLimite(s.banco_bytes, s.limites.banco_bytes);
    const armBytes = s.armazenamento.reduce((t, b) => t + Number(b.bytes), 0);
    const arm = usoLimite(armBytes, s.limites.armazenamento_bytes);
    const ultSync = ultimaSincronizacao(s.zoho_modulos);
    const z = s.zoho_24h ?? {};

    clear(conteudo).append(
      panel({ title: "Situação agora", subtitle: `Lido ${formatDateTime(s.agora)}. A vigia confere a cada 10 minutos e avisa no Radar (setor Tecnologia).`, actions: atualizar },
        s.alertas.length
          ? h("ul", { class: "list-plain stack-s" }, s.alertas.map((a) => h("li", { class: `alerta alerta-${a.severidade.toLowerCase()}` },
            h("div", { class: "alerta-topo" }, stamp(SEV_ROTULO[a.severidade] ?? a.severidade, SEV_TOM[a.severidade])),
            h("p", { class: "alerta-titulo" }, a.titulo), h("p", { class: "alerta-texto" }, a.mensagem))))
          : h("p", { class: "notice notice-ok" }, "Tudo funcionando: nenhum alerta de banco, arquivos, sincronização, agendamentos ou varredura.")),
      h("div", { class: "grid-4" },
        stat("Banco de dados", `${formatBytes(s.banco_bytes)}`, h("span", null, stamp(`${banco.pct}% de ${formatBytes(s.limites.banco_bytes)}`, banco.tom))),
        stat("Arquivos (anexos)", formatBytes(armBytes), h("span", null, stamp(`${arm.pct}% de ${formatBytes(s.limites.armazenamento_bytes)}`, arm.tom))),
        stat("Zoho", s.zoho_conectado ? haQuanto(ultSync, agora) : "desconectado", s.zoho_conectado ? `última sincronização · ${z.chamadas ?? 0} chamadas em 24 h` : "conecte em Integrações"),
        stat("Usuários", String(s.usuarios.membros_ativos), `membros ativos · ${s.usuarios.contas} contas de login`)),
      panel({ title: "Sincronização do Zoho", subtitle: `Últimas 24 h: ${z.rodadas ?? 0} rodadas, ${z.chamadas ?? 0} chamadas à API, ${z.gravados ?? 0} registros gravados, ${z.rodadas_com_erro ?? 0} rodadas com erro.` },
        table({
          caption: "Estado por módulo",
          head: ["Produto", "Módulo", "Estado", "Registros", "Última execução", "Erro"],
          rows: s.zoho_modulos.map((m) => {
            const [rot, tom] = ESTADO_SYNC[m.estado] ?? [m.estado, "neutral"];
            return [m.produto, m.modulo, stamp(rot, tom), m.total === null || m.total === undefined ? "—" : String(m.total), m.ultima_execucao_em ? haQuanto(m.ultima_execucao_em, agora) : "nunca", m.erro || "—"];
          }),
        }),
        s.zoho_erros.length
          ? h("details", { class: "method" }, h("summary", null, `Últimos erros registrados (${s.zoho_erros.length})`),
            h("ul", { class: "list-plain stack-s" }, s.zoho_erros.map((e) => h("li", null, h("strong", null, formatDateTime(e.em)), ` · ${(e.erros || []).join(" · ")}`))))
          : null),
      panel({ title: "Agendamentos", subtitle: "Tarefas automáticas do banco (pg_cron)." },
        table({
          caption: "Agendamentos",
          head: ["Nome", "Quando", "Situação", "Última execução", "Falhas 24 h"],
          rows: s.agendamentos.map((j) => {
            const [rot, tom] = j.ultima ? STATUS_CRON[j.ultima.status] ?? [j.ultima.status, "neutral"] : ["Ainda não rodou", "neutral"];
            return [j.nome, j.quando, j.ativo ? stamp(rot, tom) : stamp("Desligado", "risk"), j.ultima ? haQuanto(j.ultima.inicio, agora) : "—", String(j.falhas_24h)];
          }),
        }),
        h("p", { class: "field-hint" }, `Chamadas HTTP do agendador nas últimas 6 h: ${s.http_6h.total}, com ${s.http_6h.falhas} falha(s).`)),
      panel({ title: "Maiores tabelas", subtitle: "Onde o espaço do banco está sendo usado." },
        table({ caption: "Tabelas", head: ["Tabela", "Tamanho", "Linhas (aprox.)"], align: ["", "r", "r"], rows: s.tabelas.map((t) => [t.tabela, formatBytes(t.bytes), String(t.linhas)]) })),
      panel({ title: "Varreduras das regras vivas" },
        s.varreduras.length
          ? table({ caption: "Últimas varreduras", head: ["Quando", "Origem", "Novos", "Resolvidos", "Ativos"], rows: s.varreduras.map((v) => [formatDateTime(v.em), v.origem, String(v.novos), String(v.resolvidos), String(v.ativos)]) })
          : h("p", { class: "result-empty" }, "Nenhuma varredura registrada."),
        method("Limites e fontes", "Limites do plano gratuito do Supabase: banco 500 MB e arquivos 1 GB (supabase.com/pricing, conferido em 01/10/2026).",
          "Alertas: banco ou arquivos acima de 80%; sincronização do Zoho sem rodar há mais de 15 minutos; módulo do Zoho com erro; agendamento com falha ou desligado; 3 ou mais chamadas do agendador falhando em 6 h; nenhuma varredura em 26 h.",
          "Limite diário de chamadas da API do Zoho: depende do plano contratado no Zoho (não informado ao VEOS); o painel mostra o uso medido.")),
    );
  }
  atualizar.addEventListener("click", desenhar);
  await desenhar();
}

// ---------------------------------------------------------------- exportar (direcao)
const DESCRICAO = {
  pedidos: "Número, cliente, estado, valores, condição e datas de cada pedido.",
  pedido_itens: "Itens de cada pedido com quantidade, preço e custo.",
  parcelas: "Vencimento, valor, estado e recebimento de cada parcela.",
  notas_fiscais: "Notas registradas (NF-e e NFS-e) por pedido.",
  estoque: "Saldo físico, reservado e disponível por item, com custo médio.",
  estoque_movimentos: "Entradas, saídas, reservas, liberações e ajustes (trilha completa).",
  biblioteca: "Decisões, políticas, propostas, incidentes, aprendizados e referências (todas as versões).",
};

export async function telaExportar(root, baixar = baixarArquivo) {
  const { conjuntos } = await api.sistemaExportar();
  const saida = h("div", { role: "status" });
  const itens = conjuntos.map((c) => {
    const b = h("button", { class: "btn btn-ghost", type: "button" }, "Baixar CSV");
    b.addEventListener("click", async () => {
      b.disabled = true;
      clear(saida);
      try {
        const d = await api.sistemaExportar(c.id);
        baixar(nomeArquivo(c.id), paraCSV(d.colunas, d.linhas));
        saida.append(h("p", { class: `notice ${d.truncado ? "notice-warn" : "notice-ok"}` }, `${c.nome}: ${d.linhas.length} linha(s) exportada(s)${d.truncado ? " (limite de 10.000: as mais recentes)" : ""}.`));
      } catch (e) {
        saida.append(errorNotice(`${c.nome}: ${e.message}`));
      } finally {
        b.disabled = false;
      }
    });
    return h("li", { class: "panel panel-tight row" }, h("div", { class: "stack-s exportar-texto" }, h("strong", null, c.nome), h("span", { class: "field-hint" }, DESCRICAO[c.id] ?? "")), b);
  });
  root.append(
    panel({ title: "Exportar dados", subtitle: "Planilhas para abrir no Excel (separador ponto e vírgula, acentos preservados)." },
      saida, h("ul", { class: "list-plain stack-s" }, itens),
      method("Sobre os arquivos", "O arquivo é gerado no seu navegador e baixado direto no seu computador; nada é enviado a terceiros.",
        "Contém dados reais da empresa: guarde em local seguro e não compartilhe fora da equipe.",
        "Cópia de segurança completa do banco: semanal, criptografada, pelo GitHub Actions (ver Saúde do sistema).")),
  );
}

function baixarArquivo(nome, conteudo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const a = h("a", { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
