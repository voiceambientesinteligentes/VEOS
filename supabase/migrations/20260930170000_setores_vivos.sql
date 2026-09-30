-- VEOS - setores vivos: registros genericos por setor (definidos no catalogo setores/*.json),
-- historico append-only, tarefas e alertas gerados pelas sentinelas.
-- RLS ligado e sem policies: acesso so via Edge Function "api".

-- Setores completos (9). Pos-venda e Pessoas passam a existir; nomes alinhados ao catalogo.
insert into public.setores (id, sigla, nome, descricao) values
  ('posvenda', 'CXO', 'Pós-venda e Experiência', 'Chamados, garantias, manutenção, satisfação e indicações.'),
  ('pessoas', 'CHRO', 'Administrativo e Pessoas', 'Colaboradores, treinamentos, segurança do trabalho e administrativo.')
on conflict (id) do nothing;
update public.setores set nome = 'Comercial', descricao = 'Prospecção, parceiros, oportunidades, propostas e contratos.' where id = 'vendas';
update public.setores set nome = 'Tecnologia e Engenharia', descricao = 'Padrões técnicos, homologação, documentação, incidentes e sistemas.' where id = 'tecnologia';
update public.setores set nome = 'Direção Geral' where id = 'direcao';
update public.setores set nome = 'Financeiro' where id = 'financas';
update public.setores set nome = 'Secretaria Executiva' where id = 'secretaria';
insert into public.diretores (id, setor_id, sigla, nome) values
  ('cxo', 'posvenda', 'CXO', 'Diretor de experiência do cliente'),
  ('chro', 'pessoas', 'CHRO', 'Diretor de pessoas e administrativo')
on conflict (id) do nothing;

alter table public.membros drop constraint membros_papel_check;
alter table public.membros add constraint membros_papel_check
  check (papel in ('direcao', 'financas', 'operacoes', 'tecnologia', 'marketing', 'vendas', 'secretaria', 'posvenda', 'pessoas'));

create table public.registros (
  id uuid primary key default gen_random_uuid(),
  setor_id text not null references public.setores (id),
  tipo text not null check (tipo ~ '^[a-z_]{2,40}$'),
  ambiente public.ambiente not null default 'TESTE',
  titulo text not null check (length(titulo) between 1 and 200),
  estado text not null check (estado ~ '^[a-z0-9_]{1,40}$'),
  responsavel text check (length(responsavel) <= 40),
  prazo date,
  valor numeric(15, 2),
  dados jsonb not null default '{}'::jsonb check (jsonb_typeof(dados) = 'object'),
  criado_por uuid references auth.users (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index registros_setor_tipo_idx on public.registros (setor_id, tipo);

-- Toda criacao e mudanca fica registrada (quem, quando, de/para) e nao pode ser apagada.
create table public.registros_historico (
  id bigint generated always as identity primary key,
  registro_id uuid not null references public.registros (id),
  acao text not null check (acao in ('criado', 'alterado')),
  de_estado text,
  para_estado text,
  mudancas jsonb not null default '{}'::jsonb,
  usuario uuid references auth.users (id),
  em timestamptz not null default now()
);
create index registros_historico_idx on public.registros_historico (registro_id);
create trigger registros_historico_append_only before update or delete on public.registros_historico
  for each row execute function public.recusar_alteracao();

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  setor_id text not null references public.setores (id),
  titulo text not null check (length(titulo) between 1 and 240),
  papel text,
  prazo date,
  estado text not null default 'aberta' check (estado in ('aberta', 'feita', 'cancelada')),
  origem text not null default 'manual',          -- 'manual' ou id da sentinela
  registro_id uuid references public.registros (id),
  chave text unique,                              -- dedupe de tarefas geradas por sentinela
  criado_por uuid references auth.users (id),
  criado_em timestamptz not null default now(),
  concluida_em timestamptz,
  concluida_por uuid references auth.users (id)
);
create index tarefas_setor_idx on public.tarefas (setor_id, estado);

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,                     -- sentinela[:registro]
  setor_id text not null references public.setores (id),
  sentinela text not null,
  severidade public.severidade not null,
  titulo text not null,
  mensagem text not null,
  fonte text not null default '',
  registro_id uuid references public.registros (id),
  rascunhos jsonb not null default '[]'::jsonb,
  notificar text[] not null default '{}',
  estado text not null default 'ativo' check (estado in ('ativo', 'resolvido', 'dispensado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  dispensado_por uuid references auth.users (id)
);
create index alertas_estado_idx on public.alertas (estado, setor_id);

-- Controle da varredura automatica (evita rodar varias vezes seguidas).
create table public.varreduras (
  id bigint generated always as identity primary key,
  origem text not null,
  alertas_ativos int not null,
  novos int not null,
  resolvidos int not null,
  ms int not null,
  em timestamptz not null default now()
);

alter table public.registros enable row level security;
alter table public.registros_historico enable row level security;
alter table public.tarefas enable row level security;
alter table public.alertas enable row level security;
alter table public.varreduras enable row level security;
