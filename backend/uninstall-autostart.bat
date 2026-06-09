@echo off
REM ==========================================================
REM Supprime la tache planifiee CashflowBackend.
REM Le serveur ne redemarrera plus automatiquement au login.
REM ==========================================================
setlocal EnableDelayedExpansion

set "TASKNAME=CashflowBackend"

echo.
echo === Desinstallation du demarrage automatique ===
echo.

schtasks /Query /TN "%TASKNAME%" >nul 2>nul
if errorlevel 1 (
  echo La tache "%TASKNAME%" n'existe pas - rien a faire.
  pause
  exit /b 0
)

schtasks /Delete /TN "%TASKNAME%" /F
if errorlevel 1 (
  echo [X] Echec de suppression.
  pause
  exit /b 1
)

echo.
echo [OK] Demarrage automatique desactive.
echo Le serveur ne se lancera plus tout seul.
echo Pour le relancer manuellement : double-clique sur start.bat
echo.

REM --- Propose d'arreter le serveur en cours -----------------
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if not errorlevel 1 (
  echo Un processus node.exe tourne actuellement.
  echo --- L'arreter aussi ? (O/N)
  set /p ANSWER=
  if /I "!ANSWER!"=="O" (
    taskkill /IM node.exe /F >nul 2>nul
    echo [OK] node.exe arrete.
  )
)

pause
exit /b 0
