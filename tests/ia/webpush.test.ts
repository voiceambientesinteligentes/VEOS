// Web Push sem biblioteca: a criptografia aes128gcm é decifrada por uma implementação independente (node:crypto,
// RFC 8291) e a assinatura VAPID (ES256) é conferida com a chave pública.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv, createECDH, createHmac, createPublicKey, createVerify, randomBytes } from "node:crypto";
import { b64u, cabecalhoVapid, criptografar, desb64u } from "../../supabase/functions/_shared/webpush.ts";

const hkdf = (salt: Buffer, ikm: Buffer, info: Buffer, n: number) => {
  const prk = createHmac("sha256", salt).update(ikm).digest();
  return createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, n);
};

/** Receptor de referencia (RFC 8291 sec. 3.4), escrito com node:crypto. */
function decifrar(corpo: Uint8Array, receptor: ReturnType<typeof createECDH>, auth: Buffer) {
  const b = Buffer.from(corpo);
  const salt = b.subarray(0, 16), rs = b.readUInt32BE(16), idlen = b[20];
  const asPublica = b.subarray(21, 21 + idlen), cifrado = b.subarray(21 + idlen);
  assert.equal(rs, 4096); assert.equal(idlen, 65);
  const segredo = receptor.computeSecret(asPublica);
  const uaPublica = receptor.getPublicKey();
  const ikm = hkdf(auth, segredo, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublica, asPublica]), 32);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);
  const d = createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(cifrado.subarray(cifrado.length - 16));
  const claro = Buffer.concat([d.update(cifrado.subarray(0, cifrado.length - 16)), d.final()]);
  assert.equal(claro[claro.length - 1], 2, "falta o delimitador de ultimo registro");
  return claro.subarray(0, claro.length - 1).toString("utf8");
}

test("criptografia aes128gcm: o receptor de referência decifra exatamente o texto (com acentos)", async () => {
  const receptor = createECDH("prime256v1"); receptor.generateKeys();
  const auth = randomBytes(16);
  const texto = JSON.stringify({ titulo: "VEOS · Crítico", corpo: "Caixa negativo na semana 3 — ação necessária", href: "#/radar" });
  const corpo = await criptografar(texto, b64u(receptor.getPublicKey()), b64u(auth));
  assert.equal(decifrar(corpo, receptor, auth), texto);
  // cada envio usa sal e chave efêmera novos
  const outro = await criptografar(texto, b64u(receptor.getPublicKey()), b64u(auth));
  assert.notDeepEqual(Buffer.from(corpo), Buffer.from(outro));
  assert.equal(decifrar(outro, receptor, auth), texto);
});

test("criptografia: recusa chave inválida e mensagem grande demais", async () => {
  const r = createECDH("prime256v1"); r.generateKeys();
  await assert.rejects(criptografar("x", b64u(randomBytes(10)), b64u(randomBytes(16))), /p256dh/);
  await assert.rejects(criptografar("x".repeat(5000), b64u(r.getPublicKey()), b64u(randomBytes(16))), /grande/);
});

test("VAPID: JWT ES256 válido para a origem do serviço de push, conferido com a chave pública", async () => {
  const par = createECDH("prime256v1"); par.generateKeys();
  const publica = b64u(par.getPublicKey()), privada = b64u(par.getPrivateKey());
  const agora = Date.parse("2026-11-05T12:00:00Z");
  const h = await cabecalhoVapid("https://fcm.googleapis.com/fcm/send/abc", "https://exemplo.test/", publica, privada, agora);
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(h)!;
  assert.equal(m[2], publica);
  const [cab, corpo, ass] = m[1].split(".");
  assert.deepEqual(JSON.parse(Buffer.from(desb64u(cab)).toString()), { typ: "JWT", alg: "ES256" });
  const c = JSON.parse(Buffer.from(desb64u(corpo)).toString());
  assert.equal(c.aud, "https://fcm.googleapis.com"); assert.equal(c.sub, "https://exemplo.test/"); assert.equal(c.exp, Math.floor(agora / 1000) + 12 * 3600);
  const pem = createPublicKey({ key: { kty: "EC", crv: "P-256", x: b64u(par.getPublicKey().subarray(1, 33)), y: b64u(par.getPublicKey().subarray(33, 65)) }, format: "jwk" });
  const v = createVerify("SHA256").update(`${cab}.${corpo}`);
  assert.ok(v.verify({ key: pem, dsaEncoding: "ieee-p1363" }, Buffer.from(desb64u(ass))), "assinatura VAPID não confere");
});
