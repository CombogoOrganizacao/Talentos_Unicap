// ============================================
// Utils - barra "Voltar / Próximo" no rodapé das telas
//
// - Dashboard (editor de currículo): navega entre as abas
//   (Dados Pessoais → Experiências → ... → Mensagens → Preview).
// - Demais telas: segue o fluxo definido em ROTAS (abaixo).
// - Telas sem rota definida: "Voltar" volta ao histórico do navegador.
// A barra é inserida logo antes do <footer class="footer">.
// ============================================
(function () {
  'use strict';

  var ICON_PREV = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

  // Fluxo entre telas. Valor string = página; função = resolvida no clique;
  // null = botão desabilitado; ausente = histórico do navegador (voltar).
  var ROTAS = {
    // Landing
    'index.html': { voltar: null, proximo: 'login.html' },

    // Aluno: Currículo (abas) → Preview → Vagas → Candidaturas → Mensagens
    'preview.html': { voltar: 'dashboard.html', proximo: 'lista-vagas.html' },
    'minhas-candidaturas.html': { voltar: 'lista-vagas.html', proximo: 'caixa-entrada-aluno.html' },
    'caixa-entrada-aluno.html': { voltar: 'minhas-candidaturas.html', proximo: null },

    // Empresa: Busca → Nova vaga → Minhas vagas → Mensagens enviadas
    'busca-talentos.html': { voltar: null, proximo: 'cadastro-vaga.html' },
    'cadastro-vaga.html': { voltar: 'busca-talentos.html', proximo: 'lista-vagas.html' },
    'caixa-saida-empresa.html': { voltar: 'lista-vagas.html', proximo: null },

    // Compartilhada: depende de quem está logado (variável `modo` de lista-vagas.js)
    'lista-vagas.html': {
      voltar: function () { return modoAluno() ? 'preview.html' : 'cadastro-vaga.html'; },
      proximo: function () { return modoAluno() ? 'minhas-candidaturas.html' : 'caixa-saida-empresa.html'; }
    },

    // Telas de detalhe (dependem de parâmetros na URL): só voltar
    'candidaturas-vaga.html': { voltar: 'lista-vagas.html', proximo: null },
    'curriculo-empresa.html': { voltar: 'busca-talentos.html', proximo: null },
    'exportacao-instagram.html': { voltar: 'lista-vagas.html', proximo: null }
  };

  function modoAluno() {
    try { return typeof modo !== 'undefined' && modo === 'aluno'; } catch (_) { return false; }
  }

  function paginaAtual() {
    return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function resolver(destino) {
    return typeof destino === 'function' ? destino() : destino;
  }

  function criarBotao(tipo, rotulo) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn page-nav-btn ' + (tipo === 'proximo' ? 'btn-primary' : 'btn-secondary');
    b.setAttribute('data-page-nav', tipo);
    b.innerHTML = tipo === 'proximo'
      ? '<span>' + rotulo + '</span>' + ICON_NEXT
      : ICON_PREV + '<span>' + rotulo + '</span>';
    return b;
  }

  function irPara(url) { if (url) window.location.href = url; }

  function voltarHistorico() {
    if (window.history.length > 1) window.history.back();
    else irPara('index.html');
  }

  function montarBarra() {
    var pagina = paginaAtual();
    var ehDashboard = !!document.querySelector('.tabs .tab-btn[data-tab]');
    var rota = ROTAS[pagina];

    var nav = document.createElement('nav');
    nav.className = 'page-nav';
    nav.setAttribute('aria-label', 'Navegação entre telas');
    var inner = document.createElement('div');
    inner.className = 'container page-nav-inner';
    var voltar = criarBotao('voltar', 'Voltar');
    var proximo = criarBotao('proximo', 'Próximo');
    inner.appendChild(voltar);
    inner.appendChild(proximo);
    nav.appendChild(inner);

    var footer = document.querySelector('footer.footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(nav, footer);
    else document.body.appendChild(nav);

    if (ehDashboard) { ligarAbas(voltar, proximo); return; }

    var destinoVoltar = rota ? resolver(rota.voltar) : undefined;
    var destinoProximo = rota ? resolver(rota.proximo) : null;

    // Voltar: rota definida → vai para ela; null → desabilitado; sem rota → histórico
    if (rota && rota.voltar === null) voltar.disabled = true;
    voltar.addEventListener('click', function () {
      var d = rota ? resolver(rota.voltar) : undefined;
      if (d) irPara(d); else voltarHistorico();
    });

    if (!rota || rota.proximo == null) proximo.disabled = true;
    proximo.addEventListener('click', function () { irPara(rota && resolver(rota.proximo)); });
  }

  // Dashboard: Voltar/Próximo percorrem as abas; no fim, Próximo abre o Preview.
  function ligarAbas(voltar, proximo) {
    var botoesAba = function () { return Array.prototype.slice.call(document.querySelectorAll('.tabs .tab-btn[data-tab]')); };
    var indiceAtual = function () {
      var lista = botoesAba();
      for (var i = 0; i < lista.length; i++) if (lista[i].classList.contains('active')) return i;
      return 0;
    };
    var irParaAba = function (i) {
      var alvo = botoesAba()[i];
      if (!alvo) return;
      if (typeof window.switchTab === 'function') window.switchTab(alvo.dataset.tab);
      else alvo.click();
      var tabs = document.querySelector('.tabs');
      if (tabs && tabs.scrollIntoView) tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    var atualizar = function () {
      var i = indiceAtual(), ultimo = botoesAba().length - 1;
      voltar.disabled = i <= 0;
      proximo.querySelector('span').textContent = i >= ultimo ? 'Ver Preview' : 'Próximo';
    };

    voltar.addEventListener('click', function () { irParaAba(indiceAtual() - 1); });
    proximo.addEventListener('click', function () {
      var i = indiceAtual();
      if (i >= botoesAba().length - 1) irPara('preview.html'); else irParaAba(i + 1);
    });

    var tabs = document.querySelector('.tabs');
    if (tabs) new MutationObserver(atualizar).observe(tabs, { attributes: true, subtree: true, attributeFilter: ['class'] });
    atualizar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarBarra);
  else montarBarra();
})();
