// ============================================
// Autenticação - Supabase Auth
// ============================================

const Auth = {

  user: null, // { id, nome, email, tipoConta: 'aluno' | 'empresa' }

  init() {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        this.user = null;
        setTimeout(() => this.onAuthChange(false), 0);
        return;
      }
      this._carregarUsuario(session.user.id)
        .then(() => this.onAuthChange(true, this.user && this.user.tipoConta))
        .catch((e) => {
          console.error('Sessão inválida:', e);
          this.logout(false);
          this.onAuthChange(false);
        });
    });

    // Mantém o front sincronizado se o token expirar/renovar em outra aba, etc.
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.user = null;
        this.onAuthChange(false);
      }
    });
  },

  // Sobrescrito pelas páginas.
  onAuthChange(loggedIn, tipoConta) {},

  async _carregarUsuario(userId) {
    const { data: usuario, error } = await supabaseClient
      .from('usuarios')
      .select('id, nome, tipo_conta')
      .eq('id', userId)
      .single();

    if (error) throw error;

    this.user = {
      id: usuario.id,
      nome: usuario.nome,
      tipoConta: usuario.tipo_conta === 'EMPRESA' ? 'empresa' : 'aluno'
    };

    return this.user;
  },

  async _detectarTipoConta() {
    if (!this.user) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) await this._carregarUsuario(session.user.id);
    }
    return this.user ? this.user.tipoConta : null;
  },

  // ============================================
  // CADASTRO DE ALUNO
  // ============================================

  async register(nome, email, senha) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, tipoConta: 'ALUNO' } }  // o trigger do banco usa isso pra criar usuarios + perfis_aluno
    });

    if (error) throw error;

    this.user = { nome, email, tipoConta: 'aluno' };
    return this.user;
  },

  // ============================================
  // CADASTRO DE EMPRESA
  // ============================================

  async registerEmpresa({ cnpj, razaoSocial, nomeFantasia, setor, senha, email }) {
    // Supabase Auth exige email único pra login — usa o e-mail real cadastrado,
    // não o CNPJ. O CNPJ fica só na tabela perfis_empresa.
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: { data: { nome: razaoSocial, tipoConta: 'EMPRESA' } }
    });

    if (error) throw error;

    // Completa os dados específicos de empresa (o trigger só cria usuarios;
    // perfis_empresa não é criado automaticamente, diferente de perfis_aluno)
    const { error: erroPerfil } = await supabaseClient
      .from('perfis_empresa')
      .insert({
        usuario_id: data.user.id,
        cnpj,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        setor
      });

    if (erroPerfil) throw erroPerfil;

    this.user = { nome: razaoSocial, tipoConta: 'empresa' };
    return this.user;
  },

  // ============================================
  // LOGIN
  // ============================================

  async login(identifier, senha) {
    // Supabase Auth loga só por e-mail. Se "identifier" for CNPJ (login de
    // empresa), precisa resolver pro e-mail correspondente antes.
    let email = identifier;

    const pareceCnpj = /^\d+$/.test(identifier.replace(/\D/g, '')) && identifier.replace(/\D/g, '').length === 14;
    if (pareceCnpj) {
      const { data: empresa, error } = await supabaseClient
        .from('perfis_empresa')
        .select('usuario_id')
        .eq('cnpj', identifier.replace(/\D/g, ''))
        .single();

      if (error || !empresa) throw new Error('CNPJ não encontrado');

      const { data: usuario } = await supabaseClient
        .from('usuarios')
        .select('id')
        .eq('id', empresa.usuario_id)
        .single();

      // Supabase não tem "login por id" direto — por isso é mais simples
      // pedir login por e-mail real da empresa também. Ver nota abaixo.
      throw new Error('Login por CNPJ precisa de ajuste — ver nota no guia');
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

  // ============================================
  // LOGOUT
  // ============================================

  async logout(redirect = true) {
    await supabaseClient.auth.signOut();
    this.user = null;

    if (redirect) {
      window.location.href = 'index.html';
    }
  },

  // ============================================
  // VERIFICAR LOGIN
  // ============================================

  async isLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return !!session;
  }
};