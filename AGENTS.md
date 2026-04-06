# AGENTS.md

## Objetivo
Padronizar o setup deste repositório no ambiente Codex antes de qualquer implementação de feature.

## Diagnóstico do gerenciador de pacotes
- Este projeto usa **npm workspaces** (não usa pnpm nem yarn).
- Evidências:
  - `package.json` raiz contém `"workspaces"` e scripts com `npm --workspace ...`.
  - Não existem `pnpm-lock.yaml`, `yarn.lock` ou `package-lock.json` no estado atual.

## Workflow correto (instalação e build)
1. Conferir versões:
   - Node.js `>=20`
   - npm `>=10`
2. Instalar dependências na raiz:
   - `npm install`
3. Validar build por workspace:
   - `npm run build --workspace backend`
   - `npm run build --workspace frontend`

## Sobre registry / credenciais
- As dependências declaradas atualmente são públicas (npmjs), incluindo `express`, `react`, `vite`, `typescript` e `@whiskeysockets/baileys`.
- Portanto, **não há pacote privado obrigatório no `package.json`**.
- Se ocorrer `E403` no `https://registry.npmjs.org/`, o bloqueio tende a ser de política de rede/proxy do ambiente.
- Caso a organização exija mirror privado, configurar `.npmrc` com:
  - `registry=<URL_DO_REGISTRY_INTERNO>`
  - token válido para esse registry (ex.: `//<host>/:_authToken=${NPM_TOKEN}`)
  - variável `NPM_TOKEN` disponível no ambiente.

## Script recomendado para este ambiente
Executar:

```bash
bash scripts/setup-codex-env.sh
```

Esse script:
- valida ferramentas e lockfiles;
- exibe registry npm ativo;
- tenta `npm install`;
- roda builds de backend e frontend.
