// ============================================
// Mensagens - empresa <-> aluno
// Nó: mensagens/{msgId}
// ============================================

const Mensagens = {
  async enviar({ destinatarioId, destinatarioNome, assunto, mensagem, vagaRelacionada }) {
    if (!Auth.uid) return { error: 'Usuário não autenticado' };
    try {
      const ref = firebaseDB.ref('mensagens').push();
      const remetenteNome = (Auth.user && (Auth.user.displayName || Auth.user.nome)) || 'Empresa';
      await ref.set({
        remetenteId: Auth.uid,
        remetenteNome,
        destinatarioId,
        destinatarioNome: destinatarioNome || '',
        assunto: assunto || '',
        mensagem: mensagem || '',
        vagaRelacionada: vagaRelacionada || '',
        status: 'Enviada',
        criadoEm: Date.now()
      });
      return { success: true, id: ref.key };
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return { error: error.message || 'Erro ao enviar mensagem' };
    }
  },

  // Lista as mensagens enviadas pela empresa logada
  async listarEnviadasPelaEmpresa() {
    if (!Auth.uid) return [];
    try {
      const snapshot = await firebaseDB
        .ref('mensagens')
        .orderByChild('remetenteId')
        .equalTo(Auth.uid)
        .once('value');
      if (!snapshot.exists()) return [];
      const out = [];
      snapshot.forEach((child) => {
        out.push({ id: child.key, ...child.val() });
      });
      return out.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    } catch (error) {
      console.error('Erro ao listar mensagens:', error);
      return [];
    }
  },

  async marcarComoLida(msgId) {
    try {
      await firebaseDB.ref(`mensagens/${msgId}`).update({ status: 'Lida' });
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },

  // ============================================
  // LADO DO ALUNO
  // ============================================

  // Lista as mensagens recebidas pelo aluno logado
  async listarRecebidasPeloAluno() {
    if (!Auth.uid) return [];
    try {
      const snapshot = await firebaseDB
        .ref('mensagens')
        .orderByChild('destinatarioId')
        .equalTo(Auth.uid)
        .once('value');
      if (!snapshot.exists()) return [];
      const out = [];
      snapshot.forEach((child) => {
        out.push({ id: child.key, ...child.val() });
      });
      return out.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    } catch (error) {
      console.error('Erro ao listar mensagens recebidas:', error);
      return [];
    }
  },

  // Marca como lida quando o aluno abre a mensagem (volta nada se já lida)
  async marcarComoLidaSeNecessario(msg) {
    if (!msg || msg.status !== 'Enviada') return;
    const result = await this.marcarComoLida(msg.id);
    if (!result.error) msg.status = 'Lida';
  },

  // Aluno responde uma mensagem da empresa -> status "Respondida"
  async responder(msgId, texto) {
    if (!Auth.uid) return { error: 'Usuário não autenticado' };
    if (!texto || !texto.trim()) return { error: 'Escreva uma resposta antes de enviar.' };
    try {
      await firebaseDB.ref(`mensagens/${msgId}`).update({
        status: 'Respondida',
        resposta: {
          texto: texto.trim(),
          criadoEm: Date.now()
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao responder mensagem:', error);
      return { error: error.message || 'Erro ao responder mensagem' };
    }
  }
};
