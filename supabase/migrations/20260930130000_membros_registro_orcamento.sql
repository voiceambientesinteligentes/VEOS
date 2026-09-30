-- VEOS - membros autorizados e registro atomico de orcamento + avisos + evento.
-- Cadastro publico esta desligado no Auth; alem disso, so quem esta em `membros`
-- (ativo) usa a API. RLS ligado e sem policies: acesso somente via Edge Functions.

create table public.membros (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('direcao', 'financas', 'operacoes', 'tecnologia', 'marketing', 'vendas', 'secretaria')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.membros enable row level security;

alter table public.orcamentos add column criado_por uuid references auth.users (id);

-- Grava orcamento, avisos e evento numa unica transacao. Idempotente pela chave:
-- repetir a mesma chamada devolve o registro original e nao duplica nada.
create function public.registrar_orcamento(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_evento bigint;
  v_existente uuid;
  o jsonb := p -> 'orcamento';
  r jsonb := p -> 'resultado';
begin
  insert into public.eventos (tipo, chave_idempotencia, ambiente, referencia, resumo)
  values ('orcamento.salvo', p ->> 'chave', (o ->> 'ambiente')::public.ambiente, v_id,
          jsonb_build_object('situacao', r ->> 'situacao', 'resumo', r -> 'resumo', 'usuario', p ->> 'usuario_id'))
  on conflict (chave_idempotencia) do nothing
  returning id into v_evento;

  if v_evento is null then
    select referencia into v_existente from public.eventos where chave_idempotencia = p ->> 'chave';
    return jsonb_build_object('orcamento_id', v_existente, 'repetido', true);
  end if;

  insert into public.orcamentos (id, codigo, ambiente, vendedor, cliente, itens, valor_total_informado,
                                 desconto_valor, impostos, justificativas_ticket, criado_por)
  values (v_id, o ->> 'id', (o ->> 'ambiente')::public.ambiente, o ->> 'vendedor', o ->> 'cliente', o -> 'itens',
          (o ->> 'valor_total_informado')::numeric, coalesce(nullif(o ->> 'desconto_valor', ''), '0')::numeric,
          (o ->> 'impostos')::numeric,
          coalesce(array(select jsonb_array_elements_text(o -> 'justificativas_ticket')), '{}'),
          (p ->> 'usuario_id')::uuid);

  insert into public.avisos (orcamento_id, evento, diretor_id, severidade, codigo, titulo, mensagem,
                             fonte, origem, situacao, ambiente)
  select v_id, 'orcamento.salvo', lower(a ->> 'diretor'), (a ->> 'severidade')::public.severidade,
         a ->> 'codigo', a ->> 'titulo', a ->> 'mensagem', a ->> 'fonte', a ->> 'origem',
         r ->> 'situacao', (o ->> 'ambiente')::public.ambiente
  from jsonb_array_elements(r -> 'avisos') a;

  return jsonb_build_object('orcamento_id', v_id, 'repetido', false);
end;
$$;

-- Somente o service role (Edge Functions) executa.
revoke all on function public.registrar_orcamento(jsonb) from public, anon, authenticated;
grant execute on function public.registrar_orcamento(jsonb) to service_role;
