-- O historico de execucoes do pg_cron (cron.job_run_details) nunca era limpo: 44 mil linhas e 74 MB em 09/11
-- (cerca de 14% do limite de 500 MB do plano gratuito) e deixava a tela/ vigia de saude lenta (o teste
-- online do Sistema recebia 502 por tempo). Guarda so os ultimos 3 dias (a saude do sistema usa 24 h).
delete from cron.job_run_details where end_time < now() - interval '3 days';
do $$ begin
  perform cron.unschedule('veos-limpa-cron') where exists (select 1 from cron.job where jobname = 'veos-limpa-cron');
  perform cron.schedule('veos-limpa-cron', '40 6 * * *', $c$delete from cron.job_run_details where end_time < now() - interval '3 days'$c$);
end $$;
