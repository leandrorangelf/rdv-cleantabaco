-- Permite que Renan e Leandro acessem os creditos do Financeiro.
-- Mantem os papeis financeiros/gestores ja existentes.

drop policy if exists "verbas_select" on verbas;
drop policy if exists "verbas_insert" on verbas;
drop policy if exists "verbas_update" on verbas;
drop policy if exists "verbas_delete" on verbas;

create policy "verbas_select" on verbas for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
    )
    or public.can_view_all_expenses_by_name()
  );

create policy "verbas_insert" on verbas for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
    )
    or public.can_view_all_expenses_by_name()
  );

create policy "verbas_update" on verbas for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
    )
    or public.can_view_all_expenses_by_name()
  );

create policy "verbas_delete" on verbas for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
    )
    or public.can_view_all_expenses_by_name()
  );
