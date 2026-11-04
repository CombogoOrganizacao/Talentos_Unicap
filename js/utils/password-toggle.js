// ============================================
// Utils - botão "ver senha" (olho) nos campos de senha
// Basta incluir este script na página: todo <input type="password">
// ganha um botão que alterna entre ocultar e mostrar ao clicar.
// ============================================
(function () {
  'use strict';

  var ICON_SHOW = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_HIDE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function enhance(input) {
    if (input.dataset.pwToggle) return;
    input.dataset.pwToggle = '1';

    var wrap = document.createElement('span');
    wrap.className = 'password-field';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-toggle';
    wrap.appendChild(btn);

    function render(visivel) {
      input.type = visivel ? 'text' : 'password';
      btn.innerHTML = visivel ? ICON_HIDE : ICON_SHOW;
      btn.setAttribute('aria-pressed', visivel ? 'true' : 'false');
      btn.setAttribute('aria-label', visivel ? 'Ocultar senha' : 'Mostrar senha');
      btn.title = visivel ? 'Ocultar senha' : 'Mostrar senha';
    }

    // Não tira o foco do campo ao clicar no ícone
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function () { render(input.type === 'password'); });
    render(false);
  }

  function init() {
    document.querySelectorAll('input[type="password"]').forEach(enhance);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
