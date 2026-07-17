-- Campo empresa/filial do funcionário, exibido como prefixo do nome nas telas de Financeiro e Funcionários.
alter table profiles add column if not exists empresa text;
