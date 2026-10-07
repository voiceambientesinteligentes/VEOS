-- Motor de IA: nova tentativa automatica. O nivel gratuito do Gemini fica sobrecarregado as vezes
-- (503) ou sem cota (429); a pergunta volta para a fila com o motivo e, a cada 5 minutos, a funcao
-- ia-fila tenta UMA pergunta de novo (a mais antiga), ate 5 tentativas. Perguntas feitas antes de haver
-- motor (ia_tentativas = 0) tambem sao atendidas. Erro que nao passa sozinho (sem acesso, chave
-- invalida) nao e repetido.
alter table public.perguntas_diretores add column ia_falhou_em timestamptz;

create or replace function public.pergunta_ia_liberar(p_id uuid, p_erro text) returns void language sql set search_path = '' as $$
  update public.perguntas_diretores set ia_inicio = null, ia_erro = left(p_erro, 500), ia_falhou_em = now() where id = p_id and estado = 'pendente';
$$;
revoke execute on function public.pergunta_ia_liberar(uuid, text) from public, anon, authenticated;

/** Proxima pergunta a retomar: pendente, sem analise em curso, falha passageira ha mais de 5 min (ou nunca tentada), ate 5 tentativas, dos ultimos 7 dias. */
create function public.pergunta_ia_proxima() returns uuid language sql stable set search_path = '' as $$
  select id from public.perguntas_diretores
  where estado = 'pendente' and ia_tentativas < 5 and criada_em > now() - interval '7 days'
    and (ia_inicio is null or ia_inicio < now() - interval '4 minutes')
    and (ia_tentativas = 0 or (ia_falhou_em < now() - interval '5 minutes'
         and ia_erro ~* '(503|429|demand|quota|exhaust|overload|timed out|sem resposta|504|500|502)'
         and ia_erro !~* '(sem acesso|api[_ ]?key|401|403)'))
  order by criada_em
  limit 1
$$;
revoke execute on function public.pergunta_ia_proxima() from public, anon, authenticated;

-- a cada 5 minutos, com a chave PUBLICA (a funcao nao devolve dados de negocio, so contagens)
select cron.schedule(
  'veos-ia-fila',
  '*/5 * * * *',
  $$select net.http_post(
      url := 'https://vkrwxvnfstvriibjwuvw.supabase.co/functions/v1/ia-fila',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcnd4dm5mc3R2cmlpYmp3dXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzQ1MzMsImV4cCI6MjEwNjM1MDUzM30.Xy5ZriNrN5u6lUYOXOMJ1HLcwPTyeoEGKNE3yLWp-B0', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcnd4dm5mc3R2cmlpYmp3dXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzQ1MzMsImV4cCI6MjEwNjM1MDUzM30.Xy5ZriNrN5u6lUYOXOMJ1HLcwPTyeoEGKNE3yLWp-B0'),
      body := '{}'::jsonb,
      timeout_milliseconds := 150000
    )$$
);
