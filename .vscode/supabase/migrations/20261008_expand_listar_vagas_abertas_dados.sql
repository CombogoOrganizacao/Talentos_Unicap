-- A RPC listar_vagas_abertas agora devolve também dados usados no portal:
-- local, remuneração, período, contato e área.
-- Esta versão já foi aplicada no projeto Supabase conectado ao frontend.

create or replace function public.listar_vagas_abertas()
returns json
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(json_agg(json_build_object(
    'id', v.id,
    'titulo', v.titulo,
    'descricao', v.descricao,
    'modalidade', v.modalidade,
    'carga_horaria', v.carga_horaria,
    'local', v.local,
    'remuneracao', v.remuneracao,
    'periodo_inicio', v.periodo_inicio,
    'periodo_fim', v.periodo_fim,
    'contato', v.contato,
    'area', v.area,
    'data_criacao', v.data_criacao,
    'empresa', coalesce(pe.nome_fantasia, pe.razao_social, ''),
    'empresa_logo', coalesce(pe.foto_perfil_url, ''),
    'habilidades', (
      select coalesce(json_agg(vh.habilidade), '[]'::json)
      from public.vaga_habilidades vh
      where vh.vaga_id = v.id
    )
  ) order by v.data_criacao desc), '[]'::json)
  from public.vagas v
  left join public.perfis_empresa pe on pe.usuario_id = v.empresa_id
  where v.status = 'ABERTA'
    and auth.uid() is not null;
$function$;
