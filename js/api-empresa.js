// ============================================
// API Client - Empresas (Firebase Realtime Database)
// Nó: usuario_empresa/{uid}
// ============================================

const APIEmpresa = {

  _errorMessage(error, fallback) {
    console.error(fallback, error);
    return { error: error?.message || fallback };
  },

  // ============================================
  // CRIAR CONTA DE EMPRESA
  // Cria o usuário no Firebase Auth e o perfil em
  // usuario_empresa/{uid}. O logo (se houver) já deve
  // ter sido enviado ao Storage e a URL passada em data.logo_url.
  // ============================================
  async createEmpresa({ nome_empresa, cnpj, email, senha, setor, telefone, site, responsavel, logo_url }) {
    try {
      const cred = await firebaseAuth.createUserWithEmailAndPassword(email, senha);
      await cred.user.updateProfile({ displayName: nome_empresa });

      const uid = cred.user.uid;

      await firebaseDB.ref(`usuario_empresa/${uid}`).set({
        role: 'empresa',
        nome_empresa: nome_empresa || '',
        cnpj: cnpj || '',
        email: email || '',
        setor: setor || '',
        telefone: telefone || '',
        site: site || '',
        responsavel: responsavel || '',
        logo_url: logo_url || '',
        criado_em: Date.now(),
        atualizado_em: Date.now()
      });

      return { success: true, uid };
    } catch (error) {
      return this._errorMessage(error, 'Erro ao criar conta da empresa');
    }
  },

  // ============================================
  // ENVIAR LOGO PARA O FIREBASE STORAGE
  // Retorna a URL pública de download.
  // ============================================
  async uploadLogo(uid, file) {
    if (!file) return '';
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const ref = firebase.storage().ref(`logos_empresas/${uid}.${ext}`);
      await ref.put(file);
      return await ref.getDownloadURL();
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      return '';
    }
  },

  // ============================================
  // PERFIL DA EMPRESA LOGADA
  // ============================================
  async getPerfil() {
    if (!Auth.uid) return { error: 'Usuário não autenticado' };
    try {
      const snapshot = await firebaseDB.ref(`usuario_empresa/${Auth.uid}`).once('value');
      if (!snapshot.exists()) return { error: 'Perfil de empresa não encontrado' };
      return { uid: Auth.uid, ...snapshot.val() };
    } catch (error) {
      return this._errorMessage(error, 'Erro ao carregar perfil da empresa');
    }
  },

  async updatePerfil(data) {
    if (!Auth.uid) return { error: 'Usuário não autenticado' };
    try {
      await firebaseDB.ref(`usuario_empresa/${Auth.uid}`).update({
        ...data,
        atualizado_em: Date.now()
      });
      return { success: true };
    } catch (error) {
      return this._errorMessage(error, 'Erro ao atualizar perfil da empresa');
    }
  }
};
