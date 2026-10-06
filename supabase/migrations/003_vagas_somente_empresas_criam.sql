-- Já aplicada no Supabase.
-- Só EMPRESA cria vagas; aluno apenas visualiza as vagas abertas.

create or replace function public.eh_empresa()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios where id = auth.uid() and tipo_conta = 'EMPRESA');
$$;
revoke all on function public.eh_empresa() from public, anon;
grant execute on function public.eh_empresa() to authenticated;

drop policy if exists "empresa insere vagas" on public.vagas;
create policy "empresa insere vagas" on public.vagas for insert
  with check ((select auth.uid()) = empresa_id and public.eh_empresa());

create policy "empresa ve suas vagas" on public.vagas for select
  using ((select auth.uid()) = empresa_id);

create or replace function public.listar_vagas_abertas()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'id', v.id, 'titulo', v.titulo, 'descricao', v.descricao,
    'modalidade', v.modalidade, 'carga_horaria', v.carga_horaria,
    'data_criacao', v.data_criacao,
    'empresa', coalesce(pe.nome_fantasia, pe.razao_social, ''),
    'habilidades', (select coalesce(json_agg(vh.habilidade), '[]'::json)
                    from public.vaga_habilidades vh where vh.vaga_id = v.id)
  ) order by v.data_criacao desc), '[]'::json)
  from public.vagas v
  left join public.perfis_empresa pe on pe.usuario_id = v.empresa_id
  where v.status = 'ABERTA' and auth.uid() is not null;
$$;
revoke all on function public.listar_vagas_abertas() from public, anon;
grant execute on function public.listar_vagas_abertas() to authenticated;
