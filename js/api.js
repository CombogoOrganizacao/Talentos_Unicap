// ============================================
// API Client - Google Apps Script + Modo Demo
// ============================================

const API = {
  // ============================================
  // MODO DEMO (localStorage)
  // ============================================
  _getDemoProfile() {
    const data = localStorage.getItem('demo_profile');
    return data ? JSON.parse(data) : null;
  },

  _saveDemoProfile(profile) {
    localStorage.setItem('demo_profile', JSON.stringify(profile));
  },

  _getDemoSheet(sheetName) {
    const data = localStorage.getItem('demo_' + sheetName);
    return data ? JSON.parse(data) : [];
  },

  _saveDemoSheet(sheetName, items) {
    localStorage.setItem('demo_' + sheetName, JSON.stringify(items));
  },

  // ============================================
  // API CALLS
  // ============================================
  async post(action, data = {}) {
    // Modo demo
    if (Auth.isDemo) {
      return this._demoPost(action, data);
    }

    // Modo real (Google Apps Script)
    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action, uid: Auth.uid, ...data })
      });
      const text = await response.text();
      return JSON.parse(text);
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Erro de conexão' };
    }
  },

  async get(action, params = {}) {
    if (Auth.isDemo) {
      return this._demoGet(action, params);
    }
    try {
      const url = new URL(CONFIG.API_URL);
      url.searchParams.set('action', action);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const response = await fetch(url.toString());
      return await response.json();
    } catch (error) {
      return { error: 'Erro de conexão' };
    }
  },

  async getProfile() { return this.post('getProfile'); },
  async updateProfile(data) { return this.post('updateProfile', data); },
  async addItem(sheet, data) { return this.post('addItem', { sheet, ...data }); },
  async updateItem(sheet, id, data) { return this.post('updateItem', { sheet, id, ...data }); },
  async deleteItem(sheet, id) { return this.post('deleteItem', { sheet, id }); },
  async getPublicProfile(slug) { return this.get('getPublicProfile', { slug }); },

  // ============================================
  // LÓGICA DEMO
  // ============================================
  _demoPost(action, data) {
    switch (action) {
      case 'createUser': return this._demoCreateUser(data);
      case 'getProfile': return this._demoGetProfile();
      case 'updateProfile': return this._demoUpdateProfile(data);
      case 'addItem': return this._demoAddItem(data);
      case 'updateItem': return this._demoUpdateItem(data);
      case 'deleteItem': return this._demoDeleteItem(data);
      default: return { error: 'Ação inválida' };
    }
  },

  _demoGet(action, params) {
    if (action === 'getPublicProfile') {
      // Em modo demo, busca por slug no profile salvo
      const profile = this._getDemoProfile();
      if (profile && profile.slug === params.slug) return profile;
      return { error: 'Perfil não encontrado' };
    }
    return { error: 'Parâmetros inválidos' };
  },

  _demoCreateUser(data) {
    const profile = this._getDemoProfile() || {};
    profile.nome = data.nome || profile.nome;
    profile.email = data.email || profile.email;
    profile.slug = (data.nome || 'aluno').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    this._saveDemoProfile(profile);
    return { success: true, slug: profile.slug };
  },

  _demoGetProfile() {
    const profile = this._getDemoProfile() || {};
    const user = Auth.user || {};
    return {
      id: 'demo-id',
      nome: profile.nome || user.displayName || user.nome || '',
      email: profile.email || user.email || '',
      slug: profile.slug || 'admin-teste-unicap',
      telefone: profile.telefone || '',
      endereco: profile.endereco || '',
      cidade: profile.cidade || '',
      estado: profile.estado || '',
      curso: profile.curso || '',
      periodo: profile.periodo || '',
      bio: profile.bio || '',
      foto_url: profile.foto_url || '',
      linkedin: profile.linkedin || '',
      github: profile.github || '',
      portfolio: profile.portfolio || '',
      experiencias: this._getDemoSheet('experiencias'),
      formacao: this._getDemoSheet('formacao'),
      habilidades: this._getDemoSheet('habilidades'),
      projetos: this._getDemoSheet('projetos'),
      certificados: this._getDemoSheet('certificados')
    };
  },

  _demoUpdateProfile(data) {
    const profile = this._getDemoProfile() || {};
    Object.assign(profile, data);
    this._saveDemoProfile(profile);
    return { success: true };
  },

  _demoAddItem(data) {
    const sheet = data.sheet;
    
    // Mapear sheet name para localStorage key
    const keyMap = {
      'Experiencias': 'experiencias',
      'Formacao': 'formacao',
      'Habilidades': 'habilidades',
      'Projetos': 'projetos',
      'Certificados': 'certificados'
    };
    const key = keyMap[sheet] || sheet;
    
    const items = this._getDemoSheet(key);  // ✅ Usa a key correta
    const id = 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const item = { id };
    Object.keys(data).forEach(k => {
      if (k !== 'action' && k !== 'uid' && k !== 'sheet') item[k] = data[k];
    });
    items.push(item);

    this._saveDemoSheet(key, items);
    return { success: true, id: id };
  },

  _demoUpdateItem(data) {
    const keyMap = {
      'Experiencias': 'experiencias',
      'Formacao': 'formacao',
      'Habilidades': 'habilidades',
      'Projetos': 'projetos',
      'Certificados': 'certificados'
    };
    const key = keyMap[data.sheet] || data.sheet;
    const items = this._getDemoSheet(key);
    const idx = items.findIndex(i => i.id === data.id);
    if (idx === -1) return { error: 'Não encontrado' };
    Object.keys(data).forEach(k => {
      if (k !== 'action' && k !== 'uid' && k !== 'sheet' && k !== 'id') items[idx][k] = data[k];
    });
    this._saveDemoSheet(key, items);
    return { success: true };
  },

  _demoDeleteItem(data) {
    const keyMap = {
      'Experiencias': 'experiencias',
      'Formacao': 'formacao',
      'Habilidades': 'habilidades',
      'Projetos': 'projetos',
      'Certificados': 'certificados'
    };
    const key = keyMap[data.sheet] || data.sheet;
    let items = this._getDemoSheet(key);
    items = items.filter(i => i.id !== data.id);
    this._saveDemoSheet(key, items);
    return { success: true };
  }
};

const SHEETS = {
  experiences: 'Experiencias',
  educations: 'Formacao',
  skills: 'Habilidades',
  projects: 'Projetos',
  certificates: 'Certificados'
};
