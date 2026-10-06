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
    try {
      const { data, error } = await supabaseClient.rpc('obter_curriculo');

      if (error) {
        return this._erro(error, 'Erro ao carregar currículo');
      }

      if (!data || typeof data !== 'object') {
        return {
          error: 'Currículo não encontrado.'
        };
      }

      /*
       * A RPC obter_curriculo() retorna:
       *
       * {
       *   dadosPessoais: {...},
       *   perfil: {...},
       *   formacoes: [...],
       *   projetos: [...],
       *   certificacoes: [...]
       * }
       *
       * O dashboard/export-service trabalham com os campos
       * diretamente em profile. Por isso normalizamos aqui.
       */

      const dadosPessoais = data.dadosPessoais || {};
      const perfil = data.perfil || {};

      return {
        // ==========================
        // DADOS PESSOAIS
        // ==========================
        id: dadosPessoais.id || perfil.usuario_id || '',
        nome: dadosPessoais.nome || '',

        // ==========================
        // PERFIL DO ALUNO
        // ==========================
        telefone: perfil.telefone || '',
        curso: perfil.curso || '',
        periodo: perfil.periodo || '',
        endereco: perfil.endereco || '',
        cidade: perfil.cidade || '',
        estado: perfil.estado || '',
        sobre: perfil.sobre || '',
        bio: perfil.sobre || '',

        linkedin: perfil.linkedin || '',
        github: perfil.github || '',
        portfolio: perfil.portfolio || '',

        // ==========================
        // DISPONIBILIDADE
        // ==========================
        disponivelEstagio: !!perfil.disponivel_estagio,
        visivelParaEmpresas: !!perfil.disponivel_para_empresas,

        // Mantém também os nomes originais do banco
        disponivel_estagio: !!perfil.disponivel_estagio,
        disponivel_para_empresas: !!perfil.disponivel_para_empresas,

        // ==========================
        // SEÇÕES DO CURRÍCULO
        // ==========================
        formacoes: Array.isArray(data.formacoes)
          ? data.formacoes
          : [],

        projetos: Array.isArray(data.projetos)
          ? data.projetos
          : [],

        certificacoes: Array.isArray(data.certificacoes)
          ? data.certificacoes
          : [],

        // A RPC atual não possui essas seções
        // no retorno, então garantimos arrays vazios.
        experiencias: Array.isArray(data.experiencias)
          ? data.experiencias
          : [],

        habilidades: Array.isArray(data.habilidades)
          ? data.habilidades
          : [],

        // Guarda o retorno original caso alguma parte
        // precise ser utilizada posteriormente.
        _raw: data
      };

    } catch (e) {
      return this._erro(e, 'Erro ao carregar currículo');
    }
  },

  async getPublicProfile(id) {
    const { data, error } = await supabaseClient.rpc('obter_perfil_publico', { p_usuario_id: id });
    if (error) return this._erro(error, 'Erro ao carregar perfil público');
    return data;
  },

  // ------------------------------------------------------------------
  // Experiências profissionais
  // ------------------------------------------------------------------
  experiencias: {
    // Colunas do tipo date não aceitam '' -> converte para null
    _dto(dto) {
      const atual = dto.atual === true || dto.atual === 'true';
      return {
        empresa: (dto.empresa || '').trim(),
        cargo: (dto.cargo || '').trim(),
        descricao: (dto.descricao || '').trim() || null,
        data_inicio: dto.data_inicio || null,
        data_fim: atual ? null : (dto.data_fim || null),
        atual
      };
    },
    _msg(error, fallback) {
      const m = error?.message || '';
      if (m.includes('experiencias_ordem_datas')) return 'A data de término não pode ser anterior à data de início.';
      if (m.includes('experiencias_fim_obrigatorio')) return 'Informe a data de término ou marque "trabalho atual".';
      return fallback;
    },
    async listar() {
      const { data, error } = await supabaseClient.from('experiencias').select('*')
        .order('atual', { ascending: false }).order('data_inicio', { ascending: false });
      if (error) return API._erro(error, 'Erro ao listar experiências');
      return data || [];
    },
    async criar(dto) {
      const session = await API._session();
      const { data, error } = await supabaseClient.from('experiencias')
        .insert({ ...this._dto(dto), usuario_id: session.user.id }).select().single();
      if (error) return API._erro(error, this._msg(error, 'Erro ao criar experiência'));
      return data;
    },
    async atualizar(id, dto) {
      const { data, error } = await supabaseClient.from('experiencias')
        .update(this._dto(dto)).eq('id', id).select().single();
      if (error) return API._erro(error, this._msg(error, 'Erro ao atualizar experiência'));
      return data;
    },
    async deletar(id) {
      const { error } = await supabaseClient.from('experiencias').delete().eq('id', id);
      if (error) return API._erro(error, 'Erro ao excluir experiência');
      return { success: true };
    }
  },

  // ------------------------------------------------------------------
  // Habilidades (nome + categoria + nível)
  // ------------------------------------------------------------------
  habilidades: {
    _dto(dto) {
      return {
        nome: (dto.nome || '').trim(),
        categoria: dto.categoria || 'Técnica',
        nivel: dto.nivel || 'Básico'
      };
    },
    _msg(error, fallback) {
      if (error?.code === '23505') return 'Você já cadastrou essa habilidade nessa categoria.';
      return fallback;
    },
    async listar() {
      const { data, error } = await supabaseClient.from('habilidades').select('*')
        .order('categoria').order('nome');
      if (error) return API._erro(error, 'Erro ao listar habilidades');
      return data || [];
    },
    async criar(dto) {
      const session = await API._session();
      const { data, error } = await supabaseClient.from('habilidades')
        .insert({ ...this._dto(dto), usuario_id: session.user.id }).select().single();
      if (error) return API._erro(error, this._msg(error, 'Erro ao criar habilidade'));
      return data;
    },
    async atualizar(id, dto) {
      const { data, error } = await supabaseClient.from('habilidades')
        .update(this._dto(dto)).eq('id', id).select().single();
      if (error) return API._erro(error, this._msg(error, 'Erro ao atualizar habilidade'));
      return data;
    },
    async deletar(id) {
      const { error } = await supabaseClient.from('habilidades').delete().eq('id', id);
      if (error) return API._erro(error, 'Erro ao excluir habilidade');
      return { success: true };
    }
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