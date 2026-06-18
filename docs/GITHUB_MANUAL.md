# SIGMAN v2.0 — Manual: Subir no GitHub

## Pré-requisitos

- [Git](https://git-scm.com/download/win) instalado
- Conta no GitHub: [github.com](https://github.com)
- VS Code (recomendado, mas opcional)

---

## Passo 1 — Organizar a pasta local

A estrutura final do projeto deve ser:

```
sigman-v2/
├── .gitignore
├── .env.example
├── docker-compose.yml
├── database/
│   ├── schema.sql
│   └── seed.sql          ← criar vazio por enquanto
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/              ← criar pasta vazia com .gitkeep
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   ├── main.js
│   │   ├── auth.js
│   │   ├── nav.js
│   │   ├── router.js
│   │   ├── api.js
│   │   ├── utils.js
│   │   └── pages/
│   │       ├── os-executadas.js
│   │       ├── dashboard.js
│   │       └── ... (demais stubs)
│   └── mock/
│       └── db.js
└── docs/
    └── GITHUB_MANUAL.md   ← este arquivo
```

---

## Passo 2 — Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Preencha:
   - **Repository name:** `sigman-v2`
   - **Description:** `SIGMAN Enterprise v2.0 — PCM/OEE/TPM · Muffato Foods`
   - **Visibility:** `Private` ← importante, contém dados da fábrica
3. **NÃO** marque "Add a README file"
4. Clique em **Create repository**
5. Copie a URL que aparecer, ex: `https://github.com/Britici/sigman-v2.git`

---

## Passo 3 — Inicializar Git na pasta local

Abra o terminal (PowerShell ou CMD) **dentro da pasta `sigman-v2`**:

```bash
# Entra na pasta do projeto
cd C:\caminho\para\sigman-v2

# Inicializa o repositório Git
git init

# Configura seu nome e email (só na primeira vez)
git config --global user.name "Tiago Britici"
git config --global user.email "seu@email.com"

# Conecta ao repositório remoto que você criou
git remote add origin https://github.com/Britici/sigman-v2.git
```

---

## Passo 4 — Criar o .gitignore

Crie o arquivo `.gitignore` na raiz do projeto com o conteúdo abaixo.
**Esse passo é crítico** — impede que senhas e dados sensíveis sejam enviados.

```
# Ambiente — NUNCA commitar
.env
*.env.local

# Node
node_modules/
npm-debug.log*

# Volumes Docker
pgdata/
pgadmin_data/

# Sistema operacional
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json
.idea/
```

---

## Passo 5 — Primeiro commit e push

```bash
# Adiciona todos os arquivos ao staging
git add .

# Verifica o que será commitado (opcional, mas recomendado)
git status

# Cria o primeiro commit
git commit -m "feat: estrutura inicial SIGMAN v2.0 — shell frontend + schema DB"

# Envia para o GitHub
git push -u origin main
```

Se aparecer erro `src refspec main does not match`, troque `main` por `master`:
```bash
git push -u origin master
```

---

## Passo 6 — Verificar no GitHub

1. Acesse `https://github.com/Britici/sigman-v2`
2. Confirme que todos os arquivos aparecem
3. Verifique que `.env` **não aparece** na listagem — se aparecer, você esqueceu o `.gitignore`

---

## Fluxo de trabalho diário

```bash
# Antes de começar a trabalhar — pega atualizações
git pull

# Depois de modificar arquivos — envia as mudanças
git add .
git commit -m "feat: implementa página OS Abertura"
git push
```

### Padrão de mensagens de commit

| Prefixo | Quando usar |
|---------|-------------|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `style:` | Mudança visual sem lógica |
| `refactor:` | Reescrita sem mudar comportamento |
| `docs:` | Documentação |
| `chore:` | Configuração, .gitignore, package.json |

---

## Usar o VS Code para Git (alternativa visual)

Se preferir interface gráfica ao terminal:

1. Abra a pasta `sigman-v2` no VS Code
2. Clique no ícone de **Source Control** (Ctrl+Shift+G)
3. O VS Code detecta o repositório automaticamente
4. Para commitar: escreva a mensagem no campo e clique ✓
5. Para push: clique nos `...` → Push

---

## Verificação final — checklist

- [ ] Repositório criado como **privado** no GitHub
- [ ] `.gitignore` criado antes do primeiro commit
- [ ] `.env` **não** aparece no GitHub
- [ ] `schema.sql` aparece em `database/`
- [ ] `index.html` aparece em `frontend/`
- [ ] Todos os arquivos JS aparecem em `frontend/js/`

---

## Próximos passos após o push

Com o projeto no GitHub, as próximas sessões podem:

1. **Implementar páginas restantes** — `dashboard.js`, `os-abertura.js`, `solicitacao.js`, etc.
2. **Conectar ao Google Sheets** — trocar `MODE='mock'` para `MODE='sheets'` em `api.js`
3. **Quando Docker liberar** — trocar para `MODE='rest'` e conectar ao backend Express

---

## Acesso para Live Server (desenvolvimento)

No VS Code, instale a extensão **Live Server** (ritwickdey.liveserver).
Clique com o botão direito em `frontend/index.html` → **Open with Live Server**.

Login disponível para teste: `tiago` / `tiago123`
