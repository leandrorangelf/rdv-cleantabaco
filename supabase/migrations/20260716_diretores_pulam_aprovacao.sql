-- Diretores (Dalton, Marcus, Bernardo) pulam a etapa de aprovacao: RDVs deles
-- nascem ja aprovadas, indo direto para o financeiro.
alter table profiles add column if not exists pula_aprovacao boolean not null default false;

update profiles set pula_aprovacao = true
where lower(email) in ('bernardo@new.com', 'dalton@latam.com', 'marcusthe@latam.com');
