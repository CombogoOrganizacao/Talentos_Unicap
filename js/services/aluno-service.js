const API = {
  _erro(error, fallback) {
    console.error(fallback, error);
    return { error: error?.message || fallback, campos: null };
  },

  async _session() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Usuário não autenticado');
    return session;
  },

  async getPerfil() {
    try {
      const session = await this._session();
      const { data, error } = await supabaseClient
        .from('perfis_aluno')
        .select('*, usuarios(id,nome,tipo_conta), aluno_habilidades(habilidade)')
        .eq('usuario_id', session.user.id).single();
      if (error) return this._erro(error, 'Erro ao carregar perfil');
      return {
        ...data,
        nome: data.usuarios?.nome || '',
        habilidades: (data.aluno_habilidades || []).map(x => ({ nome: x.habilidade }))
      };
    } catch (e) { return this._erro(e, 'Erro ao carregar perfil'); }
  },

  async atualizarPerfil(dto) {
    try {
      const session = await this._session();
      const { data, error } = await supabaseClient
        .from('perfis_aluno').update(dto)
        .eq('usuario_id', session.user.id).select().single();
      if (error) return this._erro(error, 'Erro ao atualizar perfil');
      return data;
    } catch (e) { return this._erro(e, 'Erro ao atualizar perfil'); }
  },

  async criarPerfil(dto) { return this.atualizarPerfil(dto); },
  async salvarPerfil(dto) { return this.atualizarPerfil(dto); },

  async getCurriculo() {
    const { data, error } = await supabaseClient.rpc('obter_curriculo');
    if (error) return this._erro(error, 'Erro ao carregar currículo');
    return data;
  },

  async getPublicProfile(id) {
    const { data, error } = await supabaseClient.rpc('obter_perfil_publico', { p_usuario_id: id });
    if (error) return this._erro(error, 'Erro ao carregar perfil público');
    return data;
  },

  formacoes: {
    async listar() {
      const { data, error } = await supabaseClient.from('formacoes').select('*').order('id');
      if (error) return API._erro(error, 'Erro ao listar formações');
      return data || [];
    },
    async criar(dto) {
      const session = await API._session();
      const { data, error } = await supabaseClient.from('formacoes')
        .insert({ ...dto, usuario_id: session.user.id }).select().single();
      if (error) return API._erro(error, 'Erro ao criar formação');
      return data;
    },
    async atualizar(id, dto) {
      const { data, error } = await supabaseClient.from('formacoes')
        .update(dto).eq('id', id).select().single();
      if (error) return API._erro(error, 'Erro ao atualizar formação');
      return data;
    },
    async deletar(id) {
      const { error } = await supabaseClient.from('formacoes').delete().eq('id', id);
      if (error) return API._erro(error, 'Erro ao excluir formação');
      return { success: true };
    }
  },

  projetos: {
    async listar() {
      const { data, error } = await supabaseClient.from('projetos').select('*').order('id');
      if (error) return API._erro(error, 'Erro ao listar projetos');
      return data || [];
    },
    async criar(dto) {
      const session = await API._session();
      const { data, error } = await supabaseClient.from('projetos')
        .insert({ ...dto, usuario_id: session.user.id }).select().single();
      if (error) return API._erro(error, 'Erro ao criar projeto');
      return data;
    },
    async atualizar(id, dto) {
      const { data, error } = await supabaseClient.from('projetos')
        .update(dto).eq('id', id).select().single();
      if (error) return API._erro(error, 'Erro ao atualizar projeto');
      return data;
    },
    async deletar(id) {
      const { error } = await supabaseClient.from('projetos').delete().eq('id', id);
      if (error) return API._erro(error, 'Erro ao excluir projeto');
      return { success: true };
    }
  },

  certificacoes: {
    async listar() {
      const { data, error } = await supabaseClient.from('certificacoes').select('*').order('id');
      if (error) return API._erro(error, 'Erro ao listar certificações');
      return data || [];
    },
    async criar(dto) {
      const session = await API._session();
      const { data, error } = await supabaseClient.from('certificacoes')
        .insert({ ...dto, usuario_id: session.user.id }).select().single();
      if (error) return API._erro(error, 'Erro ao criar certificação');
      return data;
    },
    async atualizar(id, dto) {
      const { data, error } = await supabaseClient.from('certificacoes')
        .update(dto).eq('id', id).select().single();
      if (error) return API._erro(error, 'Erro ao atualizar certificação');
      return data;
    },
    async deletar(id) {
      const { error } = await supabaseClient.from('certificacoes').delete().eq('id', id);
      if (error) return API._erro(error, 'Erro ao excluir certificação');
      return { success: true };
    }
  },

  comprovantes: {
    async listar() {
      const { data, error } = await supabaseClient.from('comprovantes').select('*').order('id');
      if (error) return API._erro(error, 'Erro ao listar comprovantes');
      return data || [];
    },
    async salvarLink(url) {
      const session = await API._session();
      const { data, error } = await supabaseClient.from('comprovantes')
        .insert({ usuario_id: session.user.id, tipo: 'LINK', url }).select().single();
      if (error) return API._erro(error, 'Erro ao salvar link do comprovante');
      return data;
    },
    async salvarArquivo(file) {
      const session = await API._session();
      const caminho = `${session.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('Comprovantes').upload(caminho, file);
      if (uploadError) return API._erro(uploadError, 'Erro ao enviar comprovante');

      const { data, error } = await supabaseClient.from('comprovantes')
        .insert({
          usuario_id: session.user.id,
          tipo: 'ARQUIVO',
          url: caminho,
          storage_key: caminho
        }).select().single();
      if (error) return API._erro(error, 'Erro ao salvar comprovante');
      return data;
    }
  }
};
