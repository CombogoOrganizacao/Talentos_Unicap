document.addEventListener(
    "DOMContentLoaded",
    carregarCandidatos
);

async function carregarCandidatos() {

    const container =
        document.getElementById(
            "candidatosContainer"
        );

    const params =
        new URLSearchParams(
            window.location.search
        );

    const vagaId =
        params.get("vaga");

    if (!vagaId) {
        container.innerHTML = `
            <p>
                Nenhuma vaga foi informada.
            </p>
        `;
        return;
    }

    try {

        const resultado =
            await CandidaturaService
                .candidatosDaVaga(
                    vagaId
                );

        if (resultado?.error) {

            container.innerHTML = `
                <p>
                    Erro:
                    ${resultado.error}
                </p>
            `;

            return;
        }

        if (!resultado.length) {

            container.innerHTML = `
                <p>
                    Ainda não existem candidatos
                    para esta vaga.
                </p>
            `;

            return;
        }

        container.innerHTML = "";

        resultado.forEach(
            candidatura => {

                const template =
                    document.getElementById(
                        "candidatoTemplate"
                    );

                const node =
                    template.content.cloneNode(
                        true
                    );

                const usuario =
                    candidatura.usuarios;

                node.querySelector(
                    '[data-role="nome"]'
                ).textContent =
                    usuario?.nome ||
                    "Aluno";

                node.querySelector(
                    '[data-role="data"]'
                ).textContent =
                    formatarData(
                        candidatura.data_candidatura
                    );

                node.querySelector(
                    '[data-role="mensagem"]'
                ).textContent =
                    candidatura.mensagem ||
                    "Nenhuma mensagem enviada.";

                node.querySelector(
                    '[data-role="status"]'
                ).textContent =
                    CandidaturaService.textoStatus(
                        candidatura.status
                    );

                // =====================================
                // CURRÍCULO
                // =====================================

                const linkCurriculo =
                    node.querySelector(
                        '[data-role="curriculo"]'
                    );

                /*
                 * O currículo da empresa usa:
                 *
                 * curriculo-empresa.html?slug=UUID
                 *
                 * O curriculo-empresa.js recebe esse
                 * UUID e chama getPublicProfile().
                 */

                if (candidatura.aluno_id) {

                    linkCurriculo.href =
                        `curriculo-empresa.html?slug=${encodeURIComponent(
                            candidatura.aluno_id
                        )}`;

                    linkCurriculo.target = "_blank";

                } else {

                    linkCurriculo.removeAttribute(
                        "href"
                    );

                    linkCurriculo.removeAttribute(
                        "target"
                    );

                    linkCurriculo.textContent =
                        "Currículo indisponível";

                    linkCurriculo.style.opacity =
                        "0.6";

                    linkCurriculo.style.pointerEvents =
                        "none";
                }

                // =====================================
                // BOTÃO ANÁLISE
                // =====================================

                const botaoAnalise =
                    node.querySelector(
                        '[data-action="analise"]'
                    );

                botaoAnalise.addEventListener(
                    "click",
                    () => alterarStatus(
                        candidatura.id,
                        "EM_ANALISE"
                    )
                );

                // =====================================
                // BOTÃO SELECIONAR
                // =====================================

                const botaoSelecionar =
                    node.querySelector(
                        '[data-action="selecionar"]'
                    );

                botaoSelecionar.addEventListener(
                    "click",
                    () => alterarStatus(
                        candidatura.id,
                        "SELECIONADO"
                    )
                );

                // =====================================
                // BOTÃO RECUSAR
                // =====================================

                const botaoRecusar =
                    node.querySelector(
                        '[data-action="recusar"]'
                    );

                botaoRecusar.addEventListener(
                    "click",
                    () => alterarStatus(
                        candidatura.id,
                        "RECUSADO"
                    )
                );

                container.appendChild(
                    node
                );
            }
        );

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <p>
                Não foi possível carregar
                os candidatos.
            </p>
        `;
    }
}

async function alterarStatus(
    candidaturaId,
    status
) {

    const mensagens = {

        EM_ANALISE:
            "Colocar esta candidatura em análise?",

        SELECIONADO:
            "Deseja selecionar este candidato?",

        RECUSADO:
            "Deseja recusar este candidato?"
    };

    const confirmar =
        confirm(
            mensagens[status]
        );

    if (!confirmar) {
        return;
    }

    const resultado =
        await CandidaturaService
            .atualizarStatus(
                candidaturaId,
                status
            );

    if (resultado?.error) {

        alert(
            resultado.error
        );

        return;
    }

    alert(
        "Status atualizado com sucesso."
    );

    location.reload();
}

function formatarData(data) {

    if (!data) {
        return "-";
    }

    return new Date(data)
        .toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
}
