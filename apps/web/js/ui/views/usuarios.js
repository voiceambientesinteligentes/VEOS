// USUARIOS E ACESSOS (direcao) e MINHA CONTA (todos): convidar, papel por setor, desativar/
// reativar, exigir MFA e historico; cadastro do app autenticador (MFA TOTP) e codigo no login.
// As regras ficam no banco (membro_gerir) e no Supabase Auth; esta tela so mostra e envia.
import { api } from "../../data/api.js";
import * as auth from "../../auth.js";
import { formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, field, h, method, panel, stamp, table } from "../dom.js";
import { setorPorId } from "../componentes.js";
import { desligarAvisos, ligado, ligarAvisos, suportado } from "../notificar.js";

const SITE = "https://voiceambientesinteligentes.github.io/VEOS/";
const ACOES = { convidado: "Convidado", papel: "Papel alterado", desativado: "Desativado", reativado: "Reativado", mfa_exigido: "MFA exigido", mfa_dispensado: "MFA dispensado" };
export const nomeSetor = (papel) => (setorPorId[papel] ? `${setorPorId[papel].sigla} · ${setorPorId[papel].nome}` : papel);

function seletorPapel(id, papeis, atual) {
  return h("select", { class: "select", id }, papeis.map((p) => h("option", { value: p, selected: p === atual }, nomeSetor(p))));
}

