// ============================================
// Configuração - TalentoUNICAP
// ============================================
const CONFIG = {
  // URL do Google Apps Script (depois de publicar como app web)
  API_URL: 'https://script.google.com/macros/s/SUA_URL_AQUI/exec',
  
  // Configuração do Firebase
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
  },
<<<<<<< Updated upstream
  
  // Estados brasileiros
  states: [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
    'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
    'RS','RO','RR','SC','SP','SE','TO'
  ],
  
=======



>>>>>>> Stashed changes
  skillCategories: ['Técnica', 'Idioma', 'Soft Skill', 'Ferramenta'],
  skillLevels: ['Básico', 'Intermediário', 'Avançado', 'Expert']
};
<<<<<<< Updated upstream
=======

const MAPA_GRAU_PARA_CHAVE = {
  'Graduação': 'cursos',
  'Especialização': 'especializacoes',
  'Mestrado': 'mestrados',
  'Doutorado': 'doutorados'
};

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
  return `<option value="">Selecione um curso</option>${opcoes}`;
}

// Atualiza o dropdown de curso quando o grau muda
function atualizarCursosPorGrau(key, grau) {
  const select = document.getElementById(`${key}_f_area_estudo`);
  if (select) select.innerHTML = gerarOpcoesCurso(grau);
}


// Estados brasileiros
  states: [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ],  

// Busca as cidades de um estado via API do IBGE
async function buscarCidadesPorEstado(uf) {
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
    if (!res.ok) throw new Error('Falha ao buscar cidades');
    const data = await res.json();
    // Ordena por nome e retorna só os nomes
    return data.map(cidade => cidade.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  } catch (erro) {
    console.error('Erro ao buscar cidades do IBGE:', erro);
    return [];
  }
}

// Cache simples em memória para não repetir a chamada se o usuário trocar de estado e voltar
const cacheCidades = {};

async function buscarCidadesComCache(uf) {
  if (cacheCidades[uf]) return cacheCidades[uf];
  const cidades = await buscarCidadesPorEstado(uf);
  cacheCidades[uf] = cidades;
  return cidades;
}
>>>>>>> Stashed changes
