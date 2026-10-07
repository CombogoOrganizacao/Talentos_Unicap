// ============================================
// Dashboard - Editor de Currículo
// ============================================

let profile = null;
let currentTab = 'personal';

const UI = {
  show(el) {
    const element = document.getElementById(el);
    if (element) element.classList.remove('hidden');
  },

  hide(el) {
    const element = document.getElementById(el);
    if (element) element.classList.add('hidden');
  },

  setHtml(el, html) {
    const element = document.getElementById(el);
    if (element) element.innerHTML = html;
  },

  val(id) {
    return document.getElementById(id)?.value || '';
  },

  setVal(id, v) {
    const e = document.getElementById(id);
    if (e) e.value = v ?? '';
  }
};

// Interpreta corretamente valores booleanos.
// Pode receber true/false reais ou strings "true"/"false".
function isTrue(v) {
  return v === true || v === 'true';
}

// A tabela formacoes não tem coluna "atual": uma formação está
// em curso quando não possui ano de conclusão.
function formacaoEmCurso(item) {
  return isTrue(item?.atual) || !item?.ano_conclusao;
}

// ============================================
// VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
// ============================================

function validateRequiredFields(fields) {
  const missing = [];

  (fields || []).forEach(field => {
    const el = document.getElementById(field.id);
    if (!el) return;

    const group =
      el.closest('.form-group') ||
      el.closest('.form-inline .form-group') ||
      el.parentElement;

    const value = (el.value || '').trim();

    if (!value) {
      missing.push(field.label);

      if (group) {
        group.classList.add('has-error');
      }
    } else if (group) {
      group.classList.remove('has-error');
    }
  });

  return missing;
}

function clearFieldErrors(containerId) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container
    .querySelectorAll('.form-group.has-error')
    .forEach(g => g.classList.remove('has-error'));
}

function showFormAlert(alertId, missingLabels) {
  const alertEl = document.getElementById(alertId);

  if (!alertEl) return;

  const textEl = document.getElementById(alertId + '-text');

  const msg =
    missingLabels.length === 1
      ? `Preencha o campo obrigatório: ${missingLabels[0]}.`
      : `Preencha os campos obrigatórios: ${missingLabels.join(', ')}.`;

  if (textEl) {
    textEl.textContent = msg;
  } else {
    alertEl.textContent = msg;
  }

  alertEl.classList.remove('hidden');

  alertEl.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}

function hideFormAlert(alertId) {
  const alertEl = document.getElementById(alertId);

  if (alertEl) {
    alertEl.classList.add('hidden');
  }
}

// ============================================
// CAMPOS CONDICIONAIS
// ============================================

function toggleFimVisibility(type) {
  const checkbox = document.getElementById(`${type}_f_atual`);
  const wrapper = document.getElementById(`${type}_f_data_fim_wrapper`);

  if (!checkbox || !wrapper) return;

  wrapper.classList.toggle('hidden', checkbox.checked);
}

function toggleValidadeVisibility(type) {
  const checkbox = document.getElementById(`${type}_f_sem_validade`);
  const wrapper = document.getElementById(
    `${type}_f_data_validade_wrapper`
  );

  if (!checkbox || !wrapper) return;

  wrapper.classList.toggle('hidden', checkbox.checked);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

function initDashboard() {
  Auth.onAuthChange = function (loggedIn, tipoConta) {
    if (!loggedIn) {
      window.location.href = 'login.html';
      return;
    }
    if (tipoConta === 'empresa') {
      window.location.href = 'lista-vagas.html';
      return;
    }
    loadProfile();
  };

  Auth.init();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Remove erro de campo assim que o usuário preencher
  document.addEventListener('input', clearErrorOnFill);
  document.addEventListener('change', clearErrorOnFill);
}

function clearErrorOnFill(e) {
  const el = e.target;

  if (!el || !('value' in el)) return;

  const group = el.closest('.form-group');

  if (
    group &&
    group.classList.contains('has-error') &&
    (el.value || '').trim()
  ) {
    group.classList.remove('has-error');
  }
}

// ============================================
// CARREGAMENTO DO PERFIL
// ============================================

async function loadProfile() {
  try {
    profile = await API.getCurriculo();

    if (!profile || typeof profile !== 'object') {
      console.error(
        'loadProfile: resposta inesperada da API ->',
        profile
      );

      profile = {
        error: 'Resposta inválida da API.'
      };
    }

    if (profile.error) {
      console.error('Erro ao carregar currículo:', profile.error);
      return;
    }

    const userName = document.getElementById('userName');

    if (userName) {
      userName.textContent = profile.nome || '';
    }

    fillPersonalForm();
    renderAllSections();
    updateProgress();

    // Inicializa mensagens
    if (typeof initMensagensPainelAluno === 'function') {
      initMensagensPainelAluno();
    }
  } catch (error) {
    console.error('Erro inesperado ao carregar currículo:', error);

    profile = {
      error:
        error?.message ||
        'Não foi possível carregar o currículo.'
    };
  }
}

// ============================================
// TABS
// ============================================

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle(
      'active',
      b.dataset.tab === tab
    );
  });

  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle(
      'active',
      c.id === 'tab-' + tab
    );
  });
}

// ============================================
// DADOS PESSOAIS
// ============================================

