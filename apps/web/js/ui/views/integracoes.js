// Integracoes: estado da conexao com o Zoho (somente leitura). A direcao conecta/desconecta;
// o login acontece no proprio Zoho e os tokens ficam so no servidor.
import { api } from "../../data/api.js";
import { formatDateTime } from "../../domain/format.js";
import { clear, errorNotice, h, method, panel, stamp } from "../dom.js";

const RETORNO = {
  ok: ["Zoho conectado. O VEOS já pode ler orçamentos, faturas, negócios e projetos.", "ok"],
  recusado: ["Você não autorizou no Zoho. Nada foi conectado.", "warn"],
  "erro-estado": ["O pedido de conexão expirou ou não é válido. Clique em Conectar de novo.", "risk"],
  "erro-codigo": ["O Zoho não devolveu o código de autorização. Tente de novo.", "risk"],
  "erro-config": ["As credenciais do Zoho não estão configuradas no servidor.", "risk"],
  erro: ["O Zoho recusou a troca de autorização. Tente de novo; se repetir, confira o Redirect URI no console do Zoho.", "risk"],
};
const USOS = [
  ["Negociação ao Vivo", "importa orçamentos do Books com itens e preço de compra; a receita dos 12 meses (Simples) vem das faturas."],
  ["Etapas do CRM", "lidas do campo Estágio dos Negócios; o VEOS nunca inventa etapa."],
  ["Próximos passos", "alertas de fatura vencida, orçamento sem resposta, negócio parado e projeto parado."],
];

export async function telaIntegracoes(root, eu) {
  const retorno = new URLSearchParams(location.hash.split("?")[1] ?? "").get("zoho");
  if (retorno) history.replaceState(null, "", "#/integracoes");
  const conteudo = h("div", { class: "stack" });
  root.append(conteudo);

  async function desenhar(aviso) {
    const st = await api.zohoStatus();
    const direcao = eu?.papel === "direcao";
    const botao = h("button", { class: `btn ${st.conectado ? "btn-ghost" : "btn-primary"}`, type: "button", disabled: !direcao || !st.configurado }, st.conectado ? "Desconectar" : "Conectar Zoho");
    const saida = h("div", { role: "status" });
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      clear(saida);
      try {
        if (st.conectado) {
          if (!confirm("Desconectar o Zoho? O VEOS deixa de ler os dados até conectar de novo.")) { botao.disabled = false; return; }
          await api.zohoDesconectar();
          await desenhar(["Zoho desconectado. Os tokens foram apagados do servidor.", "neutral"]);
        } else {
          const { url } = await api.zohoConectar();
          location.assign(url); // login e consentimento no proprio Zoho
        }
      } catch (e) {
        botao.disabled = false;
        saida.append(errorNotice(e.message));
      }
    });
    clear(conteudo).append(
      aviso ? h("p", { class: `notice notice-${aviso[1] === "ok" ? "ok" : aviso[1] === "risk" ? "risk" : "warn"}`, role: "status" }, aviso[0]) : null,
      panel({ title: "Zoho (Books, CRM e Projects)", subtitle: "Organização VOICE AMBIENTES INTELIGENTES · somente leitura", actions: botao },
        h("div", { class: "row" },
          st.conectado ? stamp("Conectado", "ok") : stamp("Não conectado", "neutral"),
          stamp("Somente leitura", "live"),
          st.configurado ? null : stamp("Credenciais ausentes no servidor", "risk")),
        st.conectado ? h("p", null, `Conectado em ${formatDateTime(st.conectado_em)}${st.conectado_por ? ` por ${st.conectado_por}` : ""}.`) : h("p", null, direcao ? "Clique em Conectar Zoho: você entra na sua conta do Zoho e autoriza o VEOS a ler os dados." : "Só a direção pode conectar o Zoho."),
        saida,
        h("ul", { class: "list-plain stack-s" }, USOS.map(([t, d]) => h("li", null, h("strong", null, `${t}: `), d))),
        method("Segurança", "O acesso é só de leitura: o VEOS não cria, altera nem apaga nada no Zoho.",
          "Client ID e segredo ficam nos segredos do servidor; o token de acesso fica numa tabela que só o servidor lê. Nada disso chega ao navegador.",
          st.escopos.length ? `Permissões concedidas: ${st.escopos.join(", ")}` : null)),
    );
  }
  await desenhar(retorno ? RETORNO[retorno] ?? RETORNO.erro : null);
}
