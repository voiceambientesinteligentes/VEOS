// WEB PUSH sem biblioteca: assinatura VAPID (RFC 8292, ES256) e criptografia do conteudo aes128gcm (RFC 8291) com o
// WebCrypto, que existe no Deno (servidor) e no Node (testes). Sem dependencia de Deno nem de rede neste arquivo.
// deno-lint-ignore-file no-explicit-any

const enc = new TextEncoder();
export const b64u = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = ""; for (const x of u) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export const desb64u = (s: string) => {
  const p = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const r = atob(p); const u = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u;
};
const juntar = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

async function hkdf(sal: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: sal, info }, k, bytes * 8));
}

/** Cria o corpo criptografado (aes128gcm) de uma mensagem push para o navegador (p256dh de 65 bytes + segredo auth de 16). */
export async function criptografar(texto: string, p256dh: string, auth: string, opcoes: { salt?: Uint8Array; efemera?: CryptoKeyPair } = {}) {
  const uaPublica = desb64u(p256dh), segredoAuth = desb64u(auth);
  if (uaPublica.length !== 65 || uaPublica[0] !== 4) throw new Error("chave p256dh invalida");
  const efemera = opcoes.efemera ?? await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublica = new Uint8Array(await crypto.subtle.exportKey("raw", efemera.publicKey));
  const uaChave = await crypto.subtle.importKey("raw", uaPublica, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const segredo = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaChave } as any, efemera.privateKey, 256));
  const ikm = await hkdf(segredoAuth, segredo, juntar(enc.encode("WebPush: info\0"), uaPublica, asPublica), 32);
  const salt = opcoes.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const claro = juntar(enc.encode(texto), new Uint8Array([2])); // 0x02 = ultimo (e unico) registro
  if (claro.length > 4096 - 17) throw new Error("mensagem grande demais para um registro push");
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, claro));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return juntar(salt, rs, new Uint8Array([65]), asPublica, cifrado);
}

/** Cabecalho Authorization VAPID: "vapid t=<jwt ES256>, k=<chave publica>". */
export async function cabecalhoVapid(endpoint: string, assunto: string, chavePublica: string, chavePrivada: string, agora = Date.now()) {
  const pub = desb64u(chavePublica);
  if (pub.length !== 65) throw new Error("chave publica VAPID invalida");
  const jwk = { kty: "EC", crv: "P-256", d: chavePrivada, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
  const chave = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const origem = new URL(endpoint).origin;
  const cabeca = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corpo = b64u(enc.encode(JSON.stringify({ aud: origem, exp: Math.floor(agora / 1000) + 12 * 3600, sub: assunto })));
  const assinatura = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, enc.encode(`${cabeca}.${corpo}`)));
  return `vapid t=${cabeca}.${corpo}.${b64u(assinatura)}, k=${chavePublica}`;
}

/** Envia a mensagem. Devolve o status HTTP do servico de push (201 = aceita). */
export async function enviarWebPush(insc: { endpoint: string; p256dh: string; auth: string }, texto: string,
  vapid: { assunto: string; publica: string; privada: string }, opcoes: { ttl?: number; urgencia?: string } = {}) {
  const corpo = await criptografar(texto, insc.p256dh, insc.auth);
  const r = await fetch(insc.endpoint, {
    method: "POST",
    headers: { Authorization: await cabecalhoVapid(insc.endpoint, vapid.assunto, vapid.publica, vapid.privada), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: String(opcoes.ttl ?? 21600), Urgency: opcoes.urgencia ?? "high" },
    body: corpo,
  });
  const texto2 = r.ok ? "" : (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 120);
  return { status: r.status, corpo: texto2 };
}
