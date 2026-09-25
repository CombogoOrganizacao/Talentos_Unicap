// ============================================
// API Client - Empresa (API REST Spring Boot)
// Substitui o antigo cliente Firebase para empresas.
//
// Endpoints usados:
//   POST /api/auth/register-empresa  (cadastro - feito via Auth.registerEmpresa)
//   POST /api/empresa/perfil/foto (multipart, apenas ROLE_EMPRESA)
//   GET  /api/empresa/alunos                          (busca de talentos)
//   POST /api/empresa/vagas                           (criar vaga)
//   GET  /api/empresa/vagas                            (minhas vagas)
//   GET  /api/empresa/vagas/{id}/alunos-compativeis
//   PUT  /api/empresa/vagas/{id}/encerrar
//   GET  /api/vagas/{id}                               (pública, sem login)
//
// ATENÇÃO - sem equivalente no backend hoje (ver relatório de análise):
//   - Não existe GET/PUT de "meu perfil de empresa" (razão social, setor,
//     descrição, telefone, site, responsável) - só o upload de foto.
//     Os campos telefone/site/responsavel/email digitados no cadastro de
//     empresa não são persistidos por não existir campo correspondente
//     no backend (Model/PerfilEmpresa.java).
// ============================================

const APIEmpresa = {

  _erro(error, fallback) {
    console.error(fallback, error);
    return { error: error?.message || fallback, campos: error?.campos || null };
  },

  // ============================================
  // FOTO DE PERFIL DA EMPRESA
  // ============================================

  async uploadFotoPerfil(file) {
    try {
      const form = new FormData();
      form.append('arquivo', file);
      return await Http.postForm('/empresa/perfil/foto', form);
    } catch (error) {
      return this._erro(error, 'Erro ao enviar foto de perfil');
    }
  },

  // ============================================
  // BUSCA DE TALENTOS (alunos disponíveis)
  // ============================================

  async buscarAlunos() {
    try {
      return await Http.get('/empresa/alunos');
    } catch (error) {
      return this._erro(error, 'Erro ao buscar alunos');
    }
  },

  // ============================================
  // VAGAS
  // ============================================

  vagas: {
    async criar(dto) {
      try { return await Http.post('/empresa/vagas', dto); }
      catch (error) { return APIEmpresa._erro(error, 'Erro ao publicar vaga'); }
    },
    async minhas() {
      try { return await Http.get('/empresa/vagas'); }
      catch (error) { return APIEmpresa._erro(error, 'Erro ao listar vagas'); }
    },
    async alunosCompativeis(vagaId) {
      try { return await Http.get(`/empresa/vagas/${vagaId}/alunos-compativeis`); }
      catch (error) { return APIEmpresa._erro(error, 'Erro ao buscar alunos compatíveis'); }
    },
    async encerrar(vagaId) {
      try { return await Http.put(`/empresa/vagas/${vagaId}/encerrar`); }
      catch (error) { return APIEmpresa._erro(error, 'Erro ao encerrar vaga'); }
    },
    // Rota pública - qualquer visitante pode ver os detalhes de uma vaga
    async buscarPorId(vagaId) {
      try { return await Http.get(`/vagas/${vagaId}`, { auth: false }); }
      catch (error) { return APIEmpresa._erro(error, 'Erro ao carregar vaga'); }
    }
  },

  // ============================================
  // MENSAGENS (aluno <-> empresa, usa Usuario.id nos dois lados)
  // ============================================

  mensagens: {
    async enviar({ destinatarioId, conteudo, vagaId }) {
      try { return await Http.post('/mensagens', { destinatarioId, conteudo, vagaId }); }
      catch (error) { return APIEmpresa._erro(error, 'Erro ao enviar mensagem'); }
    },
    async conversa(outroUsuarioId) {
      try { return await Http.get(`/mensagens/conversa/${outroUsuarioId}`); }
      catch (error) { return APIEmpresa._erro(error, 'Erro ao carregar conversa'); }
    },
    async todas() {
      try { return await Http.get('/mensagens'); }
      catch (error) { return APIEmpresa._erro(error, 'Erro ao carregar mensagens'); }
    }
  }
};
