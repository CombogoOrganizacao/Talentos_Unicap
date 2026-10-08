window.APIEmpresa = {

  _erro(error, fallback) {
    console.error(fallback, error);
    return { error: error?.message || fallback, campos: null };
  },

  async getPerfil() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
      return { error: 'Usuário não autenticado' };
    }

    const { data, error } = await window.supabaseClient
      .from('perfis_empresa')
      .select('*, usuarios(id,nome,tipo_conta)')
      .eq('usuario_id', session.user.id)
      .single();

    if (error) {
      return this._erro(error, 'Erro ao carregar perfil da empresa');
    }

    return {
      ...data,
      nome_empresa: data.nome_fantasia || data.razao_social || data.usuarios?.nome || 'Empresa',
      nome: data.nome_fantasia || data.razao_social || data.usuarios?.nome || 'Empresa'
    };
  },

  async uploadFotoPerfil(file) {
    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
      return { error: 'Usuário não autenticado' };
    }

    if (!file) {
      return { error: 'Nenhum arquivo selecionado' };
    }

    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      return { error: 'Envie uma imagem PNG, JPG ou WEBP.' };
    }

    if (file.size > 2 * 1024 * 1024) {
      return { error: 'A imagem deve ter no máximo 2 MB.' };
    }

    const nomeSeguro = String(file.name || 'logo')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const caminho = `${session.user.id}/foto-perfil-${Date.now()}-${nomeSeguro}`;

    const { error: erroUpload } = await window.supabaseClient.storage
      .from('fotos-empresa')
      .upload(caminho, file, { upsert: true });

    if (erroUpload) {
      return this._erro(erroUpload, 'Erro ao enviar foto de perfil');
    }

    const { data: urlData } = window.supabaseClient.storage
      .from('fotos-empresa')
      .getPublicUrl(caminho);

    const { data, error } = await window.supabaseClient
      .from('perfis_empresa')
      .update({
        foto_perfil_url: urlData.publicUrl,
        foto_perfil_key: caminho
      })
      .eq('usuario_id', session.user.id)
      .select()
      .single();

    if (error) {
      return this._erro(error, 'Erro ao salvar foto de perfil');
    }

    return data;
  },

  async buscarAlunos() {
    const { data, error } = await window.supabaseClient
      .rpc('obter_perfis_alunos_para_empresas');

    if (error) {
      return this._erro(error, 'Erro ao buscar alunos');
    }

    return Array.isArray(data) ? data : [];
  },

  vagas: {

    async criar(dto) {
      const { data: { session } } =
        await window.supabaseClient.auth.getSession();

      if (!session) {
        return { error: 'Usuário não autenticado' };
      }

      const habilidades = dto.habilidadesRequisitadas || [];

      const payload = {
        empresa_id: session.user.id,
        titulo: dto.titulo,
        descricao: dto.descricao || null,
        modalidade: dto.modalidade || null,
        carga_horaria: dto.cargaHoraria ?? null,
        local: dto.local || null,
        remuneracao: dto.remuneracao || null,
        periodo_inicio: dto.periodoInicio || null,
        periodo_fim: dto.periodoFim || null,
        contato: dto.contato || null,
        area: dto.area || null,
        status: 'ABERTA'
      };

      const { data, error } = await window.supabaseClient
        .from('vagas')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return APIEmpresa._erro(error, 'Erro ao publicar vaga');
      }

      if (habilidades.length) {
        const { error: hError } = await window.supabaseClient
          .from('vaga_habilidades')
          .insert(
            habilidades.map(h => ({
              vaga_id: data.id,
              habilidade: h
            }))
          );

        if (hError) {
          return APIEmpresa._erro(
            hError,
            'Vaga criada, mas não foi possível salvar os requisitos'
          );
        }
      }

      return {
        ...data,
        habilidadesRequisitadas: habilidades
      };
    },

    _modalidade(m) {
      return {
        PRESENCIAL: 'Presencial',
        REMOTO: 'Remoto',
        HIBRIDO: 'Híbrido'
      }[m] || '';
    },

    async minhas() {
      const { data: { session } } =
        await window.supabaseClient.auth.getSession();

      if (!session) {
        return APIEmpresa._erro(null, 'Usuário não autenticado');
      }

      const { data, error } = await window.supabaseClient
        .from('vagas')
        .select('*, vaga_habilidades(habilidade)')
        .eq('empresa_id', session.user.id)
        .order('data_criacao', { ascending: false });

      if (error) {
        return APIEmpresa._erro(error, 'Erro ao listar vagas');
      }

      const perfil = await APIEmpresa.getPerfil();

      const nomeEmpresa =
        perfil && !perfil.error
          ? perfil.nome_empresa
          : '';

      const logoEmpresa =
        perfil && !perfil.error
          ? (perfil.foto_perfil_url || '')
          : '';

      return (data || []).map(v => ({
        ...v,
        status: {
          ABERTA: 'Ativa',
          PAUSADA: 'Pausada'
        }[v.status] || 'Encerrada',

        criadoEm: v.data_criacao,

        carga: v.carga_horaria
          ? `${v.carga_horaria}h`
          : '',

        local: v.local || this._modalidade(v.modalidade),

        empresa: v.empresa || nomeEmpresa,

        empresaLogo: logoEmpresa,

        periodoFim: v.periodo_fim || null,

        habilidadesRequisitadas:
          (v.vaga_habilidades || [])
            .map(x => x.habilidade)
      }));
    },

    async abertas() {
      const { data, error } =
        await window.supabaseClient.rpc('listar_vagas_abertas');

      if (error) {
        return APIEmpresa._erro(error, 'Erro ao carregar vagas');
      }

      return (Array.isArray(data) ? data : []).map(v => ({
        id: v.id,

        titulo: v.titulo,

        descricao: v.descricao || '',

        empresa: v.empresa || '',

        empresaLogo: v.empresa_logo || '',

        status: 'Ativa',

        criadoEm: v.data_criacao,

        carga: v.carga_horaria
          ? `${v.carga_horaria}h`
          : '',

        local: v.local || this._modalidade(v.modalidade),

        remuneracao: v.remuneracao || '',

        periodoFim: v.periodo_fim || null,

        area: v.area || '',

        habilidadesRequisitadas: v.habilidades || []
      }));
    },

    async alunosCompativeis(vagaId) {
      const { data, error } = await window.supabaseClient
        .rpc('alunos_compativeis_com_vaga', {
          vaga_id: vagaId
        });

      if (error) {
        return APIEmpresa._erro(
          error,
          'Erro ao buscar alunos compatíveis'
        );
      }

      return data || [];
    },

    async encerrar(vagaId) {
      const { data, error } = await window.supabaseClient
        .from('vagas')
        .update({ status: 'FECHADA' })
        .eq('id', vagaId)
        .select()
        .single();

      if (error) {
        return APIEmpresa._erro(error, 'Erro ao encerrar vaga');
      }

      return data;
    },

    async pausar(vagaId, pausar) {
      const { data, error } = await window.supabaseClient
        .from('vagas')
        .update({
          status: pausar ? 'PAUSADA' : 'ABERTA'
        })
        .eq('id', vagaId)
        .select()
        .single();

      if (error) {
        return APIEmpresa._erro(
          error,
          'Erro ao atualizar vaga'
        );
      }

      return data;
    },

    async excluir(vagaId) {
      const { error: hError } = await window.supabaseClient
        .from('vaga_habilidades')
        .delete()
        .eq('vaga_id', vagaId);

      if (hError) {
        return APIEmpresa._erro(
          hError,
          'Erro ao excluir requisitos da vaga'
        );
      }

      const { error } = await window.supabaseClient
        .from('vagas')
        .delete()
        .eq('id', vagaId);

      if (error) {
        return APIEmpresa._erro(
          error,
          'Erro ao excluir vaga'
        );
      }

      return { ok: true };
    },

    async buscarPorId(vagaId) {
      const { data, error } = await window.supabaseClient
        .from('vagas')
        .select('*, vaga_habilidades(habilidade)')
        .eq('id', vagaId)
        .single();

      if (error) {
        return APIEmpresa._erro(
          error,
          'Erro ao carregar vaga'
        );
      }

      return data;
    }
  }
};

const APIEmpresa = window.APIEmpresa;