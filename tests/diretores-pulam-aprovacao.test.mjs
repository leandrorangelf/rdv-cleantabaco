import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('salvarDespesa grava status aprovado direto para quem pula aprovacao', () => {
  assert.match(html, /const pulaAprov = !!perfil\.pula_aprovacao/)
  assert.match(html, /status:pulaAprov\?'aprovado':'pendente',\s*\n\s*motivo_rejeicao:null,aprovado_por:null,aprovado_em:pulaAprov\?new Date\(\)\.toISOString\(\):null,/)
  assert.match(html, /status:pulaAprov\?'aprovado':'pendente',\s*\n\s*aprovado_por:null,aprovado_em:pulaAprov\?new Date\(\)\.toISOString\(\):null,/)
})

test('lancamento em lote grava status aprovado direto para quem pula aprovacao', () => {
  assert.match(html, /const pulaAprovLote = !!perfilLancamento\.pula_aprovacao/)
  assert.match(html, /status:pulaAprovLote\?'aprovado':'pendente', aprovado_por:null, aprovado_em:pulaAprovLote\?new Date\(\)\.toISOString\(\):null,/)
})

test('select de pessoas do lancamento em lote inclui pula_aprovacao', () => {
  assert.match(html, /\.from\('profiles'\)\.select\('id,nome,estado_base,ativo,pula_aprovacao'\)/)
})

test('Leandro tambem ve RDVs em aprovacao 1, com tag distinta', () => {
  assert.match(html, /const statusDespesa = isGestor1\(\) \? \['pendente'\] : \(isLeandro\(\) \? \['pendente','aguardando_aprovacao_2'\] : \['aguardando_aprovacao_2'\]\)/)
  assert.match(html, /!isGestor1\(\)&&d\.status==='pendente'\?' <span class="badge b-orange"[^>]*>Aprovação 1<\/span>'/)
})

test('Financeiro/gestor podem ver discriminado e comprovantes dos diretores mesmo aprovado', () => {
  assert.match(html, /\.from\('profiles'\)\.select\('id,nome,papel,ativo,pula_aprovacao'\)/)
  assert.match(html, /p\.pula_aprovacao\?`<button class="btn btn-sm" style="margin-top:4px" onclick="abrirDetalheDiretor/)
  assert.match(html, /async function abrirDetalheDiretor\(uid, mes\)\{/)
  assert.match(html, /sb\.from\('despesas'\)\.select\('\*'\)\.eq\('usuario_id',uid\)\.eq\('status','aprovado'\)/)
})

test('comprovantes de imagem abrem numa galeria navegavel com setas', () => {
  assert.match(html, /id="galeria-overlay"/)
  assert.match(html, /function abrirGaleria\(idx\)\{/)
  assert.match(html, /function navegarGaleria\(delta\)\{/)
  assert.match(html, /onclick="navegarGaleria\(-1\)"/)
  assert.match(html, /onclick="navegarGaleria\(1\)"/)
  assert.match(html, /e\.key==='ArrowRight'\)navegarGaleria\(1\)/)
})
