// CSV no padrao do Excel em portugues: separador ";", decimal com virgula, BOM UTF-8 (acentos)
// e quebra de linha CRLF. Texto com ; " ou quebra de linha vai entre aspas. Sem dependencias.

const DECIMAL = /^-?\d+\.\d+$/;
// Excel executa celulas que comecam com = + - @ (injecao de formula): prefixa com apostrofo.
const FORMULA = /^[=+\-@\t\r]/;

export function celulaCSV(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "number") return String(v).replace(".", ",");
  if (typeof v === "object") v = JSON.stringify(v);
  let t = String(v);
  if (DECIMAL.test(t)) return t.replace(".", ",");
  if (FORMULA.test(t) && !/^-?\d/.test(t)) t = `'${t}`;
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function paraCSV(colunas, linhas) {
  const corpo = [colunas.map(celulaCSV).join(";"), ...linhas.map((l) => colunas.map((c) => celulaCSV(l[c])).join(";"))].join("\r\n");
  return `﻿${corpo}\r\n`;
}

export function nomeArquivo(conjunto, data = new Date()) {
  return `veos-${conjunto}-${data.toISOString().slice(0, 10)}.csv`;
}
