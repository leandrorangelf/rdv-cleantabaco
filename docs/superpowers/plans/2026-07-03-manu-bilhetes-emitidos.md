# Manu Bilhetes Emitidos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Liberar bilhetes emitidos por mes para o perfil `financeiro_viagens`.

**Architecture:** O app e um HTML estatico com JavaScript inline. A mudanca fica em `index.html`, separando emissor operacional de `financeiro_viagens` e adicionando estado de mes para Viagens.

**Tech Stack:** HTML, JavaScript inline, Supabase client, Node built-in test runner for structural regression tests.

## Global Constraints

- Nao liberar a aba `Emitidas` para o login operacional `viagens`.
- Nao mudar as permissoes de gestor, financeiro puro ou coordenador.
- Manter a consulta por mes baseada em `data_ida || data_inicio`.

---

### Task 1: Regression Test

**Files:**
- Create: `tests/manu-bilhetes-emitidos.test.mjs`
- Read: `index.html`

**Interfaces:**
- Consumes: current `index.html`
- Produces: structural assertions for the later HTML/JS patch

- [ ] **Step 1: Write the failing test**

Create `tests/manu-bilhetes-emitidos.test.mjs` with assertions that check the new `financeiro_viagens` behavior and the month selector.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/manu-bilhetes-emitidos.test.mjs`

Expected: FAIL because the current HTML does not expose `tab-viagens-emitidas` for `financeiro_viagens` and does not have `viagens-mes`.

### Task 2: HTML and Permission Patch

**Files:**
- Modify: `index.html`
- Test: `tests/manu-bilhetes-emitidos.test.mjs`

**Interfaces:**
- Consumes: `perfil.papel`, `viagensTabAtual`, `viagensCache`
- Produces: `isFinanceiroViagens()`, `isEmissorOperacionalViagens()`, `viagensMesSelecionado()`, `mudarViagensMes()`

- [ ] **Step 1: Add the month input**

Add `<input id="viagens-mes" type="month" ... onchange="mudarViagensMes()">` to the Viagens header.

- [ ] **Step 2: Split permissions**

Add helper functions so `financeiro_viagens` can still emit bilhetes while only the operational emissor is forced to `bilhete`.

- [ ] **Step 3: Filter emitted tickets by selected month**

Use the selected month in `renderViagensResumo`, `renderViagensConteudo`, and `renderViagensPorPessoa`.

- [ ] **Step 4: Run verification**

Run: `node --test tests/manu-bilhetes-emitidos.test.mjs`

Expected: PASS.
