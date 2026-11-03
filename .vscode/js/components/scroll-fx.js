/* TalentoUNICAP - Animações de rolagem */
(function () {
  'use strict';

  // true  = anima toda vez que o item entra na tela (sobe e desce)
  // false = anima só na primeira vez
  var REPLAY = true;

  // "Reduzir movimento" no sistema: em vez de desligar tudo, usa só um fade suave (sem deslocamento).
  var reduce = false /* forçado: ignora "reduzir movimento" do sistema */;
  // Sem IntersectionObserver (navegador antigo): não esconde nada, o conteúdo fica visível normalmente.
  if (!('IntersectionObserver' in window)) return;
  if (reduce) document.documentElement.classList.add('sfx-soft');

  // thresholds a cada 2%: garante que o callback rode também em elementos muito altos
  // (cards com listas longas em celulares), que antes ficavam invisíveis.
  var THRESHOLDS = [];
  for (var t = 0; t <= 50; t++) THRESHOLDS.push(t / 50);

  // O que anima. Atributo opcional: data-sfx="left | right | zoom" (padrão: sobe)
  var SELECTOR = [
    '.reveal', '.page-intro', '.features h2', '.feature-card', '.card', '.vaga-card', '.talento-card',
    '.candidato-card', '.candidatura-card', '.list-item', '.empty-state', '.filters-panel',
    '.msg-item', '.footer', '.company-hero .container > *', '.empresa-hero .container > *',
    '[data-sfx]'
  ].join(',');

  // Nunca anima dentro disto (exportação de PDF, modais, avisos)
  var IGNORE = '#cvContent, .is-exporting, .modal-overlay, .modal, .notify-stack, .hero, .navbar, .item-enter, .bgfx, [data-sfx="off"]';

  var seen = new WeakSet();
  var shown = new WeakSet();     // itens que estão visíveis no momento
  var timers = new WeakMap();    // limpeza pendente de cada item

  // entrada: dispara um pouco antes da borda, para não aparecer "colado" no rodapé
  var ioIn = new IntersectionObserver(onEnter, {
    threshold: THRESHOLDS,
    rootMargin: '0px 0px -6% 0px'
  });
  // saída: só quando o item sumiu por completo da tela
  var ioOut = new IntersectionObserver(onExit, { threshold: 0 });

  function eligible(el) {
    if (seen.has(el)) return false;
    if (el.closest(IGNORE)) return false;
    // se um ancestral também anima, só o ancestral anima (evita animação dupla)
    var p = el.parentElement;
    while (p) {
      if (seen.has(p) || (p.matches && p.matches(SELECTOR) && !p.closest(IGNORE))) return false;
      p = p.parentElement;
    }
    return true;
  }

  function register(root) {
    var list = [];
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches(SELECTOR)) list.push(root);
    var found = root.querySelectorAll ? root.querySelectorAll(SELECTOR) : [];
    for (var i = 0; i < found.length; i++) list.push(found[i]);

    list.forEach(function (el) {
      if (!eligible(el)) return;
      seen.add(el);
      // assume os itens que o ux.js marcou com .reveal (uma animação só)
      el.classList.remove('reveal', 'is-visible');
      el.classList.add('sfx');
      ioIn.observe(el);
      if (REPLAY) ioOut.observe(el);
    });
  }

  function isEnough(entry) {
    return entry.isIntersecting &&
      (entry.intersectionRatio >= 0.12 || entry.intersectionRect.height >= window.innerHeight * 0.35);
  }

  function onEnter(entries) {
    var list = entries.filter(function (e) {
      return !shown.has(e.target) && isEnough(e);
    });
    // ordem de leitura: de cima para baixo, esquerda para direita
    list.sort(function (a, b) {
      var ra = a.boundingClientRect, rb = b.boundingClientRect;
      return (Math.round(ra.top / 20) - Math.round(rb.top / 20)) || (ra.left - rb.left);
    });

    list.forEach(function (entry, i) {
      var el = entry.target;
      if (!REPLAY) { ioIn.unobserve(el); }
      shown.add(el);

      var r = entry.boundingClientRect;
      var fromTop = (r.top + r.height / 2) < (window.innerHeight / 2);
      var delay = Math.min(i, 6) * 80;

      // define o ponto de partida (de cima ou de baixo) sem animar a troca
      el.style.transition = 'none';
      el.classList.add('sfx');
      el.classList.remove('sfx-in');
      el.classList.toggle('sfx-from-top', fromTop);
      void el.offsetWidth;
      el.style.transition = '';
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('sfx-in');

      // terminou: devolve o elemento ao CSS normal (hover dos cards etc.)
      clearTimeout(timers.get(el));
      timers.set(el, setTimeout(function () {
        el.classList.remove('sfx', 'sfx-in', 'sfx-from-top');
        if (el.classList.contains('reveal')) el.classList.add('is-visible');
        el.style.transitionDelay = '';
      }, 1100 + delay));
    });
  }

  function onExit(entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      if (entry.isIntersecting || !shown.has(el)) return;
      shown.delete(el);
      clearTimeout(timers.get(el));

      // esconde de novo (o item está fora da tela, então ninguém vê a troca)
      el.style.transition = 'none';
      el.style.transitionDelay = '';
      el.classList.remove('sfx-in', 'is-visible');
      el.classList.add('sfx');
      void el.offsetWidth;
      el.style.transition = '';
    });
  }

  // ---------- paralaxe leve no fundo do hero ----------
  function parallax() {
    if (reduce) return;
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var ticking = false;

    function update() {
      ticking = false;
      var bg = hero.querySelector('.hero-bg');
      if (!bg) return;
      var rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var offset = Math.max(0, -rect.top) * 0.22;
      bg.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ---------- início ----------
  function init() {
    register(document.body);
    parallax();

    // itens que surgem depois (listas montadas por JavaScript)
    if ('MutationObserver' in window) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) { register(n); });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();