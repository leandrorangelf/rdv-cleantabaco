-- Adiciona data_fim para lançamentos por período (ex: semana de combustível)
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS data_fim date;
