# Histórico de lançamentos de crédito PIX

## Contexto

A tela do financeiro guarda hoje um único valor de "Crédito PIX" por (funcionário, mês) na tabela `verbas`. Quando a financeira faz um segundo adiantamento na mesma semana, ela precisa sobrescrever esse campo com o novo total (não é incremental), e não sobra nenhum registro de quando/quanto foi cada PIX individual — inviabilizando prestar contas depois.

Isso também afeta a transferência automática de saldo entre meses (`transferir_saldos_credito`, migração `20260716_transferir_saldo_credito.sql`): hoje ela soma o saldo do mês anterior direto no campo único `verbas.valor`, misturando "saldo transferido" com "PIX manual" sem distinção.

## Modelo de dados

Nova tabela `lancamentos_credito`:

```sql
create table lancamentos_credito (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  mes           char(7) not null,
  data_pix      date not null,
  valor         numeric(10,2) not null check (valor > 0),
  tipo          text not null check (tipo in ('pix','saldo_transferido')),
  observacao    text,
  criado_por    uuid references auth.users(id),
  criado_em     timestamptz not null default now()
);
```

RLS: mesma policy de papéis já usada em `verbas` (`aprovador`,`gestor`,`financeiro`,`financeiro_viagens`) para select/insert/delete. Sem update (correção de lançamento errado é apagar e lançar de novo).

O total de crédito PIX do funcionário no mês passa a ser `sum(lancamentos_credito.valor)` para aquele `(usuario_id, mes)`, calculado na hora — não existe mais um campo único "verba" para editar.

## Migração dos dados existentes

Um `insert into lancamentos_credito select ... from verbas` na mesma migração, convertendo cada linha existente:
- `tipo = 'saldo_transferido'` se `verbas.saldo_transferido = true`, senão `'pix'`
- `data_pix = verbas.atualizado_em::date`
- `observacao = null`
- `criado_por = verbas.atualizado_por`, `criado_em = verbas.atualizado_em`

A tabela `verbas` não é apagada (fica no banco sem uso, como histórico/rollback), mas `index.html` para de ler e escrever nela.

## RPC de transferência de saldo

`transferir_saldos_credito(p_mes)` é reescrita para trabalhar sobre `lancamentos_credito`:

1. Para cada funcionário com algum lançamento em `mes_anterior`: calcula `saldo = max(0, sum(lancamentos_credito do mes anterior) - aprovado_no_mes_anterior)`.
2. Idempotência: só insere se **não existir já** um lançamento `tipo='saldo_transferido'` para aquele `(usuario_id, p_mes)`.
3. Se `saldo > 0`: insere um lançamento `tipo='saldo_transferido'`, `data_pix = primeiro dia de p_mes`, `observacao = 'Saldo transferido de ' || mes_anterior`.

Mesma checagem de papel (`aprovador`,`gestor`,`financeiro`,`financeiro_viagens`) que a versão atual, `security definer`.

## UI (`index.html`)

- `carregarFinanceiro()`: troca a query de `verbas` por `lancamentos_credito`, agrupando por `usuario_id` e somando `valor` para obter `verbVal` (resto da lógica de saldo/crédito usado/a pagar não muda).
- Célula "Crédito PIX" da tabela: mostra só o total somado (sem input inline). Um botão "Lançamentos" abre um modal (`abrirLancamentosCredito(userId, mes)`) com:
  - Lista dos lançamentos do mês daquele funcionário: data, valor, tipo (badge "PIX" ou "Saldo transferido"), observação, quem lançou, botão excluir.
  - Formulário para adicionar novo: data (default hoje), valor, observação opcional → insere `tipo='pix'`, `criado_por=perfil.id`.
- `salvarVerba`/`removerVerba` são removidos; substituídos por `adicionarLancamentoCredito(userId, mes)` e `removerLancamentoCredito(id)`, ambos recarregando `carregarFinanceiro()` ao final.

## O que NÃO muda

- Cálculo de `apagar`, `creditoUsado`, `saldoCredito` e os cards de resumo continuam iguais — só a origem do `verbVal` muda (soma de lançamentos em vez de campo único).
- Pagamentos (`pagamentos_rdv`) não são afetados.
- Nenhuma outra tela do sistema referencia `verbas` hoje (confirmado por grep), então não há mais nenhum outro ponto para atualizar.

## Teste

Testes em `tests/` (leitura de regex do `index.html` + leitura das migrações):
- `carregarFinanceiro` consulta `lancamentos_credito` (não mais `verbas`) e soma os valores por usuário.
- `transferir_saldos_credito` insere lançamento `tipo='saldo_transferido'` e checa existência prévia antes de inserir (idempotência).
- Migração cria a tabela `lancamentos_credito` com `check (valor > 0)` e migra dados de `verbas`.
