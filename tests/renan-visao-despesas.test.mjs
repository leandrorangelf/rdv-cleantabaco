import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../supabase/migrations/20260706_renan_leandro_despesas_todos.sql', import.meta.url), 'utf8')

test('Renan and Leandro can view consolidated expenses without becoming full managers', () => {
  assert.match(html, /function isRenan\(\)\{ return nomeNormalizado\(perfil\?\.nome\)\.includes\('renan'\) \}/)
  assert.match(html, /function podeVerDespesasTodos\(\)\{ return isGestor\(\) \|\| isRenan\(\) \}/)
  assert.doesNotMatch(html, /function isGestor\(\)\{ return perfil\?\.papel==='aprovador' \|\| isLeandro\(\) \|\| isRenan\(\) \}/)
})

test('dashboard uses consolidated expense permission for all-employee month totals', () => {
  const dashboardBlock = html.match(/async function carregarDashboard\(\) \{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(dashboardBlock, /if\(!podeVerDespesasTodos\(\)\)q=q\.eq\('usuario_id',perfil\.id\)/)
  assert.match(dashboardBlock, /\$\{podeVerDespesasTodos\(\)\?'todos':'meu RDV'\}/)
  assert.match(dashboardBlock, /if\(podeVerDespesasTodos\(\)\)\{[\s\S]*?Resumo financeiro por coordenador/)
})

test('RDV expenses list can show all employees and labels each employee when allowed', () => {
  const avulsasBlock = html.match(/async function carregarAvulsas\(\)\{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(avulsasBlock, /if\(!podeVerDespesasTodos\(\)\)q=q\.eq\('usuario_id',perfil\.id\)/)
  assert.match(avulsasBlock, /if\(!podeVerDespesasTodos\(\)\)qViag=qViag\.eq\('usuario_id',perfil\.id\)/)
  assert.match(avulsasBlock, /if\(podeVerDespesasTodos\(\)\)\{[\s\S]*?sb\.from\('profiles'\)\.select\('id,nome'\)/)
  assert.match(avulsasBlock, /const quemLabel=podeVerDespesasTodos\(\)\?/)
})

test('Equipe 360 uses the selected dashboard month for past employee spending', () => {
  const equipeMatches = [...html.matchAll(/async function carregarEquipe\(\)\{[\s\S]*?\n\}/g)]
  const equipeBlock = equipeMatches.at(-1)?.[0] || ''
  const pessoaBlock = html.match(/async function abrirPessoa360\(uid\)\{[\s\S]*?const \[\{data:p\}/)?.[0] || ''

  assert.match(equipeBlock, /if\(!podeVerDespesasTodos\(\)\)return/)
  assert.match(equipeBlock, /const mes=dashMesSelecionado\(\)/)
  assert.match(equipeBlock, /const \{ini,fim\}=mesIntervalo\(mes\)/)
  assert.match(pessoaBlock, /const mes=dashMesSelecionado\(\), ini=`\$\{mes\}-01`, fim=fimMes\(mes\)/)
})

test('Supabase RLS allows Renan and Leandro to select all expenses', () => {
  assert.match(migration, /create or replace function public\.can_view_all_expenses_by_name\(\)/i)
  assert.match(migration, /security definer/i)
  assert.match(migration, /create policy "despesas_select_renan_leandro_todos"/i)
  assert.match(migration, /for select/i)
  assert.match(migration, /lower\(nome\) like '%renan%'/i)
  assert.match(migration, /lower\(nome\) like '%leandro%'/i)
  assert.match(migration, /create policy "profiles_select_renan_leandro_todos"/i)
})
