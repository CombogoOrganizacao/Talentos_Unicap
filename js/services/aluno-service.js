// ============================================
// API Client - Aluno (API REST Spring Boot)
// Substitui o antigo cliente Firebase Realtime Database.
//
// Endpoints usados (todos exigem JWT de um usuário ROLE_ALUNO, exceto
// onde indicado):
//   GET    /api/aluno/perfil
//   POST   /api/aluno/perfil
//   PUT    /api/aluno/perfil
//   GET    /api/aluno/formacoes            POST/PUT/DELETE .../{id}
//   GET    /api/aluno/projetos             POST/PUT/DELETE .../{id}
//   GET    /api/aluno/certificacoes        POST/PUT/DELETE .../{id}
//   GET    /api/aluno/curriculo
//   GET    /api/comprovantes
//   POST   /api/comprovantes/link
//   POST   /api/comprovantes/arquivo (multipart)
//
// ATENÇÃO - sem equivalente no backend hoje (ver relatório de análise):
//   - "Experiências profissionais" (não existe entidade Experiencia)
//   - Habilidades com categoria/nível (backend só guarda um Set<String>
//     simples em PerfilAlunoRequest.habilidades)
//   - Perfil público por slug (não existe rota pública de perfil de aluno)
// ============================================

const API = {

  _erro(error, fallback) {
    console.error(fallback, error);
    return { error: error?.message || fallback, campos: error?.campos || null };
  },

  // ============================================
  // PERFIL DO ALUNO
  // ============================================

  async getPerfil() {
    try {
      return await Http.get('/aluno/perfil');
    } catch (error) {
      return this._erro(error, 'Erro ao carregar perfil');
    }
  },

  async criarPerfil(dto) {
    try {
      return await Http.post('/aluno/perfil', dto);
    } catch (error) {
      return this._erro(error, 'Erro ao criar perfil');
    }
  },

  async atualizarPerfil(dto) {
    try {
      return await Http.put('/aluno/perfil', dto);
    } catch (error) {
      return this._erro(error, 'Erro ao atualizar perfil');
    }
  },

  // Cria o perfil se ainda não existir (404), ou atualiza se já existir.
  async salvarPerfil(dto) {
    const atual = await this.getPerfil();
    if (atual && atual.error) {
      return this.criarPerfil(dto);
    }
    return this.atualizarPerfil(dto);
  },

  // ============================================
  // CURRÍCULO COMPLETO (dados pessoais + perfil + formações + projetos + certificações)
  // ============================================

  async getCurriculo() {
    try {
      return await Http.get('/aluno/curriculo');
    } catch (error) {
      return this._erro(error, 'Erro ao carregar currículo');
    }
  },

  // ============================================
  // FORMAÇÕES
  // ============================================

  formacoes: {
    async listar() {
      try { return await Http.get('/aluno/formacoes'); }
      catch (error) { return API._erro(error, 'Erro ao listar formações'); }
    },
    async criar(dto) {
      try { return await Http.post('/aluno/formacoes', dto); }
      catch (error) { return API._erro(error, 'Erro ao criar formação'); }
    },
    async atualizar(id, dto) {
      try { return await Http.put(`/aluno/formacoes/${id}`, dto); }
      catch (error) { return API._erro(error, 'Erro ao atualizar formação'); }
    },
    async deletar(id) {
      try { await Http.del(`/aluno/formacoes/${id}`); return { success: true }; }
      catch (error) { return API._erro(error, 'Erro ao excluir formação'); }
    }
  },

  // ============================================
  // PROJETOS
  // ============================================

  projetos: {
    async listar() {
      try { return await Http.get('/aluno/projetos'); }
      catch (error) { return API._erro(error, 'Erro ao listar projetos'); }
    },
    async criar(dto) {
      try { return await Http.post('/aluno/projetos', dto); }
      catch (error) { return API._erro(error, 'Erro ao criar projeto'); }
    },
    async atualizar(id, dto) {
      try { return await Http.put(`/aluno/projetos/${id}`, dto); }
      catch (error) { return API._erro(error, 'Erro ao atualizar projeto'); }
    },
    async deletar(id) {
      try { await Http.del(`/aluno/projetos/${id}`); return { success: true }; }
      catch (error) { return API._erro(error, 'Erro ao excluir projeto'); }
    }
  },

  // ============================================
  // CERTIFICAÇÕES
  // ============================================

  certificacoes: {
    async listar() {
      try { return await Http.get('/aluno/certificacoes'); }
      catch (error) { return API._erro(error, 'Erro ao listar certificações'); }
    },
    async criar(dto) {
      try { return await Http.post('/aluno/certificacoes', dto); }
      catch (error) { return API._erro(error, 'Erro ao criar certificação'); }
    },
    async atualizar(id, dto) {
      try { return await Http.put(`/aluno/certificacoes/${id}`, dto); }
      catch (error) { return API._erro(error, 'Erro ao atualizar certificação'); }
    },
    async deletar(id) {
      try { await Http.del(`/aluno/certificacoes/${id}`); return { success: true }; }
      catch (error) { return API._erro(error, 'Erro ao excluir certificação'); }
    }
  },

  // ============================================
  // COMPROVANTES
  // ============================================

  comprovantes: {
    async listar() {
      try { return await Http.get('/comprovantes'); }
      catch (error) { return API._erro(error, 'Erro ao listar comprovantes'); }
    },
    async salvarLink(url) {
      try { return await Http.post('/comprovantes/link', { url }); }
      catch (error) { return API._erro(error, 'Erro ao salvar link do comprovante'); }
    },
    async salvarArquivo(file) {
      try {
        const form = new FormData();
        form.append('arquivo', file);
        return await Http.postForm('/comprovantes/arquivo', form);
      } catch (error) { return API._erro(error, 'Erro ao enviar comprovante'); }
    }
  }
};
