-- Já aplicada no Supabase. Guarda curso, período e endereço do aluno.
alter table public.perfis_aluno
  add column if not exists curso    text check (curso    is null or char_length(curso)    <= 150),
  add column if not exists periodo  text check (periodo  is null or char_length(periodo)  <= 20),
  add column if not exists endereco text check (endereco is null or char_length(endereco) <= 200);
