import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('carregarDetalheFinanceiro existe e aceita modo readonly', () => {
  assert.match(html, /async function carregarDetalheFinanceiro\(det, ?uid, ?mes, ?\{readonly ?= ?false\} ?= ?\{\}\)/)
})

test('modal admin continua chamando o detalhe com acoes habilitadas (readonly:false)', () => {
  assert.match(html, /await carregarDetalheFinanceiro\([^,]+,\s*uid,\s*mes,\s*\{readonly:\s*false\}\)/)
})

test('modal admin ainda tem os botoes de acao (adicionar PIX, excluir, marcar pago)', () => {
  assert.match(html, /onclick="adicionarLancamentoCredito\('\$\{uid\}','\$\{mes\}'\)"/)
  assert.match(html, /onclick="removerLancamentoCredito\('\$\{l\.id\}','\$\{uid\}','\$\{mes\}'\)"/)
  assert.match(html, /onclick="marcarPagoDetalhe\('\$\{uid\}','\$\{mes\}',\$\{apagar\}\)"/)
})

test('acoes de escrita ficam escondidas no modo readonly', () => {
  const fn = html.match(/async function carregarDetalheFinanceiro[\s\S]*?\nfunction renderDetFinRows/)?.[0] || ''
  assert.match(fn, /readonly \? '' : `<td><button class="btn btn-sm btn-reject" onclick="removerLancamentoCredito/)
})

test('filtro de categoria existe e reusa entre os dois usos', () => {
  assert.match(html, /id="detfin-cat-filtro"/)
  assert.match(html, /function renderDetFinRows\(catFiltro\)/)
})

test('detalhe pessoal renderiza cards de credito usado e saldo de credito', () => {
  const fn = html.match(/async function carregarDetalheFinanceiro[\s\S]*?\nfunction renderDetFinRows/)?.[0] || ''
  assert.match(fn, /id="detfin-credito-usado"/)
  assert.match(fn, /id="detfin-saldo-credito"/)
})
