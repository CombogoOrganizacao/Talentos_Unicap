// ============================================
// Mensagens - Caixa de entrada integrada ao painel do aluno
// Reutiliza js/mensagens.js e o nó Firebase: mensagens/{msgId}
// ============================================
(function () {
  "use strict";

  let allMsgsPainel = [];
  let openIdPainel = null;
  let initialized = false;

  const STATUS_BADGE = {
    Enviada: 'badge-gray',
    Lida: 'badge-blue',
    Respondida: 'badge-green'
  };

  const STATUS_LABEL = {
    Enviada: 'Nova',
    Lida: 'Lida',
    Respondida: 'Respondida'
  };

  function initials(nome) {
    if (!nome) return '?';
    const parts = String(nome).trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }

  function fmtDateTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR') + ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function fmtDateOnly(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  }

  // Evita que conteúdo digitado por usuários seja interpretado como HTML.
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getFiltered() {
    const busca = document.getElementById('buscaMensagensPainel');
    const statusEl = document.getElementById('filtroStatusMensagensPainel');
    const periodoEl = document.getElementById('filtroPeriodoMensagensPainel');

    const termo = busca ? busca.value.trim().toLowerCase() : '';
    const status = statusEl ? statusEl.value : '';
    const dias = periodoEl ? parseInt(periodoEl.value, 10) : 0;

    return allMsgsPainel.filter((m) => {
      if (status && m.status !== status) return false;

      if (dias) {
        const limite = Date.now() - dias * 86400000;
        if ((m.criadoEm || 0) < limite) return false;
      }

      if (termo) {
        const haystack = [
          m.remetenteNome,
          m.assunto,
          m.vagaRelacionada,
          m.mensagem
        ].map(v => String(v || '')).join(' ').toLowerCase();

        if (!haystack.includes(termo)) return false;
      }

      return true;
    });
  }

  function atualizarBadge() {
    const badge = document.getElementById('messagesUnreadBadge');
    if (!badge) return;

    const unread = allMsgsPainel.filter(m => m.status === 'Enviada').length;

    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.classList.remove('hidden');
    } else {
      badge.textContent = '0';
      badge.classList.add('hidden');
    }
  }

  async function carregarMensagens() {
    if (!Auth.uid || typeof Mensagens === 'undefined') return;

    allMsgsPainel = await Mensagens.listarRecebidasPeloAluno();

    if (!Array.isArray(allMsgsPainel)) {
      allMsgsPainel = [];
    }

    if (allMsgsPainel.length && !openIdPainel) {
      openIdPainel = allMsgsPainel[0].id;
    }

    atualizarBadge();
    render();
  }

  function render() {
    const list = document.getElementById('mensagensPainelList');
    const empty = document.getElementById('mensagensPainelEmpty');
    const emptyTitle = document.getElementById('mensagensPainelEmptyTitle');
    const emptyText = document.getElementById('mensagensPainelEmptyText');

    if (!list || !empty) return;

    const filtered = getFiltered();
    list.innerHTML = '';

    if (!allMsgsPainel.length) {
      emptyTitle.textContent = 'Nenhuma mensagem recebida ainda';
      emptyText.textContent =
        'Quando uma empresa se interessar pelo seu currículo, a mensagem aparecerá aqui.';
      empty.hidden = false;
      list.hidden = true;
      atualizarBadge();
      return;
    }

    if (!filtered.length) {
      emptyTitle.textContent = 'Nenhuma mensagem encontrada';
      emptyText.textContent = 'Ajuste a busca ou os filtros para ver suas mensagens.';
      empty.hidden = false;
      list.hidden = true;
      atualizarBadge();
      return;
    }

    empty.hidden = true;
    list.hidden = false;

    filtered.forEach((m) => {
      const isOpen = m.id === openIdPainel;
      const item = document.createElement('div');

      item.className = 'msg-item' + (isOpen ? ' is-open' : '');

      item.innerHTML = `
        <div class="msg-item-top">
          <div class="msg-item-who">
            <div class="msg-avatar">${escapeHtml(initials(m.remetenteNome))}</div>
            <div>
              <h4>${escapeHtml(m.remetenteNome || 'Empresa')}</h4>
              <div class="sub">${escapeHtml(m.assunto || '')}</div>
            </div>
          </div>

          <div class="msg-item-meta">
            ${m.vagaRelacionada
              ? `<span class="vaga-tag">Vaga: ${escapeHtml(m.vagaRelacionada)}</span>`
              : ''}
            <span class="badge ${STATUS_BADGE[m.status] || 'badge-gray'}">
              ${escapeHtml(STATUS_LABEL[m.status] || m.status || 'Nova')}
            </span>
            <span>Recebida em ${escapeHtml(fmtDateOnly(m.criadoEm))}</span>
          </div>
        </div>

        ${isOpen ? `
          <div class="msg-thread">
            <div class="msg-bubble sent">
              <div class="label">
                ${escapeHtml(m.remetenteNome || 'Empresa')}: ${escapeHtml(m.assunto || '')}
                <span class="timestamp">${escapeHtml(fmtDateTime(m.criadoEm))}</span>
              </div>
              ${escapeHtml(m.mensagem || '').replace(/\n/g, '<br>')}
            </div>

            ${m.resposta ? `
              <div class="msg-bubble reply">
                <div class="label">
                  Sua resposta
                  <span class="timestamp">${escapeHtml(fmtDateTime(m.resposta.criadoEm))}</span>
                </div>
                ${escapeHtml(m.resposta.texto || '').replace(/\n/g, '<br>')}
              </div>
            ` : ''}

            ${!m.resposta ? `
              <div class="reply-box" style="margin-top:12px;">
                <textarea
                  id="replyTextoPainel-${escapeHtml(m.id)}"
                  rows="3"
                  placeholder="Escreva sua resposta..."
                  style="width:100%;"></textarea>

                <div id="replyAlertPainel-${escapeHtml(m.id)}"
                  class="error-msg hidden"
                  style="margin-top:6px;"></div>

                <div style="text-align:right;margin-top:8px;">
                  <button class="btn btn-primary btn-sm"
                    data-reply-painel="${escapeHtml(m.id)}">
                    Responder
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      `;

      item.addEventListener('click', async (e) => {
        if (e.target.closest('.reply-box')) return;

        openIdPainel = isOpen ? null : m.id;

        if (openIdPainel && m.status === 'Enviada') {
          const result = await Mensagens.marcarComoLidaSeNecessario(m);
          if (result && result.error) {
            console.warn('Não foi possível marcar a mensagem como lida:', result.error);
          }
          atualizarBadge();
        }

        render();
      });

      list.appendChild(item);
    });

    list.querySelectorAll('[data-reply-painel]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const msgId = btn.dataset.replyPainel;
        const textarea = document.getElementById(`replyTextoPainel-${msgId}`);
        const alertEl = document.getElementById(`replyAlertPainel-${msgId}`);
        const texto = textarea ? textarea.value.trim() : '';

        if (!texto) {
          if (alertEl) {
            alertEl.textContent = 'Escreva uma resposta antes de enviar.';
            alertEl.classList.remove('hidden');
          }
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Enviando...';

        const result = await Mensagens.responder(msgId, texto);

        if (result.error) {
          btn.disabled = false;
          btn.textContent = 'Responder';

          if (alertEl) {
            alertEl.textContent = result.error;
            alertEl.classList.remove('hidden');
          }
          return;
        }

        const msg = allMsgsPainel.find(x => x.id === msgId);

        if (msg) {
          msg.status = 'Respondida';
          msg.resposta = {
            texto: texto,
            criadoEm: Date.now()
          };
        }

        atualizarBadge();
        render();
      });
    });

    atualizarBadge();
  }

  // Chamado pelo dashboard.js depois que Auth e o perfil já foram carregados.
  window.initMensagensPainelAluno = function () {
    if (initialized) {
      atualizarBadge();
      render();
      return;
    }

    initialized = true;

    const tabBtn = document.querySelector('.tab-btn[data-tab="messages"]');

    if (tabBtn) {
      tabBtn.addEventListener('click', () => {
        carregarMensagens();
      });
    }

    const busca = document.getElementById('buscaMensagensPainel');
    const status = document.getElementById('filtroStatusMensagensPainel');
    const periodo = document.getElementById('filtroPeriodoMensagensPainel');

    if (busca) busca.addEventListener('input', render);
    if (status) status.addEventListener('change', render);
    if (periodo) periodo.addEventListener('change', render);

    carregarMensagens();
  };
})();
