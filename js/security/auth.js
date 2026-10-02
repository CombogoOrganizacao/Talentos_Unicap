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
    const value = String(identifier || '').trim();

    if (!value) throw new Error('Informe o e-mail ou CNPJ.');
    if (!senha) throw new Error('Informe a senha.');

    // Alunos continuam usando e-mail diretamente no Supabase Auth.
    // Empresas podem usar e-mail OU CNPJ. Para CNPJ, a consulta acontece
    // em uma Edge Function para que o e-mail interno nunca seja exposto.
    if (value.includes('@')) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: value,
        password: senha
      });

      if (error) throw error;
      await this._carregarUsuario(data.user.id);
      return this.user;
    }

    return this.loginEmpresaPorCnpj(value, senha);
  },

  async loginEmpresaPorCnpj(cnpj, senha) {
    const cnpjNormalizado = String(cnpj || '').replace(/\D/g, '');

    if (!/^\d{14}$/.test(cnpjNormalizado)) {
      throw new Error('Informe um CNPJ válido com 14 dígitos.');
    }

    const { data, error } = await supabaseClient.functions.invoke('login-empresa-cnpj', {
      body: { cnpj: cnpjNormalizado, senha }
    });

    if (error) {
      let message = error.message || 'Não foi possível entrar.';
      // functions.invoke pode devolver o corpo JSON como contexto do erro.
      try {
        const context = error.context;
        if (context && typeof context.json === 'function') {
          const body = await context.json();
          if (body?.error) message = body.error;
        }
      } catch (_) {}
      throw new Error(message);
    }

    if (!data?.session?.access_token || !data?.session?.refresh_token) {
      throw new Error('A autenticação por CNPJ não retornou uma sessão válida.');
    }

    const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    if (sessionError) throw sessionError;

    const userId = sessionData?.user?.id || data?.user?.id;
    if (!userId) throw new Error('A sessão foi criada, mas o usuário não foi identificado.');

    await this._carregarUsuario(userId);
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
