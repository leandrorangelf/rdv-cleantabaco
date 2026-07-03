import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('financeiro_viagens sees emitted tickets tab in Viagens', () => {
  const financeiroViagensBlock = html.match(/if\(perfil\?\.papel==='financeiro_viagens'\)\{[\s\S]*?\n  \}/)?.[0] || ''

  assert.match(financeiroViagensBlock, /tab-viagens-bilhete'\)\.style\.display='inline-flex'/)
  assert.match(financeiroViagensBlock, /tab-viagens-emitidas'\)\.style\.display='inline-flex'/)
})

test('month selector exists for Viagens filtering', () => {
  assert.match(html, /id="viagens-mes"[^>]+type="month"[^>]+onchange="mudarViagensMes\(\)"/)
  assert.match(html, /function viagensMesSelecionado\(\)/)
  assert.match(html, /async function mudarViagensMes\(\)/)
})

test('only operational travel emitters are locked to waiting tickets', () => {
  assert.match(html, /function isEmissorOperacionalViagens\(\)/)
  assert.doesNotMatch(html, /if\(isEmissorViagens\(\)\) viagensTabAtual='bilhete'/)
  assert.match(html, /if\(isEmissorOperacionalViagens\(\)\) viagensTabAtual='bilhete'/)
})

test('financeiro_viagens query can include emitted tickets', () => {
  assert.match(html, /if\(isEmissorOperacionalViagens\(\)\)\{[\s\S]*?qv=qv\.in\('status',\['autorizada','aguardando_bilhete'\]\)/)
})
