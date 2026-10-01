import { formCodigoMfa, telaConta } from "../js/ui/views/usuarios.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
let verificado = caso === "com" || caso === "login";
const chamadas = [];
const QR = "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10'/></svg>";
const mfa = {
  fatoresMfa: async () => (verificado ? [{ id: "f1", factor_type: "totp", status: "verified", created_at: "2026-10-01T10:00:00Z" }] : []),
  cadastrarMfa: async () => ({ id: "f2", totp: { qr_code: QR, secret: "JBSWY3DPEHPK3PXPTESTE", uri: "otpauth://totp/TESTE" } }),
  verificarMfa: async (id, c) => { chamadas.push([id, c]); if (c !== "123456") throw new Error("código inválido"); verificado = true; },
  removerMfa: async () => { verificado = false; },
};
const eu = { nome: "Fernando TESTE", email: "fernando@teste.invalid", papel: "direcao", aal: caso === "com" ? "aal2" : "aal1", exige_mfa: false };
const espera = () => new Promise((r) => setTimeout(r, 80));

rodar(async (v) => {
  if (caso === "login") {
    let entrou = false;
    await formCodigoMfa(v, () => { entrou = true; }, mfa);
    v.querySelector("#mfa-login").value = "000000";
    v.querySelector("form").requestSubmit();
    await espera();
    if (!v.textContent.includes("Código não confere")) throw new Error("codigo errado aceito");
    v.querySelector("#mfa-login").value = "123456";
    v.querySelector("form").requestSubmit();
    await espera();
    if (!entrou) throw new Error("nao entrou com o codigo certo");
    return;
  }
  await telaConta(v, eu, mfa);
  if (caso === "com" && !v.textContent.includes("MFA ativo")) throw new Error("deveria mostrar MFA ativo");
  if (caso === "cadastrar") {
    [...v.querySelectorAll("button")].find((b) => b.textContent === "Cadastrar app autenticador").click();
    await espera();
    if (!v.querySelector("img.mfa-qr") || !v.textContent.includes("JBSWY3DPEHPK3PXPTESTE")) throw new Error("QR/chave ausentes");
    v.querySelector("#mfa-codigo").value = "123456";
    v.querySelector("form").requestSubmit();
    await espera();
    if (!v.textContent.includes("MFA ativo. Nos próximos acessos")) throw new Error("cadastro nao concluiu");
  }
});
