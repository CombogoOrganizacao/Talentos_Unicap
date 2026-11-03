// =========================================================
// SERVIÇO DE CANDIDATURAS
// Status: ENVIADA | EM_ANALISE | SELECIONADO | RECUSADO | CANCELADA
// =========================================================
(function () {
  "use strict";

  const STATUS_TEXTO = {
    ENVIADA: "Candidatura enviada",
    EM_ANALISE: "Em análise",
    SELECIONADO: "Selecionado",
    RECUSADO: "Não selecionado",
    CANCELADA: "Cancelada"
  };

  function db() {
    return window.supabaseClient;
  }

  function erro(e, fallback) {
    console.error(fallback, e);
    return { error: (e && e.message) || fallback };
  }

  window.CandidaturaService = {

    textoStatus(status) {
      return STATUS_TEXTO[status] || status || "";
    },

    async _session() {
      const { data: { session }, error } = await db().auth.getSession();
      if (error) throw new Error(error.message);
      if (!session) throw new Error("Usuário não autenticado.");
      return session;
    },

    // =======================================================
    // ALUNO
    // =======================================================

    // Candidata-se. Se o aluno já tinha cancelado, reativa a mesma candidatura.
    async candidatar(vagaId, mensagem = null) {
      try {
        const session = await this._session();
        const texto = (mensagem || "").trim() || null;

        const { data: existente, error: erroConsulta } = await db()
          .from("candidaturas")
          .select("id, status")
          .eq("vaga_id", vagaId)
          .eq("aluno_id", session.user.id)
          .maybeSingle();

        if (erroConsulta) return erro(erroConsulta, "Não foi possível verificar sua candidatura.");

        if (existente) {
          if (existente.status !== "CANCELADA") {
            return { error: "Você já se candidatou a esta vaga." };
          }

          const { data, error } = await db()
            .from("candidaturas")
            .update({ status: "ENVIADA", mensagem: texto })
            .eq("id", existente.id)
            .select()
            .maybeSingle();

          if (error || !data) {
            return {
              error: "Não foi possível se candidatar novamente. A vaga pode ter sido encerrada ou pausada."
            };
          }
          return data;
        }

        const { data, error } = await db()
          .from("candidaturas")
          .insert({ vaga_id: vagaId, aluno_id: session.user.id, mensagem: texto })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") return { error: "Você já se candidatou a esta vaga." };
          if (error.code === "42501") {
            return { error: "Não foi possível se candidatar. A vaga pode ter sido encerrada ou pausada." };
          }
          return erro(error, "Não foi possível realizar a candidatura.");
        }
        return data;

      } catch (e) {
        return erro(e, "Não foi possível realizar a candidatura.");
      }
    },

    // Candidaturas do aluno logado (inclui vagas pausadas/encerradas e a empresa)
    async minhas() {
      try {
        await this._session();
        const { data, error } = await db().rpc("minhas_candidaturas");
        if (error) return erro(error, "Erro ao buscar candidaturas.");
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return erro(e, "Erro ao buscar candidaturas.");
      }
    },

    // Uma única consulta: { "<vagaId>": { id, status } } com tudo que o aluno já fez
    async statusPorVaga() {
      try {
        const session = await this._session();
        const { data, error } = await db()
          .from("candidaturas")
          .select("id, vaga_id, status")
          .eq("aluno_id", session.user.id);

        if (error) return erro(error, "Erro ao verificar candidaturas.");

        const mapa = {};
        (data || []).forEach((c) => {
          mapa[String(c.vaga_id)] = { id: c.id, status: c.status };
        });
        return mapa;
      } catch (e) {
        return erro(e, "Erro ao verificar candidaturas.");
      }
    },

    // Mantido por compatibilidade: devolve a candidatura (ou null)
    async verificarCandidatura(vagaId) {
      try {
        const session = await this._session();
        const { data, error } = await db()
          .from("candidaturas")
          .select("id, status, mensagem, data_candidatura")
          .eq("vaga_id", vagaId)
          .eq("aluno_id", session.user.id)
          .maybeSingle();

        if (error) return erro(error, "Erro ao verificar candidatura.");
        return data ? { ...data, existe: true } : null;
      } catch (e) {
        return erro(e, "Erro ao verificar candidatura.");
      }
    },

    async cancelar(candidaturaId) {
      try {
        const { data, error } = await db()
          .from("candidaturas")
          .update({ status: "CANCELADA" })
          .eq("id", candidaturaId)
          .select()
          .maybeSingle();

        if (error) return erro(error, "Não foi possível cancelar a candidatura.");
        if (!data) {
          return { error: "Não foi possível cancelar: a empresa já decidiu sobre esta candidatura." };
        }
        return data;
      } catch (e) {
        return erro(e, "Não foi possível cancelar a candidatura.");
      }
    },

    // =======================================================
    // EMPRESA
    // =======================================================

    // Candidatos já ordenados do melhor encaixe para o pior
    async candidatosDaVaga(vagaId) {
      try {
        const { data, error } = await db().rpc("candidatos_da_vaga", {
          p_vaga_id: Number(vagaId)
        });
        if (error) return erro(error, "Erro ao buscar candidatos.");
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return erro(e, "Erro ao buscar candidatos.");
      }
    },

    async atualizarStatus(candidaturaId, status) {
      const permitidos = ["EM_ANALISE", "SELECIONADO", "RECUSADO"];
      if (!permitidos.includes(status)) return { error: "Status inválido." };

      try {
        const { data, error } = await db()
          .from("candidaturas")
          .update({ status })
          .eq("id", candidaturaId)
          .select()
          .maybeSingle();

        if (error) return erro(error, "Erro ao atualizar candidatura.");
        if (!data) {
          return { error: "Candidatura não encontrada ou cancelada pelo aluno." };
        }
        return data;
      } catch (e) {
        return erro(e, "Erro ao atualizar candidatura.");
      }
    }
  };

  window.APICandidatura = window.CandidaturaService;
})();
