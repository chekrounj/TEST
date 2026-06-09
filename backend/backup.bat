@echo off
REM ==========================================================
REM Sauvegarde quotidienne de data.json vers J:
REM Garde les 30 derniers jours, supprime les plus anciens.
REM Lance automatiquement par la tache CashflowBackup.
REM ==========================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"

REM --- Destination (modifiable ici ou via .env.backup) -----
set "DEST=J:\Appli-Tazrim\backup"
if exist "%~dp0.env.backup" (
  for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env.backup") do (
    if "%%a"=="DEST" set "DEST=%%b"
  )
)

set "SRC=%~dp0data.json"
set "LOG=%~dp0backup.log"
set "KEEP_DAYS=30"

REM --- Horodatage AAAAMMJJ-HHMMSS --------------------------
for /f "tokens=2 delims==" %%a in ('wmic os get LocalDateTime /value ^| find "="') do set "DT=%%a"
set "STAMP=!DT:~0,8!-!DT:~8,6!"

echo. >> "%LOG%"
echo [!STAMP!] === Sauvegarde === >> "%LOG%"
echo [!STAMP!] Source : %SRC% >> "%LOG%"
echo [!STAMP!] Dest   : %DEST% >> "%LOG%"

REM --- Verifie que la source existe et est LISIBLE ---------
if not exist "%SRC%" (
  echo [!STAMP!] [X] data.json introuvable a %SRC%. >> "%LOG%"
  exit /b 1
)
REM Test de lecture explicite (le serveur tourne sous SYSTEM,
REM la source peut ne pas etre lisible par l'utilisateur).
type "%SRC%" >nul 2>>"%LOG%"
if errorlevel 1 (
  echo [!STAMP!] [X] data.json existe mais n'est PAS LISIBLE par %USERNAME%. >> "%LOG%"
  echo [!STAMP!]     Solution: ouvre une cmd ADMIN et tape: >> "%LOG%"
  echo [!STAMP!]     icacls "%SRC%" /grant Users:R >> "%LOG%"
  exit /b 1
)

REM --- Verifie / cree le repertoire de destination ---------
if not exist "%DEST%" (
  mkdir "%DEST%" 2>>"%LOG%"
  if errorlevel 1 (
    echo [!STAMP!] [X] Impossible de creer %DEST% ^(J: pas monte ?^). >> "%LOG%"
    exit /b 1
  )
  echo [!STAMP!] [OK] Dossier %DEST% cree. >> "%LOG%"
)

REM --- Copie atomique : tmp puis rename --------------------
REM On capture stderr aussi pour voir les vrais messages Windows
set "TMP=%DEST%\.data-!STAMP!.json.tmp"
set "OUT=%DEST%\data-!STAMP!.json"
copy /Y "%SRC%" "%TMP%" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [!STAMP!] [X] Echec de copie ^(voir message Windows ci-dessus^). >> "%LOG%"
  exit /b 1
)
move /Y "%TMP%" "%OUT%" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [!STAMP!] [X] Echec de rename. >> "%LOG%"
  del "%TMP%" >nul 2>nul
  exit /b 1
)
echo [!STAMP!] [OK] Sauvegarde -^> %OUT% >> "%LOG%"

REM --- Purge des sauvegardes anciennes (> KEEP_DAYS) -------
REM On utilise forfiles : -d -N supprime ce qui est plus vieux que N jours
forfiles /P "%DEST%" /M "data-*.json" /D -%KEEP_DAYS% /C "cmd /c del @path" >nul 2>nul
echo [!STAMP!] [OK] Purge des sauvegardes ^> %KEEP_DAYS% jours. >> "%LOG%"

REM --- Garde le log raisonnable (50 ko max) ---------------
for %%F in ("%LOG%") do if %%~zF GTR 51200 (
  REM tronque : garde les 200 dernieres lignes
  more +200 "%LOG%" > "%LOG%.new" 2>nul && move /Y "%LOG%.new" "%LOG%" >nul
)

exit /b 0
