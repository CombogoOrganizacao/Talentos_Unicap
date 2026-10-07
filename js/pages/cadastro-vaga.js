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

  // ---------- Helpers de conversão ----------
  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  // "30h/semana" -> 30
  function extrairCargaHoraria(data) {
    const bruto = data.cargaHoraria || data.carga || "";
    const match = String(bruto).match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  // "R$ 1.500,00" -> 1500 | "1500" -> 1500 | "A combinar" -> null
  function converterRemuneracao(valor) {
    const bruto = String(valor || "").trim();
    if (!bruto) return null;
    let limpo = bruto.replace(/[^\d.,]/g, "");
    if (!limpo) return null;
    if (limpo.includes(",")) {
      // formato brasileiro: ponto separa milhar, vírgula separa decimal
      limpo = limpo.replace(/\./g, "").replace(",", ".");
    }
    const numero = parseFloat(limpo);
    return Number.isFinite(numero) ? numero : null;
  }

  // Retorna PRESENCIAL | REMOTO | HIBRIDO | null
  function detectarModalidade(data) {
    const validas = ["PRESENCIAL", "REMOTO", "HIBRIDO"];
    if (data.modalidade) {
      const m = normalizar(data.modalidade).toUpperCase();
      if (validas.includes(m)) return m;
    }
    const t = normalizar(data.local);
    if (t.includes("remot")) return "REMOTO";
    if (t.includes("hibrid")) return "HIBRIDO";
    if (t.includes("presencial")) return "PRESENCIAL";
    return null;
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
        .split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      modalidade: detectarModalidade(data),     // PRESENCIAL | REMOTO | HIBRIDO
      cargaHoraria: extrairCargaHoraria(data),  // número inteiro
      local: data.local,
      remuneracao: converterRemuneracao(data.remuneracao), // número para o backend
      periodoInicio: data.periodoInicio || null,
      periodoFim: data.periodoFim || null,
      contato: data.contato
    };

    showStatus("Publicando vaga...", null);

    let resultado;
    try {
      resultado = await APIEmpresa.vagas.criar(dto);
    } catch (err) {
      showStatus("Erro ao publicar a vaga. Tente novamente.", "is-error");
      return;
    }

    if (!resultado || resultado.error) {
      showStatus((resultado && resultado.error) || "Erro ao publicar a vaga.", "is-error");
      return;
    }

    try { localStorage.removeItem(DRAFT_KEY); } catch (err) {}

    // Junta o que veio do banco com o que foi digitado no formulário,
    // para a página do Instagram receber empresa, bolsa, local, prazo etc.
    const doFormulario = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v !== null && v !== undefined && String(v).trim() !== "") doFormulario[k] = v;
    });

    const vagaParaInstagram = {
      ...resultado,
      ...doFormulario,
      id: resultado.id
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(vagaParaInstagram))));
    window.location.href = "exportacao-instagram.html?vaga=" + encoded;
  });
})();