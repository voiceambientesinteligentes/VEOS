-- BREVO (11/11/2026, pedido do Fernando: "vamos usar brevo ... e tambem o gmail"): o e-mail confirmado pela pessoa
-- pode sair pela Brevo (plano gratis, 300 por dia) alem do Gmail. A Brevo avisa o VEOS (webhook, funcao "brevo") de
-- cada e-mail: entregue, aberto, clique, voltou (endereco nao existe), bloqueado, spam, descadastro e entrega adiada.
-- O Gmail continua para ler as respostas (que chegam la) e a agenda.

-- 1. Caixa de saida: caminho 'brevo' e os carimbos dos avisos.
alter table public.mensagens_saida drop constraint if exists mensagens_saida_via_check;
alter table public.mensagens_saida add constraint mensagens_saida_via_check check (via is null or via in ('manual', 'gmail', 'brevo', 'simulado'));
alter table public.mensagens_saida
  add column if not exists entregue_em timestamptz,
  add column if not exists aberta_em timestamptz,
  add column if not exists aberturas integer not null default 0,
  add column if not exists clicada_em timestamptz,
  add column if not exists cliques integer not null default 0,
  add column if not exists devolvida_em timestamptz,
  add column if not exists spam_em timestamptz,
  add column if not exists ultimo_evento text,
  add column if not exists ultimo_evento_em timestamptz;
alter table public.mensagens_saida drop constraint if exists mensagens_saida_evento_check;
alter table public.mensagens_saida add constraint mensagens_saida_evento_check check (
  (ultimo_evento is null or ultimo_evento ~ '^[a-z_]{2,20}$') and aberturas >= 0 and cliques >= 0);
drop index if exists public.mensagens_saida_acompanhar;
create index if not exists mensagens_saida_acompanhar on public.mensagens_saida (enviada_em) where via in ('gmail', 'brevo') and respondida_em is null;
create index if not exists mensagens_saida_provedor on public.mensagens_saida (provedor_id) where provedor_id is not null;

-- 2. Avisos recebidos (trilha; o mesmo aviso repetido pela Brevo tem a mesma chave e nao entra duas vezes).
create table if not exists public.email_eventos (
  id bigint generated always as identity primary key,
  chave text not null unique check (chave ~ '^[0-9a-f]{64}$'),
  provedor text not null check (provedor in ('brevo')),
  mensagem_id uuid references public.mensagens_saida (id) on delete set null,
  provedor_id text check (provedor_id is null or length(provedor_id) <= 100),
  evento text not null check (evento ~ '^[a-z_]{2,20}$'),
  original text check (original is null or length(original) <= 40),
  email text check (email is null or length(email) <= 200),
  detalhe text check (detalhe is null or length(detalhe) <= 300),
  ocorrido_em timestamptz not null,
  recebido_em timestamptz not null default now()
);
create index if not exists email_eventos_mensagem on public.email_eventos (mensagem_id, ocorrido_em desc);
create index if not exists email_eventos_recebido on public.email_eventos (provedor, recebido_em desc);
alter table public.email_eventos enable row level security;
revoke all on public.email_eventos from anon, authenticated;

do $$ begin
  perform cron.unschedule('veos-limpa-email-eventos') where exists (select 1 from cron.job where jobname = 'veos-limpa-email-eventos');
  perform cron.schedule('veos-limpa-email-eventos', '50 6 * * *', $c$delete from public.email_eventos where recebido_em < now() - interval '180 days'$c$);
end $$;
