// ============================================
// Firebase - Inicialização
// TalentoUNICAP
// ============================================

if (!firebase.apps.length) {
  firebase.initializeApp(CONFIG.firebase);
}

var firebaseAuth = firebase.auth();
var firebaseDB = firebase.database();
