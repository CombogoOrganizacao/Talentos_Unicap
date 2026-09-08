# 🎓 TalentoUNICAP

Plataforma para alunos da **Universidade Católica de Pernambuco** criarem, gerenciarem e exportarem currículos profissionais.

## Stack 100% Gratuita

| Serviço | Uso |
|---------|-----|
| **Firebase Authentication** | Autenticação (email/senha) |
| **Firebase Realtime Database** | Banco de dados (currículos de alunos, empresas e vagas) |
| **Firebase Storage** | Armazenamento das logos das empresas |
| **Vercel** | Hosting estático (free tier) |
| **GitHub** | Controle de versão |
| **jsPDF + html2canvas** | Exportação PDF |
| **docx + file-saver** | Exportação DOCX |

## 🚀 Como Configurar

### 1. Firebase (Authentication + Realtime Database + Storage)

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto
3. Ative o **Authentication** → método **Email/Senha**
4. Ative o **Realtime Database** → crie o banco em modo de produção
5. Ative o **Storage** (usado para as logos das empresas)
6. Vá em **Configurações do Projeto** → copie as credenciais
7. Cole em `js/config.js`:
```js
firebase: {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123456:web:abc"
}
```
8. Publique as regras de segurança:
   - **Realtime Database** → aba **Regras** → cole o conteúdo de `database.rules.json` → **Publicar**
   - **Storage** → aba **Rules** → cole o conteúdo de `storage.rules` → **Publicar**

### Estrutura do banco (Realtime Database)

```
usuario_aluno/{uid}          # perfil + currículo de cada aluno
  ├── nome, email, slug, telefone, cidade, estado, curso, periodo, bio...
  ├── experiencias/{id}
  ├── formacao/{id}
  ├── habilidades/{id}
  ├── projetos/{id}
  └── certificados/{id}

usuario_empresa/{uid}        # perfil de cada empresa cadastrada
  ├── nome_empresa, cnpj, email, setor, telefone, site, responsavel, logo_url...

publicProfiles/{slug}        # cópia pública (só leitura) do currículo, usada em /[slug]

talentosUnicap.vagas         # (Portal de Vagas) — hoje ainda em localStorage no navegador
```

- `usuario_aluno` e `usuario_empresa` só podem ser lidos/escritos pelo próprio dono (uid autenticado).
- `publicProfiles` tem leitura pública (é o que alimenta o link de currículo compartilhável) e escrita restrita ao dono do perfil correspondente.
- A conta de teste `admin@unicap.edu.br` / `123456` continua funcionando em **modo demo** (dados só no `localStorage` do navegador), sem precisar de Firebase configurado — útil para testar a interface rapidamente.

### 2. Deploy no Vercel

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com) → importe o repositório
3. Deploy automático! ✅

### 3. Opcional: Domínio Personalizado

No Vercel, vá em **Settings** → **Domains** → adicione seu domínio.

## 📁 Estrutura

```
├── index.html              # Landing page (alunos)
├── login.html               # Login (alunos)
├── register.html             # Cadastro (alunos)
├── cadastro-empresa.html     # Cadastro de empresas
├── dashboard.html            # Editor de currículo (aluno)
├── preview.html              # Preview + exportação PDF/DOCX
├── public.html                # Perfil público (/[slug])
├── lista-vagas.html          # Portal de Vagas — listagem
├── cadastro-vaga.html         # Portal de Vagas — cadastro
├── exportacao-instagram.html  # Portal de Vagas — card p/ Instagram
├── vercel.json                 # Configuração Vercel
├── database.rules.json         # Regras de segurança do Realtime Database
├── storage.rules               # Regras de segurança do Storage
├── css/style.css                # Estilos (todo o projeto)
├── js/
│   ├── config.js                # Configurações (credenciais Firebase)
│   ├── firebase.js               # Inicialização do Firebase (Auth + Database)
│   ├── api.js                    # Cliente de dados — perfil de aluno (usuario_aluno)
│   ├── api-empresa.js             # Cliente de dados — perfil de empresa (usuario_empresa)
│   ├── auth.js                    # Autenticação Firebase + modo demo
│   ├── dashboard.js                # Lógica do editor de currículo
│   ├── cadastro-empresa.js          # Lógica da página de cadastro de empresa
│   ├── export.js                     # Exportação PDF/DOCX
│   ├── public-profile.js              # Perfil público
│   ├── telefone-mask.js                # Máscara de telefone reutilizável
│   ├── cadastro-vaga.js                 # Portal de Vagas — cadastro
│   ├── lista-vagas.js                    # Portal de Vagas — listagem
│   └── exportacao-instagram.js            # Portal de Vagas — card p/ Instagram
```

## 📝 Licença

MIT
