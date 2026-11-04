// ============================================
// Escape de HTML e URLs
// Todo texto vindo do banco (digitado por alunos ou empresas) deve passar
// por escapeHtml() antes de entrar num template usado com innerHTML.
// Links vindos do banco passam por safeUrl(), que só aceita http(s).
// ============================================
(function () {
  'use strict';

  const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
  }

  // Devolve a URL escapada para uso em href, ou '' se não for http(s).
  // "github.com/fulano" (sem protocolo) vira "https://github.com/fulano".
  function safeUrl(valor) {
    let url = String(valor ?? '').trim();
    if (!url) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
      if (/\s/.test(url) || !/^[^/]+\.[^/]+/.test(url)) return '';
      url = 'https://' + url.replace(/^\/+/, '');
    }
    if (!/^https?:\/\//i.test(url)) return '';
    return escapeHtml(url);
  }

  window.escapeHtml = escapeHtml;
  window.safeUrl = safeUrl;
})();
