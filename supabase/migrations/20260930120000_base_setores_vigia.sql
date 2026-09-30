-- VEOS - base inicial: setores, diretores, orcamentos, avisos do vigia e eventos.
-- Seguranca: RLS ligado em TODAS as tabelas e nenhuma policy para anon/authenticated.
-- Resultado: a chave publica nao le nem grava nada; o acesso passa pelas Edge
-- Functions (service role), que aplicam as regras e a identidade.
-- Ambiente: TESTE e PRODUCAO sao eixos separados; so TESTE e usado ate a fase de dados reais.

create type public.ambiente as enum ('TESTE', 'PRODUCAO');
create type public.severidade as enum ('INFO', 'MEDIO', 'ALTO', 'CRITICO');

-- Setores e diretores (perfis). Siglas mantidas como no portal (CSO = Vendas,
-- CIO = Tecnologia e dados) ate decisao P-5 do Fernando.
create table public.setores (
  id text primary key check (id ~ '^[a-z]{2,20}$'),
  sigla text not null unique,
  nome text not null,
  descricao text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.diretores (
  id text primary key check (id ~ '^[a-z]{2,20}$'),
  setor_id text not null references public.setores (id),
  sigla text not null unique,
  nome text not null,
  -- personalidade: tom, estilo e limites do diretor; definida com o Fernando (vazia ate la)
  personalidade jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Orcamentos: registro como o vendedor salvou (itens em jsonb, valores em centavos exatos).
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  ambiente public.ambiente not null default 'TESTE',
  vendedor text,
  cliente text,
  itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) between 1 and 300),
  valor_total_informado numeric(15, 2) not null check (valor_total_informado > 0),
  desconto_valor numeric(15, 2) not null default 0 check (desconto_valor >= 0),
  impostos numeric(15, 2) check (impostos >= 0),           -- null = desconhecido (lacuna), nunca zero
  justificativas_ticket text[] not null default '{}',
  criado_em timestamptz not null default now(),
  unique (ambiente, codigo)
);

-- Avisos do vigia: fotografia do que o diretor disse sobre o registro (append-only).
create table public.avisos (
  id bigint generated always as identity primary key,
  orcamento_id uuid not null references public.orcamentos (id),
  evento text not null,
  diretor_id text not null references public.diretores (id),
  severidade public.severidade not null,
  codigo text not null,
  titulo text not null,
  mensagem text not null,
  fonte text not null,
  origem text not null,
  situacao text not null check (situacao in ('OK', 'REVISAR', 'BLOQUEAR_ENVIO')),
  ambiente public.ambiente not null,
  criado_em timestamptz not null default now()
);
create index avisos_orcamento_idx on public.avisos (orcamento_id);

-- Eventos de negocio (orcamento.salvo, ...): trilha de auditoria append-only com idempotencia.
create table public.eventos (
  id bigint generated always as identity primary key,
  tipo text not null,
  chave_idempotencia text not null unique,
  ambiente public.ambiente not null,
  referencia uuid,
  resumo jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

-- Append-only: avisos e eventos nunca sao alterados nem apagados.
create function public.recusar_alteracao() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'tabela % e append-only: % nao permitido', tg_table_name, tg_op;
end;
$$;
create trigger avisos_append_only before update or delete on public.avisos
  for each row execute function public.recusar_alteracao();
create trigger eventos_append_only before update or delete on public.eventos
  for each row execute function public.recusar_alteracao();

alter table public.setores enable row level security;
alter table public.diretores enable row level security;
alter table public.orcamentos enable row level security;
alter table public.avisos enable row level security;
alter table public.eventos enable row level security;

-- Setores e diretores existentes no portal (rooms.py). Pos-venda e Administrativo/Pessoas
-- entram quando houver regras do setor (proposta P-6).
insert into public.setores (id, sigla, nome, descricao) values
  ('direcao', 'CEO', 'Direção geral', 'Estratégia, prioridades e decisões da direção.'),
  ('financas', 'CFO', 'Finanças', 'Caixa, margem de contribuição, exposição, orçamento e risco financeiro.'),
  ('operacoes', 'COO', 'Operações', 'Escopo, cronograma, compras, instalação e aceite.'),
  ('tecnologia', 'CIO', 'Tecnologia e dados', 'Sistemas, integrações, padrões técnicos e dados.'),
  ('marketing', 'CMO', 'Marketing', 'Marca, campanhas, conteúdo e materiais autorizados.'),
  ('vendas', 'CSO', 'Vendas', 'Leads, oportunidades, propostas e contratos.'),
  ('secretaria', 'SEC', 'Secretaria', 'Entrada e distribuição de ordens, pautas e pendências.');

insert into public.diretores (id, setor_id, sigla, nome) values
  ('ceo', 'direcao', 'CEO', 'Diretor geral'),
  ('cfo', 'financas', 'CFO', 'Diretor financeiro'),
  ('coo', 'operacoes', 'COO', 'Diretor de operações'),
  ('cio', 'tecnologia', 'CIO', 'Diretor de tecnologia e dados'),
  ('cmo', 'marketing', 'CMO', 'Diretor de marketing'),
  ('cso', 'vendas', 'CSO', 'Diretor de vendas'),
  ('sec', 'secretaria', 'SEC', 'Secretaria executiva');
