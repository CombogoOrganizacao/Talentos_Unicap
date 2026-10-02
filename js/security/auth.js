// ============================================
// Autenticação - Supabase Auth (produção)
// ============================================

const Auth = {
  user: null,
  uid: null,

  getSiteUrl() {
    // Usa automaticamente o domínio atual (Vercel ou domínio próprio).
    return window.location.origin;
  },

  getEmailConfirmationUrl() {
    return `${this.getSiteUrl()}/confirmacao-email.html`;
  },

  getPasswordResetUrl() {
    return `${this.getSiteUrl()}/redefinir-senha.html`;
  },

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

    supabaseClient.auth.onAuthStateChange((event, sessionAtual) => {
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
      options: {
        emailRedirectTo: this.getEmailConfirmationUrl(),
        data: { nome, tipoConta: 'ALUNO' }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('O Supabase não retornou o usuário criado.');

    // Com "Confirm Email" ativo, o Supabase não cria uma sessão aqui.
    // Portanto, NÃO tratamos o usuário como logado antes da confirmação.
    if (data.session) {
      await this._carregarUsuario(data.user.id);
    } else {
      this.user = null;
      this.uid = null;
    }

    return {
      user: data.user,
      session: data.session,
      requiresEmailConfirmation: !data.session
    };
  },

  async registerEmpresa({ cnpj, razaoSocial, nomeFantasia, setor, senha, email }) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: this.getEmailConfirmationUrl(),
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

    // O trigger do banco cria usuarios + perfis_empresa.
    // Não fazemos INSERT/UPSERT pelo frontend, pois com confirmação de e-mail
    // ativa ainda não existe sessão autenticada neste momento.
    if (data.session) {
      await this._carregarUsuario(data.user.id);
    } else {
      this.user = null;
      this.uid = null;
    }

    return {
      user: data.user,
      session: data.session,
      requiresEmailConfirmation: !data.session
    };
  },

  async login(identifier, senha) {
    const email = String(identifier || '').trim();

    if (!email || !email.includes('@')) {
      throw new Error('Informe o e-mail cadastrado. O login por CNPJ ainda precisa de uma etapa própria de consulta.');
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

  async resendConfirmation(email) {
    const address = String(email || '').trim();
    if (!address) throw new Error('Informe o e-mail da conta.');

    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email: address,
      options: { emailRedirectTo: this.getEmailConfirmationUrl() }
    });

    if (error) throw error;
  },

  async sendPasswordReset(email) {
    const address = String(email || '').trim();
    if (!address) throw new Error('Informe o e-mail da conta.');

    const { error } = await supabaseClient.auth.resetPasswordForEmail(address, {
      redirectTo: this.getPasswordResetUrl()
    });

    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data.user;
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
