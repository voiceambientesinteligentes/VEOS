-- CSO-04: orcamento proprio do VEOS (Negociacao ao Vivo), sem depender do Zoho. Nasce em rascunho;
-- salvar de novo com "substitui" gera nova versao da mesma serie e marca a anterior substituida
-- (so a vigente conta). Dados TESTE isolados; tudo desfeito. Uso:
-- npx supabase db query --linked -f tests/banco/comercial_orcamentos.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare u uuid := '00000000-0000-0000-0000-0000000e0001'; erro text; r jsonb; r2 jsonb; v1 uuid; v2 uuid;
begin
  insert into auth.users (id, email, aud, role) values (u, 'pessoa.teste.orc@exemplo.invalid', 'authenticated', 'authenticated');

  begin perform public.orcamento_veos_criar(jsonb_build_object('chave', 'TESTE-ORC-1', 'usuario', u, 'cliente_nome', 'Cliente TESTE', 'valor_total', 1500, 'itens', '[]'::jsonb)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('1. sem itens é recusado', erro like '%sem itens%', erro);

  r := public.orcamento_veos_criar(jsonb_build_object('chave', 'TESTE-ORC-1', 'usuario', u, 'cliente_nome', 'Cliente TESTE', 'valor_total', 1500, 'desconto', 0,
    'itens', jsonb_build_array(
      jsonb_build_object('nome', 'Central TESTE', 'tipo', 'produto', 'quantidade', 1, 'preco_unit', 1000, 'custo_unit', 400),
      jsonb_build_object('nome', 'Instalação TESTE', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 500))));
  v1 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('2. cria o orcamento com numero ORV- e versao 1',
    (select numero like 'ORV-%' and versao = 1 and estado = 'rascunho' and serie is not null from public.comercial_orcamentos where id = v1), r::text);
  insert into resultado (passo, ok, detalhe) values ('3. itens gravados na ordem, com tipo e custo',
    (select count(*) = 2 from public.comercial_orcamento_itens where orcamento_id = v1) and
    (select tipo = 'produto' and custo_unit = 400 from public.comercial_orcamento_itens where orcamento_id = v1 and ordem = 1), null);

  r2 := public.orcamento_veos_criar(jsonb_build_object('chave', 'TESTE-ORC-1', 'usuario', u, 'cliente_nome', 'x', 'valor_total', 1, 'itens', jsonb_build_array(jsonb_build_object('nome', 'x', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 1))));
  insert into resultado (passo, ok, detalhe) values ('4. repetir a mesma chave não duplica', (r2 ->> 'repetido')::boolean and (r2 ->> 'id')::uuid = v1, r2::text);

  r2 := public.orcamento_veos_criar(jsonb_build_object('chave', 'TESTE-ORC-2', 'usuario', u, 'substitui', v1, 'cliente_nome', 'Cliente TESTE', 'valor_total', 1400,
    'itens', jsonb_build_array(jsonb_build_object('nome', 'Central TESTE', 'tipo', 'produto', 'quantidade', 1, 'preco_unit', 900, 'custo_unit', 400))));
  v2 := (r2 ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('5. nova versão: mesma série, versão 2, total atualizado',
    (select serie from public.comercial_orcamentos where id = v1) = (select serie from public.comercial_orcamentos where id = v2)
    and (select versao from public.comercial_orcamentos where id = v2) = 2 and (select valor_total from public.comercial_orcamentos where id = v2) = 1400, null);
  insert into resultado (passo, ok, detalhe) values ('6. versão anterior fica substituída (não conta mais)',
    (select estado from public.comercial_orcamentos where id = v1) = 'substituido', null);
  insert into resultado (passo, ok, detalhe) values ('7. histórico registra criado, substituído e nova_versao',
    (select count(*) from public.comercial_orcamentos_historico where orcamento_id = v1 and acao = 'criado') = 1
    and (select count(*) from public.comercial_orcamentos_historico where orcamento_id = v1 and acao = 'substituido') = 1
    and (select count(*) from public.comercial_orcamentos_historico where orcamento_id = v2 and acao = 'nova_versao') = 1, null);

  begin perform public.orcamento_veos_criar(jsonb_build_object('chave', 'TESTE-ORC-3', 'usuario', u, 'substitui', v1, 'cliente_nome', 'Cliente TESTE', 'valor_total', 1,
    'itens', jsonb_build_array(jsonb_build_object('nome', 'x', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 1)))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('8. substituir uma versão já substituída é recusado', erro like '%já foi substituído%', erro);

  begin update public.comercial_orcamentos_historico set acao = 'x' where orcamento_id = v1; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('9. histórico não pode ser alterado', erro is not null, erro);
end $$;

insert into resultado (passo, ok, detalhe) select '10. anon e usuários logados não executam a função direto',
  not has_function_privilege('anon', 'public.orcamento_veos_criar(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.orcamento_veos_criar(jsonb)', 'execute'), null;
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
