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
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
    'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
    'RS','RO','RR','SC','SP','SE','TO'
  ],
  
  skillCategories: ['Técnica', 'Idioma', 'Soft Skill', 'Ferramenta'],
  skillLevels: ['Básico', 'Intermediário', 'Avançado', 'Expert']
};
