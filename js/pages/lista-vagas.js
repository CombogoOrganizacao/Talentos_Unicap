// ============================================
// LISTA DE VAGAS
// ============================================

let vagas = [];
let vagasFiltradas = [];
let modo = "empresa";

const STATUS_BADGE_CLASS = {
  Ativa: "badge-green",
  Rascunho: "badge-gray",
  Pausada: "badge-orange",
  Encerrada: "badge-red"
};

// ============================================
// ELEMENTOS DA PÁGINA
// ============================================

const listaVagas =
  document.getElementById("vagasGrid");

const vagaCardTemplate =
  document.getElementById("vagaCardTemplate");

const buscaInput =
  document.getElementById("busca");

const filtroStatus =
  document.getElementById("filtroStatus");

const filtroOrdem =
  document.getElementById("ordenacao");

const btnNovaVaga =
  document.getElementById("btnNovaVaga");

const btnMeuCurriculo =
  document.getElementById("btnMeuCurriculo");

const btnMinhasCandidaturas =
  document.getElementById("btnMinhasCandidaturas");

const btnPainelEmpresa =
  document.getElementById("btnPainelEmpresa");

const emptyState =
  document.getElementById("emptyState");

const emptyCta =
  document.getElementById("emptyCta");

const statusTabs =
  document.querySelectorAll("[data-status]");

// ============================================
// UTILITÁRIOS
// ============================================

function escapeHtml(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarData(data) {
  if (!data) return "";

  // Datas sem horário (YYYY-MM-DD) são formatadas direto,
  // senão o fuso do Brasil mostraria um dia a menos.
  const apenasData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data));
  if (apenasData) {
    return `${apenasData[3]}/${apenasData[2]}/${apenasData[1]}`;
  }


  const d = new Date(data);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleDateString("pt-BR");
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mostrarElemento(elemento, mostrar) {
  if (!elemento) return;

  elemento.hidden = !mostrar;
}

// ============================================
// MODO ALUNO
// ============================================

function aplicarModoAluno() {
  modo = "aluno";

  const titulo =
    document.getElementById("pageTitle");

  const descricao =
    document.getElementById("pageDesc");

  const statusTabsContainer =
    document.getElementById("statusTabs");

  if (titulo) {
    titulo.textContent = "Portal de Vagas";
  }

  if (descricao) {
    descricao.textContent =
      "Encontre oportunidades de estágio e emprego que combinam com seu perfil.";
  }

  mostrarElemento(btnMeuCurriculo, true);
  mostrarElemento(btnMinhasCandidaturas, true);
  mostrarElemento(btnPainelEmpresa, false);

  mostrarElemento(btnNovaVaga, false);
  mostrarElemento(emptyCta, false);
  mostrarElemento(statusTabsContainer, false);
  mostrarElemento(filtroStatus, false);
}

// ============================================
// MODO EMPRESA
// ============================================

function aplicarModoEmpresa() {
  modo = "empresa";

  const titulo =
    document.getElementById("pageTitle");

  const descricao =
    document.getElementById("pageDesc");

  const statusTabsContainer =
    document.getElementById("statusTabs");

  if (titulo) {
    titulo.textContent = "Minhas Vagas";
  }

  if (descricao) {
    descricao.textContent =
      "Acompanhe, edite e gerencie todas as oportunidades cadastradas para estudantes e egressos da UNICAP.";
  }

  mostrarElemento(btnMeuCurriculo, false);
  mostrarElemento(btnMinhasCandidaturas, false);
  mostrarElemento(btnPainelEmpresa, true);

  mostrarElemento(btnNovaVaga, true);
  mostrarElemento(emptyCta, true);
  mostrarElemento(statusTabsContainer, true);
  mostrarElemento(filtroStatus, true);
}

// ============================================
// CARREGAR VAGAS
// ============================================

