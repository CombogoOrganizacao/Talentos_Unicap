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
    // Verificar se há sessão demo salva
    const demoSession = localStorage.getItem('demo_user');
    if (demoSession) {
      const user = JSON.parse(demoSession);
      this.uid = user.uid;
      this.user = user;
      this.isDemo = true;
      setTimeout(() => this.onAuthChange(true), 100);
      return;
    }

    // Tentar Firebase (se configurado)
    try {
      if (CONFIG.firebase.apiKey && CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI') {
        firebase.initializeApp(CONFIG.firebase);
        firebase.auth().onAuthStateChanged(user => {
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
        // Firebase não configurado → modo demo disponível
        this.uid = null;
        this.user = null;
        this.isDemo = false;
        setTimeout(() => this.onAuthChange(false), 100);
      }
    } catch (e) {
      console.warn('Firebase não configurado. Use modo demo.');
      setTimeout(() => this.onAuthChange(false), 100);
    }
  },

  onAuthChange(loggedIn) {
    // Override por página
  },

  async register(name, email, password) {
    // Tentar Firebase
    if (!this.isDemo && CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI') {
      try {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        await API.post('createUser', { nome: name, email: email });
        return cred.user;
      } catch (e) {
        throw e;
      }
    }

    // Modo demo: simular registro
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
    // Conta de teste (admin)
    if (email === 'admin@unicap.edu.br' && password === '123456') {
      localStorage.setItem('demo_user', JSON.stringify(TEST_ACCOUNT));
      this.uid = TEST_ACCOUNT.uid;
      this.user = TEST_ACCOUNT;
      this.isDemo = true;
      return TEST_ACCOUNT;
    }

    // Tentar Firebase
    if (!this.isDemo && CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI') {
      try {
        return await firebase.auth().signInWithEmailAndPassword(email, password);
      } catch (e) {
        throw e;
      }
    }

    // Modo demo: simular login com qualquer email
    const user = {
      uid: 'user-' + email.replace(/[^a-z0-9]/g, ''),
      nome: email.split('@')[0],
      email: email,
      displayName: email.split('@')[0]
    };
    localStorage.setItem('demo_user', JSON.stringify(user));
    this.uid = user.uid;
    this.user = user;
    this.isDemo = true;
    return user;
  },

  async logout() {
    if (!this.isDemo && CONFIG.firebase.apiKey !== 'SUA_API_KEY_AQUI') {
      try { await firebase.auth().signOut(); } catch (e) {}
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
