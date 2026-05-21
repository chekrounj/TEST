#!/usr/bin/env bash
# cashflow-backend — lanceur macOS / Linux
# Usage : bash start.sh   (ou chmod +x start.sh && ./start.sh)
set -e
cd "$(dirname "$0")"

echo
echo "=== Cashflow — serveur local ==="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[X] Node.js introuvable."
  echo "    macOS : brew install node    ou bien    https://nodejs.org/"
  exit 1
fi
echo "[OK] Node.js $(node --version)"

if [ ! -d node_modules ]; then
  echo
  echo "Installation des dépendances (1re fois)..."
  npm install
fi

if [ ! -f .env ]; then
  echo
  echo "Génération du fichier .env..."
  JWT=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
  cat > .env <<EOF
GOOGLE_CLIENT_ID=
JWT_SECRET=$JWT
PORT=3000
ALLOW_DEV_LOGIN=1
EOF
  echo "[OK] .env créé"
fi

echo
echo "Lancement du serveur sur http://localhost:3000"
echo "Ctrl+C pour arrêter."
echo

# Ouvrir le navigateur (macOS = open, Linux = xdg-open)
if command -v open >/dev/null 2>&1; then
  (sleep 1 && open "http://localhost:3000/cashflow.html") &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:3000/cashflow.html") &
fi

exec node server.js
