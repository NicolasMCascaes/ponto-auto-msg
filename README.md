# Ponto Auto Msg - MVP Inicial

Este repositório segue o escopo do `MVP.md` e contém a estrutura inicial de um monorepo para envio de mensagens internas com Baileys.

## Estrutura

- `backend/`: API em Node.js + TypeScript + Express
- `frontend/`: aplicação React + Vite + TypeScript
- `MVP.md`: definição de stack, funcionalidades do MVP e fora de escopo

## Pré-requisitos

- Node.js 20+
- npm 10+

## Como rodar

1. Instale as dependências na raiz:

```bash
npm install
```

2. Em um terminal, rode o backend:

```bash
npm run dev:backend
```

3. Em outro terminal, rode o frontend:

```bash
npm run dev:frontend
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

## Rotas do backend

- `GET /health`: verificação de saúde da API.
- `POST /whatsapp/connect`: inicia a conexão da sessão WhatsApp via Baileys.
- `GET /whatsapp/status`: consulta o estado atual da conexão.

> Nesta fase do MVP, a base de sessão foi implementada sem automações de recebimento e sem reconexão automática. A estrutura foi organizada para facilitar evolução futura.

## Scripts úteis

Na raiz:

- `npm run dev:backend`: inicia backend em modo desenvolvimento
- `npm run dev:frontend`: inicia frontend em modo desenvolvimento
- `npm run build`: build de todos os workspaces

No backend:

- `npm run dev`
- `npm run build`
- `npm run start`

No frontend:

- `npm run dev`
- `npm run build`
- `npm run preview`

## Status

Estrutura inicial criada com base de integração de sessão WhatsApp, sem regra de negócio de automações neste momento.
Estrutura inicial criada, sem implementação de regra de negócio neste momento.
