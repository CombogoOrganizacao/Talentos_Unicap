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
 
// Interpreta corretamente valores booleanos vindos da planilha (que chegam
// como string "true"/"false" e não como boolean real). Usar apenas
// "if (item.atual)" é o bug que fazia a caixa ficar sempre marcada/ativa,
// pois a string "false" também é um valor "truthy" em JavaScript.
function isTrue(v) { return v === true || v === 'true'; }
 
// Mostra/esconde o campo "Data de término" de acordo com a caixa de seleção
// (usada tanto em "Trabalho atual" quanto em "Em curso").
 
 
// ============================================
// VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
// ============================================
// Confere uma lista de campos { id, label } e devolve os que estão vazios,
// já marcando visualmente (borda vermelha) os campos com problema e
// limpando a marcação de quem foi preenchido corretamente.
function validateRequiredFields(fields) {
  const missing = [];
  (fields || []).forEach(field => {
    const el = document.getElementById(field.id);
    if (!el) return;
    const group = el.closest('.form-group') || el.closest('.form-inline .form-group') || el.parentElement;
    const value = (el.value || '').trim();
    if (!value) {
      missing.push(field.label);
      if (group) group.classList.add('has-error');
    } else if (group) {
      group.classList.remove('has-error');
    }
  });
  return missing;
}
 
// Remove todas as marcações de erro dentro de um container (usado ao abrir
// um formulário novo, para não herdar erro de uma tentativa anterior).
function clearFieldErrors(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}
 
// Mostra/esconde o banner de alerta com a lista de campos obrigatórios
// que ainda faltam ser preenchidos.
function showFormAlert(alertId, missingLabels) {
  const alertEl = document.getElementById(alertId);
  if (!alertEl) return;
  const textEl = document.getElementById(alertId + '-text');
  const msg = missingLabels.length === 1
    ? `Preencha o campo obrigatório: ${missingLabels[0]}.`
    : `Preencha os campos obrigatórios: ${missingLabels.join(', ')}.`;
  if (textEl) textEl.textContent = msg;
  else alertEl.textContent = msg;
  alertEl.classList.remove('hidden');
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
 
function hideFormAlert(alertId) {
  const alertEl = document.getElementById(alertId);
  if (alertEl) alertEl.classList.add('hidden');
}
 
function toggleFimVisibility(type) {
  const checkbox = document.getElementById(`${type}_f_atual`);
  const wrapper = document.getElementById(`${type}_f_data_fim_wrapper`);
  if (!checkbox || !wrapper) return;
  wrapper.classList.toggle('hidden', checkbox.checked);
}
 
// Mesma lógica de toggleFimVisibility, mas para o checkbox "Sem validade"
// dos certificados (estava sendo chamada no HTML sem nunca ter sido criada).
function toggleValidadeVisibility(type) {
  const checkbox = document.getElementById(`${type}_f_sem_validade`);
  const wrapper = document.getElementById(`${type}_f_data_validade_wrapper`);
  if (!checkbox || !wrapper) return;
  wrapper.classList.toggle('hidden', checkbox.checked);
}
function initDashboard() {
  Auth.onAuthChange = function (loggedIn) {
    if (!loggedIn) {
      window.location.href = 'login.html';
      return;
    }
    loadProfile();
  };

  Auth.init();
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
 
  // Remove o destaque de erro de um campo assim que o usuário o preenche,
  // mesmo em elementos criados dinamicamente (formulários de experiência,
  // formação, projetos, certificados e habilidades).
  document.addEventListener('input', clearErrorOnFill);
  document.addEventListener('change', clearErrorOnFill);
}
 
function clearErrorOnFill(e) {
  const el = e.target;
  if (!el || !('value' in el)) return;
  const group = el.closest('.form-group');
  if (group && group.classList.contains('has-error') && (el.value || '').trim()) {
    group.classList.remove('has-error');
  }
}
 
async function loadProfile() {
  profile = await API.getProfile();
  // Blindagem: se a API não respondeu nada utilizável (ex: API_URL ainda
  // não configurada, Apps Script fora do ar, resposta não-JSON), evitamos
  // quebrar a tela inteira e deixamos claro no console o que aconteceu.
  if (!profile || typeof profile !== 'object') {
    console.error('loadProfile: resposta inesperada do Firebase ->', profile);
    profile = { error: 'Resposta inválida do Firebase Realtime Database.' };
  }
  if (profile.error) { console.error(profile.error); return; }
  document.getElementById('userName').textContent = profile.nome || '';
  fillPersonalForm();
  renderAllSections();
  updateProgress();

  // Inicializa a caixa de mensagens integrada ao painel do usuário
  // somente depois que a autenticação e o perfil estiverem carregados.
  if (typeof initMensagensPainelAluno === 'function') {
    initMensagensPainelAluno();
  }
}
 
// Alterna qual aba do dashboard fica visível (Dados Pessoais, Experiência,
// Formação, Habilidades, Projetos, Certificados). Esta função estava
// ausente do arquivo — os botões de aba chamavam switchTab() sem ela
// existir, quebrando a navegação entre abas.
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
  UI.setVal('endereco', profile.endereco);
  UI.setVal('bio', profile.bio);
  UI.setVal('linkedin', profile.linkedin);
  UI.setVal('github', profile.github);
  UI.setVal('portfolio', profile.portfolio);

  // Privacidade: autorização para aparecer na busca de talentos das empresas
  const visivel = document.getElementById('visivel_para_empresas');
  if (visivel) visivel.checked = isTrue(profile.visivel_para_empresas);

  // Disponibilidade exibida às empresas (badge na busca de talentos)
  const disp = document.getElementById('disponibilidade_estagio');
  if (disp) disp.value = profile.disponibilidade_estagio || 'Disponível para Estágio';
 
  // Popula estados
  const stateSelect = document.getElementById('estado');
  if (!stateSelect || !Array.isArray(CONFIG.states)) return;
  stateSelect.innerHTML = '<option value="">Selecione</option>' +
    CONFIG.states.map(s => `<option value="${s}" ${profile.estado === s ? 'selected' : ''}>${s}</option>`).join('');
 
  // Liga o listener que atualiza as cidades quando o estado muda
  stateSelect.onchange = () => atualizarCidadesPorEstado(stateSelect.value);
 
  // Se já tem estado salvo, carrega as cidades e pré-seleciona a cidade salva
  if (profile.estado) {
    atualizarCidadesPorEstado(profile.estado, profile.cidade);
  } else {
    const citySelect = document.getElementById('cidade');
    if (citySelect) citySelect.innerHTML = '<option value="">Selecione o estado primeiro</option>';
  }
}
 
