-- =====================================================================
-- TalentoUNICAP — Experiências e Habilidades do currículo
-- Rode no Supabase: SQL Editor > New query > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) EXPERIÊNCIAS
-- ---------------------------------------------------------------------
create table if not exists public.experiencias (
  id          bigint generated always as identity primary key,
  usuario_id  uuid    not null references public.usuarios(id) on delete cascade,
  empresa     text    not null check (char_length(empresa) between 1 and 100),
  cargo       text    not null check (char_length(cargo)   between 1 and 100),
  descricao   text    check (descricao is null or char_length(descricao) <= 1000),
  data_inicio date    not null,
  data_fim    date,
  atual       boolean not null default false,
  constraint experiencias_atual_sem_fim check (not atual or data_fim is null),
  constraint experiencias_fim_obrigatorio check (atual or data_fim is not null),
  constraint experiencias_ordem_datas   check (data_fim is null or data_fim >= data_inicio)
);

create index if not exists experiencias_usuario_idx on public.experiencias(usuario_id);

alter table public.experiencias enable row level security;

create policy "dono ve experiencias"       on public.experiencias for select
  using ((select auth.uid()) = usuario_id);
create policy "dono insere experiencias"   on public.experiencias for insert
  with check ((select auth.uid()) = usuario_id);
create policy "dono atualiza experiencias" on public.experiencias for update
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy "dono exclui experiencias"   on public.experiencias for delete
  using ((select auth.uid()) = usuario_id);

-- ---------------------------------------------------------------------
-- 2) HABILIDADES (com categoria e nível)
--    A tabela antiga aluno_habilidades (só texto) é mantida intacta.
-- ---------------------------------------------------------------------
create table if not exists public.habilidades (
  id         bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome       text not null check (char_length(nome) between 1 and 50),
  categoria  text not null default 'Técnica'
             check (categoria in ('Técnica','Idioma','Soft Skill','Ferramenta')),
  nivel      text not null default 'Básico'
             check (nivel in ('Básico','Intermediário','Avançado','Expert'))
);

-- Não permite duplicar mesmo nome + categoria para o mesmo aluno
create unique index if not exists habilidades_unica_idx
  on public.habilidades (usuario_id, lower(nome), categoria);

alter table public.habilidades enable row level security;

create policy "dono ve habilidades"       on public.habilidades for select
  using ((select auth.uid()) = usuario_id);
create policy "dono insere habilidades"   on public.habilidades for insert
  with check ((select auth.uid()) = usuario_id);
create policy "dono atualiza habilidades" on public.habilidades for update
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);
create policy "dono exclui habilidades"   on public.habilidades for delete
  using ((select auth.uid()) = usuario_id);

-- ---------------------------------------------------------------------
-- 3) RPC obter_curriculo agora devolve experiencias e habilidades
-- ---------------------------------------------------------------------
create or replace function public.obter_curriculo()
returns json
language sql
set search_path to 'public'
as $$
  select json_build_object(
    'dadosPessoais', (select json_build_object('id', id, 'nome', nome) from usuarios where id = auth.uid()),
    'perfil',        (select row_to_json(p) from perfis_aluno p where p.usuario_id = auth.uid()),
    'experiencias',  (select coalesce(json_agg(e order by e.atual desc, e.data_inicio desc), '[]') from experiencias e where e.usuario_id = auth.uid()),
    'formacoes',     (select coalesce(json_agg(f), '[]')  from formacoes f     where f.usuario_id = auth.uid()),
    'habilidades',   (select coalesce(json_agg(h order by h.categoria, h.nome), '[]') from habilidades h where h.usuario_id = auth.uid()),
    'projetos',      (select coalesce(json_agg(pr), '[]') from projetos pr     where pr.usuario_id = auth.uid()),
    'certificacoes', (select coalesce(json_agg(c), '[]')  from certificacoes c where c.usuario_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- 4) (RECOMENDADO) Faltam políticas de SELECT nas tabelas abaixo.
--    Sem elas, o aluno salva Formação/Projeto/Certificação mas o item
--    nunca volta para a tela (a RLS filtra tudo).
-- ---------------------------------------------------------------------
create policy "dono ve formacoes"     on public.formacoes     for select
  using ((select auth.uid()) = usuario_id);
create policy "dono ve projetos"      on public.projetos      for select
  using ((select auth.uid()) = usuario_id);
create policy "dono ve certificacoes" on public.certificacoes for select
  using ((select auth.uid()) = usuario_id);

-- ---------------------------------------------------------------------
-- 5) Permissões de acesso para usuários logados (sem isso o Postgres
--    responde "permission denied for table", mesmo com RLS correta)
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.experiencias to authenticated;
grant select, insert, update, delete on public.habilidades  to authenticated;
