-- VEOS - Setor Financeiro (CFO): projetos, fases, recebimentos efetivos e compromissos.
-- Base para as regras de caixa (Politica V1.1 sec.4-9 e V1 sec.10).
-- RLS ligado e sem policies: acesso so via Edge Function "api" (papeis direcao/financas).
-- Recebimentos e compromissos sao append-only (trilha financeira); correcao sera por estorno.

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null check (codigo ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$'),
  ambiente public.ambiente not null default 'TESTE',
  nome text not null check (length(nome) between 1 and 160),
  cliente text check (length(cliente) <= 160),
  -- Valor do Contrato (V1.1 sec.8): null = ausente/indeterminado -> percentual NAO RESOLVIDO
  valor_contrato numeric(15, 2) check (valor_contrato > 0),
  status text not null default 'ativo' check (status in ('ativo', 'concluido', 'cancelado')),
  criado_por uuid references auth.users (id),
  criado_em timestamptz not null default now(),
  unique (ambiente, codigo)
);

create table public.fases (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id),
  codigo text not null check (codigo ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$'),
  nome text not null check (length(nome) between 1 and 120),
  custos numeric(15, 2) not null check (custos >= 0),     -- desembolsos diretos da fase
  encargos numeric(15, 2) not null check (encargos >= 0), -- encargos diretamente relacionados
  criado_em timestamptz not null default now(),
  unique (projeto_id, codigo),
  unique (id, projeto_id)
);

-- Recebimento EFETIVO (ja recebido). A receber futuro nao entra aqui (V1.1 sec.5).
create table public.recebimentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id),
  fase_id uuid,                                            -- alocacao explicita a uma fase (V1 sec.10)
  data date not null,
  valor numeric(15, 2) not null check (valor > 0),
  descricao text check (length(descricao) <= 200),
  criado_por uuid references auth.users (id),
  criado_em timestamptz not null default now(),
  foreign key (fase_id, projeto_id) references public.fases (id, projeto_id)  -- fase do MESMO projeto
);

-- Compromisso assumido: caixa desembolsado + obrigacao firme nao paga (V1.1 sec.6).
-- Cada obrigacao conta uma vez pelo valor total; `pago` informa quanto ja saiu do caixa.
-- Compra apenas PROPOSTA nao e registrada aqui.
create table public.compromissos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id),
  descricao text not null check (length(descricao) between 1 and 200),
  contraparte text check (length(contraparte) <= 160),
  valor numeric(15, 2) not null check (valor > 0),
  pago numeric(15, 2) not null default 0 check (pago >= 0 and pago <= valor),
  vencimento date,
  criado_por uuid references auth.users (id),
  criado_em timestamptz not null default now()
);

create index fases_projeto_idx on public.fases (projeto_id);
create index recebimentos_projeto_idx on public.recebimentos (projeto_id);
create index compromissos_projeto_idx on public.compromissos (projeto_id);

create trigger recebimentos_append_only before update or delete on public.recebimentos
  for each row execute function public.recusar_alteracao();
create trigger compromissos_append_only before update or delete on public.compromissos
  for each row execute function public.recusar_alteracao();

alter table public.projetos enable row level security;
alter table public.fases enable row level security;
alter table public.recebimentos enable row level security;
alter table public.compromissos enable row level security;

-- Registro idempotente de qualquer lancamento financeiro + evento de auditoria na mesma
-- transacao. Repetir a mesma chave devolve o registro original sem duplicar.
create function public.registrar_financeiro(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_evento bigint;
  v_existente uuid;
  v_tipo text := p ->> 'tipo';
  d jsonb := p -> 'dados';
  v_projeto uuid := nullif(p ->> 'projeto_id', '')::uuid;
  v_fase uuid;
begin
  if v_tipo not in ('projeto', 'fase', 'recebimento', 'compromisso') then
    raise exception 'tipo invalido: %', v_tipo;
  end if;

  insert into public.eventos (tipo, chave_idempotencia, ambiente, referencia, resumo)
  values ('financeiro.' || v_tipo, p ->> 'chave', 'TESTE', v_id,
          jsonb_build_object('projeto_id', v_projeto, 'usuario', p ->> 'usuario_id', 'dados', d))
  on conflict (chave_idempotencia) do nothing
  returning id into v_evento;
  if v_evento is null then
    select referencia into v_existente from public.eventos where chave_idempotencia = p ->> 'chave';
    return jsonb_build_object('id', v_existente, 'repetido', true);
  end if;

  if v_tipo = 'projeto' then
    insert into public.projetos (id, codigo, ambiente, nome, cliente, valor_contrato, criado_por)
    values (v_id, d ->> 'codigo', 'TESTE', d ->> 'nome', nullif(d ->> 'cliente', ''),
            nullif(d ->> 'valor_contrato', '')::numeric, (p ->> 'usuario_id')::uuid);
  elsif v_tipo = 'fase' then
    insert into public.fases (id, projeto_id, codigo, nome, custos, encargos)
    values (v_id, v_projeto, d ->> 'codigo', d ->> 'nome', (d ->> 'custos')::numeric, (d ->> 'encargos')::numeric);
  elsif v_tipo = 'recebimento' then
    if nullif(d ->> 'fase_codigo', '') is not null then
      select id into v_fase from public.fases where projeto_id = v_projeto and codigo = d ->> 'fase_codigo';
      if v_fase is null then raise exception 'fase inexistente no projeto: %', d ->> 'fase_codigo'; end if;
    end if;
    insert into public.recebimentos (id, projeto_id, fase_id, data, valor, descricao, criado_por)
    values (v_id, v_projeto, v_fase, (d ->> 'data')::date, (d ->> 'valor')::numeric,
            nullif(d ->> 'descricao', ''), (p ->> 'usuario_id')::uuid);
  else
    insert into public.compromissos (id, projeto_id, descricao, contraparte, valor, pago, vencimento, criado_por)
    values (v_id, v_projeto, d ->> 'descricao', nullif(d ->> 'contraparte', ''), (d ->> 'valor')::numeric,
            coalesce(nullif(d ->> 'pago', ''), '0')::numeric, nullif(d ->> 'vencimento', '')::date,
            (p ->> 'usuario_id')::uuid);
  end if;
  return jsonb_build_object('id', v_id, 'repetido', false);
end;
$$;

revoke all on function public.registrar_financeiro(jsonb) from public, anon, authenticated;
grant execute on function public.registrar_financeiro(jsonb) to service_role;
