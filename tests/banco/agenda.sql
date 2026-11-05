-- Agenda por pessoa (05/11/2026): cargo do membro, historico, tarefa com responsavel e dedupe pela chave.
-- Tudo desfeito. Uso: npx supabase db query --linked -f tests/banco/agenda.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare dir uuid := '00000000-0000-0000-0000-0000000a0b01'; pessoa uuid := '00000000-0000-0000-0000-0000000a0b02'; outro uuid := '00000000-0000-0000-0000-0000000a0b03'; erro text; t uuid;
begin
  insert into auth.users (id, email, aud, role) values (dir, 'dir.agenda@exemplo.com', 'authenticated', 'authenticated'), (pessoa, 'pessoa.agenda@exemplo.com', 'authenticated', 'authenticated'), (outro, 'outro.agenda@exemplo.com', 'authenticated', 'authenticated');
  insert into public.membros (user_id, nome, papel) values (dir, 'Direcao TESTE', 'direcao'), (pessoa, 'Pessoa TESTE', 'vendas'), (outro, 'Outro TESTE', 'vendas');

  perform public.membro_cargo_definir(jsonb_build_object('por', dir, 'user_id', pessoa, 'cargo', 'sdr', 'motivo', 'contratada'));
  insert into resultado (passo, ok, detalhe) values ('1. direcao define o cargo e fica no historico',
    (select cargo = 'sdr' from public.membros where user_id = pessoa) and exists (select 1 from public.membros_historico where user_id = pessoa and acao = 'cargo' and para = 'sdr' and por = dir), null);
  begin perform public.membro_cargo_definir(jsonb_build_object('por', dir, 'user_id', pessoa, 'cargo', 'sdr')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('2. repetir o mesmo cargo e recusado', erro like '%ja e este%', erro);
  begin perform public.membro_cargo_definir(jsonb_build_object('por', pessoa, 'user_id', outro, 'cargo', 'sdr')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('3. quem nao e da direcao nao define cargo', erro like '%somente a direcao%', erro);
  begin perform public.membro_cargo_definir(jsonb_build_object('por', dir, 'user_id', outro, 'cargo', 'Cargo Inválido!')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('4. formato de cargo invalido e recusado pelo banco', erro is not null, erro);
  perform public.membro_cargo_definir(jsonb_build_object('por', dir, 'user_id', outro, 'cargo', 'direcao:diretor'));
  insert into resultado (passo, ok, detalhe) values ('5. a direcao pode atribuir cargo de outro setor (setor:cargo)', (select cargo = 'direcao:diretor' from public.membros where user_id = outro), null);
  perform public.membro_cargo_definir(jsonb_build_object('por', dir, 'user_id', outro, 'cargo', null));
  insert into resultado (passo, ok, detalhe) values ('6. limpar o cargo', (select cargo is null from public.membros where user_id = outro), null);

  insert into public.tarefas (setor_id, titulo, papel, prazo, origem, responsavel, chave) values ('vendas', 'Hoje: responder leads', 'SDR', current_date, 'agenda', pessoa, 'AGENDA:teste:1') returning id into t;
  insert into public.tarefas (setor_id, titulo, papel, prazo, origem, responsavel, chave) values ('vendas', 'Hoje: responder leads', 'SDR', current_date, 'agenda', pessoa, 'AGENDA:teste:1') on conflict (chave) do nothing;
  insert into resultado (passo, ok, detalhe) values ('7. a mesma chave nao duplica a tarefa da agenda', (select count(*) = 1 from public.tarefas where chave = 'AGENDA:teste:1' and responsavel = pessoa), null);
end $$;

select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
