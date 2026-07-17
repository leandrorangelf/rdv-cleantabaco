import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../supabase/migrations/20260716_lancamentos_credito_pix.sql', import.meta.url), 'utf8')
const fixMigrationUrl = new URL('../supabase/migrations/20260717_corrige_transferencia_credito.sql', import.meta.url)
const fixMigration = existsSync(fixMigrationUrl) ? readFileSync(fixMigrationUrl, 'utf8') : ''
const guardMigrationUrl = new URL('../supabase/migrations/20260718_protege_transferencia_credito.sql', import.meta.url)
const guardMigration = existsSync(guardMigrationUrl) ? readFileSync(guardMigrationUrl, 'utf8') : ''

test('carregarFinanceiro chama a RPC de transferencia de saldo antes de buscar os lancamentos do mes', () => {
  const bloco = html.match(/async function carregarFinanceiro\(\)\{[\s\S]*?\n\}/)?.[0] || ''
  assert.match(bloco, /await sb\.rpc\('transferir_saldos_credito', \{ p_mes: mes \}\)/)
  const idxRpc = bloco.indexOf("sb.rpc('transferir_saldos_credito'")
  const idxQuery = bloco.indexOf('qLancamentos=sb.from')
  assert.ok(idxRpc > -1 && idxQuery > -1 && idxRpc < idxQuery, 'RPC deve rodar antes da query de lancamentos do mes')
})

test('migracao cria lancamentos_credito com valor > 0 e migra dados de verbas', () => {
  assert.match(migration, /create table if not exists lancamentos_credito/)
  assert.match(migration, /check \(valor > 0\)/)
  assert.match(migration, /check \(tipo in \('pix','saldo_transferido'\)\)/)
  assert.match(migration, /insert into lancamentos_credito[\s\S]*?from verbas/)
})

test('transferir_saldos_credito insere lancamento saldo_transferido de forma idempotente e restrita por papel', () => {
  assert.match(migration, /create or replace function public\.transferir_saldos_credito\(p_mes char\(7\)\)/)
  assert.match(migration, /papel in \('aprovador','gestor','financeiro','financeiro_viagens'\)/)
  assert.match(migration, /where usuario_id = r\.usuario_id and mes = p_mes and tipo = 'saldo_transferido'/)
  assert.match(migration, /tipo, observacao, criado_por\)\s*\n\s*values \(r\.usuario_id, p_mes, \(p_mes \|\| '-01'\)::date, v_saldo, 'saldo_transferido'/)
})

test('modal consolidado por funcionario permite adicionar e remover PIX manual', () => {
  assert.match(html, /async function abrirDetalheFuncionario\(uid, mes\)\{/)
  assert.match(html, /async function adicionarLancamentoCredito\(userId, mes\)\{/)
  assert.match(html, /tipo: 'pix'/)
  assert.match(html, /async function removerLancamentoCredito\(id, userId, mes\)\{/)
})

test('meu financeiro garante a transferencia do proprio saldo antes de carregar os cards', () => {
  const bloco = html.match(/async function carregarMeuFinanceiro\(\)\{[\s\S]*?\n\}/)?.[0] || ''
  assert.match(bloco, /await sb\.rpc\('transferir_saldo_credito_proprio', \{ p_mes: meuFinMesAtual \}\)/)
  assert.ok(bloco.indexOf('transferir_saldo_credito_proprio') < bloco.indexOf('carregarDetalheFinanceiro'))
})

test('migration de correcao usa lancamentos_credito e recupera transferencias antigas', () => {
  assert.match(fixMigration, /insert into lancamentos_credito[\s\S]*from verbas[\s\S]*saldo_transferido/)
  assert.match(fixMigration, /create or replace function public\.transferir_saldos_credito\(p_mes char\(7\)\)/)
  assert.match(fixMigration, /from lancamentos_credito[\s\S]*tipo = 'saldo_transferido'/)
  assert.match(fixMigration, /create or replace function public\.transferir_saldo_credito_proprio\(p_mes char\(7\)\)/)
  assert.match(fixMigration, /usuario_id = auth\.uid\(\)/)
})

test('protecao financeira impede duas transferencias do mesmo funcionario no mesmo mes', () => {
  assert.match(guardMigration, /create unique index if not exists lancamentos_credito_saldo_transferido_unico/)
  assert.match(guardMigration, /where tipo = 'saldo_transferido'/)
  assert.match(guardMigration, /on conflict \(usuario_id, mes\) where tipo = 'saldo_transferido' do nothing/)
})
