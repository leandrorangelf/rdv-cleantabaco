# Cards de crédito no Meu financeiro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que funcionários vejam explicitamente o crédito usado e o saldo de crédito no detalhe pessoal.

**Architecture:** Reutilizar `carregarDetalheFinanceiro` para os modos administrativo e somente leitura, dando IDs estáveis aos dois cards e cobrindo a presença deles no modo pessoal. O cálculo continua sendo `min(aprovado, crédito)` e `max(0, crédito - aprovado)`.

**Tech Stack:** HTML/JavaScript vanilla, Supabase, Node `node:test`.

## Global Constraints

- Não adicionar dependências ou reestruturar o `index.html` monolítico.
- Preservar as ações do modal administrativo.
- Alterar migração somente se a verificação encontrar policy ausente.

---

### Task 1: Regressão visual/estrutural

**Files:**
- Modify: `tests/meu-financeiro-detalhe.test.mjs`
- Test: `tests/meu-financeiro-detalhe.test.mjs`

- [ ] **Step 1: Escrever o teste que exige os IDs dos cards no detalhe readonly**

Adicionar um teste que localize o corpo de `carregarDetalheFinanceiro` e exija `id="detfin-credito-usado"` e `id="detfin-saldo-credito"`.

- [ ] **Step 2: Executar o teste e confirmar falha**

Run: `node tests\\meu-financeiro-detalhe.test.mjs`
Expected: FAIL porque os cards atuais não têm IDs estáveis.

### Task 2: Renderização dos cards

**Files:**
- Modify: `index.html:4067-4073`

- [ ] **Step 1: Adicionar os IDs sem alterar o cálculo**

Adicionar `id="detfin-credito-usado"` ao card “Crédito usado” e `id="detfin-saldo-credito"` ao card “Saldo crédito”, mantendo `moeda(creditoUsado)` e `moeda(saldoCredito)`.

- [ ] **Step 2: Executar o teste de regressão**

Run: `node tests\\meu-financeiro-detalhe.test.mjs`
Expected: PASS.

### Task 3: Verificação final

**Files:**
- Test: `tests/meu-financeiro-detalhe.test.mjs`, `tests/meu-financeiro-rls.test.mjs`, `tests/transferir-saldo-credito.test.mjs`

- [ ] **Step 1: Rodar os testes financeiros relacionados**

Run: `node --test tests/meu-financeiro-detalhe.test.mjs tests/meu-financeiro-rls.test.mjs tests/transferir-saldo-credito.test.mjs`
Expected: todos passam sem falhas.

- [ ] **Step 2: Conferir diff e status**

Run: `git diff --check` e `git status --short`
Expected: nenhum erro de whitespace; somente os arquivos desta correção alterados.