function fillPersonalForm() {
  UI.setVal('nome', profile.nome);
  UI.setVal('telefone', profile.telefone);
  UI.setVal('curso', profile.curso || '');
  UI.setVal('periodo', profile.periodo || '');
  UI.setVal('endereco', profile.endereco || '');
  UI.setVal('bio', profile.sobre || profile.bio || '');
  UI.setVal('linkedin', profile.linkedin);
  UI.setVal('github', profile.github);
  UI.setVal('portfolio', profile.portfolio);

  // Privacidade
  const visivel = document.getElementById('visivel_para_empresas');

  if (visivel) {
    visivel.checked = !!(
      profile.visivelParaEmpresas ??
      profile.disponivel_para_empresas
    );
  }

  // Disponibilidade para estágio
  const disp = document.getElementById('disponibilidade_estagio');

  if (disp) {
    disp.checked = !!(
      profile.disponivelEstagio ??
      profile.disponivel_estagio
    );
  }

  // Popula estados
  const stateSelect = document.getElementById('estado');

  if (!stateSelect || !Array.isArray(CONFIG.states)) return;

  stateSelect.innerHTML =
    '<option value="">Selecione</option>' +
    CONFIG.states
      .map(
        s =>
          `<option value="${s}" ${profile.estado === s ? 'selected' : ''
          }>${s}</option>`
      )
      .join('');

  stateSelect.onchange = () =>
    atualizarCidadesPorEstado(stateSelect.value);

  // Carrega cidades
  if (profile.estado) {
    atualizarCidadesPorEstado(
      profile.estado,
      profile.cidade
    );
  } else {
    const citySelect = document.getElementById('cidade');

    if (citySelect) {
      citySelect.innerHTML =
        '<option value="">Selecione o estado primeiro</option>';
    }
  }
}

async function atualizarCidadesPorEstado(
  uf,
  cidadeSelecionada = ''
) {
  const citySelect =
    document.getElementById('cidade');

  if (!citySelect) return;

  if (!uf) {
    citySelect.innerHTML =
      '<option value="">Selecione o estado primeiro</option>';

    return;
  }

  citySelect.innerHTML =
    '<option value="">Carregando cidades...</option>';

  citySelect.disabled = true;

  try {
    const cidades =
      await buscarCidadesPorEstado(uf);

    if (!Array.isArray(cidades) || cidades.length === 0) {
      citySelect.innerHTML =
        '<option value="">Erro ao carregar. Tente novamente.</option>';

      citySelect.disabled = false;

      return;
    }

    citySelect.innerHTML =
      '<option value="">Selecione a cidade</option>' +
      cidades
        .map(
          c =>
            `<option value="${c}" ${c === cidadeSelecionada
              ? 'selected'
              : ''
            }>${c}</option>`
        )
        .join('');

    citySelect.disabled = false;
  } catch (error) {
    console.error(
      'Erro ao carregar cidades:',
      error
    );

    citySelect.innerHTML =
      '<option value="">Erro ao carregar cidades</option>';

    citySelect.disabled = false;
  }
}

// ============================================
// CAMPOS OBRIGATÓRIOS - DADOS PESSOAIS
// ============================================

const personalRequiredFields = [
  {
    id: 'nome',
    label: 'Nome completo'
  },
  {
    id: 'telefone',
    label: 'Telefone'
  },
  {
    id: 'curso',
    label: 'Curso'
  },
  {
    id: 'cidade',
    label: 'Cidade'
  },
  {
    id: 'estado',
    label: 'Estado'
  }
];

// ============================================
// SALVAR DADOS PESSOAIS
// ============================================

async function savePersonal() {
  const missing = validateRequiredFields(personalRequiredFields);

  if (missing.length > 0) {
    showFormAlert('alert-personal', missing);
    return;
  }

  hideFormAlert('alert-personal');

  const data = {
    telefone: UI.val('telefone'),
    curso: UI.val('curso').trim(),
    periodo: UI.val('periodo'),
    endereco: UI.val('endereco').trim(),
    cidade: UI.val('cidade'),
    estado: UI.val('estado'),
    sobre: UI.val('bio'),
    linkedin: UI.val('linkedin'),
    github: UI.val('github'),
    portfolio: UI.val('portfolio'),

    disponivel_para_empresas:
      document.getElementById('visivel_para_empresas')?.checked || false,

    disponivel_estagio:
      document.getElementById('disponibilidade_estagio')?.checked || false
  };

  const btn = document.getElementById('savePersonalBtn');

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Salvando...';
  }

  try {
    const result = await API.salvarPerfil(data);

    if (result?.error) {
      console.error('Erro ao salvar dados pessoais:', result);
      alert('Não foi possível salvar os dados pessoais.');
      return;
    }

    /*
     * Atualiza o profile local com os nomes utilizados
     * pelo dashboard e pelo preview.
     */
    profile = {
      ...profile,
      ...data,

      bio: data.sobre,
      sobre: data.sobre,

      disponivelEstagio: data.disponivel_estagio,
      visivelParaEmpresas: data.disponivel_para_empresas
    };

    updateProgress();

    alert('Dados pessoais salvos com sucesso!');

  } catch (error) {
    console.error('Erro ao salvar dados pessoais:', error);
    alert('Ocorreu um erro ao salvar os dados pessoais.');

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Salvar Dados Pessoais';
    }
  }
}

// ============================================
// SEÇÕES
// ============================================

