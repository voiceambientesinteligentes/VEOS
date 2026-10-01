// VEOS online: login, moldura e telas. Reutiliza estilos e componentes do portal
// local (copiados no build) e fala somente com a Edge Function "api" do Supabase.
import { api, ApiError } from "./data/api.js";
import { capturarRetornoDoLink, enviarLink, sair, token } from "./auth.js";
import { formatBRL, formatDateTime } from "./domain/format.js";
import { clear, errorNotice, field, h, panel, stamp, table, testTag } from "./ui/dom.js";
import { enableMotion } from "./ui/motion.js";
import { markActive, setupDrawer } from "./ui/shell.js";
import { renderVigia } from "./ui/views/cfo_vigia.js";
import { renderOrbita } from "./ui/views/orbita.js";
import { renderIA } from "./ui/views/ia.js";
import { telaProjeto, telaProjetos } from "./ui/views/projetos.js";
import { telaSetor } from "./ui/views/setor.js";
import { telaRadar } from "./ui/views/radar.js";
import { telaConselho } from "./ui/views/conselho.js";
import { telaCalculadora, telaNegociacao } from "./ui/views/precificacao.js";
import { telaIntegracoes } from "./ui/views/integracoes.js";
import { PRODUTOS, telaZoho } from "./ui/views/zoho.js";
import { telaContrato, telaEstoque, telaItemEstoque, telaPedido, telaPedidos, telaRecebimentos } from "./ui/views/fluxo.js";
import { telaBiblioteca, telaRegistroBiblioteca } from "./ui/views/biblioteca.js";
import { telaValidacao } from "./ui/views/validacao.js";
import { telaPainel } from "./ui/views/painel.js";
import { telaTermoAceite } from "./ui/views/obra.js";
import { telaCompra, telaCompras, telaContasPagar, telaNovaCompra } from "./ui/views/compras.js";
import { telaExportar, telaSaude } from "./ui/views/sistema.js";
import { formCodigoMfa, telaConta, telaUsuarios } from "./ui/views/usuarios.js";
import { CATALOGO } from "./data/catalogo.js";

const el = {
  view: document.getElementById("view"),
  nav: document.getElementById("nav"),
  status: document.getElementById("sidebar-status"),
  main: document.getElementById("conteudo"),
  title: document.getElementById("view-title"),
  sub: document.getElementById("view-sub"),
};
const SITUACAO = { OK: ["OK", "ok"], REVISAR: ["Revisar", "warn"], BLOQUEAR_ENVIO: ["Não enviar", "risk"] };
let eu = null;
// Fontes automaticas da Negociacao ao Vivo (Zoho); a tela funciona sem elas.
const fontesZoho = { rbt12: api.zohoRbt12, orcamentos: api.zohoOrcamentos, orcamento: api.zohoOrcamento, salvarProposta: api.criarRegistro, criarPedido: api.fluxoCriarPedido, consultarPrecedentes: api.bibConsultar };
const rotaBase = () => location.hash.split("?")[0];
let atual = null;

const link = (href, sigla, texto) =>
  h("a", { class: "nav-link", href }, h("span", { class: "nav-sigla", "aria-hidden": "true" }, sigla), h("span", { class: "nav-text" }, texto));

// ---------------------------------------------------------------- telas
async function telaOrbita(root, signal) {
  const [{ setores, diretores }, radar] = await Promise.all([api.setores(), api.radar()]);
  const atividade = Object.fromEntries(setores.map((s) => [s.id, {
    alertas: radar.alertas.filter((a) => a.setor_id === s.id).length,
    tarefas: radar.tarefas.filter((t) => t.setor_id === s.id).length,
    acessivel: radar.setores.includes(s.id),
  }]));
  renderOrbita(root, { setores, diretores, atividade, signal });
}

async function telaVisao(root) {
  const { setores, diretores } = await api.setores();
  const porSetor = Object.fromEntries(diretores.map((d) => [d.setor_id, d]));
  root.append(
    panel(
      { title: `Olá, ${eu.nome}`, subtitle: `Acesso: ${eu.papel} · ${eu.email}. Ambiente online em construção: somente dados TESTE.`, actions: testTag() },
      h("p", null, "Disponível online agora: avisos do CFO sobre orçamentos (sistema vivo) e o histórico gravado. As conversas com os diretores dependem de IA no servidor (decisão de orçamento pendente)."),
    ),
    panel(
      { title: "Setores e diretores", subtitle: "Cadastro no banco do VEOS. A personalidade de cada diretor será definida com a direção." },
      table({
        caption: "Setores ativos",
        head: ["Sigla", "Setor", "Diretor", "Função"],
        rows: setores.map((s) => [s.sigla, s.nome, porSetor[s.id]?.nome ?? "—", s.descricao]),
      }),
    ),
  );
}