async function atualizarCidadesPorEstado(uf, cidadeSelecionada = '') {
  const citySelect = document.getElementById('cidade');
  if (!citySelect) return;
 
  if (!uf) {
    citySelect.innerHTML = '<option value="">Selecione o estado primeiro</option>';
    return;
  }
 
  citySelect.innerHTML = '<option value="">Carregando cidades...</option>';
  citySelect.disabled = true;
 
  const cidades = await buscarCidadesPorEstado(uf);
 
  if (cidades.length === 0) {
    citySelect.innerHTML = '<option value="">Erro ao carregar. Tente novamente.</option>';
    citySelect.disabled = false;
    return;
  }
 
  citySelect.innerHTML = '<option value="">Selecione a cidade</option>' +
    cidades.map(c => `<option value="${c}" ${c === cidadeSelecionada ? 'selected' : ''}>${c}</option>`).join('');
  citySelect.disabled = false;
}
 
const personalRequiredFields = [
  { id: 'nome', label: 'Nome completo' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'curso', label: 'Curso' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'estado', label: 'Estado' }
];
 
async function savePersonal() {
  const missing = validateRequiredFields(personalRequiredFields);
  if (missing.length > 0) {
    showFormAlert('alert-personal', missing);
    return;
  }
  hideFormAlert('alert-personal');
 
  const data = {
    nome: UI.val('nome'), telefone: UI.val('telefone'), curso: UI.val('curso'),
    periodo: UI.val('periodo'), cidade: UI.val('cidade'), estado: UI.val('estado'),
    endereco: UI.val('endereco'), bio: UI.val('bio'), linkedin: UI.val('linkedin'),
    github: UI.val('github'), portfolio: UI.val('portfolio'),
    visivel_para_empresas: document.getElementById('visivel_para_empresas')?.checked || false,
    disponibilidade_estagio: UI.val('disponibilidade_estagio') || 'Disponível para Estágio'
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
      <div style="font-size:13px;color:var(--gray-500)">${fmtDate(item.data_inicio)} — ${isTrue(item.atual) ? 'Presente' : (item.data_fim ? fmtDate(item.data_fim) : 'Presente')}${isTrue(item.atual) ? ' <span class="badge badge-green">Atual</span>' : ''}</div>
      ${item.descricao ? `<div style="font-size:13px;color:var(--gray-600);margin-top:4px">${item.descricao}</div>` : ''}`,
    form: (edit) => {
      const atual = isTrue(edit?.atual); return `
      <div class="form-row">
        <div class="form-group"><label>Empresa<span class="required-mark">*</span></label><input id="experiencia_f_empresa" value="${edit?.empresa || ''}" required></div>
        <div class="form-group"><label>Cargo<span class="required-mark">*</span></label><input id="experiencia_f_cargo" value="${edit?.cargo || ''}" required></div>
      </div>
      <div class="form-group"><label>Descrição</label><textarea id="experiencia_f_descricao" rows="3">${edit?.descricao || ''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Data de início<span class="required-mark">*</span></label><input type="date" id="experiencia_f_data_inicio" value="${edit?.data_inicio || ''}" required></div>
        <div class="form-group ${atual ? 'hidden' : ''}" id="experiencia_f_data_fim_wrapper"><label>Data de término</label><input type="date" id="experiencia_f_data_fim" value="${edit?.data_fim || ''}"></div>
      </div>
      <label class="checkbox-field">
        <input type="checkbox" id="experiencia_f_atual" ${atual ? 'checked' : ''} onchange="toggleFimVisibility('experiencia')">
        <span class="checkbox-text">
          <span class="checkbox-title">Este é o meu trabalho atual</span>
          <span class="checkbox-hint">Marque esta opção se você ainda trabalha nessa empresa. A data de término será ocultada.</span>
        </span>
      </label>`;
    },
    getData: () => {
      const atual = document.getElementById('experiencia_f_atual')?.checked || false;
      return { empresa: UI.val('experiencia_f_empresa'), cargo: UI.val('experiencia_f_cargo'), descricao: UI.val('experiencia_f_descricao'), data_inicio: UI.val('experiencia_f_data_inicio'), data_fim: atual ? '' : UI.val('experiencia_f_data_fim'), atual: atual ? 'true' : 'false' };
    },
    validate: (d) => d.empresa && d.cargo && d.data_inicio,
    requiredFields: [
      { id: 'experiencia_f_empresa', label: 'Empresa' },
      { id: 'experiencia_f_cargo', label: 'Cargo' },
      { id: 'experiencia_f_data_inicio', label: 'Data de início' }
    ]
  },
  formacao: {
    sheet: SHEETS.educations, label: 'Formação Acadêmica',
    emptyMsg: 'Nenhuma formação cadastrada ainda.',
    render: (item) => `
      <div><strong>${item.grau} em ${item.area_estudo}</strong></div>
      <div style="font-size:13px;color:var(--gray-500)">${item.instituicao} | ${fmtDate(item.data_inicio)} — ${isTrue(item.atual) ? 'Em curso' : (item.data_fim ? fmtDate(item.data_fim) : 'Presente')}${isTrue(item.atual) ? ' <span class="badge badge-green">Em curso</span>' : ''}</div>`,
       form: (edit) => {
      const emCurso = isTrue(edit?.atual);
      const grauSelecionado = edit?.grau || '';
      return `
      <div class="form-row">
        <div class="form-group"><label>Instituição<span class="required-mark">*</span></label><input id="formacao_f_instituicao" value="${edit?.instituicao || ''}" required></div>
        <div class="form-group">
          <label>Grau<span class="required-mark">*</span></label>
          <select id="formacao_f_grau" required onchange="atualizarCursosPorGrau('formacao', this.value)">
            <option value="">Selecione o grau</option>
            <option value="Graduação" ${grauSelecionado === 'Graduação' ? 'selected' : ''}>Graduação</option>
            <option value="Especialização" ${grauSelecionado === 'Especialização' ? 'selected' : ''}>Especialização</option>
            <option value="Mestrado" ${grauSelecionado === 'Mestrado' ? 'selected' : ''}>Mestrado</option>
            <option value="Doutorado" ${grauSelecionado === 'Doutorado' ? 'selected' : ''}>Doutorado</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Curso<span class="required-mark">*</span></label>
        <select id="formacao_f_area_estudo" required>
          ${gerarOpcoesCurso(grauSelecionado, edit?.area_estudo)}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Data de início<span class="required-mark">*</span></label><input type="date" id="formacao_f_data_inicio" value="${edit?.data_inicio || ''}" required></div>
        <div class="form-group ${emCurso ? 'hidden' : ''}" id="formacao_f_data_fim_wrapper"><label>Data de término</label><input type="date" id="formacao_f_data_fim" value="${edit?.data_fim || ''}"></div>
      </div>
      <label class="checkbox-field">
        <input type="checkbox" id="formacao_f_atual" ${emCurso ? 'checked' : ''} onchange="toggleFimVisibility('formacao')">
        <span class="checkbox-text">
          <span class="checkbox-title">Em curso</span>
          <span class="checkbox-hint">Marque esta opção se você ainda não concluiu essa formação. A data de término será ocultada.</span>
        </span>
      </label>`;
    },
    getData: () => {
      const atual = document.getElementById('formacao_f_atual')?.checked || false;
      return { instituicao: UI.val('formacao_f_instituicao'), grau: UI.val('formacao_f_grau'), area_estudo: UI.val('formacao_f_area_estudo'), data_inicio: UI.val('formacao_f_data_inicio'), data_fim: atual ? '' : UI.val('formacao_f_data_fim'), atual: atual ? 'true' : 'false' };
    },
    validate: (d) => d.instituicao && d.grau && d.area_estudo && d.data_inicio,
    requiredFields: [
      { id: 'formacao_f_instituicao', label: 'Instituição' },
      { id: 'formacao_f_grau', label: 'Grau' },
      { id: 'formacao_f_area_estudo', label: 'Curso' },
      { id: 'formacao_f_data_inicio', label: 'Data de início' }
    ]
  },
habilidade: {
  sheet: SHEETS.skills, label: 'Habilidades',
  emptyMsg: 'Nenhuma habilidade cadastrada ainda.',
  render: (item) => `<span class="badge badge-blue">${item.categoria}</span> <strong>${item.nome}</strong> <span style="font-size:12px;color:var(--gray-500)">${item.nivel}</span>`,
  // ↑ "inline: true" foi removido daqui
  form: (edit) => `
    <div class="form-group"><label>Nome<span class="required-mark">*</span></label><input id="habilidade_f_nome" value="${edit?.nome || ''}" required></div>
    <div class="form-group"><label>Categoria</label>
      <select id="habilidade_f_categoria">${CONFIG.skillCategories.map(c => `<option value="${c}" ${edit?.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Nível</label>
      <select id="habilidade_f_nivel">${CONFIG.skillLevels.map(l => `<option value="${l}" ${edit?.nivel === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>`,
  getData: () => ({ nome: UI.val('habilidade_f_nome'), categoria: UI.val('habilidade_f_categoria'), nivel: UI.val('habilidade_f_nivel') }),
  validate: (d) => d.nome,
  requiredFields: [
    { id: 'habilidade_f_nome', label: 'Nome' }
  ]
},
  projeto: {
    sheet: SHEETS.projects, label: 'Projetos',
    emptyMsg: 'Nenhum projeto cadastrado ainda.',
    render: (item) => `
      <div><strong>${item.nome}</strong>${item.url ? ` <a href="${item.url}" target="_blank" style="font-size:12px">↗ Link</a>` : ''}</div>
      ${item.descricao ? `<div style="font-size:13px;color:var(--gray-600)">${item.descricao}</div>` : ''}
      ${item.data_inicio ? `<div style="font-size:12px;color:var(--gray-500)">${fmtDate(item.data_inicio)} — ${item.data_fim ? fmtDate(item.data_fim) : ''}</div>` : ''}`,
    form: (edit) => `
      <div class="form-group"><label>Nome do projeto<span class="required-mark">*</span></label><input id="projeto_f_nome" value="${edit?.nome || ''}" required></div>
      <div class="form-group"><label>Descrição</label><textarea id="projeto_f_descricao" rows="3">${edit?.descricao || ''}</textarea></div>
      <div class="form-group"><label>URL</label><input id="projeto_f_url" value="${edit?.url || ''}" placeholder="https://..."></div>
      <div class="form-row">
        <div class="form-group"><label>Data de início</label><input type="date" id="projeto_f_data_inicio" value="${edit?.data_inicio || ''}"></div>
        <div class="form-group"><label>Data de término</label><input type="date" id="projeto_f_data_fim" value="${edit?.data_fim || ''}"></div>
      </div>`,
    getData: () => ({ nome: UI.val('projeto_f_nome'), descricao: UI.val('projeto_f_descricao'), url: UI.val('projeto_f_url'), data_inicio: UI.val('projeto_f_data_inicio'), data_fim: UI.val('projeto_f_data_fim') }),
    validate: (d) => d.nome,
    requiredFields: [
      { id: 'projeto_f_nome', label: 'Nome do projeto' }
    ]
  },
    certificado: {
    sheet: SHEETS.certificates, label: 'Certificações',
    emptyMsg: 'Nenhum certificado cadastrado ainda.',
    render: (item) => `
      <div><strong>${item.nome}</strong>${item.emissor ? ` — ${item.emissor}` : ''}</div>
      <div style="font-size:12px;color:var(--gray-500)">
        ${item.data_emissao ? fmtDate(item.data_emissao) : ''}
        ${isTrue(item.sem_validade) ? ' <span class="badge badge-green">Sem validade</span>' : (item.data_validade ? ` — Válido até ${fmtDate(item.data_validade)}` : '')}
      </div>
      ${item.carga_horaria ? `<div style="font-size:12px;color:var(--gray-500)">${item.carga_horaria} horas</div>` : ''}`,
    form: (edit) => {
      const semValidade = isTrue(edit?.sem_validade); return `
      <div class="form-row">
        <div class="form-group"><label>Nome<span class="required-mark">*</span></label><input id="certificado_f_nome" value="${edit?.nome || ''}" required></div>
        <div class="form-group"><label>Emissor</label><input id="certificado_f_emissor" value="${edit?.emissor || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Data de emissão<span class="required-mark">*</span></label><input type="date" id="certificado_f_data_emissao" value="${edit?.data_emissao || ''}" required></div>
        <div class="form-group ${semValidade ? 'hidden' : ''}" id="certificado_f_data_validade_wrapper"><label>Data de validade</label><input type="date" id="certificado_f_data_validade" value="${edit?.data_validade || ''}"></div>
      </div>
      <label class="checkbox-field">
        <input type="checkbox" id="certificado_f_sem_validade" ${semValidade ? 'checked' : ''} onchange="toggleValidadeVisibility('certificado')">
        <span class="checkbox-text">
          <span class="checkbox-title">Este certificado não possui data de validade</span>
          <span class="checkbox-hint">Marque esta opção se o certificado não expira. A data de validade será ocultada.</span>
        </span>
      </label>
      <div class="form-row">
        <div class="form-group"><label>URL</label><input id="certificado_f_url" value="${edit?.url || ''}"></div>
        <div class="form-group"><label>Carga Horária (horas)</label>
          <input type="number" min="1" step="1" inputmode="numeric" id="certificado_f_carga_horaria" value="${edit?.carga_horaria || ''}" placeholder="Ex: 40" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
      </div>`;
    },
    getData: () => {
      const semValidade = document.getElementById('certificado_f_sem_validade')?.checked || false;
      return {
        nome: UI.val('certificado_f_nome'),
        emissor: UI.val('certificado_f_emissor'),
        data_emissao: UI.val('certificado_f_data_emissao'),
        data_validade: semValidade ? '' : UI.val('certificado_f_data_validade'),
        sem_validade: semValidade ? 'true' : 'false',
        url: UI.val('certificado_f_url'),
        carga_horaria: UI.val('certificado_f_carga_horaria')
      };
    },
    validate: (d) => d.nome && d.data_emissao,
    requiredFields: [
      { id: 'certificado_f_nome', label: 'Nome' },
      { id: 'certificado_f_data_emissao', label: 'Data de emissão' }
    ]
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
      <div class="form-alert hidden" id="alert-${type}-inline">
        <i class="ph-fill ph-warning-circle"></i>
        <span id="alert-${type}-inline-text"></span>
      </div>
      <div class="form-inline" style="margin-bottom:16px">
        <div class="form-group" id="group-inline-nome"><label>Nome<span class="required-mark">*</span></label><input id="inline-nome" placeholder="Ex: JavaScript"></div>
        <div class="form-group" style="min-width:120px"><label>Categoria</label>
          <select id="inline-categoria">${CONFIG.skillCategories.map(c => `<option>${c}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="min-width:120px"><label>Nível</label>
          <select id="inline-nivel">${CONFIG.skillLevels.map(l => `<option>${l}</option>`).join('')}</select>
        </div>
        <button class="btn btn-primary btn-sm" id="addBtn-${type}" onclick="addItem('${type}')">+ Adicionar</button>
      </div>
      <div class="skill-tags" id="skillsContainer">${items.map(item => `
        <div class="skill-tag"><span class="badge badge-blue" style="margin-right:4px">${item.categoria}</span>${item.nome} <span style="color:var(--gray-400);font-size:11px">${item.nivel}</span><button class="btn btn-secondary btn-sm" onclick="editItem('${type}','${item.id}')" style="margin:0 4px;padding:2px 6px;font-size:10px;"><i class="ph-fill ph-pencil-line" style="font-size:12px; vertical-align:middle;"></i></button><span class="remove" onclick="deleteItem('${type}','${item.id}')">×</span></div>`).join('')}</div>`;
 
  } else {
    container.innerHTML = items.map(item => `
      <div class="list-item">
        <div>${config.render(item)}</div>
        <div class="list-item-actions">
          <button class="btn btn-secondary btn-sm" onclick="editItem('${type}','${item.id}')"><i class="ph-fill ph-pencil-line" style="font-size:18px; vertical-align:middle;"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteItem('${type}','${item.id}')"><i class="ph ph-trash" style="font-size:18px; vertical-align:middle;"></i></button>
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
        <div class="form-alert hidden" id="alert-${type}">
          <i class="ph-fill ph-warning-circle"></i>
          <span id="alert-${type}-text"></span>
        </div>
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
  const btn = document.getElementById(`addBtn-${type}`);
 
  if (config.inline) {
    const missing = validateRequiredFields(config.inlineRequiredFields || []);
    if (missing.length > 0) {
      showFormAlert(`alert-${type}-inline`, missing);
      return;
    }
    hideFormAlert(`alert-${type}-inline`);
 
    const data = { nome: UI.val('inline-nome'), categoria: UI.val('inline-categoria'), nivel: UI.val('inline-nivel') };
 
    // Desabilitar botão enquanto salva
    if (btn) btn.disabled = true;
    if (btn) btn.textContent = 'Salvando...';
 
    try {
      await API.addItem(config.sheet, data);
      // Limpar campos após sucesso
      document.getElementById('inline-nome').value = '';
      document.getElementById('inline-categoria').value = CONFIG.skillCategories[0] || '';
      document.getElementById('inline-nivel').value = CONFIG.skillLevels[0] || '';
    } catch (e) {
      console.error('Erro ao adicionar:', e);
      alert('Erro ao adicionar. Tente novamente.');
    } finally {
      if (btn) btn.disabled = false;
      if (btn) btn.textContent = '+ Adicionar';
      await loadProfile();
    }
  } else {
    const missing = validateRequiredFields(config.requiredFields || []);
    if (missing.length > 0) {
      showFormAlert(`alert-${type}`, missing);
      return;
    }
    hideFormAlert(`alert-${type}`);
    const data = config.getData();
    if (!config.validate(data)) return;
    await API.addItem(config.sheet, data);
    await loadProfile();
  }
}
 
async function saveItem(type, id) {
  const config = sectionConfig[type];
  const missing = validateRequiredFields(config.requiredFields || []);
  if (missing.length > 0) {
    showFormAlert(`alert-${type}`, missing);
    return;
  }
  hideFormAlert(`alert-${type}`);
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