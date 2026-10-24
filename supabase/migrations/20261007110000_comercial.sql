-- SETOR COMERCIAL (07/10/2026): implantacao do setor (checklist com historico), lista de bloqueio de
-- contato (quem pede para sair sai na hora — proposta BIB-0107) e candidatos as cadencias de
-- follow-up. As cadencias viram TAREFAS e RASCUNHOS na Caixa de saida; quem envia e sempre uma pessoa.
-- O conteudo (itens, cadencias, canais) fica em apps/web/js/domain/comercial.js; aqui so o estado.

create table public.comercial_implantacao (
  codigo text primary key check (codigo ~ '^COM-[A-Z][0-9]{1,2}$'),
  estado text not null default 'a_fazer' check (estado in ('a_fazer', 'em_andamento', 'feito', 'nao_se_aplica')),
  evidencia text,
  atualizado_por uuid,
  atualizado_em timestamptz not null default now()
);
create table public.comercial_implantacao_historico (
  id bigint generated always as identity primary key,
  codigo text not null,
  de text, para text not null, evidencia text,
  usuario uuid, em timestamptz not null default now()
);
create trigger comercial_implantacao_historico_imutavel before update or delete on public.comercial_implantacao_historico for each row execute function public.recusar_alteracao();
alter table public.comercial_implantacao enable row level security;
alter table public.comercial_implantacao_historico enable row level security;

create function public.comercial_implantacao_marcar(p_codigo text, p_estado text, p_evidencia text, p_usuario uuid) returns jsonb language plpgsql set search_path = '' as $$
declare antes text;
begin
  if p_codigo !~ '^COM-[A-Z][0-9]{1,2}$' then raise exception 'item inexistente'; end if;
  if p_estado not in ('a_fazer', 'em_andamento', 'feito', 'nao_se_aplica') then raise exception 'estado inválido'; end if;
  if p_estado in ('feito', 'nao_se_aplica') and length(trim(coalesce(p_evidencia, ''))) < 3 then raise exception 'conte o que foi feito (ou por que não se aplica)'; end if;
  select estado into antes from public.comercial_implantacao where codigo = p_codigo for update;
  insert into public.comercial_implantacao (codigo, estado, evidencia, atualizado_por, atualizado_em) values (p_codigo, p_estado, nullif(trim(p_evidencia), ''), p_usuario, now())
  on conflict (codigo) do update set estado = excluded.estado, evidencia = excluded.evidencia, atualizado_por = excluded.atualizado_por, atualizado_em = now();
  insert into public.comercial_implantacao_historico (codigo, de, para, evidencia, usuario) values (p_codigo, antes, p_estado, nullif(trim(p_evidencia), ''), p_usuario);
  return jsonb_build_object('ok', true, 'de', antes, 'para', p_estado);
end $$;

-- Quem pediu para nao receber mensagens (e-mail ou telefone normalizado). Nunca e apagado.
create table public.contatos_bloqueio (
  contato text primary key,                          -- e-mail em minusculas ou telefone so com digitos
  canal text not null check (canal in ('email', 'telefone')),
  motivo text,
  registrado_por uuid,
  em timestamptz not null default now()
);
alter table public.contatos_bloqueio enable row level security;

-- Registros do setor criados por PESSOAS REAIS (usuarios de teste ficam fora) desde p_desde, com o
-- momento em que entraram no estado atual (inicio da cadencia).
create function public.cadencia_candidatos(p_setor text default 'vendas', p_desde date default '2026-10-07')
returns table (id uuid, tipo text, estado text, titulo text, dados jsonb, criado_por uuid, autor text, desde timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.tipo, r.estado, r.titulo, r.dados, r.criado_por, m.nome,
         coalesce((select max(h.em) from public.registros_historico h where h.registro_id = r.id and h.para_estado = r.estado), r.criado_em)
  from public.registros r
  join auth.users u on u.id = r.criado_por and coalesce(u.email, '') not like '%@veos-teste.invalid'
  left join public.membros m on m.user_id = r.criado_por
  where r.setor_id = p_setor and r.criado_em >= p_desde
$$;

revoke all on function public.comercial_implantacao_marcar(text, text, text, uuid), public.cadencia_candidatos(text, date) from public, anon, authenticated;
