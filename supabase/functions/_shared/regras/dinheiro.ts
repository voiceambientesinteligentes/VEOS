// Aritmetica exata em centavos (BigInt), equivalente ao Decimal do motor Python.
// Dinheiro entra como texto '1234.56' (sem separador de milhar); nunca float.

export class RegraError extends Error {}

/** Fracao exata num/den com den > 0 (ex.: percentual = mc*100 / rl). */
export type Razao = { num: bigint; den: bigint };

const MONEY_RE = /^\d{1,13}(\.\d{1,2})?$/;

export function centavos(v: unknown, ctx: string, positivo = false): bigint {
  if (typeof v !== "string" || !MONEY_RE.test(v)) {
    throw new RegraError(
      `${ctx}: valor monetario invalido ${JSON.stringify(v)} ` +
        "(texto '1234.56', nao negativo, ate 2 casas, sem separador de milhar)",
    );
  }
  const [i, f = ""] = v.split(".");
  const c = BigInt(i) * 100n + BigInt((f + "00").slice(0, 2));
  if (positivo && c <= 0n) throw new RegraError(`${ctx}: deve ser maior que zero`);
  return c;
}

export function centavosOuNulo(v: unknown, ctx: string): bigint | null {
  return v === null || v === undefined ? null : centavos(v, ctx);
}

/** num/den arredondado meio-para-longe-do-zero (ROUND_HALF_UP do Decimal). */
export function divArred(num: bigint, den: bigint): bigint {
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const neg = num < 0n;
  const r = (2n * (neg ? -num : num) + den) / (2n * den);
  return neg ? -r : r;
}

/** Razao percentual -> centesimos de ponto percentual (40,59% -> 4059n). */
export function centesimos(r: Razao): bigint {
  return divArred(r.num * 100n, r.den);
}

function partes(c: bigint): [string, string, string] {
  const neg = c < 0n;
  const a = neg ? -c : c;
  return [neg ? "-" : "", (a / 100n).toString(), (a % 100n).toString().padStart(2, "0")];
}

/** 12345n -> '123.45' (formato do JSON do motor Python). */
export function fixo2(c: bigint): string {
  const [s, i, f] = partes(c);
  return `${s}${i}.${f}`;
}

/** 12345600n -> 'R$ 123.456,00' */
export function brl(c: bigint): string {
  const [s, i, f] = partes(c);
  return `R$ ${s}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${f}`;
}

/** 4059n (centesimos) -> '40,59%' */
export function pctTexto(h: bigint): string {
  return fixo2(h).replace(".", ",") + "%";
}

// Comparacoes exatas de uma razao com um inteiro k.
export const ge = (r: Razao, k: bigint) => r.num >= k * r.den;
export const gt = (r: Razao, k: bigint) => r.num > k * r.den;
export const le = (r: Razao, k: bigint) => r.num <= k * r.den;
export const lt = (r: Razao, k: bigint) => r.num < k * r.den;