function telaAvisos(root, signal) {
  renderVigia(root, {
    signal,
    subtitulo: "Sistema vivo: ao salvar, o CFO confere soma, custos, margem, alçada e ticket pela Política V1, e o orçamento TESTE fica registrado com os avisos. Nada é aprovado.",
  });
}

async function telaHistorico(root) {
  const { orcamentos } = await api.orcamentos();
  const linhas = orcamentos.map((o) => {
    const sit = o.avisos[0]?.situacao;
    const [rotulo, tom] = SITUACAO[sit] || ["—", "neutral"];
    const pior = ["CRITICO", "ALTO", "MEDIO", "INFO"].find((s) => o.avisos.some((a) => a.severidade === s));
    return [formatDateTime(o.criado_em), o.codigo, formatBRL(String(o.valor_total_informado)), stamp(rotulo, tom), `${o.avisos.length}${pior ? ` (pior: ${pior})` : ""}`];
  });
  root.append(
    panel(
      { title: "Orçamentos registrados", subtitle: "Últimos 20. O histórico de avisos não pode ser alterado nem apagado.", actions: testTag() },
      linhas.length
        ? table({ caption: "Orçamentos TESTE", head: ["Quando", "Código", "Total informado", "Situação", "Avisos"], rows: linhas })
        : h("p", { class: "result-empty" }, "Nenhum orçamento salvo ainda. Use a tela Avisos do CFO."),
    ),
  );
}

const TELAS = {
  "#/radar": { fn: telaRadar, titulo: ["Radar", "Alertas e tarefas de todos os setores"] },
  "#/conselho": { fn: telaConselho, titulo: ["Conselho consultivo", "Os diretores especialistas da VOICE"] },
  "#/ia": { fn: (root, signal) => renderIA(root, signal), titulo: ["IA VEOS", "Comando por voz"] },
  "#/orbita": { fn: telaOrbita, titulo: ["Órbita", "Os setores em órbita do VEOS"] },
  "#/visao": { fn: (root) => (["direcao", "financas"].includes(eu.papel) ? telaPainel(root) : telaVisao(root)), titulo: ["Visão geral", "Painel executivo: vendas, faturamento, caixa, funil e alertas"] },
  "#/cfo": { fn: telaAvisos, titulo: ["Avisos de orçamento", "Vigia: orçamento salvo → avisos do CFO com regra e fonte"] },
  "#/projetos": { fn: telaProjetos, titulo: ["Projetos e caixa", "Setor Financeiro · exposição e cobertura por fase"] },
  "#/pedidos": { fn: telaPedidos, titulo: ["Pedidos", "Orçamento aceito → estoque → parcelas → nota fiscal → recebimento"] },
  "#/estoque": { fn: (root) => telaEstoque(root), titulo: ["Estoque", "Saldo físico, reservas dos pedidos e custo médio"] },
  "#/compras": { fn: telaCompras, titulo: ["Compras", "Faltas de estoque, compras registradas e recebimento de mercadoria"] },
  "#/compras/nova": { fn: telaNovaCompra, titulo: ["Nova compra", "Itens, fornecedor e parcelas a pagar"] },
  "#/contas-pagar": { fn: telaContasPagar, titulo: ["Contas a pagar", "Parcelas de compras e contas avulsas"] },
  "#/recebimentos": { fn: telaRecebimentos, titulo: ["Recebimentos e faturamento", "Previsão de caixa, parcelas e notas fiscais"] },
  "#/integracoes": { fn: (root) => telaIntegracoes(root, eu), titulo: ["Integrações", "Zoho Books, CRM e Projects · somente leitura"] },
  "#/negociacao": { fn: (root) => telaNegociacao(root, fontesZoho), titulo: ["Negociação ao Vivo", "Desconto, custos e Simples → margem e alçada pela Política V1"] },
  "#/calculadora": { fn: (root) => telaCalculadora(root, fontesZoho), titulo: ["Calculadora de Preços", "Preço mínimo para a margem alvo, já com Simples e provisão de 2%"] },
  "#/sistema/usuarios": { fn: (root) => telaUsuarios(root), titulo: ["Usuários e acessos", "Quem entra no VEOS, em qual setor, com MFA e histórico"] },
  "#/conta": { fn: (root) => telaConta(root, eu), titulo: ["Minha conta", "Seu acesso e a verificação em duas etapas"] },
  "#/sistema/exportar": { fn: (root) => telaExportar(root), titulo: ["Exportar dados", "Pedidos, parcelas, estoque e Biblioteca em planilha"] },
  "#/sistema/saude": { fn: (root) => telaSaude(root), titulo: ["Saúde do sistema", "Banco, arquivos, sincronização do Zoho, agendamentos e alertas"] },
  "#/sistema/validacao": { fn: (root) => telaValidacao(root), titulo: ["Validação guiada", "Roteiro de teste com login real · o resultado vai para a Biblioteca"] },
  "#/historico": { fn: telaHistorico, titulo: ["Histórico", "Orçamentos TESTE gravados e seus avisos"] },
};

