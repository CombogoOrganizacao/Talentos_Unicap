// ============================================
// Config - dados estáticos da aplicação
// (equivalente ao pacote Config/ do backend: só dados de configuração,
// sem lógica de negócio. Lógica de cidades/cursos foi para js/utils/)
// ============================================
const CONFIG = {

  // URL base da API REST (Spring Boot).
  // Antes essa URL incluía "/api" apenas no ambiente local, enquanto em
  // produção não incluía — e os serviços (aluno-service.js, empresa-
  // -service.js) chamam paths sem "/api" (ex: '/aluno/perfil'), mas
  // auth.js chamava paths com "/api" (ex: '/api/aluno/perfil'). Isso
  // fazia local e produção quebrarem de formas opostas (um duplicava o
  // "/api", o outro nunca o enviava). Agora "/api" sempre faz parte da
  // base, e todos os paths chamados por Http.* devem vir SEM "/api".
  apiBaseUrl: (function () {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const host = isLocal ? 'http://localhost:8080' : 'https://backendtalentos.onrender.com';
    return host + '/api';
  })(),

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
