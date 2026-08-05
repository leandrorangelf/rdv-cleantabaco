-- As funcoes de transferencia de saldo (20260718_protege_transferencia_credito)
-- gravavam o saldo transferido uma unica vez, na primeira vez que a tela do
-- mes seguinte era aberta. Se nem todas as despesas do mes anterior ja
-- estivessem aprovadas nesse momento, o saldo calculado ficava "congelado"
-- e nunca era corrigido depois, mesmo com mais despesas aprovadas depois.
-- Agora as funcoes recalculam (upsert) o lancamento a cada execucao. O
-- lancamento de saldo transferido e sempre gerado automaticamente pelo
-- sistema (nunca digitado por uma pessoa - lancamentos reais de PIX sao do
-- tipo 'pix' e nunca sao tocados aqui). A coluna valor tem CHECK (valor > 0),
-- entao quando o saldo recalculado e zero o lancamento de saldo_transferido
-- correspondente e removido (nao ha como zera-lo); lancamentos tipo 'pix'
-- jamais sao apagados por esta funcao.

create or replace function public.transferir_saldos_credito(p_mes char(7))
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes_anterior char(7) := to_char((p_mes || '-01')::date - interval '1 month', 'YYYY-MM');
  v_ini_anterior date := (v_mes_anterior || '-01')::date;
  v_fim_anterior date := (date_trunc('month', v_ini_anterior) + interval '1 month - 1 day')::date;
  r record;
  v_aprovado_anterior numeric;
  v_saldo numeric;
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid()
      and papel in ('aprovador','gestor','financeiro','financeiro_viagens')
  ) then
    raise exception 'sem permissao para transferir saldos de credito';
  end if;

  for r in
    select usuario_id, sum(valor) as verba_anterior
    from lancamentos_credito
    where mes = v_mes_anterior
    group by usuario_id
    having sum(valor) > 0
  loop
    select coalesce(sum(valor), 0) into v_aprovado_anterior
    from despesas
    where usuario_id = r.usuario_id
      and status = 'aprovado'
      and (ativo is null or ativo)
      and data_despesa >= v_ini_anterior
      and data_despesa <= v_fim_anterior;

    v_saldo := greatest(0, r.verba_anterior - v_aprovado_anterior);

    if v_saldo <= 0 then
      delete from lancamentos_credito
      where usuario_id = r.usuario_id and mes = p_mes and tipo = 'saldo_transferido';
      continue;
    end if;

    insert into lancamentos_credito (usuario_id, mes, data_pix, valor, tipo, observacao, criado_por)
    values (r.usuario_id, p_mes, (p_mes || '-01')::date, v_saldo, 'saldo_transferido', 'Saldo transferido de ' || v_mes_anterior, auth.uid())
    on conflict (usuario_id, mes) where tipo = 'saldo_transferido'
    do update set valor = excluded.valor, data_pix = excluded.data_pix, observacao = excluded.observacao, criado_por = excluded.criado_por;
  end loop;
end;
$$;

create or replace function public.transferir_saldo_credito_proprio(p_mes char(7))
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes_anterior char(7) := to_char((p_mes || '-01')::date - interval '1 month', 'YYYY-MM');
  v_ini_anterior date := (v_mes_anterior || '-01')::date;
  v_fim_anterior date := (date_trunc('month', v_ini_anterior) + interval '1 month - 1 day')::date;
  v_credito_anterior numeric;
  v_aprovado_anterior numeric;
  v_saldo numeric;
begin
  if auth.uid() is null then
    raise exception 'usuario nao autenticado';
  end if;

  select coalesce(sum(valor), 0) into v_credito_anterior
  from lancamentos_credito
  where usuario_id = auth.uid() and mes = v_mes_anterior;

  select coalesce(sum(valor), 0) into v_aprovado_anterior
  from despesas
  where usuario_id = auth.uid()
    and status = 'aprovado'
    and (ativo is null or ativo)
    and data_despesa >= v_ini_anterior
    and data_despesa <= v_fim_anterior;

  v_saldo := greatest(0, v_credito_anterior - v_aprovado_anterior);

  if v_saldo <= 0 then
    delete from lancamentos_credito
    where usuario_id = auth.uid() and mes = p_mes and tipo = 'saldo_transferido';
    return;
  end if;

  insert into lancamentos_credito (usuario_id, mes, data_pix, valor, tipo, observacao, criado_por)
  values (auth.uid(), p_mes, (p_mes || '-01')::date, v_saldo, 'saldo_transferido', 'Saldo transferido de ' || v_mes_anterior, auth.uid())
  on conflict (usuario_id, mes) where tipo = 'saldo_transferido'
  do update set valor = excluded.valor, data_pix = excluded.data_pix, observacao = excluded.observacao, criado_por = excluded.criado_por;
end;
$$;

grant execute on function public.transferir_saldos_credito(char) to authenticated;
grant execute on function public.transferir_saldo_credito_proprio(char) to authenticated;
