// ============================================
// LISTA DE VAGAS
// ============================================

let vagas = [];
let vagasFiltradas = [];
let modo = "empresa";

// ============================================
// ELEMENTOS
// ============================================

const listaVagas = document.getElementById("listaVagas");
const vagaCardTemplate = document.getElementById("vagaCardTemplate");

const buscaInput = document.getElementById("busca");
const filtroStatus = document.getElementById("filtroStatus");
const filtroArea = document.getElementById("filtroArea");
const filtroOrdem = document.getElementById("filtroOrdem");

const btnNovaVaga = document.getElementById("btnNovaVaga");
const btnMeuCurriculo = document.getElementById("btnMeuCurriculo");
const btnMinhasCandidaturas = document.getElementById("btnMinhasCandidaturas");
const btnPainelEmpresa = document.getElementById("btnPainelEmpresa");

const emptyState = document.getElementById("emptyState");
const emptyCta = document.getElementById("emptyCta");

const statusTabs = document.querySelectorAll("[data-status]");

// ============================================
// UTILITÁRIOS
// ============================================

function escapeHtml(valor) {
  if (valor === null || valor === undefined) return "";

  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarData(data) {
  if (!data) return "";

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return "";

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
// CONFIGURAÇÃO DO MODO
// ============================================

function aplicarModoAluno() {
  modo = "aluno";

  const titulo = document.querySelector("h1");
  const descricao = document.querySelector(".page-description");

  if (titulo) {
    titulo.textContent = "Portal de Vagas";
  }

  if (descricao) {
    descricao.textContent =
      "Encontre oportunidades de estágio e emprego que combinam com seu perfil.";
  }

  // Botões do topo
  mostrarElemento(btnMeuCurriculo, true);
  mostrarElemento(btnMinhasCandidaturas, true);
  mostrarElemento(btnPainelEmpresa, false);

  // Controles exclusivos da empresa
  mostrarElemento(btnNovaVaga, false);
  mostrarElemento(emptyCta, false);
  mostrarElemento(document.getElementById("statusTabs"), false);
  mostrarElemento(filtroStatus, false);

  // Remove opção de prazo caso exista
  if (filtroOrdem) {
    const opcoes = filtroOrdem.querySelectorAll("option");

    opcoes.forEach(opcao => {
      if (
        normalizarTexto(opcao.textContent).includes("prazo") ||
        normalizarTexto(opcao.value).includes("prazo")
      ) {
        opcao.remove();
      }
    });
  }
}

function aplicarModoEmpresa() {
  modo = "empresa";

  // Botões do topo
  mostrarElemento(btnMeuCurriculo, false);
  mostrarElemento(btnMinhasCandidaturas, false);
  mostrarElemento(btnPainelEmpresa, true);

  // Controles da empresa
  mostrarElemento(btnNovaVaga, true);
  mostrarElemento(emptyCta, true);
  mostrarElemento(document.getElementById("statusTabs"), true);
  mostrarElemento(filtroStatus, true);
}

// ============================================
// CARREGAR VAGAS
// ============================================

async function carregarVagas() {
  if (!window.APIEmpresa || !APIEmpresa.vagas) {
    console.error("APIEmpresa não foi carregada.");
    return;
  }

  listaVagas.innerHTML = `
    <div class="loading">
      Carregando vagas...
    </div>
  `;

  try {
    let resultado;

    if (modo === "aluno") {
      resultado = await APIEmpresa.vagas.abertas();
    } else {
      resultado = await APIEmpresa.vagas.minhas();
    }

    if (resultado?.error) {
      console.error(resultado.error);

      listaVagas.innerHTML = `
        <div class="empty-state">
          <h3>Não foi possível carregar as vagas</h3>
          <p>${escapeHtml(resultado.error)}</p>
        </div>
      `;

      return;
    }

    vagas = Array.isArray(resultado) ? resultado : [];

    preencherFiltroArea();

    aplicarFiltros();
  } catch (erro) {
    console.error("Erro ao carregar vagas:", erro);

    listaVagas.innerHTML = `
      <div class="empty-state">
        <h3>Erro ao carregar vagas</h3>
        <p>Tente novamente.</p>
      </div>
    `;
  }
}

// ============================================
// FILTRO DE ÁREA
// ============================================

function preencherFiltroArea() {
  if (!filtroArea) return;

  const valorAtual = filtroArea.value;

  const areas = [
    ...new Set(
      vagas
        .map(vaga => vaga.area)
        .filter(Boolean)
        .map(area => String(area).trim())
    )
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  filtroArea.innerHTML = `
    <option value="">Todas as áreas</option>
    ${areas
      .map(
        area =>
          `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`
      )
      .join("")}
  `;

  filtroArea.value = valorAtual;
}

// ============================================
// FILTROS
// ============================================

function aplicarFiltros() {
  const busca = normalizarTexto(buscaInput?.value);
  const area = normalizarTexto(filtroArea?.value);
  const status = filtroStatus?.value || "";

  vagasFiltradas = vagas.filter(vaga => {
    const textoBusca = normalizarTexto(
      [
        vaga.titulo,
        vaga.empresa,
        vaga.descricao,
        vaga.area,
        vaga.local
      ].join(" ")
    );

    const correspondeBusca =
      !busca || textoBusca.includes(busca);

    const correspondeArea =
      !area || normalizarTexto(vaga.area) === area;

    let correspondeStatus = true;

    if (modo === "empresa" && status) {
      const statusVaga = String(vaga.status || "");

      if (status === "ABERTA") {
        correspondeStatus =
          statusVaga === "Ativa" ||
          statusVaga === "ABERTA";
      } else if (status === "PAUSADA") {
        correspondeStatus =
          statusVaga === "Pausada" ||
          statusVaga === "PAUSADA";
      } else if (status === "FECHADA") {
        correspondeStatus =
          statusVaga === "Encerrada" ||
          statusVaga === "FECHADA";
      }
    }

    return (
      correspondeBusca &&
      correspondeArea &&
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

  const ordem = filtroOrdem.value;

  if (ordem === "titulo") {
    vagasFiltradas.sort((a, b) =>
      String(a.titulo || "").localeCompare(
        String(b.titulo || ""),
        "pt-BR"
      )
    );
  }

  if (ordem === "empresa") {
    vagasFiltradas.sort((a, b) =>
      String(a.empresa || "").localeCompare(
        String(b.empresa || ""),
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
}

// ============================================
// BOTÃO DE CANDIDATURA
// ============================================

async function configurarBotaoCandidatura(node, vaga) {
  const botao = node.querySelector(
    '[data-action="candidatar"]'
  );

  if (!botao) return;

  // Garante que somente aluno tenha esse botão
  if (modo !== "aluno") {
    botao.remove();
    return;
  }

  botao.dataset.vagaId = vaga.id;

  try {
    if (
      window.CandidaturaService &&
      typeof CandidaturaService.verificarCandidatura === "function"
    ) {
      const resultado =
        await CandidaturaService.verificarCandidatura(vaga.id);

      if (resultado?.error) {
        console.warn(
          "Não foi possível verificar candidatura:",
          resultado.error
        );
        return;
      }

      if (resultado?.existe) {
        botao.disabled = true;

        if (
          window.CandidaturaService &&
          typeof CandidaturaService.textoStatus === "function"
        ) {
          botao.textContent =
            CandidaturaService.textoStatus(
              resultado.status
            );
        } else {
          botao.textContent = "✓ Candidatura enviada";
        }

        botao.classList.add("disabled");
      }
    }
  } catch (erro) {
    console.warn(
      "Erro ao verificar candidatura:",
      erro
    );
  }
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
    "Deseja realmente se candidatar a esta vaga?"
  );

  if (!confirmar) return;

  const textoOriginal = botao.textContent;

  botao.disabled = true;
  botao.textContent = "Enviando...";

  try {
    const resultado =
      await CandidaturaService.candidatar(vagaId);

    if (resultado?.error) {
      alert(resultado.error);

      botao.disabled = false;
      botao.textContent = textoOriginal;

      return;
    }

    botao.textContent = "✓ Candidatura enviada";
    botao.classList.add("disabled");

    alert("Candidatura enviada com sucesso!");
  } catch (erro) {
    console.error(
      "Erro ao realizar candidatura:",
      erro
    );

    alert(
      "Não foi possível realizar a candidatura."
    );

    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function render() {
  if (!listaVagas) return;

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

    // ========================================
    // DADOS BÁSICOS
    // ========================================

    const titulo = node.querySelector(
      "[data-field='titulo']"
    );

    const empresa = node.querySelector(
      "[data-field='empresa']"
    );

    const logo = node.querySelector(
      "[data-field='empresa-logo']"
    );

    const status = node.querySelector(
      "[data-field='status']"
    );

    const carga = node.querySelector(
      "[data-field='carga']"
    );

    const local = node.querySelector(
      "[data-field='local']"
    );

    const salario = node.querySelector(
      "[data-field='remuneracao']"
    );

    const descricao = node.querySelector(
      "[data-field='descricao']"
    );

    const requisitos = node.querySelector(
      "[data-field='requisitos']"
    );

    const prazo = node.querySelector(
      "[data-field='prazo']"
    );

    if (titulo) {
      titulo.textContent =
        vaga.titulo || "Vaga sem título";
    }

    if (empresa) {
      empresa.textContent =
        vaga.empresa || "Empresa";
    }

    if (status) {
      status.textContent =
        vaga.status || "Ativa";
    }

    if (carga) {
      carga.textContent =
        vaga.carga || "";
    }

    if (local) {
      local.textContent =
        vaga.local || "";
    }

    if (salario) {
      salario.textContent =
        vaga.remuneracao || "";
    }

    if (descricao) {
      descricao.textContent =
        vaga.descricao || "";
    }

    if (logo) {
      if (vaga.empresaLogo) {
        logo.src = vaga.empresaLogo;
        logo.alt =
          `Logo de ${vaga.empresa || "empresa"}`;
      } else {
        logo.removeAttribute("src");
        logo.alt = "";
      }
    }

    // ========================================
    // REQUISITOS
    // ========================================

    if (requisitos) {
      const habilidades =
        Array.isArray(vaga.habilidadesRequisitadas)
          ? vaga.habilidadesRequisitadas
          : [];

      requisitos.innerHTML = habilidades.length
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

    // ========================================
    // PRAZO
    // ========================================

    if (prazo) {
      if (vaga.periodoFim) {
        prazo.textContent =
          `Até ${formatarData(vaga.periodoFim)}`;
      } else {
        prazo.textContent = "";
      }
    }

    // ========================================
    // IDENTIFICAÇÃO
    // ========================================

    node.dataset.vagaId = vaga.id;

    // ========================================
    // MODO ALUNO
    // ========================================

    if (modo === "aluno") {
      // Remove menu da empresa
      const menu = node.querySelector(
        ".vaga-menu"
      );

      if (menu) {
        menu.remove();
      }

      // Remove botão de candidatos
      const candidatos = node.querySelector(
        '[data-action="candidatos"]'
      );

      if (candidatos) {
        candidatos.remove();
      }

      // Remove Instagram
      const instagram = node.querySelector(
        '[data-action="instagram-footer"]'
      );

      if (instagram) {
        instagram.remove();
      }

      // Remove salário para aluno
      if (salario) {
        salario.remove();
      }

      // Remove prazo se não existir
      if (
        prazo &&
        !vaga.periodoFim
      ) {
        prazo.remove();
      }

      configurarBotaoCandidatura(
        node,
        vaga
      );
    }

    // ========================================
    // MODO EMPRESA
    // ========================================

    if (modo === "empresa") {
      // Remove botão de candidatura
      const candidatar = node.querySelector(
        '[data-action="candidatar"]'
      );

      if (candidatar) {
        candidatar.remove();
      }

      // Botão de candidatos
      const candidatos = node.querySelector(
        '[data-action="candidatos"]'
      );

      if (candidatos) {
        candidatos.dataset.vagaId =
          vaga.id;

        candidatos.textContent =
          "Ver candidaturas";
      }

      // Instagram
      const instagram = node.querySelector(
        '[data-action="instagram-footer"]'
      );

      if (instagram) {
        instagram.dataset.vagaId =
          vaga.id;
      }

      // Botão de pausar
      const pausar = node.querySelector(
        '[data-action="pausar"]'
      );

      if (pausar) {
        const statusVaga =
          String(vaga.status || "");

        const pausada =
          statusVaga === "Pausada" ||
          statusVaga === "PAUSADA";

        pausar.textContent =
          pausada
            ? "Reativar vaga"
            : "Pausar vaga";

        pausar.dataset.vagaId =
          vaga.id;
      }

      // Botão encerrar
      const encerrar = node.querySelector(
        '[data-action="encerrar"]'
      );

      if (encerrar) {
        encerrar.dataset.vagaId =
          vaga.id;
      }

      // Botão excluir
      const excluir = node.querySelector(
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
// MENU DA VAGA
// ============================================

function fecharMenus() {
  document
    .querySelectorAll(".vaga-menu.open")
    .forEach(menu => {
      menu.classList.remove("open");
    });
}

// ============================================
// VER CANDIDATURAS
// ============================================

function abrirCandidaturas(vagaId) {
  if (!vagaId) return;

  window.location.href =
    "candidaturas-vaga.html?vaga=" +
    encodeURIComponent(vagaId);
}

// ============================================
// INSTAGRAM
// ============================================

async function compartilharInstagram(vagaId) {
  const vaga = vagas.find(
    item => String(item.id) === String(vagaId)
  );

  if (!vaga) return;

  const texto =
    `Confira esta oportunidade: ${vaga.titulo}`;

  try {
    await navigator.clipboard.writeText(texto);

    alert(
      "Texto da vaga copiado. Agora você pode publicar no Instagram."
    );
  } catch (erro) {
    console.error(
      "Erro ao copiar texto:",
      erro
    );

    alert(texto);
  }
}

// ============================================
// AÇÕES DA EMPRESA
// ============================================

async function pausarVaga(vagaId, botao) {
  const vaga = vagas.find(
    item => String(item.id) === String(vagaId)
  );

  if (!vaga) return;

  const pausada =
    String(vaga.status) === "Pausada" ||
    String(vaga.status) === "PAUSADA";

  const novoEstado = !pausada;

  const confirmar = confirm(
    novoEstado
      ? "Deseja pausar esta vaga?"
      : "Deseja reativar esta vaga?"
  );

  if (!confirmar) return;

  if (botao) {
    botao.disabled = true;
  }

  try {
    const resultado =
      await APIEmpresa.vagas.pausar(
        vagaId,
        novoEstado
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

async function encerrarVaga(vagaId) {
  const confirmar = confirm(
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

async function excluirVaga(vagaId) {
  const confirmar = confirm(
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

      // ======================================
      // ALUNO
      // ======================================

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

      // ======================================
      // EMPRESA
      // ======================================

      if (modo !== "empresa") return;

      if (action === "menu") {
        const menu =
          alvo.closest(".vaga-menu");

        if (!menu) return;

        fecharMenus();

        menu.classList.toggle("open");

        return;
      }

      if (action === "candidatos") {
        abrirCandidaturas(vagaId);
        return;
      }

      if (action === "instagram-footer") {
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
        return;
      }

      if (action === "encerrar") {
        await encerrarVaga(vagaId);
        return;
      }

      if (action === "excluir") {
        await excluirVaga(vagaId);
        return;
      }
    }
  );
}

// Fecha menus ao clicar fora
document.addEventListener(
  "click",
  event => {
    if (
      !event.target.closest(".vaga-menu")
    ) {
      fecharMenus();
    }
  }
);

// ============================================
// EVENTOS DOS FILTROS
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

if (filtroArea) {
  filtroArea.addEventListener(
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
      if (modo !== "empresa") return;

      statusTabs.forEach(item => {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      const status =
        tab.dataset.status || "";

      if (filtroStatus) {
        filtroStatus.value = status;
      }

      aplicarFiltros();
    }
  );
});

// ============================================
// BOTÃO NOVA VAGA
// ============================================

if (btnNovaVaga) {
  btnNovaVaga.addEventListener(
    "click",
    () => {
      window.location.href =
        "criar-vaga.html";
    }
  );
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function iniciar() {
  try {
    if (
      !window.Auth ||
      typeof Auth._detectarTipoConta !==
        "function"
    ) {
      console.error(
        "Auth não foi carregado corretamente."
      );

      return;
    }

    const tipoConta =
      await Auth._detectarTipoConta();

    const tipoNormalizado =
      normalizarTexto(tipoConta);

    if (
      tipoNormalizado === "aluno" ||
      tipoNormalizado === "estudante"
    ) {
      aplicarModoAluno();
    } else {
      aplicarModoEmpresa();
    }

    await carregarVagas();
  } catch (erro) {
    console.error(
      "Erro ao inicializar lista de vagas:",
      erro
    );

    // Se não conseguir detectar,
    // mantém o comportamento antigo como empresa.
    aplicarModoEmpresa();

    await carregarVagas();
  }
}

iniciar();
