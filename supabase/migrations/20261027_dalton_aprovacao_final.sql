-- RDVs do Dalton deixam de pular a aprovacao: vao direto para a aprovacao final
-- (Renan / Leandro, papel aprovador), sem passar pela 1a aprovacao do gestor.
alter table profiles add column if not exists aprovacao_final_direta boolean not null default false;

update profiles set pula_aprovacao = false, aprovacao_final_direta = true
where lower(email) = 'dalton@latam.com';
