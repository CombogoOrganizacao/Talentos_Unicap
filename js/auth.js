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
        firebaseAuth.onAuthStateChanged(user => {
          if (user) {
            this.uid = user.uid;
            this.user = user;
            this.isDemo = false;
            this.onAuthChange(true);
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

  onAuthChange(loggedIn) {
    // Sobrescrito pelas páginas.
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
