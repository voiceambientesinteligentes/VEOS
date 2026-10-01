-- Testes de USUARIOS E ACESSOS (membro_gerir). Tudo desfeito no fim.
-- Uso: npx supabase db query --linked -f tests/banco/membros.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare
  dir uuid := '00000000-0000-0000-0000-0000000e0001'; vend uuid := '00000000-0000-0000-0000-0000000e0002'; novo uuid := '00000000-0000-0000-0000-0000000e0003';
  erro text;
  -- para isolar: as outras direcoes reais/TESTE ficam inativas dentro desta transacao
begin
  update public.membros set ativo = false where papel = 'direcao';
  insert into auth.users (id, email, aud, role) values (dir, 'dir@veos-teste.invalid', 'authenticated', 'authenticated'), (vend, 'vend@veos-teste.invalid', 'authenticated', 'authenticated'), (novo, 'novo@veos-teste.invalid', 'authenticated', 'authenticated');
  insert into public.membros (user_id, nome, papel) values (dir, 'Direção TESTE', 'direcao'), (vend, 'Vendas TESTE', 'vendas');

  begin perform public.membro_gerir(jsonb_build_object('por', vend, 'acao', 'convidar', 'user_id', novo, 'nome', 'Novo TESTE', 'papel', 'operacoes')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('1. quem não é direção não gere usuários', erro like '%somente a direcao%', erro);

  perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'convidar', 'user_id', novo, 'nome', 'Novo TESTE', 'papel', 'operacoes', 'email', 'NOVO@veos-teste.invalid'));
  insert into resultado (passo, ok, detalhe) values ('2. direção convida: membro ativo com papel e e-mail, histórico "convidado"',
    exists (select 1 from public.membros where user_id = novo and ativo and papel = 'operacoes' and email = 'novo@veos-teste.invalid')
    and exists (select 1 from public.membros_historico where user_id = novo and acao = 'convidado' and por = dir), null);
  begin perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'convidar', 'user_id', novo, 'nome', 'De novo', 'papel', 'vendas')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('3. convidar quem já tem cadastro é recusado', erro like '%ja tem cadastro%', erro);
  begin perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'papel', 'user_id', novo, 'papel', 'inexistente')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('4. papel fora dos 9 setores é recusado', erro is not null, erro);

  perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'papel', 'user_id', novo, 'papel', 'posvenda', 'motivo', 'TESTE mudou de área'));
  insert into resultado (passo, ok, detalhe) values ('5. mudança de papel registrada com de/para', exists (select 1 from public.membros_historico where user_id = novo and acao = 'papel' and de = 'operacoes' and para = 'posvenda'), null);

  begin perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'desativar', 'user_id', novo)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('6. desativar exige motivo', erro like '%motivo%', erro);
  begin perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'desativar', 'user_id', dir, 'motivo', 'x')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('7. ninguém desativa o próprio acesso', erro like '%proprio acesso%', erro);
  begin perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'papel', 'user_id', dir, 'papel', 'vendas')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('8. a empresa nunca fica sem direção ativa', erro like '%sem direcao ativa%', erro);

  perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'desativar', 'user_id', novo, 'motivo', 'TESTE saiu da empresa'));
  perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'reativar', 'user_id', novo));
  insert into resultado (passo, ok, detalhe) values ('9. desativar e reativar ficam no histórico (com motivo)',
    (select array_agg(acao order by id) from public.membros_historico where user_id = novo) = array['convidado', 'papel', 'desativado', 'reativado']
    and exists (select 1 from public.membros_historico where user_id = novo and acao = 'desativado' and motivo = 'TESTE saiu da empresa'), null);

  begin perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'exigir_mfa', 'user_id', novo, 'tem_mfa', false)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('10. MFA só é exigido de quem já cadastrou o fator (não tranca ninguém fora)', erro like '%cadastrar o MFA%', erro);
  perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'exigir_mfa', 'user_id', novo, 'tem_mfa', true));
  begin perform public.membro_gerir(jsonb_build_object('por', dir, 'acao', 'dispensar_mfa', 'user_id', novo)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('11. exigir MFA grava; dispensar exige motivo', (select exige_mfa from public.membros where user_id = novo) and erro like '%motivo%', erro);

  begin update public.membros_historico set motivo = 'apagado' where user_id = novo; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('12. histórico não pode ser alterado', erro is not null, erro);
  insert into resultado (passo, ok, detalhe) values ('13. só o servidor executa (authenticated sem permissão)', not has_function_privilege('authenticated', 'public.membro_gerir(jsonb)', 'execute'), null);
end $$;

select n, passo, ok, left(detalhe, 160) as detalhe from resultado order by n;
rollback;
