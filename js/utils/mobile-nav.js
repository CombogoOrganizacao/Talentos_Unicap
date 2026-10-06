/* ============================================
   Menu responsivo (hambúrguer) da navbar.
   - Só aparece em telas ≤ 768px (controlado pelo CSS).
   - Só é criado quando a navbar tem 2+ itens de navegação
     (páginas com um único botão, como o login, ficam como estão).
   - Observa mudanças no .nav-links, pois algumas páginas
     preenchem os links via JavaScript depois do carregamento.
   ============================================ */
(function () {
  'use strict';

  var MOBILE_QUERY = '(max-width: 768px)';

  function countItems(nav) {
    var links = nav.querySelector('.nav-links');
    if (!links) return 0;
    var items = links.querySelectorAll('a, button');
    return items.length;
  }

  function setOpen(nav, toggle, open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }

  function enhance(nav, index) {
    var container = nav.querySelector('.container');
    var links = nav.querySelector('.nav-links');
    if (!container || !links) return;

    var toggle = nav.querySelector('.nav-toggle');

    function refresh() {
      var needsMenu = countItems(nav) >= 2;
      nav.classList.toggle('has-toggle', needsMenu);
      if (!needsMenu) {
        setOpen(nav, toggle || document.createElement('button'), false);
      }
    }

    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nav-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
      var id = 'navLinks-' + index;
      links.id = links.id || id;
      toggle.setAttribute('aria-controls', links.id);
      toggle.innerHTML = '<span class="bar" aria-hidden="true"></span>';
      container.insertBefore(toggle, links);

      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(nav, toggle, !nav.classList.contains('is-open'));
      });

      // Fecha ao tocar num link/botão do menu
      links.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) setOpen(nav, toggle, false);
      });

      // Fecha ao tocar fora, ao pressionar Esc ou ao voltar para tela grande
      document.addEventListener('click', function (e) {
        if (!nav.contains(e.target)) setOpen(nav, toggle, false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) {
          setOpen(nav, toggle, false);
          toggle.focus();
        }
      });
      var mq = window.matchMedia(MOBILE_QUERY);
      var onChange = function (ev) { if (!ev.matches) setOpen(nav, toggle, false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    refresh();

    if ('MutationObserver' in window) {
      new MutationObserver(refresh).observe(links, { childList: true, subtree: true });
    }
  }

  function init() {
    var navs = document.querySelectorAll('.navbar');
    for (var i = 0; i < navs.length; i++) enhance(navs[i], i);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