// ---------------------------------------------------------------- login
function telaLogin(mensagem) {
  el.title.textContent = "Entrar";
  el.sub.textContent = "Acesso restrito à equipe VOICE";
  clear(el.nav);
  el.status.textContent = "";
  const email = h("input", { class: "input", id: "login-email", type: "email", autocomplete: "email", required: true });
  const out = h("div", { role: "status" }, mensagem ? errorNotice(mensagem) : null);
  const botao = h("button", { class: "btn btn-primary", type: "submit" }, "Enviar link de acesso");
  const form = h("form", { class: "stack-s" }, field("login-email", "Seu e-mail", email, "Você recebe um link para entrar. Só e-mails cadastrados pela direção têm acesso."), h("div", { class: "row" }, botao), out);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    botao.disabled = true;
    clear(out).append(h("p", { class: "muted" }, "Enviando…"));
    try {
      await enviarLink(email.value.trim());
      clear(out).append(h("p", null, "Pronto. Abra o e-mail e clique no link para entrar (confira também o spam)."));
    } catch (err) {
      clear(out).append(errorNotice(`Não foi possível enviar: ${err.message}`));
    } finally {
      botao.disabled = false;
    }
  });
  clear(el.view).append(panel({ title: "VEOS", subtitle: "Portal executivo da VOICE Ambientes Inteligentes" }, form));
}

// Direcao exige MFA: a sessao do link precisa do codigo do app antes de abrir o VEOS.
function telaMfa() {
  el.title.textContent = "Entrar";
  el.sub.textContent = "Verificação em duas etapas";
  clear(el.nav);
  const sairBtn = h("button", { class: "btn btn-ghost", type: "button" }, "Sair");
  sairBtn.addEventListener("click", async () => { await sair(); telaLogin(); });
  clear(el.status).append(sairBtn);
  const box = h("div", { class: "stack" });
  clear(el.view).append(box);
  formCodigoMfa(box, () => iniciar()).catch((e) => box.append(errorNotice(e.message)));
}

// ---------------------------------------------------------------- moldura
const drawer = setupDrawer({ sidebar: document.getElementById("sidebar"), toggle: document.getElementById("menu-toggle"), backdrop: document.getElementById("backdrop") });

