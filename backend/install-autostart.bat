@echo off
REM ==========================================================
REM Enregistre cashflow-backend dans le Planificateur de taches
REM   - Demarre au login de l'utilisateur
REM   - Tourne en arriere-plan (pas de fenetre noire)
REM   - Redemarre automatiquement si le serveur plante
REM Lance ce fichier UNE SEULE FOIS (pas besoin d'admin).
REM ==========================================================
setlocal
cd /d "%~dp0"

echo.
echo === Installation du demarrage automatique ===
echo.

REM --- Verifie que start-silent.vbs est bien la --------------
if not exist "start-silent.vbs" (
  echo [X] start-silent.vbs introuvable dans ce dossier.
  echo     Verifie que tu lances ce fichier depuis le dossier backend.
  pause
  exit /b 1
)

set "TASKNAME=CashflowBackend"
set "VBSPATH=%~dp0start-silent.vbs"

REM --- Supprime une eventuelle ancienne tache du meme nom ----
schtasks /Query /TN "%TASKNAME%" >nul 2>nul
if not errorlevel 1 (
  echo Tache existante detectee, suppression...
  schtasks /Delete /TN "%TASKNAME%" /F >nul
)

REM --- Cree la tache : declenchement a l'ouverture de session
REM   /SC ONLOGON   = au login Windows
REM   /RL LIMITED   = droits utilisateur (pas admin)
REM   /F            = ecrase si existe
schtasks /Create ^
  /TN "%TASKNAME%" ^
  /TR "wscript.exe \"%VBSPATH%\"" ^
  /SC ONLOGON ^
  /RL LIMITED ^
  /F >nul

if errorlevel 1 (
  echo [X] Echec de creation de la tache planifiee.
  pause
  exit /b 1
)

echo [OK] Tache "%TASKNAME%" creee.
echo.
echo Le serveur cashflow demarrera automatiquement a chaque
echo ouverture de session Windows, en arriere-plan.
echo.
echo --- Voulez-vous le demarrer maintenant ? (O/N)
set /p ANSWER=
if /I "%ANSWER%"=="O" (
  echo Demarrage...
  start "" wscript.exe "%VBSPATH%"
  timeout /t 3 >nul
  start "" "http://localhost:3000"
  echo.
  echo [OK] Serveur lance. Le navigateur va s'ouvrir.
)

echo.
echo Pour DESINSTALLER le demarrage automatique :
echo    double-clique sur uninstall-autostart.bat
echo.
pause
exit /b 0
