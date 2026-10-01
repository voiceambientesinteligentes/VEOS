-- Testes da SAUDE DO SISTEMA e da vigia SIS_* (tudo desfeito no fim).
-- Uso: npx supabase db query --linked -f tests/banco/sistema.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare s jsonb; v jsonb; codigos text[];
begin
  s := public.sistema_saude();
  insert into resultado (passo, ok, detalhe) values ('1. retrato traz banco, tabelas, Zoho, agendamentos, HTTP, varreduras, usuários e alertas',
    (s ->> 'banco_bytes')::bigint > 0 and jsonb_array_length(s -> 'tabelas') > 0 and s ? 'zoho_modulos' and s ? 'agendamentos' and s ? 'http_6h' and s ? 'varreduras' and (s -> 'usuarios' ->> 'membros_ativos')::int >= 1 and jsonb_typeof(s -> 'alertas') = 'array',
    left(s::text, 300));
  insert into resultado (passo, ok, detalhe) values ('2. agendamentos incluem a sincronização do Zoho e a vigia da saúde',
    (select count(*) = 2 from jsonb_array_elements(s -> 'agendamentos') x where x ->> 'nome' in ('veos-zoho-sync', 'veos-saude-sistema')), (s -> 'agendamentos')::text);

  -- cenario: Zoho conectado, sincronizacao parada ha 1 h e um modulo com erro
  if not exists (select 1 from public.integracoes where id = 'zoho') then
    insert into public.integracoes (id, refresh_token, api_domain, accounts_server, escopos, conectado_por) values ('zoho', 'TESTE', 'https://www.zohoapis.com', 'https://accounts.zoho.com', 'TESTE', (select user_id from public.membros limit 1));
  end if;
  insert into public.zoho_sync (produto, modulo, estado, erro, ultima_execucao_em) values ('books', 'teste_modulo', 'erro', 'TESTE falha 401', now() - interval '2 hours') on conflict (produto, modulo) do update set estado = 'erro', erro = 'TESTE falha 401';
  update public.zoho_sync set ultima_execucao_em = now() - interval '1 hour';
  v := public.sistema_vigiar();
  select array_agg(chave order by chave) into codigos from public.alertas where sentinela like 'SIS\_%' and estado = 'ativo';
  insert into resultado (passo, ok, detalhe) values ('3. sincronização parada e módulo com erro geram alertas no setor Tecnologia',
    'SIS_ZOHO_SYNC_PARADO' = any (codigos) and 'SIS_ZOHO_MODULO_ERRO:books.teste_modulo' = any (codigos)
      and (select bool_and(setor_id = 'tecnologia') from public.alertas where sentinela like 'SIS\_%'), v::text || ' ' || codigos::text);
  v := public.sistema_vigiar();
  insert into resultado (passo, ok, detalhe) values ('4. rodar de novo não duplica nem altera (idempotente)', (v ->> 'alterados')::int = 0 and (v ->> 'resolvidos')::int = 0, v::text);

  -- normaliza: sincronizacao em dia e modulo ok -> alertas resolvidos sozinhos
  update public.zoho_sync set ultima_execucao_em = now(), estado = 'ok', erro = null;
  v := public.sistema_vigiar();
  insert into resultado (passo, ok, detalhe) values ('5. situação normalizada resolve os alertas sozinha',
    (select count(*) = 0 from public.alertas where chave in ('SIS_ZOHO_SYNC_PARADO', 'SIS_ZOHO_MODULO_ERRO:books.teste_modulo') and estado <> 'resolvido'), v::text);
  update public.zoho_sync set ultima_execucao_em = now() - interval '1 hour';
  perform public.sistema_vigiar();
  insert into resultado (passo, ok, detalhe) values ('6. problema que volta reativa o mesmo alerta (sem duplicar)',
    (select count(*) = 1 and bool_and(estado = 'ativo' and resolvido_em is null) from public.alertas where chave = 'SIS_ZOHO_SYNC_PARADO'), null);

  s := public.sistema_saude(now() + interval '30 hours');
  insert into resultado (passo, ok, detalhe) values ('7. sem varredura há mais de 26 h gera alerta',
    exists (select 1 from jsonb_array_elements(s -> 'alertas') x where x ->> 'codigo' = 'SIS_VARREDURA_PARADA'), null);
  insert into resultado (passo, ok, detalhe) values ('8. só o servidor executa (anon e authenticated sem permissão)',
    not has_function_privilege('anon', 'public.sistema_saude(timestamptz)', 'execute') and not has_function_privilege('authenticated', 'public.sistema_vigiar(timestamptz)', 'execute'), null);
end $$;

select n, passo, ok, left(detalhe, 220) as detalhe from resultado order by n;
rollback;