function montarMenu() {
  const botaoSair = h("button", { class: "btn btn-ghost", type: "button" }, "Sair");
  botaoSair.addEventListener("click", async () => {
    await sair();
    eu = null;
    telaLogin();
  });
  clear(el.nav).append(
    h("div", { class: "nav-group", role: "group", "aria-labelledby": "nav-cmd" },
      h("span", { class: "nav-label", id: "nav-cmd" }, "Comando"),
      ["direcao", "financas"].includes(eu.papel) ? link("#/visao", "▦", "Visão geral") : null,
      link("#/orbita", "◉", "Órbita"),
      link("#/radar", "◈", "Radar"),
      link("#/ia", "✦", "IA VEOS"),
      link("#/conselho", "◇", "Conselho"),
      link("#/integracoes", "⇄", "Integrações")),
    h("div", { class: "nav-group", role: "group", "aria-labelledby": "nav-biblioteca" },
      h("span", { class: "nav-label", id: "nav-biblioteca" }, "Biblioteca"),
      link("#/biblioteca/governanca", "GOV", "Governança"),
      link("#/biblioteca/decisoes", "DEC", "Decisões e precedentes"),
      link("#/biblioteca/aprendizados", "APR", "Erros e aprendizados"),
      link("#/biblioteca/referencias", "REF", "Pesquisas e referências"),
      link("#/biblioteca/politicas", "POL", "Políticas vigentes"),
      link("#/biblioteca/revisoes", "REV", "Revisões em andamento"),
      link("#/biblioteca/consultar", "CON", "Consultar precedentes")),
    h("div", { class: "nav-group", role: "group", "aria-labelledby": "nav-operacao" },
      h("span", { class: "nav-label", id: "nav-operacao" }, "Operação"),
      link("#/pedidos", "PED", "Pedidos"),
      link("#/estoque", "EST", "Estoque"),
      link("#/compras", "COM", "Compras"),
      link("#/recebimentos", "REC", "Recebimentos e faturamento"),
      ["direcao", "financas"].includes(eu.papel) ? link("#/contas-pagar", "PAG", "Contas a pagar") : null),
    h("div", { class: "nav-group", role: "group", "aria-labelledby": "nav-zoho" },
      h("span", { class: "nav-label", id: "nav-zoho" }, "Zoho"),
      Object.entries(PRODUTOS).map(([id, p]) => link(`#/zoho/${id}`, id === "books" ? "BKS" : id === "crm" ? "CRM" : "ZPR", `Zoho ${p.nome}`))),
    h("div", { class: "nav-group", role: "group", "aria-labelledby": "nav-setores" },
      h("span", { class: "nav-label", id: "nav-setores" }, "Setores"),
      CATALOGO.map((s) => link(`#/setor/${s.id}`, s.sigla, s.nome))),
    h("div", { class: "nav-group", role: "group", "aria-labelledby": "nav-cfo" },
      h("span", { class: "nav-label", id: "nav-cfo" }, "Ferramentas do CFO"),
      link("#/negociacao", "NEG", "Negociação ao Vivo"),
      link("#/calculadora", "CALC", "Calculadora de Preços"),
      link("#/projetos", "PRJ", "Projetos e caixa"),
      link("#/cfo", "ORÇ", "Avisos de orçamento"),
      link("#/historico", "HIST", "Histórico de orçamentos")),
    h("div", { class: "nav-group", role: "group", "aria-labelledby": "nav-sistema" },
      h("span", { class: "nav-label", id: "nav-sistema" }, "Sistema"),
      ["direcao", "tecnologia"].includes(eu.papel) ? link("#/sistema/saude", "SAU", "Saúde do sistema") : null,
      eu.papel === "direcao" ? link("#/sistema/usuarios", "USR", "Usuários e acessos") : null,
      eu.papel === "direcao" ? link("#/sistema/exportar", "EXP", "Exportar dados") : null,
      link("#/sistema/validacao", "VAL", "Validação guiada"),
      link("#/conta", "EU", "Minha conta")),
  );
  clear(el.status).append(h("a", { class: "pill tone-ok", href: "#/conta", title: "Minha conta" }, h("span", { class: "dot" }), eu.email), botaoSair);
}

