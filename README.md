# Ponto Auto Msg

Monorepo com:

- `backend/`: API em Node.js + TypeScript + Express + SQLite
- `frontend/`: painel React + Vite + shadcn/ui para sessao, agenda, listas, envio e historico

## Requisitos

- Node.js 20+
- npm 10+

## Setup local

O fluxo recomendado neste ambiente e:

```bash
bash scripts/setup-codex-env.sh
```

Ou, manualmente:

```bash
npm install
npm run build --workspace backend
npm run build --workspace frontend
```

Para desenvolvimento:

```bash
npm run dev:backend
npm run dev:frontend
```

- Backend local: `http://localhost:3001`
- Frontend local: `http://localhost:5173`

## Autenticacao do backend

O backend agora possui autenticacao simples por email e password com:

- senha protegida por hash com `scrypt`
- token JWT para sessao
- persistencia de usuarios no SQLite atual

Variaveis de ambiente suportadas no backend:

```bash
JWT_SECRET=change-this-secret-in-production
JWT_EXPIRES_IN=7d
```

Exemplo de endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Payload de cadastro/login:

```json
{
  "email": "admin@exemplo.com",
  "password": "minha-senha-segura"
}
```

O endpoint `GET /auth/me` espera `Authorization: Bearer <token>`.


## Deploy do backend na Vercel

O backend agora inclui `backend/vercel.json` e um entrypoint serverless em `backend/api/index.ts`.

### Como configurar no painel da Vercel

1. Importe este repositorio na Vercel (ou use o projeto ja criado).
2. Defina **Root Directory = `backend`**.
3. Framework preset: **Other**.
4. Build Command: `npm run build`.
5. Install Command: `npm install`.
6. Nao defina Output Directory (funcoes serverless nao usam `dist` publico).
7. Runtime da funcao: `nodejs22.x` (configure manualmente no painel da Vercel, se necessario).

### Variaveis de ambiente minimas

No projeto do backend na Vercel, configure:

```bash
JWT_SECRET=troque-por-um-valor-forte
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://seu-frontend.vercel.app
```

Se tiver ambiente Preview e Production com URLs diferentes, inclua ambas separadas por virgula em `CORS_ORIGINS`.

### Por que o build/deploy costuma falhar

1. **Node desatualizado**: este backend usa `node:sqlite`, que requer Node 22+.
2. **Root Directory incorreto**: se ficar na raiz do monorepo, a Vercel tenta pipeline diferente do backend.
3. **Tentativa de `app.listen` em serverless**: na Vercel a aplicacao precisa exportar o app, sem abrir porta manualmente.

### Limites importantes na Vercel para este backend

Este projeto tem partes **stateful** (`.data/messages.sqlite` e sessao do WhatsApp em `.baileys_auth`). Em Serverless, o filesystem e efemero e multiplas invocacoes podem acontecer em instancias diferentes.

Na pratica:
- endpoints stateless (health, auth, CRUD simples) tendem a funcionar melhor;
- sessao persistente do WhatsApp e SQLite local podem ficar instaveis na Vercel.

Para operacao estavel de producao, prefira hospedar o backend em ambiente com processo persistente e disco duravel (ex.: Railway, Render, Fly.io, VPS).

## Deploy do frontend na Vercel

O frontend esta preparado para ser publicado como um projeto separado da Vercel usando `Root Directory = frontend`.

### Configuracao recomendada

1. Importe este repositorio na Vercel.
2. Em `Root Directory`, selecione `frontend`.
3. Confirme que o comando de build esta como `npm run build`.
4. Confirme que o output esta como `dist`.
5. Adicione a variavel de ambiente `VITE_API_BASE_URL` apontando para a URL publica do backend.

Exemplo:

```bash
VITE_API_BASE_URL=https://api.seu-dominio.com
```

Se o backend estiver publicado em um prefixo, como `/api`, inclua esse trecho na variavel:

```bash
VITE_API_BASE_URL=https://seu-dominio.com/api
```

O arquivo `frontend/vercel.json` ja inclui o rewrite de SPA para que rotas do `react-router-dom` funcionem em refresh e acesso direto.

### Observacoes importantes

- Em desenvolvimento, o frontend continua usando `/api` com proxy do Vite para `http://localhost:3001`.
- Em producao, o frontend usa `VITE_API_BASE_URL` tanto em Preview quanto em Production.
- Um arquivo de exemplo foi adicionado em `frontend/.env.example`.

## Scripts uteis

Na raiz:

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`

No backend:

- `npm run dev`
- `npm run build`
- `npm run start`

No frontend:

- `npm run dev`
- `npm run build`
- `npm run preview`
