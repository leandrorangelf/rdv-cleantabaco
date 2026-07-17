import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('nav item "Meu financeiro" existe e nao e restrito por papel', () => {
  const navBlock = html.match(/<div class="nav-item"[^>]*onclick="showScreen\('meufinanceiro',this\)"[^>]*id="nav-meufinanceiro"[^>]*>/)?.[0] || ''
  assert.ok(navBlock, 'nav item nao encontrado')
  assert.doesNotMatch(navBlock, /aprovador-only/)
  assert.doesNotMatch(navBlock, /style="display:none"/)
})

test('screen "Meu financeiro" existe com seletor de mes', () => {
  assert.match(html, /<div class="screen" id="screen-meufinanceiro">/)
  assert.match(html, /id="meufin-mes"[^>]+type="month"[^>]+onchange="mudarMeuFinMes\(\)"/)
})

test('carregarMeuFinanceiro usa o proprio usuario e modo readonly', () => {
  assert.match(html, /async function carregarMeuFinanceiro\(\)/)
  const fn = html.match(/async function carregarMeuFinanceiro\(\)[\s\S]*?\n\}/)?.[0] || ''
  assert.match(fn, /carregarDetalheFinanceiro\([^,]+,\s*perfil\.id,\s*meuFinMesAtual,\s*\{readonly:\s*true\}\)/)
})

test('showScreen registra o loader de meufinanceiro', () => {
  assert.match(html, /meufinanceiro:carregarMeuFinanceiro/)
})
