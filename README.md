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
