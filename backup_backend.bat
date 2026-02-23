@echo off
REM Backup automático do backend antes de cada deploy
set BACKUP_DIR=backup_backend_%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%
mkdir %BACKUP_DIR%
xcopy backend %BACKUP_DIR%\backend /E /I /H /Y

echo Backup salvo em %BACKUP_DIR%\backend
pause
