// Cofre das copias de seguranca: gzip + AES-256-GCM com chave derivada da senha (scrypt).
// Formato: "VEOSBK1" | sal(16) | iv(12) | tag(16) | dados cifrados. So Node, sem dependencias.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

const MAGICO = Buffer.from("VEOSBK1");
const chave = (senha, sal) => scryptSync(senha, sal, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

function conferirSenha(senha) {
  if (typeof senha !== "string" || senha.length < 16) throw new Error("senha do backup ausente ou curta (minimo 16 caracteres)");
}

export function cifrar(dados, senha) {
  conferirSenha(senha);
  const sal = randomBytes(16), iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(senha, sal), iv);
  const corpo = Buffer.concat([c.update(gzipSync(dados, { level: 9 })), c.final()]);
  return Buffer.concat([MAGICO, sal, iv, c.getAuthTag(), corpo]);
}

export function decifrar(arquivo, senha) {
  conferirSenha(senha);
  if (!arquivo.subarray(0, MAGICO.length).equals(MAGICO)) throw new Error("arquivo nao e um backup do VEOS");
  let i = MAGICO.length;
  const sal = arquivo.subarray(i, (i += 16)), iv = arquivo.subarray(i, (i += 12)), tag = arquivo.subarray(i, (i += 16));
  const d = createDecipheriv("aes-256-gcm", chave(senha, sal), iv);
  d.setAuthTag(tag);
  try {
    return gunzipSync(Buffer.concat([d.update(arquivo.subarray(i)), d.final()]));
  } catch {
    throw new Error("senha errada ou arquivo corrompido");
  }
}
