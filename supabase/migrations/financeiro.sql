-- Verbas (adiantamentos entregues a coordenadores)
create table if not exists verbas (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  mes           char(7) not null,           -- formato YYYY-MM
  valor         numeric(10,2) not null default 0,
  atualizado_por uuid references auth.users(id),
  atualizado_em  timestamptz default now(),
  unique (usuario_id, mes)
);

alter table verbas enable row level security;

-- Só gestor e financeiro podem ler/escrever verbas
create policy "verbas_select" on verbas for select
  using (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','financeiro')
  ));

create policy "verbas_insert" on verbas for insert
  with check (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','financeiro')
  ));

create policy "verbas_update" on verbas for update
  using (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','financeiro')
  ));

-- Pagamentos mensais registrados pela Manu
create table if not exists pagamentos_rdv (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  mes           char(7) not null,
  valor_pago    numeric(10,2) not null default 0,
  pago_em       timestamptz default now(),
  pago_por      uuid references auth.users(id),
  unique (usuario_id, mes)
);

alter table pagamentos_rdv enable row level security;

create policy "pagamentos_select" on pagamentos_rdv for select
  using (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','financeiro')
  ));

create policy "pagamentos_insert" on pagamentos_rdv for insert
  with check (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','financeiro')
  ));

create policy "pagamentos_update" on pagamentos_rdv for update
  using (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','financeiro')
  ));

create policy "pagamentos_delete" on pagamentos_rdv for delete
  using (exists (
    select 1 from profiles where id = auth.uid() and papel in ('aprovador','financeiro')
  ));
