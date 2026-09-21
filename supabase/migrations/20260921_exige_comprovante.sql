-- Marca categorias que exigem comprovante obrigatório e trava no banco
alter table categorias add column if not exists exige_comprovante boolean not null default false;

update categorias set exige_comprovante = true
where nome ilike '%refeição%'
   or nome ilike '%hospedagem%'
   or nome ilike '%hotel%'
   or nome ilike '%estacionamento%'
   or nome ilike '%pedágio%';

create or replace function fn_valida_comprovante_despesa()
returns trigger as $$
declare
  v_exige boolean;
begin
  select exige_comprovante into v_exige from categorias where id = new.categoria_id;
  if v_exige and new.comprovante_url is null then
    raise exception 'Esta categoria exige comprovante anexado.';
  end if;
  return new;
end;
$$ language plpgsql;

-- INSERT: sempre valida (toda despesa nova precisa nascer com o comprovante, se a categoria exigir)
drop trigger if exists trg_valida_comprovante_despesa_insert on despesas;
create trigger trg_valida_comprovante_despesa_insert
before insert on despesas
for each row
execute function fn_valida_comprovante_despesa();

-- UPDATE: só revalida quando categoria ou comprovante mudam, para não travar
-- aprovações/rejeições de despesas antigas que não tinham essa exigência.
drop trigger if exists trg_valida_comprovante_despesa_update on despesas;
create trigger trg_valida_comprovante_despesa_update
before update on despesas
for each row
when (
  new.categoria_id is distinct from old.categoria_id
  or new.comprovante_url is distinct from old.comprovante_url
)
execute function fn_valida_comprovante_despesa();