async function carregarVagas() {
  if (
    !window.APIEmpresa ||
    !APIEmpresa.vagas
  ) {
    console.error(
      "APIEmpresa não foi carregada."
    );
    return;
  }

  if (listaVagas) {
    listaVagas.innerHTML = `
      <div class="loading">
        Carregando vagas...
      </div>
    `;
  }

  try {
    let resultado;

    if (modo === "aluno") {
      resultado =
        await APIEmpresa.vagas.abertas();
    } else {
      resultado =
        await APIEmpresa.vagas.minhas();
    }

    if (resultado?.error) {
      console.error(resultado.error);

      if (listaVagas) {
        listaVagas.innerHTML = `
          <div class="empty-state">
            <h3>Não foi possível carregar as vagas</h3>
            <p>${escapeHtml(resultado.error)}</p>
          </div>
        `;
      }

      return;
    }

    vagas =
      Array.isArray(resultado)
        ? resultado
        : [];

    await carregarStatusCandidaturas();

    atualizarContadores();
    aplicarFiltros();

  } catch (erro) {
    console.error(
      "Erro ao carregar vagas:",
      erro
    );

    if (listaVagas) {
      listaVagas.innerHTML = `
        <div class="empty-state">
          <h3>Erro ao carregar vagas</h3>
          <p>Tente novamente.</p>
        </div>
      `;
    }
  }
}

// ============================================
// CONTADORES
// ============================================

function atualizarContadores() {
  const mapa = {
    "": "countTodas",
    "Ativa": "countAtiva",
    "Rascunho": "countRascunho",
    "Pausada": "countPausada",
    "Encerrada": "countEncerrada"
  };

  Object.entries(mapa).forEach(
    ([status, id]) => {
      const elemento =
        document.getElementById(id);

      if (!elemento) return;

      let quantidade;

      if (!status) {
        quantidade = vagas.length;
      } else {
        quantidade = vagas.filter(
          vaga =>
            String(vaga.status || "") ===
              status ||
            String(vaga.status || "") ===
              ({
                Ativa: "ABERTA",
                Pausada: "PAUSADA",
                Encerrada: "FECHADA"
              }[status] || status)
        ).length;
      }

      elemento.textContent = quantidade;
    }
  );
}

// ============================================
// FILTROS
// ============================================

function aplicarFiltros() {
  const busca =
    normalizarTexto(buscaInput?.value);

  const status =
    filtroStatus?.value || "";

  vagasFiltradas =
    vagas.filter(vaga => {
      const textoBusca =
        normalizarTexto(
          [
            vaga.titulo,
            vaga.empresa,
            vaga.descricao,
            vaga.area,
            vaga.local
          ].join(" ")
        );

      const correspondeBusca =
        !busca ||
        textoBusca.includes(busca);

      let correspondeStatus = true;

      if (
        modo === "empresa" &&
        status
      ) {
        const statusVaga =
          String(vaga.status || "");

        if (status === "Ativa") {
          correspondeStatus =
            statusVaga === "Ativa" ||
            statusVaga === "ABERTA";
        } else if (
          status === "Rascunho"
        ) {
          correspondeStatus =
            statusVaga === "Rascunho";
        } else if (
          status === "Pausada"
        ) {
          correspondeStatus =
            statusVaga === "Pausada" ||
            statusVaga === "PAUSADA";
        } else if (
          status === "Encerrada"
        ) {
          correspondeStatus =
            statusVaga === "Encerrada" ||
            statusVaga === "FECHADA";
        }
      }

      return (
        correspondeBusca &&
        correspondeStatus
      );
    });

  aplicarOrdenacao();
  render();
}

// ============================================
// ORDENAÇÃO
// ============================================

function aplicarOrdenacao() {
  if (!filtroOrdem) return;

  const ordem =
    filtroOrdem.value;

  if (ordem === "titulo") {
    vagasFiltradas.sort(
      (a, b) =>
        String(a.titulo || "")
          .localeCompare(
            String(b.titulo || ""),
            "pt-BR"
          )
    );
  }

  if (ordem === "recentes") {
    vagasFiltradas.sort(
      (a, b) =>
        new Date(b.criadoEm || 0) -
        new Date(a.criadoEm || 0)
    );
  }

  if (ordem === "antigas") {
    vagasFiltradas.sort(
      (a, b) =>
        new Date(a.criadoEm || 0) -
        new Date(b.criadoEm || 0)
    );
  }

  if (ordem === "prazo") {
    vagasFiltradas.sort(
      (a, b) => {
        const dataA =
          a.periodoFim
            ? new Date(a.periodoFim).getTime()
            : Infinity;

        const dataB =
          b.periodoFim
            ? new Date(b.periodoFim).getTime()
            : Infinity;

        return dataA - dataB;
      }
    );
  }
}

