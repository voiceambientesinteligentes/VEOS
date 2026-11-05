-- AGENDA POR PESSOA (05/11/2026): cada pessoa pode ocupar um cargo da Estrutura da empresa; as atividades
-- diarias/semanais/mensais do cargo viram tarefas dela no Radar e na pagina Hoje (so para cargos com pessoa).
alter table public.membros add column cargo text check (cargo is null or cargo ~ '^[a-z0-9_]{2,60}(:[a-z0-9_]{2,60})?$');
alter table public.tarefas add column responsavel uuid references auth.users (id);
create index tarefas_responsavel on public.tarefas (responsavel, estado) where responsavel is not null;

alter table public.membros_historico drop constraint if exists membros_historico_acao_check;
alter table public.membros_historico add constraint membros_historico_acao_check
  check (acao in ('convidado', 'papel', 'desativado', 'reativado', 'mfa_exigido', 'mfa_dispensado', 'mcp_acesso', 'cargo'));

-- Define (ou limpa) o cargo de uma pessoa. So a direcao. A validade do cargo (existe no setor) e conferida na API.
create function public.membro_cargo_definir(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_por uuid := (p ->> 'por')::uuid; v_alvo uuid := (p ->> 'user_id')::uuid; v_cargo text := nullif(trim(coalesce(p ->> 'cargo', '')), ''); m public.membros;
begin
  if not exists (select 1 from public.membros where user_id = v_por and ativo and papel = 'direcao') then raise exception 'somente a direcao define cargos'; end if;
  select * into m from public.membros where user_id = v_alvo for update;
  if m.user_id is null then raise exception 'membro inexistente'; end if;
  if m.cargo is not distinct from v_cargo then raise exception 'o cargo ja e este'; end if;
  update public.membros set cargo = v_cargo, atualizado_em = now() where user_id = v_alvo;
  insert into public.membros_historico (user_id, acao, de, para, motivo, por) values (v_alvo, 'cargo', m.cargo, v_cargo, nullif(trim(coalesce(p ->> 'motivo', '')), ''), v_por);
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.membro_cargo_definir(jsonb) from public, anon, authenticated;