function renderAllSections() {
  renderList(
    'experiencias',
    'experiencia'
  );

  renderList(
    'formacoes',
    'formacao'
  );

  renderList(
    'habilidades',
    'habilidade'
  );

  renderList(
    'projetos',
    'projeto'
  );

  renderList(
    'certificacoes',
    'certificado'
  );
}

// ============================================
// CONFIGURAÇÃO DAS SEÇÕES
// ============================================

const sectionConfig = {

  // ==========================================
  // EXPERIÊNCIA
  // ==========================================

  experiencia: {
    resource: API.experiencias,

    label: 'Experiências Profissionais',

    emptyMsg:
      'Nenhuma experiência cadastrada ainda.',

    render: item => `
      <div>
        <strong>
          ${item.cargo || ''}
        </strong>
      </div>

      <div style="font-size:13px;color:var(--gray-500)">
        ${item.empresa || ''}
        ${item.data_inicio
        ? ` | ${fmtDate(item.data_inicio)}`
        : ''
      }
        ${item.data_fim
        ? ` — ${fmtDate(item.data_fim)}`
        : ' — Atual'
      }
      </div>

      ${item.descricao
        ? `
            <div style="font-size:13px;color:var(--gray-600)">
              ${item.descricao}
            </div>
          `
        : ''
      }
    `,

    form: edit => {
      const atual =
        isTrue(edit?.atual);

      return `
        <div class="form-row">

          <div class="form-group">
            <label>
              Empresa
              <span class="required-mark">*</span>
            </label>

            <input
              id="experiencia_f_empresa"
              value="${edit?.empresa || ''}"
              required
            >
          </div>

          <div class="form-group">
            <label>
              Cargo
              <span class="required-mark">*</span>
            </label>

            <input
              id="experiencia_f_cargo"
              value="${edit?.cargo || ''}"
              required
            >
          </div>

        </div>

        <div class="form-group">

          <label>Descrição</label>

          <textarea
            id="experiencia_f_descricao"
            rows="3"
          >${edit?.descricao || ''}</textarea>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label>
              Data de início
              <span class="required-mark">*</span>
            </label>

            <input
              type="date"
              id="experiencia_f_data_inicio"
              value="${edit?.data_inicio || ''}"
              required
            >

          </div>

          <div
            class="form-group ${atual ? 'hidden' : ''}"
            id="experiencia_f_data_fim_wrapper"
          >

            <label>
              Data de término
            </label>

            <input
              type="date"
              id="experiencia_f_data_fim"
              value="${edit?.data_fim || ''}"
            >

          </div>

        </div>

        <label class="checkbox-field">

          <input
            type="checkbox"
            id="experiencia_f_atual"
            ${atual ? 'checked' : ''}
            onchange="toggleFimVisibility('experiencia')"
          >

          <span class="checkbox-text">

            <span class="checkbox-title">
              Este é o meu trabalho atual
            </span>

            <span class="checkbox-hint">
              Marque esta opção se você ainda trabalha nessa empresa.
              A data de término será ocultada.
            </span>

          </span>

        </label>
      `;
    },

    getData: () => {
      const atual =
        document.getElementById(
          'experiencia_f_atual'
        )?.checked || false;

      return {
        empresa:
          UI.val('experiencia_f_empresa'),

        cargo:
          UI.val('experiencia_f_cargo'),

        descricao:
          UI.val('experiencia_f_descricao'),

        data_inicio:
          UI.val('experiencia_f_data_inicio'),

        data_fim:
          atual
            ? ''
            : UI.val(
              'experiencia_f_data_fim'
            ),

        atual:
          atual
      };
    },

    validate: d =>
      d.empresa &&
      d.cargo &&
      d.data_inicio,

    requiredFields: [
      {
        id: 'experiencia_f_empresa',
        label: 'Empresa'
      },
      {
        id: 'experiencia_f_cargo',
        label: 'Cargo'
      },
      {
        id: 'experiencia_f_data_inicio',
        label: 'Data de início'
      }
    ]
  },

  // ==========================================
  // FORMAÇÃO
  // ==========================================

  formacao: {
    resource: API.formacoes,

    label: 'Formação Acadêmica',

    emptyMsg:
      'Nenhuma formação cadastrada ainda.',

    render: item => `
      <div>
        <strong>
          ${item.nivel || item.grau || ''}
          ${item.curso || item.area_estudo
        ? ` em ${item.curso ||
        item.area_estudo ||
        ''
        }`
        : ''
      }
        </strong>
      </div>

      <div style="font-size:13px;color:var(--gray-500)">
        ${item.instituicao || ''}

        ${item.ano_inicio
        ? ` | ${item.ano_inicio}`
        : item.data_inicio
          ? ` | ${fmtDate(item.data_inicio)}`
          : ''
      }

        ${item.ano_conclusao
        ? ` — ${item.ano_conclusao}`
        : ' — <span class="badge badge-green">Em curso</span>'
      }
      </div>
    `,

    form: edit => {
      const emCurso =
        edit
          ? formacaoEmCurso(edit)
          : false;

      const dataInicioForm =
        edit?.data_inicio ||
        (edit?.ano_inicio
          ? `${edit.ano_inicio}-01-01`
          : '');

      const dataFimForm =
        edit?.data_fim ||
        (edit?.ano_conclusao
          ? `${edit.ano_conclusao}-12-31`
          : '');

      const grauSelecionado =
        edit?.nivel ||
        edit?.grau ||
        '';

      const cursoSelecionado =
        edit?.curso ||
        edit?.area_estudo ||
        '';

      return `
        <div class="form-row">

          <div class="form-group">

            <label>
              Instituição
              <span class="required-mark">*</span>
            </label>

            <input
              id="formacao_f_instituicao"
              value="${edit?.instituicao || ''}"
              required
            >

          </div>

          <div class="form-group">

            <label>
              Grau
              <span class="required-mark">*</span>
            </label>

            <select
              id="formacao_f_grau"
              required
              onchange="atualizarCursosPorGrau('formacao', this.value)"
            >

              <option value="">
                Selecione o grau
              </option>

              <option
                value="Graduação"
                ${grauSelecionado === 'Graduação'
          ? 'selected'
          : ''
        }
              >
                Graduação
              </option>

              <option
                value="Especialização"
                ${grauSelecionado === 'Especialização'
          ? 'selected'
          : ''
        }
              >
                Especialização
              </option>

              <option
                value="Mestrado"
                ${grauSelecionado === 'Mestrado'
          ? 'selected'
          : ''
        }
              >
                Mestrado
              </option>

              <option
                value="Doutorado"
                ${grauSelecionado === 'Doutorado'
          ? 'selected'
          : ''
        }
              >
                Doutorado
              </option>

            </select>

          </div>

        </div>

        <div class="form-group">

          <label>
            Curso
            <span class="required-mark">*</span>
          </label>

          <select
            id="formacao_f_area_estudo"
            required
          >
            ${typeof gerarOpcoesCurso ===
          'function'
          ? gerarOpcoesCurso(
            grauSelecionado,
            cursoSelecionado
          )
          : `
                  <option value="">
                    Selecione o curso
                  </option>
                `
        }
          </select>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label>
              Data de início
              <span class="required-mark">*</span>
            </label>

            <input
              type="date"
              id="formacao_f_data_inicio"
              value="${dataInicioForm}"
              required
            >

          </div>

          <div
            class="form-group ${emCurso ? 'hidden' : ''}"
            id="formacao_f_data_fim_wrapper"
          >

            <label>
              Data de término
            </label>

            <input
              type="date"
              id="formacao_f_data_fim"
              value="${dataFimForm}"
            >

          </div>

        </div>

        <label class="checkbox-field">

          <input
            type="checkbox"
            id="formacao_f_atual"
            ${emCurso ? 'checked' : ''}
            onchange="toggleFimVisibility('formacao')"
          >

          <span class="checkbox-text">

            <span class="checkbox-title">
              Em curso
            </span>

            <span class="checkbox-hint">
              Marque esta opção se você ainda não concluiu essa formação.
            </span>

          </span>

        </label>
      `;
    },

    getData: () => {
      const atual =
        document.getElementById(
          'formacao_f_atual'
        )?.checked || false;

      const dataInicio =
        UI.val(
          'formacao_f_data_inicio'
        );

      const dataFim =
        atual
          ? ''
          : UI.val(
            'formacao_f_data_fim'
          );

      // NOMES EXATOS DA TABELA formacoes
      return {
        instituicao:
          UI.val(
            'formacao_f_instituicao'
          ),

        nivel:
          UI.val(
            'formacao_f_grau'
          ),

        curso:
          UI.val(
            'formacao_f_area_estudo'
          ),

        ano_inicio:
          dataInicio
            ? dataInicio.slice(0, 4)
            : '',

        ano_conclusao:
          dataFim
            ? dataFim.slice(0, 4)
            : ''
      };
    },

    validate: d =>
      d.instituicao &&
      d.nivel &&
      d.curso &&
      d.ano_inicio,

    requiredFields: [
      {
        id: 'formacao_f_instituicao',
        label: 'Instituição'
      },
      {
        id: 'formacao_f_grau',
        label: 'Grau'
      },
      {
        id: 'formacao_f_area_estudo',
        label: 'Curso'
      },
      {
        id: 'formacao_f_data_inicio',
        label: 'Data de início'
      }
    ]
  },

  // ==========================================
  // HABILIDADES
  // ==========================================

  habilidade: {
    resource: API.habilidades,

    label: 'Habilidades',

    emptyMsg:
      'Nenhuma habilidade cadastrada ainda.',

    render: item => `
      <div>
        <strong>
          ${item.nome || item.habilidade || ''}
        </strong>
      </div>

      <div style="font-size:13px;color:var(--gray-500)">
        ${[item.categoria, item.nivel]
        .filter(Boolean)
        .join(' | ')}
      </div>
    `,

    form: edit => `
      <div class="form-group">

        <label>
          Nome
          <span class="required-mark">*</span>
        </label>

        <input
          id="habilidade_f_nome"
          value="${edit?.nome || ''}"
          required
        >

      </div>

      <div class="form-group">

        <label>Categoria</label>

        <select id="habilidade_f_categoria">

          ${CONFIG.skillCategories
        .map(
          c =>
            `<option value="${c}" ${edit?.categoria === c
              ? 'selected'
              : ''
            }>${c}</option>`
        )
        .join('')}

        </select>

      </div>

      <div class="form-group">

        <label>Nível</label>

        <select id="habilidade_f_nivel">

          ${CONFIG.skillLevels
        .map(
          l =>
            `<option value="${l}" ${edit?.nivel === l
              ? 'selected'
              : ''
            }>${l}</option>`
        )
        .join('')}

        </select>

      </div>
    `,

    getData: () => ({
      nome:
        UI.val(
          'habilidade_f_nome'
        ),

      categoria:
        UI.val(
          'habilidade_f_categoria'
        ),

      nivel:
        UI.val(
          'habilidade_f_nivel'
        )
    }),

    validate: d => d.nome,

    requiredFields: [
      {
        id: 'habilidade_f_nome',
        label: 'Nome'
      }
    ]
  },

  // ==========================================
  // PROJETOS
  // ==========================================

  projeto: {
    resource: API.projetos,

    label: 'Projetos',

    emptyMsg:
      'Nenhum projeto cadastrado ainda.',

    render: item => `
      <div>

        <strong>
          ${item.titulo || ''}
        </strong>

        ${item.link_github ||
        item.linkGithub
        ? `
              <a
                href="${item.link_github ||
        item.linkGithub
        }"
                target="_blank"
                rel="noopener noreferrer"
                style="font-size:12px"
              >
                ↗ Link
              </a>
            `
        : ''
      }

      </div>

      ${item.descricao
        ? `
            <div
              style="font-size:13px;color:var(--gray-600)"
            >
              ${item.descricao}
            </div>
          `
        : ''
      }

      ${item.status
        ? `
            <div
              style="font-size:12px;color:var(--gray-500)"
            >
              Status: ${item.status}
            </div>
          `
        : ''
      }
    `,

    form: edit => `
      <div class="form-group">

        <label>
          Nome do projeto
          <span class="required-mark">*</span>
        </label>

        <input
          id="projeto_f_nome"
          value="${edit?.titulo || ''}"
          required
        >

      </div>

      <div class="form-group">

        <label>Descrição</label>

        <textarea
          id="projeto_f_descricao"
          rows="3"
        >${edit?.descricao || ''}</textarea>

      </div>

      <div class="form-group">

        <label>URL</label>

        <input
          id="projeto_f_url"
          value="${edit?.link_github ||
      edit?.linkGithub ||
      ''
      }"
          placeholder="https://..."
        >

      </div>

      <div class="form-group">

        <label>Status</label>

        <select id="projeto_f_status">

          <option
            value="EM_ANDAMENTO"
            ${edit?.status === 'EM_ANDAMENTO'
        ? 'selected'
        : ''
      }
          >
            Em andamento
          </option>

          <option
            value="CONCLUIDO"
            ${edit?.status === 'CONCLUIDO'
        ? 'selected'
        : ''
      }
          >
            Concluído
          </option>

          <option
            value="PAUSADO"
            ${edit?.status === 'PAUSADO'
        ? 'selected'
        : ''
      }
          >
            Pausado
          </option>

        </select>

      </div>
    `,

    getData: () => ({
      // NOMES EXATOS DA TABELA projetos
      titulo:
        UI.val(
          'projeto_f_nome'
        ),

      descricao:
        UI.val(
          'projeto_f_descricao'
        ),

      link_github:
        UI.val(
          'projeto_f_url'
        ),

      status:
        UI.val(
          'projeto_f_status'
        ) || 'EM_ANDAMENTO'
    }),

    validate: d => d.titulo,

    requiredFields: [
      {
        id: 'projeto_f_nome',
        label: 'Nome do projeto'
      }
    ]
  },

  // ==========================================
  // CERTIFICAÇÕES
  // ==========================================

  certificado: {
    resource: API.certificacoes,

    label: 'Certificações',

    emptyMsg:
      'Nenhum certificado cadastrado ainda.',

    render: item => `
      <div>

        <strong>
          ${item.nome || ''}
        </strong>

        ${item.instituicao
        ? ` — ${item.instituicao}`
        : ''
      }

      </div>

      <div
        style="font-size:12px;color:var(--gray-500)"
      >

        ${item.data_emissao
        ? fmtDate(
          item.data_emissao
        )
        : ''
      }

        ${isTrue(
        item.sem_validade
      )
        ? `
              <span class="badge badge-green">
                Sem validade
              </span>
            `
        : item.data_validade
          ? ` — Válido até ${fmtDate(
            item.data_validade
          )}`
          : ''
      }

      </div>

      ${item.link_certificado
        ? `
            <div
              style="font-size:12px;margin-top:4px"
            >
              <a
                href="${item.link_certificado}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver certificado
              </a>
            </div>
          `
        : ''
      }
    `,

    form: edit => {
      const semValidade =
        isTrue(
          edit?.sem_validade
        );

      return `
        <div class="form-row">

          <div class="form-group">

            <label>
              Nome
              <span class="required-mark">*</span>
            </label>

            <input
              id="certificado_f_nome"
              value="${edit?.nome || ''}"
              required
            >

          </div>

          <div class="form-group">

            <label>Emissor</label>

            <input
              id="certificado_f_emissor"
              value="${edit?.instituicao || ''}"
            >

          </div>

        </div>

        <div class="form-row">

          <div class="form-group">

            <label>
              Data de emissão
              <span class="required-mark">*</span>
            </label>

            <input
              type="date"
              id="certificado_f_data_emissao"
              value="${edit?.data_emissao || ''}"
              required
            >

          </div>

          <div
            class="form-group ${semValidade
          ? 'hidden'
          : ''
        }"
            id="certificado_f_data_validade_wrapper"
          >

            <label>
              Data de validade
            </label>

            <input
              type="date"
              id="certificado_f_data_validade"
              value="${edit?.data_validade || ''}"
            >

          </div>

        </div>

        <label class="checkbox-field">

          <input
            type="checkbox"
            id="certificado_f_sem_validade"
            ${semValidade
          ? 'checked'
          : ''
        }
            onchange="toggleValidadeVisibility('certificado')"
          >

          <span class="checkbox-text">

            <span class="checkbox-title">
              Este certificado não possui data de validade
            </span>

            <span class="checkbox-hint">
              Marque esta opção se o certificado não expira.
            </span>

          </span>

        </label>

        <div class="form-row">

          <div class="form-group">

            <label>URL</label>

            <input
              id="certificado_f_url"
              value="${edit?.link_certificado ||
        ''
        }"
            >

          </div>

          <div class="form-group">

            <label>
              Carga Horária (horas)
            </label>

            <input
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              id="certificado_f_carga_horaria"
              value="${edit?.carga_horaria ||
        ''
        }"
              placeholder="Ex: 40"
              oninput="this.value=this.value.replace(/[^0-9]/g,'')"
            >

          </div>

        </div>
      `;
    },

    getData: () => ({
      // NOMES EXATOS DA TABELA certificacoes

      nome:
        UI.val(
          'certificado_f_nome'
        ),

      instituicao:
        UI.val(
          'certificado_f_emissor'
        ),

      data_emissao:
        UI.val(
          'certificado_f_data_emissao'
        ) || null,

      data_validade:
        document.getElementById(
          'certificado_f_sem_validade'
        )?.checked
          ? null
          : (
            UI.val(
              'certificado_f_data_validade'
            ) || null
          ),

      link_certificado:
        UI.val(
          'certificado_f_url'
        )
    }),

    validate: d =>
      d.nome &&
      d.data_emissao,

    requiredFields: [
      {
        id: 'certificado_f_nome',
        label: 'Nome'
      },
      {
        id: 'certificado_f_data_emissao',
        label: 'Data de emissão'
      }
    ]
  }
};

