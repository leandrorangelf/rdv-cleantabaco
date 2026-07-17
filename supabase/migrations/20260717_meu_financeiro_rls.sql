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
