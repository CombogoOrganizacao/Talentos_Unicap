# 🎓 TalentoUNICAP

Plataforma para alunos da **Universidade Católica de Pernambuco** criarem,
gerenciarem e exportarem currículos profissionais, e para empresas
buscarem talentos e publicarem vagas.

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | HTML/CSS/JS puro (sem build step) |
| Back-end | Spring Boot (Java) + JWT + JPA/PostgreSQL — repositório `BackendTalentos` |
| Armazenamento de arquivos | Cloudflare R2 (fotos de perfil, comprovantes) |
| Exportação de currículo | jsPDF + html2canvas (PDF), docx + file-saver (DOCX) |

O front consome a API REST do backend em `CONFIG.apiBaseUrl`
(`js/config/config.js`) usando JWT — não depende mais de Firebase.

## 🚀 Como rodar localmente

1. Suba o backend (`./mvnw spring-boot:run`, com o `.env` configurado) —
   por padrão em `http://localhost:8080`.
2. Confira em `SecurityConfig.corsConfigurationSource()` (no backend) se a
   origem do seu servidor de front (ex. porta do Live Server) está
   liberada no CORS.
3. Se o backend não estiver em `localhost:8080`, ajuste
   `CONFIG.apiBaseUrl` em `js/config/config.js`.
4. Abra `index.html` num servidor estático (Live Server, `npx serve`, etc.
   — não abra o arquivo direto com `file://`, senão o `fetch` para a API
   é bloqueado pelo navegador).

Conta de teste (criada automaticamente pelo `DataLoader` do backend
quando o banco está vazio): `kaualucasds21@gmail.com` / `1234567890`
(aluno).

> **Status da integração:** nem toda tela já fala com o backend real —
> veja `RELATORIO_INTEGRACAO.md` para o mapeamento completo do que está
> pronto e do que ainda depende de trabalho no front e/ou no back.

## 📁 Estrutura

O front-end é organizado em camadas, no mesmo espírito dos pacotes do
backend (`Config`, `Security`, `Service`, `Util`):

```
├── index.html                    # Landing page (alunos)
├── login.html                     # Login (aluno ou empresa)
├── register.html                   # Cadastro de aluno
├── cadastro-empresa.html            # Cadastro de empresa
├── busca-talentos.html              # Painel da empresa — busca de talentos
├── caixa-saida-empresa.html         # Painel da empresa — mensagens enviadas
├── caixa-entrada-aluno.html          # Painel do aluno — mensagens recebidas
├── dashboard.html                     # Editor de currículo (aluno)
├── preview.html                        # Preview + exportação PDF/DOCX
├── curriculo-empresa.html               # Visualização do currículo por uma empresa
├── public.html                           # Perfil público
├── lista-vagas.html                       # Portal de Vagas — listagem
├── cadastro-vaga.html                      # Portal de Vagas — cadastro
├── exportacao-instagram.html                # Portal de Vagas — card p/ Instagram
├── css/style.css                             # Estilos (todo o projeto)
├── js/
│   ├── config/
│   │   └── config.js                # Dados estáticos (URL da API, estados, cursos por grau...)
│   ├── security/                     # equivalente ao pacote Security/ do backend
│   │   ├── http.js                    # Cliente fetch central: anexa o JWT, trata erros da API
│   │   └── auth.js                     # Login/cadastro/logout, sessão do usuário
│   ├── services/                      # clientes da API REST (o que cada Controller do backend expõe)
│   │   ├── aluno-service.js            # Perfil, formações, projetos, certificações, currículo
│   │   ├── empresa-service.js           # Perfil da empresa, vagas, busca de alunos
│   │   ├── mensagem-service.js           # Mensagens empresa <-> aluno
│   │   └── export-service.js              # Renderização e exportação do currículo (PDF/DOCX)
│   ├── utils/                          # helpers puros, sem dependência de tela ou de API
│   │   ├── mascaras.js                  # Máscaras de telefone e CNPJ
│   │   ├── cursos.js                     # Dropdown de curso por grau acadêmico
│   │   └── cidades.js                     # Busca de cidades por estado (API do IBGE)
│   └── pages/                          # lógica específica de cada tela (equivalente a "controllers" de UI)
│       ├── dashboard.js
│       ├── busca-talentos.js
│       ├── cadastro-empresa.js
│       ├── cadastro-vaga.js
│       ├── lista-vagas.js
│       ├── caixa-entrada-aluno.js
│       ├── caixa-saida-empresa.js
│       ├── curriculo-empresa.js
│       ├── mensagens-painel-aluno.js
│       ├── public-profile.js
│       └── exportacao-instagram.js
```

Regra geral de dependência (de baixo para cima, sem ciclos):
`config` → `security`/`utils` → `services` → `pages`. Cada página HTML só
carrega, na ordem, o `config`, depois `security`, os `services` que usa, e
por fim o seu `js/pages/*.js`.

## 📝 Licença

MIT


## Supabase

O frontend usa Supabase Auth, PostgreSQL/RLS e Storage. As credenciais públicas ficam em `js/config/config.js`; a chave `service_role` nunca deve ser colocada no frontend.

## Configuração de autenticação para produção (Supabase)

Antes de publicar a aplicação em produção:

1. No Supabase, mantenha **Authentication → Providers → Email → Confirm Email** ativado.
2. Configure um SMTP próprio para envio dos e-mails de confirmação e recuperação de senha.
3. Em **Authentication → URL Configuration**, configure o domínio oficial do TalentoUNICAP como **Site URL** e adicione as URLs de confirmação/recuperação usadas pelo site, por exemplo:
   - `https://SEU-DOMINIO/confirmacao-email.html`
   - `https://SEU-DOMINIO/redefinir-senha.html`
4. Nunca coloque uma chave `service_role`/secret no JavaScript do frontend. O frontend deve usar apenas a chave pública/publishable do Supabase.
5. O fluxo de cadastro agora envia o usuário para `confirmacao-email.html` quando a confirmação de e-mail estiver ativa.
6. O login trata `Email not confirmed` com uma mensagem amigável e oferece o reenvio da confirmação.
7. A recuperação de senha usa `recuperar-senha.html` e `redefinir-senha.html`.
8. O cadastro de empresa não tenta gravar `perfis_empresa` pelo frontend antes da confirmação. O trigger do banco continua responsável por criar `usuarios` e `perfis_empresa`.

> Substitua `SEU-DOMINIO` pelo domínio final usado no deploy. O JavaScript usa `window.location.origin`, então funciona tanto na URL da Vercel quanto depois da troca para um domínio próprio, desde que as URLs correspondentes estejam liberadas no Supabase.