// ============================================
// RENDERIZAÇÃO DAS LISTAS
// ============================================

function renderList(section, type) {
  const config =
    sectionConfig[type];

  const items =
    profile?.[section] || [];

  const container =
    document.getElementById(
      `list-${type}`
    );

  const editContainer =
    document.getElementById(
      `edit-${type}`
    );

  if (!container || !config) {
    return;
  }

  if (
    items.length === 0 &&
    !config.inline
  ) {
    container.innerHTML = `
      <div
        style="
          text-align:center;
          padding:24px;
          color:var(--gray-500)
        "
      >
        ${config.emptyMsg}
      </div>
    `;

    return;
  }

  if (config.inline) {
    container.innerHTML = `
      <div
        class="form-alert hidden"
        id="alert-${type}-inline"
      >
        <i class="ph-fill ph-warning-circle"></i>

        <span
          id="alert-${type}-inline-text"
        ></span>
      </div>

      <div
        class="form-inline"
        style="margin-bottom:16px"
      >

        <div
          class="form-group"
          id="group-inline-nome"
        >
          <label>
            Nome
            <span class="required-mark">*</span>
          </label>

          <input
            id="inline-nome"
            placeholder="Ex: JavaScript"
          >
        </div>

        <div
          class="form-group"
          style="min-width:120px"
        >
          <label>Categoria</label>

          <select id="inline-categoria">
            ${CONFIG.skillCategories
        .map(
          c =>
            `<option>${c}</option>`
        )
        .join('')}
          </select>
        </div>

        <div
          class="form-group"
          style="min-width:120px"
        >
          <label>Nível</label>

          <select id="inline-nivel">
            ${CONFIG.skillLevels
        .map(
          l =>
            `<option>${l}</option>`
        )
        .join('')}
          </select>
        </div>

        <button
          class="btn btn-primary btn-sm"
          id="addBtn-${type}"
          onclick="addItem('${type}')"
        >
          + Adicionar
        </button>

      </div>

      <div
        class="skill-tags"
        id="skillsContainer"
      >
        ${items
        .map(
          item => `
              <div class="skill-tag">

                <span
                  class="badge badge-blue"
                  style="margin-right:4px"
                >
                  ${item.categoria ||
            ''
            }
                </span>

                ${item.nome ||
            item.habilidade ||
            ''
            }

                <span
                  style="
                    color:var(--gray-400);
                    font-size:11px
                  "
                >
                  ${item.nivel || ''}
                </span>

                <button
                  class="btn btn-secondary btn-sm"
                  onclick="editItem(
                    '${type}',
                    '${item.id}'
                  )"
                  style="
                    margin:0 4px;
                    padding:2px 6px;
                    font-size:10px;
                  "
                >
                  <i
                    class="ph-fill ph-pencil-line"
                    style="
                      font-size:12px;
                      vertical-align:middle;
                    "
                  ></i>
                </button>

                <span
                  class="remove"
                  onclick="deleteItem(
                    '${type}',
                    '${item.id}'
                  )"
                >
                  ×
                </span>

              </div>
            `
        )
        .join('')}
      </div>
    `;

    return;
  }

  container.innerHTML =
    items
      .map(
        item => `
          <div class="list-item">

            <div>
              ${config.render(item)}
            </div>

            <div class="list-item-actions">

              <button
                class="btn btn-secondary btn-sm"
                onclick="editItem(
                  '${type}',
                  '${item.id}'
                )"
              >
                <i
                  class="ph-fill ph-pencil-line"
                  style="
                    font-size:18px;
                    vertical-align:middle;
                  "
                ></i>
              </button>

              <button
                class="btn btn-danger btn-sm"
                onclick="deleteItem(
                  '${type}',
                  '${item.id}'
                )"
              >
                <i
                  class="ph ph-trash"
                  style="
                    font-size:18px;
                    vertical-align:middle;
                  "
                ></i>
              </button>

            </div>

          </div>
        `
      )
      .join('');
}

