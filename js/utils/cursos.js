// ============================================
// Utils - seleção de curso por grau acadêmico
// (depende de CONFIG e MAPA_GRAU_PARA_CHAVE, definidos em js/config/config.js)
// ============================================

// Gera as <option> do dropdown de curso, de acordo com o grau escolhido
function gerarOpcoesCurso(grau, cursoSelecionado = '') {
  const chave = MAPA_GRAU_PARA_CHAVE[grau];
  const lista = chave ? CONFIG[chave] : null;

  if (!lista) {
    return `<option value="">Selecione o grau primeiro</option>`;
  }

  const opcoes = lista
    .map(c => `<option value="${c}" ${c === cursoSelecionado ? 'selected' : ''}>${c}</option>`)
    .join('');

  // Curso fora das listas da UNICAP (ex.: importado do LinkedIn, de outra instituição):
  // mantém o valor salvo como opção, para não ser perdido ao editar a formação.
  const extra = cursoSelecionado && !lista.includes(cursoSelecionado)
    ? `<option value="${String(cursoSelecionado).replace(/"/g, '&quot;').replace(/</g, '&lt;')}" selected>${String(cursoSelecionado).replace(/</g, '&lt;')}</option>`
    : '';
  return `<option value="">Selecione um curso</option>${extra}${opcoes}`;
}

// Atualiza o dropdown de curso quando o grau muda
function atualizarCursosPorGrau(key, grau) {
  const select = document.getElementById(`${key}_f_area_estudo`);
  if (select) select.innerHTML = gerarOpcoesCurso(grau);
}
