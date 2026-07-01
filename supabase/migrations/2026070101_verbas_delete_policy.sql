-- Permite remover credito/adiantamento mensal quando lancado por engano.
drop policy if exists "verbas_delete" on verbas;

create policy "verbas_delete" on verbas for delete
  using (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','gestor','financeiro')
  ));
