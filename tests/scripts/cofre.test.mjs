import assert from "node:assert/strict";
import { test } from "node:test";

import { cifrar, decifrar } from "../../scripts/lib/cofre.mjs";

const SENHA = "senha-de-TESTE-com-mais-de-16";

test("cifra e decifra (ida e volta)", () => {
  const dados = Buffer.from(JSON.stringify({ tabelas: { pedidos: [{ numero: "PED-TESTE", valor: "1500.00" }] } }));
  const arq = cifrar(dados, SENHA);
  assert.equal(arq.subarray(0, 7).toString(), "VEOSBK1");
  assert.ok(!arq.includes(Buffer.from("PED-TESTE")), "conteudo nao pode aparecer em claro");
  assert.deepEqual(decifrar(arq, SENHA), dados);
});

test("senha errada, arquivo alterado e senha curta sao recusados", () => {
  const arq = cifrar(Buffer.from("TESTE"), SENHA);
  assert.throws(() => decifrar(arq, "outra-senha-de-TESTE-longa"), /senha errada/);
  const alterado = Buffer.from(arq);
  alterado[alterado.length - 1] ^= 1;
  assert.throws(() => decifrar(alterado, SENHA), /senha errada ou arquivo corrompido/);
  assert.throws(() => cifrar(Buffer.from("x"), "curta"), /minimo 10/);
  assert.throws(() => decifrar(Buffer.from("qualquer coisa"), SENHA), /nao e um backup/);
});
