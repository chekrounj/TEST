@echo off
REM ==========================================================
REM Installeur Terminal Server / Multi-utilisateurs
REM   - Lance le serveur cashflow au BOOT de la machine
REM   - Tourne sous le compte SYSTEM (1 seul process pour
REM     toutes les sessions RDP)
REM   - Chaque utilisateur RDP ouvre http://localhost:3000
REM   - REQUIERT des droits administrateur (UAC)
REM ==========================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo === Installation Terminal Server (autostart au boot) ===
echo.

REM --- Verifie qu'on a les droits admin --------------------
net session >nul 2>nul
if errorlevel 1 (
  echo [X] Ce script doit etre lance EN ADMINISTRATEUR.
  echo     Clic droit sur ce .bat -^> "Executer en tant qu'administrateur"
  echo.
  pause
  exit /b 1
)
echo [OK] Droits administrateur confirmes.

REM --- Trouve node.exe (chemin absolu requis pour SYSTEM) --
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js introuvable dans le PATH.
  echo     Installe la LTS depuis https://nodejs.org/ ^("Pour tous les utilisateurs"^)
  pause
  exit /b 1
)
for /f "tokens=*" %%n in ('where node') do (
  set "NODEEXE=%%n"
  goto :NODEFOUND
)
:NODEFOUND
echo [OK] Node.js : !NODEEXE!

REM --- Verifie que les deps sont installees ----------------
if not exist "node_modules\express\package.json" (
  echo.
  echo Installation des dependances ^(1ere fois^)...
  call npm install
  if errorlevel 1 (
    echo [X] npm install a echoue.
    pause
    exit /b 1
  )
)

REM --- Verifie que .env existe -----------------------------
if not exist .env (
  echo.
  echo Generation du fichier .env...
  call :GENJWT
  > .env (
    echo GOOGLE_CLIENT_ID=
    echo JWT_SECRET=!JWT!
    echo PORT=3000
    echo ALLOW_DEV_LOGIN=1
    echo OPEN_BROWSER=0
  )
  echo [OK] .env cree.
) else (
  REM Force OPEN_BROWSER=0 (SYSTEM ne peut pas ouvrir de navigateur)
  findstr /B /C:"OPEN_BROWSER=" .env >nul 2>nul
  if errorlevel 1 (
    echo OPEN_BROWSER=0 >> .env
    echo [OK] OPEN_BROWSER=0 ajoute a .env
  )
)

REM --- Cree le wrapper qui sera lance par la tache ---------
REM On a besoin d'un wrapper parce que schtasks ne gere pas
REM le repertoire de travail (working dir).
> "run-server.bat" (
  echo @echo off
  echo REM Wrapper genere par install-autostart-system.bat
  echo REM Lance par le Planificateur de taches sous le compte SYSTEM
  echo cd /d "%~dp0"
  echo set OPEN_BROWSER=0
  echo REM Log de sortie ^(rotation manuelle si trop gros^)
  echo "!NODEEXE!" server.js ^>^> "%~dp0server.log" 2^>^&1
)
echo [OK] run-server.bat genere.

REM --- Accorde droit de LECTURE sur data.json et le dossier --
REM Le serveur tourne sous SYSTEM et cree data.json avec ACL
REM par defaut. On donne droit de lecture aux Utilisateurs pour
REM que la sauvegarde puisse copier le fichier.
echo.
echo Configuration des droits ^(pour la sauvegarde^)...
icacls "%~dp0." /grant "Users:(OI)(CI)R" /T /C >nul 2>nul
if exist "%~dp0data.json" (
  icacls "%~dp0data.json" /grant "Users:R" /C >nul 2>nul
  echo [OK] data.json lisible par les Utilisateurs.
) else (
  echo [OK] ACL inherite par le dossier ^(data.json sera lisible des sa creation^).
)

REM --- Supprime ancienne tache si presente -----------------
set "TASKNAME=CashflowBackend"
schtasks /Query /TN "%TASKNAME%" >nul 2>nul
if not errorlevel 1 (
  echo Tache existante detectee, suppression...
  schtasks /Delete /TN "%TASKNAME%" /F >nul
)

REM --- Ouvre le port 3000 dans le pare-feu Windows --------
REM Pour que les autres PC du LAN puissent acceder a l'appli.
echo.
echo Ouverture du port 3000 dans le pare-feu Windows...
netsh advfirewall firewall show rule name="Cashflow Backend (port 3000)" >nul 2>nul
if errorlevel 1 (
  netsh advfirewall firewall add rule ^
    name="Cashflow Backend (port 3000)" ^
    dir=in action=allow protocol=TCP localport=3000 ^
    profile=domain,private >nul
  if errorlevel 1 (
    echo [!] Echec d'ouverture du pare-feu - acces LAN non garanti.
  ) else (
    echo [OK] Regle pare-feu creee ^(TCP 3000 in, profils domain+private^).
  )
) else (
  echo [OK] Regle pare-feu deja presente.
)

REM --- Cree la tache -------------------------------------
REM   /SC ONSTART  = au boot machine
REM   /RU SYSTEM   = compte SYSTEM (toujours present, sans password)
REM   /RL HIGHEST  = privileges max (SYSTEM les a deja)
REM   /F           = ecrase
set "WRAPPER=%~dp0run-server.bat"
schtasks /Create ^
  /TN "%TASKNAME%" ^
  /TR "\"%WRAPPER%\"" ^
  /SC ONSTART ^
  /RU SYSTEM ^
  /RL HIGHEST ^
  /F >nul

if errorlevel 1 (
  echo [X] Echec de creation de la tache planifiee.
  pause
  exit /b 1
)
echo [OK] Tache "%TASKNAME%" creee (boot, compte SYSTEM).

REM --- Demarre le serveur tout de suite --------------------
echo.
echo Demarrage du serveur maintenant...
schtasks /Run /TN "%TASKNAME%" >nul
if errorlevel 1 (
  echo [!] schtasks /Run a echoue, demarrage manuel...
  start "" "%WRAPPER%"
)

REM --- Attente que le serveur reponde ---------------------
echo Attente que le serveur soit pret (max 20s)...
set /a TRIES=0
:WAITLOOP
set /a TRIES+=1
if !TRIES! GTR 20 (
  echo [!] Le serveur ne repond toujours pas apres 20s.
  echo     Regarde le fichier server.log dans ce dossier.
  goto :ENDWAIT
)
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://localhost:3000/api/health | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 goto :WAITLOOP
echo [OK] Serveur up apres !TRIES!s.
:ENDWAIT

echo.
echo ==========================================================
echo  INSTALLATION TERMINAL SERVER TERMINEE
echo ==========================================================
echo.
echo  Le serveur cashflow demarre au boot de la machine,
echo  sous le compte SYSTEM. Tous les utilisateurs RDP qui se
echo  connectent peuvent ouvrir :
echo.
echo      http://localhost:3000/
echo.
echo  dans leur navigateur. Ils se connectent avec le meme
echo  email pour partager les memes donnees, ou avec des
echo  emails differents pour avoir des cashflows separes.
echo.
echo  Logs   : server.log dans ce dossier
echo  Donnees: data.json  dans ce dossier
echo.
echo  Pour DESINSTALLER : uninstall-autostart-system.bat
echo ==========================================================
echo.
pause
exit /b 0


:GENJWT
node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))" > "%TEMP%\cf_jwt.txt" 2>nul
set /p JWT=<"%TEMP%\cf_jwt.txt"
del "%TEMP%\cf_jwt.txt" >nul 2>nul
exit /b 0
