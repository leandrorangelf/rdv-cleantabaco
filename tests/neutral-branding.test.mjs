import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('visible branding is neutral while the legacy travel login remains compatible', () => {
  const visibleHtml = html.replace("if(email.toUpperCase()==='VIAGENS') email='viagens@cleantabaco.local'", '')
  assert.doesNotMatch(visibleHtml, /Cleantabaco/i)
  assert.match(html, /<title>RDV<\/title>/)
  assert.match(html, /Cotacoes_RDV_/)
})
