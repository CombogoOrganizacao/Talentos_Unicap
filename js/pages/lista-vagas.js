(function () {
  "use strict";

  const grid = document.getElementById("vagasGrid");
  const emptyState = document.getElementById("emptyState");
  const emptyTitle = document.getElementById("emptyTitle");
  const emptyDesc = document.getElementById("emptyDesc");
  const template = document.getElementById("vagaCardTemplate");
  const buscaInput = document.getElementById("busca");
  const filtroStatus = document.getElementById("filtroStatus");
  const ordenacaoSelect = document.getElementById("ordenacao");
  const statusTabs = document.getElementById("statusTabs");

  let activeStatusTab = "";

  // ---------- Mapeia status para a classe de badge do projeto ----------
  const STATUS_BADGE_CLASS = {
    Ativa: "badge-green",
    Rascunho: "badge-gray",
    Pausada: "badge-orange",
    Encerrada: "badge-red"
  };

  let vagas = [];

  // "empresa" gerencia as próprias vagas;
  // "aluno" visualiza as vagas abertas.
  let modo = "empresa";


  // ============================================================
  // CARREGAMENTO DAS VAGAS
  // ============================================================

  async function carregarVagas() {
    try {
      const resultado =
        modo === "aluno"
          ? await APIEmpresa.vagas.abertas()
          : await APIEmpresa.vagas.minhas();

      vagas = Array.isArray(resultado)
        ? resultado
        : [];

      await render();

    } catch (error) {

      console.error(
        "Erro ao carregar vagas:",
        error
      );

      vagas = [];

      await render();
    }
  }


  // ============================================================
  // CANDIDATURAS - ALUNO
  // ============================================================

  async function configurarBotaoCandidatura(
    node,
    vaga
  ) {

    const botao =
      node.querySelector(
        '[data-action="candidatar"]'
      );

    if (!botao) {
      return;
    }

    botao.disabled = true;
    botao.textContent = "Verificando...";


    // Verifica se o serviço foi carregado
    if (
      typeof CandidaturaService ===
      "undefined"
    ) {

      console.error(
        "CandidaturaService não foi carregado. " +
        "Verifique se candidatura-service.js está " +
        "antes de lista-vagas.js."
      );

      botao.disabled = false;
      botao.textContent =
        "Candidatar-se";

      return;
    }


    try {

      const candidatura =
        await CandidaturaService
          .verificarCandidatura(
            vaga.id
          );


      if (
        candidatura &&
        candidatura.error
      ) {

        console.error(
          "Erro ao verificar candidatura:",
          candidatura.error
        );

        botao.disabled = false;

        botao.textContent =
          "Candidatar-se";

        return;
      }


      // ----------------------------------------------------------
      // JÁ EXISTE CANDIDATURA
      // ----------------------------------------------------------

      if (candidatura) {

        botao.disabled = true;

        botao.textContent =
          CandidaturaService
            .textoStatus(
              candidatura.status
            );

        botao.classList.add(
          "candidatura-enviada"
        );

        return;
      }


      // ----------------------------------------------------------
      // AINDA NÃO SE CANDIDATOU
      // ----------------------------------------------------------

      botao.disabled = false;

      botao.textContent =
        "Candidatar-se";

      botao.classList.remove(
        "candidatura-enviada"
      );

    } catch (error) {

      console.error(
        "Erro ao configurar candidatura:",
        error
      );

      botao.disabled = false;

      botao.textContent =
        "Candidatar-se";
    }
  }


  async function realizarCandidatura(
    botao,
    vagaId
  ) {

    if (
      typeof CandidaturaService ===
      "undefined"
    ) {

      alert(
        "O serviço de candidaturas não foi carregado. " +
        "Verifique o candidatura-service.js."
      );

      return;
    }


    const confirmar =
      confirm(
        "Deseja realmente se candidatar a esta vaga?"
      );


    if (!confirmar) {
      return;
    }


    botao.disabled = true;

    botao.textContent =
      "Enviando...";


    try {

      const resultado =
        await CandidaturaService
          .candidatar(
            vagaId
          );


      if (
        resultado &&
        resultado.error
      ) {

        alert(
          resultado.error
        );

        botao.disabled = false;

        botao.textContent =
          "Candidatar-se";

        return;
      }


      botao.disabled = true;

      botao.textContent =
        "✓ Candidatura enviada";

      botao.classList.add(
        "candidatura-enviada"
      );


      alert(
        "Candidatura enviada com sucesso!"
      );


    } catch (error) {

      console.error(
        "Erro ao realizar candidatura:",
        error
      );


      alert(
        "Não foi possível enviar sua candidatura."
      );


      botao.disabled = false;

      botao.textContent =
        "Candidatar-se";
    }
  }


  // ============================================================
  // MODO ALUNO
  // ============================================================

  function aplicarModoAluno() {

    const pageTitle =
      document.getElementById(
        "pageTitle"
      );

    const pageDesc =
      document.getElementById(
        "pageDesc"
      );


    if (pageTitle) {

      pageTitle.textContent =
        "Portal de Vagas";
    }


    if (pageDesc) {

      pageDesc.textContent =
        "Confira as oportunidades abertas por empresas parceiras para estudantes e egressos da UNICAP.";
    }


    [
      "btnNovaVaga",
      "emptyCta",
      "statusTabs",
      "filtroStatus"
    ].forEach((id) => {

      const el =
        document.getElementById(id);

      if (el) {
        el.hidden = true;
      }

    });


    if (ordenacaoSelect) {

      const prazoOpt =
        ordenacaoSelect.querySelector(
          'option[value="prazo"]'
        );


      if (prazoOpt) {
        prazoOpt.remove();
      }
    }


    // Botão "Meu Currículo"
    // aparece para aluno/egresso.

    const btnCurriculo =
      document.getElementById(
        "btnMeuCurriculo"
      );


    if (btnCurriculo) {
      btnCurriculo.hidden = false;
    }
  }


  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================

  async function iniciar() {

    try {

      const tipo =
        await Auth._detectarTipoConta();


      if (!tipo) {

        window.location.href =
          "login.html";

        return;
      }


      modo =
        tipo === "empresa"
          ? "empresa"
          : "aluno";


      if (modo === "aluno") {

        aplicarModoAluno();

      } else {

        // Botões de criar vaga
        // só aparecem para empresas.

        [
          "btnNovaVaga",
          "emptyCta"
        ].forEach((id) => {

          const el =
            document.getElementById(id);

          if (el) {
            el.hidden = false;
          }

        });
      }


      await carregarVagas();


    } catch (error) {

      console.error(
        "Erro ao iniciar a página de vagas:",
        error
      );
    }
  }


  // ============================================================
  // HELPERS
  // ============================================================

  function formatDateBR(iso) {

    if (!iso) {
      return "";
    }


    const [
      y,
      m,
      d
    ] = String(iso).split("-");


    if (
      !y ||
      !m ||
      !d
    ) {

      return iso;
    }


    return `${d}/${m}/${y}`;
  }


  function updateCounts(list) {

    const counts = {

      "": list.length,

      Ativa: 0,

      Rascunho: 0,

      Pausada: 0,

      Encerrada: 0
    };


    list.forEach((v) => {

      if (
        counts[v.status] !==
        undefined
      ) {

        counts[v.status]++;
      }

    });


    const countTodas =
      document.getElementById(
        "countTodas"
      );

    const countAtiva =
      document.getElementById(
        "countAtiva"
      );

    const countRascunho =
      document.getElementById(
        "countRascunho"
      );

    const countPausada =
      document.getElementById(
        "countPausada"
      );

    const countEncerrada =
      document.getElementById(
        "countEncerrada"
      );


    if (countTodas) {
      countTodas.textContent =
        counts[""];
    }


    if (countAtiva) {
      countAtiva.textContent =
        counts.Ativa;
    }


    if (countRascunho) {
      countRascunho.textContent =
        counts.Rascunho;
    }


    if (countPausada) {
      countPausada.textContent =
        counts.Pausada;
    }


    if (countEncerrada) {
      countEncerrada.textContent =
        counts.Encerrada;
    }
  }


  function getFiltered() {

    const term =
      buscaInput
        ? buscaInput.value
            .trim()
            .toLowerCase()
        : "";


    const statusFiltro =
      activeStatusTab ||
      (
        filtroStatus
          ? filtroStatus.value
          : ""
      );


    let list =
      vagas.filter((v) => {

        const matchesTerm =
          !term ||

          (v.titulo || "")
            .toLowerCase()
            .includes(term) ||

          (v.empresa || "")
            .toLowerCase()
            .includes(term) ||

          (v.area || "")
            .toLowerCase()
            .includes(term);


        const matchesStatus =
          !statusFiltro ||
          v.status ===
          statusFiltro;


        return (
          matchesTerm &&
          matchesStatus
        );
      });


    const ordem =
      ordenacaoSelect
        ? ordenacaoSelect.value
        : "recentes";


    list.sort((a, b) => {

      if (
        ordem === "titulo"
      ) {

        return (
          a.titulo || ""
        ).localeCompare(
          b.titulo || ""
        );
      }


      if (
        ordem === "prazo"
      ) {

        return (
          a.periodoFim ||
          "9999"
        ).localeCompare(
          b.periodoFim ||
          "9999"
        );
      }


      if (
        ordem === "antigas"
      ) {

        return (
          a.criadoEm ||
          ""
        ).localeCompare(
          b.criadoEm ||
          ""
        );
      }


      // Recentes
      return (
        b.criadoEm ||
        ""
      ).localeCompare(
        a.criadoEm ||
        ""
      );
    });


    return list;
  }


  function closeAllDropdowns() {

    document
      .querySelectorAll(
        ".vaga-dropdown"
      )
      .forEach((d) => {

        d.hidden = true;
      });


    document
      .querySelectorAll(
        ".icon-btn"
      )
      .forEach((b) => {

        b.setAttribute(
          "aria-expanded",
          "false"
        );
      });
  }


  // ============================================================
  // RENDERIZAÇÃO
  // ============================================================

  async function render() {

    if (
      !grid ||
      !template
    ) {

      console.error(
        "Elementos necessários para renderizar as vagas não foram encontrados."
      );

      return;
    }


    updateCounts(
      vagas
    );


    const filtered =
      getFiltered();


    grid.innerHTML =
      "";


    // ----------------------------------------------------------
    // NENHUMA VAGA
    // ----------------------------------------------------------

    if (!vagas.length) {

      if (emptyState) {
        emptyState.hidden = false;
      }


      if (emptyTitle) {

        emptyTitle.textContent =
          modo === "aluno"

            ? "Nenhuma vaga aberta no momento"

            : "Nenhuma vaga cadastrada ainda";
      }


      if (emptyDesc) {

        emptyDesc.textContent =
          modo === "aluno"

            ? "Volte em breve: as empresas parceiras publicam novas oportunidades com frequência."

            : "Publique a primeira oportunidade para estudantes e egressos da UNICAP.";
      }


      grid.hidden = true;

      return;
    }


    // ----------------------------------------------------------
    // FILTRO NÃO ENCONTROU NADA
    // ----------------------------------------------------------

    if (!filtered.length) {

      if (emptyState) {
        emptyState.hidden = false;
      }


      if (emptyTitle) {

        emptyTitle.textContent =
          "Nenhuma vaga encontrada";
      }


      if (emptyDesc) {

        emptyDesc.textContent =
          "Ajuste a busca ou os filtros para ver outras vagas.";
      }


      grid.hidden = true;

      return;
    }


    if (emptyState) {
      emptyState.hidden = true;
    }


    grid.hidden = false;


    // ----------------------------------------------------------
    // RENDERIZA OS CARDS
    // ----------------------------------------------------------

    for (
      const vaga of filtered
    ) {

      const node =
        template.content.cloneNode(
          true
        );


      const card =
        node.querySelector(
          ".vaga-card"
        );


      if (!card) {

        console.error(
          "O template vagaCardTemplate não possui .vaga-card."
        );

        continue;
      }


      card.dataset.id =
        vaga.id;


      // --------------------------------------------------------
      // STATUS
      // --------------------------------------------------------

      const statusEl =
        node.querySelector(
          '[data-role="status"]'
        );


      const status =
        vaga.status ||
        "Ativa";


      if (statusEl) {

        statusEl.textContent =
          status;


        statusEl.classList.add(
          STATUS_BADGE_CLASS[
            status
          ] ||
          "badge-gray"
        );
      }


      // --------------------------------------------------------
      // TÍTULO
      // --------------------------------------------------------

      const tituloEl =
        node.querySelector(
          '[data-role="titulo"]'
        );


      if (tituloEl) {

        tituloEl.textContent =
          vaga.titulo ||
          "Vaga sem título";
      }


      // --------------------------------------------------------
      // EMPRESA
      // --------------------------------------------------------

      const empresaEl =
        node.querySelector(
          '[data-role="empresa"]'
        );


      if (empresaEl) {

        empresaEl.textContent =
          vaga.empresa ||
          "";
      }


      // --------------------------------------------------------
      // LOGO
      // --------------------------------------------------------

      const logoEl =
        node.querySelector(
          '[data-role="logo"]'
        );


      if (logoEl) {

        if (vaga.empresaLogo) {

          const img =
            document.createElement(
              "img"
            );


          img.src =
            vaga.empresaLogo;


          img.alt = "";


          img.loading =
            "lazy";


          logoEl.appendChild(
            img
          );

        } else {

          logoEl.textContent =
            (
              (
                vaga.empresa ||
                "?"
              )
                .trim()[0] ||
              "?"
            ).toUpperCase();
        }
      }


      // --------------------------------------------------------
      // CARGA HORÁRIA
      // --------------------------------------------------------

      const cargaEl =
        node.querySelector(
          '[data-role="carga"]'
        );


      if (cargaEl) {

        cargaEl.textContent =
          "⏱ " +
          (
            vaga.carga ||
            "—"
          );
      }


      // --------------------------------------------------------
      // LOCAL
      // --------------------------------------------------------

      const localEl =
        node.querySelector(
          '[data-role="local"]'
        );


      if (localEl) {

        localEl.textContent =
          "📍 " +
          (
            vaga.local ||
            "—"
          );
      }


      // --------------------------------------------------------
      // SALÁRIO
      // --------------------------------------------------------

      const salarioEl =
        node.querySelector(
          '[data-role="salario"]'
        );


      if (salarioEl) {

        salarioEl.textContent =
          "$ " +
          (
            vaga.remuneracao ||
            "—"
          );
      }


      // --------------------------------------------------------
      // DESCRIÇÃO
      // --------------------------------------------------------

      const descEl =
        node.querySelector(
          '[data-role="descricao"]'
        );


      if (descEl) {

        descEl.textContent =
          vaga.descricao ||
          "";


        descEl.hidden =
          !vaga.descricao;
      }


      // --------------------------------------------------------
      // REQUISITOS
      // --------------------------------------------------------

      const reqs =
        Array.isArray(
          vaga.habilidadesRequisitadas
        )
          ? vaga.habilidadesRequisitadas
          : [];


      const reqEl =
        node.querySelector(
          '[data-role="requisitos"]'
        );


      if (reqEl) {

        reqEl.textContent =
          reqs.length

            ? "Requisitos: " +
              reqs.join(", ")

            : "";


        reqEl.hidden =
          !reqs.length;
      }


      // --------------------------------------------------------
      // PRAZO
      // --------------------------------------------------------

      const prazoFim =
        formatDateBR(
          vaga.periodoFim
        );


      const prazoEl =
        node.querySelector(
          '[data-role="prazo"]'
        );


      if (prazoEl) {

        prazoEl.textContent =
          prazoFim

            ? `Seleção até ${prazoFim}`

            : "Sem prazo definido";
      }


      // ========================================================
      // MODO ALUNO
      // ========================================================

      if (
        modo === "aluno"
      ) {

        // Remove o menu administrativo
        // da empresa.

        const menu =
          node.querySelector(
            ".vaga-menu"
          );


        if (menu) {
          menu.remove();
        }


        // Remove o botão de divulgar
        // do aluno.

        const instagramBtn =
          node.querySelector(
            '[data-action="instagram-footer"]'
          );


        if (instagramBtn) {
          instagramBtn.remove();
        }


        // Mantém o botão
        // Candidatar-se.


        // Mantém o comportamento
        // anterior do projeto.

        if (salarioEl) {
          salarioEl.remove();
        }


        if (prazoEl) {
          prazoEl.remove();
        }


        // Verifica se já existe
        // candidatura.

        await configurarBotaoCandidatura(
          node,
          vaga
        );
      }


      // ========================================================
      // MODO EMPRESA
      // ========================================================

      if (
        modo === "empresa"
      ) {

        const pausarBtn =
          node.querySelector(
            '[data-role="pausar-btn"]'
          );


        if (pausarBtn) {

          pausarBtn.textContent =
            status === "Pausada"

              ? "Reativar vaga"

              : "Pausar vaga";
        }


        // Caso o botão "Ver candidatos"
        // já exista no HTML.

        const candidatosBtn =
          node.querySelector(
            '[data-action="candidatos"]'
          );


        if (candidatosBtn) {

          candidatosBtn.dataset.vagaId =
            String(
              vaga.id
            );
        }
      }


      grid.appendChild(
        node
      );
    }
  }


  // ============================================================
  // AÇÕES DOS CARDS
  // ============================================================

  grid.addEventListener(
    "click",
    async (event) => {

      const card =
        event.target.closest(
          ".vaga-card"
        );


      if (!card) {
        return;
      }


      const id =
        card.dataset.id;


      const vaga =
        vagas.find(
          (v) =>
            String(v.id) ===
            String(id)
        );


      if (!vaga) {
        return;
      }


      // ========================================================
      // ALUNO - CANDIDATAR-SE
      // ========================================================

      if (
        modo === "aluno"
      ) {

        const actionEl =
          event.target.closest(
            '[data-action="candidatar"]'
          );


        if (!actionEl) {
          return;
        }


        if (
          actionEl.disabled
        ) {
          return;
        }


        await realizarCandidatura(
          actionEl,
          vaga.id
        );


        return;
      }


      // ========================================================
      // EMPRESA - MENU
      // ========================================================

      if (
        event.target.closest(
          '[data-action="menu"]'
        )
      ) {

        const dropdown =
          card.querySelector(
            '[data-role="dropdown"]'
          );


        if (!dropdown) {
          return;
        }


        const isHidden =
          dropdown.hidden;


        closeAllDropdowns();


        dropdown.hidden =
          !isHidden;


        const menuButton =
          event.target.closest(
            ".icon-btn"
          );


        if (menuButton) {

          menuButton.setAttribute(
            "aria-expanded",
            String(
              isHidden
            )
          );
        }


        return;
      }


      const actionEl =
        event.target.closest(
          "[data-action]"
        );


      const action =
        actionEl &&
        actionEl.dataset.action;


      if (
        !action
      ) {
        return;
      }


      // ========================================================
      // VER CANDIDATOS
      // ========================================================

      if (
        action ===
        "candidatos"
      ) {

        window.location.href =
          "candidaturas-vaga.html?vaga=" +
          encodeURIComponent(
            vaga.id
          );


        return;
      }


      // ========================================================
      // INSTAGRAM
      // ========================================================

      if (
        action === "instagram" ||
        action === "instagram-footer"
      ) {

        goToInstagramExport(
          vaga
        );

        return;
      }


      // ========================================================
      // PAUSAR / REATIVAR
      // ========================================================

      if (
        action === "pausar"
      ) {

        const resultado =
          await APIEmpresa.vagas.pausar(
            vaga.id,
            vaga.status !==
              "Pausada"
          );


        if (
          resultado &&
          resultado.error
        ) {

          alert(
            resultado.error
          );

          return;
        }


        closeAllDropdowns();


        await carregarVagas();


        return;
      }


      // ========================================================
      // ENCERRAR
      // ========================================================

      if (
        action === "encerrar"
      ) {

        const resultado =
          await APIEmpresa.vagas.encerrar(
            vaga.id
          );


        if (
          resultado &&
          resultado.error
        ) {

          alert(
            resultado.error
          );

          return;
        }


        closeAllDropdowns();


        await carregarVagas();


        return;
      }


      // ========================================================
      // EXCLUIR
      // ========================================================

      if (
        action === "excluir"
      ) {

        const confirmar =
          confirm(
            `Excluir a vaga "${vaga.titulo}"? Essa ação não pode ser desfeita.`
          );


        if (!confirmar) {
          return;
        }


        const resultado =
          await APIEmpresa.vagas.excluir(
            vaga.id
          );


        if (
          resultado &&
          resultado.error
        ) {

          alert(
            resultado.error
          );

          return;
        }


        closeAllDropdowns();


        await carregarVagas();
      }
    }
  );


  // ============================================================
  // INSTAGRAM
  // ============================================================

  function goToInstagramExport(
    vaga
  ) {

    try {

      localStorage.setItem(
        "talentosUnicap.ultimaVagaPublicada",
        JSON.stringify(vaga)
      );

    } catch (err) {

      console.warn(
        "Não foi possível salvar a vaga no localStorage.",
        err
      );
    }


    const encoded =
      btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify(vaga)
          )
        )
      );


    window.location.href =
      "exportacao-instagram.html?vaga=" +
      encoded;
  }


  // ============================================================
  // FECHAR DROPDOWNS AO CLICAR FORA
  // ============================================================

  document.addEventListener(
    "click",
    (event) => {

      if (
        !event.target.closest(
          ".vaga-menu"
        )
      ) {

        closeAllDropdowns();
      }
    }
  );


  // ============================================================
  // BUSCA
  // ============================================================

  if (buscaInput) {

    buscaInput.addEventListener(
      "input",
      () => {

        render();
      }
    );
  }


  // ============================================================
  // FILTRO DE STATUS
  // ============================================================

  if (filtroStatus) {

    filtroStatus.addEventListener(
      "change",
      () => {

        activeStatusTab =
          "";


        if (statusTabs) {

          statusTabs
            .querySelectorAll(
              ".tab-btn"
            )
            .forEach(
              (t) =>
                t.classList.remove(
                  "active"
                )
            );


          const todasTab =
            statusTabs.querySelector(
              '[data-status=""]'
            );


          if (todasTab) {

            todasTab.classList.add(
              "active"
            );
          }
        }


        render();
      }
    );
  }


  // ============================================================
  // ORDENAÇÃO
  // ============================================================

  if (
    ordenacaoSelect
  ) {

    ordenacaoSelect.addEventListener(
      "change",
      () => {

        render();
      }
    );
  }


  // ============================================================
  // ABAS DE STATUS
  // ============================================================

  if (statusTabs) {

    statusTabs.addEventListener(
      "click",
      (event) => {

        const tab =
          event.target.closest(
            ".tab-btn"
          );


        if (!tab) {
          return;
        }


        statusTabs
          .querySelectorAll(
            ".tab-btn"
          )
          .forEach(
            (t) =>
              t.classList.remove(
                "active"
              )
          );


        tab.classList.add(
          "active"
        );


        activeStatusTab =
          tab.dataset.status;


        if (filtroStatus) {

          filtroStatus.value =
            "";
        }


        render();
      }
    );
  }


  

  iniciar();

})();