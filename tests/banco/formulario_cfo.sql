-- Formulario do CFO: historico por secao, versao vigente, imutabilidade. Tudo desfeito no fim.
begin;
create temp table _r (ok boolean, caso text) on commit drop;
create temp table _antes on commit drop as select coalesce((select versoes from public.formulario_vigente('cfo') where secao = 'impostos'), 0) as n;
insert into public.formulario_respostas (secao, dados, autor) values ('impostos', '{"contador":"TESTE v1"}', '00000000-0000-0000-0000-000000000001');
insert into public.formulario_respostas (secao, dados, autor, em) values ('impostos', '{"contador":"TESTE v2"}', '00000000-0000-0000-0000-000000000001', now() + interval '1 second');
insert into _r select (select dados->>'contador' = 'TESTE v2' and versoes = (select n from _antes) + 2 from public.formulario_vigente('cfo') where secao = 'impostos'), 'vigente = ultima versao, com 2 versoes a mais';
do $$ begin
  begin update public.formulario_respostas set dados = '{}' where secao = 'impostos'; insert into _r values (false, 'update deveria falhar');
  exception when others then insert into _r values (true, 'update recusado (historico imutavel)'); end;
  begin delete from public.formulario_respostas where secao = 'impostos'; insert into _r values (false, 'delete deveria falhar');
  exception when others then insert into _r values (true, 'delete recusado'); end;
  begin insert into public.formulario_respostas (secao, dados, autor) values ('outra', '{}', '00000000-0000-0000-0000-000000000001'); insert into _r values (false, 'secao invalida aceita');
  exception when check_violation then insert into _r values (true, 'secao invalida recusada'); end;
  begin insert into public.formulario_respostas (secao, dados, autor) values ('fixos', '[1]', '00000000-0000-0000-0000-000000000001'); insert into _r values (false, 'dados nao-objeto aceitos');
  exception when check_violation then insert into _r values (true, 'dados precisam ser objeto'); end;
end $$;
insert into _r select not has_function_privilege('anon', 'public.formulario_vigente(text)', 'execute'), 'anon nao executa formulario_vigente';
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(caso, '; ') filter (where not ok) as falhas from _r;
rollback;
