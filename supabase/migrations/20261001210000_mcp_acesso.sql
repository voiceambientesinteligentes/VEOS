-- MCP do VEOS: a criacao de acesso do Claude Code fica na trilha de acessos do membro.
alter table public.membros_historico drop constraint if exists membros_historico_acao_check;
alter table public.membros_historico add constraint membros_historico_acao_check
  check (acao in ('convidado', 'papel', 'desativado', 'reativado', 'mfa_exigido', 'mfa_dispensado', 'mcp_acesso'));
