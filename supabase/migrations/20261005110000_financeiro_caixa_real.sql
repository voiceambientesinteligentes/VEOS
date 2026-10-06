-- FINANCEIRO COMPLETO, parte 1: CAIXA REAL. Extrato bancario importado (OFX/CSV, gratis) e o fato
-- que liquida titulos (CFO: "so o extrato comprova pagamento ou recebimento"); plano de contas
-- gerencial (PL-049, proposta) para classificar e montar o DRE; conciliacao com parcelas e contas a
-- pagar; contas recorrentes (custos fixos, dividas, retirada) que viram contas a pagar todo mes.
-- Lancamentos do banco sao imutaveis (data, valor, descricao); classificacao e conciliacao ficam
-- na trilha financeiro_historico (append-only). Regras no banco; RLS sem policies (so a API le).

-- ---------------------------------------------------------------- plano de contas gerencial
create table public.plano_contas (
  codigo text primary key check (codigo ~ '^[1-9](\.[0-9]{1,2}){1,2}$'),
  nome text not null check (length(nome) between 2 and 80),
  grupo text not null check (grupo in ('receita', 'deducao', 'custo_variavel', 'despesa_fixa', 'retirada', 'financeiro', 'investimento', 'transferencia', 'nao_operacional')),
  natureza text not null check (natureza in ('entrada', 'saida', 'ambas')),
  ativo boolean not null default true,
  criado_por uuid,
  criado_em timestamptz not null default now()
);
alter table public.plano_contas enable row level security;
-- Sugestao inicial (PROPOSTA, PL-049): a direcao renomeia e acrescenta pela tela.
insert into public.plano_contas (codigo, nome, grupo, natureza) values
  ('1.1', 'Recebimentos de clientes (pedidos)', 'receita', 'entrada'),
  ('1.2', 'Venda de equipamentos (avulsa)', 'receita', 'entrada'),
  ('1.3', 'Serviços avulsos (instalação, visita técnica)', 'receita', 'entrada'),
  ('1.4', 'Contratos de suporte e manutenção', 'receita', 'entrada'),
  ('1.9', 'Outras receitas', 'receita', 'entrada'),
  ('2.1', 'Impostos sobre vendas (DAS/Simples)', 'deducao', 'saida'),
  ('2.2', 'Taxas de cartão e antecipação', 'deducao', 'saida'),
  ('2.3', 'Devoluções e estornos a clientes', 'deducao', 'saida'),
  ('3.1', 'Compra de equipamentos e materiais (projetos)', 'custo_variavel', 'saida'),
  ('3.2', 'Frete, importação e taxas de compra', 'custo_variavel', 'saida'),
  ('3.3', 'Mão de obra terceirizada', 'custo_variavel', 'saida'),
  ('3.4', 'Comissão de vendedor', 'custo_variavel', 'saida'),
  ('3.5', 'RT / indicação de arquiteto', 'custo_variavel', 'saida'),
  ('3.6', 'Deslocamento e viagens de obra', 'custo_variavel', 'saida'),
  ('3.9', 'Outros custos de projeto', 'custo_variavel', 'saida'),
  ('4.1', 'Pessoal (salários, encargos, benefícios)', 'despesa_fixa', 'saida'),
  ('4.2', 'Aluguel, condomínio e energia', 'despesa_fixa', 'saida'),
  ('4.3', 'Contador', 'despesa_fixa', 'saida'),
  ('4.4', 'Sistemas e software', 'despesa_fixa', 'saida'),
  ('4.5', 'Telefone e internet', 'despesa_fixa', 'saida'),
  ('4.6', 'Veículo (combustível, manutenção, seguro)', 'despesa_fixa', 'saida'),
  ('4.7', 'Marketing e publicidade', 'despesa_fixa', 'saida'),
  ('4.8', 'Administrativo e escritório', 'despesa_fixa', 'saida'),
  ('4.9', 'Outras despesas fixas', 'despesa_fixa', 'saida'),
  ('5.1', 'Retirada / pró-labore do sócio', 'retirada', 'saida'),
  ('6.1', 'Juros, multas e tarifas bancárias', 'financeiro', 'saida'),
  ('6.2', 'Parcelas de empréstimos e financiamentos', 'financeiro', 'saida'),
  ('6.3', 'Parcelamento de impostos', 'financeiro', 'saida'),
  ('6.4', 'Rendimentos de aplicação', 'financeiro', 'entrada'),
  ('6.5', 'Empréstimo recebido', 'financeiro', 'entrada'),
  ('7.1', 'Ferramentas e equipamentos próprios', 'investimento', 'saida'),
  ('7.2', 'Veículo (compra ou entrada)', 'investimento', 'saida'),
  ('7.3', 'Estoque estratégico', 'investimento', 'saida'),
  ('8.1', 'Transferência entre contas da empresa', 'transferencia', 'ambas'),
  ('8.2', 'Aporte do sócio', 'transferencia', 'entrada'),
  ('9.1', 'Despesa pessoal paga pela empresa (separar)', 'nao_operacional', 'saida');

