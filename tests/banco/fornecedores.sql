-- Fornecedores proprios (05/11/2026): cadastro, idempotencia, alteracao parcial, numeracao real x teste e
-- ligacao com compras e contas a pagar. Dados TESTE; tudo desfeito. Uso:
-- npx supabase db query --linked -f tests/banco/fornecedores.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare s_ult bigint; s_cham boolean; st_ult bigint; st_cham boolean; u uuid := '00000000-0000-0000-0000-0000000f0b01'; robo uuid := '00000000-0000-0000-0000-0000000f0b02'; erro text; r jsonb; f1 uuid; r2 jsonb; k uuid;
begin
  select last_value, is_called into s_ult, s_cham from public.fornecedor_codigo_seq;
  select last_value, is_called into st_ult, st_cham from public.fornecedor_codigo_teste_seq;
  insert into auth.users (id, email, aud, role) values (u, 'pessoa.teste.for@exemplo.com', 'authenticated', 'authenticated'),
    (robo, 'robo-for@veos-teste.invalid', 'authenticated', 'authenticated');

  r := public.fornecedor_salvar(jsonb_build_object('chave', 'TESTE-FOR-1', 'usuario', robo, 'dados', jsonb_build_object('nome', 'Fornecedor TESTE', 'documento', '12323599000183', 'categoria', 'importacao', 'prazo_pagamento_dias', 28)));
  f1 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('1. cria fornecedor (usuario robo usa a serie FOR-T)', (r ->> 'codigo') ~ '^FOR-T[0-9]{5}$' and not (r ->> 'repetido')::boolean, r::text);
  r2 := public.fornecedor_salvar(jsonb_build_object('chave', 'TESTE-FOR-1', 'usuario', robo, 'dados', jsonb_build_object('nome', 'Outro')));
  insert into resultado (passo, ok, detalhe) values ('2. mesma chave nao duplica', (r2 ->> 'repetido')::boolean and (r2 ->> 'id')::uuid = f1, r2::text);
  begin perform public.fornecedor_salvar(jsonb_build_object('chave', 'TESTE-FOR-2', 'usuario', robo, 'dados', jsonb_build_object('nome', 'Repetido', 'documento', '12323599000183'))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('3. CNPJ repetido e recusado', erro is not null, erro);
  begin perform public.fornecedor_salvar(jsonb_build_object('chave', 'TESTE-FOR-3', 'usuario', robo, 'dados', jsonb_build_object('nome', 'Categoria ruim', 'categoria', 'xyz'))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('4. categoria invalida e recusada', erro is not null, erro);
  begin perform public.fornecedor_salvar(jsonb_build_object('chave', 'TESTE-FOR-4', 'usuario', robo, 'dados', jsonb_build_object('nome', 'Prazo ruim', 'prazo_pagamento_dias', 999))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('5. prazo fora de 0..365 e recusado', erro is not null, erro);

  perform public.fornecedor_salvar(jsonb_build_object('id', f1, 'usuario', robo, 'dados', jsonb_build_object('cidade', 'Itajaí', 'uf', 'SC', 'estado', 'inativo')));
  insert into resultado (passo, ok, detalhe) values ('6. alteracao parcial mantem o resto, inativa e registra historico',
    (select cidade = 'Itajaí' and prazo_pagamento_dias = 28 and nome = 'Fornecedor TESTE' and estado = 'inativo' from public.fornecedores where id = f1)
    and (select count(*) = 2 from public.fornecedores_historico where fornecedor_id = f1), null);
  begin perform public.fornecedor_salvar(jsonb_build_object('id', gen_random_uuid(), 'usuario', robo, 'dados', jsonb_build_object('nome', 'x'))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('7. alterar fornecedor inexistente e recusado', erro like '%inexistente%', erro);

  r := public.fornecedor_salvar(jsonb_build_object('chave', 'TESTE-FOR-REAL', 'usuario', u, 'dados', jsonb_build_object('nome', 'Fornecedor Real Ensaio')));
  insert into resultado (passo, ok, detalhe) values ('8. pessoa real usa a serie FOR-', (r ->> 'codigo') ~ '^FOR-[0-9]{5}$', r::text);
  r2 := public.fornecedor_salvar(jsonb_build_object('chave', 'TESTE-FOR-ZOHO', 'usuario', u, 'dados', jsonb_build_object('nome', 'Vendor Zoho', 'zoho_vendor_id', 'zv1')));
  begin perform public.fornecedor_salvar(jsonb_build_object('chave', 'TESTE-FOR-ZOHO2', 'usuario', u, 'dados', jsonb_build_object('nome', 'Vendor Zoho 2', 'zoho_vendor_id', 'zv1'))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('9. o mesmo contato do Zoho nao vira dois fornecedores', erro is not null, erro);

  -- ligacao com contas a pagar
  r := public.conta_pagar_criar(jsonb_build_object('chave', 'TESTE-FOR-CP', 'usuario', u, 'descricao', 'Frete TESTE', 'fornecedor', 'Vendor Zoho', 'categoria', 'frete', 'vencimento', '2026-12-10', 'valor', 100));
  k := (r ->> 'id')::uuid;
  update public.contas_pagar set fornecedor_id = (r2 ->> 'id')::uuid where id = k;
  insert into resultado (passo, ok, detalhe) values ('10. conta a pagar guarda o fornecedor_id', (select fornecedor_id = (r2 ->> 'id')::uuid from public.contas_pagar where id = k), null);
  begin delete from public.fornecedores_historico where fornecedor_id = f1; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('11. historico e append-only', erro is not null, erro);
  -- as sequencias nao voltam com o rollback: restaura para o teste nao consumir numeros
  perform setval('public.fornecedor_codigo_seq', s_ult, s_cham);
  perform setval('public.fornecedor_codigo_teste_seq', st_ult, st_cham);
end $$;

insert into resultado (passo, ok, detalhe) select '12. anon e usuarios logados nao executam fornecedor_salvar direto',
  not has_function_privilege('anon', 'public.fornecedor_salvar(jsonb)', 'execute') and not has_function_privilege('authenticated', 'public.fornecedor_salvar(jsonb)', 'execute'), null;
insert into resultado (passo, ok, detalhe) select '13. fornecedores sem policy (so a funcao api le)',
  (select relrowsecurity from pg_class where oid = 'public.fornecedores'::regclass) and not exists (select 1 from pg_policies where tablename in ('fornecedores', 'fornecedores_historico')), null;
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
