@echo off
REM ==========================================================
REM Installeur sauvegarde quotidienne data.json -^> J:
REM   - Tache planifiee tous les jours a 20:00
REM   - Tourne sous TON compte utilisateur (J: doit etre mappe)
REM   - Mode /IT : ne se declenche que si tu es connecte
REM ==========================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo === Installation de la sauvegarde quotidienne ===
echo.

REM --- Verifie qu'on a les droits admin --------------------
net session >nul 2>nul
if errorlevel 1 (
  echo [X] Ce script doit etre lance EN ADMINISTRATEUR.
  echo     Clic droit sur ce .bat -^> "Executer en tant qu'administrateur"
  pause
  exit /b 1
)

REM --- Verifie que backup.bat est la -----------------------
if not exist "%~dp0backup.bat" (
  echo [X] backup.bat introuvable. Verifie l'installation.
  pause
  exit /b 1
)

REM --- Verifie que J: est accessible -----------------------
set "DEST=J:\Appli-Tazrim\backup"
echo Verification de l'acces a J:...
if not exist "J:\" (
  echo [!] J: n'est pas monte dans cette session.
  echo     La sauvegarde ne marchera que pour les sessions
  echo     ou J: est mappe par GPO.
) else (
  echo [OK] J: accessible.
  if not exist "%DEST%" (
    mkdir "%DEST%" 2>nul
    if errorlevel 1 (
      echo [!] Impossible de creer %DEST% ^(droits ?^).
    ) else (
      echo [OK] Dossier %DEST% cree.
    )
  ) else (
    echo [OK] Dossier %DEST% existe deja.
  )
)

REM --- Cree la tache planifiee -----------------------------
REM   /SC DAILY        = tous les jours
REM   /ST 20:00        = a 20h
REM   /TN              = nom de la tache
REM   /TR              = action
REM   /RU %USERNAME%   = sous TON compte
REM   /IT              = seulement quand tu es connecte
REM   /F               = ecrase si existe
set "TASKNAME=CashflowBackup"
set "WRAPPER=%~dp0backup.bat"

schtasks /Query /TN "%TASKNAME%" >nul 2>nul
if not errorlevel 1 (
  echo Tache existante detectee, suppression...
  schtasks /Delete /TN "%TASKNAME%" /F >nul
)

schtasks /Create ^
  /TN "%TASKNAME%" ^
  /TR "\"%WRAPPER%\"" ^
  /SC DAILY ^
  /ST 20:00 ^
  /RU "%USERDOMAIN%\%USERNAME%" ^
  /IT ^
  /F >nul

if errorlevel 1 (
  echo [X] Echec de creation de la tache planifiee.
  pause
  exit /b 1
)
echo [OK] Tache "%TASKNAME%" creee.
echo      ^> tous les jours a 20:00
echo      ^> sous le compte %USERDOMAIN%\%USERNAME%
echo      ^> uniquement quand tu es connecte ^(/IT^)

REM --- Test immediat ---------------------------------------
echo.
echo Lancement d'une sauvegarde de test maintenant...
call "%WRAPPER%"

REM --- Affiche le resultat ---------------------------------
if exist "%~dp0backup.log" (
  echo.
  echo --- Derniere lignes de backup.log ---
  more +0 "%~dp0backup.log"
  echo --- fin ---
)

if exist "J:\Appli-Tazrim\backup" (
  echo.
  echo Contenu de J:\Appli-Tazrim\backup :
  dir /B "J:\Appli-Tazrim\backup\data-*.json" 2>nul
)

echo.
echo ==========================================================
echo  INSTALLATION SAUVEGARDE TERMINEE
echo ==========================================================
echo.
echo  Tous les jours a 20:00, data.json est copie vers
echo  %DEST%
echo  sous le format data-AAAAMMJJ-HHMMSS.json.
echo.
echo  Les sauvegardes de plus de 30 jours sont supprimees.
echo  Logs : backup.log dans ce dossier.
echo.
echo  IMPORTANT : la sauvegarde ne tourne que si tu es CONNECTE
echo  a Windows a 20:00 ^(option /IT car J: est mappe par GPO^).
echo  Si tu n'es pas connecte, la sauvegarde du jour est sautee.
echo.
echo  Pour DESINSTALLER : uninstall-backup.bat
echo ==========================================================
echo.
pause
exit /b 0
