// Leitura de extrato bancario (gratis, sem integracao paga): OFX (padrao dos bancos brasileiros,
// "Money/OFX") e CSV com deteccao das colunas. Sem DOM: roda no navegador antes do envio e nos testes.
// Saida: lancamentos {data AAAA-MM-DD, valor (+ entrada / - saida), descricao, documento, id_externo, seq}
// e, quando o arquivo traz, o saldo final do banco (ancora do saldo no VEOS).

const r2 = (v) => Math.round(v * 100) / 100;

/** "1.234,56" | "-1.234,56" | "1234.56" | "R$ -12,90" | "(12,90)" | "12,90 D" -> numero (null se nao for valor). */
export function valorBR(texto) {
  let t = String(texto ?? "").trim().replace(/R\$|\s/g, "");
  if (!t) return null;
  let sinal = 1;
  if (/^\(.*\)$/.test(t)) { sinal = -1; t = t.slice(1, -1); }
  if (/[dD]$/.test(t)) { sinal = -1; t = t.slice(0, -1); } else if (/[cC]$/.test(t)) t = t.slice(0, -1);
  if (t.endsWith("-")) { sinal = -sinal; t = t.slice(0, -1); }
  if (t.startsWith("-")) { sinal = -sinal; t = t.slice(1); } else if (t.startsWith("+")) t = t.slice(1);
  if (!/^[\d.,]+$/.test(t)) return null;
  const virg = t.lastIndexOf(","), ponto = t.lastIndexOf(".");
  if (virg > ponto) t = t.replace(/\./g, "").replace(",", ".");
  else if (ponto > virg && virg >= 0) t = t.replace(/,/g, "");
  else if (ponto >= 0 && virg < 0 && /\.\d{3}$/.test(t) && (t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? r2(sinal * n) : null;
}

/** dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd, dd-mm-aaaa, aaaammdd -> AAAA-MM-DD (null se invalida). */
export function dataBR(texto) {
  const t = String(texto ?? "").trim();
  let a, m, d;
  let x = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (x) [, a, m, d] = x;
  else if ((x = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(t))) { [, d, m, a] = x; if (a.length === 2) a = `20${a}`; }
  else if ((x = /^(\d{4})(\d{2})(\d{2})/.exec(t))) [, a, m, d] = x;
  else return null;
  const iso = `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dt = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** Numera lancamentos identicos no mesmo dia (1, 2, ...): distingue dois PIX iguais e evita duplicar ao reimportar. */
export function sequenciar(linhas) {
  const vistos = new Map();
  return linhas.map((l) => {
    const k = `${l.data}|${l.valor}|${String(l.descricao).trim().toLowerCase()}|${l.documento ?? ""}`;
    const seq = (vistos.get(k) ?? 0) + 1;
    vistos.set(k, seq);
    return { ...l, seq };
  });
}

/** Codificacao declarada no cabecalho do OFX (CHARSET:1252 / ENCODING:USASCII / encoding="UTF-8"). */
export function codificacaoOFX(cabecalho) {
  const t = String(cabecalho ?? "").slice(0, 600);
  if (/encoding\s*=\s*"?utf-?8/i.test(t) || /ENCODING:\s*UTF-?8/i.test(t)) return "utf-8";
  if (/CHARSET:\s*(1252|ISO-?8859-?1|LATIN)/i.test(t)) return "windows-1252";
  return "windows-1252"; // padrao dos bancos brasileiros (SGML 1.02)
}

const tag = (bloco, nome) => {
  const x = new RegExp(`<${nome}>([^<\\r\\n]*)`, "i").exec(bloco);
  return x ? x[1].trim() : "";
};

/** OFX (SGML 1.x ou XML 2.x). */
export function lerOFX(texto) {
  const t = String(texto ?? "");
  if (!/<OFX>/i.test(t)) throw new Error("arquivo não parece OFX (falta <OFX>)");
  const blocos = t.split(/<STMTTRN>/i).slice(1).map((b) => b.split(/<\/STMTTRN>/i)[0]);
  const linhas = [];
  const avisos = [];
  for (const b of blocos) {
    const data = dataBR(tag(b, "DTPOSTED"));
    const valor = valorBR(tag(b, "TRNAMT").replace(/\.(?=\d{2}$)/, ",").replace(/^(-?\d+)$/, "$1"));
    const memo = tag(b, "MEMO"), nome = tag(b, "NAME");
    const descricao = (nome && memo && !memo.toLowerCase().includes(nome.toLowerCase()) ? `${nome} ${memo}` : memo || nome || tag(b, "TRNTYPE")).replace(/\s+/g, " ").trim();
    if (!data || valor === null || valor === 0) { avisos.push(`lançamento ignorado (data ou valor ilegível): ${descricao.slice(0, 40)}`); continue; }
    linhas.push({ data, valor, descricao: descricao.slice(0, 300), documento: (tag(b, "CHECKNUM") || tag(b, "REFNUM")).slice(0, 60) || null, id_externo: tag(b, "FITID").slice(0, 120) || null });
  }
  const bal = (/<LEDGERBAL>([\s\S]*?)(<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>)/i.exec(t) ?? [])[1] ?? "";
  const saldo = bal ? valorBR(tag(bal, "BALAMT").replace(/\.(?=\d{2}$)/, ",")) : null;
  const acct = tag(t, "ACCTID");
  const datas = linhas.map((l) => l.data).sort();
  return {
    formato: "ofx", linhas: sequenciar(linhas), avisos,
    saldo_final: saldo, saldo_final_em: saldo !== null ? dataBR(tag(bal, "DTASOF")) ?? datas.at(-1) ?? null : null,
    banco: tag(t, "ORG") || tag(t, "BANKID") || null, final_conta: acct ? acct.replace(/\D/g, "").slice(-4) || null : null,
    de: datas[0] ?? null, ate: datas.at(-1) ?? null,
  };
}

/** Separa uma linha CSV respeitando aspas. */
export function celulas(linha, sep) {
  const out = [];
  let atual = "", aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') { if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas; }
    else if (c === sep && !aspas) { out.push(atual.trim()); atual = ""; }
    else atual += c;
  }
  out.push(atual.trim());
  return out;
}

const sem = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const COLUNAS = {
  data: /^(data|date|dt)\b|data (do )?lan|data mov/,
  descricao: /hist[o]?rico|descri|lancamento|memo|detalhe|title|estabelecimento|^nome$/,
  valor: /^(valor|value|amount|quantia|valor \(r\$\))/,
  credito: /^credito|^entrada|^credit/,
  debito: /^debito|^saida|^debit/,
  documento: /^(doc|docto|documento|n[º°o]? ?doc|numero|identificador|id)\b/,
  saldo: /^saldo/,
};

/** Detecta o mapa de colunas pelo cabecalho. */
export function mapaColunas(cabecalho) {
  const h = cabecalho.map(sem);
  const achar = (re, ja) => h.findIndex((x, i) => re.test(x) && !ja.includes(i));
  const usados = [];
  const m = {};
  for (const k of ["data", "credito", "debito", "valor", "saldo", "documento", "descricao"]) {
    const i = achar(COLUNAS[k], usados);
    if (i >= 0) { m[k] = i; usados.push(i); }
  }
  return m;
}

/**
 * CSV de banco (Itau, Bradesco, BB, Caixa, Santander, Nubank, Inter, Sicoob...). mapa opcional
 * {data, descricao, valor | credito+debito, documento?, saldo?} com os indices das colunas.
 */
export function lerCSV(texto, mapaInformado = null) {
  const brutas = String(texto ?? "").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!brutas.length) throw new Error("arquivo vazio");
  const amostra = brutas.slice(0, 15).join("\n");
  const sep = [";", "\t", ","].map((s) => [s, (amostra.match(new RegExp(s === "\t" ? "\\t" : `\\${s}`, "g")) ?? []).length]).sort((a, b) => b[1] - a[1])[0][0];
  const tabela = brutas.map((l) => celulas(l, sep));
  let ini = tabela.findIndex((c) => { const m = mapaColunas(c); return m.data !== undefined && (m.valor !== undefined || m.credito !== undefined || m.debito !== undefined); });
  const mapa = mapaInformado ?? (ini >= 0 ? mapaColunas(tabela[ini]) : null);
  if (!mapa || mapa.data === undefined || (mapa.valor === undefined && mapa.credito === undefined && mapa.debito === undefined)) {
    return { formato: "csv", precisaMapa: true, cabecalho: tabela[Math.max(0, ini)] ?? tabela[0], amostra: tabela.slice(0, 6), linhas: [], avisos: ["Não reconheci as colunas: escolha qual é a data, o histórico e o valor."] };
  }
  if (mapaInformado && ini < 0) ini = tabela.findIndex((c) => dataBR(c[mapa.data])) - 1;
  const linhas = [];
  const avisos = [];
  let saldoFinal = null, saldoEm = null, ignoradas = 0;
  for (const c of tabela.slice(ini + 1)) {
    const data = dataBR(c[mapa.data]);
    const descricao = String(mapa.descricao !== undefined ? c[mapa.descricao] : "").replace(/\s+/g, " ").trim();
    let valor = mapa.valor !== undefined ? valorBR(c[mapa.valor]) : null;
    if (valor === null && (mapa.credito !== undefined || mapa.debito !== undefined)) {
      const cr = mapa.credito !== undefined ? valorBR(c[mapa.credito]) : null, db = mapa.debito !== undefined ? valorBR(c[mapa.debito]) : null;
      if (cr !== null || db !== null) valor = r2(Math.abs(cr ?? 0) - Math.abs(db ?? 0));
    }
    const saldo = mapa.saldo !== undefined ? valorBR(c[mapa.saldo]) : null;
    if (data && /^saldo|saldo (do dia|anterior|final|atual)|s a l d o/i.test(sem(descricao))) {
      const v = saldo ?? valor;
      if (v !== null && (!saldoEm || data >= saldoEm)) { saldoFinal = v; saldoEm = data; }
      continue;
    }
    if (!data || valor === null || valor === 0) { ignoradas++; continue; }
    if (saldo !== null && (!saldoEm || data >= saldoEm)) { saldoFinal = saldo; saldoEm = data; }
    linhas.push({ data, valor, descricao: (descricao || "(sem histórico)").slice(0, 300), documento: mapa.documento !== undefined ? (c[mapa.documento] || "").slice(0, 60) || null : null, id_externo: null });
  }
  if (ignoradas) avisos.push(`${ignoradas} linha(s) sem data ou valor ignorada(s).`);
  const datas = linhas.map((l) => l.data).sort();
  return { formato: "csv", linhas: sequenciar(linhas), avisos, mapa, saldo_final: saldoFinal, saldo_final_em: saldoEm, de: datas[0] ?? null, ate: datas.at(-1) ?? null };
}

/** Resumo para a pre-visualizacao: entradas, saidas, periodo. */
export function resumoExtrato(linhas) {
  const entradas = r2(linhas.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0));
  const saidas = r2(linhas.filter((l) => l.valor < 0).reduce((s, l) => s + l.valor, 0));
  return { quantidade: linhas.length, entradas, saidas, liquido: r2(entradas + saidas) };
}
