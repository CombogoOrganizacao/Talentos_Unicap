document.addEventListener(
    "DOMContentLoaded",
    carregarCandidaturas
);


async function carregarCandidaturas() {

    const container =
        document.getElementById(
            "candidaturasContainer"
        );

    try {

        const resultado =
            await CandidaturaService.minhas();

        if (resultado?.error) {

            container.innerHTML = `
                <p>
                    Erro ao carregar candidaturas:
                    ${resultado.error}
                </p>
            `;

            return;
        }

        if (!resultado.length) {

            container.innerHTML = `
                <p>
                    Você ainda não se candidatou
                    a nenhuma vaga.
                </p>

                <a href="lista-vagas.html">
                    Ver vagas disponíveis
                </a>
            `;

            return;
        }

        container.innerHTML = "";

        resultado.forEach(
            candidatura => {

                const template =
                    document.getElementById(
                        "candidaturaTemplate"
                    );

                const node =
                    template.content.cloneNode(
                        true
                    );

                const vaga =
                    candidatura.vagas;

                node.querySelector(
                    '[data-role="titulo"]'
                ).textContent =
                    vaga?.titulo ||
                    "Vaga";

                node.querySelector(
                    '[data-role="area"]'
                ).textContent =
                    vaga?.area ||
                    "-";

                node.querySelector(
                    '[data-role="modalidade"]'
                ).textContent =
                    vaga?.modalidade ||
                    "-";

                node.querySelector(
                    '[data-role="local"]'
                ).textContent =
                    vaga?.local ||
                    "-";

                node.querySelector(
                    '[data-role="data"]'
                ).textContent =
                    formatarData(
                        candidatura.data_candidatura
                    );

                node.querySelector(
                    '[data-role="status"]'
                ).textContent =
                    CandidaturaService.textoStatus(
                        candidatura.status
                    );

                const botaoCancelar =
                    node.querySelector(
                        '[data-role="cancelar"]'
                    );

                if (
                    candidatura.status !==
                        "ENVIADA" &&
                    candidatura.status !==
                        "EM_ANALISE"
                ) {

                    botaoCancelar.remove();

                } else {

                    botaoCancelar.addEventListener(
                        "click",
                        () => cancelar(
                            candidatura.id
                        )
                    );
                }

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
                suas candidaturas.
            </p>
        `;
    }
}


async function cancelar(
    candidaturaId
) {

    const confirmar =
        confirm(
            "Deseja cancelar esta candidatura?"
        );

    if (!confirmar) {
        return;
    }

    const resultado =
        await CandidaturaService.cancelar(
            candidaturaId
        );

    if (resultado?.error) {

        alert(
            resultado.error
        );

        return;
    }

    alert(
        "Candidatura cancelada."
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