-- ---------------------------------------------------------------- contas bancarias e extrato
create table public.contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 2 and 80),
  banco text,
  final_conta text check (final_conta is null or final_conta ~ '^[0-9Xx-]{1,8}$'),   -- so os ultimos digitos
  tipo text not null default 'corrente' check (tipo in ('corrente', 'poupanca', 'aplicacao', 'caixa', 'cartao')),
  ativa boolean not null default true,
  saldo_inicial numeric(14, 2),             -- saldo informado numa data (ancora quando o extrato nao traz saldo)
  saldo_inicial_em date,
  criado_por uuid not null,
  criado_em timestamptz not null default now()
);
alter table public.contas_bancarias enable row level security;

create table public.extrato_importacoes (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas_bancarias (id),
  arquivo text not null,
  formato text not null check (formato in ('ofx', 'csv', 'manual')),
  periodo_de date,
  periodo_ate date,
  linhas integer not null,                  -- novas/repetidas: financeiro_historico e contagem por importacao_id
  saldo_final numeric(14, 2),               -- saldo do banco no fim do extrato (OFX LEDGERBAL), quando houver
  saldo_final_em date,
  usuario uuid not null,
  em timestamptz not null default now()
);
create trigger extrato_importacoes_imutavel before update or delete on public.extrato_importacoes for each row execute function public.recusar_alteracao();
alter table public.extrato_importacoes enable row level security;

create table public.movimentos_bancarios (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas_bancarias (id),
  importacao_id uuid references public.extrato_importacoes (id),
  data date not null,
  valor numeric(14, 2) not null check (valor <> 0),          -- + entrada, - saida
  descricao text not null check (length(descricao) between 1 and 300),
  documento text,
  id_externo text,                                            -- FITID do OFX
  hash text not null,
  categoria text references public.plano_contas (codigo),
  parcela_id uuid references public.parcelas (id),
  conta_pagar_id uuid references public.contas_pagar (id),
  transferencia_de uuid references public.movimentos_bancarios (id),
  observacao text,
  classificado_por text,                                      -- 'regra', 'conciliacao', 'manual'
  classificado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (conta_id, hash)
);
create index movimentos_bancarios_data on public.movimentos_bancarios (conta_id, data);
create index movimentos_bancarios_pendentes on public.movimentos_bancarios (categoria) where categoria is null;
create unique index movimentos_bancarios_parcela on public.movimentos_bancarios (parcela_id) where parcela_id is not null;
create unique index movimentos_bancarios_conta on public.movimentos_bancarios (conta_pagar_id) where conta_pagar_id is not null;
alter table public.movimentos_bancarios enable row level security;

-- o que veio do banco nao muda: so classificacao, conciliacao e observacao
create function public.movimento_fato_imutavel() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'lancamento do extrato nao pode ser apagado'; end if;
  if new.conta_id <> old.conta_id or new.data <> old.data or new.valor <> old.valor or new.descricao <> old.descricao
     or new.hash <> old.hash or coalesce(new.documento, '') <> coalesce(old.documento, '') or coalesce(new.id_externo, '') <> coalesce(old.id_externo, '') then
    raise exception 'data, valor e descricao do extrato nao mudam (sao fato do banco)';
  end if;
  return new;
end $$;
create trigger movimentos_bancarios_fato before update or delete on public.movimentos_bancarios for each row execute function public.movimento_fato_imutavel();

-- regras aprendidas: "descricao contem X" -> categoria (aplicadas na importacao)
create table public.regras_categoria (
  id bigint generated always as identity primary key,
  padrao text not null check (length(padrao) between 3 and 80),
  sinal text not null default 'qualquer' check (sinal in ('entrada', 'saida', 'qualquer')),
  categoria text not null references public.plano_contas (codigo),
  ativa boolean not null default true,
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  unique (padrao, sinal)
);
alter table public.regras_categoria enable row level security;

