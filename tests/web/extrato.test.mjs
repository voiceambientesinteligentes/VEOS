// Leitura de extrato (OFX e CSV dos bancos brasileiros). Dados fictícios.
import { test } from "node:test";
import assert from "node:assert/strict";
import { codificacaoOFX, dataBR, lerCSV, lerOFX, resumoExtrato, sequenciar, valorBR } from "../../apps/web/js/domain/extrato.js";

test("valores no formato brasileiro e de banco", () => {
  assert.equal(valorBR("1.234,56"), 1234.56);
  assert.equal(valorBR("-1.234,56"), -1234.56);
  assert.equal(valorBR("R$ -12,90"), -12.9);
  assert.equal(valorBR("(12,90)"), -12.9);
  assert.equal(valorBR("12,90 D"), -12.9);
  assert.equal(valorBR("12,90 C"), 12.9);
  assert.equal(valorBR("1234.56"), 1234.56);
  assert.equal(valorBR("-300"), -300);
  assert.equal(valorBR("1.234.567,00"), 1234567);
  assert.equal(valorBR(""), null);
  assert.equal(valorBR("abc"), null);
});

test("datas", () => {
  assert.equal(dataBR("30/09/2026"), "2026-09-30");
  assert.equal(dataBR("1/9/26"), "2026-09-01");
  assert.equal(dataBR("2026-09-30"), "2026-09-30");
  assert.equal(dataBR("20260930120000[-3:BRT]"), "2026-09-30");
  assert.equal(dataBR("31/02/2026"), null);
  assert.equal(dataBR("xx"), null);
});

const OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
ENCODING:USASCII
CHARSET:1252

<OFX>
<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20261001</SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>0341<ACCTID>12345-6</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20260901<DTEND>20260930
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260905120000[-3:BRT]<TRNAMT>2500.00<FITID>A1<MEMO>PIX RECEBIDO CLIENTE FICTICIO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260910<TRNAMT>-12.90<FITID>A2<CHECKNUM>0001<MEMO>TARIFA PACOTE</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260910<TRNAMT>-50.00<FITID>A3<NAME>PIX ENVIADO<MEMO>FORNECEDOR X</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>3437.10<DTASOF>20260930</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

test("OFX SGML: lançamentos, FITID, documento, saldo final e conta", () => {
  const r = lerOFX(OFX);
  assert.equal(r.linhas.length, 3);
  assert.deepEqual(r.linhas[0], { data: "2026-09-05", valor: 2500, descricao: "PIX RECEBIDO CLIENTE FICTICIO", documento: null, id_externo: "A1", seq: 1 });
  assert.equal(r.linhas[1].valor, -12.9);
  assert.equal(r.linhas[1].documento, "0001");
  assert.equal(r.linhas[2].descricao, "PIX ENVIADO FORNECEDOR X");
  assert.equal(r.saldo_final, 3437.1);
  assert.equal(r.saldo_final_em, "2026-09-30");
  assert.equal(r.final_conta, "3456");
  assert.equal(r.de, "2026-09-05");
  assert.equal(codificacaoOFX(OFX), "windows-1252");
  assert.throws(() => lerOFX("data;valor"), /OFX/);
});

test("CSV estilo Itaú: ponto e vírgula, linhas de SALDO viram o saldo final (não lançamento)", () => {
  const csv = "Extrato conta corrente\nAgência 0000 Conta 00000-0\ndata;lançamento;ag./origem;valor (R$);saldo (R$)\n01/09/2026;SALDO ANTERIOR;;;1.000,00\n05/09/2026;PIX TRANSF CLIENTE;;2.500,00;\n05/09/2026;SALDO DO DIA;;;3.500,00\n10/09/2026;TAR PACOTE;;-12,90;\n10/09/2026;PIX ENVIADO;;-50,00;\n10/09/2026;PIX ENVIADO;;-50,00;\n10/09/2026;SALDO DO DIA;;;3.387,10\n";
  const r = lerCSV(csv);
  assert.equal(r.linhas.length, 4);
  assert.deepEqual(r.linhas.map((l) => l.valor), [2500, -12.9, -50, -50]);
  assert.deepEqual(r.linhas.slice(2).map((l) => l.seq), [1, 2], "dois PIX iguais no mesmo dia ficam distintos");
  assert.equal(r.saldo_final, 3387.1);
  assert.equal(r.saldo_final_em, "2026-09-10");
});

test("CSV Nubank (vírgula, ponto decimal, identificador)", () => {
  const r = lerCSV("Data,Valor,Identificador,Descrição\n05/09/2026,2500.00,abc-1,Transferência recebida pelo Pix - CLIENTE\n06/09/2026,-89.90,abc-2,Compra no débito - LOJA\n");
  assert.equal(r.linhas.length, 2);
  assert.equal(r.linhas[0].valor, 2500);
  assert.equal(r.linhas[1].valor, -89.9);
  assert.equal(r.linhas[0].documento, "abc-1");
  assert.match(r.linhas[1].descricao, /LOJA/);
});

test("CSV com colunas de crédito e débito (estilo Bradesco)", () => {
  const r = lerCSV("Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)\n05/09/2026;Transferencia PIX;123;2.500,00;;3.500,00\n06/09/2026;Pagto Boleto;456;;300,00;3.200,00\n");
  assert.deepEqual(r.linhas.map((l) => [l.valor, l.documento]), [[2500, "123"], [-300, "456"]]);
  assert.equal(r.saldo_final, 3200);
  assert.equal(r.saldo_final_em, "2026-09-06");
});

test("CSV sem cabeçalho reconhecível pede o mapa de colunas; com o mapa, lê", () => {
  const csv = "05/09/2026|x;Recebimento;2500,00\n06/09/2026|x;Tarifa;-12,90\n".replace(/\|x/g, "");
  const r = lerCSV(csv);
  assert.equal(r.precisaMapa, true);
  const r2 = lerCSV(csv, { data: 0, descricao: 1, valor: 2 });
  assert.deepEqual(r2.linhas.map((l) => l.valor), [2500, -12.9]);
});

test("resumo e sequência", () => {
  const ls = sequenciar([{ data: "2026-09-01", valor: 10, descricao: "A" }, { data: "2026-09-01", valor: 10, descricao: "a " }]);
  assert.deepEqual(ls.map((l) => l.seq), [1, 2]);
  assert.deepEqual(resumoExtrato([{ valor: 100 }, { valor: -30.5 }]), { quantidade: 2, entradas: 100, saidas: -30.5, liquido: 69.5 });
});