// ============================================
// SEÇÕES NÃO DISPONÍVEIS
// ============================================

function warnSectionUnavailable(type) {
  const config =
    sectionConfig[type];

  if (!config) {
    return true;
  }

  if (config.resource !== null) {
    return false;
  }

  alert(
    `A seção "${config.label}" ainda não está disponível para salvar.`
  );

  return true;
}

// ============================================
// FORMULÁRIO DE EDIÇÃO
// ============================================

function showEditForm(
  type,
  item = null
) {
  if (warnSectionUnavailable(type)) {
    return;
  }

  const config =
    sectionConfig[type];

  const editContainer =
    document.getElementById(
      `edit-${type}`
    );

  if (!editContainer) {
    return;
  }

  const header =
    item
      ? `Editar ${config.label}`
      : `Nova ${config.label}`;

  editContainer.innerHTML = `
    <div
      class="card"
      style="margin-bottom:16px"
    >

      <div class="card-header">

        <h3>
          ${header}
        </h3>

      </div>

      <div class="card-body">

        <div
          class="form-alert hidden"
          id="alert-${type}"
        >

          <i
            class="ph-fill ph-warning-circle"
          ></i>

          <span
            id="alert-${type}-text"
          ></span>

        </div>

        ${config.form(item)}

        <div
          style="
            display:flex;
            justify-content:flex-end;
            gap:8px;
            margin-top:16px;
          "
        >

          <button
            class="btn btn-secondary btn-sm"
            onclick="hideEditForm('${type}')"
          >
            Cancelar
          </button>

          <button
            class="btn btn-primary btn-sm"
            onclick="saveItem(
              '${type}',
              ${item ? `'${item.id}'` : 'null'}
            )"
          >
            Salvar
          </button>

        </div>

      </div>

    </div>
  `;

  UI.show(`edit-${type}`);
}

