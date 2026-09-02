(function () {
  "use strict";

  const form = document.getElementById("formVaga");
  const statusEl = document.getElementById("formStatus");
  const btnRascunho = document.getElementById("btnRascunho");

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
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validate()) return;

    const data = collectFormData();
    data.id = "vaga_" + Date.now();
    data.criadoEm = new Date().toISOString();

    // Limpa o rascunho, já que a vaga foi publicada
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) {}

    // Guarda como última vaga publicada (usado pela página de exportação)
    try {
      localStorage.setItem("talentosUnicap.ultimaVagaPublicada", JSON.stringify(data));
    } catch (err) {}

    // Adiciona à lista completa de vagas (usada pela página de listagem)
    try {
      const listaAtual = JSON.parse(localStorage.getItem("talentosUnicap.vagas") || "[]");
      listaAtual.unshift(data);
      localStorage.setItem("talentosUnicap.vagas", JSON.stringify(listaAtual));
    } catch (err) {}

    // Envia os dados via querystring (base64) para a página de exportação
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    window.location.href = "exportacao-instagram.html?vaga=" + encoded;
  });
})();
