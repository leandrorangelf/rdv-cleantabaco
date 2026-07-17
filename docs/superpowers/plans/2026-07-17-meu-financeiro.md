# Meu financeiro (visão pessoal do funcionário) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a cada funcionário uma tela própria "Meu financeiro", somente leitura, mostrando crédito PIX recebido, saldo transferido do mês anterior, gastos aprovados (filtráveis por categoria) e status de pagamento — só dos próprios dados.

**Architecture:** Nova migração libera RLS de leitura da própria linha em `lancamentos_credito` e `pagamentos_rdv`. A lógica de detalhe hoje só usada no modal admin (`abrirDetalheFuncionario`) é extraída para uma função compartilhada `carregarDetalheFinanceiro(containerEl, uid, mes, {readonly})`, reaproveitada por um novo nav item + screen "Meu financeiro" (sem ações de escrita) e pelo modal admin existente (com ações, como hoje).

**Tech Stack:** Supabase (Postgres + RLS), `index.html` (JS vanilla, Supabase JS SDK v2), `node --test` para os testes.

## Global Constraints

- Migrações novas são arquivos SQL datados em `supabase/migrations/`, nunca editam migração já commitada.
- `index.html` é editado cirurgicamente (busca por âncora/nome de função), sem reescrever blocos inteiros.
- Commits em português, curtos, indicativo/imperativo.
- Toda mudança de permissão de tela precisa checar os dois lados: condicional no `index.html` e policy de RLS correspondente.
- Testes usam `node:test` + `node:assert/strict`, lendo `index.html`/migrações como texto via regex (ver `tests/manu-bilhetes-emitidos.test.mjs` como referência de estilo).

---

### Task 1: RLS — funcionário lê os próprios lançamentos de crédito e pagamento

**Files:**
- Create: `supabase/migrations/20260717_meu_financeiro_rls.sql`
- Test: `tests/meu-financeiro-rls.test.mjs`

**Interfaces:**
- Produces: duas policies novas de `select`, `lancamentos_credito_select_proprio` em `lancamentos_credito` e `pagamentos_select_proprio` em `pagamentos_rdv`, ambas `using (usuario_id = auth.uid())`. Tasks 2/3 dependem de essas policies existirem para a tela funcionar sem erro de RLS.

- [ ] **Step 1: Escrever a migração**

Criar `supabase/migrations/20260717_meu_financeiro_rls.sql`:

```sql
-- Libera leitura da propria linha para a tela "Meu financeiro": cada
-- funcionario passa a ver seus proprios lancamentos de credito PIX e seu
-- proprio status de pagamento, sem enxergar dados de outra pessoa.
-- Postgres combina multiplas policies de select com OR, entao isso soma
-- as policies existentes por papel (aprovador/gestor/financeiro/
-- financeiro_viagens) sem substitui-las.
-- Ver docs/superpowers/specs/2026-07-17-meu-financeiro-design.md

create policy "lancamentos_credito_select_proprio" on lancamentos_credito for select
  using (usuario_id = auth.uid());

create policy "pagamentos_select_proprio" on pagamentos_rdv for select
  using (usuario_id = auth.uid());
```

- [ ] **Step 2: Escrever o teste**

Criar `tests/meu-financeiro-rls.test.mjs`:

```javascript
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const sql = readFileSync(new URL('../supabase/migrations/20260717_meu_financeiro_rls.sql', import.meta.url), 'utf8')

test('funcionario pode ler os proprios lancamentos de credito', () => {
  assert.match(sql, /create policy "lancamentos_credito_select_proprio" on lancamentos_credito for select\s+using \(usuario_id = auth\.uid\(\)\)/)
})

test('funcionario pode ler o proprio status de pagamento', () => {
  assert.match(sql, /create policy "pagamentos_select_proprio" on pagamentos_rdv for select\s+using \(usuario_id = auth\.uid\(\)\)/)
})
```

- [ ] **Step 3: Rodar o teste e verificar que passa**