// ============================================
// BOTÃO DE CANDIDATURA
// ============================================

// Candidaturas do aluno logado: { "<vagaId>": { id, status } }
let candidaturasPorVaga = {};

async function carregarStatusCandidaturas() {
  candidaturasPorVaga = {};

  if (modo !== "aluno" || !window.CandidaturaService) return;

  const mapa = await CandidaturaService.statusPorVaga();

  if (mapa && !mapa.error) {
    candidaturasPorVaga = mapa;
  } else if (mapa && mapa.error) {
    console.warn("Não foi possível carregar suas candidaturas:", mapa.error);
  }
}

function atualizarBotaoCandidatura(botao, vagaId) {
  botao.dataset.vagaId = vagaId;
  botao.disabled = false;
  botao.classList.remove("disabled");
  botao.innerHTML =
    '<i class="ph-fill ph-paper-plane-tilt"></i> Candidatar-se';

  const candidatura = candidaturasPorVaga[String(vagaId)];
  if (!candidatura) return;

  if (candidatura.status === "CANCELADA") {
    botao.innerHTML =
      '<i class="ph-fill ph-paper-plane-tilt"></i> Candidatar-se novamente';
    return;
  }

  const textos = {
    ENVIADA: "✓ Candidatura enviada",
    EM_ANALISE: "Em análise",
    SELECIONADO: "🎉 Selecionado",
    RECUSADO: "Não selecionado"
  };

  botao.disabled = true;
  botao.classList.add("disabled");
  botao.textContent =
    textos[candidatura.status] ||
    CandidaturaService.textoStatus(candidatura.status);
}

function configurarBotaoCandidatura(node, vaga) {
  const botao = node.querySelector('[data-action="candidatar"]');

  if (!botao) return;

  if (modo !== "aluno") {
    botao.remove();
    return;
  }

  atualizarBotaoCandidatura(botao, vaga.id);
}

// ============================================
// REALIZAR CANDIDATURA
// ============================================