create table public.financeiro_historico (
  id bigint generated always as identity primary key,
  alvo text not null,                 -- movimento:<id>, conta:<id>, recorrente:<id>, plano:<codigo>
  acao text not null,
  detalhe jsonb not null default '{}'::jsonb,
  usuario uuid,
  em timestamptz not null default now()
);
create trigger financeiro_historico_imutavel before update or delete on public.financeiro_historico for each row execute function public.recusar_alteracao();
alter table public.financeiro_historico enable row level security;

-- ---------------------------------------------------------------- contas recorrentes
create table public.contas_recorrentes (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (length(descricao) between 2 and 200),
  fornecedor text not null check (length(fornecedor) between 1 and 200),
  plano_conta text not null references public.plano_contas (codigo),
  valor numeric(14, 2) not null check (valor > 0),
  dia_vencimento integer not null check (dia_vencimento between 1 and 28),
  inicio date not null,                                  -- primeiro mes (dia 1)
  parcelas integer check (parcelas is null or parcelas between 1 and 360),   -- divida: quantas faltam a partir do inicio
  ativa boolean not null default true,
  origem text not null default 'manual',                 -- 'manual', 'formulario:fixos', 'formulario:dividas', 'formulario:retirada'
  criado_por uuid not null,
  criado_em timestamptz not null default now()
);
alter table public.contas_recorrentes enable row level security;

alter table public.contas_pagar
  add column plano_conta text references public.plano_contas (codigo),
  add column recorrente_id uuid references public.contas_recorrentes (id),
  add column competencia text check (competencia is null or competencia ~ '^\d{4}-\d{2}$');

-- categoria antiga (contas_pagar.categoria) -> plano de contas
create function public.plano_da_categoria(p_categoria text) returns text language sql immutable set search_path = '' as $$
  select case p_categoria when 'compra' then '3.1' when 'frete' then '3.2' when 'servico_terceiro' then '3.3' when 'imposto' then '2.1' when 'despesa_fixa' then '4.9' else null end
$$;
create function public.categoria_do_plano(p_plano text) returns text language sql immutable set search_path = '' as $$
  select case when p_plano in ('2.1', '6.3') then 'imposto' when p_plano like '4.%' then 'despesa_fixa' when p_plano = '3.3' then 'servico_terceiro' when p_plano = '3.2' then 'frete' else 'outro' end
$$;

/** Gera as contas a pagar das recorrentes ate o mes de p_ate (idempotente: chave rec:<id>:<AAAA-MM>). */
create function public.recorrentes_gerar(p_ate date) returns jsonb language plpgsql set search_path = '' as $$
declare r public.contas_recorrentes; m date; v_fim date; n integer := 0; v_ja integer; k text; v_id uuid;
begin
  for r in select * from public.contas_recorrentes where ativa loop
    m := greatest(date_trunc('month', r.inicio)::date, date_trunc('month', current_date)::date);
    v_fim := date_trunc('month', p_ate)::date;
    if r.parcelas is not null then v_fim := least(v_fim, (date_trunc('month', r.inicio) + make_interval(months => r.parcelas - 1))::date); end if;
    while m <= v_fim loop
      k := 'rec:' || r.id || ':' || to_char(m, 'YYYY-MM');
      select count(*) into v_ja from public.contas_pagar where chave = k;
      if v_ja = 0 then
        insert into public.contas_pagar (chave, descricao, fornecedor, categoria, vencimento, valor, criado_por, plano_conta, recorrente_id, competencia)
        values (k, r.descricao, r.fornecedor, public.categoria_do_plano(r.plano_conta), (m + make_interval(days => r.dia_vencimento - 1))::date, r.valor, r.criado_por, r.plano_conta, r.id, to_char(m, 'YYYY-MM'))
        returning id into v_id;
        insert into public.compras_historico (conta_id, acao, detalhe, usuario) values (v_id, 'conta_criada', jsonb_build_object('recorrente', r.id, 'competencia', to_char(m, 'YYYY-MM')), r.criado_por);
        n := n + 1;
      end if;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;
  return jsonb_build_object('geradas', n);
end $$;

