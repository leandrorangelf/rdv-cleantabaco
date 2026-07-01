-- Permite que o gestor de aprovacao 1 tambem gerencie creditos/adiantamentos.
drop policy if exists "verbas_select" on verbas;
drop policy if exists "verbas_insert" on verbas;
drop policy if exists "verbas_update" on verbas;

create policy "verbas_select" on verbas for select
  using (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','gestor','financeiro')
  ));

create policy "verbas_insert" on verbas for insert
  with check (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','gestor','financeiro')
  ));

create policy "verbas_update" on verbas for update
  using (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','gestor','financeiro')
  ));
