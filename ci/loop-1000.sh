#!/bin/bash
# Loop launchd para el pipeline de 1000 leads de calidad. Lo re-lanza launchd cada
# intervalo; el pipeline es RESUMIBLE (salida/estado-1000.json), así avanza solo
# hasta llegar a 1000 sin intervención. Lock = una sola instancia a la vez.
set -u
DIR="/Users/dorelysrodriguez/ailandingpro"
cd "$DIR" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
LOG="$DIR/salida/loop-1000.log"
LOCK="/tmp/leads1000.lock"

mkdir -p "$DIR/salida"

# Una sola instancia: si el lock existe (otra corriendo), salgo.
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date '+%F %T') ya hay una instancia corriendo, salgo" >> "$LOG"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# ¿Ya se alcanzó el objetivo? → salir barato (launchd seguirá disparando sin costo).
DONE=$(node -e 'try{const s=require("./salida/estado-1000.json");process.stdout.write(((s.calificados?.length||0)>=1000)?"1":"0")}catch(e){process.stdout.write("0")}')
if [ "$DONE" = "1" ]; then
  echo "$(date '+%F %T') objetivo 1000 alcanzado — nada que hacer" >> "$LOG"
  exit 0
fi

echo "$(date '+%F %T') === lanzando pipeline ===" >> "$LOG"
OBJETIVO=1000 npx tsx generar-1000.mts >> "$LOG" 2>&1
echo "$(date '+%F %T') === pipeline terminó (exit $?) ===" >> "$LOG"
