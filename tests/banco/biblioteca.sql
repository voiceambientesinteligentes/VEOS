-- Testes de aceite da BIBLIOTECA / governanca (dados de teste isolados; tudo desfeito no fim).
-- Uso: npx supabase db query --linked -f tests/banco/biblioteca.sql
begin;
create temp table resultado (n serial, passo text, ok boolean, detalhe text) on commit drop;

do $$
declare
  fund uuid := '00000000-0000-0000-0000-0000000f0001';   -- fundador TESTE
  vend uuid := '00000000-0000-0000-0000-0000000f0002';   -- comercial TESTE
  oper uuid := '00000000-0000-0000-0000-0000000f0003';   -- operacoes TESTE
  secr uuid := '00000000-0000-0000-0000-0000000f0004';   -- secretaria TESTE
  r jsonb; dec uuid; dec2 uuid; esc uuid; prop uuid; ideia uuid; par uuid; enc uuid; inc uuid; apr uuid; restr uuid; div jsonb; erro text; c jsonb; x record;
begin
  insert into auth.users (id, email, aud, role) values (fund, 'fund@veos-teste.invalid', 'authenticated', 'authenticated'), (vend, 'vend@veos-teste.invalid', 'authenticated', 'authenticated'),
    (oper, 'oper@veos-teste.invalid', 'authenticated', 'authenticated'), (secr, 'secr@veos-teste.invalid', 'authenticated', 'authenticated');
  insert into public.membros (user_id, nome, papel) values (fund, 'Fundador TESTE', 'direcao'), (vend, 'Comercial TESTE', 'vendas'), (oper, 'Operações TESTE', 'operacoes'), (secr, 'Secretaria TESTE', 'secretaria');
  insert into public.governanca_autoridades (user_id, autoridade) values (fund, 'fundador');

  -- 1. decisao do fundador: registro e recuperacao
  r := public.bib_criar(jsonb_build_object('usuario', fund, 'tipo', 'decisao', 'titulo', 'TESTE desconto máximo em kits de automação', 'conteudo', 'TESTE: desconto em kits de automação limitado a 3% para clientes recorrentes',
    'assuntos', jsonb_build_array('desconto', 'kits'), 'setores', jsonb_build_array('vendas'), 'autoridade', 'fundador', 'justificativa', 'TESTE proteger margem', 'confirmo_aprovacao', true));
  dec := (r ->> 'id')::uuid;
  c := public.bib_consultar(jsonb_build_object('usuario', vend, 'termos', 'desconto kits', 'setor', 'vendas', 'contexto', 'teste'));
  insert into resultado (passo, ok, detalhe) values ('1. decisão do fundador registrada e recuperada como aplicável', exists (select 1 from jsonb_array_elements(c -> 'considerados') e where (e ->> 'id')::uuid = dec and (e ->> 'aplicavel')::boolean), c::text);

  -- 2. ideia nao e decisao; frase sem confirmacao nao vira decisao (nem para o fundador)
  r := public.bib_criar(jsonb_build_object('usuario', vend, 'tipo', 'ideia', 'titulo', 'TESTE dar brinde em kits', 'conteudo', 'TESTE quem sabe dar brinde nos kits de automação'));
  ideia := (r ->> 'id')::uuid;
  begin perform public.bib_criar(jsonb_build_object('usuario', fund, 'tipo', 'decisao', 'titulo', 'TESTE frase solta', 'conteudo', 'TESTE acho que devemos...', 'autoridade', 'fundador', 'justificativa', 'x')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('2. ideia fica como ideia; decisão sem confirmação explícita é recusada (inclusive ao fundador)', (select estado = 'aberta' from public.biblioteca_registros where id = ideia) and erro like '%confirme explicitamente%', erro);
  begin perform public.bib_criar(jsonb_build_object('usuario', vend, 'tipo', 'decisao', 'titulo', 'TESTE decisão sem alçada', 'conteudo', 'TESTE x', 'autoridade', 'fundador', 'justificativa', 'x', 'confirmo_aprovacao', true)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('2b. quem não tem a autoridade não cria decisão', erro like '%sem autoridade%', erro);

  -- 3/4. precedente fora do escopo e substituido sao desconsiderados
  r := public.bib_criar(jsonb_build_object('usuario', fund, 'tipo', 'decisao', 'titulo', 'TESTE desconto de instalação em obras', 'conteudo', 'TESTE desconto na mão de obra de instalação só com aprovação do COO',
    'assuntos', jsonb_build_array('desconto'), 'setores', jsonb_build_array('operacoes'), 'autoridade', 'direcao', 'justificativa', 'TESTE capacidade', 'confirmo_aprovacao', true));
  esc := (r ->> 'id')::uuid;
  c := public.bib_consultar(jsonb_build_object('usuario', vend, 'termos', 'desconto', 'setor', 'vendas'));
  insert into resultado (passo, ok, detalhe) values ('3. precedente aplicável encontrado; 4a. fora do escopo marcado como não aplicável',
    exists (select 1 from jsonb_array_elements(c -> 'considerados') e where (e ->> 'id')::uuid = dec and (e ->> 'aplicavel')::boolean)
    and exists (select 1 from jsonb_array_elements(c -> 'considerados') e where (e ->> 'id')::uuid = esc and not (e ->> 'aplicavel')::boolean and e ->> 'motivo' like 'fora do escopo%'), c::text);

  -- 6. divergencia fundamentada nao altera a decisao
  div := public.bib_divergir(jsonb_build_object('usuario', vend, 'registro_id', dec, 'divergencia', jsonb_build_object('problema', 'TESTE limite perde vendas', 'argumento', 'TESTE concorrentes dão 5%',
    'aplicacao', 'TESTE kits pequenos', 'beneficios', 'TESTE conversão', 'riscos', 'TESTE margem', 'alternativa', 'TESTE 5% com MC >= 32%', 'como_testar', 'TESTE comparar 3 meses'),
    'fontes', jsonb_build_array(jsonb_build_object('tipo', 'interna', 'natureza', 'fato_verificado', 'titulo', 'TESTE relatório de perdas', 'versao_periodo', 'Zoho CRM 2026-T3', 'acessada', true))));
  prop := (div ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('6. divergência vira proposta ligada; a decisão continua vigente e intacta',
    (select estado = 'vigente' and conteudo like 'TESTE: desconto em kits%' from public.biblioteca_registros where id = dec)
    and exists (select 1 from public.biblioteca_vinculos where de_id = prop and para_id = dec and relacao = 'questiona') and not (div ->> 'hipotese_a_validar')::boolean, div::text);
  begin update public.biblioteca_registros set conteudo = 'TESTE alterado em silêncio' where id = dec; erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('6b/16. ninguém (nem o banco direto) altera em silêncio uma decisão vigente', erro like '%fechado%', erro);

  -- 7. sugestao sem evidencia = hipotese a validar
  r := public.bib_divergir(jsonb_build_object('usuario', secr, 'registro_id', dec, 'divergencia', jsonb_build_object('problema', 'TESTE p', 'argumento', 'TESTE acho que clientes preferem', 'aplicacao', 'TESTE a',
    'beneficios', 'TESTE b', 'riscos', 'TESTE r', 'alternativa', 'TESTE alt', 'como_testar', 'TESTE pesquisa com 10 clientes'),
    'fontes', jsonb_build_array(jsonb_build_object('tipo', 'especialista', 'natureza', 'opiniao_fonte', 'titulo', 'TESTE livro citado sem leitura', 'acessada', false))));
  insert into resultado (passo, ok, detalhe) values ('7. sugestão sem evidência acessada fica como HIPÓTESE A VALIDAR', (r ->> 'hipotese_a_validar')::boolean, r::text);

  -- 10. parecer do setor afetado
  par := public.bib_pedir_parecer(jsonb_build_object('usuario', vend, 'registro_id', prop, 'setor_id', 'operacoes', 'participacao', 'consultado', 'motivo', 'TESTE impacto em capacidade', 'responsavel_conclusao', 'CSO'));
  begin perform public.bib_responder_parecer(jsonb_build_object('usuario', secr, 'parecer_id', par, 'posicao', 'concorda', 'argumento', 'TESTE')); erro := null; exception when others then erro := sqlerrm; end;
  perform public.bib_responder_parecer(jsonb_build_object('usuario', oper, 'parecer_id', par, 'posicao', 'concorda_com_ressalvas', 'argumento', 'TESTE só para kits sem obra'));
  insert into resultado (passo, ok, detalhe) values ('10. setor afetado consultado responde; outro setor não responde por ele',
    erro like '%so membros do setor%' and (select estado = 'respondido' and posicao = 'concorda_com_ressalvas' from public.biblioteca_pareceres where id = par), erro);
  begin perform public.bib_pedir_parecer(jsonb_build_object('usuario', vend, 'registro_id', prop, 'setor_id', 'operacoes', 'participacao', 'consultado', 'motivo', 'x'));
    perform public.bib_responder_parecer(jsonb_build_object('usuario', oper, 'parecer_id', (select id from public.biblioteca_pareceres where registro_id = prop and estado = 'pendente' limit 1), 'posicao', 'aprova', 'argumento', 'x')); erro := null;
  exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('10b. consultado opina, não aprova (sem veto/aprovação automática)', erro like '%consultado opina%', erro);

  -- 11. sem resposta nao e aprovacao
  par := public.bib_pedir_parecer(jsonb_build_object('usuario', vend, 'registro_id', prop, 'setor_id', 'financas', 'participacao', 'aprovador', 'motivo', 'TESTE impacto em caixa', 'prazo', (current_date - 1)::text));
  perform public.bib_expirar_pareceres();
  insert into resultado (passo, ok, detalhe) values ('11. prazo vencido vira "sem resposta" e a proposta NÃO é aprovada',
    (select estado = 'sem_resposta' from public.biblioteca_pareceres where id = par) and (select estado = 'em_consulta' from public.biblioteca_registros where id = prop), '');

  -- 12. conflito encaminhado a CEO; quem nao e da direcao nao conclui
  enc := public.bib_encaminhar(jsonb_build_object('usuario', vend, 'registro_id', prop, 'nivel', 'ceo', 'motivo', 'TESTE Comercial e Financeiro divergem'));
  begin perform public.bib_responder_parecer(jsonb_build_object('usuario', vend, 'parecer_id', enc, 'posicao', 'aprova', 'argumento', 'x')); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('12. conflito encaminhado à CEO (direção); o próprio interessado não conclui',
    (select encaminhamento = 'ceo' and participacao = 'aprovador' and setor_id = 'direcao' from public.biblioteca_pareceres where id = enc) and erro like '%so membros do setor direcao%', erro);

  -- 9. revisao sem autoridade bloqueada
  begin perform public.bib_revisar(jsonb_build_object('usuario', vend, 'registro_id', dec, 'conteudo', 'TESTE 5%', 'justificativa', 'x', 'confirmo_aprovacao', true)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('9. revisão por quem não tem autoridade é bloqueada', erro like '%sem autoridade%', erro);

  -- 8. revisao autorizada preserva o historico; 4b. substituido deixa de valer
  r := public.bib_revisar(jsonb_build_object('usuario', fund, 'registro_id', dec, 'conteudo', 'TESTE: desconto em kits de automação até 5% com MC >= 32%', 'justificativa', 'TESTE evidência de perdas (proposta)', 'motivada_por', prop, 'confirmo_aprovacao', true));
  dec2 := (r ->> 'id')::uuid;
  insert into resultado (passo, ok, detalhe) values ('8. revisão autorizada cria v2; v1 preservada como substituída; proposta que motivou fica aprovada',
    (select estado = 'substituida' and substituido_por = dec2 and conteudo like 'TESTE: desconto em kits de automação limitado%' from public.biblioteca_registros where id = dec)
    and (select versao = 2 and estado = 'vigente' from public.biblioteca_registros where id = dec2) and (select estado = 'aprovada' from public.biblioteca_registros where id = prop), r::text);
  c := public.bib_consultar(jsonb_build_object('usuario', vend, 'termos', 'desconto kits', 'setor', 'vendas'));
  insert into resultado (passo, ok, detalhe) values ('4b. decisão substituída não é apresentada como vigente',
    exists (select 1 from jsonb_array_elements(c -> 'considerados') e where (e ->> 'id')::uuid = dec and not (e ->> 'aplicavel')::boolean and e ->> 'motivo' like 'substituída por%')
    and exists (select 1 from jsonb_array_elements(c -> 'considerados') e where (e ->> 'id')::uuid = dec2 and (e ->> 'aplicavel')::boolean), c::text);

  -- 5. rejeicao preserva motivo e nao e proibicao permanente
  r := public.bib_criar(jsonb_build_object('usuario', vend, 'tipo', 'proposta', 'titulo', 'TESTE frete grátis em kits', 'conteudo', 'TESTE frete grátis em todos os kits', 'assuntos', jsonb_build_array('frete', 'kits'), 'autoridade', 'direcao'));
  begin perform public.bib_transicao(jsonb_build_object('usuario', fund, 'registro_id', r ->> 'id', 'para', 'rejeitada')); erro := null; exception when others then erro := sqlerrm; end;
  perform public.bib_transicao(jsonb_build_object('usuario', fund, 'registro_id', r ->> 'id', 'para', 'rejeitada', 'motivo', 'TESTE custo de frete alto em 2026'));
  c := public.bib_consultar(jsonb_build_object('usuario', vend, 'termos', 'frete kits', 'setor', 'vendas'));
  insert into resultado (passo, ok, detalhe) values ('5. rejeição exige e preserva o motivo; consulta diz que não é proibição permanente',
    erro like '%motivo%' and exists (select 1 from jsonb_array_elements(c -> 'considerados') e where e ->> 'id' = r ->> 'id' and e ->> 'motivo' like '%custo de frete alto%' and e ->> 'motivo' like '%não é proibição permanente%'), c::text);

  -- 13. erro, correcao e verificacao; 14. aprendizado recuperado em nova situacao
  r := public.bib_criar(jsonb_build_object('usuario', secr, 'tipo', 'incidente', 'titulo', 'TESTE regime tributário deduzido sem consulta', 'conteudo', 'TESTE alíquota errada usada na negociação',
    'assuntos', jsonb_build_array('imposto', 'regime'), 'dados', jsonb_build_object('impacto', 'TESTE margens erradas', 'causa', 'TESTE inferência sem fonte', 'causa_confirmada', true)));
  inc := (r ->> 'id')::uuid;
  begin perform public.bib_transicao(jsonb_build_object('usuario', secr, 'registro_id', inc, 'para', 'verificado')); erro := null; exception when others then erro := sqlerrm; end;
  perform public.bib_transicao(jsonb_build_object('usuario', secr, 'registro_id', inc, 'para', 'verificado', 'verificacao', 'TESTE regime conferido no CNPJ e telas recalculadas'));
  r := public.bib_criar(jsonb_build_object('usuario', secr, 'tipo', 'aprendizado', 'titulo', 'TESTE regime tributário só com fonte oficial', 'conteudo', 'TESTE nunca deduzir regime; consultar CNPJ na Receita', 'assuntos', jsonb_build_array('imposto', 'regime')));
  apr := (r ->> 'id')::uuid;
  insert into public.biblioteca_vinculos (de_id, para_id, relacao, criado_por) values (apr, inc, 'aprendizado_de', secr);
  begin perform public.bib_transicao(jsonb_build_object('usuario', secr, 'registro_id', apr, 'para', 'validado')); erro := coalesce(erro, '') || ' | ' || 'sem erro'; exception when others then erro := coalesce(erro, '') || ' | ' || sqlerrm; end;
  perform public.bib_transicao(jsonb_build_object('usuario', secr, 'registro_id', apr, 'para', 'validado', 'verificacao', 'TESTE 3 negociações seguintes usaram o regime correto'));
  insert into resultado (passo, ok, detalhe) values ('13. incidente só fica verificado com evidência; aprendizado só validado com verificação',
    erro like '%verificada%' and erro like '%verificacao de eficacia%' and (select estado = 'validado' from public.biblioteca_registros where id = apr), erro);
  c := public.bib_consultar(jsonb_build_object('usuario', vend, 'termos', 'regime imposto', 'setor', 'vendas', 'contexto', 'negociacao'));
  insert into resultado (passo, ok, detalhe) values ('14. aprendizado validado é recuperado em nova situação',
    exists (select 1 from jsonb_array_elements(c -> 'considerados') e where (e ->> 'id')::uuid = apr and (e ->> 'aplicavel')::boolean), c::text);

  -- 15. protecao de registro restrito
  r := public.bib_criar(jsonb_build_object('usuario', fund, 'tipo', 'decisao', 'titulo', 'TESTE reajuste salarial confidencial', 'conteudo', 'TESTE reajuste salarial da equipe técnica', 'assuntos', jsonb_build_array('salario'),
    'setores', jsonb_build_array('pessoas'), 'restrito', true, 'autoridade', 'fundador', 'justificativa', 'TESTE', 'confirmo_aprovacao', true));
  restr := (r ->> 'id')::uuid;
  c := public.bib_consultar(jsonb_build_object('usuario', vend, 'termos', 'reajuste salarial', 'setor', 'vendas'));
  insert into resultado (passo, ok, detalhe) values ('15. registro restrito invisível para quem não tem acesso (nem na busca de precedentes)',
    not public.bib_pode_ver(vend, restr) and public.bib_pode_ver(fund, restr) and jsonb_array_length(c -> 'considerados') = 0 and c ->> 'faltantes' like 'Nenhum precedente%', c::text);

  -- 16. mesmas regras para todos: fundador tambem precisa de justificativa e de revisao formal
  begin perform public.bib_criar(jsonb_build_object('usuario', fund, 'tipo', 'politica', 'titulo', 'TESTE política sem justificativa', 'conteudo', 'TESTE x', 'autoridade', 'fundador', 'confirmo_aprovacao', true)); erro := null; exception when others then erro := sqlerrm; end;
  insert into resultado (passo, ok, detalhe) values ('16. o fundador segue as mesmas regras (justificativa obrigatória, sem alteração silenciosa)', erro like '%justificativa%', erro);
  insert into resultado (passo, ok, detalhe) values ('trilha: histórico registra criação, questionamentos, pareceres, revisão e substituição',
    (select count(*) >= 4 from public.biblioteca_historico where registro_id = dec), (select string_agg(acao, ',' order by id) from public.biblioteca_historico where registro_id = dec));
end $$;

select n, passo, ok, left(detalhe, 220) as detalhe from resultado order by n;
rollback;
