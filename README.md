# 🎓 TalentoUNICAP

Plataforma de empregabilidade desenvolvida para a **Universidade Católica de Pernambuco (UNICAP)**, com o objetivo de conectar estudantes e empresas em um único ambiente digital.

O **TalentoUNICAP** permite que alunos criem e gerenciem seus currículos profissionais, apresentem suas experiências, habilidades, projetos e certificações, além de visualizarem oportunidades e receberem mensagens de empresas.

Para as empresas, a plataforma oferece recursos para criação de perfil, busca de talentos, publicação de vagas e comunicação direta com estudantes.

---

## ✨ Funcionalidades

### 👨‍🎓 Para alunos

* Cadastro e autenticação por e-mail.
* Confirmação de e-mail.
* Reenvio de confirmação de cadastro.
* Recuperação e redefinição de senha.
* Criação e edição de perfil profissional.
* Cadastro de formação acadêmica.
* Cadastro de experiências profissionais.
* Cadastro de habilidades.
* Cadastro de projetos.
* Cadastro de certificações.
* Upload de comprovantes.
* Controle de disponibilidade para estágio.
* Controle de visibilidade do perfil.
* Visualização do currículo.
* Exportação do currículo em **PDF**.
* Exportação do currículo em **DOCX**.
* Importação do currículo a partir do **LinkedIn** (arquivo oficial de dados, com revisão antes de salvar).
* Perfil público.
* Visualização de vagas.
* Recebimento de mensagens de empresas.
* Visualização das mensagens recebidas.

### 🏢 Para empresas

* Cadastro de empresa.
* Autenticação por e-mail.
* Autenticação por **CNPJ**.
* Perfil empresarial.
* Upload de foto de perfil.
* Busca de alunos e talentos.
* Visualização de currículos.
* Publicação de vagas.
* Cadastro de requisitos e habilidades para vagas.
* Listagem das próprias vagas.
* Gerenciamento de vagas.
* Encerramento de vagas.
* Busca de candidatos compatíveis.
* Envio de mensagens para alunos.
* Caixa de saída para acompanhamento das mensagens enviadas.

---

# 🛠️ Tecnologias utilizadas

| Camada             | Tecnologia               |
| ------------------ | ------------------------ |
| Front-end          | HTML5, CSS3 e JavaScript |
| Autenticação       | Supabase Auth            |
| Banco de dados     | Supabase PostgreSQL      |
| Controle de acesso | Row Level Security (RLS) |
| Armazenamento      | Supabase Storage         |
| Backend serverless | Supabase Edge Functions  |
| Exportação PDF     | jsPDF + html2canvas      |
| Exportação DOCX    | docx + FileSaver         |
| Importação LinkedIn| JSZip (leitura do ZIP)   |
| API externa        | IBGE                     |
| Deploy             | Vercel                   |

### Arquitetura atual

A arquitetura atual do projeto utiliza o **Supabase como plataforma de backend**, sendo responsável pelos principais serviços de:

* Autenticação;
* Banco de dados PostgreSQL;
* Controle de acesso com RLS;
* Armazenamento de arquivos;
* Edge Functions.

O front-end é uma aplicação web estática desenvolvida com **HTML, CSS e JavaScript**, consumindo diretamente os serviços do Supabase.

> **Importante:** versões anteriores do projeto utilizaram uma API REST em Spring Boot. Porém, a implementação atual deste repositório utiliza Supabase como backend principal.

---

# 🔗 Importação de dados do LinkedIn

