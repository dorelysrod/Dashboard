#!/bin/bash
# Loop launchd del FLUJO DIARIO de prospección. launchd lo dispara cada hora;
# el orquestador (flujo-diario.mts) es resumible por etapa y por día: si todo
# lo de hoy está ok, salir cuesta nada; si una etapa cayó (límite de sesión),
# esta corrida la reintenta. Lock = una sola instancia a la vez.
set -u
DIR="/Users/dorelysrodriguez/ailandingpro"
cd "$DIR" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
LOG="$DIR/salida/flujo-diario.log"
LOCK="/tmp/flujodiario.lock"

mkdir -p "$DIR/salida"

# Una sola instancia: si el lock existe (otra corriendo), salgo.
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date '+%F %T') ya hay una instancia corriendo, salgo" >> "$LOG"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# ¿El día ya está completo? → salir barato (sin arrancar node/tsx pesado).
HOY=$(date '+%F')
DONE=$(node -e '
try {
  const s = require("./salida/estado-diario.json");
  const hoy = process.argv[1];
  const et = s.etapas || {};
  const pend = Object.values(et).some((v) => v === "error");
  const completo = s.fecha === hoy && et.resumen === "ok" && !pend;
  process.stdout.write(completo ? "1" : "0");
} catch (e) { process.stdout.write("0"); }' "$HOY")
if [ "$DONE" = "1" ]; then
  echo "$(date '+%F %T') día $HOY completo — nada que hacer" >> "$LOG"
  exit 0
fi

echo "$(date '+%F %T') === lanzando flujo diario ===" >> "$LOG"
npx tsx flujo-diario.mts >> "$LOG" 2>&1
echo "$(date '+%F %T') === flujo terminó (exit $?) ===" >> "$LOG"
