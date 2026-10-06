-- Testes do CAIXA REAL: extrato (OFX/CSV) com deduplicacao, regras de categoria, saldo pela ancora,
-- conciliacao com parcela / conta a pagar / transferencia, imutabilidade e contas recorrentes.
-- Dados TESTE isolados; tudo desfeito no fim. Uso: npx supabase db query --linked -f tests/banco/caixa_real.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare
  u uuid := '00000000-0000-0000-0000-0000000f0001'; c1 uuid; c2 uuid; r jsonb; r2 jsonb; erro text; ped uuid; par uuid; k uuid; m1 uuid; m2 uuid; rec uuid; s numeric; n integer;
begin
  insert into public.contas_bancarias (nome, banco, final_conta, criado_por) values ('Conta TESTE', 'Banco TESTE', '1234', u) returning id into c1;
  insert into public.contas_bancarias (nome, banco, final_conta, criado_por) values ('Aplicação TESTE', 'Banco TESTE', '9999', u) returning id into c2;
  insert into public.regras_categoria (padrao, sinal, categoria, criado_por) values ('TARIFA TESTE', 'saida', '6.1', u);

  r := public.extrato_importar(jsonb_build_object('usuario', u, 'conta_id', c1, 'arquivo', 'teste.ofx', 'formato', 'ofx', 'saldo_final', 1000, 'saldo_final_em', current_date - 1,
    'linhas', jsonb_build_array(
      jsonb_build_object('data', current_date - 3, 'valor', 2500, 'descricao', 'PIX RECEBIDO CLIENTE TESTE', 'id_externo', 'F1'),
      jsonb_build_object('data', current_date - 2, 'valor', -300, 'descricao', 'PAGTO BOLETO FORNECEDOR TESTE', 'id_externo', 'F2'),
      jsonb_build_object('data', current_date - 2, 'valor', -12.9, 'descricao', 'TARIFA TESTE PACOTE', 'id_externo', 'F3'),
      jsonb_build_object('data', current_date - 1, 'valor', -500, 'descricao', 'TED PARA APLICACAO TESTE', 'id_externo', 'F4'))));
  r2 := public.extrato_importar(jsonb_build_object('usuario', u, 'conta_id', c1, 'arquivo', 'teste-de-novo.ofx', 'formato', 'ofx',
    'linhas', jsonb_build_array(jsonb_build_object('data', current_date - 3, 'valor', 2500, 'descricao', 'PIX RECEBIDO CLIENTE TESTE', 'id_externo', 'F1'),
      jsonb_build_object('data', current_date - 1, 'valor', 40, 'descricao', 'ESTORNO TESTE', 'id_externo', 'F5'))));
  insert into resultado (passo, ok, detalhe) values ('1. importa 4 lançamentos; reimportar o mesmo FITID não duplica (1 nova, 1 repetida)',
    (r ->> 'novas')::int = 4 and (r ->> 'repetidas')::int = 0 and (r2 ->> 'novas')::int = 1 and (r2 ->> 'repetidas')::int = 1, r::text || r2::text);
  insert into resultado (passo, ok, detalhe) values ('2. regra aprendida classifica a tarifa na importação',
    (select categoria = '6.1' and classificado_por = 'regra' from public.movimentos_bancarios where conta_id = c1 and id_externo = 'F3'), null);

  -- CSV sem FITID: dois lancamentos iguais no mesmo dia ficam (ordem no dia), e reimportar nao duplica
  r := public.extrato_importar(jsonb_build_object('usuario', u, 'conta_id', c2, 'arquivo', 'a.csv', 'formato', 'csv', 'linhas', jsonb_build_array(
    jsonb_build_object('data', current_date - 1, 'valor', 500, 'descricao', 'TED RECEBIDA', 'seq', 1),
    jsonb_build_object('data', current_date - 1, 'valor', 50, 'descricao', 'PIX', 'seq', 1),
    jsonb_build_object('data', current_date - 1, 'valor', 50, 'descricao', 'PIX', 'seq', 2))));
  r2 := public.extrato_importar(jsonb_build_object('usuario', u, 'conta_id', c2, 'arquivo', 'a.csv', 'formato', 'csv', 'linhas', jsonb_build_array(
    jsonb_build_object('data', current_date - 1, 'valor', 50, 'descricao', 'PIX', 'seq', 2))));
  insert into resultado (passo, ok, detalhe) values ('3. CSV: lançamentos idênticos no mesmo dia são distintos pela ordem; reimportar não duplica',
    (r ->> 'novas')::int = 3 and (r2 ->> 'novas')::int = 0, r::text || r2::text);

  -- saldo: ancora 1000 em D-1 (inclui tudo ate D-1); depois +40 do estorno (D-1 ja incluido? nao: estorno e D-1, ja dentro da ancora)
  select saldo into s from public.saldo_contas(current_date) where conta_id = c1;
  insert into resultado (passo, ok, detalhe) values ('4. saldo de hoje = saldo do extrato (âncora) + lançamentos depois dela', s = 1000, s::text);
  select saldo into s from public.saldo_contas(current_date - 3) where conta_id = c1;
  insert into resultado (passo, ok, detalhe) values ('5. saldo numa data anterior volta pelos lançamentos (1000 + 300 + 12,90 + 500 − 40)', s = 1772.9, s::text);
  select saldo into s from public.saldo_contas(current_date) where conta_id = c2;
  insert into resultado (passo, ok, detalhe) values ('6. conta sem saldo informado = LACUNA (null), nunca zero', s is null, coalesce(s::text, 'null'));

  -- conciliacao com parcela de pedido
  r := public.pedido_criar(jsonb_build_object('chave', 'TESTE-CAIXA-PED', 'cliente_nome', 'Cliente TESTE', 'usuario', u,
    'itens', jsonb_build_array(jsonb_build_object('nome', 'Serviço TESTE', 'tipo', 'servico', 'quantidade', 1, 'preco_unit', 5000))));
  ped := (r ->> 'id')::uuid;
  perform public.pedido_parcelas(ped, jsonb_build_array(jsonb_build_object('vencimento', current_date - 4, 'valor', 2500), jsonb_build_object('vencimento', current_date + 30, 'valor', 2500)), u);
  select id into par from public.parcelas where pedido_id = ped and numero = 1;
  select id into m1 from public.movimentos_bancarios where conta_id = c1 and id_externo = 'F1';
  insert into resultado (passo, ok, detalhe) values ('7. sugestão única: PIX de 2.500 casa com a parcela 1 (1 dia de diferença)',
    exists (select 1 from jsonb_array_elements(public.conciliacao_sugestoes()) x where (x ->> 'movimento_id')::uuid = m1 and (x ->> 'alvo_id')::uuid = par and (x ->> 'unica')::boolean), null);
  perform public.movimento_conciliar(jsonb_build_object('usuario', u, 'movimento_id', m1, 'tipo', 'parcela', 'alvo_id', par));
  insert into resultado (passo, ok, detalhe) values ('8. conciliar recebe a parcela na data e no valor do extrato e classifica como recebimento',
    (select estado = 'recebida' and recebido_em = current_date - 3 and valor_recebido = 2500 from public.parcelas where id = par)
    and (select parcela_id = par and categoria = '1.1' from public.movimentos_bancarios where id = m1), null);
  begin perform public.movimento_conciliar(jsonb_build_object('usuario', u, 'movimento_id', m1, 'tipo', 'parcela', 'alvo_id', par)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('9. o mesmo lançamento não concilia duas vezes', erro like '%ja conciliado%', erro);

  -- conciliacao com conta a pagar
  r := public.conta_pagar_criar(jsonb_build_object('chave', 'TESTE-CAIXA-CP', 'usuario', u, 'descricao', 'Fornecedor TESTE', 'fornecedor', 'Fornecedor TESTE', 'categoria', 'servico_terceiro', 'vencimento', current_date - 2, 'valor', 300));
  k := (r ->> 'id')::uuid;
  select id into m2 from public.movimentos_bancarios where conta_id = c1 and id_externo = 'F2';
  perform public.movimento_conciliar(jsonb_build_object('usuario', u, 'movimento_id', m2, 'tipo', 'conta_pagar', 'alvo_id', k));
  insert into resultado (passo, ok, detalhe) values ('10. conciliar paga a conta pelo extrato e herda a categoria (3.3 terceiros)',
    (select estado = 'paga' and pago_em = current_date - 2 and valor_pago = 300 from public.contas_pagar where id = k) and (select categoria = '3.3' from public.movimentos_bancarios where id = m2), null);
  begin perform public.movimento_conciliar(jsonb_build_object('usuario', u, 'movimento_id', m1, 'tipo', 'conta_pagar', 'alvo_id', k)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('11. entrada não liquida conta a pagar', erro like '%saida%', erro);

  -- transferencia entre contas
  select id into m1 from public.movimentos_bancarios where conta_id = c1 and id_externo = 'F4';
  select id into m2 from public.movimentos_bancarios where conta_id = c2 and valor = 500;
  insert into resultado (passo, ok, detalhe) values ('12. transferência sugerida entre as contas (−500 e +500)',
    exists (select 1 from jsonb_array_elements(public.conciliacao_sugestoes()) x where (x ->> 'movimento_id')::uuid = m1 and (x ->> 'tipo') = 'transferencia'), null);
  perform public.movimento_conciliar(jsonb_build_object('usuario', u, 'movimento_id', m1, 'tipo', 'transferencia', 'alvo_id', m2));
  insert into resultado (passo, ok, detalhe) values ('13. transferência marca os dois lados como 8.1 (não é receita nem despesa)',
    (select count(*) = 2 from public.movimentos_bancarios where id in (m1, m2) and categoria = '8.1' and transferencia_de is not null), null);

  -- classificacao manual com regra aprendida
  select id into m1 from public.movimentos_bancarios where conta_id = c2 and descricao = 'PIX' limit 1;
  r := public.movimento_classificar(jsonb_build_object('usuario', u, 'movimento_id', m1, 'categoria', '1.9', 'padrao', 'PIX'));
  insert into resultado (passo, ok, detalhe) values ('14. classificar com "lembrar" cria a regra e classifica o outro PIX igual',
    (r ->> 'outros_classificados')::int = 1 and exists (select 1 from public.regras_categoria where padrao = 'PIX' and sinal = 'entrada' and categoria = '1.9'), r::text);
  begin perform public.movimento_classificar(jsonb_build_object('usuario', u, 'movimento_id', m1, 'categoria', '1.9', 'padrao', 'NAO APARECE')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('15. padrão que não está na descrição é recusado', erro like '%padrao%', erro);

  -- imutabilidade
  begin update public.movimentos_bancarios set valor = 1 where id = m1; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('16. valor do extrato não muda', erro like '%fato do banco%', erro);
  begin delete from public.movimentos_bancarios where id = m1; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('17. lançamento do extrato não é apagado', erro like '%nao pode ser apagado%', erro);
  begin update public.financeiro_historico set acao = 'x'; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('18. trilha financeira imutável', erro is not null, erro);

  -- recorrentes
  r := public.recorrente_salvar(jsonb_build_object('usuario', u, 'descricao', 'Contador TESTE', 'fornecedor', 'Escritório TESTE', 'plano_conta', '4.3', 'valor', 450, 'dia_vencimento', 10));
  rec := (r ->> 'id')::uuid;
  select count(*) into n from public.contas_pagar where recorrente_id = rec;
  insert into resultado (passo, ok, detalhe) values ('19. recorrente gera as contas do mês atual até ~100 dias à frente (4 meses), dia 10, categoria despesa fixa',
    n = 4 and (select bool_and(extract(day from vencimento) = 10 and categoria = 'despesa_fixa' and plano_conta = '4.3' and valor = 450) from public.contas_pagar where recorrente_id = rec), n::text);
  perform public.recorrentes_gerar((current_date + interval '100 days')::date);
  insert into resultado (passo, ok, detalhe) values ('20. gerar de novo não duplica', (select count(*) = n from public.contas_pagar where recorrente_id = rec), null);
  perform public.recorrente_salvar(jsonb_build_object('usuario', u, 'id', rec, 'valor', 480));
  insert into resultado (passo, ok, detalhe) values ('21. alterar o valor muda só as contas futuras em aberto',
    (select bool_and(valor = 480) from public.contas_pagar where recorrente_id = rec and vencimento > current_date) and
    (select coalesce(bool_and(valor = 450), true) from public.contas_pagar where recorrente_id = rec and vencimento <= current_date), null);
  r := public.recorrente_salvar(jsonb_build_object('usuario', u, 'descricao', 'Empréstimo TESTE', 'fornecedor', 'Banco TESTE', 'plano_conta', '6.2', 'valor', 1000, 'dia_vencimento', 5, 'parcelas', 2));
  insert into resultado (passo, ok, detalhe) values ('22. dívida com 2 parcelas gera só 2 contas', (select count(*) = 2 from public.contas_pagar where recorrente_id = (r ->> 'id')::uuid), null);
  perform public.recorrente_salvar(jsonb_build_object('usuario', u, 'id', rec, 'ativa', false));
  insert into resultado (passo, ok, detalhe) values ('23. desativar cancela as contas futuras em aberto',
    not exists (select 1 from public.contas_pagar where recorrente_id = rec and vencimento > current_date and estado = 'aberta'), null);
end $$;

insert into resultado (passo, ok, detalhe) select '24. anon não executa as funções do caixa', not has_function_privilege('anon', 'public.extrato_importar(jsonb)', 'execute') and not has_function_privilege('authenticated', 'public.movimento_conciliar(jsonb)', 'execute'), null;
insert into resultado (passo, ok, detalhe) select '25. agendamento diário das recorrentes existe', exists (select 1 from cron.job where jobname = 'veos-recorrentes'), null;
select count(*) filter (where ok) || '/' || count(*) || ' cenarios OK' as resultado, string_agg(passo || coalesce(' → ' || detalhe, ''), ' | ') filter (where not ok) as falhas from resultado;
rollback;
