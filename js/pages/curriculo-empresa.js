// ============================================
// Currículo Completo — visão da EMPRESA
// Carrega o perfil público do aluno
// ============================================

(function () {
  "use strict";

  function initials(nome) {
    if (!nome) return '?';

    const parts = nome.trim().split(/\s+/);

    return (
      (parts[0]?.[0] || '') +
      (parts[1]?.[0] || '')
    ).toUpperCase();
  }

  Auth.onAuthChange = async function (loggedIn) {

    if (!loggedIn) {
      window.location.href = 'login.html';
      return;
    }

    const perfil = await APIEmpresa.getPerfil();

    if (!perfil || perfil.error) {
      alert('Esta conta não está cadastrada como empresa.');
      window.location.href = 'index.html';
      return;
    }

    document.getElementById('empresaNome').textContent =
      perfil.nome_empresa || 'Empresa';

    document.getElementById('empresaAvatar').textContent =
      initials(perfil.nome_empresa)[0] || 'E';

    carregarCurriculo();
  };

  Auth.init();

  document.getElementById('btnSair').addEventListener(
    'click',
    () => Auth.logout()
  );

  async function carregarCurriculo() {

    const params = new URLSearchParams(window.location.search);




    const slug = params.get('slug');

    // Quando a empresa chega por uma candidatura (?vaga=ID), o aluno escolheu
    // enviar o currículo para ela, mesmo que o perfil esteja oculto na busca.
    const vagaContexto = params.get('vaga');

    if (vagaContexto) {
      const voltar = document.querySelector('a.btn[href="busca-talentos.html"]');
      if (voltar) {
        voltar.href = 'candidaturas-vaga.html?vaga=' + encodeURIComponent(vagaContexto);
        if (voltar.lastChild) voltar.lastChild.textContent = ' Voltar aos candidatos';
      }
    }

    console.log('URL atual:', window.location.href);
    console.log('slug recebido:', slug);

    const cvContent = document.getElementById('cvContent');

    if (!slug) {
      cvContent.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--gray-500);">
          Candidato não especificado.
        </div>
      `;
      return;
    }

    /*
     * Valida se o slug possui formato de UUID.
     * Isso evita enviar um valor inválido para a RPC
     * e receber erro HTTP 400 do Supabase.
     */
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(slug)) {

      console.error(
        'UUID inválido recebido para o currículo:',
        slug
      );

      cvContent.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--gray-500);">
          Identificação do candidato inválida.
        </div>
      `;

      return;
    }

    console.log(
      'Carregando currículo público do aluno:',
      slug
    );

    const profile = await API.getPublicProfile(slug);

    if (!profile || profile.error) {

      console.error(
        'Erro ao carregar perfil público:',
        profile
      );

      cvContent.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--gray-500);">
          Currículo não encontrado.
          O aluno pode ter removido ou tornado o perfil indisponível.
        </div>
      `;

      return;
    }

    if (
      !vagaContexto &&
      (profile.visivel_para_empresas === false ||
      profile.visivel_para_empresas === 'false')
    ) {

      cvContent.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--gray-500);">
          Este aluno não está mais visível para empresas.
        </div>
      `;

      return;
    }

    document.title =
      `${profile.nome || 'Candidato'} - TalentoUNICAP`;

    /*
     * Renderiza o currículo completo.
     */
    cvContent.innerHTML =
      renderCVPreview(profile, true);
  }

})();