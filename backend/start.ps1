# cashflow-backend — lanceur PowerShell
# Lance avec : clic droit sur le fichier > « Exécuter avec PowerShell »
#   (ou en ligne : powershell -ExecutionPolicy Bypass -File start.ps1)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "=== Cashflow — serveur local ===" -ForegroundColor Cyan
Write-Host ""

# --- Node.js ---------------------------------------------------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "[X] Node.js introuvable." -ForegroundColor Red
  Write-Host "    Télécharger la LTS sur https://nodejs.org/ puis relancer."
  Read-Host "Appuyer sur Entrée pour quitter"
  exit 1
}
$ver = & node --version
Write-Host "[OK] Node.js $ver"

# --- Dépendances ----------------------------------------------
if (-not (Test-Path "node_modules")) {
  Write-Host ""
  Write-Host "Installation des dépendances (1re fois)..."
  npm install
  if ($LASTEXITCODE -ne 0) { Write-Host "[X] npm install a échoué" -ForegroundColor Red; Read-Host; exit 1 }
}

# --- .env auto ------------------------------------------------
if (-not (Test-Path ".env")) {
  Write-Host ""
  Write-Host "Génération du fichier .env..."
  $jwt = & node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
  @"
GOOGLE_CLIENT_ID=
JWT_SECRET=$jwt
PORT=3000
ALLOW_DEV_LOGIN=1
"@ | Set-Content -Path ".env" -Encoding UTF8 -NoNewline
  Write-Host "[OK] .env créé"
}

# --- Démarrage + navigateur -----------------------------------
Write-Host ""
Write-Host "Lancement du serveur sur http://localhost:3000" -ForegroundColor Green
Write-Host "Fermer cette fenêtre (ou Ctrl+C) pour arrêter."
Write-Host ""
Start-Process "http://localhost:3000/cashflow.html"
node server.js
