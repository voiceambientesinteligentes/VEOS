// Dominio: formatacao de valores decimais recebidos como texto do servidor.
// Nenhum calculo financeiro usa ponto flutuante: arredondamento em BigInt,
// meio para cima (afastando do zero), como ROUND_HALF_UP do Python.

const DEC_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

export function toScaled(value, places) {
  const m = DEC_RE.exec(String(value ?? "").trim());
  if (!m) return null;
  const [, neg, int, frac = ""] = m;
  const kept = (frac + "0".repeat(places)).slice(0, places);
  const next = frac.length > places ? Number(frac[places]) : 0;
  let n = BigInt(int + kept);
  if (next >= 5) n += 1n;
  return neg && n !== 0n ? -n : n;
}

function groupThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatScaled(n, places) {
  const neg = n < 0n;
  const abs = (neg ? -n : n).toString().padStart(places + 1, "0");
  const int = places ? abs.slice(0, -places) : abs;
  const frac = places ? abs.slice(-places) : "";
  return { neg, text: groupThousands(int) + (places ? "," + frac : "") };
}

export function formatBRL(value) {
  if (value === null || value === undefined) return "—";
  const n = toScaled(value, 2);
  if (n === null) return "—";
  const { neg, text } = formatScaled(n, 2);
  return (neg ? "-" : "") + "R$ " + text;
}

export function formatPct(value, places = 2) {
  if (value === null || value === undefined) return "NÃO RESOLVIDO";
  const n = toScaled(value, places);
  if (n === null) return "—";
  const { neg, text } = formatScaled(n, places);
  return (neg ? "-" : "") + text + "%";
}

export function formatPP(value, places = 2) {
  if (value === null || value === undefined) return "—";
  const n = toScaled(value, places);
  if (n === null) return "—";
  if (n === 0n) return "0,00 p.p.";
  const { neg, text } = formatScaled(n, places);
  return (neg ? "−" : "+") + text + " p.p.";
}

export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function isNegative(value) {
  const n = toScaled(value, 2);
  return n !== null && n < 0n;
}

export function isPositive(value) {
  const n = toScaled(value, 2);
  return n !== null && n > 0n;
}

export function compareDecimal(a, b) {
  const x = toScaled(a, 4);
  const y = toScaled(b, 4);
  return x < y ? -1 : x > y ? 1 : 0;
}

export function minDecimal(values) {
  return values.reduce((m, v) => (m === null || compareDecimal(v, m) < 0 ? v : m), null);
}

export function maxDecimal(values) {
  return values.reduce((m, v) => (m === null || compareDecimal(v, m) > 0 ? v : m), null);
}

// Somente para geometria de grafico (nao para exibir valores).
export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
