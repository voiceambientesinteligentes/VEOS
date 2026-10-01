-- USUARIOS E ACESSOS (P0): a direcao convida, muda o papel (setor), desativa/reativa e exige MFA
-- pela tela. Regras no banco, iguais para todos: so direcao ativa gere; ninguem se desativa;
-- a empresa nunca fica sem direcao ativa; desativar/dispensar MFA exige motivo; exigir MFA so
-- para quem ja tem fator verificado (evita trancar a pessoa fora). Historico append-only.
alter table public.membros add column email text, add column exige_mfa boolean not null default false, add column atualizado_em timestamptz not null default now();

create table public.membros_historico (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  acao text not null check (acao in ('convidado', 'papel', 'desativado', 'reativado', 'mfa_exigido', 'mfa_dispensado')),
  de text,
  para text,
  motivo text,
  por uuid not null,
  em timestamptz not null default now()
);
alter table public.membros_historico enable row level security;
create trigger membros_historico_imutavel before update or delete on public.membros_historico for each row execute function public.recusar_alteracao();
create index membros_historico_user on public.membros_historico (user_id, id desc);

create function public.membro_gerir(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare
  v_por uuid := (p ->> 'por')::uuid; v_alvo uuid := (p ->> 'user_id')::uuid; v_acao text := p ->> 'acao';
  v_motivo text := nullif(trim(coalesce(p ->> 'motivo', '')), ''); m public.membros; v_dir int;
begin
  if not exists (select 1 from public.membros where user_id = v_por and ativo and papel = 'direcao') then raise exception 'somente a direcao gere usuarios'; end if;
  select * into m from public.membros where user_id = v_alvo for update;
  select count(*) into v_dir from public.membros where ativo and papel = 'direcao';
  if v_acao = 'convidar' then
    if m.user_id is not null then raise exception 'esta pessoa ja tem cadastro no VEOS (reative ou mude o papel)'; end if;
    if coalesce(trim(p ->> 'nome'), '') = '' then raise exception 'informe o nome'; end if;
    insert into public.membros (user_id, nome, papel, email) values (v_alvo, trim(p ->> 'nome'), p ->> 'papel', lower(p ->> 'email'));
    insert into public.membros_historico (user_id, acao, para, por) values (v_alvo, 'convidado', p ->> 'papel', v_por);
    return jsonb_build_object('ok', true);
  end if;
  if m.user_id is null then raise exception 'membro inexistente'; end if;
  case v_acao
    when 'papel' then
      if m.papel = p ->> 'papel' then raise exception 'o papel ja e este'; end if;
      if m.papel = 'direcao' and m.ativo and v_dir <= 1 then raise exception 'a empresa nao pode ficar sem direcao ativa'; end if;
      update public.membros set papel = p ->> 'papel', atualizado_em = now() where user_id = v_alvo;
      insert into public.membros_historico (user_id, acao, de, para, motivo, por) values (v_alvo, 'papel', m.papel, p ->> 'papel', v_motivo, v_por);
    when 'desativar' then
      if v_alvo = v_por then raise exception 'voce nao pode desativar o proprio acesso'; end if;
      if not m.ativo then raise exception 'ja esta desativado'; end if;
      if v_motivo is null then raise exception 'informe o motivo da desativacao'; end if;
      if m.papel = 'direcao' and v_dir <= 1 then raise exception 'a empresa nao pode ficar sem direcao ativa'; end if;
      update public.membros set ativo = false, atualizado_em = now() where user_id = v_alvo;
      insert into public.membros_historico (user_id, acao, motivo, por) values (v_alvo, 'desativado', v_motivo, v_por);
    when 'reativar' then
      if m.ativo then raise exception 'ja esta ativo'; end if;
      update public.membros set ativo = true, atualizado_em = now() where user_id = v_alvo;
      insert into public.membros_historico (user_id, acao, motivo, por) values (v_alvo, 'reativado', v_motivo, v_por);
    when 'exigir_mfa' then
      if m.exige_mfa then raise exception 'o MFA ja e exigido'; end if;
      if coalesce((p ->> 'tem_mfa')::boolean, false) is not true then raise exception 'a pessoa precisa cadastrar o MFA (Minha conta) antes de ele ser exigido'; end if;
      update public.membros set exige_mfa = true, atualizado_em = now() where user_id = v_alvo;
      insert into public.membros_historico (user_id, acao, motivo, por) values (v_alvo, 'mfa_exigido', v_motivo, v_por);
    when 'dispensar_mfa' then
      if not m.exige_mfa then raise exception 'o MFA nao e exigido'; end if;
      if v_motivo is null then raise exception 'informe o motivo para dispensar o MFA'; end if;
      update public.membros set exige_mfa = false, atualizado_em = now() where user_id = v_alvo;
      insert into public.membros_historico (user_id, acao, motivo, por) values (v_alvo, 'mfa_dispensado', v_motivo, v_por);
    else raise exception 'acao invalida';
  end case;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.membro_gerir(jsonb) from public, anon, authenticated;
