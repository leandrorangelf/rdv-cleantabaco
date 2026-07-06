import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('Financeiro fetches only approved active expenses from Supabase', () => {
  const block = html.match(/async function carregarFinanceiro\(\)\{[\s\S]*?async function salvarVerba/)?.[0] || ''

  assert.match(block, /\.eq\('status','aprovado'\)/)
  assert.match(block, /\.or\('ativo\.is\.null,ativo\.eq\.true'\)/)
  assert.doesNotMatch(block, /const dsAprov = \(despesas\|\|\[\]\)\.filter/)
})

test('Financeiro loads independent data in parallel', () => {
  const block = html.match(/async function carregarFinanceiro\(\)\{[\s\S]*?async function salvarVerba/)?.[0] || ''

  assert.match(block, /Promise\.all\(\[/)
  assert.match(block, /qDespesas/)
  assert.match(block, /qProfs/)
  assert.match(block, /qVerbas/)
  assert.match(block, /qPagamentos/)
})

test('Financeiro initial month adjustment avoids exact counts', () => {
  const block = html.match(/async function ajustarFinMesInicial\(\)\{[\s\S]*?async function carregarFinanceiro/)?.[0] || ''

  assert.doesNotMatch(block, /count:'exact'/)
  assert.match(block, /\.limit\(1\)/)
  assert.match(block, /\.eq\('status','aprovado'\)/)
})

test('Financeiro shows loading before initial month adjustment', () => {
  const block = html.match(/async function carregarFinanceiro\(\)\{[\s\S]*?const mes = finMesAtual/)?.[0] || ''

  assert.match(block, /document\.getElementById\('fin-lista'\)\.innerHTML='<div class="loading">Carregando\.\.\.<\/div>'[\s\S]*await ajustarFinMesInicial\(\)/)
})