function hideEditForm(type) {
  UI.hide(`edit-${type}`);
}

// ============================================
// ADICIONAR ITEM
// ============================================

async function addItem(type) {
  if (warnSectionUnavailable(type)) {
    return;
  }

  const config =
    sectionConfig[type];

  const btn =
    document.getElementById(
      `addBtn-${type}`
    );

  if (config.inline) {
    const missing =
      validateRequiredFields(
        config.inlineRequiredFields || []
      );

    if (missing.length > 0) {
      showFormAlert(
        `alert-${type}-inline`,
        missing
      );

      return;
    }

    hideFormAlert(
      `alert-${type}-inline`
    );

    const data = {
      nome:
        UI.val('inline-nome'),

      categoria:
        UI.val('inline-categoria'),

      nivel:
        UI.val('inline-nivel')
    };

    if (btn) {
      btn.disabled = true;
      btn.textContent =
        'Salvando...';
    }

    try {
      const result =
        await config.resource.criar(
          data
        );

      if (result?.error) {
        throw new Error(
          result.error
        );
      }

      document.getElementById(
        'inline-nome'
      ).value = '';

      document.getElementById(
        'inline-categoria'
      ).value =
        CONFIG.skillCategories[0] ||
        '';

      document.getElementById(
        'inline-nivel'
      ).value =
        CONFIG.skillLevels[0] ||
        '';

    } catch (e) {
      console.error(
        'Erro ao adicionar:',
        e
      );

      alert(
        e?.message ||
        'Erro ao adicionar. Tente novamente.'
      );
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent =
          '+ Adicionar';
      }

      await loadProfile();
    }

    return;
  }

  const missing =
    validateRequiredFields(
      config.requiredFields || []
    );

  if (missing.length > 0) {
    showFormAlert(
      `alert-${type}`,
      missing
    );

    return;
  }

  hideFormAlert(
    `alert-${type}`
  );

  const data =
    config.getData();

  if (!config.validate(data)) {
    return;
  }

  try {
    const result =
      await config.resource.criar(
        data
      );

    if (result?.error) {
      throw new Error(
        result.error
      );
    }

    await loadProfile();
  } catch (error) {
    console.error(
      `Erro ao criar ${type}:`,
      error
    );

    alert(
      error?.message ||
      'Não foi possível salvar.'
    );
  }
}

