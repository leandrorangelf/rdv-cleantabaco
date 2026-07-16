# Diretores pulam etapa de aprovação

## Contexto

RDVs de Dalton, Marcus e Bernardo (diretores) hoje seguem o fluxo normal de aprovação (`pendente` → `aguardando_aprovacao_2`/`aprovado`). Como são diretores, não faz sentido alguém aprovar as despesas deles: a RDV deve nascer já `aprovado` e ir direto para o financeiro processar, sem passar pela fila de aprovação de ninguém.

Mesmo assim, essas RDVs continuam precisando aparecer normalmente para:
- gestão (`isGestor()`: papel `aprovador` ou o Leandro)
- Leandro
- financeiro (papel `financeiro`)

## Identificação dos diretores

Nova coluna `profiles.pula_aprovacao boolean not null default false`.

Migração SQL marca os 3 perfis de Dalton, Marcus e Bernardo com `pula_aprovacao = true`. Qualquer diretor futuro é adicionado atualizando essa coluna (via tela de admin de funcionários, se existir, ou SQL direto) — sem precisar mexer em código.

## Mudança de comportamento

Em todo ponto do `index.html` onde uma despesa é criada ou editada, o status gravado passa a depender de `pula_aprovacao` do **dono** da despesa (o `usuario_id`, não necessariamente quem está logado):

1. **Criação de despesa própria** (`salvarDespesa`, ~L2858-2862): se `perfil.pula_aprovacao`, grava `status:'aprovado'` em vez de `'pendente'`.
2. **Edição de despesa própria** (`salvarDespesa`, ~L2845-2851): hoje sempre reseta para `status:'pendente'` ao salvar edição. Se `perfil.pula_aprovacao`, grava `status:'aprovado'` em vez de voltar para `'pendente'` — a RDV do diretor nunca entra na fila de aprovação, nem depois de editada.
3. **Lançamento em lote por terceiros** (multi-lançamento, ~L4477, usado por coordenador/viagens lançando despesas em nome de outra pessoa): se `perfilLancamento.pula_aprovacao` (perfil do dono da despesa, não de quem está lançando), mesma regra: `status:'aprovado'` direto.

Em todos os casos onde a despesa nasce/permanece `aprovado` por essa regra:
- `aprovado_por` fica `null` (não houve aprovador humano)
- `aprovado_em` recebe o timestamp da criação/edição

## O que NÃO muda

- Nenhuma tela de listagem, dashboard, histórico ou relatório precisa de alteração. Todas as telas que já exibem despesas com `status='aprovado'` (financeiro, dashboards de gestão, histórico) continuam mostrando essas RDVs normalmente, pois o filtro é sempre por status, não por quem criou.
- As únicas telas afetadas são as filas de aprovação pendente (`isGestor1()`/`isGestor()`, que filtram por `status IN ('pendente','aguardando_aprovacao_2')`) — essas RDVs simplesmente nunca aparecem ali, que é o comportamento desejado.
- RLS: não há policy de `despesas` que restrinja o valor de `status` no insert (a única restrição é a check constraint do enum `pendente/aguardando_aprovacao_2/aprovado/rejeitado`), então nenhuma mudança de policy é necessária.
- Fluxo de `demandas_viagem` (solicitação de viagem) não é tocado — o pedido é especificamente sobre RDVs (despesas).

## Teste

Teste em `tests/` cobrindo, via leitura de regex do `index.html`:
- `salvarDespesa` grava `status:'aprovado'` quando `perfil.pula_aprovacao` é true, tanto na criação quanto na edição.
- Lançamento em lote grava `status:'aprovado'` quando `perfilLancamento.pula_aprovacao` é true.
