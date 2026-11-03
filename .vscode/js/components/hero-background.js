/* ============================================
   TalentoUNICAP - Fundo animado interativo do hero (index)
   Cria, dentro de .hero, uma camada com ícones flutuantes de
   escritório, construção civil, educação e psicologia.
   Interações: paralaxe com o mouse, ícones que fogem do cursor,
   brilho que segue o ponteiro e ondas ao clicar/tocar.
   Sem dependências e sem imagens externas (SVGs embutidos).
   ============================================ */
(function () {
  'use strict';

  var reduceMotion = false /* forçado: ignora "reduzir movimento" do sistema */;

  // Ícones em traço (24x24). Cada um tem a área a que se refere.
  function svg(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  var ICONS = [
    // ESCRITÓRIO
    { area: 'escritorio', html: svg('<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20M9 19l.5-3h5l.5 3"/>') },                         // notebook
    { area: 'escritorio', html: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>') },     // maleta
    { area: 'escritorio', html: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>') },                                                                     // gráfico
    { area: 'escritorio', html: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3"/>') },                         // agenda
    { area: 'escritorio', html: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>') },                                          // e-mail
    // CONSTRUÇÃO CIVIL
    { area: 'obra', html: svg('<path d="M3 17h18v2H3zM5 17a7 7 0 0 1 14 0M12 6v4M9 10h6"/>') },                                                              // capacete
    { area: 'obra', html: svg('<path d="M6 21V8l6-5 6 5v13M3 21h18M9 21v-6h6v6M12 3v2"/>') },                                                                // prédio
    { area: 'obra', html: svg('<path d="M4 21h16M8 21V9l8-6M8 9h10M16 3v6M16 9v5"/><circle cx="16" cy="16" r="1.4"/>') },                                    // guindaste
    { area: 'obra', html: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>') },               // chave inglesa
    { area: 'obra', html: svg('<rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 14v-4h10v4M12 10V6M10 6h4"/>') },                              // tijolos
    { area: 'obra', html: svg('<path d="m4 20 16-16 0 0M4 20h4M4 20v-4M7 17l2 2M10 14l2 2M13 11l2 2M16 8l2 2"/>') },                                        // régua
    // EDUCAÇÃO
    { area: 'educacao', html: svg('<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.500 6-3v-4.500M22 9v6"/>') },                        // capelo
    { area: 'educacao', html: svg('<path d="M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 0-2 2zM4 19V5M9 7h6"/>') },                                                   // livro
    { area: 'educacao', html: svg('<path d="m4 20 1-4L16 5l3 3L8 19zM14 7l3 3"/>') },                                                                         // lápis
    { area: 'educacao', html: svg('<rect x="3" y="4" width="18" height="12" rx="1.500"/><path d="M8 20l4-4 4 4M7 9h6M7 12h4"/>') },                          // lousa
    // PSICOLOGIA
    { area: 'psicologia', html: svg('<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4a2 2 0 0 0-2 0zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1V4a2 2 0 0 1 2 0z"/>') }, // cérebro
    { area: 'psicologia', html: svg('<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z"/>') },                                // coração
    { area: 'psicologia', html: svg('<path d="M4 5h16v10H9l-5 4zM8 9h8M8 12h5"/>') },                                                                         // conversa
    { area: 'psicologia', html: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.500c.7.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z"/>') },       // ideia
    { area: 'psicologia', html: svg('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.500"/><path d="M3 20a6 6 0 0 1 12 0M15 15a5 5 0 0 1 6 5"/>') }  // pessoas
  ];

  // Posições (% do hero) espalhadas e longe do miolo do texto na medida do possível
  var SLOTS = [
    [4, 10], [14, 70], [8, 40], [22, 14], [30, 82], [38, 6], [46, 88],
    [56, 12], [64, 80], [72, 8], [80, 70], [88, 18], [93, 52], [96, 84],
    [20, 50], [50, 50], [68, 44], [84, 40], [34, 30], [58, 62]
  ];

  function rand(min, max) { return min + Math.random() * (max - min); }

  function build(hero) {
    if (hero.querySelector('.hero-bg')) return;

    var bg = document.createElement('div');
    bg.className = 'hero-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = '<div class="hero-blob b1"></div><div class="hero-blob b2"></div><div class="hero-blob b3"></div>' +
      '<div class="hero-grid"></div><div class="hero-glow"></div>';

    var items = [];
    // embaralha para misturar as áreas pelos espaços
    var icons = ICONS.slice().sort(function () { return Math.random() - 0.5; });
    SLOTS.forEach(function (slot, i) {
      var icon = icons[i % icons.length];
      var el = document.createElement('div');
      el.className = 'hero-item' + (Math.random() > 0.6 ? ' round' : '');
      el.dataset.area = icon.area;
      el.style.left = slot[0] + '%';
      el.style.top = slot[1] + '%';
      var depth = rand(0.4, 1.4);
      var size = Math.round(rand(44, 78));
      el.style.setProperty('--s', size + 'px');
      // ícones atrás da área do texto ficam mais discretos, para não atrapalhar a leitura
      var overText = slot[0] < 62 && slot[1] > 18 && slot[1] < 82;
      el.style.setProperty('--o', overText ? '0.28' : (0.55 + depth * 0.25).toFixed(2));
      el.style.setProperty('--d', rand(7, 12).toFixed(1) + 's');
      el.style.setProperty('--delay', (-rand(0, 9)).toFixed(1) + 's');
      el.style.setProperty('--r0', rand(-8, 0).toFixed(1) + 'deg');
      el.style.setProperty('--r1', rand(0, 8).toFixed(1) + 'deg');
      el.innerHTML = '<div class="hero-item-inner">' + icon.html + '</div>';
      bg.appendChild(el);
      items.push({ el: el, depth: depth, x: 0, y: 0, tx: 0, ty: 0, cx: 0, cy: 0 });
    });

    hero.insertBefore(bg, hero.firstChild);
    if (!reduceMotion) interact(hero, bg, items);
  }

  function interact(hero, bg, items) {
    var glow = bg.querySelector('.hero-glow');
    var rect = null;
    var pointer = { x: 0, y: 0, active: false };
    var visible = true, running = false;

    function measure() {
      rect = hero.getBoundingClientRect();
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        // centro "de repouso" relativo ao hero (desconta o deslocamento atual)
        it.cx = r.left - rect.left + r.width / 2 - it.x;
        it.cy = r.top - rect.top + r.height / 2 - it.y;
      });
    }

    function tick() {
      running = false;
      if (!visible) return;
      var w = rect.width, h = rect.height;
      var moving = false;
      var nx = pointer.active ? (pointer.x / w - 0.5) : 0;
      var ny = pointer.active ? (pointer.y / h - 0.5) : 0;

      items.forEach(function (it) {
        // paralaxe: camadas mais "próximas" (depth maior) mexem mais
        var px = -nx * 36 * it.depth;
        var py = -ny * 36 * it.depth;
        var rx = 0, ry = 0;
        if (pointer.active) {
          var dx = it.cx - pointer.x, dy = it.cy - pointer.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var radius = 170;
          if (dist < radius) {
            var force = (1 - dist / radius) * 70; // foge do cursor
            rx = (dx / dist) * force;
            ry = (dy / dist) * force;
          }
        }
        it.tx = px + rx;
        it.ty = py + ry;
        it.x += (it.tx - it.x) * 0.1;
        it.y += (it.ty - it.y) * 0.1;
        if (Math.abs(it.tx - it.x) > 0.05 || Math.abs(it.ty - it.y) > 0.05) moving = true;
        it.el.style.transform = 'translate3d(' + it.x.toFixed(2) + 'px,' + it.y.toFixed(2) + 'px,0)';
      });

      if (moving || pointer.active) schedule();
    }

    function schedule() {
      if (!running) { running = true; requestAnimationFrame(tick); }
    }

    function setPointer(e) {
      if (!rect) measure();
      var r = hero.getBoundingClientRect();
      rect = r;
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
      hero.classList.add('is-pointer');
      glow.style.transform = 'translate3d(' + pointer.x + 'px,' + pointer.y + 'px,0)';
      schedule();
    }

    hero.addEventListener('pointermove', setPointer, { passive: true });
    hero.addEventListener('pointerleave', function () {
      pointer.active = false;
      hero.classList.remove('is-pointer');
      schedule();
    });

    // clique/toque: onda + "pulo" nos ícones próximos
    hero.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, button, input, select, textarea')) return;
      var r = hero.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      var ripple = document.createElement('span');
      ripple.className = 'hero-ripple';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      bg.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 1000);
      items.forEach(function (it) {
        var dx = it.cx - x, dy = it.cy - y;
        if (Math.sqrt(dx * dx + dy * dy) < 220) {
          it.el.classList.remove('is-hit');
          void it.el.offsetWidth;
          it.el.classList.add('is-hit');
        }
      });
    });

    // só anima quando o hero está na tela
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        bg.classList.toggle('is-paused', !visible);
        if (visible) schedule();
      }).observe(hero);
    }

    window.addEventListener('resize', function () { measure(); }, { passive: true });
    measure();
    // remede após carregar fontes/imagens que alteram a altura do hero
    window.addEventListener('load', measure);
  }

  // O hero pode ser renderizado depois (SPA): observa o DOM até aparecer
  function init() {
    var hero = document.querySelector('.hero');
    if (hero) build(hero);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  if ('MutationObserver' in window) {
    new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
