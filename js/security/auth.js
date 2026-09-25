// ============================================
// Autenticação - API REST + JWT (Spring Boot)
// Substitui o antigo Firebase Auth.
//
// IMPORTANTE: o backend hoje não expõe um endpoint "/api/auth/me", então
// não há como saber o tipoConta (aluno/empresa) só decodificando o token.
// Contornamos isso tentando GET /aluno/curriculo (protegido por
// ROLE_ALUNO): se responder 200, é aluno; se responder 403, tratamos como
// empresa. O ideal é o backend passar a expor esse endpoint - ver relatório.
// ============================================

const Auth = {
  token: null,
  user: null, // { id, nome, email, tipoConta: 'aluno' | 'empresa' }

  init() {
    this.token = Http.getToken();

    if (!this.token) {
      this.user = null;
      setTimeout(() => this.onAuthChange(false), 0);
      return;
    }

    this._carregarUsuario()
      .then(() => this.onAuthChange(true, this.user && this.user.tipoConta))
      .catch((e) => {
        console.error('Sessão inválida, efetuando logout:', e);
        this.logout(false);
        this.onAuthChange(false);
      });
  },

  // Sobrescrito pelas páginas.
  onAuthChange(loggedIn, tipoConta) {},

  async _carregarUsuario() {
    try {
      const curriculo = await Http.get('/aluno/curriculo');
      this.user = {
        id: curriculo.dadosPessoais.id,
        nome: curriculo.dadosPessoais.nome,
        email: curriculo.dadosPessoais.email,
        tipoConta: 'aluno'
      };
      return this.user;
    } catch (e) {
      if (e.status === 403) {
        // Não é aluno: única outra opção não-admin é empresa.
        this.user = { tipoConta: 'empresa' };
        return this.user;
      }
      throw e;
    }
  },

  async _detectarTipoConta() {
    if (!this.user) await this._carregarUsuario();
    return this.user ? this.user.tipoConta : null;
  },

  // Cadastro de aluno. tipoConta é sempre 'ALUNO' aqui - contas de empresa
  // usam registerEmpresa() e não existe cadastro de admin pela API.
  async register(nome, email, senha) {
    const data = await Http.post('/auth/register', { nome, email, senha, tipoConta: 'ALUNO' }, { auth: false });
    Http.setToken(data.token);
    this.token = data.token;
    this.user = { nome, email, tipoConta: 'aluno' };
    return this.user;
  },

  async registerEmpresa({ cnpj, razaoSocial, nomeFantasia, setor, senha }) {
    const data = await Http.post('/auth/register-empresa', { cnpj, razaoSocial, nomeFantasia, setor, senha }, { auth: false });
    Http.setToken(data.token);
    this.token = data.token;
    this.user = { nome: razaoSocial, tipoConta: 'empresa' };
    return this.user;
  },

  // login aceita e-mail (aluno/empresa) OU CNPJ (empresa) no mesmo campo -
  // o backend resolve isso sozinho em UsuarioDetailsService.
  async login(identifier, senha) {
    const data = await Http.post('/auth/login', { login: identifier, senha }, { auth: false });
    Http.setToken(data.token);
    this.token = data.token;
    await this._carregarUsuario();
    return this.user;
  },

  // Mantido por compatibilidade com o restante do front (login.html chama
  // este método). Como o backend já aceita CNPJ ou e-mail no mesmo campo,
  // não é mais necessário resolver o e-mail antes de autenticar.
  async loginWithIdentifier(identifier, senha) {
    return this.login(identifier, senha);
  },

  logout(redirect = true) {
    Http.clearToken();
    this.token = null;
    this.user = null;
    if (redirect) window.location.href = 'index.html';
  },

  isLoggedIn() {
    return !!this.token;
  }
};
