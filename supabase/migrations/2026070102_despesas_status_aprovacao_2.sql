-- Permite a etapa intermediaria de aprovacao usada pelo gestor 1.
alter table despesas drop constraint if exists despesas_status_check;

alter table despesas add constraint despesas_status_check
  check (status in ('pendente', 'aguardando_aprovacao_2', 'aprovado', 'rejeitado'));
