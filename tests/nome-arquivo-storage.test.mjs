import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

function carregarFuncao() {
  const m = html.match(/function nomeSeguroStorage\(v\)\{[\s\S]*?\n\}/)
  assert.ok(m, 'nomeSeguroStorage deve existir')
  return new Function(`${m[0]}; return nomeSeguroStorage`)()
}

test('nomeSeguroStorage gera chave válida para o Storage', () => {
  const f = carregarFuncao()
  assert.equal(f('Refeição Almoço (1).pdf'), 'Refeicao_Almoco_1.pdf')
  assert.equal(f('nota [final] #2 100%.PDF'), 'nota_final_2_100.PDF')
  assert.equal(f(''), 'arquivo')
  assert.match(f('ç ã é ü ñ.jpg'), /^[A-Za-z0-9_.-]+$/)
})

test('uploads de comprovante não usam o nome bruto do arquivo na chave', () => {
  assert.doesNotMatch(html, /\$\{(?:arquivo|primeiro|primeiroArquivo)\.name\}`/)
})
