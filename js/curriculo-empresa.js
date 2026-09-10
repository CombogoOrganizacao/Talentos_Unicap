// ============================================
// Currículo Completo — visão da EMPRESA
// Carrega o perfil público do aluno (publicProfiles/{slug})
// e renderiza o mesmo layout do preview do candidato.
// ============================================
(function () {
  "use strict";

  function initials(nome) {
    if (!nome) return '?';
    const parts = nome.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }

  Auth.onAuthChange = async function (loggedIn) {
    if (!loggedIn) { window.location.href = 'login.html'; return; }
    const perfil = await APIEmpresa.getPerfil();
    if (!perfil || perfil.error) {
      alert('Esta conta não está cadastrada como empresa.');
      window.location.href = 'index.html';
      return;
    }
    document.getElementById('empresaNome').textContent = perfil.nome_empresa || 'Empresa';
    document.getElementById('empresaAvatar').textContent = initials(perfil.nome_empresa)[0] || 'E';
    carregarCurriculo();
  };
  Auth.init();
  document.getElementById('btnSair').addEventListener('click', () => Auth.logout());

  async function carregarCurriculo() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const cvContent = document.getElementById('cvContent');

    if (!slug) {
      cvContent.innerHTML = '<div style="text-align:center;padding:60px;color:var(--gray-500);">Candidato não especificado.</div>';
      return;
    }

    const profile = await API.getPublicProfile(slug);

    if (!profile || profile.error) {
      cvContent.innerHTML = '<div style="text-align:center;padding:60px;color:var(--gray-500);">Currículo não encontrado. O aluno pode ter removido ou tornado o perfil indisponível.</div>';
      return;
    }

    if (profile.visivel_para_empresas === false || profile.visivel_para_empresas === 'false') {
      cvContent.innerHTML = '<div style="text-align:center;padding:60px;color:var(--gray-500);">Este aluno não está mais visível para empresas.</div>';
      return;
    }

    document.title = `${profile.nome || 'Candidato'} - TalentoUNICAP`;

    // Mesmo renderer do preview do aluno (js/export.js), com logo da UNICAP
    cvContent.innerHTML = renderCVPreview(profile, true);
  }
})();