// ---------------------------------------------------------------- usuarios (direcao)
export async function telaUsuarios(root) {
  const conteudo = h("div", { class: "stack" });
  root.append(conteudo);
  let mostrarTeste = false;

  async function desenhar(aviso) {
    const d = await api.sistemaMembros();
    const nome = h("input", { class: "input", id: "conv-nome", autocomplete: "off", required: true });
    const email = h("input", { class: "input", id: "conv-email", type: "email", autocomplete: "off", required: true });
    const papel = seletorPapel("conv-papel", d.papeis, "vendas");
    const saida = h("div", { role: "status" }, aviso ?? null);
    const convidar = h("button", { class: "btn btn-primary", type: "submit" }, "Dar acesso");
    const form = h("form", { class: "stack-s" },
      h("div", { class: "form-grid" }, field(nome.id, "Nome *", nome), field(email.id, "E-mail *", email), field(papel.id, "Setor (papel) *", papel)),
      h("div", { class: "row" }, convidar), saida);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clear(saida);
      convidar.disabled = true;
      try {
        await api.sistemaConvidar({ nome: nome.value, email: email.value, papel: papel.value });
        await desenhar(h("p", { class: "notice notice-ok" }, `Acesso criado para ${email.value.trim()}. Avise a pessoa: abrir ${SITE}, informar este e-mail e clicar no link recebido. O VEOS não envia convite sozinho.`));
      } catch (err) {
        saida.append(errorNotice(err.message));
      } finally {
        convidar.disabled = false;
      }
    });

    const agir = async (m, dados, saidaM) => {
      clear(saidaM);
      try {
        await api.sistemaMembro(m.user_id, dados);
        await desenhar(h("p", { class: "notice notice-ok", role: "status" }, `${m.nome}: alteração registrada.`));
      } catch (err) {
        saidaM.append(errorNotice(err.message));
      }
    };
    const motivo = (pergunta) => {
      const r = prompt(pergunta);
      return r === null ? null : r.trim();
    };

    const visiveis = d.membros.filter((m) => mostrarTeste || !m.teste);
    const cartoes = visiveis.map((m) => {
      const saidaM = h("div", { role: "status" });
      const sel = seletorPapel(`papel-${m.user_id}`, d.papeis, m.papel);
      const salvar = h("button", { class: "btn btn-ghost", type: "button" }, "Mudar setor");
      salvar.addEventListener("click", () => sel.value !== m.papel && agir(m, { acao: "papel", papel: sel.value, motivo: motivo(`Motivo da mudança de ${nomeSetor(m.papel)} para ${nomeSetor(sel.value)} (opcional):`) ?? "" }, saidaM));
      const eu = m.user_id === d.eu;
      const ativo = h("button", { class: "btn btn-ghost", type: "button", disabled: eu }, m.ativo ? "Desativar" : "Reativar");
      ativo.addEventListener("click", () => {
        if (m.ativo) {
          const mot = motivo(`Por que desativar o acesso de ${m.nome}? (obrigatório)`);
          if (mot) agir(m, { acao: "desativar", motivo: mot }, saidaM);
        } else agir(m, { acao: "reativar" }, saidaM);
      });
      const mfa = h("button", { class: "btn btn-ghost", type: "button" }, m.exige_mfa ? "Dispensar MFA" : "Exigir MFA");
      mfa.addEventListener("click", () => {
        if (m.exige_mfa) {
          const mot = motivo(`Por que dispensar o MFA de ${m.nome}? (obrigatório)`);
          if (mot) agir(m, { acao: "dispensar_mfa", motivo: mot }, saidaM);
        } else agir(m, { acao: "exigir_mfa" }, saidaM);
      });
      return h("li", { class: "panel panel-tight stack-s" },
        h("div", { class: "row" },
          h("strong", null, m.nome),
          eu ? stamp("Você", "live") : null,
          m.autoridades.map((a) => stamp(a === "fundador" ? "Fundador" : "CEO", "ok")),
          m.teste ? h("span", { class: "tag tag-test" }, "TESTE") : null,
          m.ativo ? stamp("Ativo", "ok") : stamp("Desativado", "risk"),
          m.mfa ? stamp(m.exige_mfa ? "MFA exigido" : "MFA cadastrado", "ok") : stamp(m.exige_mfa ? "MFA exigido sem cadastro" : "Sem MFA", m.papel === "direcao" ? "warn" : "neutral")),
        h("p", { class: "field-hint" }, `${m.email ?? "—"} · último acesso: ${m.ultimo_acesso ? formatDateTime(m.ultimo_acesso) : "nunca entrou"}`),
        h("div", { class: "row" }, field(sel.id, "Setor (papel)", sel), salvar, ativo, mfa),
        saidaM);
    });
    const alternar = h("label", { class: "row" }, h("input", { type: "checkbox", checked: mostrarTeste }), " Mostrar usuários TESTE");
    alternar.querySelector("input").addEventListener("change", (e) => { mostrarTeste = e.target.checked; desenhar(); });
    const semMfaDirecao = d.membros.filter((m) => m.ativo && !m.teste && m.papel === "direcao" && !m.mfa);

    clear(conteudo).append(...[
      semMfaDirecao.length ? h("p", { class: "notice notice-warn" }, `Direção sem MFA: ${semMfaDirecao.map((m) => m.nome).join(", ")}. Cadastre em Minha conta (app autenticador). Exigir MFA de toda a direção é uma proposta na Biblioteca, aguardando decisão.`) : null,
      panel({ title: "Dar acesso a uma pessoa", subtitle: "Cria o login (sem senha: a pessoa entra pelo link do e-mail) e o cadastro no setor escolhido." }, form),
      panel({ title: "Pessoas com acesso", subtitle: `${d.membros.filter((m) => m.ativo && !m.teste).length} ativas${d.membros.some((m) => m.teste) ? " (sem contar usuários TESTE)" : ""}.`, actions: alternar },
        cartoes.length ? h("ul", { class: "list-plain stack-s" }, cartoes) : h("p", { class: "result-empty" }, "Ninguém cadastrado."),
        method("Regras", "Só a direção gere acessos. Ninguém desativa o próprio acesso e a empresa nunca fica sem direção ativa.",
          "Desativar exige motivo e também bloqueia o login. Exigir MFA só vale para quem já cadastrou o app autenticador (para não trancar ninguém fora); dispensar exige motivo.",
          "Fundador e CEO são autoridades registradas na Biblioteca (Governança); mudam por decisão registrada, não por esta tela.",
          "Tudo fica no histórico abaixo, que não pode ser alterado.")),
      panel({ title: "Histórico de acessos", subtitle: "Últimas 60 alterações." },
        table({ caption: "Histórico", head: ["Quando", "Pessoa", "Ação", "Detalhe", "Por"],
          rows: d.historico.map((x) => [formatDateTime(x.em), x.nome, ACOES[x.acao] ?? x.acao,
            [x.de ? `${nomeSetor(x.de)} → ` : "", x.para ? nomeSetor(x.para) : "", x.motivo ? `${x.para ? " · " : ""}${x.motivo}` : ""].join("") || "—", x.por_nome]) })),
    ].filter(Boolean));
  }
  await desenhar();
}

