// Perfil público - acessa via /[slug]
(function() {
  const slug = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!slug) { showError(); return; }

  const API_BASE = CONFIG.API_URL;
  fetch(`${API_BASE}?action=getPublicProfile&slug=${slug}`)
    .then(r => r.json())
    .then(profile => {
      if (profile.error) { showError(); return; }
      document.title = `${profile.nome || 'Aluno'} - TalentoUNICAP`;
      document.getElementById('content').innerHTML = renderCVPreview(profile);
    })
    .catch(() => showError());
})();

function showError() {
  document.getElementById('content').innerHTML = `
    <div style="text-align:center;padding:80px 20px;">
      <h2 style="margin-bottom:12px;">Perfil não encontrado</h2>
      <p style="color:var(--gray-500);margin-bottom:24px;">O perfil que você procura não existe.</p>
      <a href="index.html" class="btn btn-primary">Criar meu currículo</a>
    </div>`;
}
