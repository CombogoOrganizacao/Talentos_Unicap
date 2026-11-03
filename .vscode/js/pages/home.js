/* ============================================
   TalentoUNICAP - Interações da página inicial
   1. Folha editável (nome, curso, habilidades) — só prévia, nada vai ao servidor
   2. Abas da pasta (etapas), com teclado
   3. Interruptores da etapa "Fique visível"
   4. Folha que vira (aluno / empresa)
   5. Marca-texto e carimbo ao entrar na tela
   ============================================ */
(function () {
  'use strict';

  var PREFILL_KEY = 'talento-prefill-nome';
  var reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function salvar(v) { try { v ? sessionStorage.setItem(PREFILL_KEY, v) : sessionStorage.removeItem(PREFILL_KEY); } catch (e) {} }
  function ler() { try { return sessionStorage.getItem(PREFILL_KEY) || ''; } catch (e) { return ''; } }

  // ---------- 1. Folha editável ----------
  function folha() {
    var nome = $('#sheetNome');
    var curso = $('#sheetCurso');
    var cursoLabel = $('[data-curso-label]');
    var virgula = $('[data-nome-virgula]');
    if (!nome) return;

    var lista = (window.CONFIG && Array.isArray(CONFIG.cursos)) ? CONFIG.cursos : [];
    lista.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      curso.appendChild(o);
    });

    function primeiroNome(v) { return v.trim().split(/\s+/)[0] || ''; }

    function atualizarNome() {
      var v = nome.value.replace(/\s+/g, ' ');
      var limpo = v.trim();
      nome.classList.toggle('is-filled', limpo.length > 0);
      $$('[data-nome]').forEach(function (el) { el.textContent = limpo || 'Seu nome'; });
      if (virgula) virgula.textContent = limpo ? ', ' + primeiroNome(limpo) : '';
      salvar(limpo);
    }

    function atualizarCurso() {
      cursoLabel.textContent = curso.value ? curso.value + ' · em andamento' : 'Curso em andamento';
      ajustarLargura();
    }

    // a largura do select acompanha o texto escolhido (senão fica do tamanho do maior curso)
    var medida = document.createElement('span');
    medida.className = 'sheet-measure';
    curso.parentNode.appendChild(medida);
    function ajustarLargura() {
      var cs = getComputedStyle(curso);
      medida.style.font = cs.font;
      medida.textContent = curso.options[curso.selectedIndex].text;
      curso.style.width = Math.ceil(medida.getBoundingClientRect().width) + 22 + 'px';
    }
    ajustarLargura();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarLargura);

    nome.addEventListener('input', atualizarNome);
    curso.addEventListener('change', atualizarCurso);

    var anterior = ler();
    if (anterior) { nome.value = anterior; }
    atualizarNome();

    $$('.skill-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var on = chip.getAttribute('aria-pressed') !== 'true';
        chip.setAttribute('aria-pressed', String(on));
      });
    });
  }

  // ---------- 2. Abas da pasta ----------
  function abas() {
    var tabs = $$('.folder-tab');
    if (!tabs.length) return;

    function ativar(tab, focar) {
      tabs.forEach(function (t) {
        var sel = t === tab;
        t.setAttribute('aria-selected', String(sel));
        t.tabIndex = sel ? 0 : -1;
        var painel = document.getElementById(t.getAttribute('aria-controls'));
        if (!painel) return;
        if (sel) {
          painel.hidden = false;
          painel.classList.remove('is-entering');
          void painel.offsetWidth;
          painel.classList.add('is-entering');
        } else {
          painel.hidden = true;
          painel.classList.remove('is-entering');
        }
      });
      if (focar) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduzir ? 'auto' : 'smooth' });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { ativar(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var alvo = null;
        if (e.key === 'ArrowRight') alvo = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') alvo = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') alvo = tabs[0];
        else if (e.key === 'End') alvo = tabs[tabs.length - 1];
        if (alvo) { e.preventDefault(); ativar(alvo, true); }
      });
    });
  }

  // ---------- 3. Interruptores ----------
  function interruptores() {
    var pill = $('#statusPill');
    var sw = $$('.switch');
    if (!pill || !sw.length) return;

    function status() {
      var estagio = $('[data-switch="estagio"]').getAttribute('aria-checked') === 'true';
      var perfil = $('[data-switch="perfil"]').getAttribute('aria-checked') === 'true';
      var txt = 'Não disponível';
      if (estagio && perfil) txt = 'Disponível e visível';
      else if (estagio) txt = 'Disponível · perfil oculto';
      else if (perfil) txt = 'Perfil visível';
      pill.textContent = txt;
      pill.classList.toggle('is-on', estagio || perfil);
    }

    sw.forEach(function (b) {
      b.addEventListener('click', function () {
        b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true'));
        status();
      });
    });
    // clicar no texto também alterna
    $$('.toggle-row > span').forEach(function (lbl) {
      lbl.addEventListener('click', function () { lbl.nextElementSibling.click(); });
    });
  }

  // ---------- 4. Folha que vira ----------
  function lados() {
    var flip = $('#flip');
    var btns = $$('.side-switch button');
    var thumb = $('.side-switch .thumb');
    if (!flip || !btns.length) return;
    var frente = $('.flip-front', flip);
    var verso = $('.flip-back', flip);

    function moverThumb(btn) {
      thumb.style.width = btn.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + (btn.offsetLeft - 5) + 'px)';
    }

    function mostrar(lado) {
      var empresa = lado === 'empresa';
      flip.classList.toggle('is-back', empresa);
      btns.forEach(function (b) {
        var on = b.getAttribute('data-side') === lado;
        b.setAttribute('aria-pressed', String(on));
        if (on) moverThumb(b);
      });
      // só o lado visível fica acessível ao teclado e ao leitor de tela
      frente.setAttribute('aria-hidden', String(empresa));
      verso.setAttribute('aria-hidden', String(!empresa));
      $$('a', frente).forEach(function (a) { a.tabIndex = empresa ? -1 : 0; });
      $$('a', verso).forEach(function (a) { a.tabIndex = empresa ? 0 : -1; });
    }

    btns.forEach(function (b) {
      b.addEventListener('click', function () { mostrar(b.getAttribute('data-side')); });
    });
    window.addEventListener('resize', function () {
      var ativo = $('.side-switch button[aria-pressed="true"]');
      if (ativo) moverThumb(ativo);
    });
    mostrar('aluno');
  }

  // ---------- 5. Marca-texto e carimbo ----------
  function entradas() {
    var marcas = $$('[data-marca]');
    var stamp = $('#closeStamp');
    var noHero = marcas.filter(function (m) { return m.closest('.lp-hero'); });

    // o grifo do título acontece logo depois que a folha entra
    setTimeout(function () {
      noHero.forEach(function (m) { m.classList.add('is-on'); });
    }, reduzir ? 0 : 650);

    if (!('IntersectionObserver' in window)) {
      marcas.forEach(function (m) { m.classList.add('is-on'); });
      return;
    }
    if (stamp && !reduzir) stamp.classList.add('is-pending');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el === stamp) { el.classList.remove('is-pending'); el.classList.add('is-on'); }
        else el.classList.add('is-on');
        io.unobserve(el);
      });
    }, { threshold: 0.6 });

    marcas.forEach(function (m) { if (noHero.indexOf(m) === -1) io.observe(m); });
    if (stamp) io.observe(stamp);
  }

  function init() { folha(); abas(); interruptores(); lados(); entradas(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
