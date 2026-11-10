// Cifra dos segredos das integracoes (ponte do Gmail, chaves de pesquisa) guardados no banco: AES-GCM 256 com a
// chave VEOS_CIFRA dos segredos do servidor (qualquer texto longo; a chave AES e o SHA-256 dele). Sem VEOS_CIFRA o
// servidor recusa guardar segredos (melhor parar do que guardar em claro).
let chave: CryptoKey | null = null;

async function obterChave() {
  if (chave) return chave;
  const bruto = Deno.env.get("VEOS_CIFRA") ?? "";
  if (bruto.length < 24) throw new Error("VEOS_CIFRA ausente ou curta nos segredos do servidor");
  const k = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bruto));
  chave = await crypto.subtle.importKey("raw", k, "AES-GCM", false, ["encrypt", "decrypt"]);
  return chave;
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Texto -> base64(iv de 12 bytes || cifrado). */
export async function cifrar(texto: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await obterChave(), new TextEncoder().encode(texto)));
  const tudo = new Uint8Array(iv.length + ct.length);
  tudo.set(iv);
  tudo.set(ct, iv.length);
  return b64(tudo);
}

export async function decifrar(cifrado: string) {
  const tudo = deB64(cifrado);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: tudo.slice(0, 12) }, await obterChave(), tudo.slice(12));
  return new TextDecoder().decode(pt);
}

/** Segredo aleatorio seguro para URL (base64url), ex.: o codigo da ponte do Gmail. */
export function segredoAleatorio(bytes = 30) {
  return b64(crypto.getRandomValues(new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
