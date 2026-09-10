(function () {
  "use strict";

  const form = document.getElementById("empresaForm");
  const alertBox = document.getElementById("formAlert");
  const alertMsg = document.getElementById("formAlertMsg");
  const submitBtn = document.getElementById("submitBtn");

  // ---------- Máscara de CNPJ ----------
  const cnpjInput = document.getElementById("cnpj");
  cnpjInput.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 14);
    if (v.length > 12) {
      v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
    } else if (v.length > 8) {
      v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
    } else if (v.length > 5) {
      v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
    }
    e.target.value = v;
  });

  // ---------- Mostrar/ocultar senha ----------
  const senhaInput = document.getElementById("senha");
  const toggleSenha = document.getElementById("toggleSenha");
  const toggleSenhaIcon = document.getElementById("toggleSenhaIcon");
  toggleSenha.addEventListener("click", () => {
    const isPassword = senhaInput.type === "password";
    senhaInput.type = isPassword ? "text" : "password";
    toggleSenhaIcon.className = isPassword ? "ph ph-eye" : "ph ph-eye-slash";
    toggleSenha.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
  });

  // ---------- Upload / preview da logo (dropzone) ----------
  const dropzone = document.getElementById("dropzone");
  const logoInput = document.getElementById("logoInput");
  const dropzoneEmpty = document.getElementById("dropzoneEmpty");
  const dropzonePreview = document.getElementById("dropzonePreview");
  const logoPreviewImg = document.getElementById("logoPreviewImg");
  const logoFileName = document.getElementById("logoFileName");
  const removeLogo = document.getElementById("removeLogo");

  let logoFile = null;

  function setLogoFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    logoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreviewImg.src = e.target.result;
      logoFileName.textContent = file.name;
      dropzoneEmpty.classList.add("hidden");
      dropzonePreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener("click", (e) => {
    if (e.target.closest(".dz-remove")) return;
    logoInput.click();
  });
  logoInput.addEventListener("change", (e) => setLogoFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) setLogoFile(file);
  });

  removeLogo.addEventListener("click", (e) => {
    e.stopPropagation();
    logoFile = null;
    logoInput.value = "";
    dropzoneEmpty.classList.remove("hidden");
    dropzonePreview.classList.add("hidden");
  });

  // ---------- Validação e envio ----------
  function showAlert(message) {
    alertMsg.textContent = message;
    alertBox.classList.remove("hidden");
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function hideAlert() {
    alertBox.classList.add("hidden");
    alertMsg.textContent = "";
  }
  function clearFieldErrors() {
    form.querySelectorAll(".form-group.has-error").forEach((el) => el.classList.remove("has-error"));
  }
  function markError(id) {
    const input = document.getElementById(id);
    if (input) input.closest(".form-group")?.classList.add("has-error");
  }

  function friendlyAuthError(error) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "Este e-mail já está cadastrado.";
      case "auth/invalid-email":
        return "O e-mail informado é inválido.";
      case "auth/weak-password":
        return "A senha é muito fraca. Use pelo menos 6 caracteres.";
      case "auth/network-request-failed":
        return "Erro de conexão com o Firebase.";
      default:
        return error.message || "Erro ao criar conta da empresa.";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();
    clearFieldErrors();

    const nome_empresa = document.getElementById("nome_empresa").value.trim();
    const cnpj = document.getElementById("cnpj").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const setor = document.getElementById("setor").value;
    const telefone = document.getElementById("telefone").value.trim();
    const site = document.getElementById("site").value.trim();
    const responsavel = document.getElementById("responsavel").value.trim();

    let missing = [];
    if (!nome_empresa) { markError("nome_empresa"); missing.push("nome_empresa"); }
    if (!cnpj) { markError("cnpj"); missing.push("cnpj"); }
    if (!email) { markError("email"); missing.push("email"); }
    if (!senha || senha.length < 6) { markError("senha"); missing.push("senha"); }
    if (!setor) { markError("setor"); missing.push("setor"); }

    if (missing.length) {
      showAlert("Preencha corretamente os campos obrigatórios destacados abaixo.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Criando...";

    try {
      // 1. Cria a conta no Firebase Auth + reserva o perfil (sem logo ainda)
      const result = await APIEmpresa.createEmpresa({
        nome_empresa, cnpj, email, senha, setor, telefone, site, responsavel, logo_url: ""
      });

      if (!result || result.error) {
        throw { message: result?.error || "Não foi possível criar a conta." };
      }

      // 2. Se houver logo, envia ao Storage e atualiza o perfil com a URL
      if (logoFile) {
        try {
          const logoUrl = await APIEmpresa.uploadLogo(result.uid, logoFile);
          if (logoUrl) {
            await firebaseDB.ref(`usuario_empresa/${result.uid}`).update({ logo_url: logoUrl });
          }
        } catch (logoErr) {
          console.warn("Conta criada, mas o upload da logo falhou:", logoErr);
        }
      }

      // 3. Sucesso: mostra confirmação e redireciona para o painel da empresa
      form.innerHTML = `
        <div style="text-align:center;padding:20px 0;">
          <div style="font-size:40px;color:var(--green-500);margin-bottom:12px;"><i class="ph-fill ph-check-circle"></i></div>
          <h3 style="margin-bottom:8px;">Conta criada com sucesso!</h3>
          <p style="color:var(--gray-600);margin-bottom:20px;">
            Sua empresa <strong>${nome_empresa}</strong> foi cadastrada na plataforma.
            Redirecionando para o painel...
          </p>
        </div>`;

      setTimeout(() => {
        window.location.href = 'busca-talentos.html';
      }, 1200);
    } catch (error) {
      console.error("Erro ao criar conta da empresa:", error);
      showAlert(friendlyAuthError(error));
      submitBtn.disabled = false;
      submitBtn.textContent = "Criar Conta";
    }
  });
})();
