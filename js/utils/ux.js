// ============================================
// Utils - Navegação e interações dinâmicas (todas as telas)
//
//  1. Transição suave ao trocar de página (saída em fade; a entrada é CSS)
//  2. Efeito "ripple" ao clicar em botões
//  3. Cards que surgem com animação ao rolar a página (e em listas carregadas depois)
//  4. Barra de progresso de leitura + botão "voltar ao topo"
//  5. Sombra na navbar ao rolar
//
// Respeita "reduzir movimento" do sistema. Nada aqui altera o HTML das
// páginas além de elementos auxiliares marcados com [data-ux].
// ============================================
(function () {
  'use strict';

  var html = document.documentElement;
  var reduzir = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ------------------------------------------------------------
  // 1. Transição entre páginas
  // ------------------------------------------------------------
  var saindo = false;

  function navegarComTransicao(url) {
    if (!url || saindo) return;
    if (reduzir) { window.location.href = url; return; }
    saindo = true;
    html.classList.add('page-leaving');
    setTimeout(function () { window.location.href = url; }, 200);
    // Se a navegação não acontecer (ex.: cancelada), devolve a página ao normal
    setTimeout(function () { saindo = false; html.classList.remove('page-leaving'); }, 2500);
  }
  window.navegarComTransicao = navegarComTransicao;

  // Voltar com a seta do navegador (bfcache): remove o estado de saída
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { saindo = false; html.classList.remove('page-leaving'); }
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download') || a.hasAttribute('data-no-transition')) return;

    var url;
    try { url = new URL(a.href, window.location.href); } catch (_) { return; }
    if (!/^(https?|file):$/.test(url.protocol)) return;       // mailto:, tel:, javascript: ...
    if (url.origin !== window.location.origin) return;         // links externos
    if (url.pathname === window.location.pathname && url.search === window.location.search) return; // âncoras / "#"

    e.preventDefault();
    navegarComTransicao(url.href);
  });

  // ------------------------------------------------------------
  // 2. Ripple nos botões
  // ------------------------------------------------------------
  if (!reduzir) {
    document.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      var el = e.target.closest && e.target.closest('.btn, .tab-btn');
      if (!el || el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true') return;

      if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.classList.add('has-ripple');

      var r = el.getBoundingClientRect();
      var d = Math.max(r.width, r.height) * 2;
      var onda = document.createElement('span');
      onda.className = 'ux-ripple';
      onda.setAttribute('aria-hidden', 'true');
      onda.style.width = onda.style.height = d + 'px';
      onda.style.left = (e.clientX - r.left - d / 2) + 'px';
      onda.style.top = (e.clientY - r.top - d / 2) + 'px';
      el.appendChild(onda);
      setTimeout(function () { onda.remove(); }, 650);
    }, { passive: true });
  }

  // ------------------------------------------------------------
  // 3. Cards que surgem ao rolar (e quando listas são carregadas)
  // ------------------------------------------------------------
  var SEL_REVEAL = '.card:not(.auth-card), .feature-card';
  var SEL_EXCLUIR = '#cvContent, .modal-overlay, .auth-page';

  function iniciarReveal() {
    if (reduzir || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entradas) {
      var visiveis = entradas.filter(function (en) { return en.isIntersecting; });
      visiveis.forEach(function (en, i) {
        var el = en.target;
        io.unobserve(el);
        el.style.transitionDelay = Math.min(i, 7) * 70 + 'ms';
        el.classList.add('is-visible');
        // Devolve o card ao estado normal (sem transições residuais)
        setTimeout(function () {
          el.classList.remove('reveal', 'is-visible');
          el.style.transitionDelay = '';
        }, 1000 + Math.min(i, 7) * 70);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    function preparar(el) {
      if (el.dataset.uxReveal) return;
      el.dataset.uxReveal = '1';
      if (el.closest(SEL_EXCLUIR)) return;
      if (el.parentElement && el.parentElement.closest(SEL_REVEAL)) return;   // card dentro de card

      // O que já está na tela quando a página abre entra junto com a página (CSS);
      // só o que está abaixo da dobra, escondido ou chega depois ganha o efeito.
      var r = el.getBoundingClientRect();
      var inicio = performance.now() < 900;
      if (inicio && r.height > 0 && r.top < window.innerHeight) return;

      el.classList.add('reveal');
      void el.offsetWidth;                  // garante o estado inicial antes da transição
      io.observe(el);
    }

    function varrer(raiz) {
      if (raiz.nodeType !== 1) return;
      if (raiz.matches && raiz.matches(SEL_REVEAL)) preparar(raiz);
      if (raiz.querySelectorAll) raiz.querySelectorAll(SEL_REVEAL).forEach(preparar);
    }

    varrer(document.body);

    var fila = [], agendado = false;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { fila.push(n); }); });
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () {
        agendado = false;
        var lote = fila; fila = [];
        lote.forEach(varrer);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ------------------------------------------------------------
  // 4 e 5. Progresso de leitura, "voltar ao topo" e navbar com sombra
  // ------------------------------------------------------------
  function iniciarScroll() {
    var barra = document.createElement('div');
    barra.className = 'ux-progress';
    barra.setAttribute('data-ux', '');
    barra.setAttribute('aria-hidden', 'true');

    var topo = document.createElement('button');
    topo.type = 'button';
    topo.className = 'ux-top';
    topo.setAttribute('data-ux', '');
    topo.setAttribute('aria-label', 'Voltar ao topo');
    topo.title = 'Voltar ao topo';
    topo.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>';
    topo.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduzir ? 'auto' : 'smooth' });
    });

    document.body.appendChild(barra);
    document.body.appendChild(topo);

    var nav = document.querySelector('.navbar');
    var pendente = false;

    function atualizar() {
      pendente = false;
      var y = window.pageYOffset || html.scrollTop || 0;
      var total = html.scrollHeight - window.innerHeight;
      barra.style.transform = 'scaleX(' + (total > 200 ? Math.min(1, y / total) : 0) + ')';
      topo.classList.toggle('is-visible', y > 480);
      if (nav) nav.classList.toggle('is-scrolled', y > 8);
    }
    window.addEventListener('scroll', function () {
      if (!pendente) { pendente = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
    window.addEventListener('resize', atualizar);
    atualizar();
  }

  function init() { iniciarReveal(); iniciarScroll(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