/** Salva (cria ou altera) uma recorrente. Alterar valor/dia vale para os meses ainda nao gerados. */
create function public.recorrente_salvar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid; antes public.contas_recorrentes;
begin
  if v_id is null then
    insert into public.contas_recorrentes (descricao, fornecedor, plano_conta, valor, dia_vencimento, inicio, parcelas, origem, criado_por)
    values (trim(p ->> 'descricao'), coalesce(nullif(trim(p ->> 'fornecedor'), ''), trim(p ->> 'descricao')), p ->> 'plano_conta', (p ->> 'valor')::numeric, (p ->> 'dia_vencimento')::int,
            date_trunc('month', coalesce((p ->> 'inicio')::date, current_date))::date, nullif(p ->> 'parcelas', '')::int, coalesce(p ->> 'origem', 'manual'), (p ->> 'usuario')::uuid)
    returning id into v_id;
    insert into public.financeiro_historico (alvo, acao, detalhe, usuario) values ('recorrente:' || v_id, 'criada', p - 'usuario', (p ->> 'usuario')::uuid);
  else
    select * into antes from public.contas_recorrentes where id = v_id for update;
    if antes.id is null then raise exception 'recorrente inexistente'; end if;
    update public.contas_recorrentes set
      descricao = coalesce(nullif(trim(p ->> 'descricao'), ''), descricao), fornecedor = coalesce(nullif(trim(p ->> 'fornecedor'), ''), fornecedor),
      plano_conta = coalesce(p ->> 'plano_conta', plano_conta), valor = coalesce((p ->> 'valor')::numeric, valor),
      dia_vencimento = coalesce((p ->> 'dia_vencimento')::int, dia_vencimento), ativa = coalesce((p ->> 'ativa')::boolean, ativa),
      parcelas = case when p ? 'parcelas' then nullif(p ->> 'parcelas', '')::int else parcelas end
    where id = v_id;
    insert into public.financeiro_historico (alvo, acao, detalhe, usuario) values ('recorrente:' || v_id, 'alterada', jsonb_build_object('antes', to_jsonb(antes), 'mudanca', p - 'usuario'), (p ->> 'usuario')::uuid);
    -- contas futuras ainda abertas acompanham a alteracao (as passadas e pagas ficam como estao)
    update public.contas_pagar c set valor = r.valor, descricao = r.descricao, fornecedor = r.fornecedor, plano_conta = r.plano_conta,
      vencimento = (date_trunc('month', c.vencimento) + make_interval(days => r.dia_vencimento - 1))::date
    from public.contas_recorrentes r
    where c.recorrente_id = r.id and r.id = v_id and c.estado = 'aberta' and c.vencimento > current_date;
    if (p ->> 'ativa') = 'false' then
      update public.contas_pagar set estado = 'cancelada', motivo_cancelamento = 'recorrente desativada'
      where recorrente_id = v_id and estado = 'aberta' and vencimento > current_date;
    end if;
  end if;
  perform public.recorrentes_gerar((current_date + interval '100 days')::date);
  return jsonb_build_object('id', v_id);
end $$;

-- ---------------------------------------------------------------- importacao do extrato
/**
 * p = {usuario, conta_id, arquivo, formato, saldo_final?, saldo_final_em?, linhas: [{data, valor, descricao, documento?, id_externo?, seq?}]}
 * Deduplica por conta + hash (FITID quando houver; senao data+valor+descricao+documento+ordem no dia) e
 * aplica as regras de categoria nas novas.
 */
