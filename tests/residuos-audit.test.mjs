import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const report = {
  removerComSeguranca: [],
  investigarAntes: [],
  manterMasOtimizar: [],
}

function add(section, item) {
  if (!report[section].includes(item)) report[section].push(item)
}

function countWord(source, word) {
  return [...source.matchAll(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'))].length
}

function functionDeclarations(source) {
  return [...source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(match => ({
    name: match[1],
    index: match.index,
  }))
}

function duplicateFunctions(source) {
  const counts = new Map()
  for (const fn of functionDeclarations(source)) counts.set(fn.name, (counts.get(fn.name) || 0) + 1)
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }))
}

function emptyStubFunctions(source) {
  return [...source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*\}/g)].map(match => match[1])
}

function orphanFunctionCandidates(source) {
  return functionDeclarations(source)
    .map(fn => ({ name: fn.name, references: countWord(source, fn.name) }))
    .filter(fn => fn.references === 1)
    .map(fn => fn.name)
}

function htmlHandlerCalls(source) {
  const handlerBodies = [...source.matchAll(/\bon(?:click|change|input|keydown|submit)="([^"]*)"/g)].map(match => match[1])
  return [...new Set(handlerBodies.flatMap(body => [...body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(match => match[1])))]
}

function missingHtmlHandlers(source) {
  const declared = new Set(functionDeclarations(source).map(fn => fn.name))
  const allowedGlobalsAndMethods = new Set([
    'alert',
    'confirm',
    'document',
    'event',
    'parseFloat',
    'setTimeout',
    'String',
    'Number',
    'Date',
    'click',
    'closest',
    'getElementById',
    'querySelector',
    'remove',
    'removeChild',
    'stopPropagation',
  ])

  return htmlHandlerCalls(source).filter(name => !declared.has(name) && !allowedGlobalsAndMethods.has(name)).sort()
}

function extractFunctionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`))
  if (start < 0) return ''
  const bodyStart = source.indexOf('{', start)
  if (bodyStart < 0) return ''
  let depth = 0
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}') depth--
    if (depth === 0) return source.slice(start, i + 1)
  }
  return source.slice(start)
}

function createSupabaseRecorder() {
  const calls = []
  const chain = call => new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') return undefined
      return (...args) => {
        call.steps.push({ method: String(prop), args })
        return chain(call)
      }
    },
  })
  return {
    calls,
    from(table) {
      const call = { table, steps: [] }
      calls.push(call)
      return chain(call)
    },
  }
}

function replayStaticSupabaseCalls(source) {
  const sb = createSupabaseRecorder()
  const callRe = /sb\.from\('([^']+)'\)([\s\S]*?)\.select\(([^)]*)\)([\s\S]*?)(?=(?:\n\s*(?:const|let|if|return|await|sb\.from|\]\)|\}\)|\}\]|$)))/g

  for (const match of source.matchAll(callRe)) {
    const [, table, beforeSelect, selectArg, afterSelect] = match
    let q = sb.from(table).select(selectArg.trim())
    const tail = `${beforeSelect}${afterSelect}`
    for (const step of tail.matchAll(/\.(eq|gte|lte|in|or|neq|order|limit|single|maybeSingle)\(([^)]*)\)/g)) {
      q = q[step[1]](step[2])
    }
  }

  return sb.calls
}

function hasMonthOrUserFilter(call) {
  const joined = call.steps.map(step => `${step.method}(${step.args.join(',')})`).join('.')
  return /data_despesa|mes|usuario_id|data_inicio|data|created_at/.test(joined)
}

function buildAuditReport() {
  for (const dup of duplicateFunctions(html)) {
    add('investigarAntes', `função duplicada: ${dup.name} (${dup.count} declarações)`)
  }

  for (const stub of emptyStubFunctions(html)) {
    add('removerComSeguranca', `stub vazio: ${stub}`)
  }

  for (const orphan of orphanFunctionCandidates(html)) {
    add('investigarAntes', `função com uma única referência: ${orphan}`)
  }

  for (const missing of missingHtmlHandlers(html)) {
    add('investigarAntes', `handler HTML sem função declarada: ${missing}`)
  }

  for (const fnName of ['carregarFinanceiro', 'carregarEquipe', 'carregarViagens', 'carregarDashboard']) {
    const block = extractFunctionBlock(html, fnName)
    const calls = replayStaticSupabaseCalls(block)
    for (const call of calls) {
      const selectStep = call.steps.find(step => step.method === 'select')
      const selectsAll = selectStep?.args?.[0] === "'*'" || selectStep?.args?.[0] === '*'
      if (selectsAll) add('manterMasOtimizar', `${fnName}: ${call.table}.select('*')`)
      if (['despesas', 'viagens', 'demandas_viagem', 'agenda_semanal'].includes(call.table) && !hasMonthOrUserFilter(call)) {
        add('manterMasOtimizar', `${fnName}: ${call.table} sem filtro claro de mês/pessoa no bloco`)
      }
    }
  }

  return report
}

function printAuditReport(currentReport) {
  console.info('\n[residuos-audit] Relatório diagnóstico')
  for (const [section, title] of [
    ['removerComSeguranca', 'remover com segurança'],
    ['investigarAntes', 'investigar antes'],
    ['manterMasOtimizar', 'manter, mas otimizar'],
  ]) {
    console.info(`[residuos-audit] ${title}:`)
    const items = currentReport[section]
    if (!items.length) {
      console.info('[residuos-audit] - nenhum achado')
      continue
    }
    for (const item of items) console.info(`[residuos-audit] - ${item}`)
  }
}

test('static residue audit reports dead-code candidates without changing production files', () => {
  const currentReport = buildAuditReport()

  assert.match(html, /async function carregarFinanceiro\(\)/)
  assert.ok(currentReport.removerComSeguranca.some(item => item.includes('stub vazio')))
  assert.ok(currentReport.investigarAntes.some(item => item.includes('função duplicada: carregarEquipe')))
  assert.ok(currentReport.investigarAntes.some(item => item.includes('função com uma única referência')))
  assert.deepEqual(missingHtmlHandlers(html), [])
})

test('mocked Supabase recorder captures critical queries without network access', () => {
  const financeiroCalls = replayStaticSupabaseCalls(extractFunctionBlock(html, 'carregarFinanceiro'))
  const equipeCalls = replayStaticSupabaseCalls(extractFunctionBlock(html, 'carregarEquipe'))

  assert.ok(financeiroCalls.some(call => call.table === 'despesas'))
  assert.ok(financeiroCalls.some(call => call.table === 'profiles'))
  assert.ok(financeiroCalls.some(call => call.table === 'lancamentos_credito'))
  assert.ok(equipeCalls.some(call => call.table === 'profiles'))
  assert.ok([...financeiroCalls, ...equipeCalls].every(call => Array.isArray(call.steps)))
  assert.ok([...financeiroCalls, ...equipeCalls].some(call => call.steps.some(step => step.method === 'select')))
})

test('residue audit prints a categorized report for review before cleanup', () => {
  const currentReport = buildAuditReport()
  printAuditReport(currentReport)

  assert.ok(Array.isArray(currentReport.removerComSeguranca))
  assert.ok(Array.isArray(currentReport.investigarAntes))
  assert.ok(Array.isArray(currentReport.manterMasOtimizar))
  assert.ok(currentReport.manterMasOtimizar.some(item => item.includes("select('*')")))
})
