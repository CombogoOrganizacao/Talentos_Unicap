(function () {
  "use strict";

  const form = document.getElementById("formVaga");
  const statusEl = document.getElementById("formStatus");
  const btnRascunho = document.getElementById("btnRascunho");

  // Somente empresas podem cadastrar vagas (o banco também bloqueia).
  (async function protegerPagina() {
    try {
      const tipo = await Auth._detectarTipoConta();
      if (!tipo) {
        window.location.href = "login.html";
      } else if (tipo !== "empresa") {
        window.location.href = "lista-vagas.html";
      }
    } catch (err) {
      window.location.href = "login.html";
    }
  })();

  const DRAFT_KEY = "talentosUnicap.vagaRascunho";
  const REQUIRED_IDS = [
    "titulo", "empresa", "area", "carga",
    "descricao", "requisitos",
    "remuneracao", "local", "periodoInicio", "periodoFim", "status"
  ];

  function collectFormData() {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }

  function showStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.classList.remove("is-success", "is-error");
    if (kind) statusEl.classList.add(kind);
  }

  function clearFieldErrors() {
    REQUIRED_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.borderColor = "";
    });
  }

  function validate() {
    clearFieldErrors();
    let firstInvalid = null;
    let hasMissing = false;

    REQUIRED_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const value = (el.value || "").trim();
      if (!value) {
        el.style.borderColor = "#B91C1C";
        hasMissing = true;
        if (!firstInvalid) firstInvalid = el;
      }
    });

    const inicio = document.getElementById("periodoInicio").value;
    const fim = document.getElementById("periodoFim").value;
    if (inicio && fim && fim < inicio) {
      const fimEl = document.getElementById("periodoFim");
      fimEl.style.borderColor = "#B91C1C";
      if (!firstInvalid) firstInvalid = fimEl;
      hasMissing = true;
    }

    if (hasMissing) {
      showStatus("Preencha os campos obrigatórios destacados antes de continuar.", "is-error");
      if (firstInvalid) firstInvalid.focus();
      return false;
    }

    showStatus("", null);
    return true;
  }

  // ----- Salvar Rascunho -----
  btnRascunho.addEventListener("click", () => {
    const data = collectFormData();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      showStatus("Rascunho salvo com sucesso.", "is-success");
    } catch (err) {
      showStatus("Não foi possível salvar o rascunho neste navegador.", "is-error");
    }
  });

  // ----- Carregar rascunho existente ao abrir a página -----
  window.addEventListener("DOMContentLoaded", () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      Object.keys(data).forEach((key) => {
        const el = form.elements[key];
        if (el) el.value = data[key];
      });
    } catch (err) {
      /* rascunho inválido, ignora */
    }
  });

  // ----- Publicar Vaga -----
  form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validate()) return;

  const data = collectFormData();

  const dto = {
    titulo: data.titulo,
    descricao: data.descricao,
    habilidadesRequisitadas: (data.requisitos || "")
      .split(/[,\n]/).map(s => s.trim()).filter(Boolean),
    modalidade: data.modalidade,                 // PRESENCIAL | REMOTO | HIBRIDO
    cargaHoraria: parseInt(data.cargaHoraria, 10) || null,
    local: data.local,
    remuneracao: data.remuneracao,
    periodoInicio: data.periodoInicio || null,
    periodoFim: data.periodoFim || null,
    contato: data.contato
  };

  showStatus("Publicando vaga...", null);
  const resultado = await APIEmpresa.vagas.criar(dto);

  if (resultado && resultado.error) {
    showStatus(resultado.error, "is-error");
    return;
  }

  try { localStorage.removeItem(DRAFT_KEY); } catch (err) {}

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(resultado))));
  window.location.href = "exportacao-instagram.html?vaga=" + encoded;
});
})();
