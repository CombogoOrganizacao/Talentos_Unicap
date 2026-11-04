/* ============================================
   TalentoUNICAP - Ícones de áreas profissionais no fundo das telas
   - Camada fixa atrás do conteúdo, em 3 profundidades (longe / meio / perto)
   - Cada ícone sobe numa velocidade diferente ao rolar a página (paralaxe)
   - Aparece suavemente ao entrar na tela, some ao sair (ciclo contínuo, sem "pulo")
   - Rolagem com inércia (suavizada) + leve inclinação conforme a velocidade
   - Mouse: deslocamento sutil por profundidade (só em dispositivos com mouse)
   - Ícones no centro da tela ganham destaque (brilho/cor)
   Sem dependências e sem imagens externas (SVGs embutidos).
   ============================================ */
(function () {
  'use strict';

  // false = ignora "reduzir movimento" do sistema (decisão do projeto).
  // true  = respeita a preferência e não cria o fundo animado.
  var RESPEITAR_REDUCAO = false;
  if (RESPEITAR_REDUCAO && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.bgfx')) return;

  function svg(p) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  // Cada área tem uma cor (RGB) própria, usada em tom bem suave.
  var C = {
    tec: '176,16,43', saude: '224,54,76', eng: '194,131,48', direito: '122,0,30',
    edu: '200,80,90', fin: '217,154,61', criativo: '184,77,103', com: '224,90,70',
    ciencia: '150,20,50', gestao: '112,10,40', agro: '168,110,40', log: '140,70,80'
  };

  var ICONS = [
    // TECNOLOGIA
    { c: C.tec, p: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>' },                                                                    // código
    { c: C.tec, p: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>' }, // chip
    { c: C.tec, p: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>' }, // banco de dados
    { c: C.tec, p: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>' },                                // segurança
    { c: C.tec, p: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 11a3.5 3.5 0 0 1-.5 7z"/>' },                                                // nuvem
    // SAÚDE
    { c: C.saude, p: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>' },                                       // cruz
    { c: C.saude, p: '<path d="M3 12h4l2-5 4 10 2-5h6"/>' },                                                                                // batimento
    { c: C.saude, p: '<path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v2a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="12" r="2"/>' },                         // estetoscópio
    { c: C.saude, p: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>' },                                   // coração
    // ENGENHARIA E CONSTRUÇÃO
    { c: C.eng, p: '<path d="M3 17h18v2H3zM5 17a7 7 0 0 1 14 0M12 6v4M9 10h6"/>' },                                                         // capacete
    { c: C.eng, p: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>' }, // engrenagem
    { c: C.eng, p: '<path d="M4 21h16M8 21V9l8-6M8 9h10M16 3v6M16 9v5"/><circle cx="16" cy="16" r="1.4"/>' },                                // guindaste
    { c: C.eng, p: '<path d="M12 3v3M12 6 6 20M12 6l6 14M8 15h8"/><circle cx="12" cy="4" r="1"/>' },                                        // compasso (arquitetura)
    // DIREITO
    { c: C.direito, p: '<path d="M12 4v16M7 20h10M5 8h14M5 8l-3 7a3 3 0 0 0 6 0zM19 8l-3 7a3 3 0 0 0 6 0z"/>' },                           // balança
    // EDUCAÇÃO
    { c: C.edu, p: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>' },                           // capelo
    { c: C.edu, p: '<path d="M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 0-2 2zM4 19V5M9 7h6"/>' },                                                  // livro
    { c: C.edu, p: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>' },                  // globo
    // FINANÇAS
    { c: C.fin, p: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },                                                                       // gráfico de barras
    { c: C.fin, p: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>' },                                                                              // crescimento
    { c: C.fin, p: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M16 11v6"/>' },         // calculadora
    { c: C.fin, p: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5C14 8.5 13 8 12 8c-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v2M12 16v2"/>' }, // moeda
    // DESIGN, ARTES E COMUNICAÇÃO
    { c: C.criativo, p: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.5-1 0-2 1.5-2H17a4 4 0 0 0 4-4c0-5-4-10-9-10z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="11" r="1"/>' }, // paleta
    { c: C.criativo, p: '<path d="m4 20 1-4L16 5l3 3L8 19zM14 7l3 3"/>' },                                                                // lápis
    { c: C.criativo, p: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>' },                                         // câmera
    { c: C.com, p: '<path d="M4 10v4l10 4V6zM14 8c3 0 5 1.5 5 4s-2 4-5 4M7 14l1 5h3l-1-4"/>' },                                            // megafone
    { c: C.com, p: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>' },                     // microfone
    // CIÊNCIA E PSICOLOGIA
    { c: C.ciencia, p: '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3M7.5 15h9"/>' },                   // frasco
    { c: C.ciencia, p: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4a2 2 0 0 0-2 0zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1V4a2 2 0 0 1 2 0z"/>' }, // cérebro
    // GESTÃO E ADMINISTRAÇÃO
    { c: C.gestao, p: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>' }, // maleta
    { c: C.gestao, p: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>' }, // organograma
    { c: C.gestao, p: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 15a5 5 0 0 1 6 5"/>' }, // pessoas (RH)
    // AGRO, GASTRONOMIA E LOGÍSTICA
    { c: C.agro, p: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8"/>' },                                                         // folha
    { c: C.agro, p: '<path d="M7 20v-5a4 4 0 0 1-1-7.5A4 4 0 0 1 12 5a4 4 0 0 1 6 2.5A4 4 0 0 1 17 15v5zM7 17h10"/>' },                      // chef
    { c: C.log, p: '<path d="M2 6h11v10H2zM13 9h4l3 3v4h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>' }   // caminhão
  ];

  // profundidade: velocidade da rolagem, tamanho, opacidade máxima
  var LAYERS = [
    { s: 0.10, size: [34, 46], op: 0.34, d: 0.5 },   // longe
    { s: 0.22, size: [50, 68], op: 0.44, d: 1.0 },   // meio
    { s: 0.40, size: [74, 100], op: 0.52, d: 1.7 }   // perto
  ];
  var PATTERN = [0, 1, 0, 2, 1, 0, 1, 2, 0, 1, 0, 1, 2, 0]; // poucos "perto", muitos "longe"

  function frac(n) { return n - Math.floor(n); }

  var small = window.innerWidth < 768;
  var COUNT = small ? 14 : 30;

  var layer = document.createElement('div');
  layer.className = 'bgfx';
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('data-ux', '');

  var items = [];
  for (var i = 0; i < COUNT; i++) {
    var L = LAYERS[PATTERN[i % PATTERN.length]];
    var icon = ICONS[(i * 7 + 3) % ICONS.length];          // mistura as áreas
    var size = Math.round(L.size[0] + frac(i * 0.7548776) * (L.size[1] - L.size[0]));
    var x = 4 + frac(i * 0.6180339) * 92;                  // distribuição uniforme (razão áurea)
    var y = frac(i * 0.7548776 + 0.17);

    var o = document.createElement('div');
    o.className = 'bgfx-o';
    o.style.left = x.toFixed(1) + '%';
    o.style.setProperty('--s', size + 'px');
    o.style.setProperty('--c', icon.c);
    o.style.setProperty('--i', i);
    o.style.setProperty('--fd', (6 + frac(i * 0.31) * 6).toFixed(1) + 's');
    o.style.setProperty('--fdl', (-frac(i * 0.57) * 8).toFixed(1) + 's');
    o.innerHTML = '<div class="bgfx-m"><div class="bgfx-i">' + svg(icon.p) + '</div></div>';
    layer.appendChild(o);

    items.push({
      el: o, y: y, s: L.s, d: L.d, op: L.op,
      rot: (frac(i * 0.41) * 40 - 20),                     // inclinação inicial
      rs: (i % 2 ? 1 : -1) * (0.006 + frac(i * 0.13) * 0.012), // giro conforme a rolagem
      focus: false
    });
  }
  document.body.appendChild(layer);

  // ---------- animação ligada à rolagem ----------
  var vh = window.innerHeight;
  var PAD = 120;
  var target = window.pageYOffset || 0;
  var cur = target;
  var vel = 0;
  var mx = 0, my = 0, mxT = 0, myT = 0;
  var running = false;
  var hasMouse = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  function render() {
    var range = vh + PAD * 2;
    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      var raw = it.y * range - cur * it.s;
      var m = ((raw % range) + range) % range;     // 0..range, volta ao início sem "pulo"
      var t = m / range;                           // 0..1 ao longo da tela
      var bell = Math.pow(Math.sin(Math.PI * t), 1.3);   // 0 nas bordas, 1 no meio
      var sc = 0.7 + 0.3 * bell;
      var rot = it.rot + cur * it.rs + vel * 0.05 * it.d;
      var tx = mx * it.d * 22;
      var ty = m - PAD + my * it.d * 16;
      it.el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      it.el.style.opacity = (it.op * bell).toFixed(3);

      var f = bell > 0.82;                          // destaque quando passa pelo centro
      if (f !== it.focus) { it.focus = f; it.el.classList.toggle('is-focus', f); }
    }
  }

  function loop() {
    running = false;
    target = window.pageYOffset || document.documentElement.scrollTop || 0;
    cur += (target - cur) * 0.12;                   // inércia
    vel = Math.max(-40, Math.min(40, target - cur));
    mx += (mxT - mx) * 0.08;
    my += (myT - my) * 0.08;
    render();
    if (Math.abs(target - cur) > 0.2 || Math.abs(mxT - mx) > 0.002 || Math.abs(myT - my) > 0.002) schedule();
    else { cur = target; vel = 0; render(); }
  }

  function schedule() {
    if (!running) { running = true; window.requestAnimationFrame(loop); }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; schedule(); }, { passive: true });
  if (hasMouse) {
    window.addEventListener('pointermove', function (e) {
      mxT = (e.clientX / window.innerWidth - 0.5) * 2;
      myT = (e.clientY / window.innerHeight - 0.5) * 2;
      schedule();
    }, { passive: true });
  }

  // cada aba/seção muda a altura da página: reposiciona sem esperar rolagem
  document.addEventListener('click', function () { setTimeout(schedule, 60); }, { passive: true });

  render();
  schedule();
})();
