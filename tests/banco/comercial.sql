-- Setor Comercial: implantacao (evidencia obrigatoria para concluir, historico imutavel), candidatos
-- as cadencias (so registros de pessoas reais, com o momento em que entraram no estado) e bloqueio.
-- Dados TESTE isolados; tudo desfeito. Uso: npx supabase db query --linked -f tests/banco/comercial.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare real uuid := '00000000-0000-0000-0000-0000000d0001'; teste uuid := '00000000-0000-0000-0000-0000000d0002'; erro text; r jsonb; reg uuid; reg2 uuid; c record;
begin
  insert into auth.users (id, email, aud, role) values (real, 'pessoa.real.teste@exemplo.invalid', 'authenticated', 'authenticated'), (teste, 'robo@veos-teste.invalid', 'authenticated', 'authenticated');

  begin perform public.comercial_implantacao_marcar('COM-B1', 'feito', ' ', real); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('1. concluir sem contar o que foi feito é recusado', erro like 'conte o que foi feito%', erro);
  perform public.comercial_implantacao_marcar('COM-B1', 'em_andamento', null, real);
  r := public.comercial_implantacao_marcar('COM-B1', 'feito', 'Leads TESTE registrados com origem', real);
  insert into resultado (passo, ok, detalhe) values ('2. marcar guarda o estado e o histórico (de → para)',
    exists (select 1 from public.comercial_implantacao where codigo = 'COM-B1' and estado = 'feito' and evidencia = 'Leads TESTE registrados com origem')
    and (select count(*) from public.comercial_implantacao_historico where codigo = 'COM-B1' and usuario = real) = 2 and r ->> 'de' = 'em_andamento', r::text);
  begin update public.comercial_implantacao_historico set para = 'a_fazer' where codigo = 'COM-B1'; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('3. histórico não pode ser alterado', erro is not null, erro);
  begin perform public.comercial_implantacao_marcar('XYZ', 'feito', 'x', real); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('4. código inválido é recusado', erro = 'item inexistente', erro);

  -- candidatos as cadencias
  r := public.salvar_registro(jsonb_build_object('chave', 'TESTE-CAD-1', 'usuario_id', real, 'modo', 'criar', 'setor', 'vendas', 'tipo', 'lead',
    'campos', jsonb_build_object('titulo', 'Lead TESTE real', 'estado', 'novo', 'dados', jsonb_build_object('nome_contato', 'Ana TESTE', 'telefone', '47999990000', 'origem', 'site'))));
  reg := (r ->> 'id')::uuid;
  r := public.salvar_registro(jsonb_build_object('chave', 'TESTE-CAD-2', 'usuario_id', teste, 'modo', 'criar', 'setor', 'vendas', 'tipo', 'lead',
    'campos', jsonb_build_object('titulo', 'Lead TESTE robô', 'estado', 'novo', 'dados', jsonb_build_object('nome_contato', 'Robô', 'telefone', '47999990001', 'origem', 'site'))));
  reg2 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('5. só registros de pessoas reais entram nas cadências',
    exists (select 1 from public.cadencia_candidatos('vendas', current_date) where id = reg) and not exists (select 1 from public.cadencia_candidatos('vendas', current_date) where id = reg2), null);
  select * into c from public.cadencia_candidatos('vendas', current_date) where id = reg;
  insert into resultado (passo, ok, detalhe) values ('6. candidato traz estado, dados e o momento em que entrou no estado',
    c.estado = 'novo' and c.dados ->> 'nome_contato' = 'Ana TESTE' and c.desde is not null and c.criado_por = real, c::text);
  insert into resultado (passo, ok, detalhe) values ('7. registro anterior à data de início fica fora',
    not exists (select 1 from public.cadencia_candidatos('vendas', current_date + 1) where id = reg), null);

  insert into public.contatos_bloqueio (contato, canal, motivo) values ('ana@teste.invalid', 'email', 'pediu para sair TESTE');
  begin insert into public.contatos_bloqueio (contato, canal) values ('ana@teste.invalid', 'email'); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('8. bloqueio é único por contato', erro is not null, erro);
end $$;

insert into resultado (passo, ok, detalhe) select '9. anon e usuários logados não executam as funções direto',
  not has_function_privilege('anon', 'public.cadencia_candidatos(text, date)', 'execute')
  and not has_function_privilege('authenticated', 'public.comercial_implantacao_marcar(text, text, text, uuid)', 'execute'), null;
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
