@echo off
REM ==========================================================
REM Desinstalle la tache au boot (Terminal Server)
REM Arrete le serveur en cours.
REM REQUIERT des droits administrateur.
REM ==========================================================
setlocal EnableDelayedExpansion

REM --- Verifie qu'on a les droits admin --------------------
net session >nul 2>nul
if errorlevel 1 (
  echo [X] Ce script doit etre lance EN ADMINISTRATEUR.
  echo     Clic droit sur ce .bat -^> "Executer en tant qu'administrateur"
  pause
  exit /b 1
)

set "TASKNAME=CashflowBackend"

echo.
echo === Desinstallation Terminal Server ===
echo.

schtasks /Query /TN "%TASKNAME%" >nul 2>nul
if errorlevel 1 (
  echo La tache "%TASKNAME%" n'existe pas.
) else (
  schtasks /End /TN "%TASKNAME%" >nul 2>nul
  schtasks /Delete /TN "%TASKNAME%" /F
  if errorlevel 1 (
    echo [X] Echec de suppression.
    pause
    exit /b 1
  )
  echo [OK] Tache supprimee.
)

REM --- Tue le node.exe en cours si besoin -----------------
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if not errorlevel 1 (
  echo Arret du node.exe en cours...
  taskkill /IM node.exe /F >nul 2>nul
  echo [OK] node.exe arrete.
)

echo.
echo Desinstallation terminee.
pause
exit /b 0