Run: `node --test tests/meu-financeiro-rls.test.mjs`
Expected: 2 pass, 0 fail (o arquivo SQL já foi criado no Step 1, então já passa de primeira — não há "fase vermelha" aqui porque é um teste sobre um arquivo estático, não sobre comportamento de código a implementar depois).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260717_meu_financeiro_rls.sql tests/meu-financeiro-rls.test.mjs
git commit -m "Libera funcionario para ler os proprios creditos PIX e status de pagamento"
```

---

### Task 2: Extrair `carregarDetalheFinanceiro` compartilhada, com modo readonly e filtro de categoria

**Files:**
- Modify: `index.html` (função `abrirDetalheFuncionario` e o bloco que ela renderiza, hoje por volta da linha 3943–4060)
- Test: `tests/meu-financeiro-detalhe.test.mjs`

**Interfaces:**
- Consumes: `sb` (cliente Supabase já inicializado), `fimMes(mes)`, `moeda(v)`, `dataFmt(s)`, `safeTxt(v)`, `safeUrl(u)`, `nomeExibicao(p)`, `ehImagem(nome,url)`, `abrirGaleria(idx)`, `podeGerenciarPagamentos()`, `galeriaFotos` (array global já existente), `adicionarLancamentoCredito(uid,mes)`, `removerLancamentoCredito(id,uid,mes)`, `marcarPagoDetalhe(uid,mes,valor)`, `desmarcarPagoDetalhe(uid,mes)`, `fecharDetalheFuncionario()`.
- Produces: `async function carregarDetalheFinanceiro(det, uid, mes, {readonly=false}={})` — popula `det.innerHTML` com cards/tabelas e chama `renderDetFinRows('')` no final. `function renderDetFinRows(catFiltro)` — repopula só o `<tbody id="detfin-rows">` filtrando por `categoria_id` (string vazia = todas). Task 3 (tela do funcionário) chama `carregarDetalheFinanceiro(elemento, perfil.id, mes, {readonly:true})`.

- [ ] **Step 1: Escrever o teste (vai falhar até o Step 3)**

Criar `tests/meu-financeiro-detalhe.test.mjs`:

```javascript
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
  assert.match(fn, /readonly ? '' : `<td><button class="btn btn-sm btn-reject" onclick="removerLancamentoCredito/)
})

test('filtro de categoria existe e reusa entre os dois usos', () => {
  assert.match(html, /id="detfin-cat-filtro"/)
  assert.match(html, /function renderDetFinRows\(catFiltro\)/)
})
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `node --test tests/meu-financeiro-detalhe.test.mjs`
Expected: FAIL — nenhuma das funções/strings existe ainda no `index.html`.

- [ ] **Step 3: Substituir o bloco de `abrirDetalheFuncionario` no `index.html`**

Localizar (por volta da linha 3943) o trecho que vai de `function fecharDetalheFuncionario(){` até o fechamento de `abrirDetalheFuncionario` (linha ~4060, logo antes de `async function adicionarLancamentoCredito`). Trocar todo esse trecho por:

```javascript
function fecharDetalheFuncionario(){
  document.getElementById('modal-fin-detalhe')?.remove()
}

async function abrirDetalheFuncionario(uid, mes){
  let modal=document.getElementById('modal-fin-detalhe')
  if(!modal){
    modal=document.createElement('div')
    modal.id='modal-fin-detalhe'
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px'
    modal.innerHTML='<div class="card" id="fin-detalhe-card" style="width:100%;max-width:900px;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)"></div>'
    modal.addEventListener('click', e=>{ if(e.target===modal) fecharDetalheFuncionario() })
    document.body.appendChild(modal)
  }
  await carregarDetalheFinanceiro(document.getElementById('fin-detalhe-card'), uid, mes, {readonly: false})
}

let detFinDespesas = []
let detFinCatNomePorId = {}

async function carregarDetalheFinanceiro(det, uid, mes, {readonly=false}={}){
  det.innerHTML='<div class="loading">Carregando...</div>'
  const ini=mes+'-01', fim=fimMes(mes)
  const podePag = readonly || podeGerenciarPagamentos()
  const [{data:p},{data:despesas},{data:lancamentos},{data:pag}]=await Promise.all([
    sb.from('profiles').select('nome,empresa').eq('id',uid).single(),
    sb.from('despesas').select('*').eq('usuario_id',uid).eq('status','aprovado')
      .or('ativo.is.null,ativo.eq.true').gte('data_despesa',ini).lte('data_despesa',fim)
      .order('data_despesa'),
    sb.from('lancamentos_credito').select('*').eq('usuario_id',uid).eq('mes',mes).order('data_pix'),
    podePag
      ? sb.from('pagamentos_rdv').select('*').eq('usuario_id',uid).eq('mes',mes).maybeSingle()
      : Promise.resolve({data:null})
  ])
  const lista=despesas||[]
  const despIds=lista.map(d=>d.id)
  const [{data:cats},{data:extras}]=await Promise.all([
    sb.from('categorias').select('id,nome'),
    despIds.length?sb.from('comprovantes').select('*').in('despesa_id',despIds):Promise.resolve({data:[]})
  ])
  const catNomePorId={};(cats||[]).forEach(c=>catNomePorId[c.id]=c.nome)
  const extrasPorDespesa={}
  ;(extras||[]).forEach(c=>{ if(!extrasPorDespesa[c.despesa_id])extrasPorDespesa[c.despesa_id]=[]; extrasPorDespesa[c.despesa_id].push(c) })

  detFinDespesas = lista.map(d=>{
    const arquivos=[]
    if(d.comprovante_url) arquivos.push({url:d.comprovante_url,nome:d.comprovante_nome})
    ;(extrasPorDespesa[d.id]||[]).forEach(c=>arquivos.push({url:c.url,nome:c.nome}))
    return {...d, _arquivos: arquivos}
  })
  detFinCatNomePorId = catNomePorId

  const aprovado=lista.reduce((s,d)=>s+Number(d.valor||0),0)
  const lancList=lancamentos||[]
  const verbVal=lancList.reduce((s,l)=>s+Number(l.valor||0),0)
  const creditoUsado=Math.min(aprovado,verbVal)
  const saldoCredito=Math.max(0,verbVal-aprovado)
  const apagar=Math.max(0,aprovado-verbVal)
  const pago=!!pag

  const rowsLanc=lancList.map(l=>`<tr>
    <td>${dataFmt(l.data_pix)}</td>
    <td style="text-align:right">${moeda(l.valor)}</td>
    <td>${l.tipo==='saldo_transferido'?'<span class="badge b-gray">Saldo transferido</span>':'<span class="badge b-mint">PIX</span>'}</td>
    <td>${safeTxt(l.observacao||'')}</td>
    ${readonly ? '' : `<td><button class="btn btn-sm btn-reject" onclick="removerLancamentoCredito('${l.id}','${uid}','${mes}')">Excluir</button></td>`}
  </tr>`).join('')

  const acaoPagamento=(readonly || !podeGerenciarPagamentos()) ? '' : pago
    ? `<span class="badge b-mint">Pago</span> <button class="btn btn-sm btn-reject" style="margin-left:6px" onclick="desmarcarPagoDetalhe('${uid}','${mes}')">Desfazer</button>`
    : apagar>0
      ? `<button class="btn btn-sm btn-approve" onclick="marcarPagoDetalhe('${uid}','${mes}',${apagar})">Marcar pago</button>`
      : ''
  const statusPagoReadonly = readonly ? (pago?'<span class="badge b-mint">Pago</span>':(apagar>0?'<span class="badge b-orange">A pagar</span>':'<span class="badge b-gray">Nada a pagar</span>')) : ''

  const categorias=[...new Set(detFinDespesas.map(d=>d.categoria_id).filter(Boolean))]
    .map(id=>({id, nome:catNomePorId[id]||'Sem categoria'}))
    .sort((a,b)=>a.nome.localeCompare(b.nome))

  det.innerHTML=`
    <div class="card-header" style="position:sticky;top:0;background:var(--surface,#fff);z-index:1;padding-bottom:12px">
      <div><div class="card-title">${safeTxt(nomeExibicao(p))}</div><div class="card-meta">Detalhes financeiros do m&ecirc;s</div></div>
      ${readonly ? '' : '<button class="btn" onclick="fecharDetalheFuncionario()">Fechar</button>'}
    </div>
    <div style="padding:0 18px 18px">
    <div class="fin-summary" style="margin-top:12px">
      <div class="fin-card fin-card-main"><div class="fin-card-label">A receber</div><div class="fin-card-value">${moeda(apagar)}</div></div>
      <div class="fin-card"><div class="fin-card-label">RDV aprovado</div><div class="fin-card-value">${moeda(aprovado)}</div></div>
      <div class="fin-card"><div class="fin-card-label">Cr&eacute;dito PIX</div><div class="fin-card-value">${moeda(verbVal)}</div></div>
      <div class="fin-card"><div class="fin-card-label">Cr&eacute;dito usado</div><div class="fin-card-value">${moeda(creditoUsado)}</div></div>
      <div class="fin-card"><div class="fin-card-label">Saldo cr&eacute;dito</div><div class="fin-card-value">${moeda(saldoCredito)}</div></div>
    </div>
    <div style="margin-top:12px">${readonly ? statusPagoReadonly : acaoPagamento}</div>

    <h4 style="margin-top:24px">Discriminado de RDV</h4>
    <select id="detfin-cat-filtro" class="form-select" style="max-width:280px;margin-bottom:10px" onchange="renderDetFinRows(this.value)">
      <option value="">Todas as categorias</option>
      ${categorias.map(c=>`<option value="${c.id}">${safeTxt(c.nome)}</option>`).join('')}
    </select>
    <table class="tbl">
      <thead><tr><th>Data</th><th>Categoria</th><th>Descri&ccedil;&atilde;o</th><th style="text-align:right">Valor</th><th>Comprovante</th></tr></thead>
      <tbody id="detfin-rows"></tbody>
    </table>

    <h4 style="margin-top:24px">Lan&ccedil;amentos de cr&eacute;dito PIX</h4>
    <table class="tbl">
      <thead><tr><th>Data</th><th style="text-align:right">Valor</th><th>Tipo</th><th>Observa&ccedil;&atilde;o</th>${readonly?'':'<th></th>'}</tr></thead>
      <tbody>${rowsLanc||`<tr><td colspan="${readonly?4:5}">Nenhum lan&ccedil;amento neste m&ecirc;s.</td></tr>`}</tbody>
    </table>
    ${readonly ? '' : `
    <div style="display:flex;gap:6px;align-items:center;margin-top:12px;flex-wrap:wrap">
      <input type="date" id="lanc-data-${uid}" class="form-input" style="width:140px" value="${new Date().toISOString().slice(0,10)}">
      <input type="number" id="lanc-valor-${uid}" class="form-input" style="width:100px" placeholder="0,00" step="0.01" min="0">
      <input type="text" id="lanc-obs-${uid}" class="form-input" style="flex:1;min-width:160px" placeholder="Observa&ccedil;&atilde;o (opcional)">
      <button class="btn btn-sm btn-approve" onclick="adicionarLancamentoCredito('${uid}','${mes}')">Adicionar PIX</button>
    </div>`}
    </div>`

  renderDetFinRows('')
}

function renderDetFinRows(catFiltro){
  const lista = catFiltro ? detFinDespesas.filter(d=>String(d.categoria_id)===String(catFiltro)) : detFinDespesas
  galeriaFotos=[]
  const rows = lista.map(d=>{
    const legenda=`${dataFmt(d.data_despesa)} · ${detFinCatNomePorId[d.categoria_id]||'Sem categoria'} · ${moeda(d.valor)}`
    const compHtml = d._arquivos.length
      ? d._arquivos.map(a=>{
          if(ehImagem(a.nome,a.url)){
            galeriaFotos.push({url:a.url,legenda})
            const idx=galeriaFotos.length-1
            return `<img src="${safeUrl(a.url)}" onclick="abrirGaleria(${idx})" style="width:32px;height:32px;object-fit:cover;border-radius:5px;border:1px solid var(--line);cursor:pointer;margin-right:4px" title="${safeTxt(a.nome||'foto')}">`
          }
          return `<a href="${safeUrl(a.url)}" target="_blank" style="display:inline-flex;align-items:center;gap:3px;color:var(--purple);font-size:10px;text-decoration:none;background:var(--purple-light);padding:2px 7px;border-radius:6px;border:1px solid #C4B5FD;margin-right:4px">📄 ${safeTxt(a.nome||'PDF')}</a>`
        }).join('')
      : '<span style="font-size:10px;color:var(--orange-dark)">Sem comprovante</span>'
    return `<tr>
      <td>${dataFmt(d.data_despesa)}</td>
      <td>${safeTxt(detFinCatNomePorId[d.categoria_id]||'Sem categoria')}</td>
      <td>${safeTxt(d.descricao||'—')}</td>
      <td style="text-align:right">${moeda(d.valor)}</td>
      <td>${compHtml}</td>
    </tr>`
  }).join('')
  const tbody=document.getElementById('detfin-rows')
  if(tbody) tbody.innerHTML = rows || '<tr><td colspan="5">Nenhum RDV aprovado no m&ecirc;s.</td></tr>'
}
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `node --test tests/meu-financeiro-detalhe.test.mjs`
Expected: 5 pass, 0 fail.

- [ ] **Step 5: Testar manualmente no navegador**

Abrir `index.html`, logar como um usuário com `podeGerenciarCreditos()` (ex: gestor), ir em Financeiro → Detalhes de um funcionário. Confirmar visualmente que: cards, tabela de RDV (com o novo dropdown de categoria filtrando as linhas), tabela de lançamentos PIX e os botões (adicionar PIX, excluir lançamento, marcar pago) continuam funcionando exatamente como antes.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/meu-financeiro-detalhe.test.mjs
git commit -m "Extrai carregarDetalheFinanceiro compartilhada com modo readonly e filtro de categoria"
```

---

### Task 3: Nav item + tela "Meu financeiro" para o funcionário

**Files:**
- Modify: `index.html` (sidebar de navegação por volta da linha 758–761, screens por volta da linha 1310, `showScreen` por volta da linha 1629, variáveis/funções da tela Financeiro por volta da linha 3691)
- Test: `tests/meu-financeiro-screen.test.mjs`

**Interfaces:**
- Consumes: `carregarDetalheFinanceiro(det, uid, mes, {readonly})` (Task 2), `mesAtual()`, `perfil.id` (variável global já populada no login), `showScreen(nome, navEl, skipLoader)`.
- Produces: nav item `#nav-meufinanceiro`, screen `#screen-meufinanceiro`, `let meuFinMesAtual`, `function meuFinNavMes(delta)`, `function mudarMeuFinMes()`, `async function carregarMeuFinanceiro()` registrada no mapa de loaders de `showScreen` sob a chave `'meufinanceiro'`.

- [ ] **Step 1: Escrever o teste (vai falhar até o Step 4)**

Criar `tests/meu-financeiro-screen.test.mjs`:

```javascript
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('nav item "Meu financeiro" existe e nao e restrito por papel', () => {
  const navBlock = html.match(/<div class="nav-item"[^>]*onclick="showScreen\('meufinanceiro',this\)"[^>]*id="nav-meufinanceiro"[^>]*>/)?.[0] || ''
  assert.ok(navBlock, 'nav item nao encontrado')
  assert.doesNotMatch(navBlock, /aprovador-only/)
  assert.doesNotMatch(navBlock, /style="display:none"/)
})

test('screen "Meu financeiro" existe com seletor de mes', () => {
  assert.match(html, /<div class="screen" id="screen-meufinanceiro">/)
  assert.match(html, /id="meufin-mes"[^>]+type="month"[^>]+onchange="mudarMeuFinMes\(\)"/)
})

test('carregarMeuFinanceiro usa o proprio usuario e modo readonly', () => {
  assert.match(html, /async function carregarMeuFinanceiro\(\)/)
  const fn = html.match(/async function carregarMeuFinanceiro\(\)[\s\S]*?\n\}/)?.[0] || ''
  assert.match(fn, /carregarDetalheFinanceiro\([^,]+,\s*perfil\.id,\s*meuFinMesAtual,\s*\{readonly:\s*true\}\)/)
})

test('showScreen registra o loader de meufinanceiro', () => {
  assert.match(html, /meufinanceiro:carregarMeuFinanceiro/)
})
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `node --test tests/meu-financeiro-screen.test.mjs`
Expected: FAIL — nada disso existe ainda.

- [ ] **Step 3: Adicionar o nav item**

No bloco da sidebar, logo após o `</div>` que fecha `id="nav-financeiro"` (por volta da linha 761) e antes de `<div class="nav-label aprovador-only" id="nav-label-admin"` (linha 762), inserir:

```html
      <div class="nav-item" onclick="showScreen('meufinanceiro',this)" id="nav-meufinanceiro">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Meu financeiro
      </div>
```

Sem classe `aprovador-only` nem `financeiro-vis` e sem `style="display:none"` — isso faz com que ele apareça pra qualquer papel que passe pelo fluxo geral de login (linha ~1574, que já mostra todo `nav-item` sem `aprovador-only`). Os papéis com telas restritas (`financeiro_viagens`, emissor de viagens, `financeiro` puro) escondem *todos* os nav-items e retornam cedo — esses continuam sem ver "Meu financeiro", o que é esperado pois já têm telas dedicadas.

- [ ] **Step 4: Adicionar a screen**

Logo após o `</div>` que fecha `id="screen-financeiro"` (por volta da linha 1310) e antes de `<div id="galeria-overlay"` (linha 1312), inserir:

```html
      <div class="screen" id="screen-meufinanceiro">
        <div class="page-title">Meu financeiro</div>
        <div class="page-sub" id="meufin-sub">Cr&eacute;dito PIX, gastos e saldo do m&ecirc;s</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
          <button class="btn" onclick="meuFinNavMes(-1)">‹</button>
          <span id="meufin-mes-label" style="font-size:13px;font-weight:700;min-width:130px;text-align:center"></span>
          <button class="btn" onclick="meuFinNavMes(1)">›</button>
          <input id="meufin-mes" type="month" class="form-input" style="min-height:34px;padding:5px 8px;font-size:12px;width:150px" onchange="mudarMeuFinMes()">
        </div>
        <div id="meufin-detalhe"><div class="loading">Carregando...</div></div>
      </div>
```

- [ ] **Step 5: Adicionar as funções JS**

Logo após `let finLinhasAtual = []` (por volta da linha 3693), inserir:

```javascript
let meuFinMesAtual = mesAtual()

function meuFinNavMes(delta){
  const [y,m] = meuFinMesAtual.split('-').map(Number)
  const d = new Date(y, m-1+delta, 1)
  meuFinMesAtual = d.toISOString().slice(0,7)
  carregarMeuFinanceiro()
}

function mudarMeuFinMes(){
  const input = document.getElementById('meufin-mes')
  if(input?.value) meuFinMesAtual = input.value
  carregarMeuFinanceiro()
}

async function carregarMeuFinanceiro(){
  const d = new Date(meuFinMesAtual+'-15')
  document.getElementById('meufin-mes-label').textContent = d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
  const input = document.getElementById('meufin-mes')
  if(input) input.value = meuFinMesAtual
  await carregarDetalheFinanceiro(document.getElementById('meufin-detalhe'), perfil.id, meuFinMesAtual, {readonly: true})
}
```

- [ ] **Step 6: Registrar o loader em `showScreen`**

Em `function showScreen(nome,navEl,skipLoader=false)` (por volta da linha 1629), no objeto `loaders`, adicionar `meufinanceiro:carregarMeuFinanceiro` (em qualquer posição da lista, ex: logo depois de `financeiro:carregarFinanceiro`):

```javascript
  const loaders={dashboard:carregarDashboard,agenda:carregarAgenda,viagens:carregarModuloViagens,agendaequipe:carregarAgendaEquipe,aprovar:carregarAprovacoes,insights:carregarInsights,categorias:carregarCategorias,lancar:prepararFormDespesa,lancarmultiplo:prepararFormMulti,skus:carregarSkus,equipe:carregarEquipe,funcionarios:carregarFuncionarios,avulsas:carregarAvulsas,semanal:carregarSemanal,financeiro:carregarFinanceiro,meufinanceiro:carregarMeuFinanceiro}
```

- [ ] **Step 7: Rodar o teste e verificar que passa**

Run: `node --test tests/meu-financeiro-screen.test.mjs`
Expected: 4 pass, 0 fail.

- [ ] **Step 8: Rodar a suíte completa**

Run: `node --test tests/`
Expected: todos os testes (incluindo os das Tasks 1 e 2 e os pré-existentes) passam.

- [ ] **Step 9: Testar manualmente no navegador**

Abrir `index.html`, logar como um funcionário comum (ex: um `gerente`/`coordenador` sem papel administrativo), clicar em "Meu financeiro" no menu. Confirmar: aparecem só os próprios dados, o seletor de mês navega corretamente, o dropdown de categoria filtra a tabela de RDV, e não aparece nenhum botão de adicionar/excluir/marcar pago. Repetir logado como `aprovador`/`gestor` pra confirmar que "Meu financeiro" também aparece pra eles mostrando os dados deles mesmos (não de outros).

- [ ] **Step 10: Commit**

```bash
git add index.html tests/meu-financeiro-screen.test.mjs
git commit -m "Adiciona tela Meu financeiro para o funcionario consultar seus proprios creditos e gastos"
```
