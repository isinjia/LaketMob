@echo off
title RacketMonster Server
cd /d "%~dp0"
set PORT=8790

set PY=
where python >nul 2>nul && set PY=python
if not defined PY where py >nul 2>nul && set PY=py
if not defined PY goto NOPY

echo ============================================
echo    라켓몬스터 서버 실행 중
echo    주소: http://localhost:%PORT%
echo    게임을 끝내려면 이 창을 닫으세요.
echo ============================================
start "" cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:%PORT%/"
%PY% -m http.server %PORT% --bind 127.0.0.1
pause
exit /b

:NOPY
echo [안내] Python이 없어 서버 없이 index.html을 바로 엽니다.
start "" "%~dp0index.html"
timeout /t 3 >nul
