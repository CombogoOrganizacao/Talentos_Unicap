// ============================================
// Dashboard - Importar dados para o currículo: LinkedIn (ZIP/CSV) ou
// currículo externo (PDF/DOCX). Os dois modos compartilham a mesma tela de
// revisão e a mesma gravação (LinkedInImport.aplicar).
// Depende de: LinkedInImport (services/linkedin-import-service.js),
// CurriculoImport (services/curriculo-import-service.js), JSZip,
// API, CONFIG, MAPA_GRAU_PARA_CHAVE, buscarCidadesPorEstado, loadProfile,
// e da variável global `profile` (dashboard.js).
// ============================================

(function () {
  'use strict';

  const LINKEDIN_EXPORT_URL = 'https://www.linkedin.com/mypreferences/d/download-my-data';

  const SECOES = [
    { chave: 'experiencias', titulo: 'Experiências profissionais', icone: 'ph-briefcase' },
    { chave: 'formacoes', titulo: 'Formação acadêmica', icone: 'ph-graduation-cap' },
    { chave: 'habilidades', titulo: 'Habilidades e idiomas', icone: 'ph-wrench' },
    { chave: 'projetos', titulo: 'Projetos', icone: 'ph-box-arrow-up' },
    { chave: 'certificacoes', titulo: 'Certificações', icone: 'ph-trophy' }
  ];

  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MODOS = {
    linkedin: { titulo: 'Importar do LinkedIn', icone: 'ph-linkedin-logo' },
    curriculo: { titulo: 'Importar currículo (PDF ou Word)', icone: 'ph-file-arrow-up' }
  };

  const estado = { overlay: null, plano: null, ocupado: false, nivelPadrao: 'Básico', modo: 'linkedin' };

  // ------------------------------------------------------------------
  // Estrutura do modal
  // ------------------------------------------------------------------
  function abrirImportacao(modo) {
    if (estado.overlay) return;
    estado.modo = MODOS[modo] ? modo : 'linkedin';
    estado.plano = null;
    estado.ocupado = false;
    estado.nivelPadrao = 'Básico';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal li-modal" role="dialog" aria-modal="true" aria-labelledby="liTitulo">
        <div class="modal-header">
          <h3 id="liTitulo"><i class="ph-fill ${MODOS[estado.modo].icone}"></i> ${MODOS[estado.modo].titulo}</h3>
          <button type="button" class="btn btn-secondary btn-sm" data-li="fechar" aria-label="Fechar"><i class="ph ph-x" aria-hidden="true"></i></button>
        </div>
        <div id="liCorpo"></div>
      </div>`;
    document.body.appendChild(overlay);
    estado.overlay = overlay;

    overlay.addEventListener('mousedown', e => { if (e.target === overlay) fechar(); });
    overlay.addEventListener('click', onClick);
    overlay.addEventListener('change', onChange);
    overlay.addEventListener('input', onInput);
    document.addEventListener('keydown', onKeydown);

    renderUpload();
  }

  function fechar() {
    if (estado.ocupado || !estado.overlay) return;
    document.removeEventListener('keydown', onKeydown);
    estado.overlay.remove();
    estado.overlay = null;
  }

  function onKeydown(e) { if (e.key === 'Escape') fechar(); }
  const corpo = () => document.getElementById('liCorpo');

  // ------------------------------------------------------------------
  // Passo 1 - instruções + upload
  // ------------------------------------------------------------------
  function renderUpload(erro) {
    if (estado.modo === 'curriculo') renderUploadCurriculo(erro);
    else renderUploadLinkedin(erro);
  }

  function renderUploadCurriculo(erro) {
    corpo().innerHTML = `
      <div class="modal-body">
        <p style="color:var(--gray-600);margin-bottom:12px;">
          Envie o seu currículo em <strong>PDF</strong> ou <strong>Word (.docx)</strong>. O TalentoUNICAP lê o texto,
          identifica dados pessoais, experiências, formação, habilidades, projetos e certificações e preenche o seu
          currículo aqui — do mesmo jeito que na importação do LinkedIn.
        </p>

        ${erro ? `<div class="form-alert"><i class="ph-fill ph-warning-circle"></i><span>${esc(erro)}</span></div>` : ''}

        <div class="form-group">
          <label for="liArquivo">Currículo (.pdf ou .docx — até 10 MB)</label>
          <input type="file" id="liArquivo" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
          <small style="color:var(--gray-500)">PDFs escaneados (foto/imagem do currículo) não têm texto para ler: use o PDF gerado pelo Word/Google Docs ou o arquivo .docx.</small>
        </div>
        <p style="font-size:12px;color:var(--gray-500);">
          <i class="ph-fill ph-lock-simple"></i>
          O arquivo é lido no seu navegador, sem ser enviado a nenhum servidor. A leitura é automática e pode errar em
          layouts incomuns: você revisa, corrige e escolhe o que será gravado.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-li="fechar">Cancelar</button>
        <button type="button" class="btn btn-primary" id="liAnalisar" data-li="analisar">Analisar arquivo</button>
      </div>`;
  }

  function renderUploadLinkedin(erro) {
    corpo().innerHTML = `
      <div class="modal-body">
        <p style="color:var(--gray-600);margin-bottom:12px;">
          O LinkedIn não permite que outros sites leiam seu perfil diretamente. A forma oficial é o arquivo
          de dados que ele gera para você — e é isso que o TalentoUNICAP lê para preencher o currículo.
        </p>
        <ol class="li-passos">
          <li>Abra a página <a href="${LINKEDIN_EXPORT_URL}" target="_blank" rel="noopener noreferrer">Obter uma cópia dos seus dados</a> (LinkedIn → Configurações e privacidade → Privacidade dos dados).</li>
          <li>Selecione os dados do perfil (Perfil, Posições, Formação, Habilidades, Certificações, Projetos, Idiomas e Números de telefone) ou peça o arquivo completo, e solicite o download.</li>
          <li>O LinkedIn avisa por e-mail quando o arquivo estiver pronto. Baixe o <strong>.zip</strong> e envie aqui.</li>
        </ol>

        ${erro ? `<div class="form-alert"><i class="ph-fill ph-warning-circle"></i><span>${esc(erro)}</span></div>` : ''}

        <div class="form-group">
          <label for="liArquivo">Arquivo do LinkedIn (.zip, ou os .csv soltos)</label>
          <input type="file" id="liArquivo" accept=".zip,.csv" multiple>
        </div>
        <div class="form-group">
          <label for="liUrl">Link do seu perfil <span style="color:var(--gray-400);font-weight:400">(opcional)</span></label>
          <input id="liUrl" placeholder="linkedin.com/in/seuuser" value="${esc(profile?.linkedin || '')}">
          <small style="color:var(--gray-500)">O arquivo do LinkedIn não traz o endereço do perfil, então ele vem daqui.</small>
        </div>
        <p style="font-size:12px;color:var(--gray-500);">
          <i class="ph-fill ph-lock-simple"></i>
          O arquivo é lido no seu navegador. Você revisa tudo antes de salvar e só o que marcar é gravado.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-li="fechar">Cancelar</button>
        <button type="button" class="btn btn-primary" id="liAnalisar" data-li="analisar">Analisar arquivo</button>
      </div>`;
  }

  async function analisarCurriculo() {
    const input = document.getElementById('liArquivo');
    const arquivo = input?.files && input.files[0];
    if (!arquivo) { renderUpload('Selecione o arquivo do currículo (.pdf ou .docx).'); return; }

    const btn = document.getElementById('liAnalisar');
    estado.ocupado = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Lendo currículo…'; }

    try {
      const lido = await CurriculoImport.lerArquivo(arquivo);
      const conv = CurriculoImport.converter(lido.texto, lido.links, { CONFIG: window.CONFIG, MAPA_GRAU_PARA_CHAVE: window.MAPA_GRAU_PARA_CHAVE });
      if (!conv.lidos.length) {
        throw new Error('Não consegui identificar as seções do currículo (Experiência, Formação, Habilidades…). Confira se o arquivo é um currículo com texto e títulos de seção.');
      }
      const existente = await carregarExistente();
      const plano = CurriculoImport.montarPlano(conv, existente, {});
      await resolverCidade(plano);
      estado.plano = plano;
      estado.ocupado = false;
      renderRevisao();
    } catch (e) {
      console.error('Importação de currículo:', e);
      estado.ocupado = false;
      renderUpload(e.message || 'Não foi possível ler o arquivo.');
    }
  }

  async function analisar() {
    if (estado.modo === 'curriculo') return analisarCurriculo();
    const input = document.getElementById('liArquivo');
    const arquivos = input?.files ? Array.from(input.files) : [];
    const url = document.getElementById('liUrl')?.value || '';
    if (!arquivos.length) { renderUpload('Selecione o arquivo .zip (ou os .csv) exportado do LinkedIn.'); return; }

    const btn = document.getElementById('liAnalisar');
    estado.ocupado = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Lendo arquivo…'; }

    try {
      const csvs = await LinkedInImport.lerArquivos(arquivos);
      if (!Object.keys(csvs).length) {
        throw new Error('Não encontrei dados do LinkedIn nesse arquivo. Confira se é o ZIP de "Obter uma cópia dos seus dados".');
      }
      const conv = LinkedInImport.converter(csvs, { CONFIG: window.CONFIG, MAPA_GRAU_PARA_CHAVE: window.MAPA_GRAU_PARA_CHAVE });
      const existente = await carregarExistente();
      const plano = LinkedInImport.montarPlano(conv, existente, { linkedinUrl: url });
      await resolverCidade(plano);
      if (url && !plano.perfil.some(l => l.chave === 'linkedin') && !profile?.linkedin) {
        plano.avisos.push('O link do LinkedIn informado não parece válido (use o formato linkedin.com/in/seuuser).');
      }
      estado.plano = plano;
      estado.ocupado = false;
      renderRevisao();
    } catch (e) {
      console.error('Importação LinkedIn:', e);
      estado.ocupado = false;
      renderUpload(e.message || 'Não foi possível ler o arquivo.');
    }
  }

  // Lista o que o aluno já tem, direto das tabelas (fonte da deduplicação)
  async function carregarExistente() {
    const lista = async r => { const x = await r.listar(); return Array.isArray(x) ? x : []; };
    const [experiencias, formacoes, habilidades, projetos, certificacoes] = await Promise.all([
      lista(API.experiencias), lista(API.formacoes), lista(API.habilidades), lista(API.projetos), lista(API.certificacoes)
    ]);
    return {
      perfil: profile && !profile.error ? profile : {},
      experiencias, formacoes, habilidades, projetos, certificacoes
    };
  }

  // O select de cidade usa os nomes do IBGE: casa o texto do LinkedIn com eles
  async function resolverCidade(plano) {
    const linha = plano.perfil.find(l => l.chave === 'localizacao');
    if (!linha || !linha.cidade || !linha.estado) return;
    const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const cidades = typeof buscarCidadesPorEstado === 'function' ? await buscarCidadesPorEstado(linha.estado) : [];
    const achada = cidades.find(c => norm(c) === norm(linha.cidade));
    if (achada) linha.cidade = achada;
    else if (cidades.length) {
      plano.avisos.push(`A cidade "${linha.cidade}" não foi encontrada na lista de ${linha.estado}; só o estado será preenchido.`);
      linha.cidade = '';
    }
    linha.novo = [linha.cidade, linha.estado].filter(Boolean).join(' / ');
  }

  // ------------------------------------------------------------------
  // Passo 2 - revisão
  // ------------------------------------------------------------------
  function renderRevisao() {
    const p = estado.plano;
    const temHabSemNivel = p.habilidades.some(h => h.dados.nivel == null);

    const blocoPerfil = p.perfil.length ? `
      <div class="li-secao">
        <h4><i class="ph-fill ph-users"></i> Dados pessoais</h4>
        ${p.perfil.map((l, i) => `
          <label class="li-item">
            <input type="checkbox" data-li-perfil="${i}" ${l.selecionado ? 'checked' : ''}>
            <span>
              <strong>${esc(l.rotulo)}</strong>
              ${l.estimado ? '<span class="badge badge-orange">estimado</span>' : ''}
              ${l.atual ? '<span class="badge badge-gray">substitui o atual</span>' : ''}
              <span class="li-sub">${esc(truncar(l.novo, 160))}</span>
              ${l.atual ? `<span class="li-sub">Atual: ${esc(truncar(l.atual, 120))}</span>` : ''}
            </span>
          </label>`).join('')}
      </div>` : '';

    const blocosSecoes = SECOES.map(sec => {
      const itens = p[sec.chave];
      const novos = itens.filter(i => !i.duplicado);
      const dups = itens.length - novos.length;
      if (!itens.length) return '';
      return `
        <div class="li-secao">
          <h4>
            <i class="ph-fill ${sec.icone}"></i> ${sec.titulo}
            <span class="badge badge-blue">${novos.length} nova(s)</span>
            ${dups ? `<span class="badge badge-gray">${dups} já cadastrada(s)</span>` : ''}
          </h4>
          ${sec.chave === 'habilidades' && temHabSemNivel ? `
            <div class="li-nivel">
              <label for="liNivelPadrao">Nível para as habilidades importadas</label>
              <select id="liNivelPadrao" data-li-nivel-padrao>
                ${CONFIG.skillLevels.map(n => `<option ${n === estado.nivelPadrao ? 'selected' : ''}>${esc(n)}</option>`).join('')}
              </select>
              <small>${estado.modo === 'curriculo' ? 'O currículo não informa nível das habilidades' : 'O LinkedIn não informa nível'}; ajuste depois se quiser.</small>
            </div>` : ''}
          ${novos.length > 1 ? `<label class="li-todos"><input type="checkbox" data-li-todos="${sec.chave}" ${novos.every(i => i.selecionado) ? 'checked' : ''}> Selecionar todas</label>` : ''}
          ${itens.map((it, i) => it.duplicado ? '' : itemHtml(sec.chave, it, i)).join('')}
        </div>`;
    }).join('');

    const nada = !blocoPerfil && !blocosSecoes;
    const avisos = [
      ...p.avisos,
      p.truncados ? `${p.truncados} texto(s) foram encurtados para respeitar os limites de tamanho do currículo.` : ''
    ].filter(Boolean);

    corpo().innerHTML = `
      <div class="modal-body">
        ${avisos.length ? `<div class="form-alert"><i class="ph-fill ph-info"></i><span>${avisos.map(esc).join('<br>')}</span></div>` : ''}
        ${nada ? `
          <div class="empty-state" style="padding:24px 0;">
            <h2>Nada novo para importar</h2>
            <p>Tudo o que veio do LinkedIn já está no seu currículo.</p>
          </div>` : `
          <p style="color:var(--gray-600);margin-bottom:12px;">
            Revise o que será importado. Campos que você já preencheu ficam desmarcados para não serem sobrescritos.
            ${estado.modo === 'curriculo' ? '<br><strong>A leitura de currículos é automática e pode errar:</strong> confira cada item e use “Editar campos” para corrigir o que for preciso.' : ''}
          </p>`}
        ${blocoPerfil}${blocosSecoes}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-li="voltar">Voltar</button>
        <button type="button" class="btn btn-primary" id="liImportar" data-li="importar">Importar</button>
      </div>`;
    atualizarContagem();
  }

  // Item travado = não pode ser gravado ainda (faltam dados obrigatórios)
  const itemTravado = (sec, it) => !!it.bloqueio || (sec === 'formacoes' && !it.dados.nivel);

  function itemHtml(sec, it, i) {
    const travado = itemTravado(sec, it);
    const ed = it.editaveis || [];
    return `
      <div class="li-item ${it.bloqueio ? 'li-bloqueado' : ''}" data-li-item="${sec}:${i}">
        <label>
          <input type="checkbox" data-li-sec="${sec}" data-li-idx="${i}" ${it.selecionado && !travado ? 'checked' : ''} ${travado ? 'disabled' : ''}>
          <span>
            <strong data-li-t>${esc(it.titulo)}</strong>
            <span class="li-sub" data-li-d>${esc(it.detalhe || '')}</span>
            <span class="li-sub li-aviso" data-li-b ${it.bloqueio ? '' : 'hidden'}>${esc(it.bloqueio || '')}</span>
          </span>
        </label>
        ${sec === 'formacoes' ? `
          <select class="li-grau" data-li-grau="${i}" aria-label="Grau">
            <option value="">Escolha o grau…</option>
            ${['Graduação', 'Especialização', 'Mestrado', 'Doutorado'].map(g => `<option ${it.dados.nivel === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>` : ''}
        ${ed.length ? `
          <details class="li-edit" ${it.bloqueio || it.aberto ? 'open' : ''}>
            <summary>Editar campos</summary>
            <div class="li-edit-grid">
              ${ed.map(c => `
                <label>${esc(c.rotulo)}
                  <input type="text" data-li-ed="${c.campo}" data-li-sec="${sec}" data-li-idx="${i}" maxlength="${c.max}" value="${esc(c.valor)}">
                </label>`).join('')}
            </div>
            ${sec === 'experiencias' ? `<button type="button" class="btn btn-secondary btn-sm" data-li="trocar" data-li-idx="${i}">⇄ Trocar cargo e empresa</button>` : ''}
          </details>` : ''}
      </div>`;
  }

  // Atualiza só o item editado (sem redesenhar a lista, para não perder o foco do campo)
  function atualizarItemDom(sec, i) {
    const item = estado.plano[sec][i];
    const raiz = estado.overlay && estado.overlay.querySelector(`[data-li-item="${sec}:${i}"]`);
    if (!raiz) return;
    const travado = itemTravado(sec, item);
    raiz.classList.toggle('li-bloqueado', !!item.bloqueio);
    raiz.querySelector('[data-li-t]').textContent = item.titulo;
    raiz.querySelector('[data-li-d]').textContent = item.detalhe || '';
    const b = raiz.querySelector('[data-li-b]');
    b.textContent = item.bloqueio || '';
    b.hidden = !item.bloqueio;
    const cb = raiz.querySelector('input[type="checkbox"]');
    cb.disabled = travado;
    cb.checked = item.selecionado && !travado;
  }

  const truncar = (t, n) => (String(t).length > n ? String(t).slice(0, n - 1) + '…' : String(t));

  function totalSelecionado() {
    const p = estado.plano;
    return p.perfil.filter(l => l.selecionado).length +
      SECOES.reduce((s, sec) => s + p[sec.chave].filter(i => i.selecionado && !i.duplicado && !itemTravado(sec.chave, i)).length, 0);
  }

  function atualizarContagem() {
    const btn = document.getElementById('liImportar');
    if (!btn) return;
    const n = totalSelecionado();
    btn.disabled = n === 0;
    btn.textContent = n ? `Importar ${n} item(ns)` : 'Nada selecionado';
  }

  // ------------------------------------------------------------------
  // Eventos
  // ------------------------------------------------------------------
  function onClick(e) {
    const alvo = e.target.closest('[data-li]');
    if (!alvo) return;
    const acao = alvo.dataset.li;
    if (acao === 'fechar') fechar();
    else if (acao === 'analisar') analisar();
    else if (acao === 'voltar') renderUpload();
    else if (acao === 'importar') importar();
    else if (acao === 'trocar') trocarCargoEmpresa(Number(alvo.dataset.liIdx));
  }

  function trocarCargoEmpresa(i) {
    const item = estado.plano.experiencias[i];
    if (!item) return;
    const d = item.dados;
    [d.cargo, d.empresa] = [d.empresa, d.cargo];
    CurriculoImport.editarCampo('experiencias', item, 'cargo', d.cargo);   // revalida título e bloqueio
    item.aberto = true;
    renderRevisao();
  }

  function onInput(e) {
    const el = e.target;
    if (el.dataset.liEd === undefined || !estado.plano) return;
    const sec = el.dataset.liSec, i = Number(el.dataset.liIdx);
    CurriculoImport.editarCampo(sec, estado.plano[sec][i], el.dataset.liEd, el.value);
    atualizarItemDom(sec, i);
    atualizarContagem();
  }

  function onChange(e) {
    const el = e.target;
    const p = estado.plano;
    if (!p || el.dataset.liEd !== undefined) return;     // campos de texto são tratados em onInput

    if (el.dataset.liPerfil !== undefined) {
      p.perfil[Number(el.dataset.liPerfil)].selecionado = el.checked;
    } else if (el.dataset.liSec) {
      p[el.dataset.liSec][Number(el.dataset.liIdx)].selecionado = el.checked;
    } else if (el.dataset.liTodos) {
      const sec = el.dataset.liTodos;
      p[sec].forEach((it, i) => {
        if (it.duplicado || itemTravado(sec, it)) return;
        it.selecionado = el.checked;
        const cb = estado.overlay.querySelector(`[data-li-sec="${sec}"][data-li-idx="${i}"]`);
        if (cb) cb.checked = el.checked;
      });
    } else if (el.dataset.liGrau !== undefined) {
      const i = Number(el.dataset.liGrau);
      const item = p.formacoes[i];
      item.dados.nivel = el.value;
      item.selecionado = !itemTravado('formacoes', item);
      atualizarItemDom('formacoes', i);
    } else if (el.hasAttribute('data-li-nivel-padrao')) {
      estado.nivelPadrao = el.value;
    }
    atualizarContagem();
  }

  // ------------------------------------------------------------------
  // Passo 3 - gravação e resultado
  // ------------------------------------------------------------------
  async function importar() {
    const p = estado.plano;
    p.habilidades.forEach(h => { if (h.dados.nivel == null) h.dados.nivel = estado.nivelPadrao; });
    p.formacoes.forEach(f => { if (!f.dados.nivel) f.selecionado = false; });

    estado.ocupado = true;
    corpo().innerHTML = `
      <div class="modal-body" style="text-align:center;padding:40px 24px;">
        <p id="liProgresso" style="color:var(--gray-600);">Importando…</p>
      </div>`;

    let resumo;
    try {
      resumo = await LinkedInImport.aplicar(p, API, {
        onProgress: msg => { const el = document.getElementById('liProgresso'); if (el) el.textContent = msg; }
      });
      if (typeof loadProfile === 'function') await loadProfile();
    } catch (e) {
      console.error('Falha na importação:', e);
      estado.ocupado = false;
      renderResultado(null, e.message || 'Erro inesperado durante a importação.');
      return;
    }
    estado.ocupado = false;
    renderResultado(resumo);
  }

  function renderResultado(resumo, erroGeral) {
    const linhas = [];
    let falhas = [];
    if (resumo) {
      if (resumo.perfil.ok) linhas.push(`Dados pessoais: ${resumo.perfil.campos} campo(s) preenchido(s)`);
      else if (resumo.perfil.erro) linhas.push(`Dados pessoais: não foi possível salvar (${esc(resumo.perfil.erro)})`);
      for (const sec of SECOES) {
        const r = resumo.secoes[sec.chave];
        if (r && (r.ok || r.falhas.length)) linhas.push(`${sec.titulo}: ${r.ok} importado(s)`);
        if (r) falhas = falhas.concat(r.falhas.map(f => ({ ...f, secao: sec.titulo })));
      }
    }
    corpo().innerHTML = `
      <div class="modal-body">
        ${erroGeral ? `<div class="form-alert"><i class="ph-fill ph-warning-circle"></i><span>${esc(erroGeral)}</span></div>` : `
          <p style="font-weight:600;margin-bottom:8px;"><i class="ph-fill ph-check-circle" style="color:var(--green-600, #15803d)"></i> Importação concluída</p>
          <ul class="li-resumo">${linhas.map(l => `<li>${l}</li>`).join('')}</ul>`}
        ${falhas.length ? `
          <div class="form-alert" style="margin-top:12px;"><i class="ph-fill ph-warning-circle"></i>
            <span>Alguns itens não foram salvos:<br>${falhas.map(f => `• ${esc(f.titulo)} — ${esc(f.erro)}`).join('<br>')}</span>
          </div>` : ''}
        <p style="font-size:13px;color:var(--gray-500);margin-top:12px;">
          Confira as abas do currículo e ajuste o que precisar.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" data-li="fechar">Fechar</button>
      </div>`;
  }

  window.abrirImportacaoLinkedIn = () => abrirImportacao('linkedin');
  window.abrirImportacaoCurriculo = () => abrirImportacao('curriculo');
})();
