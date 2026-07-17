import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const sql = readFileSync(new URL('../supabase/migrations/20260717_meu_financeiro_rls.sql', import.meta.url), 'utf8')

test('funcionario pode ler os proprios lancamentos de credito', () => {
  assert.match(sql, /create policy "lancamentos_credito_select_proprio" on lancamentos_credito for select\s+using \(usuario_id = auth\.uid\(\)\)/)
})

test('funcionario pode ler o proprio status de pagamento', () => {
  assert.match(sql, /create policy "pagamentos_select_proprio" on pagamentos_rdv for select\s+using \(usuario_id = auth\.uid\(\)\)/)
})
