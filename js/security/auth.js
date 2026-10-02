// ============================================
// Autenticação - Supabase Auth
// ============================================

const Auth = {
  user: null,
  uid: null,

  async init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      try {
        await this._carregarUsuario(session.user.id);
        this.onAuthChange(true, this.user?.tipoConta);
      } catch (e) {
        console.error('Sessão inválida:', e);
        await this.logout(false);
        this.onAuthChange(false);
      }
    } else {
      this.user = null;
      this.uid = null;
      setTimeout(() => this.onAuthChange(false), 0);
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.user = null;
        this.uid = null;
        this.onAuthChange(false);
      }
    });
  },

  onAuthChange(loggedIn, tipoConta) {},

  async _carregarUsuario(userId) {
    const { data: usuario, error } = await supabaseClient
      .from('usuarios')
      .select('id, nome, tipo_conta')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const { data: authData } = await supabaseClient.auth.getUser();
    this.user = {
      id: usuario.id,
      nome: usuario.nome,
      email: authData?.user?.email || '',
      tipoConta: usuario.tipo_conta === 'EMPRESA' ? 'empresa' : 'aluno'
    };
    this.uid = usuario.id;
    return this.user;
  },

  async _detectarTipoConta() {
    if (!this.user) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) await this._carregarUsuario(session.user.id);
    }
    return this.user?.tipoConta || null;
  },

  async register(nome, email, senha) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, tipoConta: 'ALUNO' } }
    });
    if (error) throw error;

    if (data.user) {
      this.user = { id: data.user.id, nome, email, tipoConta: 'aluno' };
      this.uid = data.user.id;
    }
    return this.user;
  },

  async registerEmpresa({ cnpj, razaoSocial, nomeFantasia, setor, senha, email }) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome: razaoSocial,
          tipoConta: 'EMPRESA',
          cnpj: String(cnpj || '').replace(/\D/g, ''),
          razaoSocial,
          nomeFantasia,
          setor
        }
      }
    });
    if (error) throw error;

    if (!data.user) throw new Error('O Supabase não retornou o usuário criado.');

    this.user = {
      id: data.user.id,
      nome: razaoSocial,
      email,
      tipoConta: 'empresa'
    };
    this.uid = data.user.id;

    // O trigger atual do banco cria usuarios; garantimos o perfil da empresa aqui.
    const { error: perfilError } = await supabaseClient
      .from('perfis_empresa')
      .upsert({
        usuario_id: data.user.id,
        cnpj: String(cnpj || '').replace(/\D/g, ''),
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || razaoSocial,
        setor: setor || null
      }, { onConflict: 'usuario_id' });

    if (perfilError) throw perfilError;
    return this.user;
  },

  async login(identifier, senha) {
    const email = String(identifier || '').trim();
    if (!email || !email.includes('@')) {
      throw new Error('O login da empresa/aluno deve ser feito com e-mail.');
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha
    });
    if (error) throw error;

    await this._carregarUsuario(data.user.id);
    return this.user;
  },

  async loginWithIdentifier(identifier, senha) {
    return this.login(identifier, senha);
  },

  async logout(redirect = true) {
    await supabaseClient.auth.signOut();
    this.user = null;
    this.uid = null;
    if (redirect) window.location.href = 'index.html';
  },

  async isLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return !!session;
  }
};