create function public.extrato_importar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare v_conta uuid := (p ->> 'conta_id')::uuid; v_imp uuid; l jsonb; v_hash text; n_novas integer := 0; n_rep integer := 0; v_de date; v_ate date; v_id uuid;
begin
  if not exists (select 1 from public.contas_bancarias where id = v_conta and ativa) then raise exception 'conta bancaria inexistente ou inativa'; end if;
  if jsonb_typeof(p -> 'linhas') <> 'array' or jsonb_array_length(p -> 'linhas') = 0 then raise exception 'extrato sem lancamentos'; end if;
  if jsonb_array_length(p -> 'linhas') > 1000 then raise exception 'no maximo 1000 lancamentos por envio'; end if;
  select min((x ->> 'data')::date), max((x ->> 'data')::date) into v_de, v_ate from jsonb_array_elements(p -> 'linhas') x;
  if v_ate > current_date + 1 then raise exception 'extrato com data no futuro'; end if;
  insert into public.extrato_importacoes (conta_id, arquivo, formato, periodo_de, periodo_ate, linhas, saldo_final, saldo_final_em, usuario)
  values (v_conta, left(coalesce(p ->> 'arquivo', 'extrato'), 200), p ->> 'formato', v_de, v_ate, jsonb_array_length(p -> 'linhas'), nullif(p ->> 'saldo_final', '')::numeric, nullif(p ->> 'saldo_final_em', '')::date, (p ->> 'usuario')::uuid)
  returning id into v_imp;
  for l in select * from jsonb_array_elements(p -> 'linhas') loop
    if (l ->> 'valor')::numeric = 0 then continue; end if;
    v_hash := md5(case when coalesce(l ->> 'id_externo', '') <> '' then 'fitid:' || (l ->> 'id_externo') || ':' || (l ->> 'valor')::numeric
                      else (l ->> 'data') || '|' || (l ->> 'valor')::numeric || '|' || lower(trim(l ->> 'descricao')) || '|' || coalesce(l ->> 'documento', '') || '|' || coalesce(l ->> 'seq', '1') end);
    insert into public.movimentos_bancarios (conta_id, importacao_id, data, valor, descricao, documento, id_externo, hash)
    values (v_conta, v_imp, (l ->> 'data')::date, (l ->> 'valor')::numeric, left(trim(l ->> 'descricao'), 300), nullif(left(l ->> 'documento', 60), ''), nullif(left(l ->> 'id_externo', 120), ''), v_hash)
    on conflict (conta_id, hash) do nothing
    returning id into v_id;
    if v_id is null then n_rep := n_rep + 1; else n_novas := n_novas + 1; end if;
    v_id := null;
  end loop;
  -- regras aprendidas (a mais longa que casar vence)
  update public.movimentos_bancarios m set categoria = (
      select g.categoria from public.regras_categoria g
      where g.ativa and lower(m.descricao) like '%' || lower(g.padrao) || '%'
        and (g.sinal = 'qualquer' or (g.sinal = 'entrada' and m.valor > 0) or (g.sinal = 'saida' and m.valor < 0))
      order by length(g.padrao) desc limit 1),
    classificado_por = 'regra', classificado_em = now()
  where m.importacao_id = v_imp and m.categoria is null
    and exists (select 1 from public.regras_categoria g where g.ativa and lower(m.descricao) like '%' || lower(g.padrao) || '%'
      and (g.sinal = 'qualquer' or (g.sinal = 'entrada' and m.valor > 0) or (g.sinal = 'saida' and m.valor < 0)));
  -- a tabela de importacoes e append-only: os totais vao no historico e na resposta
  insert into public.financeiro_historico (alvo, acao, detalhe, usuario)
  values ('importacao:' || v_imp, 'extrato_importado', jsonb_build_object('conta', v_conta, 'novas', n_novas, 'repetidas', n_rep, 'de', v_de, 'ate', v_ate), (p ->> 'usuario')::uuid);
  return jsonb_build_object('importacao_id', v_imp, 'novas', n_novas, 'repetidas', n_rep, 'de', v_de, 'ate', v_ate);
end $$;

/** Saldo de cada conta numa data: ancora = ultimo saldo informado (extrato ou manual) e soma/subtrai os lancamentos. */
create function public.saldo_contas(p_data date) returns table (conta_id uuid, nome text, saldo numeric, ancora_em date, origem text) language sql stable set search_path = '' as $$
  select c.id, c.nome,
    case when a.em is null then null
         when a.em <= p_data then a.valor + coalesce((select sum(m.valor) from public.movimentos_bancarios m where m.conta_id = c.id and m.data > a.em and m.data <= p_data), 0)
         else a.valor - coalesce((select sum(m.valor) from public.movimentos_bancarios m where m.conta_id = c.id and m.data > p_data and m.data <= a.em), 0) end,
    a.em, a.origem
  from public.contas_bancarias c
  left join lateral (
    select z.valor, z.em, z.origem from (
      select i.saldo_final as valor, i.saldo_final_em as em, 'extrato'::text as origem, i.em as registrado from public.extrato_importacoes i
       where i.conta_id = c.id and i.saldo_final is not null and i.saldo_final_em is not null
      union all
      select c.saldo_inicial, c.saldo_inicial_em, 'informado'::text, c.criado_em where c.saldo_inicial is not null and c.saldo_inicial_em is not null
    ) z order by (z.em <= p_data) desc, abs(z.em - p_data) asc, z.registrado desc limit 1
  ) a on true
  where c.ativa
$$;

