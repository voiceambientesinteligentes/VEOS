-- RT e comissao do pedido viram contas a pagar automaticas (assinatura, a cada parcela, no fim).
-- Dados TESTE isolados; tudo desfeito. Uso: npx supabase db query --linked -f tests/banco/pedido_rt.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare u uuid := '00000000-0000-0000-0000-0000000a0001'; r jsonb; ped uuid; p2 uuid; p3 uuid; erro text; par uuid;
begin
  -- 1) assinatura: RT 10% + comissao 5% inteiras quando a entrada e recebida
  r := public.pedido_criar(jsonb_build_object('chave', 'TESTE-RT-1', 'cliente_nome', 'Cliente TESTE', 'usuario', u,
    'itens', jsonb_build_array(jsonb_build_object('nome', 'Serviço TESTE', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 10000))));
  ped := (r ->> 'id')::uuid;
  perform public.pedido_definir_rt(jsonb_build_object('usuario', u, 'pedido_id', ped, 'rt_pct', 10, 'comissao_pct', 5, 'rt_favorecido', 'Arquiteta TESTE', 'rt_quando', 'assinatura'));
  perform public.pedido_parcelas(ped, jsonb_build_array(jsonb_build_object('vencimento', current_date, 'valor', 5000), jsonb_build_object('vencimento', current_date + 30, 'valor', 5000)), u);
  insert into resultado (passo, ok, detalhe) values ('1. sem parcela recebida, nenhuma conta de RT', not exists (select 1 from public.contas_pagar where pedido_id = ped), null);
  select id into par from public.parcelas where pedido_id = ped and numero = 1;
  perform public.parcela_receber(par, current_date, 5000, u);
  insert into resultado (passo, ok, detalhe) values ('2. entrada recebida: RT 1.000 (3.5, Arquiteta TESTE) e comissão 500 (3.4) inteiras, vencendo hoje',
    (select count(*) = 2 from public.contas_pagar where pedido_id = ped)
    and exists (select 1 from public.contas_pagar where pedido_id = ped and plano_conta = '3.5' and valor = 1000 and fornecedor = 'Arquiteta TESTE' and vencimento = current_date and estado = 'aberta')
    and exists (select 1 from public.contas_pagar where pedido_id = ped and plano_conta = '3.4' and valor = 500 and fornecedor = 'Indicação/comissão'),
    (select string_agg(descricao || '=' || valor, '; ') from public.contas_pagar where pedido_id = ped));
  select id into par from public.parcelas where pedido_id = ped and numero = 2;
  perform public.parcela_receber(par, current_date, 5000, u);
  insert into resultado (passo, ok, detalhe) values ('3. segunda parcela não gera RT de novo', (select count(*) = 2 from public.contas_pagar where pedido_id = ped), null);
  begin perform public.pedido_definir_rt(jsonb_build_object('usuario', u, 'pedido_id', ped, 'rt_pct', 8)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('4. depois de gerada, mudar a RT é recusado', erro is not null, erro);

  -- 2) a cada parcela: proporcional ao recebido
  r := public.pedido_criar(jsonb_build_object('chave', 'TESTE-RT-2', 'cliente_nome', 'Cliente TESTE', 'usuario', u,
    'itens', jsonb_build_array(jsonb_build_object('nome', 'Serviço TESTE', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 10000))));
  p2 := (r ->> 'id')::uuid;
  perform public.pedido_definir_rt(jsonb_build_object('usuario', u, 'pedido_id', p2, 'rt_pct', 10, 'rt_quando', 'parcelas'));
  perform public.pedido_parcelas(p2, jsonb_build_array(jsonb_build_object('vencimento', current_date, 'valor', 4000), jsonb_build_object('vencimento', current_date + 30, 'valor', 6000)), u);
  select id into par from public.parcelas where pedido_id = p2 and numero = 1;
  perform public.parcela_receber(par, current_date, 4000, u);
  insert into resultado (passo, ok, detalhe) values ('5. a cada parcela: RT de 400 sobre os 4.000 recebidos; sem comissão (0%)',
    (select count(*) = 1 and sum(valor) = 400 from public.contas_pagar where pedido_id = p2), null);

  -- 3) no fim: so quando a ultima parcela entra
  r := public.pedido_criar(jsonb_build_object('chave', 'TESTE-RT-3', 'cliente_nome', 'Cliente TESTE', 'usuario', u,
    'itens', jsonb_build_array(jsonb_build_object('nome', 'Serviço TESTE', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 10000))));
  p3 := (r ->> 'id')::uuid;
  perform public.pedido_definir_rt(jsonb_build_object('usuario', u, 'pedido_id', p3, 'rt_pct', 10, 'rt_quando', 'fim'));
  perform public.pedido_parcelas(p3, jsonb_build_array(jsonb_build_object('vencimento', current_date, 'valor', 4000), jsonb_build_object('vencimento', current_date + 30, 'valor', 6000)), u);
  select id into par from public.parcelas where pedido_id = p3 and numero = 1;
  perform public.parcela_receber(par, current_date, 4000, u);
  insert into resultado (passo, ok, detalhe) values ('6. no fim: nada na primeira parcela', not exists (select 1 from public.contas_pagar where pedido_id = p3), null);
  select id into par from public.parcelas where pedido_id = p3 and numero = 2;
  perform public.parcela_receber(par, current_date, 6000, u);
  insert into resultado (passo, ok, detalhe) values ('7. no fim: RT inteira (1.000) quando a última parcela entra', (select count(*) = 1 and sum(valor) = 1000 from public.contas_pagar where pedido_id = p3), null);

  -- pedido antigo sem RT definida: nada acontece
  r := public.pedido_criar(jsonb_build_object('chave', 'TESTE-RT-4', 'cliente_nome', 'Cliente TESTE', 'usuario', u,
    'itens', jsonb_build_array(jsonb_build_object('nome', 'Serviço TESTE', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 1000))));
  perform public.pedido_parcelas((r ->> 'id')::uuid, jsonb_build_array(jsonb_build_object('vencimento', current_date, 'valor', 1000)), u);
  select id into par from public.parcelas where pedido_id = (r ->> 'id')::uuid;
  perform public.parcela_receber(par, current_date, 1000, u);
  insert into resultado (passo, ok, detalhe) values ('8. pedido sem RT definida não gera conta', not exists (select 1 from public.contas_pagar where pedido_id = (r ->> 'id')::uuid), null);
end $$;

insert into resultado (passo, ok, detalhe) select '9. anon não define RT', not has_function_privilege('anon', 'public.pedido_definir_rt(jsonb)', 'execute'), null;
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
