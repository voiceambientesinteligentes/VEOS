-- SAUDE DO SISTEMA (P0): retrato do funcionamento do VEOS para a tela Sistema -> Saude e a
-- vigia SIS_*: tamanho do banco e do armazenamento (limites do plano gratuito), sincronizacao do
-- Zoho (estado por modulo, chamadas e erros em 24 h), agendamentos (pg_cron), chamadas HTTP do
-- agendador (pg_net), varreduras e usuarios. Nao devolve dados de negocio.
-- Tudo no banco: a vigia roda pelo pg_cron sem chamada HTTP (nenhuma chave no agendamento).
-- Security definer: le os esquemas cron/net/storage/auth; execucao so pelo servidor.

-- Limites do plano Free do Supabase (supabase.com/pricing, conferido em 01/10/2026).
create function public.sistema_limites() returns jsonb language sql immutable as $$
  select jsonb_build_object('banco_bytes', 500 * 1024 * 1024, 'armazenamento_bytes', 1024 * 1024 * 1024)
$$;

create function public.sistema_saude(p_agora timestamptz default now()) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; lim jsonb := public.sistema_limites(); al jsonb := '[]'; m jsonb; v_arm bigint; v_ult timestamptz;
begin
  select jsonb_build_object(
    'agora', p_agora,
    'limites', lim,
    'banco_bytes', pg_database_size(current_database()),
    'tabelas', (select coalesce(jsonb_agg(jsonb_build_object('tabela', t.relname, 'bytes', t.bytes, 'linhas', greatest(t.linhas, 0)) order by t.bytes desc), '[]'::jsonb)
      from (select c.relname, pg_total_relation_size(c.oid) as bytes, c.reltuples::bigint as linhas from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' order by 2 desc limit 10) t),
    'armazenamento', (select coalesce(jsonb_agg(jsonb_build_object('bucket', s.bucket_id, 'arquivos', s.arquivos, 'bytes', s.bytes)), '[]'::jsonb)
      from (select bucket_id, count(*) as arquivos, coalesce(sum((metadata ->> 'size')::bigint), 0) as bytes from storage.objects group by bucket_id) s),
    'zoho_conectado', exists (select 1 from public.integracoes where id = 'zoho'),
    'zoho_modulos', (select coalesce(jsonb_agg(jsonb_build_object('produto', produto, 'modulo', modulo, 'estado', estado, 'total', total, 'ultima_execucao_em', ultima_execucao_em,
        'ultima_volta_em', ultima_volta_em, 'erro', left(erro, 300)) order by produto, modulo), '[]'::jsonb) from public.zoho_sync),
    'zoho_24h', (select jsonb_build_object('rodadas', count(*), 'chamadas', coalesce(sum(chamadas), 0), 'gravados', coalesce(sum(gravados), 0),
        'rodadas_com_erro', count(*) filter (where jsonb_array_length(erros) > 0), 'ultima_em', max(em))
      from public.zoho_sync_log where em > p_agora - interval '24 hours'),
    'zoho_erros', (select coalesce(jsonb_agg(jsonb_build_object('em', e.em, 'erros', e.erros)), '[]'::jsonb)
      from (select em, (select jsonb_agg(left(x::text, 300)) from jsonb_array_elements(erros) x) as erros from public.zoho_sync_log
            where jsonb_array_length(erros) > 0 order by id desc limit 5) e),
    'agendamentos', (select coalesce(jsonb_agg(jsonb_build_object('nome', j.jobname, 'quando', j.schedule, 'ativo', j.active,
        'ultima', (select jsonb_build_object('status', d.status, 'inicio', d.start_time, 'fim', d.end_time, 'mensagem', left(d.return_message, 200))
                   from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1),
        'falhas_24h', (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed' and d.start_time > p_agora - interval '24 hours')) order by j.jobname), '[]'::jsonb)
      from cron.job j),
    'http_6h', (select jsonb_build_object('total', count(*), 'falhas', count(*) filter (where error_msg is not null or status_code >= 400 or timed_out),
        'ultima_falha', (select jsonb_build_object('em', created, 'status', status_code, 'erro', left(coalesce(error_msg, ''), 200)) from net._http_response
                         where error_msg is not null or status_code >= 400 or timed_out order by created desc limit 1))
      from net._http_response),
    'varreduras', (select coalesce(jsonb_agg(jsonb_build_object('em', v.em, 'origem', v.origem, 'novos', v.novos, 'resolvidos', v.resolvidos, 'ativos', v.alertas_ativos, 'ms', v.ms)), '[]'::jsonb)
      from (select * from public.varreduras order by id desc limit 3) v),
    'usuarios', jsonb_build_object('contas', (select count(*) from auth.users), 'membros_ativos', (select count(*) from public.membros where ativo))
  ) into r;

  -- Alertas (mesma regra para a tela e para a vigia). Limiares tecnicos, nao politica de negocio.
  if (r ->> 'banco_bytes')::bigint > 0.8 * (lim ->> 'banco_bytes')::bigint then
    al := al || jsonb_build_object('codigo', 'SIS_BANCO_LIMITE', 'chave', 'SIS_BANCO_LIMITE', 'severidade', case when (r ->> 'banco_bytes')::bigint > 0.95 * (lim ->> 'banco_bytes')::bigint then 'CRITICO' else 'ALTO' end,
      'titulo', 'Banco perto do limite do plano gratuito', 'mensagem', format('O banco usa %s MB de 500 MB. Acima do limite o Supabase pode deixar o banco somente leitura. Revise as maiores tabelas na tela Saúde do sistema.', round((r ->> 'banco_bytes')::numeric / 1048576)));
  end if;
  select coalesce(sum((x ->> 'bytes')::bigint), 0) into v_arm from jsonb_array_elements(r -> 'armazenamento') x;
  if v_arm > 0.8 * (lim ->> 'armazenamento_bytes')::bigint then
    al := al || jsonb_build_object('codigo', 'SIS_ARMAZENAMENTO_LIMITE', 'chave', 'SIS_ARMAZENAMENTO_LIMITE', 'severidade', 'ALTO',
      'titulo', 'Arquivos perto do limite do plano gratuito', 'mensagem', format('Os anexos ocupam %s MB de 1024 MB.', round(v_arm::numeric / 1048576)));
  end if;
  if (r ->> 'zoho_conectado')::boolean then
    select max((x ->> 'ultima_execucao_em')::timestamptz) into v_ult from jsonb_array_elements(r -> 'zoho_modulos') x;
    if v_ult is null or v_ult < p_agora - interval '15 minutes' then
      al := al || jsonb_build_object('codigo', 'SIS_ZOHO_SYNC_PARADO', 'chave', 'SIS_ZOHO_SYNC_PARADO', 'severidade', 'ALTO',
        'titulo', 'Sincronização do Zoho parada', 'mensagem', format('A última sincronização foi em %s (o normal é a cada 2 minutos). Confira o agendamento veos-zoho-sync e a conexão em Integrações.', coalesce(to_char(v_ult at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'), 'nunca')));
    end if;
    for m in select x from jsonb_array_elements(r -> 'zoho_modulos') x where x ->> 'estado' = 'erro' loop
      al := al || jsonb_build_object('codigo', 'SIS_ZOHO_MODULO_ERRO', 'chave', 'SIS_ZOHO_MODULO_ERRO:' || (m ->> 'produto') || '.' || (m ->> 'modulo'), 'severidade', 'MEDIO',
        'titulo', format('Zoho %s · %s com erro na sincronização', m ->> 'produto', m ->> 'modulo'), 'mensagem', coalesce(m ->> 'erro', 'sem detalhe'));
    end loop;
  end if;
  for m in select x from jsonb_array_elements(r -> 'agendamentos') x where (x ->> 'falhas_24h')::int > 0 or not (x ->> 'ativo')::boolean loop
    al := al || jsonb_build_object('codigo', 'SIS_AGENDAMENTO', 'chave', 'SIS_AGENDAMENTO:' || (m ->> 'nome'), 'severidade', 'MEDIO',
      'titulo', format('Agendamento %s %s', m ->> 'nome', case when (m ->> 'ativo')::boolean then 'com falhas' else 'desligado' end),
      'mensagem', format('%s falha(s) nas últimas 24 h. Última mensagem: %s', m ->> 'falhas_24h', coalesce(m -> 'ultima' ->> 'mensagem', '—')));
  end loop;
  if (r -> 'http_6h' ->> 'falhas')::int >= 3 then
    al := al || jsonb_build_object('codigo', 'SIS_HTTP_FALHAS', 'chave', 'SIS_HTTP_FALHAS', 'severidade', 'MEDIO',
      'titulo', 'Chamadas do agendador falhando', 'mensagem', format('%s de %s chamadas falharam nas últimas 6 h. Última: %s', r -> 'http_6h' ->> 'falhas', r -> 'http_6h' ->> 'total', coalesce(r -> 'http_6h' -> 'ultima_falha' ->> 'erro', r -> 'http_6h' -> 'ultima_falha' ->> 'status', '—')));
  end if;
  if not exists (select 1 from public.varreduras where em > p_agora - interval '26 hours') then
    al := al || jsonb_build_object('codigo', 'SIS_VARREDURA_PARADA', 'chave', 'SIS_VARREDURA_PARADA', 'severidade', 'MEDIO',
      'titulo', 'Varredura dos setores parada', 'mensagem', 'Nenhuma varredura das regras vivas nas últimas 26 h. Confira o GitHub Actions manter-supabase-ativo e a função saude.');
  end if;
  return r || jsonb_build_object('alertas', al);
end $$;

-- Vigia SIS_*: cria/reativa/atualiza/resolve os alertas do setor Tecnologia (CIO). Idempotente.
create function public.sistema_vigiar(p_agora timestamptz default now()) returns jsonb language plpgsql security definer set search_path = '' as $$
declare al jsonb := public.sistema_saude(p_agora) -> 'alertas'; a jsonb; v_novos int := 0; v_resolvidos int;
begin
  for a in select x from jsonb_array_elements(al) x loop
    insert into public.alertas (chave, setor_id, sentinela, severidade, titulo, mensagem, fonte, notificar)
    values (a ->> 'chave', 'tecnologia', a ->> 'codigo', (a ->> 'severidade')::public.severidade, a ->> 'titulo', left(a ->> 'mensagem', 2000), 'Saúde do sistema (vigia SIS_*)', array['CIO'])
    on conflict (chave) do update set severidade = excluded.severidade, titulo = excluded.titulo, mensagem = excluded.mensagem,
      estado = case when public.alertas.estado = 'resolvido' then 'ativo' else public.alertas.estado end,
      resolvido_em = case when public.alertas.estado = 'resolvido' then null else public.alertas.resolvido_em end, atualizado_em = p_agora
    where public.alertas.estado = 'resolvido'
       or (public.alertas.severidade, public.alertas.titulo, public.alertas.mensagem) is distinct from (excluded.severidade, excluded.titulo, excluded.mensagem);
    if found then v_novos := v_novos + 1; end if;
  end loop;
  update public.alertas set estado = 'resolvido', resolvido_em = p_agora, atualizado_em = p_agora
  where sentinela like 'SIS\_%' and estado <> 'resolvido' and not (chave = any (select x ->> 'chave' from jsonb_array_elements(al) x));
  get diagnostics v_resolvidos = row_count;
  return jsonb_build_object('ativos', jsonb_array_length(al), 'alterados', v_novos, 'resolvidos', v_resolvidos);
end $$;

revoke execute on function public.sistema_limites(), public.sistema_saude(timestamptz), public.sistema_vigiar(timestamptz) from public, anon, authenticated;

-- A cada 10 min, direto no banco (sem HTTP).
select cron.schedule('veos-saude-sistema', '*/10 * * * *', $$select public.sistema_vigiar()$$);
