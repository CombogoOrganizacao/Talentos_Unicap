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

  async function carregarVagas() {
    const resultado = await APIEmpresa.vagas.minhas();
    vagas = Array.isArray(resultado) ? resultado : [];
    render();
  }
  

  // ---------- Helpers ----------
  function formatDateBR(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  function updateCounts(list) {
    const counts = { "": list.length, Ativa: 0, Rascunho: 0, Pausada: 0, Encerrada: 0 };
    list.forEach((v) => {
      if (counts[v.status] !== undefined) counts[v.status]++;
    });
    document.getElementById("countTodas").textContent = counts[""];
    document.getElementById("countAtiva").textContent = counts.Ativa;
    document.getElementById("countRascunho").textContent = counts.Rascunho;
    document.getElementById("countPausada").textContent = counts.Pausada;
    document.getElementById("countEncerrada").textContent = counts.Encerrada;
  }

  function getFiltered() {
    const term = buscaInput.value.trim().toLowerCase();
    const statusFiltro = activeStatusTab || filtroStatus.value;

    let list = vagas.filter((v) => {
      const matchesTerm = !term ||
        (v.titulo || "").toLowerCase().includes(term) ||
        (v.empresa || "").toLowerCase().includes(term) ||
        (v.area || "").toLowerCase().includes(term);
      const matchesStatus = !statusFiltro || v.status === statusFiltro;
      return matchesTerm && matchesStatus;
    });

    const ordem = ordenacaoSelect.value;
    list.sort((a, b) => {
      if (ordem === "titulo") return (a.titulo || "").localeCompare(b.titulo || "");
      if (ordem === "prazo") return (a.periodoFim || "9999").localeCompare(b.periodoFim || "9999");
      if (ordem === "antigas") return (a.criadoEm || "").localeCompare(b.criadoEm || "");
      return (b.criadoEm || "").localeCompare(a.criadoEm || ""); // recentes (default)
    });

    return list;
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".vaga-dropdown").forEach((d) => (d.hidden = true));
    document.querySelectorAll(".icon-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }

  function render() {
    updateCounts(vagas);
    const filtered = getFiltered();

    grid.innerHTML = "";

    if (!vagas.length) {
      emptyState.hidden = false;
      emptyTitle.textContent = "Nenhuma vaga cadastrada ainda";
      emptyDesc.textContent = "Publique a primeira oportunidade para estudantes e egressos da UNICAP.";
      grid.hidden = true;
      return;
    }

    if (!filtered.length) {
      emptyState.hidden = false;
      emptyTitle.textContent = "Nenhuma vaga encontrada";
      emptyDesc.textContent = "Ajuste a busca ou os filtros para ver outras vagas.";
      grid.hidden = true;
      return;
    }

    emptyState.hidden = true;
    grid.hidden = false;

    filtered.forEach((vaga) => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector(".vaga-card");
      card.dataset.id = vaga.id;

      const statusEl = node.querySelector('[data-role="status"]');
      const status = vaga.status || "Ativa";
      statusEl.textContent = status;
      statusEl.classList.add(STATUS_BADGE_CLASS[status] || "badge-gray");

      node.querySelector('[data-role="titulo"]').textContent = vaga.titulo || "Vaga sem título";
      node.querySelector('[data-role="empresa"]').textContent = vaga.empresa || "";
      node.querySelector('[data-role="carga"]').textContent = "⏱ " + (vaga.carga || "—");
      node.querySelector('[data-role="local"]').textContent = "📍 " + (vaga.local || "—");
      node.querySelector('[data-role="salario"]').textContent = "$ " + (vaga.remuneracao || "—");

      const prazoFim = formatDateBR(vaga.periodoFim);
      node.querySelector('[data-role="prazo"]').textContent = prazoFim
        ? `Seleção até ${prazoFim}`
        : "Sem prazo definido";

      const pausarBtn = node.querySelector('[data-role="pausar-btn"]');
      pausarBtn.textContent = status === "Pausada" ? "Reativar vaga" : "Pausar vaga";

      grid.appendChild(node);
    });
  }

  // ---------- Ações do card (delegação de eventos) ----------
  grid.addEventListener("click", async (event) => {
    const card = event.target.closest(".vaga-card");
    if (!card) return;
    const id = card.dataset.id;
    const vaga = vagas.find((v) => v.id === id);

    if (event.target.closest('[data-action="menu"]')) {
      const dropdown = card.querySelector('[data-role="dropdown"]');
      const isHidden = dropdown.hidden;
      closeAllDropdowns();
      dropdown.hidden = !isHidden;
      event.target.closest(".icon-btn").setAttribute("aria-expanded", String(isHidden));
      return;
    }

    const actionEl = event.target.closest("[data-action]");
    const action = actionEl && actionEl.dataset.action;
    if (!action || !vaga) return;

    if (action === "instagram" || action === "instagram-footer") {
      goToInstagramExport(vaga);
    } else if (action === "pausar") {
      vaga.status = vaga.status === "Pausada" ? "Ativa" : "Pausada";
      saveVagas(vagas);
      closeAllDropdowns();
      render();
        } else if (action === "encerrar") {
      const resultado = await APIEmpresa.vagas.encerrar(vaga.id);
      if (resultado && resultado.error) { alert(resultado.error); return; }
      closeAllDropdowns();
      carregarVagas();
    } else if (action === "excluir") {
      if (confirm(`Excluir a vaga "${vaga.titulo}"? Essa ação não pode ser desfeita.`)) {
        vagas = vagas.filter((v) => v.id !== id);
        saveVagas(vagas);
        carregarVagas();
      }
    }
  });

  function goToInstagramExport(vaga) {
    try {
      localStorage.setItem("talentosUnicap.ultimaVagaPublicada", JSON.stringify(vaga));
    } catch (err) {}
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(vaga))));
    window.location.href = "exportacao-instagram.html?vaga=" + encoded;
  }

  // Fecha dropdowns ao clicar fora
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".vaga-menu")) closeAllDropdowns();
  });

  // ---------- Filtros / busca / ordenação ----------
  buscaInput.addEventListener("input", render);
  filtroStatus.addEventListener("change", () => {
    activeStatusTab = "";
    statusTabs.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
    statusTabs.querySelector('[data-status=""]').classList.add("active");
    render();
  });
  ordenacaoSelect.addEventListener("change", render);

  statusTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab-btn");
    if (!tab) return;
    statusTabs.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeStatusTab = tab.dataset.status;
    filtroStatus.value = "";
    render();
  });

  render();
})();
