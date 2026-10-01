-- Testes de OBRA E POS-VENDA no pedido (projeto, horas, aceite, garantia). Tudo desfeito no fim.
-- Uso: npx supabase db query --linked -f tests/banco/obra.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare u uuid := '00000000-0000-0000-0000-0000000b0001'; ped uuid; r jsonb; erro text; proj text;
begin
  insert into public.pedidos (chave, cliente_nome, estado, valor_total, custo_total, criado_por) values ('TESTE-OBRA', 'Cliente TESTE', 'rascunho', 10000, 6000, u) returning id into ped;
  begin perform public.pedido_lancar_horas(jsonb_build_object('chave', 'TESTE-H0', 'usuario', u, 'pedido_id', ped, 'data', current_date, 'pessoa', 'Técnico TESTE', 'horas', 4)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('1. horas só em pedido confirmado', erro like '%pedido confirmado%', erro);
  update public.pedidos set estado = 'confirmado', confirmado_em = now() where id = ped;
  r := public.pedido_lancar_horas(jsonb_build_object('chave', 'TESTE-H1', 'usuario', u, 'pedido_id', ped, 'data', current_date, 'pessoa', 'Técnico TESTE', 'horas', 4, 'custo_hora', 50));
  insert into resultado (passo, ok, detalhe) values ('2. horas lançadas; repetir a chave não duplica',
    (public.pedido_lancar_horas(jsonb_build_object('chave', 'TESTE-H1', 'usuario', u, 'pedido_id', ped, 'data', current_date, 'pessoa', 'x', 'horas', 9)) ->> 'repetido')::boolean
    and (select count(*) = 1 and sum(horas) = 4 from public.pedido_horas where pedido_id = ped), r::text);
  begin perform public.pedido_lancar_horas(jsonb_build_object('chave', 'TESTE-H2', 'usuario', u, 'pedido_id', ped, 'data', current_date, 'pessoa', 'Técnico TESTE', 'horas', -1)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('3. correção (horas negativas) exige descrição', erro is not null, erro);
  perform public.pedido_lancar_horas(jsonb_build_object('chave', 'TESTE-H3', 'usuario', u, 'pedido_id', ped, 'data', current_date, 'pessoa', 'Técnico TESTE', 'horas', -1, 'descricao', 'TESTE lançado a mais'));
  begin perform public.pedido_lancar_horas(jsonb_build_object('chave', 'TESTE-H4', 'usuario', u, 'pedido_id', ped, 'data', current_date + 1, 'pessoa', 'x', 'horas', 1)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('4. correção aceita com descrição; data futura recusada', (select sum(horas) = 3 from public.pedido_horas where pedido_id = ped) and erro like '%futuro%', erro);
  begin delete from public.pedido_horas where pedido_id = ped; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('5. horas não podem ser apagadas', erro is not null, erro);

  select zoho_id into proj from public.zoho_registros where produto = 'projects' and modulo = 'projects' limit 1;
  begin perform public.pedido_vincular_projeto(ped, 'nao-existe-TESTE', u); erro := null; exception when others then erro := sqlerrm; end;
  if proj is not null then perform public.pedido_vincular_projeto(ped, proj, u); end if;
  insert into resultado (passo, ok, detalhe) values ('6. só vincula projeto que existe no espelho do Zoho Projects',
    erro like '%nao encontrado%' and (proj is null or (select projeto_zoho_id = proj from public.pedidos where id = ped)), erro);

  begin perform public.pedido_aceite(ped, current_date, null, u); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('7. aceite só depois da entrega', erro like '%depois da entrega%', erro);
  update public.pedidos set estado = 'entregue', entregue_em = now() where id = ped;
  begin perform public.pedido_aceite(ped, current_date, current_date, u); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('8. garantia precisa terminar depois do aceite', erro like '%garantia%', erro);
  perform public.pedido_aceite(ped, current_date, current_date + 365, u);
  insert into resultado (passo, ok, detalhe) values ('9. aceite e garantia gravados com histórico',
    (select aceite_em = current_date and garantia_ate = current_date + 365 from public.pedidos where id = ped)
    and exists (select 1 from public.pedidos_historico where pedido_id = ped and acao = 'aceite'), null);
  insert into public.pedido_anexos (pedido_id, nome, tipo, tamanho, caminho, enviado_por)
  select ped, 'termo-aceite-TESTE.pdf', 'aceite', 1000, 'TESTE/' || ped || '/termo.pdf', u;
  insert into resultado (passo, ok, detalhe) values ('10. anexo do tipo "aceite" é aceito', true, null);
  insert into resultado (passo, ok, detalhe) values ('11. só o servidor executa', not has_function_privilege('authenticated', 'public.pedido_aceite(uuid, date, date, uuid)', 'execute'), null);
end $$;

select n, passo, ok, left(detalhe, 160) as detalhe from resultado order by n;
rollback;
