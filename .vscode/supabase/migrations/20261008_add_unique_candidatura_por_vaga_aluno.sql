-- Impede que o mesmo aluno se candidate duas vezes à mesma vaga.
-- Esta constraint também já foi aplicada no projeto Supabase de produção.
alter table public.candidaturas
  add constraint candidaturas_vaga_aluno_unique
  unique (vaga_id, aluno_id);
