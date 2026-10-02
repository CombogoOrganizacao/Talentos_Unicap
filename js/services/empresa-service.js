const APIEmpresa = {

  _erro(error, fallback) {
    console.error(fallback, error);
    return { error: error?.message || fallback, campos: null };
  },

  // ============================================
  // FOTO DE PERFIL DA EMPRESA
  // ============================================

  async uploadFotoPerfil(file) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const caminho = `${session.user.id}/foto-perfil-${Date.now()}`;

    const { error: erroUpload } = await supabaseClient.storage
      .from('fotos-empresa').upload(caminho, file, { upsert: true });
    if (erroUpload) return this._erro(erroUpload, 'Erro ao enviar foto de perfil');

    const { data: urlData } = supabaseClient.storage.from('fotos-empresa').getPublicUrl(caminho);

    const { data, error } = await supabaseClient
      .from('perfis_empresa')
      .update({ foto_perfil_url: urlData.publicUrl, foto_perfil_key: caminho })
      .eq('usuario_id', session.user.id)
      .select().single();

    if (error) return this._erro(error, 'Erro ao salvar foto de perfil');
    return data;
  },

  // ============================================
  // BUSCA DE TALENTOS
  // ============================================

  async buscarAlunos() {
    const { data, error } = await supabaseClient
      .from('perfis_aluno')
      .select('*, usuarios(id, nome)')
      .eq('disponivel_para_empresas', true);

    if (error) return this._erro(error, 'Erro ao buscar alunos');
    return data;
  },

  // ============================================
  // VAGAS
  // ============================================

  vagas: {
    async criar(dto) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data, error } = await supabaseClient
        .from('vagas').insert({ ...dto, empresa_id: session.user.id }).select().single();
      if (error) return APIEmpresa._erro(error, 'Erro ao publicar vaga');
      return data;
    },
    async minhas() {
      const { data, error } = await supabaseClient.from('vagas').select('*');
      if (error) return APIEmpresa._erro(error, 'Erro ao listar vagas');
      return data;
    },
    async alunosCompativeis(vagaId) {
      // Equivalente ao endpoint customizado do backend — vira uma function SQL.
      // Ver nota abaixo, essa precisa ser criada no banco ainda.
      const { data, error } = await supabaseClient.rpc('alunos_compativeis_com_vaga', { vaga_id: vagaId });
      if (error) return APIEmpresa._erro(error, 'Erro ao buscar alunos compatíveis');
      return data;
    },
    async encerrar(vagaId) {
      const { data, error } = await supabaseClient
        .from('vagas').update({ status: 'FECHADA' }).eq('id', vagaId).select().single();
      if (error) return APIEmpresa._erro(error, 'Erro ao encerrar vaga');
      return data;
    },
    async buscarPorId(vagaId) {
      const { data, error } = await supabaseClient.from('vagas').select('*').eq('id', vagaId).single();
      if (error) return APIEmpresa._erro(error, 'Erro ao carregar vaga');
      return data;
    }
  },

  // ============================================
  // MENSAGENS
  // ============================================

  mensagens: {
    async enviar({ destinatarioId, conteudo, vagaId }) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data, error } = await supabaseClient
        .from('mensagens')
        .insert({ remetente_id: session.user.id, destinatario_id: destinatarioId, conteudo, vaga_id: vagaId })
        .select().single();
      if (error) return APIEmpresa._erro(error, 'Erro ao enviar mensagem');
      return data;
    },
    async conversa(outroUsuarioId) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data, error } = await supabaseClient
        .from('mensagens')
        .select('*')
        .or(`and(remetente_id.eq.${session.user.id},destinatario_id.eq.${outroUsuarioId}),and(remetente_id.eq.${outroUsuarioId},destinatario_id.eq.${session.user.id})`)
        .order('data_envio');
      if (error) return APIEmpresa._erro(error, 'Erro ao carregar conversa');
      return data;
    },
    async todas() {
      const { data, error } = await supabaseClient.from('mensagens').select('*').order('data_envio', { ascending: false });
      if (error) return APIEmpresa._erro(error, 'Erro ao carregar mensagens');
      return data;
    }
  }
};