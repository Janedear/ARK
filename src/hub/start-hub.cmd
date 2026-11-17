@echo off
rem Starts the ARK Local Hub on Windows. No internet needed. Double-click this file.
cd /d "%~dp0.."
if not exist library\files\node-win (
  for %%Z in (library\files\node-v*-win-x64.zip) do powershell -NoProfile -Command "Expand-Archive -Force '%%Z' 'library\files\node-tmp'; Move-Item (Get-ChildItem 'library\files\node-tmp')[0].FullName 'library\files\node-win'; Remove-Item 'library\files\node-tmp'"
)
set NODE=node
if exist library\files\node-win\node.exe set NODE=library\files\node-win\node.exe
echo If Windows Firewall asks, allow access on PRIVATE networks so phones can connect.
"%NODE%" hub\ark-hub.mjs
pause