// ============================================
// SALVAR ITEM
// ============================================

async function saveItem(
  type,
  id
) {
  if (warnSectionUnavailable(type)) {
    return;
  }

  const config =
    sectionConfig[type];

  const missing =
    validateRequiredFields(
      config.requiredFields || []
    );

  if (missing.length > 0) {
    showFormAlert(
      `alert-${type}`,
      missing
    );

    return;
  }

  hideFormAlert(
    `alert-${type}`
  );

  const data =
    config.getData();

  if (!config.validate(data)) {
    return;
  }

  try {
    let result;

    if (id) {
      result =
        await config.resource.atualizar(
          id,
          data
        );
    } else {
      result =
        await config.resource.criar(
          data
        );
    }

    if (result?.error) {
      throw new Error(
        result.error
      );
    }

    hideEditForm(type);

    await loadProfile();
  } catch (error) {
    console.error(
      `Erro ao salvar ${type}:`,
      error
    );

    showFormAlert(
      `alert-${type}`,
      [
        error?.message ||
        'Não foi possível salvar.'
      ]
    );
  }
}

// ============================================
// EXCLUIR ITEM
// ============================================

async function deleteItem(
  type,
  id
) {
  if (warnSectionUnavailable(type)) {
    return;
  }

  if (
    !confirm(
      'Tem certeza que deseja excluir?'
    )
  ) {
    return;
  }

  const config =
    sectionConfig[type];

  try {
    const result =
      await config.resource.deletar(
        id
      );

    if (result?.error) {
      throw new Error(
        result.error
      );
    }

    await loadProfile();
  } catch (error) {
    console.error(
      `Erro ao excluir ${type}:`,
      error
    );

    alert(
      error?.message ||
      'Não foi possível excluir.'
    );
  }
}

