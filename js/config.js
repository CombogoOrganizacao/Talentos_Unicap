// ============================================
// Configuração - TalentoUNICAP
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxiOfxy6HPAiJ4hz3fmYPamNl8XpVb-IE",
  authDomain: "talentos-unicap.firebaseapp.com",
  projectId: "talentos-unicap",
  storageBucket: "talentos-unicap.firebasestorage.app",
  messagingSenderId: "936743315009",
  appId: "1:936743315009:web:3d4964704577c1934548c0",
  measurementId: "G-0BLD35NF7J"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa a autenticação
const auth = getAuth(app);

export {
  app,
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
};

const CONFIG = {
  // URL do Google Apps Script (depois de publicar como app web)
  API_URL: 'https://script.google.com/macros/s/AKfycbxIfpDwJifTVvh7jvGCzLVo13-8veciil9aBzuzIKd0xrzvLe7-4WhIpppIXN9iChLl/exec',
  

  
  // Estados brasileiros
  states: [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
    'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
    'RS','RO','RR','SC','SP','SE','TO'
  ],
  
  skillCategories: ['Técnica', 'Idioma', 'Soft Skill', 'Ferramenta'],
  skillLevels: ['Básico', 'Intermediário', 'Avançado', 'Expert']
};
