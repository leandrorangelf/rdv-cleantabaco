import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const vercel = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')
const faviconUrl = new URL('../favicon.svg', import.meta.url)

test('page declares an SVG favicon to avoid missing favicon.ico requests', () => {
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/)
  assert.equal(existsSync(faviconUrl), true)
  assert.match(vercel, /"source": "\/favicon\.ico"[\s\S]*"destination": "\/favicon\.svg"/)
})
