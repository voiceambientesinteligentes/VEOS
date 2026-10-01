-- Anexos em PDF dos pedidos (orcamento assinado, proposta, contrato assinado...). Arquivos num
-- bucket PRIVADO do Supabase Storage; o navegador envia e baixa por URL assinada de curta duracao,
-- emitida pela API depois de checar o membro. So PDF, ate 16 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', false, 16777216, array['application/pdf'])
on conflict (id) do nothing;

create table public.pedido_anexos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id),
  caminho text not null unique,
  nome text not null check (length(nome) between 1 and 200),
  tipo text not null check (tipo in ('orcamento', 'proposta', 'contrato', 'outro')),
  tamanho integer not null check (tamanho between 1 and 16777216),
  enviado_por uuid not null,
  enviado_em timestamptz not null default now()
);
alter table public.pedido_anexos enable row level security;
