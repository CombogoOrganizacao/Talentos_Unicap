(function () {
  "use strict";

  const PAGE_SIZE = 4;
  let allProfiles = [];
  let filtered = [];
  let visibleCount = PAGE_SIZE;
  let selectedProfile = null;

  // ---------- Helpers ----------
  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };
  const isTrue = (v) => v === true || v === 'true';

  function initials(nome) {
    if (!nome) return '?';
    const parts = nome.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const diffMs = Date.now() - ts;
    const h = Math.floor(diffMs / 3600000);
    if (h < 1) return 'Atualizado agora há pouco';
    if (h < 24) return `Atualizado há ${h} hora${h > 1 ? 's' : ''}`;
    const d = Math.floor(h / 24);
    return `Atualizado há ${d} dia${d > 1 ? 's' : ''}`;
  }

  function grauMaisAlto(formacao) {
    const ordem = ['Doutorado', 'Mestrado', 'Especialização', 'Graduação'];
    for (const g of ordem) {
      if (formacao?.some((f) => f.grau === g)) return g;
    }
    return '';
  }

  // Valores possíveis do campo disponibilidade_estagio e como aparecem no badge
  const DISPONIBILIDADES = [
    { valor: 'Disponível para Estágio', classe: 'badge-green' },
    { valor: 'Disponível para Estágio ou Jovem Aprendiz', classe: 'badge-green' },
    { valor: 'Disponível para Trainee', classe: 'badge-blue' },
    { valor: 'Sem interesse no momento', classe: 'badge-gray' }
  ];

  function isCompleto(profile) {
    const campos = ['bio', 'curso', 'telefone', 'cidade'];
    const secoes = ['experiencias', 'habilidades', 'projetos', 'certificados'];
    let ok = 0;
    campos.forEach((c) => { if (profile[c] && String(profile[c]).trim() !== '') ok++; });
    secoes.forEach((s) => { if (profile[s]?.length) ok++; });
    return ok >= 6; // pelo menos 6 dos 8 critérios preenchidos
  }

  // ---------- Autenticação (guarda de acesso) ----------
  Auth.onAuthChange = async function (loggedIn) {
    if (!loggedIn) {
      window.location.href = 'login.html';
      return;
    }
    const perfil = await APIEmpresa.getPerfil();
    if (!perfil || perfil.error) {
      alert('Esta conta não está cadastrada como empresa.');
      window.location.href = 'index.html';
      return;
    }
    document.getElementById('empresaNome').textContent = perfil.nome_empresa || 'Empresa';
    document.getElementById('empresaAvatar').textContent = initials(perfil.nome_empresa)[0] || 'E';
    carregarTalentos();
  };
  Auth.init();

  document.getElementById('btnSair').addEventListener('click', () => Auth.logout());

  // ---------- Carregar talentos (publicProfiles) ----------
  // Só entram na busca os alunos que autorizaram (visivel_para_empresas).
  // Perfis antigos sem o campo continuam visíveis (o default é autorizado);
  // quem desmarcar o toggle no dashboard grava false e sai da busca.
  async function carregarTalentos() {
    try {
      const snap = await firebaseDB.ref('publicProfiles').once('value');
      allProfiles = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const p = child.val();
          if (p.visivel_para_empresas === false || p.visivel_para_empresas === 'false') return; // consentimento
          allProfiles.push({ uid: child.key, ...p });
        });
      }
    } catch (e) {
      console.error('Erro ao carregar talentos:', e);
      allProfiles = [];
    }
    popularFiltros();
    aplicarFiltros();
  }

  function popularFiltros() {
    const cursos = [...new Set(allProfiles.map((p) => p.curso).filter(Boolean))].sort();
    const cidades = [...new Set(allProfiles.map((p) => p.cidade && p.estado ? `${p.cidade}, ${p.estado}` : p.cidade).filter(Boolean))].sort();
    const periodos = [...new Set(allProfiles.map((p) => p.periodo).filter(Boolean))].sort();
    const habilidades = [...new Set(allProfiles.flatMap((p) => (p.habilidades || []).map((h) => h.nome)).filter(Boolean))].sort();

    const fill = (id, values) => {
      const sel = document.getElementById(id);
      values.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v; opt.textContent = v;
        sel.appendChild(opt);
      });
    };
    fill('fCurso', cursos);
    fill('fCidade', cidades);
    fill('fPeriodo', periodos);
    fill('fHabilidade', habilidades);
  }

  // ---------- Filtro + busca ----------
  function aplicarFiltros() {
    const termo = document.getElementById('buscaTexto').value.trim().toLowerCase();
    const curso = document.getElementById('fCurso').value;
    const grau = document.getElementById('fGrau').value;
    const periodo = document.getElementById('fPeriodo').value;
    const cidade = document.getElementById('fCidade').value;
    const habilidade = document.getElementById('fHabilidade').value;
    const nivel = document.getElementById('fNivel').value;
    const status = document.getElementById('fStatus').value;
    const ordenar = document.getElementById('fOrdenar').value;

    filtered = allProfiles.filter((p) => {
      if (curso && p.curso !== curso) return false;
      if (periodo && p.periodo !== periodo) return false;
      if (cidade) {
        const loc = p.cidade && p.estado ? `${p.cidade}, ${p.estado}` : p.cidade;
        if (loc !== cidade) return false;
      }
      if (grau && grauMaisAlto(p.formacao) !== grau) return false;
      if (habilidade && !(p.habilidades || []).some((h) => h.nome === habilidade)) return false;
      if (nivel && !(p.habilidades || []).some((h) => h.nivel === nivel)) return false;
      if (status === 'completo' && !isCompleto(p)) return false;
      if (status === 'incompleto' && isCompleto(p)) return false;

      if (termo) {
        const haystack = [
          p.nome, p.bio, p.curso,
          ...(p.habilidades || []).map((h) => h.nome),
          ...(p.experiencias || []).flatMap((e) => [e.cargo, e.empresa]),
          ...(p.projetos || []).map((pr) => pr.nome)
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(termo)) return false;
      }
      return true;
    });

    if (ordenar === 'nome') {
      filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    } else if (ordenar === 'relevancia' && termo) {
      filtered.sort((a, b) => {
        const score = (p) => (p.nome || '').toLowerCase().includes(termo) ? 2 : 1;
        return score(b) - score(a);
      });
    } else {
      filtered.sort((a, b) => (b.atualizado_em || 0) - (a.atualizado_em || 0));
    }

    visibleCount = PAGE_SIZE;
    renderGrid();
  }

  // ---------- Render do grid ----------
  function renderGrid() {
    const grid = document.getElementById('talentosGrid');
    const empty = document.getElementById('emptyState');
    const total = filtered.length;
    document.getElementById('totalCount').textContent = total;

    const slice = filtered.slice(0, visibleCount);
    document.getElementById('rangeInfo').textContent = total ? `Mostrando 1-${slice.length} de ${total}` : '';

    grid.innerHTML = '';
    if (!total) {
      // Se não há nenhum perfil autorizado, o problema é consentimento;
      // caso contrário, é ajuste de filtros/busca.
      if (!allProfiles.length) {
        document.getElementById('emptyStateTitle').textContent = 'Nenhum talento disponível no momento';
        document.getElementById('emptyStateMsg').textContent =
          'Os alunos aparecem aqui quando autorizam a visualização do currículo pelas empresas (opção "Visível para empresas" no dashboard).';
      } else {
        document.getElementById('emptyStateTitle').textContent = 'Nenhum talento encontrado';
        document.getElementById('emptyStateMsg').textContent = 'Ajuste a busca ou os filtros para ver outros perfis.';
      }
      empty.hidden = false;
      grid.hidden = true;
      document.getElementById('btnCarregarMais').hidden = true;
      return;
    }
    empty.hidden = true;
    grid.hidden = false;

    slice.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'talento-card';
      const skills = (p.habilidades || []).slice(0, 4);
      card.innerHTML = `
        <div class="talento-card-top">
          <div class="talento-avatar">${initials(p.nome)}</div>
          <div class="talento-info">
            <h3>${p.nome || 'Aluno'}</h3>
            <div class="curso">${p.curso || ''}${p.periodo ? ' — ' + p.periodo : ''}</div>
            <div class="loc"><i class="ph ph-map-pin"></i> ${p.cidade || ''}${p.estado ? ', ' + p.estado : ''}</div>
          </div>
        </div>
        <div class="talento-skills">
          ${skills.map((s) => `<span class="talento-skill-chip">${s.nome}</span>`).join('')}
        </div>
        <div class="talento-card-footer">
          <span class="updated">${timeAgo(p.atualizado_em)}</span>
          <div class="actions">
            <button class="btn btn-outline btn-sm" data-action="preview">Pré-visualizar</button>
            <button class="btn btn-primary btn-sm" data-action="message">Enviar Mensagem</button>
          </div>
        </div>`;
      card.querySelector('[data-action="preview"]').addEventListener('click', () => abrirPreview(p));
      card.querySelector('[data-action="message"]').addEventListener('click', () => abrirMensagem(p));
      grid.appendChild(card);
    });

    const btnMais = document.getElementById('btnCarregarMais');
    btnMais.hidden = visibleCount >= total;
  }

  document.getElementById('btnCarregarMais').addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    renderGrid();
  });

  document.getElementById('btnBuscar').addEventListener('click', aplicarFiltros);
  document.getElementById('buscaTexto').addEventListener('keydown', (e) => { if (e.key === 'Enter') aplicarFiltros(); });
  document.getElementById('btnFiltrar').addEventListener('click', aplicarFiltros);
  document.getElementById('btnLimpar').addEventListener('click', () => {
    ['fCurso', 'fGrau', 'fPeriodo', 'fCidade', 'fHabilidade', 'fNivel', 'fStatus'].forEach((id) => (document.getElementById(id).value = ''));
    document.getElementById('fOrdenar').value = 'recentes';
    document.getElementById('buscaTexto').value = '';
    aplicarFiltros();
  });

  // ---------- Modal de pré-visualização ----------
  const cvModalOverlay = document.getElementById('cvModalOverlay');

  function abrirPreview(profile) {
    selectedProfile = profile;
    document.getElementById('modalAvatar').textContent = initials(profile.nome);
    document.getElementById('modalNome').textContent = profile.nome || 'Aluno';

    // Link para o currículo completo (mesma renderização do preview do aluno)
    const btnCV = document.getElementById('btnVerCurriculoCompleto');
    if (profile.slug) {
      btnCV.href = `curriculo-empresa.html?slug=${encodeURIComponent(profile.slug)}`;
      btnCV.hidden = false;
    } else {
      btnCV.hidden = true;
    }

    // Badge de disponibilidade real do perfil (em vez de valor fixo)
    const badge = document.getElementById('modalDisponibilidade');
    const disp = DISPONIBILIDADES.find((d) => d.valor === profile.disponibilidade_estagio);
    if (profile.disponibilidade_estagio) {
      badge.textContent = profile.disponibilidade_estagio;
      badge.className = `badge ${disp?.classe || 'badge-blue'}`;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
    document.getElementById('modalSubline').textContent =
      `${profile.curso || ''}${profile.periodo ? ' — ' + profile.periodo : ''}${profile.cidade ? ' | ' + profile.cidade + (profile.estado ? ', ' + profile.estado : '') : ''}`;

    const tagsEl = document.getElementById('modalSkillTags');
    tagsEl.innerHTML = (profile.habilidades || []).slice(0, 6)
      .map((h) => `<span class="skill-tag">${h.nome}</span>`).join('');

    document.querySelectorAll('#modalTabs .tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    renderTab('dados');

    document.querySelectorAll('#modalTabs .tab-btn').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('#modalTabs .tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderTab(btn.dataset.tab);
      };
    });

    cvModalOverlay.classList.remove('hidden');
  }

  function renderTab(tab) {
    const body = document.getElementById('modalBody');
    const p = selectedProfile;
    if (!p) return;

    if (tab === 'dados') {
      body.innerHTML = `
        <div class="cv-tab-item">
          <h4>Sobre</h4>
          <div class="desc">${p.bio || 'Aluno ainda não preencheu a biografia.'}</div>
        </div>
        <div class="cv-tab-item">
          <h4>Curso</h4>
          <div class="desc">${p.curso || '—'} ${p.periodo ? '(' + p.periodo + ')' : ''}</div>
        </div>
        <div class="cv-tab-item">
          <h4>Localização</h4>
          <div class="desc">${p.cidade || '—'}${p.estado ? ', ' + p.estado : ''}</div>
        </div>`;
      return;
    }

    if (tab === 'experiencias') {
      const items = p.experiencias || [];
      body.innerHTML = items.length ? items.map((e) => `
        <div class="cv-tab-item">
          <h4>${e.cargo || ''}</h4>
          <div class="subtitle">${e.empresa || ''}</div>
          <div class="date">${fmtDate(e.data_inicio)} — ${isTrue(e.atual) ? 'Presente' : (e.data_fim ? fmtDate(e.data_fim) : 'Presente')}</div>
          ${e.descricao ? `<div class="desc">${e.descricao}</div>` : ''}
        </div>`).join('') : `<div class="cv-empty-tab">Nenhuma experiência cadastrada.</div>`;
      return;
    }

    if (tab === 'formacao') {
      const items = p.formacao || [];
      body.innerHTML = items.length ? items.map((f) => `
        <div class="cv-tab-item">
          <h4>${f.grau || ''} em ${f.area_estudo || ''}</h4>
          <div class="subtitle">${f.instituicao || ''}</div>
          <div class="date">${fmtDate(f.data_inicio)} — ${isTrue(f.atual) ? 'Em curso' : (f.data_fim ? fmtDate(f.data_fim) : 'Presente')}</div>
        </div>`).join('') : `<div class="cv-empty-tab">Nenhuma formação cadastrada.</div>`;
      return;
    }

    if (tab === 'habilidades') {
      const items = p.habilidades || [];
      body.innerHTML = items.length
        ? `<div class="skill-tags">${items.map((h) => `<span class="skill-tag">${h.nome} <small style="color:var(--gray-400)">· ${h.nivel || ''}</small></span>`).join('')}</div>`
        : `<div class="cv-empty-tab">Nenhuma habilidade cadastrada.</div>`;
      return;
    }

    if (tab === 'projetos') {
      const items = p.projetos || [];
      body.innerHTML = items.length ? items.map((pr) => `
        <div class="cv-tab-item">
          <h4>${pr.nome || ''}</h4>
          ${pr.descricao ? `<div class="desc">${pr.descricao}</div>` : ''}
          ${pr.url ? `<div class="date"><a href="${pr.url}" target="_blank" rel="noopener">${pr.url}</a></div>` : ''}
        </div>`).join('') : `<div class="cv-empty-tab">Nenhum projeto cadastrado.</div>`;
      return;
    }

    if (tab === 'certificados') {
      const items = p.certificados || [];
      body.innerHTML = items.length ? items.map((c) => `
        <div class="cv-tab-item">
          <h4>${c.nome || ''}</h4>
          <div class="subtitle">${c.emissor || ''}</div>
          <div class="date">Emitido em ${fmtDate(c.data_emissao)}${isTrue(c.sem_validade) ? ' · Sem validade' : (c.data_validade ? ' · Válido até ' + fmtDate(c.data_validade) : '')}</div>
        </div>`).join('') : `<div class="cv-empty-tab">Nenhum certificado cadastrado.</div>`;
      return;
    }
  }

  document.getElementById('btnFecharModal').addEventListener('click', () => cvModalOverlay.classList.add('hidden'));
  cvModalOverlay.addEventListener('click', (e) => { if (e.target === cvModalOverlay) cvModalOverlay.classList.add('hidden'); });
  document.getElementById('btnEnviarMensagemModal').addEventListener('click', () => {
    cvModalOverlay.classList.add('hidden');
    abrirMensagem(selectedProfile);
  });

  // ---------- Modal de envio de mensagem ----------
  const msgModalOverlay = document.getElementById('msgModalOverlay');
  let destinatarioAtual = null;

  function abrirMensagem(profile) {
    destinatarioAtual = profile;
    document.getElementById('msgDestNome').textContent = profile.nome || 'Aluno';
    document.getElementById('msgAssunto').value = '';
    document.getElementById('msgVaga').value = '';
    document.getElementById('msgTexto').value = '';
    document.getElementById('msgAlert').classList.add('hidden');
    msgModalOverlay.classList.remove('hidden');
  }
  document.getElementById('btnCancelarMsg').addEventListener('click', () => msgModalOverlay.classList.add('hidden'));
  msgModalOverlay.addEventListener('click', (e) => { if (e.target === msgModalOverlay) msgModalOverlay.classList.add('hidden'); });

  document.getElementById('btnConfirmarMsg').addEventListener('click', async () => {
    const assunto = document.getElementById('msgAssunto').value.trim();
    const mensagem = document.getElementById('msgTexto').value.trim();
    const vaga = document.getElementById('msgVaga').value.trim();
    const alertBox = document.getElementById('msgAlert');
    const alertText = document.getElementById('msgAlertText');

    if (!assunto || !mensagem) {
      alertText.textContent = 'Preencha o assunto e a mensagem antes de enviar.';
      alertBox.classList.remove('hidden');
      return;
    }

    const btn = document.getElementById('btnConfirmarMsg');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const result = await Mensagens.enviar({
      destinatarioId: destinatarioAtual.uid,
      destinatarioNome: destinatarioAtual.nome,
      assunto, mensagem, vagaRelacionada: vaga
    });

    btn.disabled = false;
    btn.textContent = 'Enviar';

    if (result.error) {
      alertText.textContent = result.error;
      alertBox.classList.remove('hidden');
      return;
    }

    msgModalOverlay.classList.add('hidden');
  });
})();
