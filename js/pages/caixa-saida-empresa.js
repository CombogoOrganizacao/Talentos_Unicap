(function () {
  "use strict";

  let allMsgs = [];
  let openId = null;
  const esc = window.escapeHtml;

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

  const STATUS_BADGE = { Enviada: 'badge-gray', Lida: 'badge-blue', Respondida: 'badge-green' };

  Auth.onAuthChange = async function (loggedIn) {
    if (!loggedIn) { window.location.href = 'login.html'; return; }
    const perfil = await APIEmpresa.getPerfil();
    if (!perfil || perfil.error) {
      alert('Esta conta não está cadastrada como empresa.');
      window.location.href = 'index.html';
      return;
    }
    carregarMensagens();
  };
  Auth.init();

  async function carregarMensagens() {
    allMsgs = await Mensagens.listarEnviadasPelaEmpresa();
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
        const haystack = `${m.destinatarioNome || ''} ${m.assunto || ''} ${m.vagaRelacionada || ''}`.toLowerCase();
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
      empty.querySelector('h2').textContent = 'Nenhuma mensagem encontrada';
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
            <div class="msg-avatar">${esc(initials(m.destinatarioNome))}</div>
            <div>
              <h4>${esc(m.destinatarioNome || 'Candidato')}</h4>
              <div class="sub">${esc(m.assunto)}</div>
            </div>
          </div>
          <div class="msg-item-meta">
            ${m.vagaRelacionada ? `<span class="vaga-tag">Vaga: ${esc(m.vagaRelacionada)}</span>` : ''}
            <span class="badge ${STATUS_BADGE[m.status] || 'badge-gray'}">${esc(m.status || 'Enviada')}</span>
            <span>Enviada em ${fmtDateOnly(m.criadoEm)}</span>
          </div>
        </div>
        ${isOpen ? `
        <div class="msg-thread">
          <div class="msg-bubble sent">
            <div class="label">Sua mensagem: ${esc(m.assunto)} <span class="timestamp">${fmtDateTime(m.criadoEm)}</span></div>
            ${esc(m.mensagem)}
          </div>
          ${m.resposta ? `
          <div class="msg-bubble reply">
            <div class="label">Resposta de ${esc(m.destinatarioNome || 'candidato')} <span class="timestamp">${fmtDateTime(m.resposta.criadoEm)}</span></div>
            ${esc(m.resposta.texto)}
          </div>` : ''}
        </div>` : ''}
      `;
      item.addEventListener('click', () => {
        openId = isOpen ? null : m.id;
        if (openId && m.status === 'Enviada') {
          Mensagens.marcarComoLida(m.id);
          m.status = 'Lida';
        }
        render();
      });
      list.appendChild(item);
    });
  }

  document.getElementById('buscaMsg').addEventListener('input', render);
  document.getElementById('filtroStatusMsg').addEventListener('change', render);
  document.getElementById('filtroPeriodoMsg').addEventListener('change', render);
})();
