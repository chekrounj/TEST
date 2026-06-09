' ==========================================================
' Lanceur silencieux : execute start.bat sans afficher de
' fenetre console et SANS ouvrir le navigateur (autostart).
' Appele au demarrage par la tache planifiee.
' ==========================================================
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
' OPEN_BROWSER=0 evite que le navigateur popup a chaque login.
' On passe par cmd /c pour positionner la variable avant start.bat.
cmd = "cmd /c set OPEN_BROWSER=0 && """ & scriptDir & "\start.bat"""
' 0 = fenetre cachee, False = ne pas attendre la fin
sh.Run cmd, 0, False
