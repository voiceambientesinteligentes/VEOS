// VEOS online: login, moldura e telas. Reutiliza estilos e componentes do portal
// local (copiados no build) e fala somente com a Edge Function "api" do Supabase.
import { api, ApiError } from "./data/api.js";
import { capturarRetornoDoLink, enviarLink, sair, token } from "./auth.js";
import { formatBRL, formatDateTime } from "./domain/format.js";
import { clear, errorNotice, field, h, panel, stamp, table, testTag } from "./ui/dom.js";
import { enableMotion } from "./ui/motion.js";
import { markActive, setupDrawer } from "./ui/shell.js";
import { renderVigia } from "./ui/views/cfo_vigia.js";

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
let atual = null;

const link = (href, sigla, texto) =>
  h("a", { class: "nav-link", href }, h("span", { class: "nav-sigla", "aria-hidden": "true" }, sigla), h("span", { class: "nav-text" }, texto));

// ---------------------------------------------------------------- telas
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
  "#/visao": { fn: telaVisao, titulo: ["Visão geral", "VEOS online · VOICE Ambientes Inteligentes"] },
  "#/cfo": { fn: telaAvisos, titulo: ["Sala CFO — Avisos", "Vigia: orçamento salvo → avisos do CFO com regra e fonte"] },
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
    h("div", { class: "nav-group" }, link("#/visao", "◎", "Visão geral")),
    h("div", { class: "nav-group", role: "group", "aria-labelledby": "nav-cfo" },
      h("span", { class: "nav-label", id: "nav-cfo" }, "Finanças"),
      link("#/cfo", "CFO", "Avisos do CFO"),
      link("#/historico", "HIST", "Histórico de orçamentos")),
  );
  clear(el.status).append(h("span", { class: "pill tone-ok" }, h("span", { class: "dot" }), eu.email), botaoSair);
}

async function navegar() {
  if (!eu) return;
  const rota = TELAS[location.hash] ? location.hash : "#/visao";
  const def = TELAS[rota];
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
    await sair();
    return telaLogin(e.status === 403 ? "Este e-mail não tem acesso ao VEOS. Fale com a direção." : e.message);
  }
  montarMenu();
  if (!TELAS[location.hash]) history.replaceState(null, "", "#/visao");
  navegar();
}

window.addEventListener("hashchange", navegar);
iniciar();
