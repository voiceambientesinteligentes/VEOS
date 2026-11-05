-- AVISO COM O NAVEGADOR FECHADO (Web Push, 05/11/2026): inscricoes por aparelho e marca de alerta ja avisado.
-- Chaves VAPID ficam nos segredos do Supabase (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT). Gratuito.
create table public.push_inscricoes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 8 and 100),
  agente text check (agente is null or length(agente) <= 200),
  criado_em timestamptz not null default now(),
  ultimo_envio timestamptz,
  falhas integer not null default 0
);
create index push_inscricoes_user on public.push_inscricoes (user_id);
alter table public.push_inscricoes enable row level security;

-- alertas ALTO/CRITICO ja avisados por push (os que existem hoje nao disparam aviso retroativo)
alter table public.alertas add column push_enviado_em timestamptz;
update public.alertas set push_enviado_em = now();
