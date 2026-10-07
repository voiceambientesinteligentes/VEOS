-- Cadastro pendente: produto que entra no orcamento sem cadastro vira pendencia; cadastrar, ligar,
-- dispensar e resolver sozinho. Dados TESTE isolados; tudo desfeito.
-- Uso: npx supabase db query --linked -f tests/banco/cadastro_pendente.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare u uuid := '00000000-0000-0000-0000-0000000c0001'; r jsonb; pid bigint; prod uuid; erro text; hoje date := current_date;
begin
  insert into public.zoho_registros (produto, modulo, zoho_id, nome, dados) values
    ('books', 'items', 'TESTE-ITEM-G1', 'Sensor TESTE', '{"product_type": "goods", "unit": "un"}'),
    ('books', 'items', 'TESTE-ITEM-G2', 'Teclado TESTE', '{"product_type": "goods"}'),
    ('books', 'items', 'TESTE-ITEM-G3', 'Módulo TESTE', '{"product_type": "goods"}'),
    ('books', 'items', 'TESTE-ITEM-S1', 'Instalação TESTE', '{"product_type": "service"}'),
    ('books', 'items', 'TESTE-ITEM-OK', 'Central TESTE', '{"product_type": "goods"}');
  insert into public.produtos (codigo, nome, zoho_item_id, origem) values ('PRD-T001', 'Central TESTE', 'TESTE-ITEM-OK', 'manual') returning id into prod;
  insert into public.zoho_registros (produto, modulo, zoho_id, nome, dados) values
    ('books', 'estimates', 'TESTE-EST-1', 'EST-T001', jsonb_build_object('estimate_number', 'EST-T001', 'date', hoje - 1, 'line_items', jsonb_build_array(
      jsonb_build_object('item_id', 'TESTE-ITEM-G1', 'name', 'Sensor TESTE', 'unit', 'un', 'rate', 100),
      jsonb_build_object('item_id', '', 'name', '  Suporte   especial TESTE ', 'rate', 50),
      jsonb_build_object('item_id', 'TESTE-ITEM-S1', 'name', 'Instalação TESTE', 'rate', 300),
      jsonb_build_object('item_id', 'TESTE-ITEM-OK', 'name', 'Central TESTE', 'rate', 900)))),
    ('books', 'estimates', 'TESTE-EST-2', 'EST-T002', jsonb_build_object('estimate_number', 'EST-T002', 'date', hoje, 'line_items', jsonb_build_array(
      jsonb_build_object('item_id', 'TESTE-ITEM-G1', 'name', 'Sensor TESTE', 'rate', 120),
      jsonb_build_object('item_id', 'TESTE-ITEM-G2', 'name', 'Teclado TESTE', 'rate', 80),
      jsonb_build_object('item_id', 'TESTE-ITEM-G3', 'name', 'Módulo TESTE', 'rate', 70)))),
    ('books', 'estimates', 'TESTE-EST-0', 'EST-T000', jsonb_build_object('estimate_number', 'EST-T000', 'date', hoje - 30, 'line_items', jsonb_build_array(
      jsonb_build_object('item_id', '', 'name', 'Item antigo TESTE', 'rate', 10))));

  r := public.cadastro_pendente_atualizar(hoje - 2);
  insert into resultado (passo, ok, detalhe) values ('1. produto do Zoho sem produto do VEOS vira pendência com os 2 orçamentos e o preço mais recente',
    exists (select 1 from public.cadastro_pendente where chave = 'zoho:TESTE-ITEM-G1' and motivo = 'sem_produto_veos' and situacao = 'pendente'
      and orcamentos = array['EST-T001', 'EST-T002'] and ocorrencias = 2 and ultimo_preco_venda = 120 and primeiro_orcamento = 'EST-T001' and unidade = 'un'),
    (select string_agg(chave || ' ' || array_to_string(orcamentos, ',') || ' ' || ultimo_preco_venda, '; ') from public.cadastro_pendente where chave like '%TESTE%' or chave like '%teste%'));
  insert into resultado (passo, ok, detalhe) values ('2. linha digitada sem item no Zoho vira pendência pelo nome normalizado',
    exists (select 1 from public.cadastro_pendente where chave = 'texto:suporte especial teste' and motivo = 'sem_item_zoho' and nome = 'Suporte especial TESTE'), null);
  insert into resultado (passo, ok, detalhe) values ('3. serviço e item já ligado a produto do VEOS não viram pendência',
    not exists (select 1 from public.cadastro_pendente where chave in ('zoho:TESTE-ITEM-S1', 'zoho:TESTE-ITEM-OK')), null);
  insert into resultado (passo, ok, detalhe) values ('4. orçamento antes do início do controle fica fora',
    not exists (select 1 from public.cadastro_pendente where chave = 'texto:item antigo teste'), null);

  -- cadastrar
  select id into pid from public.cadastro_pendente where chave = 'zoho:TESTE-ITEM-G1';
  r := public.cadastro_pendente_cadastrar(pid, '{"nome": "Sensor de presença TESTE", "marca": "Marca TESTE", "categoria": "Sensores"}', u);
  insert into resultado (passo, ok, detalhe) values ('5. cadastrar cria o produto (origem zoho, ligado ao item, sem custo nem preço) e fecha a pendência',
    exists (select 1 from public.produtos where id = (r ->> 'produto_id')::uuid and codigo = r ->> 'codigo' and codigo ~ '^PRD-[0-9]{4}$' and nome = 'Sensor de presença TESTE'
      and zoho_item_id = 'TESTE-ITEM-G1' and origem = 'zoho' and unidade = 'un' and custo_ultimo is null and preco_venda is null and situacao = 'ativo')
    and exists (select 1 from public.cadastro_pendente where id = pid and situacao = 'cadastrado' and produto_id = (r ->> 'produto_id')::uuid and resolvido_por = u), r::text);
  begin perform public.cadastro_pendente_cadastrar(pid, '{}', u); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('6. pendência resolvida não é cadastrada de novo', erro like 'pendência já resolvida%', erro);
  perform public.cadastro_pendente_atualizar(hoje - 2);
  insert into resultado (passo, ok, detalhe) values ('7. nova leitura não reabre o item cadastrado',
    (select count(*) = 1 from public.cadastro_pendente where chave = 'zoho:TESTE-ITEM-G1' and situacao = 'cadastrado'), null);

  -- dispensar
  select id into pid from public.cadastro_pendente where chave = 'texto:suporte especial teste';
  begin perform public.cadastro_pendente_dispensar(pid, ' ', u); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('8. dispensar sem motivo é recusado', erro = 'informe o motivo da dispensa', erro);
  perform public.cadastro_pendente_dispensar(pid, 'Item genérico de orçamento TESTE', u);
  perform public.cadastro_pendente_atualizar(hoje - 2);
  insert into resultado (passo, ok, detalhe) values ('9. dispensado continua dispensado depois de nova leitura',
    exists (select 1 from public.cadastro_pendente where id = pid and situacao = 'dispensado' and motivo_dispensa = 'Item genérico de orçamento TESTE'), null);

  -- ligar a produto existente
  select id into pid from public.cadastro_pendente where chave = 'zoho:TESTE-ITEM-G2';
  r := public.cadastro_pendente_ligar(pid, prod, u);
  insert into resultado (passo, ok, detalhe) values ('10. ligar a um produto existente cria o vínculo confirmado e fecha a pendência',
    exists (select 1 from public.produto_vinculos_zoho where produto_id = prod and zoho_item_id = 'TESTE-ITEM-G2' and relacao = 'mesmo_produto' and situacao = 'confirmado')
    and exists (select 1 from public.cadastro_pendente where id = pid and situacao = 'cadastrado' and produto_id = prod), r::text);

  -- resolve sozinho
  update public.produtos set zoho_item_id = 'TESTE-ITEM-G3' where codigo = 'PRD-T001';
  perform public.cadastro_pendente_atualizar(hoje - 2);
  insert into resultado (passo, ok, detalhe) values ('11. item que ganhou produto por outro caminho é resolvido sozinho',
    exists (select 1 from public.cadastro_pendente where chave = 'zoho:TESTE-ITEM-G3' and situacao = 'cadastrado' and produto_id = prod), null);
end $$;

insert into resultado (passo, ok, detalhe) select '12. anon e usuários logados não executam as funções direto',
  not has_function_privilege('anon', 'public.cadastro_pendente_cadastrar(bigint, jsonb, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.cadastro_pendente_dispensar(bigint, text, uuid)', 'execute'), null;
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
