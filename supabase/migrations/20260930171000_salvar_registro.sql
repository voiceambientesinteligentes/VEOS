-- Grava criacao/alteracao de registro de setor + historico + evento numa transacao.
-- Idempotente pela chave. A validacao de campos contra o catalogo e feita antes, na API.
create function public.salvar_registro(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_id uuid := coalesce(nullif(p ->> 'registro_id', '')::uuid, gen_random_uuid());
  v_evento bigint;
  v_existente uuid;
  c jsonb := p -> 'campos';
  v_antes public.registros;
  v_modo text := p ->> 'modo';
begin
  if v_modo not in ('criar', 'alterar') then raise exception 'modo invalido: %', v_modo; end if;

  insert into public.eventos (tipo, chave_idempotencia, ambiente, referencia, resumo)
  values ('registro.' || v_modo, p ->> 'chave', 'TESTE', v_id,
          jsonb_build_object('setor', p ->> 'setor', 'tipo', p ->> 'tipo', 'usuario', p ->> 'usuario_id', 'campos', c))
  on conflict (chave_idempotencia) do nothing
  returning id into v_evento;
  if v_evento is null then
    select referencia into v_existente from public.eventos where chave_idempotencia = p ->> 'chave';
    return jsonb_build_object('id', v_existente, 'repetido', true);
  end if;

  if v_modo = 'criar' then
    insert into public.registros (id, setor_id, tipo, titulo, estado, responsavel, prazo, valor, dados, criado_por)
    values (v_id, p ->> 'setor', p ->> 'tipo', c ->> 'titulo', c ->> 'estado', c ->> 'responsavel',
            (c ->> 'prazo')::date, (c ->> 'valor')::numeric, coalesce(c -> 'dados', '{}'::jsonb), (p ->> 'usuario_id')::uuid);
    insert into public.registros_historico (registro_id, acao, para_estado, mudancas, usuario)
    values (v_id, 'criado', c ->> 'estado', c, (p ->> 'usuario_id')::uuid);
  else
    select * into v_antes from public.registros where id = v_id and setor_id = p ->> 'setor' for update;
    if not found then raise exception 'registro inexistente no setor'; end if;
    update public.registros set
      titulo = case when c ? 'titulo' then c ->> 'titulo' else titulo end,
      estado = case when c ? 'estado' then c ->> 'estado' else estado end,
      responsavel = case when c ? 'responsavel' then c ->> 'responsavel' else responsavel end,
      prazo = case when c ? 'prazo' then (c ->> 'prazo')::date else prazo end,
      valor = case when c ? 'valor' then (c ->> 'valor')::numeric else valor end,
      dados = case when c ? 'dados' then c -> 'dados' else dados end,
      atualizado_em = now()
    where id = v_id;
    insert into public.registros_historico (registro_id, acao, de_estado, para_estado, mudancas, usuario)
    values (v_id, 'alterado', v_antes.estado, coalesce(c ->> 'estado', v_antes.estado), c, (p ->> 'usuario_id')::uuid);
  end if;
  return jsonb_build_object('id', v_id, 'repetido', false);
end;
$$;

revoke all on function public.salvar_registro(jsonb) from public, anon, authenticated;
grant execute on function public.salvar_registro(jsonb) to service_role;
