// ============================================
// Dashboard - Editor de Currículo
// ============================================
let profile = null;
let currentTab = 'personal';

const UI = {
  show(el) { document.getElementById(el).classList.remove('hidden'); },
  hide(el) { document.getElementById(el).classList.add('hidden'); },
  setHtml(el, html) { document.getElementById(el).innerHTML = html; },
  val(id) { return document.getElementById(id)?.value || ''; },
  setVal(id, v) { const e = document.getElementById(id); if (e) e.value = v || ''; }
};

function initDashboard() {
  Auth.init();
  Auth.onAuthChange = function(loggedIn) {
    if (!loggedIn) { window.location.href = 'login.html'; return; }
    loadProfile();
  };
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

async function loadProfile() {
  profile = await API.getProfile();
  if (profile.error) { console.error(profile.error); return; }
  document.getElementById('userName').textContent = profile.nome || '';
  fillPersonalForm();
  renderAllSections();
  updateProgress();
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
}

// ============================================
// DADOS PESSOAIS
// ============================================
function fillPersonalForm() {
  UI.setVal('nome', profile.nome);
  UI.setVal('telefone', profile.telefone);
  UI.setVal('curso', profile.curso);
  UI.setVal('periodo', profile.periodo);
  UI.setVal('cidade', profile.cidade);
  UI.setVal('estado', profile.estado);
  UI.setVal('endereco', profile.endereco);
  UI.setVal('bio', profile.bio);
  UI.setVal('linkedin', profile.linkedin);
  UI.setVal('github', profile.github);
  UI.setVal('portfolio', profile.portfolio);
  // Populate states
  const stateSelect = document.getElementById('estado');
  stateSelect.innerHTML = '<option value="">Selecione</option>' +
    CONFIG.states.map(s => `<option value="${s}" ${profile.estado === s ? 'selected' : ''}>${s}</option>`).join('');
}

async function savePersonal() {
  const data = {
    nome: UI.val('nome'), telefone: UI.val('telefone'), curso: UI.val('curso'),
    periodo: UI.val('periodo'), cidade: UI.val('cidade'), estado: UI.val('estado'),
    endereco: UI.val('endereco'), bio: UI.val('bio'), linkedin: UI.val('linkedin'),
    github: UI.val('github'), portfolio: UI.val('portfolio')
  };
  const btn = document.getElementById('savePersonalBtn');
  btn.disabled = true; btn.textContent = 'Salvando...';
  await API.updateProfile(data);
  btn.disabled = false; btn.textContent = 'Salvar Dados Pessoais';
  profile = { ...profile, ...data };
  updateProgress();
}

// ============================================
// SEÇÕES GENÉRICAS (Experiência, Educação, etc.)
// ============================================
function renderAllSections() {
  renderList('experiencias', 'experiencia');
  renderList('formacao', 'formacao');
  renderList('habilidades', 'habilidade');
  renderList('projetos', 'projeto');
  renderList('certificados', 'certificado');
}

const sectionConfig = {
  experiencia: {
    sheet: SHEETS.experiences, label: 'Experiências Profissionais',
    emptyMsg: 'Nenhuma experiência cadastrada ainda.',
    render: (item) => `
      <div><strong>${item.cargo}</strong> — ${item.empresa}</div>
      <div style="font-size:13px;color:var(--gray-500)">${fmtDate(item.data_inicio)} — ${item.data_fim ? fmtDate(item.data_fim) : 'Presente'}${item.atual ? ' <span class="badge badge-green">Atual</span>' : ''}</div>
      ${item.descricao ? `<div style="font-size:13px;color:var(--gray-600);margin-top:4px">${item.descricao}</div>` : ''}`,
    form: (edit) => `
      <div class="form-row">
        <div class="form-group"><label>Empresa</label><input id="f_empresa" value="${edit?.empresa||''}" required></div>
        <div class="form-group"><label>Cargo</label><input id="f_cargo" value="${edit?.cargo||''}" required></div>
      </div>
      <div class="form-group"><label>Descrição</label><textarea id="f_descricao" rows="3">${edit?.descricao||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Data de início</label><input type="date" id="f_data_inicio" value="${edit?.data_inicio||''}" required></div>
        <div class="form-group"><label>Data de término</label><input type="date" id="f_data_fim" value="${edit?.data_fim||''}"></div>
      </div>
      <div class="form-group"><label><input type="checkbox" id="f_atual" ${edit?.atual?'checked':''}> Trabalho atual</label></div>`,
    getData: () => ({ empresa: UI.val('f_empresa'), cargo: UI.val('f_cargo'), descricao: UI.val('f_descricao'), data_inicio: UI.val('f_data_inicio'), data_fim: UI.val('f_data_fim'), atual: document.getElementById('f_atual')?.checked ? 'true' : 'false' }),
    validate: (d) => d.empresa && d.cargo && d.data_inicio
  },
  formacao: {
    sheet: SHEETS.educations, label: 'Formação Acadêmica',
    emptyMsg: 'Nenhuma formação cadastrada ainda.',
    render: (item) => `
      <div><strong>${item.grau} em ${item.area_estudo}</strong></div>
      <div style="font-size:13px;color:var(--gray-500)">${item.instituicao} | ${fmtDate(item.data_inicio)} — ${item.data_fim ? fmtDate(item.data_fim) : 'Presente'}</div>`,
    form: (edit) => `
      <div class="form-row">
        <div class="form-group"><label>Instituição</label><input id="f_instituicao" value="${edit?.instituicao||''}" required></div>
        <div class="form-group"><label>Grau</label><input id="f_grau" value="${edit?.grau||''}" placeholder="Graduação, Pós..." required></div>
      </div>
      <div class="form-group"><label>Área de Estudo</label><input id="f_area_estudo" value="${edit?.area_estudo||''}" required></div>
      <div class="form-row">
        <div class="form-group"><label>Data de início</label><input type="date" id="f_data_inicio" value="${edit?.data_inicio||''}" required></div>
        <div class="form-group"><label>Data de término</label><input type="date" id="f_data_fim" value="${edit?.data_fim||''}"></div>
      </div>`,
    getData: () => ({ instituicao: UI.val('f_instituicao'), grau: UI.val('f_grau'), area_estudo: UI.val('f_area_estudo'), data_inicio: UI.val('f_data_inicio'), data_fim: UI.val('f_data_fim') }),
    validate: (d) => d.instituicao && d.grau && d.area_estudo && d.data_inicio
  },
  habilidade: {
    sheet: SHEETS.skills, label: 'Habilidades',
    emptyMsg: 'Nenhuma habilidade cadastrada ainda.',
    render: (item) => `<span class="badge badge-blue">${item.categoria}</span> <strong>${item.nome}</strong> <span style="font-size:12px;color:var(--gray-500)">${item.nivel}</span>`,
    inline: true,
    form: (edit) => `
      <div class="form-group"><label>Nome</label><input id="f_nome" value="${edit?.nome||''}" required></div>
      <div class="form-group"><label>Categoria</label>
        <select id="f_categoria">${CONFIG.skillCategories.map(c => `<option value="${c}" ${edit?.categoria===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Nível</label>
        <select id="f_nivel">${CONFIG.skillLevels.map(l => `<option value="${l}" ${edit?.nivel===l?'selected':''}>${l}</option>`).join('')}</select>
      </div>`,
    getData: () => ({ nome: UI.val('f_nome'), categoria: UI.val('f_categoria'), nivel: UI.val('f_nivel') }),
    validate: (d) => d.nome
  },
  projeto: {
    sheet: SHEETS.projects, label: 'Projetos',
    emptyMsg: 'Nenhum projeto cadastrado ainda.',
    render: (item) => `
      <div><strong>${item.nome}</strong>${item.url ? ` <a href="${item.url}" target="_blank" style="font-size:12px">↗ Link</a>` : ''}</div>
      ${item.descricao ? `<div style="font-size:13px;color:var(--gray-600)">${item.descricao}</div>` : ''}
      ${item.data_inicio ? `<div style="font-size:12px;color:var(--gray-500)">${fmtDate(item.data_inicio)} — ${item.data_fim ? fmtDate(item.data_fim) : ''}</div>` : ''}`,
    form: (edit) => `
      <div class="form-group"><label>Nome do projeto</label><input id="f_nome" value="${edit?.nome||''}" required></div>
      <div class="form-group"><label>Descrição</label><textarea id="f_descricao" rows="3">${edit?.descricao||''}</textarea></div>
      <div class="form-group"><label>URL</label><input id="f_url" value="${edit?.url||''}" placeholder="https://..."></div>
      <div class="form-row">
        <div class="form-group"><label>Data de início</label><input type="date" id="f_data_inicio" value="${edit?.data_inicio||''}"></div>
        <div class="form-group"><label>Data de término</label><input type="date" id="f_data_fim" value="${edit?.data_fim||''}"></div>
      </div>`,
    getData: () => ({ nome: UI.val('f_nome'), descricao: UI.val('f_descricao'), url: UI.val('f_url'), data_inicio: UI.val('f_data_inicio'), data_fim: UI.val('f_data_fim') }),
    validate: (d) => d.nome
  },
  certificado: {
    sheet: SHEETS.certificates, label: 'Certificações',
    emptyMsg: 'Nenhum certificado cadastrado ainda.',
    render: (item) => `
      <div><strong>${item.nome}</strong>${item.emissor ? ` — ${item.emissor}` : ''}</div>
      ${item.data_emissao ? `<div style="font-size:12px;color:var(--gray-500)">${fmtDate(item.data_emissao)}</div>` : ''}`,
    form: (edit) => `
      <div class="form-row">
        <div class="form-group"><label>Nome</label><input id="f_nome" value="${edit?.nome||''}" required></div>
        <div class="form-group"><label>Emissor</label><input id="f_emissor" value="${edit?.emissor||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Data de emissão</label><input type="date" id="f_data_emissao" value="${edit?.data_emissao||''}"></div>
        <div class="form-group"><label>Data de validade</label><input type="date" id="f_data_validade" value="${edit?.data_validade||''}"></div>
      </div>
      <div class="form-group"><label>URL</label><input id="f_url" value="${edit?.url||''}"></div>`,
    getData: () => ({ nome: UI.val('f_nome'), emissor: UI.val('f_emissor'), data_emissao: UI.val('f_data_emissao'), data_validade: UI.val('f_data_validade'), url: UI.val('f_url') }),
    validate: (d) => d.nome
  }
};

function renderList(section, type) {
  const config = sectionConfig[type];
  const items = profile[section] || [];
  const container = document.getElementById(`list-${type}`);
  const editContainer = document.getElementById(`edit-${type}`);
  if (!container) return;

  if (items.length === 0 && !config.inline) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--gray-500)">${config.emptyMsg}</div>`;
  } else if (config.inline) {
    // Inline form for skills
    container.innerHTML = `
      <div class="form-inline" style="margin-bottom:16px">
        <div class="form-group"><label>Nome</label><input id="inline-nome" placeholder="Ex: JavaScript"></div>
        <div class="form-group" style="min-width:120px"><label>Categoria</label>
          <select id="inline-categoria">${CONFIG.skillCategories.map(c => `<option>${c}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="min-width:120px"><label>Nível</label>
          <select id="inline-nivel">${CONFIG.skillLevels.map(l => `<option>${l}</option>`).join('')}</select>
        </div>
        <button class="btn btn-primary btn-sm" onclick="addItem('${type}')">+ Adicionar</button>
      </div>
      <div class="skill-tags" id="skillsContainer">${items.map(item => `
        <div class="skill-tag"><span class="badge badge-blue" style="margin-right:4px">${item.categoria}</span>${item.nome} <span style="color:var(--gray-400);font-size:11px">${item.nivel}</span><span class="remove" onclick="deleteItem('${type}','${item.id}')">×</span></div>
      `).join('')}</div>`;
  } else {
    container.innerHTML = items.map(item => `
      <div class="list-item">
        <div>${config.render(item)}</div>
        <div class="list-item-actions">
          <button class="btn btn-secondary btn-sm" onclick="editItem('${type}','${item.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteItem('${type}','${item.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }
}

function showEditForm(type, item = null) {
  const config = sectionConfig[type];
  const editContainer = document.getElementById(`edit-${type}`);
  const header = item ? `Editar ${config.label}` : `Nova ${config.label}`;
  editContainer.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>${header}</h3></div>
      <div class="card-body">
        ${config.form(item)}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-secondary btn-sm" onclick="hideEditForm('${type}')">Cancelar</button>
          <button class="btn btn-primary btn-sm" onclick="saveItem('${type}', ${item ? `'${item.id}'` : 'null'})">Salvar</button>
        </div>
      </div>
    </div>`;
  UI.show(`edit-${type}`);
}

function hideEditForm(type) { UI.hide(`edit-${type}`); }

async function addItem(type) {
  const config = sectionConfig[type];
  if (config.inline) {
    const data = { nome: UI.val('inline-nome'), categoria: UI.val('inline-categoria'), nivel: UI.val('inline-nivel') };
    if (!data.nome) return;
    await API.addItem(config.sheet, data);
  } else {
    const data = config.getData();
    if (!config.validate(data)) return;
    await API.addItem(config.sheet, data);
  }
  await loadProfile();
}

async function saveItem(type, id) {
  const config = sectionConfig[type];
  const data = config.getData();
  if (!config.validate(data)) return;
  if (id) { await API.updateItem(config.sheet, id, data); }
  else { await API.addItem(config.sheet, data); }
  hideEditForm(type);
  await loadProfile();
}

async function deleteItem(type, id) {
  if (!confirm('Tem certeza que deseja excluir?')) return;
  const config = sectionConfig[type];
  await API.deleteItem(config.sheet, id);
  await loadProfile();
}

function editItem(type, id) {
  const items = profile[sectionConfig[type].sheet === SHEETS.experiences ? 'experiencias' :
    config.sheet === SHEETS.educations ? 'formacao' :
    config.sheet === SHEETS.skills ? 'habilidades' :
    config.sheet === SHEETS.projects ? 'projetos' : 'certificados'] || [];
  // Map type to profile key
  const keyMap = { experiencia: 'experiencias', formacao: 'formacao', habilidade: 'habilidades', projeto: 'projetos', certificado: 'certificados' };
  const item = (profile[keyMap[type]] || []).find(i => i.id === id);
  if (item) showEditForm(type, item);
}

function updateProgress() {
  if (!profile) return;
  let filled = 0, total = 8;
  if (profile.bio) filled++;
  if (profile.curso) filled++;
  if (profile.telefone) filled++;
  if (profile.cidade) filled++;
  if (profile.experiencias?.length) filled++;
  if (profile.habilidades?.length) filled++;
  if (profile.projetos?.length) filled++;
  if (profile.certificados?.length) filled++;
  const pct = Math.round((filled / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = pct + '%';
  document.getElementById('progressMsg').textContent =
    pct < 50 ? 'Continue preenchendo!' : pct < 100 ? 'Quase lá!' : 'Parabéns! Currículo completo!';
  // Public link
  if (profile.slug) {
    const pubUrl = location.origin + '/' + profile.slug;
    document.getElementById('publicLink').innerHTML = `Seu perfil público: <a href="${pubUrl}" target="_blank">/${profile.slug}</a>`;
    UI.show('publicLinkCard');
  }
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

// Export
function goToPreview() { window.location.href = 'preview.html'; }
