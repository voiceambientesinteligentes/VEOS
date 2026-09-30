-- Agendador: chama a funcao zoho-sync a cada 2 minutos (a propria funcao limita a uma rodada
-- a cada 90 s e pula quando o Zoho nao esta conectado). Usa a chave PUBLICA (anon), a mesma
-- do portal; a funcao nao devolve dados de negocio.
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'veos-zoho-sync',
  '*/2 * * * *',
  $$select net.http_post(
      url := 'https://vkrwxvnfstvriibjwuvw.supabase.co/functions/v1/zoho-sync',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcnd4dm5mc3R2cmlpYmp3dXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzQ1MzMsImV4cCI6MjEwNjM1MDUzM30.Xy5ZriNrN5u6lUYOXOMJ1HLcwPTyeoEGKNE3yLWp-B0', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcnd4dm5mc3R2cmlpYmp3dXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzQ1MzMsImV4cCI6MjEwNjM1MDUzM30.Xy5ZriNrN5u6lUYOXOMJ1HLcwPTyeoEGKNE3yLWp-B0'),
      body := '{}'::jsonb,
      timeout_milliseconds := 150000
    )$$
);
