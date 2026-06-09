@echo off
REM ==========================================================
REM Desinstalle la sauvegarde quotidienne.
REM Les fichiers deja sauvegardes sur J: NE sont PAS supprimes.
REM ==========================================================
setlocal

REM --- Verifie qu'on a les droits admin --------------------
net session >nul 2>nul
if errorlevel 1 (
  echo [X] Ce script doit etre lance EN ADMINISTRATEUR.
  pause
  exit /b 1
)

set "TASKNAME=CashflowBackup"

echo.
echo === Desinstallation de la sauvegarde quotidienne ===
echo.

schtasks /Query /TN "%TASKNAME%" >nul 2>nul
if errorlevel 1 (
  echo La tache "%TASKNAME%" n'existe pas.
) else (
  schtasks /Delete /TN "%TASKNAME%" /F
  if errorlevel 1 (
    echo [X] Echec de suppression.
    pause
    exit /b 1
  )
  echo [OK] Tache supprimee.
)

echo.
echo Les sauvegardes deja realisees dans J:\Appli-Tazrim\backup\
echo ne sont PAS supprimees - tu peux les effacer manuellement
echo si tu n'en as plus besoin.
echo.
pause
exit /b 0
