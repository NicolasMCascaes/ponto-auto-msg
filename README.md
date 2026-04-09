# Ponto Auto Msg

Ponto Auto Msg nasceu para resolver um problema real de operação: cobrar ajustes de espelho ponto pelo WhatsApp sem cair no caos de mensagem manual, texto repetitivo e pouca rastreabilidade.

Na prática, a rotina era simples de entender e ruim de executar: identificar quem precisava corrigir o ponto, separar perfis diferentes de funcionários, escrever cobranças uma a uma e tentar manter um tom humano sem parecer mensagem copiada. Este projeto transforma esse processo em um fluxo operacional mais seguro, rápido e organizado.

## O problema que o produto resolve

Quando a cobrança de espelho ponto é feita manualmente, alguns problemas aparecem rápido:

- tempo gasto reescrevendo a mesma mensagem várias vezes;
- dificuldade para adaptar o texto conforme o perfil do destinatário;
- risco de mandar texto inadequado para professores e funcionários comuns;
- pouca visibilidade do que já foi enviado e para quem;
- chance maior de comportamento agressivo no WhatsApp ao disparar mensagens em sequência.

O Ponto Auto Msg foi desenhado justamente para atacar esse cenário.

## Como o produto funciona

O sistema conecta uma sessão de WhatsApp, organiza uma base de contatos e permite disparos individuais ou em lote com histórico.

Além disso, ele resolve uma necessidade específica da operação:

- contatos podem ser classificados como `Professores` ou `Funcionários comuns`;
- a classificação de professor é derivada da observação do contato quando ela começa com `prof`;
- modelos de mensagem podem ser cadastrados por grupo;
- no envio em lote por grupo, o sistema escolhe aleatoriamente uma variação de mensagem para cada destinatário;
- a variável `{nome}` personaliza o texto final automaticamente;
- o envio em lote aplica um intervalo entre mensagens para reduzir o risco de bloqueio do número.

## Principais capacidades

- autenticação por usuário;
- sessão de WhatsApp com acompanhamento de status;
- agenda de contatos com observações e listas;
- segmentação por listas para montar lotes;
- modelos de mensagem por grupo, disponíveis apenas para administradores;
- histórico de mensagens enviadas e falhas;
- envio manual e envio em lote com variação automática de texto.

## Perfis de acesso

Hoje o projeto possui dois perfis:

- `admin`: pode gerenciar modelos de mensagem;
- `user`: usa o restante do produto, sem acesso à área de modelos.

## Stack

- `backend/`: Node.js, TypeScript, Express, SQLite e Baileys;
- `frontend/`: React, Vite e shadcn/ui.

## Rodando localmente

### Requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
npm install
```

### Desenvolvimento

Em terminais separados:

```bash
npm run dev:backend
npm run dev:frontend
```

Endpoints locais:

- backend: `http://localhost:3001`
- frontend: `http://localhost:5173`

### Build

```bash
npm run build --workspace backend
npm run build --workspace frontend
```

## Variáveis de ambiente

### Backend

Exemplo mínimo em `backend/.env.local`:

```bash
JWT_SECRET=change-this-secret-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGINS=
BATCH_SEND_DELAY_MIN_MS=4000
BATCH_SEND_DELAY_MAX_MS=7000
```

### Frontend

Exemplo mínimo em `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:3001
```

## Observações de produção

O produto depende de sessão ativa do WhatsApp via Baileys e usa SQLite local. Isso significa que o backend funciona melhor em ambiente com processo persistente e disco estável.

Para uso real, a recomendação é hospedar o backend em infraestrutura durável, como Railway, Render, Fly.io ou VPS. O frontend pode ser publicado separadamente com mais facilidade.

## Estado atual do produto

Este repositório já cobre o fluxo principal de operação:

- login;
- conexão com WhatsApp;
- cadastro e organização de contatos;
- criação de listas;
- criação de modelos por grupo;
- envio manual;
- envio em lote com personalização e aleatoriedade;
- histórico operacional.

Ou seja: não é apenas um painel de demonstração. É uma ferramenta criada para resolver uma dor operacional concreta do dia a dia.
