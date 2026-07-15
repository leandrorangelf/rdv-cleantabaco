import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const edgeFunction = readFileSync(new URL('../supabase/functions/admin-funcionarios/index.ts', import.meta.url), 'utf8')

test('admin employee function accepts the current production domain', () => {
  assert.match(edgeFunction, /https:\/\/rdvs\.vercel\.app/)
  assert.doesNotMatch(edgeFunction, /https:\/\/rdv-cleantabaco\.vercel\.app/)
})

test('employee admin request does not leave the UI waiting forever', () => {
  const block = html.match(/async function adminFunc\(action, payload\)\{[\s\S]*?\n\}/)?.[0] || ''
  assert.match(block, /AbortSignal\.timeout\(15000\)/)
  assert.match(block, /catch\(e\)/)
})