// ============================================
// EDITAR ITEM
// ============================================

function editItem(
  type,
  id
) {
  const keyMap = {
    experiencia:
      'experiencias',

    formacao:
      'formacoes',

    habilidade:
      'habilidades',

    projeto:
      'projetos',

    certificado:
      'certificacoes'
  };

  const key =
    keyMap[type];

  if (!key) {
    return;
  }

  const items =
    profile?.[key] || [];

  // Corrigido:
  // IDs vindos do HTML são strings,
  // enquanto IDs do PostgreSQL podem ser números.
  const item =
    items.find(
      i =>
        String(i.id) ===
        String(id)
    );

  if (item) {
    showEditForm(
      type,
      item
    );
  }
}

// ============================================
// ITENS QUE FALTAM PARA COMPLETAR O CURRÍCULO
// ============================================

function renderMissingItems(items) {
  const box =
    document.getElementById(
      'progressMissing'
    );

  if (!box) {
    return;
  }

  if (!items.length) {
    box.innerHTML = '';
    return;
  }

  box.innerHTML =
    '<span class="progress-missing-label">Falta preencher:</span>' +
    items
      .map(
        i => `
          <button
            type="button"
            class="progress-missing-chip"
            onclick="goToMissing('${i.tab}', '${i.field || ''}')"
          >
            ${i.label}
          </button>
        `
      )
      .join('');
}

function goToMissing(tab, field) {
  switchTab(tab);

  if (!field) {
    return;
  }

  const el = document.getElementById(field);

  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    el.focus();
  }
}

// ============================================
// PROGRESSO DO CURRÍCULO
// ============================================

function updateProgress() {
  if (!profile) {
    return;
  }

  // Cada item do checklist: o que conta para a completude,
  // o nome exibido e a aba onde o aluno resolve.
  const checklist = [
    { done: !!profile.sobre, label: 'Sobre mim', tab: 'personal', field: 'bio' },
    { done: !!profile.curso, label: 'Curso', tab: 'personal', field: 'curso' },
    { done: !!profile.telefone, label: 'Telefone', tab: 'personal', field: 'telefone' },
    { done: !!profile.cidade, label: 'Cidade', tab: 'personal', field: 'cidade' },
    { done: !!profile.experiencias?.length, label: 'Experiência', tab: 'experience' },
    { done: !!profile.habilidades?.length, label: 'Habilidade', tab: 'skills' },
    { done: !!profile.projetos?.length, label: 'Projeto', tab: 'projects' },
    { done: !!profile.certificacoes?.length, label: 'Certificado', tab: 'certificates' }
  ];

  const total = checklist.length;

  const filled = checklist.filter(i => i.done).length;

  const missingItems = checklist.filter(i => !i.done);

  const pct =
    Math.round(
      (filled / total) * 100
    );

  renderMissingItems(missingItems);

  const progressFill =
    document.getElementById(
      'progressFill'
    );

  const progressText =
    document.getElementById(
      'progressText'
    );

  const progressMsg =
    document.getElementById(
      'progressMsg'
    );

  if (progressFill) {
    progressFill.style.width =
      pct + '%';
  }

  if (progressText) {
    progressText.textContent =
      pct + '%';
  }

  if (progressMsg) {
    progressMsg.textContent =
      pct < 50
        ? 'Continue preenchendo!'
        : pct < 100
          ? 'Quase lá!'
          : 'Parabéns! Currículo completo!';
  }

  // ==========================================
  // LINK PÚBLICO
  // ==========================================

  if (profile.slug) {
    const pubUrl =
      location.origin +
      '/' +
      profile.slug;

    const publicLink =
      document.getElementById(
        'publicLink'
      );

    if (publicLink) {
      publicLink.innerHTML = `
        Seu perfil público:
        <a
          href="${pubUrl}"
          target="_blank"
          rel="noopener noreferrer"
        >
          /${profile.slug}
        </a>
      `;
    }

    UI.show(
      'publicLinkCard'
    );
  }
}

// ============================================
// FORMATAÇÃO DE DATA
// ============================================

function fmtDate(d) {
  if (!d) {
    return '';
  }

  const dt =
    new Date(
      d + 'T00:00:00'
    );

  return dt.toLocaleDateString(
    'pt-BR',
    {
      month: 'short',
      year: 'numeric'
    }
  );
}

// ============================================
// PREVIEW
// ============================================

function goToPreview() {
  window.location.href =
    'preview.html';
}

// ============================================
// INICIALIZAÇÃO
// ============================================

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initDashboard
  );
} else {
  initDashboard();
}