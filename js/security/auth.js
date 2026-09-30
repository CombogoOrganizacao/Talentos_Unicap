// ============================================
// Autenticação - API REST + JWT (Spring Boot)
// Substitui o antigo Firebase Auth.
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

    const perfil = await Http.get('/aluno/perfil');

    this.user = {
      id: perfil.id,
      nome: perfil.nome,
      email: perfil.email,
      tipoConta: 'aluno'
    };

    return this.user;

  } catch (e) {

    if (e.status === 403) {
      // Não é aluno: tratamos como empresa.
      this.user = { tipoConta: 'empresa' };
      return this.user;
    }

    if (e.status === 404) {
      // É aluno, mas ainda não criou o perfil (usuário recém-cadastrado).
      this.user = { tipoConta: 'aluno', semPerfil: true };
      return this.user;
    }

    throw e;
  }
},

  async _detectarTipoConta() {

    if (!this.user) {
      await this._carregarUsuario();
    }

    return this.user ? this.user.tipoConta : null;
  },

  // ============================================
  // CADASTRO DE ALUNO
  // ============================================

  async register(nome, email, senha) {

    const data = await Http.post(
      '/auth/register',
      {
        nome,
        email,
        senha,
        tipoConta: 'ALUNO'
      },
      {
        auth: false
      }
    );

    Http.setToken(data.token);

    this.token = data.token;

    this.user = {
      nome,
      email,
      tipoConta: 'aluno'
    };

    return this.user;
  },

  // ============================================
  // CADASTRO DE EMPRESA
  // ============================================

  async registerEmpresa({
    cnpj,
    razaoSocial,
    nomeFantasia,
    setor,
    senha
  }) {

    const data = await Http.post(
      '/auth/register-empresa',
      {
        cnpj,
        razaoSocial,
        nomeFantasia,
        setor,
        senha
      },
      {
        auth: false
      }
    );

    Http.setToken(data.token);

    this.token = data.token;

    this.user = {
      nome: razaoSocial,
      tipoConta: 'empresa'
    };

    return this.user;
  },

  // ============================================
  // LOGIN
  // Aceita e-mail ou CNPJ
  // ============================================

  async login(identifier, senha) {

    const data = await Http.post(
      '/auth/login',
      {
        login: identifier,
        senha
      },
      {
        auth: false
      }
    );

    Http.setToken(data.token);

    this.token = data.token;

    await this._carregarUsuario();

    return this.user;
  },

  // Mantido por compatibilidade com o restante
  // do frontend.
  async loginWithIdentifier(identifier, senha) {

    return this.login(identifier, senha);
  },

  // ============================================
  // LOGOUT
  // ============================================

  logout(redirect = true) {

    Http.clearToken();

    this.token = null;

    this.user = null;

    if (redirect) {
      window.location.href = 'index.html';
    }
  },

  // ============================================
  // VERIFICAR LOGIN
  // ============================================

  isLoggedIn() {

    return !!this.token;
  }

};