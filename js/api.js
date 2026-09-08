// ============================================
// API Client - Firebase Realtime Database
// + Modo Demo
// ============================================

const FIELD_MAP = {
  Experiencias: 'experiencias',
  Formacao: 'formacao',
  Habilidades: 'habilidades',
  Projetos: 'projetos',
  Certificados: 'certificados'
};

const SHEETS = {
  experiences: 'Experiencias',
  educations: 'Formacao',
  skills: 'Habilidades',
  projects: 'Projetos',
  certificates: 'Certificados'
};

const API = {

  // ============================================
  // UTILITÁRIOS
  // ============================================

  _normalizeCollection(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (!item || typeof item !== 'object') return item;
        return {
          ...item,
          id: item.id || String(index)
        };
      });
    }

    if (typeof value === 'object') {
      return Object.entries(value).map(([id, item]) => ({
        ...(item || {}),
        id: item?.id || id
      }));
    }

    return [];
  },

  _generateSlug(text) {
    return (text || 'aluno')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'aluno';
  },

  _errorMessage(error, fallback) {
    console.error(fallback, error);
    return {
      error: error?.message || fallback
    };
  },

  // ============================================
  // PERFIL
  // ============================================

  async getProfile() {
    if (Auth.isDemo) {
      return this._demoGetProfile();
    }

    if (!Auth.uid) {
      return { error: 'Usuário não autenticado' };
    }

    try {
      const snapshot = await firebaseDB
        .ref(`usuario_aluno/${Auth.uid}`)
        .once('value');

      if (!snapshot.exists()) {
        return { error: 'Perfil não encontrado' };
      }

      const data = snapshot.val();

      return {
        id: Auth.uid,
        ...data,
        experiencias: this._normalizeCollection(data.experiencias),
        formacao: this._normalizeCollection(data.formacao),
        habilidades: this._normalizeCollection(data.habilidades),
        projetos: this._normalizeCollection(data.projetos),
        certificados: this._normalizeCollection(data.certificados)
      };
    } catch (error) {
      return this._errorMessage(
        error,
        'Erro ao carregar perfil'
      );
    }
  },

  // ============================================
  // CRIAR PERFIL
  // ============================================

  async createUser(data) {
    if (Auth.isDemo) {
      return this._demoCreateUser(data);
    }

    if (!Auth.uid) {
      return { error: 'Usuário não autenticado' };
    }

    try {
      const baseSlug = this._generateSlug(data.nome);
      let slug = baseSlug;
      let counter = 1;

      // Evitar sobrescrever perfil público de outra pessoa
      while (true) {
        const snapshot = await firebaseDB
          .ref(`publicProfiles/${slug}`)
          .once('value');

        if (!snapshot.exists()) break;

        const existing = snapshot.val();

        if (existing.uid === Auth.uid) break;

        slug = `${baseSlug}-${counter++}`;
      }

      await firebaseDB
        .ref(`usuario_aluno/${Auth.uid}`)
        .set({
          nome: data.nome || '',
          email:
            data.email ||
            (Auth.user && Auth.user.email) ||
            '',
          slug,

          telefone: '',
          endereco: '',
          cidade: '',
          estado: '',

          curso: '',
          periodo: '',
          bio: '',

          foto_url: '',
          linkedin: '',
          github: '',
          portfolio: '',

          experiencias: {},
          formacao: {},
          habilidades: {},
          projetos: {},
          certificados: {},

          criado_em: Date.now(),
          atualizado_em: Date.now()
        });

      await this._syncPublicProfile(Auth.uid);

      return {
        success: true,
        slug
      };
    } catch (error) {
      return this._errorMessage(
        error,
        'Erro ao criar perfil'
      );
    }
  },

  // ============================================
  // ATUALIZAR PERFIL
  // ============================================

  async updateProfile(data) {
    if (Auth.isDemo) {
      return this._demoUpdateProfile(data);
    }

    if (!Auth.uid) {
      return { error: 'Usuário não autenticado' };
    }

    try {
      const userRef = firebaseDB
        .ref(`usuario_aluno/${Auth.uid}`);

      const currentSnapshot =
        await userRef.once('value');

      const currentData =
        currentSnapshot.val() || {};

      await userRef.update({
        ...data,
        atualizado_em: Date.now()
      });

      await this._syncPublicProfile(
        Auth.uid,
        currentData.slug
      );

      return { success: true };
    } catch (error) {
      return this._errorMessage(
        error,
        'Erro ao atualizar perfil'
      );
    }
  },

  // ============================================
  // ADICIONAR ITEM
  // ============================================

  async addItem(sheet, data) {
    if (Auth.isDemo) {
      return this._demoAddItem({
        sheet,
        ...data
      });
    }

    if (!Auth.uid) {
      return { error: 'Usuário não autenticado' };
    }

    const campo = FIELD_MAP[sheet];

    if (!campo) {
      return {
        error: `Tipo inválido: ${sheet}`
      };
    }

    try {
      const collectionRef = firebaseDB.ref(
        `usuario_aluno/${Auth.uid}/${campo}`
      );

      const itemRef = collectionRef.push();

      await itemRef.set({
        ...data,
        criado_em: Date.now(),
        atualizado_em: Date.now()
      });

      await this._syncPublicProfile(Auth.uid);

      return {
        success: true,
        id: itemRef.key
      };
    } catch (error) {
      return this._errorMessage(
        error,
        'Erro ao adicionar item'
      );
    }
  },

  // ============================================
  // ATUALIZAR ITEM
  // ============================================

  async updateItem(sheet, id, data) {
    if (Auth.isDemo) {
      return this._demoUpdateItem({
        sheet,
        id,
        ...data
      });
    }

    if (!Auth.uid) {
      return { error: 'Usuário não autenticado' };
    }

    const campo = FIELD_MAP[sheet];

    if (!campo) {
      return {
        error: `Tipo inválido: ${sheet}`
      };
    }

    try {
      await firebaseDB
        .ref(`usuario_aluno/${Auth.uid}/${campo}/${id}`)
        .update({
          ...data,
          atualizado_em: Date.now()
        });

      await this._syncPublicProfile(Auth.uid);

      return { success: true };
    } catch (error) {
      return this._errorMessage(
        error,
        'Erro ao atualizar item'
      );
    }
  },

  // ============================================
  // EXCLUIR ITEM
  // ============================================

  async deleteItem(sheet, id) {
    if (Auth.isDemo) {
      return this._demoDeleteItem({
        sheet,
        id
      });
    }

    if (!Auth.uid) {
      return { error: 'Usuário não autenticado' };
    }

    const campo = FIELD_MAP[sheet];

    if (!campo) {
      return {
        error: `Tipo inválido: ${sheet}`
      };
    }

    try {
      await firebaseDB
        .ref(`usuario_aluno/${Auth.uid}/${campo}/${id}`)
        .remove();

      await this._syncPublicProfile(Auth.uid);

      return { success: true };
    } catch (error) {
      return this._errorMessage(
        error,
        'Erro ao excluir item'
      );
    }
  },

  // ============================================
  // SINCRONIZAR PERFIL PÚBLICO
  // ============================================

  async _syncPublicProfile(uid, oldSlug = null) {
    const snapshot = await firebaseDB
      .ref(`usuario_aluno/${uid}`)
      .once('value');

    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.val();

    if (!data.slug) {
      return;
    }

    const publicData = {
      uid,
      nome: data.nome || '',
      slug: data.slug || '',

      telefone: data.telefone || '',
      endereco: data.endereco || '',
      cidade: data.cidade || '',
      estado: data.estado || '',

      curso: data.curso || '',
      periodo: data.periodo || '',
      bio: data.bio || '',

      foto_url: data.foto_url || '',
      linkedin: data.linkedin || '',
      github: data.github || '',
      portfolio: data.portfolio || '',

      experiencias:
        this._normalizeCollection(data.experiencias),

      formacao:
        this._normalizeCollection(data.formacao),

      habilidades:
        this._normalizeCollection(data.habilidades),

      projetos:
        this._normalizeCollection(data.projetos),

      certificados:
        this._normalizeCollection(data.certificados),

      atualizado_em: Date.now()
    };

    if (
      oldSlug &&
      oldSlug !== data.slug
    ) {
      await firebaseDB
        .ref(`publicProfiles/${oldSlug}`)
        .remove();
    }

    await firebaseDB
      .ref(`publicProfiles/${data.slug}`)
      .set(publicData);
  },

  // ============================================
  // PERFIL PÚBLICO
  // ============================================

  async getPublicProfile(slug) {
    if (
      typeof Auth !== 'undefined' &&
      Auth.isDemo
    ) {
      return this._demoGet(
        'getPublicProfile',
        { slug }
      );
    }

    try {
      const snapshot =
        await firebaseDB
          .ref(`publicProfiles/${slug}`)
          .once('value');

      if (!snapshot.exists()) {
        return {
          error: 'Perfil não encontrado'
        };
      }

      const data =
        snapshot.val();

      return {
        ...data,
        experiencias:
          this._normalizeCollection(
            data.experiencias
          ),
        formacao:
          this._normalizeCollection(
            data.formacao
          ),
        habilidades:
          this._normalizeCollection(
            data.habilidades
          ),
        projetos:
          this._normalizeCollection(
            data.projetos
          ),
        certificados:
          this._normalizeCollection(
            data.certificados
          )
      };
    } catch (error) {
      return this._errorMessage(
        error,
        'Erro ao carregar perfil público'
      );
    }
  },

  // ============================================
  // COMPATIBILIDADE COM CHAMADAS ANTIGAS
  // ============================================

  async post(action, data = {}) {
    if (Auth.isDemo) {
      return this._demoPost(
        action,
        data
      );
    }

    switch (action) {
      case 'createUser':
        return this.createUser(data);

      case 'getProfile':
        return this.getProfile();

      case 'updateProfile':
        return this.updateProfile(data);

      case 'addItem':
        return this.addItem(
          data.sheet,
          data
        );

      case 'updateItem':
        return this.updateItem(
          data.sheet,
          data.id,
          data
        );

      case 'deleteItem':
        return this.deleteItem(
          data.sheet,
          data.id
        );

      default:
        return {
          error:
            `Ação desconhecida: ${action}`
        };
    }
  },

  async get(action, params = {}) {
    if (Auth.isDemo) {
      return this._demoGet(
        action,
        params
      );
    }

    if (
      action === 'getPublicProfile'
    ) {
      return this.getPublicProfile(
        params.slug
      );
    }

    return {
      error:
        `Ação desconhecida: ${action}`
    };
  },

  // ============================================
  // MODO DEMO
  // ============================================

  _getDemoProfile() {
    const data =
      localStorage.getItem(
        'demo_profile'
      );

    return data
      ? JSON.parse(data)
      : null;
  },

  _saveDemoProfile(profile) {
    localStorage.setItem(
      'demo_profile',
      JSON.stringify(profile)
    );
  },

  _getDemoSheet(sheetName) {
    const data =
      localStorage.getItem(
        'demo_' + sheetName
      );

    return data
      ? JSON.parse(data)
      : [];
  },

  _saveDemoSheet(sheetName, items) {
    localStorage.setItem(
      'demo_' + sheetName,
      JSON.stringify(items)
    );
  },

  _demoPost(action, data) {
    switch (action) {
      case 'createUser':
        return this._demoCreateUser(data);

      case 'getProfile':
        return this._demoGetProfile();

      case 'updateProfile':
        return this._demoUpdateProfile(data);

      case 'addItem':
        return this._demoAddItem(data);

      case 'updateItem':
        return this._demoUpdateItem(data);

      case 'deleteItem':
        return this._demoDeleteItem(data);

      default:
        return {
          error: 'Ação inválida'
        };
    }
  },

  _demoGet(action, params) {
    if (
      action === 'getPublicProfile'
    ) {
      const profile =
        this._getDemoProfile();

      if (
        profile &&
        profile.slug === params.slug
      ) {
        return profile;
      }

      return {
        error:
          'Perfil não encontrado'
      };
    }

    return {
      error:
        'Parâmetros inválidos'
    };
  },

  _demoCreateUser(data) {
    const profile =
      this._getDemoProfile() || {};

    profile.nome =
      data.nome ||
      profile.nome;

    profile.email =
      data.email ||
      profile.email;

    profile.slug =
      this._generateSlug(
        data.nome
      );

    this._saveDemoProfile(
      profile
    );

    return {
      success: true,
      slug: profile.slug
    };
  },

  _demoGetProfile() {
    const profile =
      this._getDemoProfile() || {};

    const user =
      Auth.user || {};

    return {
      id: 'demo-id',

      nome:
        profile.nome ||
        user.displayName ||
        user.nome ||
        '',

      email:
        profile.email ||
        user.email ||
        '',

      slug:
        profile.slug ||
        'admin-teste-unicap',

      telefone:
        profile.telefone || '',

      endereco:
        profile.endereco || '',

      cidade:
        profile.cidade || '',

      estado:
        profile.estado || '',

      curso:
        profile.curso || '',

      periodo:
        profile.periodo || '',

      bio:
        profile.bio || '',

      foto_url:
        profile.foto_url || '',

      linkedin:
        profile.linkedin || '',

      github:
        profile.github || '',

      portfolio:
        profile.portfolio || '',

      experiencias:
        this._getDemoSheet(
          'experiencias'
        ),

      formacao:
        this._getDemoSheet(
          'formacao'
        ),

      habilidades:
        this._getDemoSheet(
          'habilidades'
        ),

      projetos:
        this._getDemoSheet(
          'projetos'
        ),

      certificados:
        this._getDemoSheet(
          'certificados'
        )
    };
  },

  _demoUpdateProfile(data) {
    const profile =
      this._getDemoProfile() || {};

    Object.assign(
      profile,
      data
    );

    this._saveDemoProfile(
      profile
    );

    return {
      success: true
    };
  },

  _demoAddItem(data) {
    const keyMap = {
      'Experiencias':
        'experiencias',

      'Formacao':
        'formacao',

      'Habilidades':
        'habilidades',

      'Projetos':
        'projetos',

      'Certificados':
        'certificados'
    };

    const key =
      keyMap[data.sheet] ||
      data.sheet;

    const items =
      this._getDemoSheet(key);

    const id =
      'id-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .substr(2, 5);

    const item = { id };

    Object.keys(data)
      .forEach(k => {
        if (
          k !== 'action' &&
          k !== 'uid' &&
          k !== 'sheet'
        ) {
          item[k] = data[k];
        }
      });

    items.push(item);

    this._saveDemoSheet(
      key,
      items
    );

    return {
      success: true,
      id
    };
  },

  _demoUpdateItem(data) {
    const keyMap = {
      'Experiencias':
        'experiencias',

      'Formacao':
        'formacao',

      'Habilidades':
        'habilidades',

      'Projetos':
        'projetos',

      'Certificados':
        'certificados'
    };

    const key =
      keyMap[data.sheet] ||
      data.sheet;

    const items =
      this._getDemoSheet(key);

    const idx =
      items.findIndex(
        i => i.id === data.id
      );

    if (idx === -1) {
      return {
        error:
          'Não encontrado'
      };
    }

    Object.keys(data)
      .forEach(k => {
        if (
          k !== 'action' &&
          k !== 'uid' &&
          k !== 'sheet' &&
          k !== 'id'
        ) {
          items[idx][k] = data[k];
        }
      });

    this._saveDemoSheet(
      key,
      items
    );

    return {
      success: true
    };
  },

  _demoDeleteItem(data) {
    const keyMap = {
      'Experiencias':
        'experiencias',

      'Formacao':
        'formacao',

      'Habilidades':
        'habilidades',

      'Projetos':
        'projetos',

      'Certificados':
        'certificados'
    };

    const key =
      keyMap[data.sheet] ||
      data.sheet;

    let items =
      this._getDemoSheet(key);

    items =
      items.filter(
        i => i.id !== data.id
      );

    this._saveDemoSheet(
      key,
      items
    );

    return {
      success: true
    };
  }
};
