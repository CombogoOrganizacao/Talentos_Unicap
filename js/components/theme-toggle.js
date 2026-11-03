/* TalentoUNICAP - Modo claro/escuro com animação (lembra a escolha do usuário) */
(function () {
  'use strict';
  var KEY = 'talento-theme';
  var root = document.documentElement;

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', read() || (prefersDark ? 'dark' : 'light'));

  var reduceMotion = false /* forçado: ignora "reduzir movimento" do sistema */;

  var SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function isDark() { return root.getAttribute('data-theme') === 'dark'; }

  function apply(next) {
    root.setAttribute('data-theme', next);
    save(next);
  }

  function toggle(btn) {
    var next = isDark() ? 'light' : 'dark';

    // sem animação para quem prefere menos movimento
    if (reduceMotion) { apply(next); paint(btn); return; }

    var r = btn.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    if (document.startViewTransition) {
      // círculo que se abre a partir do botão
      var t = document.startViewTransition(function () { apply(next); paint(btn); });
      t.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 700, easing: 'cubic-bezier(.22,.61,.36,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
    } else {
      // alternativa: cores mudam suavemente
      root.classList.add('theme-fade');
      apply(next);
      paint(btn);
      setTimeout(function () { root.classList.remove('theme-fade'); }, 600);
    }
  }

  function paint(btn) {
    var label = isDark() ? 'Ativar modo claro' : 'Ativar modo escuro';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }

  function mount() {
    if (document.querySelector('.theme-toggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.innerHTML = SUN + MOON;
    btn.addEventListener('click', function () { toggle(btn); });
    paint(btn);
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();