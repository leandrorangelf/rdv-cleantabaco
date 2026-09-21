import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../supabase/migrations/20260921_exige_comprovante.sql', import.meta.url), 'utf8')

test('migration adds exige_comprovante column and flags the mandatory categories', () => {
  assert.match(migration, /alter table categorias add column if not exists exige_comprovante boolean not null default false/)
  assert.match(migration, /nome ilike '%refeição%'/)
  assert.match(migration, /nome ilike '%hospedagem%'/)
  assert.match(migration, /nome ilike '%hotel%'/)
  assert.match(migration, /nome ilike '%estacionamento%'/)
  assert.match(migration, /nome ilike '%pedágio%'/)
})

test('migration enforces the rule at the database level via triggers', () => {
  assert.match(migration, /create or replace function fn_valida_comprovante_despesa/)
  assert.match(migration, /raise exception 'Esta categoria exige comprovante anexado\.'/)
  assert.match(migration, /create trigger trg_valida_comprovante_despesa_insert\s+before insert on despesas/)
  assert.match(migration, /create trigger trg_valida_comprovante_despesa_update\s+before update on despesas/)
})

test('single expense form blocks submission without a receipt for mandatory categories', () => {
  assert.match(html, /let categoriasExigeComprovante = \{\}/)
  assert.match(html, /categoriasExigeComprovante\[c\.id\]=!!c\.exige_comprovante/)
  assert.match(html, /if\(categoriasExigeComprovante\[catId\] && !primeiroArquivo && !despesaEditandoId\)\{/)
  assert.match(html, /if\(categoriasExigeComprovante\[catId\] && !comprovante_url\)\{/)
})

test('bulk expense form validates receipts per category block before saving', () => {
  assert.match(html, /const catsFaltandoComprovante = new Set\(\)/)
  assert.match(html, /cat\?\.exige_comprovante && !\(multiArquivos\[l\.catId\]\|\|\[\]\)\.length/)
})

test('bulk expense form reuses the block receipt URL across every row of the category', () => {
  assert.match(html, /const comprovantePorCategoria = \{\} \/\/ \{catId: \{url,nome,tamanhoKb\}\}/)
  assert.match(html, /comprovante_url:comp\.url\|\|null, comprovante_nome:comp\.nome\|\|null, comprovante_tamanho_kb:comp\.tamanhoKb\|\|null/)
})
