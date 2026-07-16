import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../supabase/migrations/20260716_transferir_saldo_credito.sql', import.meta.url), 'utf8')

test('carregarFinanceiro chama a RPC de transferencia de saldo antes de buscar as verbas do mes', () => {
  const bloco = html.match(/async function carregarFinanceiro\(\)\{[\s\S]*?\n\}/)?.[0] || ''
  assert.match(bloco, /await sb\.rpc\('transferir_saldos_credito', \{ p_mes: mes \}\)/)
  const idxRpc = bloco.indexOf("sb.rpc('transferir_saldos_credito'")
  const idxQuery = bloco.indexOf('qDespesas=sb.from')
  assert.ok(idxRpc > -1 && idxQuery > -1 && idxRpc < idxQuery, 'RPC deve rodar antes da query de despesas do mes')
})

test('migracao adiciona flag de idempotencia e restringe quem pode transferir saldo', () => {
  assert.match(migration, /alter table verbas add column if not exists saldo_transferido boolean not null default false/)
  assert.match(migration, /create or replace function public\.transferir_saldos_credito\(p_mes char\(7\)\)/)
  assert.match(migration, /papel in \('aprovador','gestor','financeiro','financeiro_viagens'\)/)
  assert.doesNotMatch(migration, /can_view_all_expenses_by_name/)
  assert.match(migration, /where not verbas\.saldo_transferido/)
})