async function realizarCandidatura(botao, vagaId) {
  if (!botao || !vagaId) return;

  if (!window.CandidaturaService) {
    alert("Serviço de candidatura não carregado.");
    return;
  }

  const confirmar = confirm(
    "Deseja realmente se candidatar a esta vaga?\n\n" +
    "A empresa poderá ver o seu currículo completo."
  );

  if (!confirmar) return;

  botao.disabled = true;
  botao.textContent = "Enviando...";

  try {
    const resultado = await CandidaturaService.candidatar(vagaId);

    if (resultado?.error) {
      alert(resultado.error);
      atualizarBotaoCandidatura(botao, vagaId);
      return;
    }

    candidaturasPorVaga[String(vagaId)] = {
      id: resultado.id,
      status: "ENVIADA"
    };

    atualizarBotaoCandidatura(botao, vagaId);
    alert("Candidatura enviada com sucesso!");

  } catch (erro) {
    console.error("Erro ao realizar candidatura:", erro);
    alert("Não foi possível realizar a candidatura.");
    atualizarBotaoCandidatura(botao, vagaId);
  }
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function render() {
  if (
    !listaVagas ||
    !vagaCardTemplate
  ) {
    return;
  }

  listaVagas.innerHTML = "";

  if (!vagasFiltradas.length) {
    if (emptyState) {
      emptyState.hidden = false;
    }

    return;
  }

  if (emptyState) {
    emptyState.hidden = true;
  }

  vagasFiltradas.forEach(vaga => {
    const node =
      vagaCardTemplate.content
        .firstElementChild
        .cloneNode(true);

    node.dataset.vagaId =
      vaga.id;

    const status =
      node.querySelector(
        '[data-role="status"]'
      );

    const titulo =
      node.querySelector(
        '[data-role="titulo"]'
      );

    const logo =
      node.querySelector(
        '[data-role="logo"]'
      );

    const empresa =
      node.querySelector(
        '[data-role="empresa"]'
      );

    const carga =
      node.querySelector(
        '[data-role="carga"]'
      );

    const local =
      node.querySelector(
        '[data-role="local"]'
      );

    const salario =
      node.querySelector(
        '[data-role="salario"]'
      );

    const descricao =
      node.querySelector(
        '[data-role="descricao"]'
      );

    const requisitos =
      node.querySelector(
        '[data-role="requisitos"]'
      );

    const prazo =
      node.querySelector(
        '[data-role="prazo"]'
      );

    if (status) {
      if (modo === "aluno") {
        status.remove();
      } else {
        const textoStatus = vaga.status || "Ativa";
        status.textContent = textoStatus;
        status.classList.add(
          STATUS_BADGE_CLASS[textoStatus] || "badge-gray"
        );
      }
    }

    if (titulo) {
      titulo.textContent =
        vaga.titulo ||
        "Vaga sem título";
    }

    if (empresa) {
      empresa.textContent =
        vaga.empresa ||
        "Empresa";
    }

    if (carga) {
      carga.textContent = vaga.carga ? "⏱ " + vaga.carga : "";
    }

    if (local) {
      local.textContent = vaga.local ? "📍 " + vaga.local : "";
    }

    if (salario) {
      salario.textContent = vaga.remuneracao ? "$ " + vaga.remuneracao : "";

      if (
        modo === "aluno" &&
        !vaga.remuneracao
      ) {
        salario.hidden = true;
      }
    }

    if (descricao) {
      descricao.textContent =
        vaga.descricao || "";
    }

    if (logo) {
      if (vaga.empresaLogo) {
        logo.style.backgroundImage =
          `url("${vaga.empresaLogo}")`;
        logo.style.backgroundSize =
          "cover";
        logo.style.backgroundPosition =
          "center";
        logo.textContent = "";
      } else {
        logo.textContent =
          String(
            vaga.empresa || "E"
          )
            .charAt(0)
            .toUpperCase();
      }
    }

    if (requisitos) {
      const habilidades =
        Array.isArray(
          vaga.habilidadesRequisitadas
        )
          ? vaga.habilidadesRequisitadas
          : [];

      requisitos.innerHTML =
        habilidades.length
          ? habilidades
              .map(
                habilidade =>
                  `<span class="tag">${escapeHtml(
                    habilidade
                  )}</span>`
              )
              .join("")
          : "";
    }

    if (prazo) {
      if (vaga.periodoFim) {
        prazo.textContent =
          `Até ${formatarData(
            vaga.periodoFim
          )}`;
      } else {
        prazo.textContent = "";
      }
    }

    if (modo === "aluno") {
      const menu =
        node.querySelector(
          ".vaga-menu"
        );

      if (menu) {
        menu.remove();
      }

      const candidatos =
        node.querySelector(
          '[data-action="candidatos"]'
        );

      if (candidatos) {
        candidatos.remove();
      }

      const instagram =
        node.querySelector(
          '[data-action="instagram-footer"]'
        );

      if (instagram) {
        instagram.remove();
      }

      configurarBotaoCandidatura(
        node,
        vaga
      );
    }

    if (modo === "empresa") {
      const candidatar =
        node.querySelector(
          '[data-action="candidatar"]'
        );

      if (candidatar) {
        candidatar.remove();
      }

      const candidatos =
        node.querySelector(
          '[data-action="candidatos"]'
        );

      if (candidatos) {
        candidatos.dataset.vagaId =
          vaga.id;
      }

      const instagram =
        node.querySelector(
          '[data-action="instagram-footer"]'
        );

      if (instagram) {
        instagram.dataset.vagaId =
          vaga.id;
      }

      const menuInstagram =
        node.querySelector(
          '[data-action="instagram"]'
        );

      if (menuInstagram) {
        menuInstagram.dataset.vagaId =
          vaga.id;
      }

      const pausar =
        node.querySelector(
          '[data-action="pausar"]'
        );

      if (pausar) {
        const pausada =
          String(vaga.status) ===
            "Pausada" ||
          String(vaga.status) ===
            "PAUSADA";

        pausar.textContent =
          pausada
            ? "Reativar vaga"
            : "Pausar vaga";

        pausar.dataset.vagaId =
          vaga.id;
      }

      const encerrar =
        node.querySelector(
          '[data-action="encerrar"]'
        );

      if (encerrar) {
        encerrar.dataset.vagaId =
          vaga.id;
      }

      const excluir =
        node.querySelector(
          '[data-action="excluir"]'
        );

      if (excluir) {
        excluir.dataset.vagaId =
          vaga.id;
      }
    }

    listaVagas.appendChild(node);
  });
}

// ============================================
// MENU
// ============================================

function fecharMenus() {
  document
    .querySelectorAll(
      ".vaga-dropdown"
    )
    .forEach(dropdown => {
      dropdown.hidden = true;
    });
}

function alternarMenu(botao) {
  const menu =
    botao.closest(".vaga-menu");

  if (!menu) return;

  const dropdown =
    menu.querySelector(
      ".vaga-dropdown"
    );

  if (!dropdown) return;

  const aberto =
    !dropdown.hidden;

  fecharMenus();

  dropdown.hidden =
    aberto;
}

// ============================================
// CANDIDATURAS
// ============================================

function abrirCandidaturas(
  vagaId
) {
  if (!vagaId) return;

  window.location.href =
    "candidaturas-vaga.html?vaga=" +
    encodeURIComponent(vagaId);
}

// ============================================
// INSTAGRAM
// ============================================

function compartilharInstagram(vagaId) {
  const vaga = vagas.find(
    (item) => String(item.id) === String(vagaId)
  );

  if (!vaga) return;

  try {
    localStorage.setItem(
      "talentosUnicap.ultimaVagaPublicada",
      JSON.stringify(vaga)
    );
  } catch (erro) {}

  const encoded = btoa(
    unescape(encodeURIComponent(JSON.stringify(vaga)))
  );

  window.location.href = "exportacao-instagram.html?vaga=" + encoded;
}

// ============================================
// PAUSAR / REATIVAR
// ============================================

async function pausarVaga(
  vagaId,
  botao
) {
  const vaga =
    vagas.find(
      item =>
        String(item.id) ===
        String(vagaId)
    );

  if (!vaga) return;

  const pausada =
    String(vaga.status) ===
      "Pausada" ||
    String(vaga.status) ===
      "PAUSADA";

  const confirmar =
    confirm(
      pausada
        ? "Deseja reativar esta vaga?"
        : "Deseja pausar esta vaga?"
    );

  if (!confirmar) return;

  if (botao) {
    botao.disabled = true;
  }

  try {
    const resultado =
      await APIEmpresa.vagas.pausar(
        vagaId,
        !pausada
      );

    if (resultado?.error) {
      alert(resultado.error);
      return;
    }

    await carregarVagas();

  } catch (erro) {
    console.error(
      "Erro ao alterar vaga:",
      erro
    );

    alert(
      "Não foi possível alterar o status da vaga."
    );

  } finally {
    if (botao) {
      botao.disabled = false;
    }
  }
}

// ============================================
// ENCERRAR
// ============================================

async function encerrarVaga(
  vagaId
) {
  const confirmar =
    confirm(
      "Deseja realmente encerrar esta vaga?"
    );

  if (!confirmar) return;

  try {
    const resultado =
      await APIEmpresa.vagas.encerrar(
        vagaId
      );

    if (resultado?.error) {
      alert(resultado.error);
      return;
    }

    await carregarVagas();

  } catch (erro) {
    console.error(
      "Erro ao encerrar vaga:",
      erro
    );

    alert(
      "Não foi possível encerrar a vaga."
    );
  }
}

// ============================================
// EXCLUIR
// ============================================

async function excluirVaga(
  vagaId
) {
  const confirmar =
    confirm(
      "Deseja realmente excluir esta vaga? Esta ação não pode ser desfeita."
    );

  if (!confirmar) return;

  try {
    const resultado =
      await APIEmpresa.vagas.excluir(
        vagaId
      );

    if (resultado?.error) {
      alert(resultado.error);
      return;
    }

    await carregarVagas();

  } catch (erro) {
    console.error(
      "Erro ao excluir vaga:",
      erro
    );

    alert(
      "Não foi possível excluir a vaga."
    );
  }
}

// ============================================
// EVENTOS DOS CARDS
// ============================================

if (listaVagas) {
  listaVagas.addEventListener(
    "click",
    async event => {
      const alvo =
        event.target.closest(
          "[data-action]"
        );

      if (!alvo) return;

      const action =
        alvo.dataset.action;

      const vagaId =
        alvo.dataset.vagaId ||
        alvo.closest(
          "[data-vaga-id]"
        )?.dataset.vagaId;

      if (
        modo === "aluno" &&
        action === "candidatar"
      ) {
        await realizarCandidatura(
          alvo,
          vagaId
        );
        return;
      }

      if (modo !== "empresa") {
        return;
      }

      if (action === "menu") {
        alternarMenu(alvo);
        return;
      }

      if (
        action === "candidatos"
      ) {
        abrirCandidaturas(
          vagaId
        );
        return;
      }

      if (
        action === "instagram" ||
        action === "instagram-footer"
      ) {
        await compartilharInstagram(
          vagaId
        );
        return;
      }

      if (action === "pausar") {
        await pausarVaga(
          vagaId,
          alvo
        );
        fecharMenus();
        return;
      }

      if (action === "encerrar") {
        await encerrarVaga(
          vagaId
        );
        fecharMenus();
        return;
      }

      if (action === "excluir") {
        await excluirVaga(
          vagaId
        );
        fecharMenus();
      }
    }
  );
}

document.addEventListener(
  "click",
  event => {
    if (
      !event.target.closest(
        ".vaga-menu"
      )
    ) {
      fecharMenus();
    }
  }
);

// ============================================
// FILTROS
// ============================================

if (buscaInput) {
  buscaInput.addEventListener(
    "input",
    aplicarFiltros
  );
}

if (filtroStatus) {
  filtroStatus.addEventListener(
    "change",
    aplicarFiltros
  );
}

if (filtroOrdem) {
  filtroOrdem.addEventListener(
    "change",
    aplicarFiltros
  );
}

// ============================================
// ABAS DE STATUS
// ============================================

statusTabs.forEach(tab => {
  tab.addEventListener(
    "click",
    () => {
      if (modo !== "empresa") {
        return;
      }

      statusTabs.forEach(item => {
        item.classList.remove(
          "active"
        );
      });

      tab.classList.add("active");

      const status =
        tab.dataset.status || "";

      if (filtroStatus) {
        filtroStatus.value =
          status;
      }

      aplicarFiltros();
    }
  );
});

// ============================================
// INICIALIZAÇÃO
// ============================================

async function iniciar() {
  try {
    if (
      !window.supabaseClient
    ) {
      console.error(
        "supabaseClient não foi carregado."
      );
      return;
    }

    const {
      data: { session },
      error
    } =
      await window.supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "Erro ao verificar sessão:",
        error
      );
      return;
    }

    if (!session) {
      console.warn(
        "Usuário não autenticado."
      );

      window.location.href =
        "login.html";

      return;
    }

    // Detecta o tipo diretamente no banco.
    // Isso evita depender do estado interno do Auth
    // para montar a página.
    const {
      data: usuario,
      error: erroUsuario
    } =
      await window.supabaseClient
        .from("usuarios")
        .select("tipo_conta")
        .eq("id", session.user.id)
        .single();

    if (erroUsuario) {
      console.error(
        "Erro ao identificar tipo da conta:",
        erroUsuario
      );

      return;
    }

    const tipoConta =
      normalizarTexto(
        usuario?.tipo_conta
      );

    console.log(
      "Tipo de conta detectado:",
      usuario?.tipo_conta
    );

    if (
      tipoConta === "aluno" ||
      tipoConta === "estudante"
    ) {
      aplicarModoAluno();
    } else if (
      tipoConta === "empresa"
    ) {
      aplicarModoEmpresa();
    } else {
      console.warn(
        "Tipo de conta desconhecido:",
        usuario?.tipo_conta
      );

      return;
    }

    await carregarVagas();

  } catch (erro) {
    console.error(
      "Erro ao inicializar lista de vagas:",
      erro
    );
  }
}

iniciar();
