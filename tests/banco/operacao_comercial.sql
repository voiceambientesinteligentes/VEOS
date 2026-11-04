-- Operacao comercial do zero (04/11/2026): clientes, ciclo do orcamento (enviado/aceito/recusado),
-- nova versao a partir de enviado e usuarios_teste(). Dados TESTE isolados; tudo desfeito. Uso:
-- npx supabase db query --linked -f tests/banco/operacao_comercial.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare u uuid := '00000000-0000-0000-0000-0000000e0b01'; robo uuid := '00000000-0000-0000-0000-0000000e0b02'; erro text; r jsonb; c1 uuid; o1 uuid; o2 uuid; p1 uuid; item jsonb;
begin
  insert into auth.users (id, email, aud, role) values (u, 'pessoa.teste.op@exemplo.invalid', 'authenticated', 'authenticated'),
    (robo, 'robo-op@veos-teste.invalid', 'authenticated', 'authenticated');

  -- clientes
  r := public.cliente_salvar(jsonb_build_object('chave', 'TESTE-CLI-1', 'usuario', u, 'dados', jsonb_build_object('tipo', 'pf', 'nome', 'Cliente TESTE Op', 'telefone', '47999998888', 'documento', '52998224725', 'origem', 'instagram')));
  c1 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('1. cria cliente com codigo CLI-', (r ->> 'codigo') like 'CLI-%' and not (r ->> 'repetido')::boolean, r::text);
  r := public.cliente_salvar(jsonb_build_object('chave', 'TESTE-CLI-1', 'usuario', u, 'dados', jsonb_build_object('nome', 'Outro')));
  insert into resultado (passo, ok, detalhe) values ('2. mesma chave nao duplica', (r ->> 'repetido')::boolean and (r ->> 'id')::uuid = c1, r::text);
  begin perform public.cliente_salvar(jsonb_build_object('chave', 'TESTE-CLI-2', 'usuario', u, 'dados', jsonb_build_object('nome', 'X', 'documento', '123'))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('3. documento fora do formato e recusado pelo banco', erro is not null, erro);
  perform public.cliente_salvar(jsonb_build_object('id', c1, 'usuario', u, 'dados', jsonb_build_object('cidade', 'Itajaí', 'uf', 'SC')));
  insert into resultado (passo, ok, detalhe) values ('4. alteracao parcial mantem o resto e registra historico',
    (select cidade = 'Itajaí' and telefone = '47999998888' and nome = 'Cliente TESTE Op' from public.clientes where id = c1)
    and (select count(*) = 2 from public.clientes_historico where cliente_id = c1), null);
  r := public.cliente_salvar(jsonb_build_object('chave', 'TESTE-CLI-3', 'usuario', u, 'dados', jsonb_build_object('nome', 'Zoho TESTE', 'zoho_contact_id', 'zTESTE1', 'email', 'z@teste.com')));
  insert into resultado (passo, ok, detalhe) values ('5. cliente do Zoho: o mesmo contato nao vira dois clientes',
    (public.cliente_salvar(jsonb_build_object('chave', 'TESTE-CLI-4', 'usuario', u, 'dados', jsonb_build_object('nome', 'Zoho TESTE', 'zoho_contact_id', 'zTESTE1'))) ->> 'id') = (r ->> 'id'), null);

  -- orcamento ligado ao cliente, com validade e produto
  item := jsonb_build_object('nome', 'Interruptor TESTE', 'tipo', 'produto', 'quantidade', 2, 'unidade', 'un', 'preco_unit', 800, 'custo_unit', 217, 'secao', 'Sala',
    'produto_id', (select id from public.produtos limit 1));
  r := public.orcamento_veos_criar(jsonb_build_object('chave', 'TESTE-OP-1', 'usuario', u, 'cliente_id', c1, 'cliente_nome', 'Cliente TESTE Op', 'valor_total', 1600, 'validade', '2026-11-20', 'prazo_execucao', '30 dias', 'itens', jsonb_build_array(item)));
  o1 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('6. orcamento guarda cliente, validade, prazo e produto do item',
    (select cliente_id = c1 and validade = '2026-11-20' and prazo_execucao = '30 dias' from public.comercial_orcamentos where id = o1)
    and (select produto_id is not null and unidade = 'un' and secao = 'Sala' from public.comercial_orcamento_itens where orcamento_id = o1), r::text);
  begin perform public.orcamento_veos_criar(jsonb_build_object('chave', 'TESTE-OP-X', 'usuario', u, 'cliente_id', gen_random_uuid(), 'cliente_nome', 'x', 'valor_total', 1, 'itens', jsonb_build_array(item))); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('7. cliente inexistente e recusado', erro like '%cliente inexistente%', erro);

  -- ciclo
  r := public.orcamento_veos_situacao(jsonb_build_object('id', o1, 'estado', 'enviado', 'usuario', u));
  insert into resultado (passo, ok, detalhe) values ('8. marcar enviado grava a data', (select estado = 'enviado' and enviado_em is not null from public.comercial_orcamentos where id = o1), r::text);
  r := public.orcamento_veos_criar(jsonb_build_object('chave', 'TESTE-OP-2', 'usuario', u, 'substitui', o1, 'cliente_id', c1, 'cliente_nome', 'Cliente TESTE Op', 'valor_total', 1500, 'itens', jsonb_build_array(item)));
  o2 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('9. orcamento enviado aceita nova versao (a anterior fica substituida)',
    (select estado from public.comercial_orcamentos where id = o1) = 'substituido' and (select versao from public.comercial_orcamentos where id = o2) = 2, r::text);
  begin perform public.orcamento_veos_situacao(jsonb_build_object('id', o2, 'estado', 'recusado', 'usuario', u)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('10. recusar exige motivo', erro like '%motivo%', erro);
  begin perform public.orcamento_veos_situacao(jsonb_build_object('id', o2, 'estado', 'aceito', 'usuario', u)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('11. aceito exige o pedido', erro like '%pedido%', erro);
  r := public.pedido_criar(jsonb_build_object('chave', 'TESTE-OP-PED', 'usuario', u, 'cliente_nome', 'Cliente TESTE Op', 'valor_total', '1500.00', 'orcamento_numero', (select numero from public.comercial_orcamentos where id = o2),
    'itens', jsonb_build_array(jsonb_build_object('nome', 'Interruptor TESTE', 'tipo', 'produto', 'quantidade', '2', 'preco_unit', '750.00', 'custo_unit', '217'))));
  p1 := (r ->> 'id')::uuid;
  r := public.orcamento_veos_situacao(jsonb_build_object('id', o2, 'estado', 'aceito', 'pedido_id', p1, 'usuario', u));
  insert into resultado (passo, ok, detalhe) values ('12. aceito liga o pedido e a decisao', (select estado = 'aceito' and pedido_id = p1 and decidido_em is not null from public.comercial_orcamentos where id = o2), r::text);
  begin perform public.orcamento_veos_situacao(jsonb_build_object('id', o2, 'estado', 'rascunho', 'usuario', u)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('13. aceito nao volta atras', erro like '%não muda%', erro);
  insert into resultado (passo, ok, detalhe) values ('14. historico do ciclo completo',
    (select count(*) from public.comercial_orcamentos_historico where orcamento_id = o1 and acao in ('criado', 'enviado', 'substituido')) = 3
    and (select count(*) from public.comercial_orcamentos_historico where orcamento_id = o2 and acao in ('nova_versao', 'aceito')) = 2, null);

  -- robos de teste
  insert into resultado (passo, ok, detalhe) values ('15. usuarios_teste() lista so os robos',
    robo in (select public.usuarios_teste()) and u not in (select public.usuarios_teste()), null);

  -- numeracao: quem tem e-mail .invalid usa a serie T; pessoa real usa a serie da empresa
  insert into auth.users (id, email, aud, role) values ('00000000-0000-0000-0000-0000000e0b03', 'numeracao.real@voice-ensaio.com.br', 'authenticated', 'authenticated');
  r := public.cliente_salvar(jsonb_build_object('chave', 'TESTE-CLI-REAL', 'usuario', '00000000-0000-0000-0000-0000000e0b03', 'dados', jsonb_build_object('nome', 'Cliente Real Ensaio', 'telefone', '4733330000')));
  insert into resultado (passo, ok, detalhe) values ('18. numeracao: teste usa CLI-T, pessoa real usa CLI-',
    (select codigo like 'CLI-T%' from public.clientes where id = c1) and (r ->> 'codigo') ~ '^CLI-[0-9]{5}$', r::text);
end $$;

insert into resultado (passo, ok, detalhe) select '16. anon e usuarios logados nao executam as funcoes direto',
  not has_function_privilege('anon', 'public.cliente_salvar(jsonb)', 'execute') and not has_function_privilege('authenticated', 'public.cliente_salvar(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.orcamento_veos_situacao(jsonb)', 'execute') and not has_function_privilege('authenticated', 'public.usuarios_teste()', 'execute'), null;
insert into resultado (passo, ok, detalhe) select '17. clientes sem policy (so a funcao api le)',
  (select relrowsecurity from pg_class where oid = 'public.clientes'::regclass) and not exists (select 1 from pg_policies where tablename = 'clientes'), null;
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
