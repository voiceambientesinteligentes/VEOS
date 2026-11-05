-- A varredura das regras vivas (funcao saude) so rodava 1x por dia (GitHub Actions) e ao abrir o Radar.
-- Agora roda a cada 10 minutos pelo proprio banco (a funcao so devolve contagens e limita a si mesma a 1 varredura / 10 min).
select cron.schedule(
  'veos-saude-varredura',
  '*/10 * * * *',
  $$select net.http_get(
      url := 'https://vkrwxvnfstvriibjwuvw.supabase.co/functions/v1/saude',
      headers := jsonb_build_object('apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcnd4dm5mc3R2cmlpYmp3dXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzQ1MzMsImV4cCI6MjEwNjM1MDUzM30.Xy5ZriNrN5u6lUYOXOMJ1HLcwPTyeoEGKNE3yLWp-B0', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcnd4dm5mc3R2cmlpYmp3dXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzQ1MzMsImV4cCI6MjEwNjM1MDUzM30.Xy5ZriNrN5u6lUYOXOMJ1HLcwPTyeoEGKNE3yLWp-B0'),
      timeout_milliseconds := 120000
    )$$
);
