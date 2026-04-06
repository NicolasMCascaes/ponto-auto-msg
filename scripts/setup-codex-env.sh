#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[setup] root: $ROOT_DIR"
echo "[setup] node: $(node --version)"
echo "[setup] npm: $(npm --version)"
echo "[setup] npm registry: $(npm config get registry)"

if [[ -f "pnpm-lock.yaml" || -f "yarn.lock" ]]; then
  echo "[setup][erro] Lockfile de outro gerenciador detectado (pnpm/yarn)."
  exit 1
fi

echo "[setup] installing dependencies..."
if ! npm install; then
  cat <<'MSG'
[setup][erro] Falha no npm install.
Se o erro for E403/credenciais, confirme:
1) acesso de rede ao registry configurado;
2) se houver registry privado, adicione .npmrc com registry correto;
3) exporte NPM_TOKEN com permissão de leitura no registry privado.
MSG
  exit 1
fi

echo "[setup] building backend..."
npm run build --workspace backend

echo "[setup] building frontend..."
npm run build --workspace frontend

echo "[setup] done"
