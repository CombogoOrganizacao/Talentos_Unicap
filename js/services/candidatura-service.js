const CandidaturaService = {

    // =========================================================
    // SESSÃO
    // =========================================================

    async _session() {
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw new Error(error.message);
        }

        if (!session) {
            throw new Error("Usuário não autenticado.");
        }

        return session;
    },


    // =========================================================
    // ALUNO - CANDIDATAR-SE
    // =========================================================

    async candidatar(vagaId, mensagem = null) {

        try {

            const session = await this._session();

            const { data: candidaturaExistente, error: consultaError } =
                await supabaseClient
                    .from("candidaturas")
                    .select("id, status")
                    .eq("vaga_id", vagaId)
                    .eq("aluno_id", session.user.id)
                    .maybeSingle();

            if (consultaError) {
                return { error: consultaError.message };
            }

            if (candidaturaExistente) {
                return {
                    error: "Você já se candidatou a esta vaga."
                };
            }

            const { data, error } = await supabaseClient
                .from("candidaturas")
                .insert({
                    vaga_id: vagaId,
                    aluno_id: session.user.id,
                    mensagem: mensagem || null
                })
                .select()
                .single();

            if (error) {

                // Candidatura duplicada
                if (error.code === "23505") {
                    return {
                        error: "Você já se candidatou a esta vaga."
                    };
                }

                return {
                    error: error.message
                };
            }

            return data;

        } catch (error) {

            console.error(
                "Erro ao realizar candidatura:",
                error
            );

            return {
                error:
                    error.message ||
                    "Não foi possível realizar a candidatura."
            };
        }
    },


    // =========================================================
    // ALUNO - MINHAS CANDIDATURAS
    // =========================================================

    async minhas() {

        try {

            const session = await this._session();

            const { data, error } = await supabaseClient
                .from("candidaturas")
                .select(`
                    id,
                    vaga_id,
                    status,
                    mensagem,
                    data_candidatura,

                    vagas (
                        id,
                        titulo,
                        descricao,
                        area,
                        modalidade,
                        local,
                        remuneracao,
                        periodo_fim
                    )
                `)
                .eq("aluno_id", session.user.id)
                .order("data_candidatura", {
                    ascending: false
                });

            if (error) {
                return {
                    error: error.message
                };
            }

            return data || [];

        } catch (error) {

            console.error(
                "Erro ao buscar candidaturas:",
                error
            );

            return {
                error: error.message
            };
        }
    },


    // =========================================================
    // ALUNO - CANCELAR CANDIDATURA
    // =========================================================

    async cancelar(candidaturaId) {

        try {

            const { data, error } = await supabaseClient
                .from("candidaturas")
                .update({
                    status: "CANCELADA"
                })
                .eq("id", candidaturaId)
                .select()
                .single();

            if (error) {
                return {
                    error: error.message
                };
            }

            return data;

        } catch (error) {

            return {
                error: error.message
            };
        }
    },


    // =========================================================
    // EMPRESA - VER CANDIDATOS DA VAGA
    // =========================================================

    async candidatosDaVaga(vagaId) {

        try {

            const { data, error } = await supabaseClient
                .from("candidaturas")
                .select(`
                    id,
                    aluno_id,
                    status,
                    mensagem,
                    data_candidatura,

                    usuarios (
                        id,
                        nome
                    )
                `)
                .eq("vaga_id", vagaId)
                .order("data_candidatura", {
                    ascending: false
                });

            if (error) {

                console.error(
                    "Erro ao buscar candidatos:",
                    error
                );

                return {
                    error: error.message
                };
            }

            return data || [];

        } catch (error) {

            return {
                error: error.message
            };
        }
    },


    // =========================================================
    // EMPRESA - ALTERAR STATUS
    // =========================================================

    async atualizarStatus(candidaturaId, status) {

        const statusPermitidos = [
            "EM_ANALISE",
            "SELECIONADO",
            "RECUSADO"
        ];

        if (!statusPermitidos.includes(status)) {

            return {
                error: "Status inválido."
            };
        }

        try {

            const { data, error } = await supabaseClient
                .from("candidaturas")
                .update({
                    status: status
                })
                .eq("id", candidaturaId)
                .select()
                .single();

            if (error) {

                console.error(
                    "Erro ao atualizar candidatura:",
                    error
                );

                return {
                    error: error.message
                };
            }

            return data;

        } catch (error) {

            return {
                error: error.message
            };
        }
    },


    // =========================================================
    // VERIFICAR SE ALUNO JÁ SE CANDIDATOU
    // =========================================================

    async verificarCandidatura(vagaId) {

        try {

            const session = await this._session();

            const { data, error } = await supabaseClient
                .from("candidaturas")
                .select(`
                    id,
                    status,
                    mensagem,
                    data_candidatura
                `)
                .eq("vaga_id", vagaId)
                .eq("aluno_id", session.user.id)
                .maybeSingle();

            if (error) {

                return {
                    error: error.message
                };
            }

            return data;

        } catch (error) {

            return {
                error: error.message
            };
        }
    },


    // =========================================================
    // STATUS FORMATADO
    // =========================================================

    textoStatus(status) {

        const statusMap = {

            ENVIADA: "Candidatura enviada",

            EM_ANALISE: "Em análise",

            SELECIONADO: "Selecionado",

            RECUSADO: "Recusado",

            CANCELADA: "Cancelada"
        };

        return statusMap[status] || status;
    }

};