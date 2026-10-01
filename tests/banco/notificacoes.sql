-- Testes da CAIXA DE SAIDA e do RESUMO DO DIA. Tudo desfeito no fim.
-- Uso: npx supabase db query --linked -f tests/banco/notificacoes.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare u uuid := '00000000-0000-0000-0000-000000090001'; m jsonb; m2 jsonb; erro text; r jsonb; antes jsonb;
begin
  antes := public.resumo_setor('financas');
  m := public.mensagem_criar(jsonb_build_object('chave', 'TESTE-M1', 'usuario', u, 'canal', 'whatsapp', 'destinatario', '47999990000', 'corpo', 'Lembrete TESTE', 'setor_id', 'financas', 'origem', 'alerta:TESTE'));
  m2 := public.mensagem_criar(jsonb_build_object('chave', 'TESTE-M1', 'usuario', u, 'canal', 'email', 'corpo', 'outro'));
  insert into resultado (passo, ok, detalhe) values ('1. rascunho criado; repetir a chave não duplica', (m2 ->> 'repetido')::boolean and m2 ->> 'id' = m ->> 'id'
    and (select estado = 'rascunho' from public.mensagens_saida where id = (m ->> 'id')::uuid), m::text);
  insert into resultado (passo, ok, detalhe) values ('2. resumo do setor conta o rascunho pendente',
    (public.resumo_setor('financas') ->> 'mensagens_rascunho')::int = (antes ->> 'mensagens_rascunho')::int + 1, null);
  r := public.mensagem_marcar((m ->> 'id')::uuid, 'enviada', u, null);
  insert into resultado (passo, ok, detalhe) values ('3. marcar como enviada registra quem e quando (envio humano)',
    (select estado = 'enviada' and enviada_por = u and enviada_em is not null from public.mensagens_saida where id = (m ->> 'id')::uuid), r::text);
  begin perform public.mensagem_marcar((m ->> 'id')::uuid, 'descartada', u, 'x'); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('4. mensagem enviada não volta nem é descartada', erro like '%ja enviada%', erro);
  m := public.mensagem_criar(jsonb_build_object('chave', 'TESTE-M2', 'usuario', u, 'canal', 'email', 'corpo', 'TESTE'));
  begin perform public.mensagem_marcar((m ->> 'id')::uuid, 'descartada', u, ' '); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('5. descartar exige motivo', erro like '%motivo%', erro);
  insert into public.tarefas (setor_id, titulo, prazo) values ('financas', 'TESTE atrasada', current_date - 2);
  r := public.resumo_setor('financas');
  insert into resultado (passo, ok, detalhe) values ('6. resumo lista tarefas atrasadas', exists (select 1 from jsonb_array_elements(r -> 'tarefas_atrasadas') x where x ->> 'titulo' = 'TESTE atrasada'), left(r::text, 200));
  begin update public.mensagens_historico set acao = 'x' where mensagem_id = (m ->> 'id')::uuid; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('7. trilha não pode ser alterada', erro is not null, erro);
  insert into resultado (passo, ok, detalhe) values ('8. só o servidor executa', not has_function_privilege('authenticated', 'public.mensagem_criar(jsonb)', 'execute'), null);
end $$;

select n, passo, ok, left(detalhe, 160) as detalhe from resultado order by n;
rollback;
