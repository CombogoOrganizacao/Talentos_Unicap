// ============================================
// Perfil público - Firebase Realtime Database
// ============================================

(function () {
  const path = window.location.pathname
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  const slug = path || '';

  if (!slug) {
    showError();
    return;
  }

  API.getPublicProfile(slug)
    .then(profile => {
      if (!profile || profile.error) {
        showError();
        return;
      }

      document.title =
        `${profile.nome || 'Aluno'} - TalentoUNICAP`;

      const content =
        document.getElementById('content');

      if (!content) return;

      content.innerHTML =
        renderCVPreview(profile);
    })
    .catch(error => {
      console.error(
        'Erro ao carregar perfil público:',
        error
      );
      showError();
    });
})();

function showError() {
  const content =
    document.getElementById('content');

  if (!content) return;

  content.innerHTML = `
    <div style="text-align:center;padding:80px 20px;">
      <h2 style="margin-bottom:12px;">
        Perfil não encontrado
      </h2>

      <p style="color:var(--gray-500);margin-bottom:24px;">
        O perfil que você procura não existe.
      </p>

      <a href="index.html" class="btn btn-primary">
        Criar meu currículo
      </a>
    </div>`;
}
