@echo off
REM ==========================================================
REM cashflow-backend - lanceur Windows
REM   - Verifie Node.js (PAUSE si introuvable)
REM   - Installe les deps au 1er lancement (PAUSE si echec)
REM   - Genere .env avec JWT_SECRET aleatoire si absent
REM   - Demarre le serveur (qui ouvre lui-meme le navigateur)
REM   - PAUSE toujours a la fin pour que vous voyiez l'erreur
REM ==========================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo === Cashflow - serveur local ===
echo.

REM --- Verifie Node.js ---------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js introuvable dans le PATH.
  echo.
  echo     1. Installer la LTS depuis https://nodejs.org/
  echo     2. REOUVRIR une nouvelle fenetre cmd ^(le PATH change apres install^)
  echo     3. Relancer start.bat
  echo.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODEVER=%%v"
echo [OK] Node.js !NODEVER!

REM --- Installe les dependances ------------------------------
REM On verifie l'existence d'express, pas juste node_modules
REM ^(le dossier peut exister mais etre vide / partiel apres un install interrompu^).
if not exist "node_modules\express\package.json" (
  echo.
  echo Installation des dependances ^(~30s, peut prendre quelques minutes^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo [X] npm install a echoue. Voir le message ci-dessus.
    echo     Causes frequentes :
    echo       - antivirus qui bloque l'ecriture dans node_modules
    echo       - proxy d'entreprise ^(set HTTP_PROXY=...^)
    echo       - pas de connexion internet
    echo       - chemin contenant des caracteres speciaux ^(rare^)
    echo.
    pause
    exit /b 1
  )
  REM Re-verifie qu'express a bien ete installe
  if not exist "node_modules\express\package.json" (
    echo.
    echo [X] npm install s'est termine mais express n'est pas la.
    echo     Essayez :
    echo       1. supprimer le dossier node_modules ^(rd /s /q node_modules^)
    echo       2. supprimer package-lock.json ^(del package-lock.json^)
    echo       3. relancer start.bat
    echo.
    pause
    exit /b 1
  )
)

REM --- Genere .env si absent ---------------------------------
if not exist .env (
  echo.
  echo Generation du fichier .env...
  call :GENJWT
  if "!JWT!"=="" (
    echo [X] Impossible de generer JWT_SECRET.
    pause
    exit /b 1
  )
  > .env (
    echo GOOGLE_CLIENT_ID=
    echo JWT_SECRET=!JWT!
    echo PORT=3000
    echo ALLOW_DEV_LOGIN=1
  )
  echo [OK] .env cree.
)

REM --- Demarre le serveur ------------------------------------
echo.
echo Lancement du serveur sur http://localhost:3000
echo Le navigateur s'ouvrira quand le serveur sera pret.
echo Fermer cette fenetre ^(ou Ctrl+C^) pour arreter.
echo.
node server.js

REM --- En cas de sortie du serveur, PAUSE pour voir l'erreur -
REM En mode autostart (OPEN_BROWSER=0), on saute la pause car
REM la fenetre est cachee et personne ne peut appuyer sur une touche.
echo.
echo --------------------------------------------------------
echo Le serveur s'est arrete.
echo Si c'est inattendu, regardez le message ci-dessus.
echo --------------------------------------------------------
if not "%OPEN_BROWSER%"=="0" pause
exit /b 0


:GENJWT
REM Genere un JWT_SECRET aleatoire (48 octets base64) via Node.
REM On passe par un fichier temporaire pour eviter les soucis de quoting cmd.
node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))" > "%TEMP%\cf_jwt.txt" 2>nul
set /p JWT=<"%TEMP%\cf_jwt.txt"
del "%TEMP%\cf_jwt.txt" >nul 2>nul
exit /b 0
