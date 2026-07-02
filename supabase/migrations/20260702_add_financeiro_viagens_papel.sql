-- Adiciona papel combinado 'financeiro_viagens' (financeiro + emissão de bilhetes) à constraint da tabela profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_papel_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_papel_check
  CHECK (papel IN ('aprovador', 'gestor', 'coordenador', 'gerente', 'viagens', 'emissor_viagens', 'financeiro', 'promotor', 'financeiro_viagens'));
