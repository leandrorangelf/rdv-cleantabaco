import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const vercel = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')

test('CSP allows cdnjs source map fetches for jsPDF', () => {
  assert.match(vercel, /script-src[^"]*https:\/\/cdnjs\.cloudflare\.com/)
  assert.match(vercel, /connect-src[^"]*https:\/\/cdnjs\.cloudflare\.com/)
})
