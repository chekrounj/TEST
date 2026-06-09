@echo off
REM ==========================================================
REM Installeur sauvegarde quotidienne data.json -^> J:
REM   - Tache planifiee tous les jours a 20:00
REM   - Tourne sous TON compte utilisateur (J: doit etre mappe)
REM   - Mode /IT : ne se declenche que si tu es connecte
REM
REM IMPORTANT: NE PAS lancer en administrateur !
REM   Si tu lances "en admin", Windows utilise un autre token
REM   utilisateur qui NE VOIT PAS les disques mappes par GPO.
REM   J: serait alors invisible. Double-clique simplement.
REM ==========================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo === Installation de la sauvegarde quotidienne ===
echo.

REM --- ALERTE si lance en admin (J: ne sera pas visible) ---
net session >nul 2>nul
if not errorlevel 1 (
  echo [!] ATTENTION : ce script tourne EN ADMINISTRATEUR.
  echo     Dans ce mode, les disques mappes par GPO ^(comme J:^)
  echo     ne sont PAS visibles a cause d'un mecanisme Windows.
  echo.
  echo     Ferme cette fenetre et DOUBLE-CLIQUE simplement sur
  echo     install-backup.bat ^(sans "Executer en admin"^).
  echo.
  echo     La creation de la tache planifiee pour TON compte
  echo     ne necessite PAS de droits admin.
  echo.
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
  echo [X] J: n'est pas monte dans cette session.
  echo     Verifie dans l'Explorateur que J: apparait bien.
  echo     Si oui mais pas ici : tu lances peut-etre en admin ^(voir alerte plus haut^).
  pause
  exit /b 1
)
echo [OK] J: accessible.

if not exist "%DEST%" (
  mkdir "%DEST%" 2>nul
  if errorlevel 1 (
    echo [X] Impossible de creer %DEST%.
    echo     Verifie tes droits ecriture sur J:\Appli-Tazrim\
    pause
    exit /b 1
  )
  echo [OK] Dossier %DEST% cree.
) else (
  echo [OK] Dossier %DEST% existe deja.
)

REM --- Cree la tache planifiee -----------------------------
REM   /SC DAILY        = tous les jours
REM   /ST 20:00        = a 20h
REM   /TN              = nom de la tache
REM   /TR              = action
REM   /IT              = seulement quand tu es connecte (pas besoin de mot de passe)
REM   /F               = ecrase si existe
REM Pas de /RU : la tache est creee pour l'utilisateur courant.
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
  echo --- backup.log ---
  type "%~dp0backup.log"
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
