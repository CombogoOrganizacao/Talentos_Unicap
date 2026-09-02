(function () {
  "use strict";

  const STORAGE_KEY = "talentosUnicap.vagas";
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

  // ---------- Dados de exemplo (usados apenas se não houver nada salvo) ----------
  const SEED_VAGAS = [
    {
      id: "seed_1",
      titulo: "Estágio em Desenvolvimento Frontend React",
      empresa: "Departamento de TI - UNICAP",
      area: "Sistemas para Internet / Ciência da Computação",
      carga: "30h semanais",
      remuneracao: "R$ 1.500,00 + Vale Transporte",
      local: "Híbrido (Recife - PE)",
      periodoInicio: "2026-09-10",
      periodoFim: "2026-10-30",
      status: "Ativa",
      contato: "carreiras@unicap.br",
      requisitos: "• Estar regularmente matriculado em curso de TI ou Design na UNICAP\n• Conhecimentos sólidos em ReactJS e versionamento Git",
      descricao: "Atuar no desenvolvimento de novas interfaces responsivas em React.",
      criadoEm: "2026-08-20T10:00:00.000Z"
    },
    {
      id: "seed_2",
      titulo: "Trainee em Marketing Digital",
      empresa: "Núcleo de Comunicação - UNICAP",
      area: "Marketing",
      carga: "20h semanais",
      remuneracao: "R$ 900,00",
      local: "Presencial (Recife - PE)",
      periodoInicio: "2026-09-01",
      periodoFim: "2026-09-25",
      status: "Rascunho",
      contato: "comunicacao@unicap.br",
      requisitos: "• Interesse em marketing de conteúdo e redes sociais",
      descricao: "Apoio na criação de campanhas e conteúdo institucional.",
      criadoEm: "2026-08-18T09:00:00.000Z"
    },
    {
      id: "seed_3",
      titulo: "Estágio em Direito Empresarial",
      empresa: "Escritório Modelo - UNICAP",
      area: "Direito",
      carga: "20h semanais",
      remuneracao: "R$ 800,00 + Vale Transporte",
      local: "Presencial (Recife - PE)",
      periodoInicio: "2026-08-01",
      periodoFim: "2026-08-15",
      status: "Encerrada",
      contato: "juridico@unicap.br",
      requisitos: "• Cursando a partir do 6º período de Direito",
      descricao: "Apoio em rotinas contratuais e societárias.",
      criadoEm: "2026-07-10T09:00:00.000Z"
    },
    {
      id: "seed_4",
      titulo: "Estágio em Design de Produto",
      empresa: "Laboratório de Inovação - UNICAP",
      area: "Design",
      carga: "25h semanais",
      remuneracao: "R$ 1.200,00",
      local: "Híbrido (Recife - PE)",
      periodoInicio: "2026-09-15",
      periodoFim: "2026-10-05",
      status: "Pausada",
      contato: "inovacao@unicap.br",
      requisitos: "• Conhecimento em Figma e prototipação",
      descricao: "Desenvolvimento de protótipos e pesquisa com usuários.",
      criadoEm: "2026-08-05T09:00:00.000Z"
    }
  ];

  function loadVagas() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (err) { /* ignora e cai no seed */ }
    // Primeira visita: popula com dados de exemplo para não mostrar tela vazia
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_VAGAS));
    return SEED_VAGAS.slice();
  }

  function saveVagas(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  let vagas = loadVagas();

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
  grid.addEventListener("click", (event) => {
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
      vaga.status = "Encerrada";
      saveVagas(vagas);
      closeAllDropdowns();
      render();
    } else if (action === "excluir") {
      if (confirm(`Excluir a vaga "${vaga.titulo}"? Essa ação não pode ser desfeita.`)) {
        vagas = vagas.filter((v) => v.id !== id);
        saveVagas(vagas);
        render();
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
