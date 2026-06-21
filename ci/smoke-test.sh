#!/usr/bin/env bash
# Smoke test post-deploy: verifica que la URL desplegada responde.
# Uso: bash ci/smoke-test.sh <url>
# Nota: golpea NUESTRA propia URL desplegada (no una API externa); compatible fase 1.
set -euo pipefail

url="${1:-}"

if [ -z "$url" ]; then
  echo "smoke-test: no se recibió URL — nada que verificar (deploy stub fase 1)."
  exit 0
fi

echo "smoke-test: verificando $url"
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 "$url" || echo "000")
echo "smoke-test: HTTP $code"

case "$code" in
  2*|3*) echo "smoke-test: OK"; exit 0 ;;
  *) echo "smoke-test: FALLÓ (esperaba 2xx/3xx, recibí $code)"; exit 1 ;;
esac
