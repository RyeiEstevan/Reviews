# Reviews Platform

Plataforma de compartilhamento de reviews de entretenimento (filmes, livros, séries, animes).
Inspirada em: Skoob, Filmow, Letterboxd, MyAnimeList, Banco de Séries, Goodreads.

## Features

| Feature | Funcionalidades |
| --- | --- |
| Usuário comum | Cadastro e manutenção de Usuários; Listas de lidos/assistidos/abandonados; Amigos/seguidores; Histórico de reviews; Recuperação de conta |
| Usuário Administrador | Criar, remover, editar usuários; Cadastrar artistas/autores; Criar notícias |
| Fórum | Criar posts; Comentar em posts; Categorizar/buscar posts por tópico |
| Conteúdo | Mostrar reviews e notas; Cadastro de conteúdo; Manutenção de reviews |
| Análise de tendências | Página inicial/Feed; Em alta; Mais vistos; Mais bem avaliados; Buscas com filtros |

## Equipe

Feature Usuário Administrador: Gabriel Nogueira de Moura Pereira.

---

## Stack

- **Backend:** FastAPI (Python 3.12) + MongoDB Atlas (Motor/Beanie)
- **Frontend:** Next.js 15 (App Router) + TypeScript
- **Testes:** pytest-bdd, pytest-asyncio, mongomock-motor, Cypress

---

## Como rodar

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose
- Arquivo `.env` na raiz do projeto (copie o exemplo abaixo)

```env
# .env
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/reviews
JWT_SECRET=your-secret-here
```

### Subir tudo com Docker (backend + frontend)

```bash
docker compose up --build
```

| Serviço   | URL                   |
|-----------|-----------------------|
| Frontend  | http://localhost:3000 |
| Backend   | http://localhost:8000 |
| API Docs  | http://localhost:8000/docs |

Para parar:

```bash
docker compose down
```

### Rodar apenas o backend

```bash
docker compose up --build api
```

### Rodar apenas o frontend (sem Docker)

```bash
cd frontend
npm install
npm run dev
# acessa http://localhost:3000
```

O frontend espera o backend em `http://localhost:8000` por padrão.
Para sobrescrever, crie `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Como rodar os testes

### Testes de backend (BDD + unitários)

Não precisam de banco de dados real — usam mongomock em memória.

```bash
# Criar ambiente virtual (primeira vez)
python3 -m venv .venv
pip install -r requirements.txt   # ou: .venv/bin/pip install -r requirements.txt

# Todos os testes
.venv/bin/pytest

# Arquivo específico
.venv/bin/pytest tests/step_defs/test_LandingPage.py -v

# Apenas testes unitários
.venv/bin/pytest tests/unit/ -v

# Pular testes que precisam de MongoDB real
.venv/bin/pytest -m "not real_mongo"
```

### Testes de integração com MongoDB real

```bash
docker compose --profile test up -d mongo-test
pytest tests/real_mongo/ -v
```

### Testes E2E com Cypress (frontend)

Requer o backend rodando em `:8000` e o frontend em `:3000`.

```bash
# Subir serviços
docker compose up -d

# Cypress modo interativo
cd frontend
npm run cypress:open

# Cypress headless (CI)
npm run cypress:run
```

---

## Estrutura do projeto

```
.
├── app/                  # Backend FastAPI
│   ├── main.py
│   ├── core/             # Config, segurança (JWT)
│   ├── db/               # Motor/Beanie models, init_db
│   ├── routers/          # Um arquivo por feature
│   ├── services/         # Lógica de negócio
│   └── schemas/          # Pydantic request/response
├── features/             # Arquivos .feature (Gherkin/BDD)
├── tests/
│   ├── conftest.py       # Fixtures compartilhadas (loop, db, client)
│   └── step_defs/        # Implementações dos steps BDD
├── frontend/             # Next.js App Router
│   ├── app/              # Páginas (home, admin, login)
│   ├── lib/              # api.ts (gateway tipado), auth.ts
│   ├── components/       # UI primitives
│   └── cypress/e2e/      # Specs E2E
├── Dockerfile            # Imagem do backend
├── frontend/Dockerfile   # Imagem do frontend
└── docker-compose.yml    # Backend + Frontend + mongo-test (profile)
```
