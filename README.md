# 🎓 TalentoUNICAP

Plataforma para alunos da **Universidade Católica de Pernambuco** criarem, gerenciarem e exportarem currículos profissionais.

## Stack 100% Gratuita

| Serviço | Uso |
|---------|-----|
| **Firebase Authentication** | Autenticação (email/senha) |
| **Firebase Authentication** | Autenticação (email/senha) |
| **Firebase Realtime Database** | Banco de dados em tempo real |
| **Vercel** | Hosting estático (free tier) |
| **GitHub** | Controle de versão |
| **jsPDF + html2canvas** | Exportação PDF |
| **docx + file-saver** | Exportação DOCX |

## 🚀 Como Configurar

### 1. Firebase (Autenticação)

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto
3. Ative o **Authentication** → método **Email/Senha**
4. Vá em **Configurações do Projeto** → copie as credenciais
5. Cole em `js/config.js`:
```js
firebase: {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123456:web:abc"
}
```

### 2. Google Sheets + Apps Script

1. Crie uma nova **Planilha Google** em [sheets.google.com](https://sheets.google.com)
2. Vá em **Extensões** → **Apps Script**
3. Cole o conteúdo de `apps-script/Code.gs`
4. Substitua `'SEU_SPREADSHEET_ID_AQUI'` pelo ID da planilha (da URL)
5. Clique em **Executar** → `setupSheets()` → autorize o acesso
6. Vá em **Implantar** → **Implantar novo** → **Aplicativo da Web**:
   - Execute como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
7. Copie a URL gerada e cole em `js/config.js`:
```js
API_URL: 'https://script.google.com/macros/s/SUA_URL/exec'
```

### 3. Deploy no Vercel

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com) → importe o repositório
3. Deploy automático! ✅

### 4. Opcional: Domínio Personalizado

No Vercel, vá em **Settings** → **Domains** → adicione seu domínio.

## 📁 Estrutura

```
├── index.html          # Landing page
├── login.html          # Login
├── register.html       # Cadastro
├── dashboard.html      # Editor de currículo
├── preview.html        # Preview + exportação
├── public.html         # Perfil público
├── vercel.json         # Configuração Vercel
├── css/style.css       # Estilos
├── js/
│   ├── config.js       # Configurações (Firebase + API URL)
│   ├── api.js          # Cliente da API
│   ├── auth.js         # Autenticação Firebase
│   ├── dashboard.js    # Lógica do editor
│   ├── export.js       # Exportação PDF/DOCX
│   └── public-profile.js # Perfil público
└── apps-script/
    └── Code.gs         # Backend Google Apps Script
```

## 📝 Licença

MIT
