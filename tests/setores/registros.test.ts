import assert from "node:assert/strict";
import { test } from "node:test";

import type { Setor } from "../../supabase/functions/_shared/setores/motor.ts";
import { RegistroInvalido, tipoDoSetor, validarRegistro } from "../../supabase/functions/_shared/setores/registros.ts";

const SETOR = {
  id: "vendas", sigla: "CSO", nome: "Comercial", missao: "", diretor: { nome: "P", titulo: "D" }, sentinelas: [],
  equipe: [{ papel: "consultor", nome: "Consultor" }, { papel: "sdr", nome: "SDR" }],
  registros: [{
    tipo: "lead", nome: "Lead", responsavel: "sdr", estados: ["novo", "contatado", "descartado"], estado_inicial: "novo", estados_finais: ["descartado"],
    campos: [
      { id: "origem", rotulo: "Origem", tipo: "opcao", opcoes: ["arquiteto", "site"], obrigatorio: true },
      { id: "email", rotulo: "E-mail", tipo: "email" },
      { id: "valor_estimado", rotulo: "Valor estimado", tipo: "dinheiro" },
      { id: "visita", rotulo: "Visita", tipo: "data" },
      { id: "vip", rotulo: "VIP", tipo: "sim_nao" },
    ],
  }],
} as unknown as Setor;
const T = tipoDoSetor(SETOR, "lead");

test("criacao aplica padroes e normaliza", () => {
  const r = validarRegistro(SETOR, T, { titulo: "  Casa Jardins ", dados: { origem: "arquiteto", email: "A@B.COM", vip: true } }, null);
  assert.deepEqual(r, { titulo: "Casa Jardins", estado: "novo", responsavel: "sdr", dados: { origem: "arquiteto", email: "a@b.com", vip: true } });
});

test("alteracao parcial preserva dados existentes e remove campo vazio", () => {
  const existente = { dados: { origem: "site", email: "x@y.com" } };
  const r = validarRegistro(SETOR, T, { estado: "contatado", dados: { email: "", valor_estimado: "150000.00" } }, existente);
  assert.deepEqual(r, { estado: "contatado", dados: { origem: "site", valor_estimado: "150000.00" } });
});

test("recusas", () => {
  const casos = [
    [{ titulo: "x", dados: {} }, "Origem: obrigatório"],
    [{ titulo: "x", dados: { origem: "instagram" } }, "escolha uma das opções"],
    [{ titulo: "x", estado: "ganho", dados: { origem: "site" } }, "estado inválido"],
    [{ titulo: "x", responsavel: "gerente", dados: { origem: "site" } }, "responsável inválido"],
    [{ titulo: "x", dados: { origem: "site", valor_estimado: "1.234,00" } }, "reais no formato"],
    [{ titulo: "x", dados: { origem: "site", visita: "31/12/2026" } }, "data inválida"],
    [{ titulo: "x", dados: { origem: "site", cpf: "1" } }, "campos inexistentes"],
    [{ titulo: "x", senha: "1", dados: { origem: "site" } }, "campos desconhecidos"],
    [{ titulo: "", dados: { origem: "site" } }, "título"],
  ] as const;
  for (const [entrada, msg] of casos) {
    assert.throws(() => validarRegistro(SETOR, T, entrada as Record<string, unknown>, null), (e) => e instanceof RegistroInvalido && e.message.includes(msg), msg);
  }
  assert.throws(() => tipoDoSetor(SETOR, "obra"), RegistroInvalido);
});
