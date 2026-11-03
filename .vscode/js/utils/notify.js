// ============================================
// Utils - Notificações animadas
//
//  Notify.toast(mensagem, { tipo, titulo, duracao })
//  Notify.success / error / warning / info (mensagem, opcoes)
//  Notify.confirm({ titulo, mensagem, itens, confirmar, cancelar, tipo })
//      -> Promise<boolean>
// ============================================
(function () {
  'use strict';

  var reduzir = !!(false /* forçado: ignora "reduzir movimento" do sistema */);

  var ICONES = {
    success: 'ph-fill ph-check-circle',
    error: 'ph-fill ph-x-circle',
    warning: 'ph-fill ph-warning',
    info: 'ph-fill ph-info',
    danger: 'ph-fill ph-trash'
  };

  var TITULOS = {
    success: 'Tudo certo!',
    error: 'Algo deu errado',
    warning: 'Atenção',
    info: 'Aviso'
  };

  var DURACAO = { success: 4000, info: 4500, warning: 5500, error: 7000 };
  var MAX_VISIVEIS = 4;
  var TEMPO_SAIDA = reduzir ? 0 : 340;

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function icone(classes) {
    var i = el('i', classes);
    i.setAttribute('aria-hidden', 'true');
    return i;
  }

  // ---------------- Toasts ----------------
  var pilha = null;

  function obterPilha() {
    if (pilha && document.body.contains(pilha)) return pilha;
    pilha = el('div', 'notify-stack');
    pilha.setAttribute('role', 'region');
    pilha.setAttribute('aria-label', 'Notificações');
    pilha.setAttribute('data-ux', '');
    document.body.appendChild(pilha);
    return pilha;
  }

  function fecharToast(toast) {
    if (!toast || toast._saindo) return;
    toast._saindo = true;
    clearTimeout(toast._timer);
    toast.style.setProperty('--h', toast.offsetHeight + 'px');
    toast.classList.add('is-leaving');
    setTimeout(function () { toast.remove(); }, TEMPO_SAIDA);
  }

  function toast(mensagem, opcoes) {
    opcoes = opcoes || {};
    var tipo = ICONES[opcoes.tipo] && opcoes.tipo !== 'danger' ? opcoes.tipo : 'info';
    var texto = mensagem == null ? '' : String(mensagem);
    var duracao = opcoes.duracao != null ? opcoes.duracao : DURACAO[tipo];
    var raiz = obterPilha();

    // Mensagem idêntica já na tela: troca pela nova
    Array.prototype.forEach.call(raiz.children, function (t) {
      if (t._chave === tipo + '|' + texto) fecharToast(t);
    });

    // Limita a quantidade de avisos empilhados
    var ativos = Array.prototype.filter.call(raiz.children, function (t) { return !t._saindo; });
    while (ativos.length >= MAX_VISIVEIS) fecharToast(ativos.shift());

    var t = el('div', 'notify-toast notify-' + tipo);
    t._chave = tipo + '|' + texto;
    t.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    t.style.setProperty('--dur', duracao + 'ms');

    var ic = el('span', 'notify-icon');
    ic.appendChild(icone(ICONES[tipo]));

    var corpo = el('div', 'notify-body');
    corpo.appendChild(el('strong', 'notify-title', opcoes.titulo || TITULOS[tipo]));
    if (texto) corpo.appendChild(el('p', 'notify-msg', texto));

    var x = el('button', 'notify-close');
    x.type = 'button';
    x.setAttribute('aria-label', 'Fechar aviso');
    x.appendChild(icone('ph ph-x'));
    x.addEventListener('click', function () { fecharToast(t); });

    t.appendChild(ic);
    t.appendChild(corpo);
    t.appendChild(x);

    if (duracao > 0) {
      t.appendChild(el('span', 'notify-progress'));

      // Pausa a contagem enquanto o mouse está sobre o aviso
      var restante = duracao;
      var inicio = 0;
      var iniciar = function () {
        inicio = Date.now();
        t._timer = setTimeout(function () { fecharToast(t); }, restante);
      };
      t.addEventListener('mouseenter', function () {
        clearTimeout(t._timer);
        restante -= Date.now() - inicio;
      });
      t.addEventListener('mouseleave', function () {
        if (!t._saindo) iniciar();
      });
      iniciar();
    }

    raiz.appendChild(t);
    return { fechar: function () { fecharToast(t); } };
  }

  // ---------------- Diálogo de confirmação ----------------
  function confirmar(opcoes) {
    opcoes = opcoes || {};
    var tipo = opcoes.tipo || 'warning';
    var perigo = tipo === 'danger';
    var anterior = document.activeElement;
    var idTitulo = 'notify-dlg-t-' + Date.now();
    var idMsg = 'notify-dlg-m-' + Date.now();

    return new Promise(function (resolve) {
      var overlay = el('div', 'notify-overlay');
      overlay.setAttribute('data-ux', '');

      var dlg = el('div', 'notify-dialog notify-dialog-' + tipo);
      dlg.setAttribute('role', 'alertdialog');
      dlg.setAttribute('aria-modal', 'true');
      dlg.setAttribute('aria-labelledby', idTitulo);
      dlg.setAttribute('aria-describedby', idMsg);

      var ic = el('div', 'notify-dialog-icon');
      ic.appendChild(icone(ICONES[tipo] || ICONES.warning));

      var titulo = el('h3', 'notify-dialog-title', opcoes.titulo || 'Tem certeza?');
      titulo.id = idTitulo;

      var msg = el('p', 'notify-dialog-msg', opcoes.mensagem || '');
      msg.id = idMsg;

      dlg.appendChild(ic);
      dlg.appendChild(titulo);
      dlg.appendChild(msg);

      var itens = (opcoes.itens || []).filter(Boolean);
      if (itens.length) {
        var lista = el('ul', 'notify-dialog-list');
        itens.slice(0, 5).forEach(function (nome) { lista.appendChild(el('li', null, nome)); });
        if (itens.length > 5) {
          lista.appendChild(el('li', 'notify-dialog-more', 'e mais ' + (itens.length - 5) + '…'));
        }
        dlg.appendChild(lista);
      }

      var rodape = el('div', 'notify-dialog-actions');
      var btnCancelar = el('button', 'btn btn-secondary', opcoes.cancelar || 'Cancelar');
      btnCancelar.type = 'button';
      var btnOk = el('button', 'btn ' + (perigo ? 'btn-danger' : 'btn-primary'), opcoes.confirmar || 'Confirmar');
      btnOk.type = 'button';
      rodape.appendChild(btnCancelar);
      rodape.appendChild(btnOk);
      dlg.appendChild(rodape);

      overlay.appendChild(dlg);
      document.body.appendChild(overlay);

      var encerrado = false;
      function encerrar(resultado) {
        if (encerrado) return;
        encerrado = true;
        document.removeEventListener('keydown', teclas, true);
        overlay.classList.add('is-leaving');
        setTimeout(function () {
          overlay.remove();
          if (anterior && anterior.focus && document.body.contains(anterior)) {
            try { anterior.focus({ preventScroll: true }); } catch (_) { /* sem foco */ }
          }
          resolve(resultado);
        }, TEMPO_SAIDA);
      }

      function teclas(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          encerrar(false);
        } else if (e.key === 'Tab') {
          var foco = [btnCancelar, btnOk];
          var i = foco.indexOf(document.activeElement);
          e.preventDefault();
          if (e.shiftKey) i = i <= 0 ? foco.length - 1 : i - 1;
          else i = i === foco.length - 1 ? 0 : i + 1;
          foco[i].focus();
        }
      }

      btnCancelar.addEventListener('click', function () { encerrar(false); });
      btnOk.addEventListener('click', function () { encerrar(true); });
      overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) encerrar(false); });
      document.addEventListener('keydown', teclas, true);

      // Ação destrutiva: o foco começa em "Cancelar"
      (perigo ? btnCancelar : btnOk).focus();
    });
  }

  window.Notify = {
    toast: toast,
    confirm: confirmar,
    success: function (m, o) { return toast(m, Object.assign({}, o, { tipo: 'success' })); },
    error: function (m, o) { return toast(m, Object.assign({}, o, { tipo: 'error' })); },
    warning: function (m, o) { return toast(m, Object.assign({}, o, { tipo: 'warning' })); },
    info: function (m, o) { return toast(m, Object.assign({}, o, { tipo: 'info' })); }
  };
})();