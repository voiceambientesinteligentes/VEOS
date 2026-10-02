-- Plano da VOICE: transicoes de estado, edicao com historico, imutabilidade e secoes novas do formulario.
-- Tudo desfeito no fim.
begin;
create temp table _r (ok boolean, caso text) on commit drop;
create temp table _i (id uuid) on commit drop;
with x as (insert into public.plano_itens (area, fase, tipo, titulo, descricao, origem, criado_por)
  values ('financas', '0-30', 'rotina', '[TESTE] Fluxo de caixa semanal', 'TESTE', 'TESTE', '00000000-0000-0000-0000-000000000001') returning id, codigo)
insert into _i select id from x;
insert into _r select (select codigo ~ '^PL-[0-9]{3,}$' from public.plano_itens where id = (select id from _i)), 'codigo PL-xxx gerado';
select public.plano_mudar(jsonb_build_object('item_id', (select id from _i), 'estado', 'aprovado', 'usuario', '00000000-0000-0000-0000-000000000001'));
insert into _r select (select estado = 'aprovado' from public.plano_itens where id = (select id from _i)), 'proposto -> aprovado';
do $$ begin
  begin perform public.plano_mudar(jsonb_build_object('item_id', (select id from _i), 'estado', 'proposto', 'usuario', '00000000-0000-0000-0000-000000000001')); insert into _r values (false, 'voltar a proposto deveria falhar');
  exception when others then insert into _r values (true, 'transicao invalida recusada'); end;
  begin perform public.plano_mudar(jsonb_build_object('item_id', (select id from _i), 'campos', jsonb_build_object('estado', 'feito'), 'usuario', '00000000-0000-0000-0000-000000000001')); insert into _r values (false, 'campo nao editavel aceito');
  exception when others then insert into _r values (true, 'campo nao editavel recusado'); end;
  begin perform public.plano_mudar(jsonb_build_object('item_id', (select id from _i), 'usuario', '00000000-0000-0000-0000-000000000001')); insert into _r values (false, 'mudanca vazia aceita');
  exception when others then insert into _r values (true, 'mudanca vazia recusada'); end;
end $$;
select public.plano_mudar(jsonb_build_object('item_id', (select id from _i), 'campos', jsonb_build_object('alvo', 'nunca negativo', 'prazo', '2026-10-31'), 'nota', 'ajuste', 'usuario', '00000000-0000-0000-0000-000000000001'));
insert into _r select (select alvo = 'nunca negativo' and prazo = '2026-10-31' from public.plano_itens where id = (select id from _i)), 'edicao de alvo e prazo';
select public.plano_mudar(jsonb_build_object('item_id', (select id from _i), 'estado', 'feito', 'usuario', '00000000-0000-0000-0000-000000000001'));
insert into _r select (select count(*) = 3 from public.plano_historico where item_id = (select id from _i)), 'historico: aprovado, edicao, feito';
insert into _r select (select de -> 'alvo' = 'null'::jsonb from public.plano_historico where item_id = (select id from _i) and acao = 'edicao'), 'historico guarda o valor anterior';
do $$ begin
  begin update public.plano_historico set nota = 'x' where item_id = (select id from _i); insert into _r values (false, 'historico alteravel');
  exception when others then insert into _r values (true, 'historico imutavel'); end;
  begin insert into public.formulario_respostas (secao, dados, autor) values ('tempos', '{"itens":[]}', '00000000-0000-0000-0000-000000000001'); insert into public.formulario_respostas (secao, dados, autor) values ('voce', '{}', '00000000-0000-0000-0000-000000000001'); insert into _r values (true, 'secoes tempos e voce aceitas');
  exception when others then insert into _r values (false, 'secoes novas recusadas'); end;
end $$;
insert into _r select not has_function_privilege('anon', 'public.plano_mudar(jsonb)', 'execute'), 'anon nao executa plano_mudar';
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(caso, '; ') filter (where not ok) as falhas from _r;
rollback;
