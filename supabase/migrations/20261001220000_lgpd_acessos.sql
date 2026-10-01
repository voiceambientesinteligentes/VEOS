-- LGPD (P2): registro de acesso a dados pessoais. Cada leitura de ficha de cliente/contato do
-- Zoho, de pedido (dados do cliente) e cada exportacao fica registrada: quem, o que e quando.
-- Append-only; consulta so pela direcao. Politica de retencao e termo de uso: propostas na Biblioteca.
create table public.acessos_dados_pessoais (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  recurso text not null check (length(recurso) between 3 and 200),   -- ex.: zoho:books.contacts:123 | pedido:<id> | exportar:pedidos
  acao text not null default 'leitura' check (acao in ('leitura', 'exportacao', 'edicao')),
  em timestamptz not null default now()
);
create index acessos_dados_pessoais_em on public.acessos_dados_pessoais (em desc);
create index acessos_dados_pessoais_recurso on public.acessos_dados_pessoais (recurso, em desc);
create trigger acessos_dados_pessoais_imutavel before update or delete on public.acessos_dados_pessoais for each row execute function public.recusar_alteracao();
alter table public.acessos_dados_pessoais enable row level security;
