// ============================================
// Autenticação - Firebase + Modo Demo
// ============================================

const TEST_ACCOUNT = {
  uid: 'admin-test-001',
  nome: 'Admin Teste UNICAP',
  email: 'admin@unicap.edu.br',
  displayName: 'Admin Teste UNICAP'
};

const Auth = {
  uid: null,
  user: null,
  isDemo: false,

  init() {
    const demoSession = localStorage.getItem('demo_user');

    if (demoSession) {
      try {
        const user = JSON.parse(demoSession);
        this.uid = user.uid;
        this.user = user;
        this.isDemo = true;
        setTimeout(() => this.onAuthChange(true), 0);
        return;
      } catch (e) {
        localStorage.removeItem('demo_user');
      }
    }

    this.isDemo = false;

    try {
      if (
        CONFIG.firebase &&
        CONFIG.firebase.apiKey &&
        CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI'
      ) {
        firebaseAuth.onAuthStateChanged(async (user) => {
          if (user) {
            this.uid = user.uid;
            this.user = user;
            this.isDemo = false;
            const tipoConta = await this._detectarTipoConta();
            this.onAuthChange(true, tipoConta);
          } else {
            this.uid = null;
            this.user = null;
            this.isDemo = false;
            this.onAuthChange(false);
          }
        });
      } else {
        this.uid = null;
        this.user = null;
        this.isDemo = false;
        setTimeout(() => this.onAuthChange(false), 0);
      }
    } catch (e) {
      console.error('Erro ao inicializar Firebase Authentication:', e);
      this.uid = null;
      this.user = null;
      this.isDemo = false;
      setTimeout(() => this.onAuthChange(false), 0);
    }
  },

  onAuthChange(loggedIn, tipoConta) {
    // Sobrescrito pelas páginas.
    // tipoConta: 'empresa' | 'aluno' | null (quando não foi possível detectar)
  },

  // Detecta o tipo da conta logada consultando o Realtime Database:
  // se existe perfil em usuario_empresa/{uid} é uma empresa; caso contrário,
  // tratamos como aluno. Retorna null se a detecção falhar (ex.: sem permissão
  // de leitura), e aí cada página decide o destino padrão.
  async _detectarTipoConta() {
    try {
      const snap = await firebaseDB
        .ref(`usuario_empresa/${this.uid}`)
        .once('value');
      return snap.exists() ? 'empresa' : 'aluno';
    } catch (e) {
      console.error('Erro ao identificar tipo de conta:', e);
      return null;
    }
  },

  async register(name, email, password) {
    if (
      !this.isDemo &&
      CONFIG.firebase &&
      CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI'
    ) {
      const cred = await firebaseAuth.createUserWithEmailAndPassword(
        email,
        password
      );

      await cred.user.updateProfile({
        displayName: name
      });

      this.uid = cred.user.uid;
      this.user = cred.user;
      this.isDemo = false;

      return cred.user;
    }

    const user = {
      uid: 'user-' + Date.now(),
      nome: name,
      email: email,
      displayName: name
    };

    localStorage.setItem('demo_user', JSON.stringify(user));
    this.uid = user.uid;
    this.user = user;
    this.isDemo = true;

    return user;
  },

  async login(email, password) {
    if (
      email === 'admin@unicap.edu.br' &&
      password === '123456'
    ) {
      localStorage.setItem(
        'demo_user',
        JSON.stringify(TEST_ACCOUNT)
      );

      this.uid = TEST_ACCOUNT.uid;
      this.user = TEST_ACCOUNT;
      this.isDemo = true;

      return TEST_ACCOUNT;
    }

    if (
      !this.isDemo &&
      CONFIG.firebase &&
      CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI'
    ) {
      const cred =
        await firebaseAuth.signInWithEmailAndPassword(
          email,
          password
        );

      this.uid = cred.user.uid;
      this.user = cred.user;
      this.isDemo = false;

      return cred.user;
    }

    const user = {
      uid: 'user-' + email.replace(/[^a-z0-9]/gi, ''),
      nome: email.split('@')[0],
      email,
      displayName: email.split('@')[0]
    };

    localStorage.setItem('demo_user', JSON.stringify(user));
    this.uid = user.uid;
    this.user = user;
    this.isDemo = true;

    return user;
  },

  // Login aceitando CNPJ (empresas) ou e-mail (empresas e alunos).
  // Se o identificador for um CNPJ, resolve o e-mail via empresa_index
  // antes de autenticar no Firebase.
  async loginWithIdentifier(identifier, password) {
    if (this.isDemo) {
      return this.login(identifier, password);
    }

    if (
      CONFIG.firebase &&
      CONFIG.firebase.apiKey &&
      CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI' &&
      typeof APIEmpresa !== 'undefined'
    ) {
      const resolved = await APIEmpresa.resolverEmailPorIdentificador(identifier);
      if (resolved.error) {
        throw new Error(resolved.error);
      }
      return this.login(resolved.email, password);
    }

    return this.login(identifier, password);
  },

  async logout() {
    try {
      if (
        !this.isDemo &&
        CONFIG.firebase &&
        CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI'
      ) {
        await firebaseAuth.signOut();
      }
    } catch (e) {
      console.error('Erro ao fazer logout:', e);
    }

    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_profile');

    this.uid = null;
    this.user = null;
    this.isDemo = false;

    window.location.href = 'index.html';
  },

  isLoggedIn() {
    return this.uid !== null;
  }
};