O LinkedIn **não possui API pública** para ler experiências, formação e habilidades de um perfil, e fazer
*scraping* viola os termos de uso. Por isso a importação usa o arquivo oficial **"Obter uma cópia dos seus dados"**
(ZIP com CSVs), que o próprio aluno baixa em
[linkedin.com/mypreferences/d/download-my-data](https://www.linkedin.com/mypreferences/d/download-my-data).

O arquivo é lido **inteiramente no navegador** (nada é enviado ao LinkedIn nem a terceiros). O aluno revisa o que
será importado e só o que estiver marcado é gravado, pelos mesmos recursos de `aluno-service.js` usados nas telas manuais.

| Arquivo do LinkedIn | Vai para |
| ------------------- | -------- |
| `Profile.csv` | Sobre mim (resumo, ou título profissional se não houver resumo), endereço, cidade/estado, GitHub e portfólio (campo *Websites*) |
| `PhoneNumbers.csv` | Telefone (prefere celular brasileiro) |
| `Positions.csv` | Experiências (sem data de término = trabalho atual) |
| `Education.csv` | Formação; curso e período do cabeçalho (período **estimado** pela data de início) |
| `Skills.csv` / `Languages.csv` | Habilidades (Técnica, Soft Skill ou Ferramenta) e Idiomas (com nível) |
| `Projects.csv` | Projetos (com término = Concluído) |
| `Certifications.csv` | Certificações (certificação sem data de emissão não é importada, pois o campo é obrigatório) |

Regras: campos já preenchidos **não** são sobrescritos por padrão; itens já cadastrados são ignorados
(deduplicação); textos são limpos de HTML e limitados aos tamanhos definidos em `RegraNgocios`; URLs só são aceitas com
`http(s)`. O arquivo do LinkedIn não traz o endereço do perfil, então o link vem de um campo opcional no modal.

Arquivos: `js/services/linkedin-import-service.js` (leitura, conversão, plano e gravação, sem dependência de DOM),
`js/pages/linkedin-import.js` (modal) e a biblioteca JSZip (CDN com SRI) em `dashboard.html`.

---

# 🔐 Autenticação

A autenticação da aplicação é realizada através do **Supabase Auth**.

## Alunos

Os alunos realizam login utilizando:

* E-mail;
* Senha.

O cadastro utiliza confirmação de e-mail quando essa opção está habilitada no projeto Supabase.

## Empresas

As empresas podem realizar login utilizando:

* E-mail + senha;
* CNPJ + senha.

No login utilizando CNPJ, o front-end chama a Edge Function:

```text
login-empresa-cnpj
```

Essa função realiza a validação necessária e retorna uma sessão válida do Supabase.

Dessa forma, o e-mail interno da empresa não precisa ser exposto ao navegador durante o login por CNPJ.

---

# 📧 Confirmação de e-mail

Quando a confirmação de e-mail está habilitada no Supabase, o fluxo funciona da seguinte maneira:

```text
Cadastro
   ↓
Supabase Auth
   ↓
E-mail de confirmação
   ↓
confirmacao-email.html
   ↓
Conta confirmada
   ↓
Login
```

O projeto possui páginas específicas para os fluxos de autenticação:

```text
confirmacao-email.html
recuperar-senha.html
redefinir-senha.html
```

As URLs de redirecionamento são construídas utilizando:

```javascript
window.location.origin
```

Isso permite que o mesmo código funcione em ambiente local, Vercel ou domínio próprio, desde que as URLs estejam configuradas corretamente no Supabase.

---

# 🗄️ Banco de dados

O projeto utiliza **PostgreSQL através do Supabase**.

Entre as principais entidades utilizadas pela aplicação estão:

* `usuarios`
* `perfis_aluno`
* `perfis_empresa`
* `experiencias`
* `habilidades`
* `formacoes`
* `projetos`
* `certificacoes`
* `comprovantes`
* `vagas`
* `vaga_habilidades`
* `mensagens`

O projeto também possui migrations SQL versionadas em:

```text
supabase/migrations/
```

Essas migrations permitem versionar alterações estruturais e regras importantes do banco de dados.

---

# 🔒 Segurança

A aplicação utiliza os mecanismos de segurança fornecidos pelo Supabase.

Entre eles:

* **Supabase Auth** para autenticação;
* **Row Level Security (RLS)** para controle de acesso aos dados;
* Sessões autenticadas;
* Políticas de acesso no PostgreSQL;
* Edge Functions para operações que não devem ser executadas diretamente pelo navegador.

## Chaves e credenciais

O front-end utiliza somente a chave pública do Supabase.

**Nunca devem ser colocadas no código do front-end:**

```text
service_role
```

ou qualquer outra chave secreta/administrativa.

Credenciais administrativas utilizadas por Edge Functions devem permanecer nos **Secrets do Supabase**.

---

# 📦 Supabase Storage

O Supabase Storage é utilizado para armazenamento de arquivos relacionados aos usuários.

Entre os arquivos utilizados pela plataforma estão:

* Fotos de perfil;
* Comprovantes enviados pelos alunos.

O acesso aos arquivos deve respeitar as políticas configuradas no Supabase.

---

# ⚡ Edge Functions

O projeto utiliza Edge Functions do Supabase para operações que precisam ser executadas no ambiente server-side.

Atualmente existe a função:

```text
supabase/functions/login-empresa-cnpj/
```

## `login-empresa-cnpj`

Responsável pelo fluxo de autenticação de empresas utilizando CNPJ.

Fluxo:

```text
Empresa
   ↓
CNPJ + senha
   ↓
Front-end
   ↓
Edge Function
   ↓
Validação da empresa
   ↓
Sessão Supabase
   ↓
Front-end autenticado
```

As credenciais administrativas necessárias para essa operação devem permanecer nos **Secrets do Supabase**.

---

# 📁 Estrutura do projeto

```text
Talentos_Unicap/
│
├── index.html
├── login.html
├── register.html
├── cadastro-empresa.html
│
├── dashboard.html
├── preview.html
├── public.html
├── curriculo-empresa.html
│
├── busca-talentos.html
├── cadastro-vaga.html
├── lista-vagas.html
│
├── caixa-entrada-aluno.html
├── caixa-saida-empresa.html
│
├── confirmacao-email.html
├── recuperar-senha.html
├── redefinir-senha.html
│
├── exportacao-instagram.html
│
├── css/
│   └── style.css
│
├── js/
│   │
│   ├── config/
│   │   ├── config.js
│   │   └── supabase-client.js
│   │
│   ├── security/
│   │   ├── auth.js
│   │   └── http.js
│   │
│   ├── services/
│   │   ├── aluno-service.js
│   │   ├── empresa-service.js
│   │   ├── mensagem-service.js
│   │   └── export-service.js
│   │
│   ├── pages/
│   │   ├── dashboard.js
│   │   ├── busca-talentos.js
│   │   ├── cadastro-empresa.js
│   │   ├── cadastro-vaga.js
│   │   ├── lista-vagas.js
│   │   ├── caixa-entrada-aluno.js
│   │   ├── caixa-saida-empresa.js
│   │   ├── mensagens-painel-aluno.js
│   │   ├── curriculo-empresa.js
│   │   ├── public-profile.js
│   │   └── exportacao-instagram.js
│   │
│   └── utils/
│       ├── mascaras.js
│       ├── cursos.js
│       ├── cidades.js
│       └── mobile-nav.js
│
├── supabase/
│   │
│   ├── functions/
│   │   └── login-empresa-cnpj/
│   │       ├── index.ts
│   │       └── deno.json
│   │
│   └── migrations/
│       ├── 001_experiencias_habilidades.sql
│       ├── 002_perfis_aluno_curso_periodo_endereco.sql
│       └── 003_vagas_somente_empresas_criam.sql
│
├── apps-script/
│   └── Code.gs
│
├── img/
│
├── vercel.json
└── README.md
```

---

# 🧩 Organização do JavaScript

O JavaScript do projeto é dividido por responsabilidade.

## `config/`

Responsável pelas configurações gerais da aplicação.

Exemplos:

* URL do Supabase;
* Chave pública do Supabase;
* Estados brasileiros;
* Cursos;
* Especializações;
* Mestrados;
* Doutorados;
* Categorias de habilidades.

---

## `security/`

Responsável principalmente pela autenticação e gerenciamento de sessão.

O arquivo:

```text
js/security/auth.js
```

concentra funcionalidades como:

* Cadastro de alunos;
* Cadastro de empresas;
* Login;
* Login por CNPJ;
* Logout;
* Confirmação de e-mail;
* Reenvio de confirmação;
* Recuperação de senha;
* Redefinição de senha;
* Identificação do tipo de conta;
* Gerenciamento da sessão.

---

## `services/`

Contém os serviços responsáveis pelas operações de dados e funcionalidades específicas.

Principais serviços:

```text
aluno-service.js
empresa-service.js
mensagem-service.js
export-service.js
```

---

## `pages/`

Contém a lógica específica de cada página da aplicação.

Exemplos:

```text
dashboard.js
busca-talentos.js
cadastro-vaga.js
lista-vagas.js
caixa-entrada-aluno.js
caixa-saida-empresa.js
```

---

## `utils/`

Contém funções auxiliares reutilizáveis.

Exemplos:

* Máscaras de telefone e CNPJ;
* Lista de cursos;
* Busca de cidades;
* Navegação mobile.

---

# 📄 Exportação de currículo

O TalentoUNICAP permite que o aluno exporte seu currículo diretamente pela plataforma.

## PDF

A geração do PDF utiliza:

* **html2canvas**
* **jsPDF**

O currículo é renderizado no navegador e convertido em PDF.

## DOCX

A geração do documento utiliza:

* **docx**
* **FileSaver**

O currículo pode incluir:

* Informações pessoais;
* Formação acadêmica;
* Experiência profissional;
* Habilidades;
* Projetos;
* Certificações;
* Links profissionais.

---

# 🌎 API do IBGE

A aplicação utiliza dados do **IBGE** para auxiliar na seleção de cidades e estados brasileiros.

Essa funcionalidade está relacionada ao arquivo:

```text
js/utils/cidades.js
```

---

# 🚀 Como executar localmente

## 1. Clonar o repositório

```bash
git clone https://github.com/CombogoOrganizacao/Talentos_Unicap.git
cd Talentos_Unicap
```

## 2. Executar um servidor HTTP local

Como o projeto é composto por HTML, CSS e JavaScript, não existe uma etapa tradicional de build.

Pode ser utilizado, por exemplo:

* Live Server;
* `npx serve`;
* outro servidor HTTP estático.

Com `npx`:

```bash
npx serve .
```

Também é possível utilizar o Live Server do VS Code.

> Recomenda-se não abrir os arquivos diretamente utilizando `file://`, pois determinados recursos do navegador podem bloquear requisições e módulos utilizados pela aplicação.

---

# ☁️ Configuração do Supabase

O projeto utiliza as configurações presentes em:

```text
js/config/config.js
```

e inicializa o cliente através de:

```text
js/config/supabase-client.js
```

O projeto precisa estar configurado com:

* Supabase Auth;
* PostgreSQL;
* RLS;
* Storage;
* Migrations;
* Edge Function `login-empresa-cnpj`.

---

# 🌐 Deploy

O projeto possui configuração para deploy na **Vercel** através do arquivo:

```text
vercel.json
```

Depois de realizar o deploy, é necessário configurar no Supabase as URLs utilizadas pela aplicação.

Em:

```text
Authentication
    ↓
URL Configuration
```

configure:

* Site URL;
* URLs de redirecionamento;
* URL de confirmação de e-mail;
* URL de recuperação de senha.

Por exemplo:

```text
https://SEU-DOMINIO/confirmacao-email.html
https://SEU-DOMINIO/redefinir-senha.html
```

Substitua `SEU-DOMINIO` pelo domínio utilizado pela aplicação.

---

# 🔄 Fluxo geral da aplicação

```text
                         ┌─────────────────────┐
                         │       Usuário       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     Front-end       │
                         │ HTML / CSS / JS     │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
     ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
     │ Supabase Auth  │    │   PostgreSQL   │    │    Storage     │
     │                │    │                │    │                │
     │ Login          │    │ Perfis         │    │ Fotos          │
     │ Cadastro       │    │ Currículos     │    │ Comprovantes   │
     │ Sessões        │    │ Vagas          │    │                │
     └────────────────┘    │ Mensagens      │    └────────────────┘
                           └────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Edge Functions    │
                         │                     │
                         │ Login por CNPJ      │
                         └─────────────────────┘
```

---

# 📌 Estado atual do projeto

O projeto atualmente possui integração com o **Supabase** nos principais fluxos da aplicação.

Entre eles:

* Autenticação;
* Cadastro de usuários;
* Cadastro de empresas;
* Login por e-mail;
* Login empresarial por CNPJ;
* Perfis de alunos;
* Perfis de empresas;
* Currículos;
* Formação acadêmica;
* Experiências;
* Habilidades;
* Projetos;
* Certificações;
* Vagas;
* Mensagens;
* Storage;
* Exportação de currículo.

A arquitetura atual deste repositório está baseada em:

```text
HTML + CSS + JavaScript
            │
            ▼
         Supabase
       ┌────┼────┐
       │    │    │
      Auth  DB  Storage
             │
             ▼
            RLS
             │
             ▼
       Edge Functions
```

---

# 🎯 Objetivo do projeto

O TalentoUNICAP tem como objetivo aproximar estudantes e empresas, facilitando a entrada dos alunos no mercado de trabalho e tornando o processo de descoberta de talentos mais eficiente para as empresas.

A plataforma busca centralizar:

* Currículos;
* Formação acadêmica;
* Experiências;
* Habilidades;
* Projetos;
* Certificações;
* Vagas;
* Comunicação entre alunos e empresas.

Dessa forma, o sistema funciona como uma ponte entre a **formação acadêmica da UNICAP** e o **mercado de trabalho**.

---

# 👨‍💻 Projeto

**TalentoUNICAP**

**Universidade Católica de Pernambuco — UNICAP**

Desenvolvido pela **Combogó** como projeto acadêmico voltado à integração entre estudantes e empresas.

### Desenvolvedores

* **Marcelo Rocha**
* **Kauã Lucas**

---

# 📄 Licença

Este projeto está disponível sob a licença **MIT**.
