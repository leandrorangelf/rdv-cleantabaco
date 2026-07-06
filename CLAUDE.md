# RDV · Cleantabaco

App interno de RDV (relatório de despesas de viagem) para a Cleantabaco. SPA em português (pt-BR), sem build step: toda a UI, lógica e estilos vivem em um único `index.html` (~6k linhas). Backend é Supabase (Postgres + RLS + Edge Functions). Deploy é estático via Vercel.

## Estrutura

- `index.html` — app inteiro (HTML + CSS + JS vanilla). Sem framework, sem bundler.
- `supabase/migrations/` — histórico de migrações SQL (schema, policies de RLS, funções).
- `supabase/functions/admin-funcionarios/` — Edge Function (Deno) para operações admin sobre funcionários.
- `tests/*.test.mjs` — testes com o runner nativo do Node (`node --test`), sem framework externo. Os testes leem `index.html` como texto e fazem asserções via regex sobre trechos de código/markup (ver `tests/manu-bilhetes-emitidos.test.mjs` como exemplo).
- `docs/superpowers/plans/` e `docs/superpowers/specs/` — planos e specs de features, gerados pelo skill `superpowers` (um arquivo markdown por feature, nomeado `AAAA-MM-DD-nome-da-feature`).
- `vercel.json` — headers de segurança (CSP, X-Frame-Options etc.) para o deploy estático.

## Como rodar

- Não há `package.json` nem build. Para testar localmente, basta abrir `index.html` no navegador ou servir a pasta com qualquer servidor estático.
- Testes: `node --test tests/` (usa `node:test` e `node:assert/strict`, Node 24+).
- Supabase client é inicializado em `index.html` via `createClient(SUPABASE_URL, SUPABASE_ANON)` (linha ~1321), usando o SDK via CDN (`@supabase/supabase-js@2`).

## Domínio e papéis (roles)

Controle de acesso é por `perfil.papel`, checado direto no JS (não só via RLS). Papéis conhecidos: `aprovador`, `coordenador`, `emissor_viagens`, `financeiro`, `financeiro_viagens`, `gerente`, `gestor`, `viagens`. Ao adicionar/alterar permissões de uma tela, sempre conferir os dois lados: a condicional no `index.html` (o que a UI mostra/permite) e a policy correspondente em `supabase/migrations/` (o que o banco realmente permite via RLS). Um sem o outro é bug de segurança (UI esconde mas banco permite, ou UI mostra mas banco bloqueia silenciosamente).

## Convenções observadas no histórico

- Migrações novas são arquivos SQL datados (`AAAAMMDD_descricao.sql`) em `supabase/migrations/`, nunca editam migração antiga já commitada.
- Mudanças de feature costumam vir acompanhadas de: um plano em `docs/superpowers/plans/`, uma spec em `docs/superpowers/specs/`, o teste em `tests/`, e o diff em `index.html`/migração. Seguir esse padrão ao implementar algo novo.
- Commits em português, curtos, no imperativo/indicativo descrevendo o efeito (ex: "Libera financeiro viagens para creditos", "Mostra creditos de funcionarios inativos").
- CSP em `vercel.json` restringe scripts/estilos/conexões a domínios específicos (`cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, o projeto Supabase). Qualquer nova dependência externa (CDN, API) precisa ser adicionada ali também.

## Cuidado

- `index.html` é grande e monolítico — ao editar, usar `grep`/busca por âncoras (ex: nome de função, id de elemento) em vez de reescrever blocos inteiros, para manter o diff pequeno e revisável.
- Este é um sistema de RDV/financeiro real (créditos, verbas, aprovações) — bugs de lógica podem impactar dinheiro/reembolsos reais. Validar regras de aprovação e cálculo com cuidado extra.

---

# Diretrizes gerais de trabalho

1. **Pense antes de codar** — deixe suposições explícitas; se algo não estiver claro, pergunte em vez de decidir silenciosamente.
2. **Simplicidade primeiro** — sem features além do pedido, sem abstrações para código de uso único.
3. **Mudanças cirúrgicas** — edite só o necessário; não "melhore" código adjacente; siga o estilo existente do arquivo.
4. **Execução orientada a objetivo** — defina critério de sucesso verificável antes de implementar; para tarefas de múltiplos passos, monte um plano curto primeiro.
