-- Contratos de suporte / receita recorrente (05/11/2026). Tudo desfeito. Uso:
-- npx supabase db query --linked -f tests/banco/contratos_suporte.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare s_ult bigint; s_cham boolean; st_ult bigint; st_cham boolean;
  robo uuid := '00000000-0000-0000-0000-0000000c0b01'; u uuid := '00000000-0000-0000-0000-0000000c0b02'; erro text; r jsonb; c1 uuid; c2 uuid; cob uuid; n integer;
begin
  select last_value, is_called into s_ult, s_cham from public.contrato_suporte_codigo_seq;
  select last_value, is_called into st_ult, st_cham from public.contrato_suporte_codigo_teste_seq;
  insert into auth.users (id, email, aud, role) values (robo, 'robo-sup@veos-teste.invalid', 'authenticated', 'authenticated'), (u, 'pessoa.sup@exemplo.com', 'authenticated', 'authenticated');

  r := public.contrato_suporte_salvar(jsonb_build_object('chave', 'TESTE-SUP-1', 'usuario', robo, 'dados', jsonb_build_object('cliente_nome', 'Cliente TESTE Suporte', 'descricao', 'Suporte mensal', 'valor_mensal', 1200, 'dia_vencimento', 10, 'inicio', current_date - 400)));
  c1 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('1. cria contrato (robo usa SUP-T) e gera 7 cobrancas a partir do mes atual, sem meses passados',
    (r ->> 'codigo') ~ '^SUP-T[0-9]{5}$' and (select count(*) = 7 and min(competencia) = date_trunc('month', current_date)::date from public.contrato_cobrancas where contrato_id = c1), r::text);
  r := public.contrato_suporte_salvar(jsonb_build_object('chave', 'TESTE-SUP-1', 'usuario', robo, 'dados', jsonb_build_object('cliente_nome', 'Outro')));
  insert into resultado (passo, ok, detalhe) values ('2. mesma chave nao duplica', (r ->> 'repetido')::boolean and (select count(*) = 1 from public.contratos_suporte where chave = 'TESTE-SUP-1'), r::text);
  n := public.contrato_cobrancas_gerar();
  insert into resultado (passo, ok, detalhe) values ('3. gerar de novo e idempotente', n = 0 and (select count(*) = 7 from public.contrato_cobrancas where contrato_id = c1), n::text);

  begin perform public.contrato_suporte_salvar(jsonb_build_object('chave', 'TESTE-SUP-X', 'usuario', robo, 'dados', jsonb_build_object('cliente_nome', 'X', 'descricao', 'Y Y', 'valor_mensal', 0, 'inicio', current_date))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('4. valor zero e recusado', erro is not null, erro);
  begin perform public.contrato_suporte_salvar(jsonb_build_object('chave', 'TESTE-SUP-Y', 'usuario', robo, 'dados', jsonb_build_object('cliente_nome', 'X', 'descricao', 'Y Y', 'valor_mensal', 10, 'dia_vencimento', 31, 'inicio', current_date))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('5. dia de vencimento 31 e recusado (1 a 28)', erro is not null, erro);

  perform public.contrato_suporte_salvar(jsonb_build_object('id', c1, 'usuario', robo, 'dados', jsonb_build_object('valor_mensal', 1500)));
  insert into resultado (passo, ok, detalhe) values ('6. reajuste: cobrancas abertas passam ao novo valor', (select count(*) filter (where valor = 1500) = 7 from public.contrato_cobrancas where contrato_id = c1), null);

  -- contrato com fim: so gera ate o fim
  r := public.contrato_suporte_salvar(jsonb_build_object('chave', 'TESTE-SUP-2', 'usuario', u, 'dados', jsonb_build_object('cliente_nome', 'Cliente Real Suporte', 'descricao', 'Suporte trimestral', 'valor_mensal', 800, 'inicio', date_trunc('month', current_date)::date, 'fim', (date_trunc('month', current_date) + interval '2 months' + interval '27 days')::date)));
  c2 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('7. contrato com fim gera so os 3 meses e pessoa real usa SUP-', (r ->> 'codigo') ~ '^SUP-[0-9]{5}$' and (select count(*) = 3 from public.contrato_cobrancas where contrato_id = c2), r::text);

  -- receber
  select id into cob from public.contrato_cobrancas where contrato_id = c1 order by competencia limit 1;
  begin perform public.contrato_cobranca_receber(jsonb_build_object('cobranca', cob, 'data', current_date + 5, 'valor', 1500, 'usuario', robo)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('8. recebimento com data futura e recusado', erro like '%futuro%', erro);
  r := public.contrato_cobranca_receber(jsonb_build_object('cobranca', cob, 'data', current_date, 'valor', 1500, 'usuario', robo));
  insert into resultado (passo, ok, detalhe) values ('9. recebe a cobranca e repetir nao duplica',
    (r ->> 'estado') = 'recebida' and ((public.contrato_cobranca_receber(jsonb_build_object('cobranca', cob, 'data', current_date, 'valor', 1500, 'usuario', robo))) ->> 'repetido')::boolean
    and (select estado = 'recebida' and valor_recebido = 1500 from public.contrato_cobrancas where id = cob), r::text);

  -- suspender cancela as abertas; reativar volta a gerar
  perform public.contrato_suporte_salvar(jsonb_build_object('id', c1, 'usuario', robo, 'dados', jsonb_build_object('estado', 'suspenso')));
  insert into resultado (passo, ok, detalhe) values ('10. suspender cancela as cobrancas abertas e mantem a recebida',
    (select count(*) filter (where estado = 'cancelada') = 6 and count(*) filter (where estado = 'recebida') = 1 from public.contrato_cobrancas where contrato_id = c1), null);
  perform public.contrato_suporte_salvar(jsonb_build_object('id', c1, 'usuario', robo, 'dados', jsonb_build_object('estado', 'ativo')));
  insert into resultado (passo, ok, detalhe) values ('11. reativar reabre as cobrancas dos meses que ainda nao passaram',
    (select count(*) filter (where estado = 'aberta') = 6 and count(*) filter (where estado = 'recebida') = 1 from public.contrato_cobrancas where contrato_id = c1), null);

  perform public.contrato_suporte_salvar(jsonb_build_object('id', c2, 'usuario', u, 'dados', jsonb_build_object('estado', 'encerrado')));
  begin perform public.contrato_suporte_salvar(jsonb_build_object('id', c2, 'usuario', u, 'dados', jsonb_build_object('valor_mensal', 5))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('12. encerrado cancela as abertas e nao pode mais ser alterado',
    erro like '%encerrado%' and (select count(*) filter (where estado = 'aberta') = 0 from public.contrato_cobrancas where contrato_id = c2), erro);
  begin delete from public.contratos_suporte_historico where contrato_id = c1; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('13. historico e append-only', erro is not null, erro);

  perform setval('public.contrato_suporte_codigo_seq', s_ult, s_cham);
  perform setval('public.contrato_suporte_codigo_teste_seq', st_ult, st_cham);
end $$;

insert into resultado (passo, ok, detalhe) select '14. anon e usuarios logados nao executam as funcoes direto, tabelas sem policy',
  not has_function_privilege('anon', 'public.contrato_suporte_salvar(jsonb)', 'execute') and not has_function_privilege('authenticated', 'public.contrato_cobranca_receber(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.contrato_cobrancas_gerar(date, date)', 'execute')
  and not exists (select 1 from pg_policies where tablename in ('contratos_suporte', 'contrato_cobrancas', 'contratos_suporte_historico')), null;
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
