#!/usr/bin/env bash
# Detecta el stack del repo para que CI active solo los jobs relevantes.
# Escribe has_node / has_python a $GITHUB_OUTPUT (formato GitHub Actions).
# El scaffold de la app (Next 15) vive en la raíz del repo: package.json en raíz.
set -euo pipefail

has_node=false
has_python=false

if [ -f package.json ]; then
  has_node=true
fi

if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
  has_python=true
fi

echo "has_node=$has_node"
echo "has_python=$has_python"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "has_node=$has_node"
    echo "has_python=$has_python"
  } >> "$GITHUB_OUTPUT"
fi