async function navegar() {
  if (!eu) return;
  const detalhe = /^#\/projetos\/([0-9a-f-]{36})$/.exec(location.hash);
  const setorRota = /^#\/setor\/([a-z]+)(?:\/([a-z]+))?$/.exec(location.hash);
  const setor = setorRota && CATALOGO.find((s) => s.id === setorRota[1]);
  let rota, def;
  const zohoRota = /^#\/zoho\/(books|crm|projects)(?:\/([A-Za-z0-9_]+)(?:\/([0-9A-Za-z_-]+))?)?$/.exec(rotaBase());
  const pedidoRota = /^#\/pedidos\/([0-9a-f-]{36})$/.exec(rotaBase());
  const estoqueRota = /^#\/estoque\/([0-9A-Za-z_-]{1,40})$/.exec(rotaBase());
  const bibRota = /^#\/biblioteca\/(governanca|decisoes|aprendizados|referencias|politicas|revisoes|consultar)$/.exec(rotaBase());
  const bibReg = /^#\/biblioteca\/r\/([0-9a-f-]{36})$/.exec(rotaBase());
  const contratoRota = /^#\/pedidos\/([0-9a-f-]{36})\/contrato$/.exec(rotaBase());
  const aceiteRota = /^#\/pedidos\/([0-9a-f-]{36})\/aceite$/.exec(rotaBase());
  const compraRota = /^#\/compras\/([0-9a-f-]{36})$/.exec(rotaBase());
  if (aceiteRota) {
    rota = "#/pedidos";
    def = { fn: (root) => telaTermoAceite(root, aceiteRota[1]), titulo: ["Termo de aceite", "Gerado do pedido · imprimir ou salvar em PDF"] };
  } else if (compraRota) {
    rota = "#/compras";
    def = { fn: (root) => telaCompra(root, compraRota[1]), titulo: ["Compra", "Itens, recebimento, parcelas a pagar e histórico"] };
  } else if (contratoRota) {
    rota = "#/pedidos";
    def = { fn: (root) => telaContrato(root, contratoRota[1]), titulo: ["Contrato", "Gerado do pedido · imprimir ou salvar em PDF"] };
  } else if (bibRota) {
    rota = `#/biblioteca/${bibRota[1]}`;
    def = { fn: (root) => telaBiblioteca(root, bibRota[1], eu), titulo: ["Biblioteca", "Memória institucional: decisões, aprendizados, referências, políticas e revisões"] };
  } else if (bibReg) {
    rota = "#/biblioteca/decisoes";
    def = { fn: (root) => telaRegistroBiblioteca(root, bibReg[1], eu), titulo: ["Biblioteca", "Registro, versões, fontes, pareceres e histórico"] };
  } else if (pedidoRota) {
    rota = "#/pedidos";
    def = { fn: (root) => telaPedido(root, pedidoRota[1], eu), titulo: ["Pedido", "Itens, estoque, parcelas, notas fiscais e histórico"] };
  } else if (estoqueRota) {
    rota = "#/estoque";
    def = { fn: (root) => telaItemEstoque(root, estoqueRota[1], eu), titulo: ["Estoque do item", "Saldo e movimentos"] };
  } else if (zohoRota) {
    rota = `#/zoho/${zohoRota[1]}`;
    def = { fn: (root) => telaZoho(root, ["zoho", zohoRota[1], zohoRota[2], zohoRota[3] && decodeURIComponent(zohoRota[3])], eu), titulo: [`Zoho ${PRODUTOS[zohoRota[1]].nome}`, "Cópia completa do Zoho dentro do VEOS · sincronização automática"] };
  } else if (detalhe) {
    rota = "#/projetos";
    def = { fn: (root) => telaProjeto(root, detalhe[1]), titulo: ["Projeto", "Caixa, fases e lançamentos · avisos do CFO"] };
  } else if (setor) {
    rota = `#/setor/${setor.id}`;
    def = { fn: (root, signal) => telaSetor(root, setor.id, signal, setorRota[2]), titulo: [`${setor.sigla} · ${setor.nome}`, setor.diretor.titulo] };
  } else {
    rota = TELAS[rotaBase()] ? rotaBase() : "#/orbita";
    def = TELAS[rota];
  }
  atual?.abort();
  const controle = new AbortController();
  atual = controle;
  [el.title.textContent, el.sub.textContent] = def.titulo;
  document.title = `${def.titulo[0]} · VEOS`;
  markActive(el.nav, rota);
  drawer.close(false);
  const root = h("div", { class: "stack view-enter" });
  clear(el.view).append(root);
  try {
    await def.fn(root, controle.signal);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return iniciar("Sua sessão expirou. Entre novamente.");
    root.append(errorNotice(`Não foi possível abrir esta tela: ${e.message}`));
  }
  if (!controle.signal.aborted) enableMotion(root);
  el.main.focus({ preventScroll: true });
}

async function iniciar(mensagem) {
  const erroLink = capturarRetornoDoLink();
  if (!(await token())) return telaLogin(mensagem || erroLink);
  try {
    eu = await api.me();
  } catch (e) {
    if (e.status === 403 && e.message === "mfa_necessario") return telaMfa();
    await sair();
    return telaLogin(e.status === 403 ? "Este e-mail não tem acesso ao VEOS. Fale com a direção." : e.message);
  }
  montarMenu();
  if (!TELAS[rotaBase()] && !/^#\/(projetos|setor|zoho|pedidos|estoque|biblioteca|compras)\//.test(location.hash)) history.replaceState(null, "", "#/orbita");
  navegar();
}

window.addEventListener("hashchange", navegar);
iniciar();
