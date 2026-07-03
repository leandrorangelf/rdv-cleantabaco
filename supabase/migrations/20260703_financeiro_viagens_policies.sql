-- Permite que o papel combinado da Manu (financeiro_viagens)
-- gerencie creditos e pagamentos do financeiro.

drop policy if exists "verbas_select" on verbas;
drop policy if exists "verbas_insert" on verbas;
drop policy if exists "verbas_update" on verbas;
drop policy if exists "verbas_delete" on verbas;

create policy "verbas_select" on verbas for select
  using (exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
  ));

create policy "verbas_insert" on verbas for insert
  with check (exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
  ));

create policy "verbas_update" on verbas for update
  using (exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
  ));

create policy "verbas_delete" on verbas for delete
  using (exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
  ));

drop policy if exists "pagamentos_select" on pagamentos_rdv;
drop policy if exists "pagamentos_insert" on pagamentos_rdv;
drop policy if exists "pagamentos_update" on pagamentos_rdv;
drop policy if exists "pagamentos_delete" on pagamentos_rdv;

create policy "pagamentos_select" on pagamentos_rdv for select
  using (exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','financeiro','financeiro_viagens')
  ));

create policy "pagamentos_insert" on pagamentos_rdv for insert
  with check (exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','financeiro','financeiro_viagens')
  ));

create policy "pagamentos_update" on pagamentos_rdv for update
  using (exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','financeiro','financeiro_viagens')
  ));

create policy "pagamentos_delete" on pagamentos_rdv for delete
  using (exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','financeiro','financeiro_viagens')
  ));
