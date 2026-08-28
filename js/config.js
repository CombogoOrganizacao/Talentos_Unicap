// ============================================
// Configuração - TalentoUNICAP
// ============================================
const CONFIG = {
  // URL do Google Apps Script (depois de publicar como app web)
  API_URL: 'https://script.google.com/macros/s/SUA_URL_AQUI/exec',

  // Configuração do Firebase
  firebase: {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
  },

  // Estados brasileiros
  states: [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ],

  skillCategories: ['Técnica', 'Idioma', 'Soft Skill', 'Ferramenta'],
  skillLevels: ['Básico', 'Intermediário', 'Avançado', 'Expert'],


// Cursos de Graduação - UNICAP
cursos: [
    'Administração', 'Arquitetura e Urbanismo', 'Banco de Dados - IA e Ciências de Dados',
    'Ciência da Computação', 'Ciência Política', 'Ciências Biológicas - Licenciatura',
    'Ciências Biológicas - Bacharelado', 'Ciências Contábeis', 'Ciências da Religião',
    'Ciências Econômicas', 'Direito', 'Enfermagem', 'Engenharia Ambiental',
    'Engenharia Civil', 'Engenharia da Complexidade', 'Engenharia de Produção',
    'Engenharia Química', 'Farmácia', 'Filosofia - Licenciatura', 'Filosofia - Bacharelado',
    'Física', 'Fisioterapia', 'Fonoaudiologia', 'Fotografia', 'Gestão de RH',
    'História', 'Inteligência Artificial', 'Jogos Digitais', 'Jornalismo',
    'Letras Português', 'Letras Português e Espanhol', 'Letras Português e Inglês',
    'Logística', 'Matemática', 'Medicina', 'Mídias Sociais Digitais', 'Nutrição',
    'Pedagogia', 'Psicologia', 'Publicidade e Propaganda', 'Química',
    'Serviço Social', 'Sistemas para Internet', 'Teologia'
  ],

  // Pós-Graduação - Especialização (Lato Sensu)
  especializacoes: [
    'As Narrativas Contemporâneas da Fotografia e do Audiovisual',
    'Ciência Política: Teoria e Prática no Brasil', 'Educação Especial', 'Gerontologia',
    'Gestão Eclesial', 'Gestão Escolar e Coordenação Pedagógica',
    'História de Pernambuco: Memória, Território e Práticas de Ensino',
    'Juventudes: Experiência, Acompanhamento e Projeto de Vida',
    'Psicanálise: Fundamentos Teóricos, Matrizes e Dispositivos Clínicos',
    'Psicopedagogia', 'Reprodução Humana Assistida'
  ],

  // Pós-Graduação - Mestrado (Stricto Sensu)
  mestrados: [
    'Ciências da Linguagem', 'Ciências da Religião', 'Direito', 'Filosofia',
    'História (Profissional)', 'Indústrias Criativas (Profissional)',
    'Psicologia Clínica', 'Teologia'
  ],

  // Pós-Graduação - Doutorado (Stricto Sensu)
  doutorados: [
    'Ciências da Linguagem', 'Ciências da Religião', 'Direito', 'Psicologia Clínica'
  ]
};

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