/** Classifica um lancamento (e, se pedido, aprende a regra para descricoes parecidas). */
create function public.movimento_classificar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare m public.movimentos_bancarios; v_pad text := nullif(trim(p ->> 'padrao'), ''); n integer := 0;
begin
  select * into m from public.movimentos_bancarios where id = (p ->> 'movimento_id')::uuid for update;
  if m.id is null then raise exception 'lancamento inexistente'; end if;
  if nullif(p ->> 'categoria', '') is not null and not exists (select 1 from public.plano_contas where codigo = p ->> 'categoria' and ativo) then raise exception 'categoria inexistente no plano de contas'; end if;
  update public.movimentos_bancarios set categoria = nullif(p ->> 'categoria', ''), observacao = coalesce(nullif(p ->> 'observacao', ''), observacao), classificado_por = 'manual', classificado_em = now() where id = m.id;
  insert into public.financeiro_historico (alvo, acao, detalhe, usuario) values ('movimento:' || m.id, 'classificado', jsonb_build_object('de', m.categoria, 'para', p ->> 'categoria'), (p ->> 'usuario')::uuid);
  if v_pad is not null and nullif(p ->> 'categoria', '') is not null then
    if position(lower(v_pad) in lower(m.descricao)) = 0 then raise exception 'o padrao precisa aparecer na descricao do lancamento'; end if;
    insert into public.regras_categoria (padrao, sinal, categoria, criado_por) values (v_pad, case when m.valor > 0 then 'entrada' else 'saida' end, p ->> 'categoria', (p ->> 'usuario')::uuid)
    on conflict (padrao, sinal) do update set categoria = excluded.categoria, ativa = true;
    update public.movimentos_bancarios set categoria = p ->> 'categoria', classificado_por = 'regra', classificado_em = now()
    where categoria is null and lower(descricao) like '%' || lower(v_pad) || '%' and sign(valor) = sign(m.valor);
    get diagnostics n = row_count;
    insert into public.financeiro_historico (alvo, acao, detalhe, usuario) values ('regra:' || v_pad, 'regra_aprendida', jsonb_build_object('categoria', p ->> 'categoria', 'aplicada_em', n), (p ->> 'usuario')::uuid);
  end if;
  return jsonb_build_object('ok', true, 'outros_classificados', n);
end $$;

/**
 * Concilia um lancamento do extrato com o titulo que ele liquida:
 *   parcela (entrada) -> parcela recebida na data do extrato, pelo valor do extrato;
 *   conta_pagar (saida) -> conta paga na data do extrato;
 *   transferencia -> par de lancamentos (saida numa conta, entrada na outra);
 *   desfazer -> solta o vinculo (o titulo continua liquidado: estorno e feito no titulo).
 */
