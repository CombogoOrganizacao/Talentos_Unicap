// ============================================
// Mensagens - empresa <-> aluno (Supabase)
// ============================================
const Mensagens = {
  async _session() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  },

  async _listar(filtroCampo) {
    const session = await this._session();
    if (!session) return [];

    const { data, error } = await supabaseClient
      .from('mensagens')
      .select(`
        *,
        remetente:usuarios!mensagens_remetente_id_fkey(id,nome),
        destinatario:usuarios!mensagens_destinatario_id_fkey(id,nome)
      `)
      .eq(filtroCampo, session.user.id)
      .order('data_envio', { ascending: false });

    if (error) {
      console.error('Erro ao listar mensagens:', error);
      return [];
    }

    const rows = data || [];
    const ids = rows.map(m => m.id);
    let respostas = [];
    if (ids.length) {
      const { data: r } = await supabaseClient
        .from('mensagens')
        .select('id,resposta_de_id,conteudo,data_envio')
        .in('resposta_de_id', ids);
      respostas = r || [];
    }

    const respostaMap = new Map(respostas.map(r => [r.resposta_de_id, r]));
    return rows.map(m => this._paraFormatoAntigo(m, respostaMap.get(m.id)));
  },

  async enviar({ destinatarioId, destinatarioNome, assunto, mensagem, vagaRelacionada, vagaId }) {
    const session = await this._session();
    if (!session) return { error: 'Usuário não autenticado' };

    let realVagaId = vagaId || null;
    if (!realVagaId && vagaRelacionada) {
      const { data } = await supabaseClient.from('vagas').select('id').eq('titulo', vagaRelacionada).limit(1).maybeSingle();
      realVagaId = data?.id || null;
    }

    const { data, error } = await supabaseClient.from('mensagens').insert({
      remetente_id: session.user.id,
      destinatario_id: destinatarioId,
      assunto: assunto || '',
      conteudo: mensagem || '',
      vaga_id: realVagaId
    }).select().single();

    if (error) return { error: error.message || 'Erro ao enviar mensagem' };
    return { success: true, id: data.id };
  },

  async listarEnviadasPelaEmpresa() {
    return this._listar('remetente_id');
  },

  async listarRecebidasPeloAluno() {
    return this._listar('destinatario_id');
  },

  async marcarComoLida(msgId) {
    const { error } = await supabaseClient.from('mensagens')
      .update({ lida: true }).eq('id', msgId);
    if (error) return { error: error.message };
    return { success: true };
  },

  async marcarComoLidaSeNecessario(msg) {
    if (!msg || msg.status !== 'Enviada') return;
    const result = await this.marcarComoLida(msg.id);
    if (!result.error) msg.status = 'Lida';
  },

  async responder(msgId, texto) {
    const session = await this._session();
    if (!session) return { error: 'Usuário não autenticado' };
    if (!texto || !texto.trim()) return { error: 'Escreva uma resposta antes de enviar.' };

    const { data: original, error: originalError } = await supabaseClient
      .from('mensagens').select('remetente_id,vaga_id').eq('id', msgId).single();
    if (originalError || !original) return { error: 'Mensagem original não encontrada' };

    const { error } = await supabaseClient.from('mensagens').insert({
      remetente_id: session.user.id,
      destinatario_id: original.remetente_id,
      conteudo: texto.trim(),
      vaga_id: original.vaga_id,
      resposta_de_id: msgId
    });
    if (error) return { error: error.message || 'Erro ao responder mensagem' };
    return { success: true };
  },

  _paraFormatoAntigo(msg, resposta) {
    return {
      id: msg.id,
      remetenteId: msg.remetente_id,
      destinatarioId: msg.destinatario_id,
      remetenteNome: msg.remetente?.nome || 'Usuário',
      destinatarioNome: msg.destinatario?.nome || 'Usuário',
      assunto: msg.assunto || '',
      mensagem: msg.conteudo,
      vagaRelacionada: msg.vaga?.titulo || '',
      vagaId: msg.vaga_id,
      criadoEm: new Date(msg.data_envio).getTime(),
      status: resposta ? 'Respondida' : (msg.lida ? 'Lida' : 'Enviada'),
      resposta: resposta ? {
        texto: resposta.conteudo,
        criadoEm: new Date(resposta.data_envio).getTime()
      } : null
    };
  }
};
