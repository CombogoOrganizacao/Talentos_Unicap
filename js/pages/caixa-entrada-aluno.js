(function () {
  "use strict";

  let allMsgs = [];
  let openId = null;

  function initials(nome) {
    if (!nome) return '?';
    const parts = nome.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }

  function fmtDateTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtDateOnly(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('pt-BR');
  }

  // Mesmos badges da caixa de saída da empresa
  const STATUS_BADGE = { Enviada: 'badge-gray', Lida: 'badge-blue', Respondida: 'badge-green' };
  const STATUS_LABEL_ALUNO = { Enviada: 'Nova', Lida: 'Lida', Respondida: 'Respondida' };

  Auth.onAuthChange = async function (loggedIn) {
    if (!loggedIn) { window.location.href = 'login.html'; return; }
    const perfil = await API.getProfile();
    if (!perfil || perfil.error) {
      alert('Não foi possível carregar seu perfil de aluno.');
      window.location.href = 'index.html';
      return;
    }
    document.getElementById('alunoNome').textContent = perfil.nome || 'Aluno';
    document.getElementById('alunoAvatar').textContent = initials(perfil.nome)[0] || 'A';
    carregarMensagens();
  };
  Auth.init();
  document.getElementById('btnSair').addEventListener('click', () => Auth.logout());

  async function carregarMensagens() {
    allMsgs = await Mensagens.listarRecebidasPeloAluno();
    if (allMsgs.length) openId = allMsgs[0].id;
    render();
  }

  function getFiltered() {
    const termo = document.getElementById('buscaMsg').value.trim().toLowerCase();
    const status = document.getElementById('filtroStatusMsg').value;
    const dias = parseInt(document.getElementById('filtroPeriodoMsg').value, 10);

    return allMsgs.filter((m) => {
      if (status && m.status !== status) return false;
      if (dias) {
        const limite = Date.now() - dias * 86400000;
        if ((m.criadoEm || 0) < limite) return false;
      }
      if (termo) {
        const haystack = `${m.remetenteNome || ''} ${m.assunto || ''} ${m.vagaRelacionada || ''}`.toLowerCase();
        if (!haystack.includes(termo)) return false;
      }
      return true;
    });
  }

  function render() {
    const list = document.getElementById('msgList');
    const empty = document.getElementById('emptyMsgState');
    const filtered = getFiltered();

    list.innerHTML = '';

    if (!allMsgs.length) {
      empty.hidden = false;
      list.hidden = true;
      return;
    }
    if (!filtered.length) {
      empty.hidden = false;
      document.getElementById('emptyMsgTitle').textContent = 'Nenhuma mensagem encontrada';
      empty.querySelector('p').textContent = 'Ajuste a busca ou os filtros.';
      list.hidden = true;
      return;
    }
    empty.hidden = true;
    list.hidden = false;

    filtered.forEach((m) => {
      const isOpen = m.id === openId;
      const item = document.createElement('div');
      item.className = 'msg-item' + (isOpen ? ' is-open' : '');
      item.innerHTML = `
        <div class="msg-item-top">
          <div class="msg-item-who">
            <div class="msg-avatar">${initials(m.remetenteNome)}</div>
            <div>
              <h4>${m.remetenteNome || 'Empresa'}</h4>
              <div class="sub">${m.assunto || ''}</div>
            </div>
          </div>
          <div class="msg-item-meta">
            ${m.vagaRelacionada ? `<span class="vaga-tag">Vaga: ${m.vagaRelacionada}</span>` : ''}
            <span class="badge ${STATUS_BADGE[m.status] || 'badge-gray'}">${STATUS_LABEL_ALUNO[m.status] || m.status || 'Nova'}</span>
            <span>Recebida em ${fmtDateOnly(m.criadoEm)}</span>
          </div>
        </div>
        ${isOpen ? `
        <div class="msg-thread">
          <div class="msg-bubble sent">
            <div class="label">${m.remetenteNome || 'Empresa'}: ${m.assunto || ''} <span class="timestamp">${fmtDateTime(m.criadoEm)}</span></div>
            ${m.mensagem || ''}
          </div>
          ${m.resposta ? `
          <div class="msg-bubble reply">
            <div class="label">Sua resposta <span class="timestamp">${fmtDateTime(m.resposta.criadoEm)}</span></div>
            ${m.resposta.texto || ''}
          </div>` : ''}
          <div class="reply-box" style="margin-top:12px;">
            <textarea id="replyTexto-${m.id}" rows="3" placeholder="Escreva sua resposta..." style="width:100%;"></textarea>
            <div style="text-align:right;margin-top:8px;">
              <button class="btn btn-primary btn-sm" data-reply="${m.id}">Responder</button>
            </div>
          </div>
        </div>` : ''}
      `;
      item.addEventListener('click', (e) => {
        // Cliques dentro da caixa de resposta não devem abrir/fechar a thread
        if (e.target.closest('.reply-box')) return;
        openId = isOpen ? null : m.id;
        if (openId) {
          Mensagens.marcarComoLidaSeNecessario(m);
        }
        render();
      });
      list.appendChild(item);
    });

    // Botões de responder (ligados fora do innerHTML do item para evitar re-render no meio do clique)
    list.querySelectorAll('[data-reply]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const msgId = btn.dataset.reply;
        const textarea = document.getElementById(`replyTexto-${msgId}`);
        const texto = textarea ? textarea.value.trim() : '';
        const alertEl = document.getElementById(`replyAlert-${msgId}`);

        if (!texto) {
          if (alertEl) alertEl.textContent = 'Escreva uma resposta antes de enviar.';
          else textarea.insertAdjacentHTML('afterend', '<div class="error-msg" id="replyAlert-' + msgId + '">Escreva uma resposta antes de enviar.</div>');
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Enviando...';
        const result = await Mensagens.responder(msgId, texto);
        if (result.error) {
          btn.disabled = false;
          btn.textContent = 'Responder';
          const box = document.getElementById(`replyAlert-${msgId}`);
          if (box) box.textContent = result.error;
          else textarea.insertAdjacentHTML('afterend', '<div class="error-msg" id="replyAlert-' + msgId + '">' + result.error + '</div>');
          return;
        }

        const msg = allMsgs.find((x) => x.id === msgId);
        if (msg) {
          msg.status = 'Respondida';
          msg.resposta = { texto, criadoEm: Date.now() };
        }
        render();
      });
    });
  }

  document.getElementById('buscaMsg').addEventListener('input', render);
  document.getElementById('filtroStatusMsg').addEventListener('change', render);
  document.getElementById('filtroPeriodoMsg').addEventListener('change', render);
})();
