# Manu Bilhetes Emitidos Design

## Goal

Liberar para o perfil `financeiro_viagens` o acesso aos bilhetes ja emitidos no modulo Viagens, com consulta por mes.

## Scope

- O perfil `financeiro_viagens` continua vendo Financeiro e Viagens.
- Em Viagens, esse perfil passa a ver as abas `Aguardando bilhete` e `Emitidas`.
- A aba `Emitidas` filtra bilhetes pelo mes selecionado.
- O login operacional `viagens` continua vendo apenas `Aguardando bilhete`.

## Design

Adicionar um seletor `month` no cabecalho de Viagens e reutilizar o periodo selecionado nos contadores e listas que ja dependem de mes. Criar uma distincao entre o emissor operacional e o perfil combinado `financeiro_viagens`: ambos podem preencher bilhete, mas somente o perfil combinado ve bilhetes emitidos.

## Testing

Criar um teste estrutural com `node:test` que le o `index.html` e garante que:

- `financeiro_viagens` exibe a aba `Emitidas`.
- `financeiro_viagens` nao fica preso automaticamente na aba `Aguardando bilhete`.
- O modulo de viagens tem seletor de mes e handler de alteracao.
- O emissor operacional continua restrito a viagens aguardando bilhete.