create function public.movimento_conciliar(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare m public.movimentos_bancarios; v_alvo uuid := nullif(p ->> 'alvo_id', '')::uuid; v_tipo text := p ->> 'tipo'; u uuid := (p ->> 'usuario')::uuid;
  x public.parcelas; k public.contas_pagar; o public.movimentos_bancarios;
begin
  select * into m from public.movimentos_bancarios where id = (p ->> 'movimento_id')::uuid for update;
  if m.id is null then raise exception 'lancamento inexistente'; end if;
  if v_tipo = 'parcela' then
    if m.valor <= 0 then raise exception 'so entrada liquida parcela de cliente'; end if;
    if m.parcela_id is not null then raise exception 'lancamento ja conciliado'; end if;
    select * into x from public.parcelas where id = v_alvo for update;
    if x.id is null then raise exception 'parcela inexistente'; end if;
    if x.estado = 'aberta' then perform public.parcela_receber(x.id, m.data, m.valor, u);
    elsif x.estado <> 'recebida' then raise exception 'parcela %', x.estado; end if;
    update public.movimentos_bancarios set parcela_id = x.id, categoria = coalesce(categoria, '1.1'), classificado_por = 'conciliacao', classificado_em = now() where id = m.id;
  elsif v_tipo = 'conta_pagar' then
    if m.valor >= 0 then raise exception 'so saida liquida conta a pagar'; end if;
    if m.conta_pagar_id is not null then raise exception 'lancamento ja conciliado'; end if;
    select * into k from public.contas_pagar where id = v_alvo for update;
    if k.id is null then raise exception 'conta inexistente'; end if;
    if k.estado = 'aberta' then perform public.conta_pagar_pagar(k.id, m.data, abs(m.valor), u);
    elsif k.estado <> 'paga' then raise exception 'conta %', k.estado; end if;
    update public.movimentos_bancarios set conta_pagar_id = k.id, categoria = coalesce(categoria, k.plano_conta, public.plano_da_categoria(k.categoria)), classificado_por = 'conciliacao', classificado_em = now() where id = m.id;
  elsif v_tipo = 'transferencia' then
    select * into o from public.movimentos_bancarios where id = v_alvo for update;
    if o.id is null or o.conta_id = m.conta_id or o.valor <> -m.valor then raise exception 'a transferencia precisa ser o valor oposto em outra conta'; end if;
    update public.movimentos_bancarios set categoria = '8.1', transferencia_de = case when id = m.id then o.id else m.id end, classificado_por = 'conciliacao', classificado_em = now() where id in (m.id, o.id);
  elsif v_tipo = 'desfazer' then
    update public.movimentos_bancarios set parcela_id = null, conta_pagar_id = null, transferencia_de = null where id = m.id;
  else
    raise exception 'tipo de conciliacao invalido';
  end if;
  insert into public.financeiro_historico (alvo, acao, detalhe, usuario) values ('movimento:' || m.id, 'conciliado', jsonb_build_object('tipo', v_tipo, 'alvo', v_alvo), u);
  return jsonb_build_object('ok', true);
end $$;

/** Sugestoes de conciliacao: mesmo valor (centavo) e ate 10 dias do vencimento; 'unica' quando so ha um par possivel. */
create function public.conciliacao_sugestoes() returns jsonb language sql stable set search_path = '' as $$
  with livres as (
    select m.* from public.movimentos_bancarios m
    where m.parcela_id is null and m.conta_pagar_id is null and m.transferencia_de is null and coalesce(m.categoria, '') <> '8.1'
  ),
  cand as (
    select m.id as movimento_id, 'parcela' as tipo, x.id as alvo_id, abs(m.data - x.vencimento) as dias,
      jsonb_build_object('pedido', p.numero, 'numero', x.numero, 'vencimento', x.vencimento, 'valor', x.valor) as alvo
    from livres m join public.parcelas x on x.estado = 'aberta' and m.valor > 0 and abs(x.valor - m.valor) < 0.01 and abs(m.data - x.vencimento) <= 10
    join public.pedidos p on p.id = x.pedido_id and p.estado <> 'cancelado'
    union all
    select m.id, 'conta_pagar', k.id, abs(m.data - k.vencimento),
      jsonb_build_object('descricao', k.descricao, 'fornecedor', k.fornecedor, 'vencimento', k.vencimento, 'valor', k.valor)
    from livres m join public.contas_pagar k on k.estado = 'aberta' and m.valor < 0 and abs(k.valor + m.valor) < 0.01 and abs(m.data - k.vencimento) <= 10
    union all
    select m.id, 'transferencia', o.id, abs(m.data - o.data),
      jsonb_build_object('conta', (select nome from public.contas_bancarias where id = o.conta_id), 'data', o.data, 'valor', o.valor)
    from livres m join livres o on o.conta_id <> m.conta_id and o.valor = -m.valor and abs(m.data - o.data) <= 3 and m.valor < 0
  )
  select coalesce(jsonb_agg(jsonb_build_object('movimento_id', c.movimento_id, 'tipo', c.tipo, 'alvo_id', c.alvo_id, 'dias', c.dias, 'alvo', c.alvo,
    'unica', (select count(*) from cand c2 where c2.movimento_id = c.movimento_id) = 1 and (select count(*) from cand c3 where c3.alvo_id = c.alvo_id) = 1) order by c.movimento_id, c.dias), '[]'::jsonb)
  from cand c
$$;

do $$
declare f text;
begin
  foreach f in array array['recorrentes_gerar(date)', 'recorrente_salvar(jsonb)', 'extrato_importar(jsonb)', 'saldo_contas(date)', 'movimento_classificar(jsonb)',
    'movimento_conciliar(jsonb)', 'conciliacao_sugestoes()', 'plano_da_categoria(text)', 'categoria_do_plano(text)', 'movimento_fato_imutavel()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- recorrentes: mantem 3 meses de contas futuras geradas (idempotente), todo dia as 06:10 UTC
select cron.schedule('veos-recorrentes', '10 6 * * *', $$select public.recorrentes_gerar((current_date + interval '100 days')::date)$$);
