/* ============================================
   TalentoUNICAP - Barra de navegação única
   Cada página só declara a área e carrega este script logo depois:
     <nav class="navbar" data-area="aluno"></nav>
     <script src="js/components/navbar.js"></script>
   Áreas: aluno | empresa | conta (decide pelo login) | home | login |
          cadastro | empresa-publica | simples
   Nome, avatar e foto da conta chegam pelo evento "auth:usuario",
   disparado por js/security/auth.js depois do login.
   ============================================ */
(function () {
  'use strict';

  var script = document.currentScript;
  var nav = script && script.previousElementSibling;
  if (!nav || !nav.matches('nav.navbar')) nav = document.querySelector('nav.navbar[data-area]');
  if (!nav) return;

  var MARCA = '<a href="index.html" class="navbar-brand">' +
    '<img src="img/asabranca_Unicap.png" width="40" alt=""> Talento<span>UNICAP</span></a>';

  var AREAS = {
    aluno: {
      links: [
        ['dashboard.html', 'Meu Currículo'],
        ['lista-vagas.html', 'Portal de Vagas'],
        ['minhas-candidaturas.html', 'Minhas Candidaturas'],
        ['caixa-entrada-aluno.html', 'Mensagens']
      ],
      conta: 'aluno'
    },
    empresa: {
      links: [
        ['busca-talentos.html', 'Buscar Talentos'],
        ['lista-vagas.html', 'Minhas Vagas'],
        ['caixa-saida-empresa.html', 'Mensagens Enviadas']
      ],
      acao: ['cadastro-vaga.html', 'Nova Vaga', 'ph-plus'],
      conta: 'empresa'
    },
    'empresa-publica': {
      links: [['index.html', 'Para Alunos'], ['cadastro-empresa.html', 'Área da Empresa']]
    },
    home: {
      html: '<a href="cadastro-empresa.html" class="nav-text-link">Área da Empresa</a>' +
        '<span class="nav-slot" id="navLinks"></span>'
    },
    login: { html: '<a href="register.html" class="btn btn-primary btn-sm">Criar Conta</a>' },
    cadastro: { html: '<a href="login.html" class="btn btn-secondary btn-sm">Entrar</a>' },
    simples: { html: '' },
    conta: { html: '' }
  };

  // Telas de detalhe acendem o item do menu a que pertencem.
  var ATIVO = {
    'preview.html': 'dashboard.html',
    'curriculo-empresa.html': 'busca-talentos.html',
    'candidaturas-vaga.html': 'lista-vagas.html',
    'exportacao-instagram.html': 'lista-vagas.html'
  };

  var pagina = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var ativo = ATIVO[pagina] || pagina;

  function link(href, rotulo) {
    var atual = href === ativo;
    return '<a href="' + href + '" class="nav-text-link' + (atual ? ' active' : '') + '"' +
      (atual ? ' aria-current="page"' : '') + '>' + rotulo + '</a>';
  }

  function blocoConta(tipo) {
    var avatar = tipo === 'empresa'
      ? '<label class="nav-avatar nav-avatar--editavel" title="Alterar a imagem da empresa">' +
          '<span class="nav-avatar-inicial" data-nav-inicial></span>' +
          '<img data-nav-foto alt="Imagem da empresa" hidden>' +
          '<span class="nav-avatar-edit" aria-hidden="true"><i class="ph-fill ph-camera"></i></span>' +
          '<input type="file" class="visually-hidden" data-nav-foto-input accept="image/png,image/jpeg,image/webp" aria-label="Alterar a imagem da empresa">' +
        '</label>'
      : '<span class="nav-avatar" aria-hidden="true"><span class="nav-avatar-inicial" data-nav-inicial></span></span>';
    return '<span class="nav-conta">' + avatar + '<span class="nav-nome" data-nav-nome></span></span>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-nav-sair>' +
        '<i class="ph-fill ph-sign-out" aria-hidden="true"></i> Sair</button>';
  }

  function render(areaNome) {
    var area = AREAS[areaNome] || AREAS.simples;
    var html = area.html !== undefined ? area.html : '';
    if (area.links) html += area.links.map(function (l) { return link(l[0], l[1]); }).join('');
    if (area.acao) {
      var atual = area.acao[0] === pagina;
      html += '<a href="' + area.acao[0] + '" class="btn btn-primary btn-sm"' + (atual ? ' aria-current="page"' : '') + '>' +
        '<i class="ph-fill ' + area.acao[2] + '" aria-hidden="true"></i> ' + area.acao[1] + '</a>';
    }
    if (area.conta) html += blocoConta(area.conta);

    var container = nav.querySelector('.container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'container';
      nav.appendChild(container);
    }
    // Mantém o botão do menu mobile se ele já existir (mobile-nav.js).
    var toggle = container.querySelector('.nav-toggle');
    var links = container.querySelector('.nav-links');
    if (!links) {
      container.innerHTML = MARCA + '<div class="nav-links"></div>';
      links = container.querySelector('.nav-links');
    }
    if (toggle && toggle.nextElementSibling !== links) container.insertBefore(toggle, links);
    links.innerHTML = html;
    ligarConta();
  }

  // ---------- Conta: nome, avatar, foto e sair ----------
  function setNome(nome) {
    nome = String(nome || '').trim();
    nav.querySelectorAll('[data-nav-nome]').forEach(function (el) { el.textContent = nome; });
    nav.querySelectorAll('[data-nav-inicial]').forEach(function (el) {
      el.textContent = nome ? nome.charAt(0).toUpperCase() : '';
    });
  }

  function setFoto(url) {
    var img = nav.querySelector('[data-nav-foto]');
    var inicial = nav.querySelector('.nav-avatar--editavel [data-nav-inicial]');
    if (!img || !inicial) return;
    if (url) { img.src = url; img.hidden = false; inicial.hidden = true; }
    else { img.removeAttribute('src'); img.hidden = true; inicial.hidden = false; }
  }

  function ligarConta() {
    var sair = nav.querySelector('[data-nav-sair]');
    if (sair) sair.addEventListener('click', function () { if (window.Auth) window.Auth.logout(); });

    var input = nav.querySelector('[data-nav-foto-input]');
    if (input) input.addEventListener('change', async function () {
      var file = input.files && input.files[0];
      if (!file || !window.APIEmpresa) return;
      var label = input.closest('.nav-avatar');
      label.classList.add('is-loading');
      var resultado = await window.APIEmpresa.uploadFotoPerfil(file);
      label.classList.remove('is-loading');
      input.value = ''; // permite escolher o mesmo arquivo de novo
      if (resultado && resultado.error) { alert(resultado.error); return; }
      // Cache-buster: o navegador mostra a imagem nova na hora.
      setFoto(resultado.foto_perfil_url + '?t=' + Date.now());
    });
  }

  var preenchido = false;

  async function preencher(usuario) {
    if (!usuario) return;
    preenchido = true;
    if (nav.dataset.area === 'conta') render(usuario.tipoConta === 'empresa' ? 'empresa' : 'aluno');
    setNome(usuario.nome);
    if (usuario.tipoConta === 'empresa' && window.APIEmpresa && nav.querySelector('[data-nav-foto]')) {
      var perfil = await window.APIEmpresa.getPerfil();
      if (perfil && !perfil.error) {
        setNome(perfil.nome_empresa);
        setFoto(perfil.foto_perfil_url);
      }
    }
  }

  render(nav.dataset.area);
  document.addEventListener('auth:usuario', function (e) { preencher(e.detail); });
  if (window.Auth && window.Auth.user) preencher(window.Auth.user);

  // Páginas que não chamam Auth.init() (lista de vagas, candidaturas...):
  // a navbar busca a conta por conta própria depois do carregamento.
  var precisaConta = ['aluno', 'empresa', 'conta'].indexOf(nav.dataset.area) !== -1;
  window.addEventListener('load', async function () {
    if (preenchido || !precisaConta || !window.Auth || !window.supabaseClient) return;
    try {
      var resposta = await window.supabaseClient.auth.getSession();
      var sessao = resposta && resposta.data && resposta.data.session;
      if (!sessao) return;
      var usuario = window.Auth.user || await window.Auth._carregarUsuario(sessao.user.id);
      if (!preenchido) preencher(usuario);
    } catch (e) {
      console.warn('Navbar: não foi possível carregar a conta.', e);
    }
  });

  window.Navbar = { setNome: setNome };
})();
