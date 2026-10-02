const API = {

  _erro(error, fallback) {
    console.error(fallback, error);
    return { error: error?.message || fallback, campos: null };
  },

  // ============================================
  // PERFIL DO ALUNO
  // ============================================

  async getPerfil() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const { data, error } = await supabaseClient
      .from('perfis_aluno')
      .select('*, aluno_habilidades(habilidade)')
      .eq('usuario_id', session.user.id)
      .single();

    if (error) return this._erro(error, 'Erro ao carregar perfil');
    return data;
  },

  async atualizarPerfil(dto) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const { data, error } = await supabaseClient
      .from('perfis_aluno')
      .update(dto)
      .eq('usuario_id', session.user.id)
      .select()
      .single();

    if (error) return this._erro(error, 'Erro ao atualizar perfil');
    return data;
  },

  // Como o trigger do banco já cria o perfis_aluno vazio no cadastro,
  // "criar" e "salvar" viram sempre um update — não precisa mais do
  // fallback 404 → criar que o front tinha antes.
  async criarPerfil(dto) { return this.atualizarPerfil(dto); },
  async salvarPerfil(dto) { return this.atualizarPerfil(dto); },

  // ============================================
  // CURRÍCULO COMPLETO
  // ============================================

  async getCurriculo() {
    const { data, error } = await supabaseClient.rpc('obter_curriculo');
    if (error) return this._erro(error, 'Erro ao carregar currículo');
    return data;
  },

  // ============================================
  // FORMAÇÕES
  // ============================================

  formacoes: {
    async listar() {
      const { data, error } = await supabaseClient.from('formacoes').select('*');
      if (error) return API._erro(error, 'Erro ao listar formações');
      return data;
    },
    async criar(dto) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data, error } = await supabaseClient
        .from('formacoes').insert({ ...dto, usuario_id: session.user.id }).select().single();
      if (error) return API._erro(error, 'Erro ao criar formação');
      return data;
    },
    async atualizar(id, dto) {
      const { data, error } = await supabaseClient
        .from('formacoes').update(dto).eq('id', id).select().single();
      if (error) return API._erro(error, 'Erro ao atualizar formação');
      return data;
    },
    async deletar(id) {
      const { error } = await supabaseClient.from('formacoes').delete().eq('id', id);
      if (error) return API._erro(error, 'Erro ao excluir formação');
      return { success: true };
    }
  },

  // ============================================
  // PROJETOS
  // ============================================

  projetos: {
    async listar() {
      const { data, error } = await supabaseClient.from('projetos').select('*');
      if (error) return API._erro(error, 'Erro ao listar projetos');
      return data;
    },
    async criar(dto) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data, error } = await supabaseClient
        .from('projetos').insert({ ...dto, usuario_id: session.user.id }).select().single();
      if (error) return API._erro(error, 'Erro ao criar projeto');
      return data;
    },
    async atualizar(id, dto) {
      const { data, error } = await supabaseClient
        .from('projetos').update(dto).eq('id', id).select().single();
      if (error) return API._erro(error, 'Erro ao atualizar projeto');
      return data;
    },
    async deletar(id) {
      const { error } = await supabaseClient.from('projetos').delete().eq('id', id);
      if (error) return API._erro(error, 'Erro ao excluir projeto');
      return { success: true };
    }
  },

  // ============================================
  // CERTIFICAÇÕES
  // ============================================

  certificacoes: {
    async listar() {
      const { data, error } = await supabaseClient.from('certificacoes').select('*');
      if (error) return API._erro(error, 'Erro ao listar certificações');
      return data;
    },
    async criar(dto) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data, error } = await supabaseClient
        .from('certificacoes').insert({ ...dto, usuario_id: session.user.id }).select().single();
      if (error) return API._erro(error, 'Erro ao criar certificação');
      return data;
    },
    async atualizar(id, dto) {
      const { data, error } = await supabaseClient
        .from('certificacoes').update(dto).eq('id', id).select().single();
      if (error) return API._erro(error, 'Erro ao atualizar certificação');
      return data;
    },
    async deletar(id) {
      const { error } = await supabaseClient.from('certificacoes').delete().eq('id', id);
      if (error) return API._erro(error, 'Erro ao excluir certificação');
      return { success: true };
    }
  },

  // ============================================
  // COMPROVANTES (usa Supabase Storage em vez do R2)
  // ============================================

  comprovantes: {
    async listar() {
      const { data, error } = await supabaseClient.from('comprovantes').select('*');
      if (error) return API._erro(error, 'Erro ao listar comprovantes');
      return data;
    },
    async salvarLink(url) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data, error } = await supabaseClient
        .from('comprovantes')
        .insert({ usuario_id: session.user.id, tipo: 'LINK', url })
        .select().single();
      if (error) return API._erro(error, 'Erro ao salvar link do comprovante');
      return data;
    },
    async salvarArquivo(file) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const caminho = `${session.user.id}/${Date.now()}-${file.name}`;

      const { error: erroUpload } = await supabaseClient.storage
        .from('comprovantes').upload(caminho, file);
      if (erroUpload) return API._erro(erroUpload, 'Erro ao enviar comprovante');

      const { data: urlData } = supabaseClient.storage.from('comprovantes').getPublicUrl(caminho);

      const { data, error } = await supabaseClient
        .from('comprovantes')
        .insert({ usuario_id: session.user.id, tipo: 'ARQUIVO', url: urlData.publicUrl, storage_key: caminho })
        .select().single();
      if (error) return API._erro(error, 'Erro ao salvar comprovante');
      return data;
    }
  }
};