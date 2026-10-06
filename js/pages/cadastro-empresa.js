
(function () {

  "use strict";

  const form = document.getElementById("empresaForm");

  const alertBox = document.getElementById("formAlert");
  const alertMsg = document.getElementById("formAlertMsg");
  const submitBtn = document.getElementById("submitBtn");

  // =========================================================
  // Máscara e validação de CNPJ
  // =========================================================

  const cnpjInput = document.getElementById("cnpj");

  cnpjInput.addEventListener("input", (e) => {

    let v = e.target.value
      .replace(/\D/g, "")
      .slice(0, 14);

    if (v.length > 12) {

      v = v.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,
        "$1.$2.$3/$4-$5"
      );

    } else if (v.length > 8) {

      v = v.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{0,4})/,
        "$1.$2.$3/$4"
      );

    } else if (v.length > 5) {

      v = v.replace(
        /^(\d{2})(\d{3})(\d{0,3})/,
        "$1.$2.$3"
      );

    } else if (v.length > 2) {

      v = v.replace(
        /^(\d{2})(\d{0,3})/,
        "$1.$2"
      );
    }

    e.target.value = v;
  });


  /**
   * Valida CNPJ matematicamente.
   *
   * Aceita CNPJ com máscara ou somente números.
   */
  function validarCnpj(cnpj) {

    const numeros = String(cnpj || "")
      .replace(/\D/g, "");

    // CNPJ precisa ter exatamente 14 dígitos.
    if (numeros.length !== 14) {
      return false;
    }

    // Rejeita números repetidos:
    // 00000000000000
    // 11111111111111
    // etc.
    if (/^(\d)\1{13}$/.test(numeros)) {
      return false;
    }

    function calcularDigito(base) {

      let peso = base.length - 5;
      let soma = 0;

      for (const numero of base) {

        soma += Number(numero) * peso;

        peso--;

        if (peso < 2) {
          peso = 9;
        }
      }

      const resto = soma % 11;

      return resto < 2
        ? 0
        : 11 - resto;
    }

    // Primeiro dígito verificador.
    const primeiroDigito = calcularDigito(
      numeros.substring(0, 12)
    );

    // Segundo dígito verificador.
    const segundoDigito = calcularDigito(
      numeros.substring(0, 12) + primeiroDigito
    );

    return (
      Number(numeros[12]) === primeiroDigito &&
      Number(numeros[13]) === segundoDigito
    );
  }


  // =========================================================
  // Mostrar / ocultar senha
  // =========================================================

  const senhaInput = document.getElementById("senha");
  const toggleSenha = document.getElementById("toggleSenha");
  const toggleSenhaIcon = document.getElementById("toggleSenhaIcon");

  toggleSenha.addEventListener("click", () => {

    const isPassword = senhaInput.type === "password";

    senhaInput.type = isPassword
      ? "text"
      : "password";

    toggleSenhaIcon.className = isPassword
      ? "ph ph-eye"
      : "ph ph-eye-slash";

    toggleSenha.setAttribute(
      "aria-label",
      isPassword
        ? "Ocultar senha"
        : "Mostrar senha"
    );
  });


  // =========================================================
  // Upload / preview da logo
  // =========================================================

  const dropzone = document.getElementById("dropzone");
  const logoInput = document.getElementById("logoInput");
  const dropzoneEmpty = document.getElementById("dropzoneEmpty");
  const dropzonePreview = document.getElementById("dropzonePreview");
  const logoPreviewImg = document.getElementById("logoPreviewImg");
  const logoFileName = document.getElementById("logoFileName");
  const removeLogo = document.getElementById("removeLogo");

  let logoFile = null;


  function setLogoFile(file) {

    if (!file || !file.type.startsWith("image/")) {
      return;
    }

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

    if (e.target.closest(".dz-remove")) {
      return;
    }

    logoInput.click();
  });


  logoInput.addEventListener("change", (e) => {
    setLogoFile(e.target.files[0]);
  });


  ["dragenter", "dragover"].forEach((evt) => {

    dropzone.addEventListener(evt, (e) => {

      e.preventDefault();

      dropzone.classList.add("is-dragover");
    });
  });


  ["dragleave", "drop"].forEach((evt) => {

    dropzone.addEventListener(evt, (e) => {

      e.preventDefault();

      dropzone.classList.remove("is-dragover");
    });
  });


  dropzone.addEventListener("drop", (e) => {

    const file =
      e.dataTransfer.files &&
      e.dataTransfer.files[0];

    if (file) {
      setLogoFile(file);
    }
  });


  removeLogo.addEventListener("click", (e) => {

    e.stopPropagation();

    logoFile = null;

    logoInput.value = "";

    dropzoneEmpty.classList.remove("hidden");
    dropzonePreview.classList.add("hidden");
  });


  // =========================================================
  // Alertas
  // =========================================================

  function showAlert(message) {

    alertMsg.textContent = message;

    alertBox.classList.remove("hidden");

    alertBox.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }


  function hideAlert() {

    alertBox.classList.add("hidden");

    alertMsg.textContent = "";
  }


  // =========================================================
  // Erros dos campos
  // =========================================================

  function clearFieldErrors() {

    form
      .querySelectorAll(".form-group.has-error")
      .forEach((el) => {
        el.classList.remove("has-error");
      });
  }


  function markError(id) {

    const input = document.getElementById(id);

    if (input) {

      input
        .closest(".form-group")
        ?.classList.add("has-error");
    }
  }


  // =========================================================
  // Cadastro da empresa
  // =========================================================

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    hideAlert();
    clearFieldErrors();


    // -------------------------------------------------------
    // Dados do formulário
    // -------------------------------------------------------

    const nome_empresa =
      document
        .getElementById("nome_empresa")
        .value
        .trim();

    const cnpj =
      document
        .getElementById("cnpj")
        .value
        .trim();

    const senha =
      document
        .getElementById("senha")
        .value;

    const email =
      document
        .getElementById("email")
        .value
        .trim();

    const setor =
      document
        .getElementById("setor")
        .value;


    // -------------------------------------------------------
    // Validação dos campos
    // -------------------------------------------------------

    let missing = [];


    if (!nome_empresa) {

      markError("nome_empresa");

      missing.push("nome_empresa");
    }


    if (!cnpj) {

      markError("cnpj");

      missing.push("cnpj");

    } else if (!validarCnpj(cnpj)) {

      markError("cnpj");

      showAlert(
        "Informe um CNPJ válido com 14 dígitos."
      );

      return;
    }


    if (!email) {

      markError("email");

      missing.push("email");
    }


    if (!senha || senha.length < 6) {

      markError("senha");

      missing.push("senha");
    }


    if (!setor) {

      markError("setor");

      missing.push("setor");
    }


    if (missing.length) {

      showAlert(
        "Preencha corretamente os campos obrigatórios destacados abaixo."
      );

      return;
    }


    // -------------------------------------------------------
    // Preparação do botão
    // -------------------------------------------------------

    submitBtn.disabled = true;

    submitBtn.textContent = "Criando...";


    try {

      // -----------------------------------------------------
      // Normaliza o CNPJ antes de enviar ao Supabase.
      //
      // Exemplo:
      // 12.345.678/0001-95
      //
      // vira:
      // 12345678000195
      // -----------------------------------------------------

      const cnpjNormalizado =
        cnpj.replace(/\D/g, "");


      // -----------------------------------------------------
      // Cadastro no Supabase Auth
      // -----------------------------------------------------

      const result =
        await Auth.registerEmpresa({

          cnpj: cnpjNormalizado,

          razaoSocial:
            nome_empresa,

          nomeFantasia:
            nome_empresa,

          setor,

          senha,

          email
        });


      // -----------------------------------------------------
      // Confirmação de e-mail
      // -----------------------------------------------------

      if (result.requiresEmailConfirmation) {

        window.location.href =
          `confirmacao-email.html?email=${encodeURIComponent(email)}&tipo=empresa`;

        return;
      }


      // -----------------------------------------------------
      // Upload da logo
      //
      // Só acontece se já existir sessão autenticada.
      // Com confirmação de e-mail ativada, o usuário será
      // redirecionado antes desta parte.
      // -----------------------------------------------------

      if (
        logoFile &&
        typeof APIEmpresa !== "undefined" &&
        typeof APIEmpresa.uploadFotoPerfil === "function"
      ) {

        try {

          const uploadResult =
            await APIEmpresa.uploadFotoPerfil(
              logoFile
            );


          if (
            uploadResult &&
            uploadResult.error
          ) {

            console.warn(
              "Conta criada, mas o upload da logo falhou:",
              uploadResult.error
            );
          }

        } catch (logoErr) {

          console.warn(
            "Conta criada, mas o upload da logo falhou:",
            logoErr
          );
        }
      }


      // -----------------------------------------------------
      // Mensagem de sucesso
      // -----------------------------------------------------

      form.innerHTML = `

        <div style="text-align:center;padding:20px 0;">

          <div
            style="
              font-size:40px;
              color:var(--green-500);
              margin-bottom:12px;
            "
          >
            <i class="ph-fill ph-check-circle"></i>
          </div>

          <h3 style="margin-bottom:8px;">
            Conta criada com sucesso!
          </h3>

          <p
            style="
              color:var(--gray-600);
              margin-bottom:20px;
            "
          >
            Sua empresa
            <strong>${nome_empresa}</strong>
            foi cadastrada na plataforma.

            Redirecionando para o painel...
          </p>

        </div>
      `;


      // -----------------------------------------------------
      // Redirecionamento
      // -----------------------------------------------------

      setTimeout(() => {

        window.location.href =
          "busca-talentos.html";

      }, 1200);


    } catch (error) {

      console.error(
        "Erro ao criar conta da empresa:",
        error
      );


      showAlert(
        error.message ||
        "Erro ao criar conta da empresa."
      );


      submitBtn.disabled = false;

      submitBtn.textContent =
        "Criar Conta";
    }

  });

})();

