// Conversas com os diretores: agrupamento por conversa e formatação da resposta.
import assert from "node:assert/strict";
import { test } from "node:test";
import { agruparConversas, blocosDaResposta } from "../../apps/web/js/domain/conversa.js";

test("a continuação fica dentro da conversa; mais recente primeiro; pendente marcado", () => {
  const c = agruparConversas([
    { id: "a", conversa_id: null, setor_id: "vendas", pergunta: "Como captar?", estado: "respondida", criada_em: "2026-11-04T10:00:00Z", respostas: [{ resposta: "R1", em: "2026-11-04T10:01:00Z" }] },
    { id: "b", conversa_id: "a", setor_id: "vendas", pergunta: "E o item 2?", estado: "pendente", criada_em: "2026-11-04T12:00:00Z", respostas: [] },
    { id: "c", conversa_id: null, setor_id: "financas", pergunta: "Margem?", estado: "respondida", criada_em: "2026-11-04T11:00:00Z", respostas: [{ resposta: "R3", em: "2026-11-04T11:01:00Z" }] },
  ]);
  assert.deepEqual(c.map((x) => x.id), ["a", "c"]);
  assert.deepEqual(c[0].turnos.map((t) => t.id), ["a", "b"]);
  assert.equal(c[0].pendente, true);
  assert.equal(c[0].titulo, "Como captar?");
  assert.equal(c[1].pendente, false);
});

test("resposta vira títulos, parágrafos, listas, aviso e conferência", () => {
  const b = blocosDaResposta("ATENÇÃO (conferência do VEOS): sem dados.\n\nRESUMO\nComece pelos arquitetos.\n---\n1. SEGMENTAÇÃO DE CLIENTES:\n• Item A\n- Item B\n2) Item C\nPróximos passos:\nTexto.\nBase: Política V1.\n\nConferência automática do VEOS: 68,0%.");
  assert.deepEqual(b.map((x) => x.tipo), ["aviso", "titulo", "paragrafo", "titulo", "lista", "titulo", "paragrafo", "base", "conferencia"]);
  assert.equal(b[3].texto, "SEGMENTAÇÃO DE CLIENTES");
  assert.deepEqual(b[4].itens, ["Item A", "Item B", "Item C"]);
});
