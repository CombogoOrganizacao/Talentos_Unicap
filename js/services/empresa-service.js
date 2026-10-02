const APIEmpresa = {
  _erro(error, fallback) {
    console.error(fallback, error);
    return { error: error?.message || fallback, campos: null };
  },

  async getPerfil() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return { error: 'Usuário não autenticado' };

    const { data, error } = await supabaseClient
      .from('perfis_empresa')
      .select('*, usuarios(id,nome,tipo_conta)')
      .eq('usuario_id', session.user.id)
      .single();

    if (error) return this._erro(error, 'Erro ao carregar perfil da empresa');

    return {
      ...data,
      nome_empresa: data.nome_fantasia || data.razao_social || data.usuarios?.nome || 'Empresa',
      nome: data.nome_fantasia || data.razao_social || data.usuarios?.nome || 'Empresa'
    };
  },

  async uploadFotoPerfil(file) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return { error: 'Usuário não autenticado' };
    if (!file) return { error: 'Nenhum arquivo selecionado' };

    const caminho = `${session.user.id}/foto-perfil-${Date.now()}-${file.name}`;
    const { error: erroUpload } = await supabaseClient.storage
      .from('fotos-empresa')
      .upload(caminho, file, { upsert: true });

    if (erroUpload) return this._erro(erroUpload, 'Erro ao enviar foto de perfil');

    const { data: urlData } = supabaseClient.storage
      .from('fotos-empresa')
      .getPublicUrl(caminho);

    const { data, error } = await supabaseClient
      .from('perfis_empresa')
      .update({ foto_perfil_url: urlData.publicUrl, foto_perfil_key: caminho })
      .eq('usuario_id', session.user.id)
      .select()
      .single();

    if (error) return this._erro(error, 'Erro ao salvar foto de perfil');
    return data;
  },

  async buscarAlunos() {
    const { data, error } = await supabaseClient.rpc('obter_perfis_alunos_para_empresas');
    if (error) return this._erro(error, 'Erro ao buscar alunos');
    return Array.isArray(data) ? data : [];
  },

  vagas: {
    async criar(dto) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return { error: 'Usuário não autenticado' };

      const habilidades = dto.habilidadesRequisitadas || [];
      const payload = {
        empresa_id: session.user.id,
        titulo: dto.titulo,
        descricao: dto.descricao || null,
        modalidade: dto.modalidade || null,
        carga_horaria: dto.cargaHoraria ?? null,
        status: 'ABERTA'
      };

      const { data, error } = await supabaseClient
        .from('vagas').insert(payload).select().single();

      if (error) return APIEmpresa._erro(error, 'Erro ao publicar vaga');

      if (habilidades.length) {
        const { error: hError } = await supabaseClient
          .from('vaga_habilidades')
          .insert(habilidades.map(h => ({ vaga_id: data.id, habilidade: h })));
        if (hError) return APIEmpresa._erro(hError, 'Vaga criada, mas não foi possível salvar os requisitos');
      }

      return { ...data, habilidadesRequisitadas: habilidades };
    },

    async minhas() {
      const { data, error } = await supabaseClient
        .from('vagas')
        .select('*, vaga_habilidades(habilidade)')
        .order('data_criacao', { ascending: false });

      if (error) return APIEmpresa._erro(error, 'Erro ao listar vagas');

      return (data || []).map(v => ({
        ...v,
        criadoEm: v.data_criacao,
        carga: v.carga_horaria ? `${v.carga_horaria}h` : '',
        local: v.local || '',
        empresa: v.empresa || '',
        periodoFim: v.periodo_fim || null,
        habilidadesRequisitadas: (v.vaga_habilidades || []).map(x => x.habilidade)
      }));
    },

    async alunosCompativeis(vagaId) {
      const { data, error } = await supabaseClient
        .rpc('alunos_compativeis_com_vaga', { vaga_id: vagaId });
      if (error) return APIEmpresa._erro(error, 'Erro ao buscar alunos compatíveis');
      return data || [];
    },

    async encerrar(vagaId) {
      const { data, error } = await supabaseClient
        .from('vagas').update({ status: 'FECHADA' })
        .eq('id', vagaId).select().single();
      if (error) return APIEmpresa._erro(error, 'Erro ao encerrar vaga');
      return data;
    },

    async buscarPorId(vagaId) {
      const { data, error } = await supabaseClient
        .from('vagas').select('*, vaga_habilidades(habilidade)')
        .eq('id', vagaId).single();
      if (error) return APIEmpresa._erro(error, 'Erro ao carregar vaga');
      return data;
    }
  }
};
