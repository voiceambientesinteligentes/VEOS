-- Motor de IA dos diretores: reserva unica por pergunta, liberacao com motivo, trilha e documentos
-- canonicos imutaveis, sem acesso publico. Tudo desfeito no fim.
begin;
create temp table _r (ok boolean, caso text) on commit drop;
insert into public.perguntas_diretores (id, setor_id, pergunta, autor) values ('99999999-0000-0000-0000-000000000001', 'financas', '[TESTE] motor de IA', '00000000-0000-0000-0000-000000000001');

insert into _r select public.pergunta_ia_reservar('99999999-0000-0000-0000-000000000001') ->> 'ia_tentativas' = '1', 'primeira reserva concedida (tentativa 1)';
insert into _r select public.pergunta_ia_reservar('99999999-0000-0000-0000-000000000001') is null, 'segunda reserva recusada enquanto a primeira vale';
select public.pergunta_ia_liberar('99999999-0000-0000-0000-000000000001', 'Gemini 429: cota');
insert into _r select (select ia_inicio is null and ia_erro = 'Gemini 429: cota' from public.perguntas_diretores where id = '99999999-0000-0000-0000-000000000001'), 'liberar guarda o motivo e solta a reserva';
insert into _r select public.pergunta_ia_reservar('99999999-0000-0000-0000-000000000001') ->> 'ia_erro' is null, 'nova reserva limpa o erro anterior';
update public.perguntas_diretores set ia_inicio = now() - interval '5 minutes' where id = '99999999-0000-0000-0000-000000000001';
insert into _r select public.pergunta_ia_reservar('99999999-0000-0000-0000-000000000001') is not null, 'reserva vencida (funcao caiu) pode ser retomada';
update public.perguntas_diretores set estado = 'respondida', ia_inicio = null where id = '99999999-0000-0000-0000-000000000001';
insert into _r select public.pergunta_ia_reservar('99999999-0000-0000-0000-000000000001') is null, 'pergunta respondida nao e reservada';

insert into public.ia_execucoes (pergunta_id, setor_id, provedor, modelo, ok, passos) values ('99999999-0000-0000-0000-000000000001', 'financas', 'gemini', 'gemini-x', true, '[{"ferramenta":"consultar_precedentes","ok":true}]');
insert into public.documentos_canonicos (codigo, titulo, texto, sha256, origem) values ('POL-TESTE', 'TESTE', repeat('texto da politica ', 10), repeat('a', 64), '04 - PADROES/teste.md');
do $$ begin
  begin update public.ia_execucoes set ok = false; insert into _r values (false, 'trilha alterada');
  exception when others then insert into _r values (true, 'trilha da IA imutavel (update)'); end;
  begin delete from public.ia_execucoes; insert into _r values (false, 'trilha apagada');
  exception when others then insert into _r values (true, 'trilha da IA imutavel (delete)'); end;
  begin update public.documentos_canonicos set texto = 'x' where codigo = 'POL-TESTE'; insert into _r values (false, 'politica alterada');
  exception when others then insert into _r values (true, 'texto canonico imutavel (nova versao = nova linha)'); end;
  begin insert into public.documentos_canonicos (codigo, titulo, texto, sha256, origem) values ('POL-TESTE', 'TESTE', repeat('outro texto ', 10), repeat('a', 64), 'x'); insert into _r values (false, 'mesmo hash duplicado');
  exception when unique_violation then insert into _r values (true, 'mesmo codigo + hash nao duplica'); end;
end $$;
insert into _r select not has_function_privilege('anon', 'public.pergunta_ia_reservar(uuid)', 'execute') and not has_function_privilege('authenticated', 'public.pergunta_ia_liberar(uuid, text)', 'execute'), 'anon/authenticated nao executam reserva e liberacao';
insert into _r select not has_table_privilege('anon', 'public.documentos_canonicos', 'select') or (select relrowsecurity from pg_class where oid = 'public.documentos_canonicos'::regclass), 'documentos canonicos com RLS (sem leitura publica)';
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(caso, '; ') filter (where not ok) as falhas from _r;
rollback;