// ---------------------------------------------------------------- minha conta (MFA)
export async function telaConta(root, eu, mfa = auth) {
  const conteudo = h("div", { class: "stack" });
  root.append(conteudo);

  async function desenhar(aviso) {
    const fatores = await mfa.fatoresMfa();
    const ok = fatores.find((f) => f.status === "verified");
    const area = h("div", { class: "stack-s" });
    if (ok) {
      const remover = h("button", { class: "btn btn-ghost", type: "button", disabled: Boolean(eu.exige_mfa) }, "Remover app autenticador");
      remover.addEventListener("click", async () => {
        if (!confirm("Remover o app autenticador desta conta?")) return;
        try {
          await mfa.removerMfa(ok.id);
          await desenhar(h("p", { class: "notice notice-ok" }, "App autenticador removido."));
        } catch (e) {
          area.append(errorNotice(`${e.message}. Para remover, entre de novo usando o código (sessão com MFA).`));
        }
      });
      area.append(...[h("p", null, stamp("MFA ativo", "ok"), ` Cadastrado em ${formatDateTime(ok.created_at)}.`),
        eu.exige_mfa ? h("p", { class: "field-hint" }, "A direção exige MFA no seu acesso: para remover, peça a dispensa.") : null,
        h("div", { class: "row" }, remover)].filter(Boolean));
    } else {
      const comecar = h("button", { class: "btn btn-primary", type: "button" }, "Cadastrar app autenticador");
      comecar.addEventListener("click", async () => {
        comecar.disabled = true;
        try {
          const f = await mfa.cadastrarMfa();
          const codigo = h("input", { class: "input num", id: "mfa-codigo", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", required: true });
          const confirmar = h("button", { class: "btn btn-primary", type: "submit" }, "Confirmar código");
          const erro = h("div", { role: "alert" });
          const form = h("form", { class: "stack-s" },
            h("p", null, "1. No celular, abra um app autenticador gratuito (Google Authenticator, Microsoft Authenticator ou similar) e leia o QR code."),
            h("img", { src: f.totp.qr_code, alt: "QR code para o app autenticador", width: "180", height: "180", class: "mfa-qr" }),
            h("p", { class: "field-hint" }, "Sem câmera? Digite a chave: ", h("code", { class: "mfa-chave" }, f.totp.secret)),
            field(codigo.id, "2. Digite o código de 6 dígitos que o app mostra", codigo),
            h("div", { class: "row" }, confirmar), erro);
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            confirmar.disabled = true;
            clear(erro);
            try {
              await mfa.verificarMfa(f.id, codigo.value);
              await desenhar(h("p", { class: "notice notice-ok" }, "MFA ativo. Nos próximos acessos o VEOS pode pedir o código do app."));
            } catch (err) {
              erro.append(errorNotice(`Código não confere: ${err.message}`));
              confirmar.disabled = false;
            }
          });
          clear(area).append(form);
        } catch (e) {
          comecar.disabled = false;
          area.append(errorNotice(e.message));
        }
      });
      area.append(h("p", null, stamp("Sem MFA", eu.papel === "direcao" ? "warn" : "neutral"), " Proteja o acesso com um segundo fator: além do link do e-mail, um código do app no celular."), h("div", { class: "row" }, comecar));
    }
    clear(conteudo).append(...[
      aviso,
      panel({ title: eu.nome, subtitle: `${eu.email} · ${nomeSetor(eu.papel)}` },
        h("p", null, "Sessão atual: ", eu.aal === "aal2" ? stamp("com código do app", "ok") : stamp("só link do e-mail", "neutral"))),
      panel({ title: "Verificação em duas etapas (MFA)", subtitle: "Gratuita: usa o app autenticador do celular." }, area),
      painelAvisos(),
    ].filter(Boolean));
  }
  await desenhar();
}

function painelAvisos() {
  const saida = h("div", { role: "status" });
  const b = h("button", { class: "btn btn-ghost", type: "button", disabled: !suportado() }, ligado() ? "Desligar avisos" : "Ligar avisos no navegador");
  b.addEventListener("click", async () => {
    clear(saida);
    try {
      if (ligado()) { desligarAvisos(); b.textContent = "Ligar avisos no navegador"; }
      else { await ligarAvisos(); b.textContent = "Desligar avisos"; }
    } catch (e) { saida.append(errorNotice(e.message)); }
  });
  return panel({ title: "Avisos no navegador", subtitle: "Com o VEOS aberto, avisa alertas altos e críticos novos dos seus setores (confere a cada 5 minutos). Com a aba fechada, não há aviso." },
    h("div", { class: "row" }, b, ligado() ? stamp("Ligados", "ok") : stamp(suportado() ? "Desligados" : "Navegador sem suporte", "neutral")), saida);
}

/** Pedido do codigo no login quando a direcao exige MFA (sessao ainda sem codigo). */
export async function formCodigoMfa(container, aoConcluir, mfa = auth) {
  const fatores = (await mfa.fatoresMfa()).filter((f) => f.status === "verified");
  if (!fatores.length) {
    container.append(errorNotice("A direção exige MFA no seu acesso, mas não há app autenticador cadastrado. Peça à direção para dispensar o MFA e cadastrar de novo."));
    return;
  }
  const codigo = h("input", { class: "input num", id: "mfa-login", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", required: true });
  const botao = h("button", { class: "btn btn-primary", type: "submit" }, "Entrar");
  const erro = h("div", { role: "alert" });
  const form = h("form", { class: "stack-s" }, field(codigo.id, "Código do app autenticador", codigo, "Abra o app no celular e digite os 6 dígitos do VEOS."), h("div", { class: "row" }, botao), erro);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    botao.disabled = true;
    clear(erro);
    try {
      await mfa.verificarMfa(fatores[0].id, codigo.value);
      aoConcluir();
    } catch (err) {
      erro.append(errorNotice(`Código não confere: ${err.message}`));
      botao.disabled = false;
    }
  });
  container.append(panel({ title: "Verificação em duas etapas", subtitle: "A direção exige o código do app autenticador no seu acesso." }, form));
}
