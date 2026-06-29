-- Adiciona campos para o print do voo escolhido na solicitação de viagem
ALTER TABLE demandas_viagem
  ADD COLUMN IF NOT EXISTS print_voo_url text,
  ADD COLUMN IF NOT EXISTS print_voo_nome text;
