# Meu financeiro (visão pessoal do funcionário)

## Contexto

Hoje o funcionário comum só vê, no Dashboard, os totais "Solicitado/Aprovado/Pendente/Rejeitado" das próprias despesas. Todo o resto do panorama financeiro dele — crédito PIX recebido, saldo transferido do mês anterior, valor a receber, status de pagamento — só existe na tela "Financeiro", visível apenas para `aprovador`/`gestor`/`financeiro`/`financeiro_viagens` via `podeGerenciarCreditos()`. Essa mesma restrição existe na RLS de `lancamentos_credito` e `pagamentos_rdv` (só esses papéis podem `select`), então nem dando acesso à UI o funcionário conseguiria ver esses dados hoje.

Cada funcionário deve poder consultar, de forma organizada e filtrável, apenas os próprios dados — nunca os de outra pessoa.

## O que o funcionário passa a ver

Novo item de menu **"Meu financeiro"** (`nav-item`, sem restrição de papel — todo mundo vê o próprio). Abre uma tela nova, somente leitura, sempre com `usuario_id = perfil.id`:

- Seletor de mês (`<input type=month>`, mesmo padrão da tela Financeiro).
- Cards de resumo: A receber, RDV aprovado, Crédito PIX lançado, Crédito usado, Saldo de crédito, e um badge de status (Pago / A pagar / Nada a pagar) vindo de `pagamentos_rdv`.
- Tabela **"Lançamentos de crédito PIX"**: data, valor, tipo (badge "PIX" ou "Saldo transferido"), observação — é o histórico que mostra tanto os PIX que a Manu lançou dentro do mês quanto o saldo que sobrou do mês anterior e foi carregado automaticamente.
- Tabela **"Discriminado de RDV"**: despesas aprovadas do mês, com comprovantes, com um **dropdown de categoria** para filtrar a lista.

Nenhum botão de ação (adicionar PIX, excluir lançamento, marcar pago) aparece nessa tela — é consulta.

## Refatoração para evitar duplicar lógica

A lógica de `abrirDetalheFuncionario` (hoje só usada no modal admin `modal-fin-detalhe`) é extraída para uma função compartilhada:

```
carregarDetalheFinanceiro(containerEl, uid, mes, { readonly })
```

- `abrirDetalheFuncionario` (modal do financeiro/gestor) passa a chamar essa função com `readonly:false`, mantendo formulário de adicionar PIX, botão excluir e botão marcar pago.
- A nova tela do funcionário chama a mesma função com `readonly:true`, escondendo esses controles.
- O dropdown de filtro por categoria fica dentro dessa função compartilhada — logo aparece nos dois lugares (modal admin e tela do funcionário) automaticamente.

Filtro de categoria: dropdown populado com as categorias presentes nas despesas daquele `(uid, mes)` + opção "Todas as categorias"; filtra a tabela client-side (mesmo padrão de `renderFinLista`/`finLinhasAtual` já usado na tela Financeiro).

## RLS (migração nova)

Duas policies novas, sem alterar as existentes:

```sql
create policy "lancamentos_credito_select_proprio" on lancamentos_credito for select
  using (usuario_id = auth.uid());

create policy "pagamentos_select_proprio" on pagamentos_rdv for select
  using (usuario_id = auth.uid());
```

Postgres combina múltiplas policies de `select` com `OR`, então isso soma à policy de papéis já existente sem enfraquecê-la — cada usuário só enxerga a própria linha, nunca a de terceiros.

## O que NÃO muda

- `transferir_saldos_credito` continua exigindo papel de `aprovador/gestor/financeiro/financeiro_viagens` — só o financeiro dispara o cálculo do saldo transferido ao abrir a tela dele. Se ninguém do financeiro tiver aberto a tela ainda no mês, o funcionário pode ver o saldo transferido do mês em atraso (janela pequena, aceita por decisão do usuário).
- Cálculo de `apagar`, `creditoUsado`, `saldoCredito` nos cards não muda — é o mesmo já usado no modal admin.
- Nenhuma outra tela do sistema é afetada pela extração da função compartilhada além do modal admin e da nova tela.

## Teste

Testes em `tests/` (regex sobre `index.html` e sobre a migração nova):
- Migração cria as duas policies novas (`usuario_id = auth.uid()`) em `lancamentos_credito` e `pagamentos_rdv`.
- `index.html` tem o nav item e a screen "Meu financeiro".
- `carregarDetalheFinanceiro` é chamada nos dois lugares (modal admin com `readonly:false`, tela do funcionário com `readonly:true`).
- O modal admin ainda tem os botões de ação (adicionar PIX / excluir / marcar pago) após a refatoração — não regride a funcionalidade existente.
