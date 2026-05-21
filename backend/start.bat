@echo off
REM ==========================================================
REM cashflow-backend — lanceur Windows
REM   - Vérifie Node.js
REM   - Installe les deps au premier lancement
REM   - Génère un .env si absent (JWT_SECRET aléatoire)
REM   - Démarre le serveur sur http://localhost:3000
REM   - Ouvre le navigateur sur la page
REM Double-cliquer ce fichier suffit.
REM ==========================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo === Cashflow — serveur local ===
echo.

REM --- Verifie Node.js ---------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js introuvable.
  echo.
  echo Telechargez la version LTS sur https://nodejs.org/ puis relancez ce script.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node --version') do set NODEVER=%%v
echo [OK] Node.js !NODEVER!

REM --- Installe les dependances --------------------------------
if not exist node_modules (
  echo.
  echo Installation des dependances ^(une seule fois^)...
  call npm install
  if errorlevel 1 (
    echo [X] npm install a echoue.
    pause
    exit /b 1
  )
)

REM --- Genere .env si absent -----------------------------------
if not exist .env (
  echo.
  echo Generation du fichier .env...
  for /f "delims=" %%s in ('node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"') do set JWT=%%s
  (
    echo GOOGLE_CLIENT_ID=
    echo JWT_SECRET=!JWT!
    echo PORT=3000
    echo ALLOW_DEV_LOGIN=1
  ) > .env
  echo [OK] .env cree.
)

REM --- Demarre le serveur (qui ouvre lui-meme le navigateur) ----
echo.
echo Lancement du serveur sur http://localhost:3000
echo Fermez cette fenetre ^(ou Ctrl+C^) pour arreter le serveur.
echo.
node server.js
