@echo off
setlocal
REM ============================================================
REM  Food Cost Approval - build and run (Windows)
REM  build web, package backend, run http://localhost:8090
REM  needs : JDK 17+ (21 recommended)
REM          Node.js 20+ only if you changed the web source.
REM          Without Node.js the prebuilt web\dist is used.
REM          Maven is downloaded automatically (mvnw).
REM  usage : run-local.bat          (port 8090)
REM          run-local.bat 9000     (custom port)
REM  To just run the prebuilt app without building, use start.bat
REM ============================================================
cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8090"

REM JDK to try first. Change this line if your JDK is somewhere else.
set "PREFERRED_JDK=C:\aondev\jdk-21"

echo Checking Java (JDK 17 or later)...
call "%~dp0scripts\find-jdk.cmd"
if not defined JDK_HOME goto :no_java
set "JAVA_HOME=%JDK_HOME%"
set "PATH=%JDK_HOME%\bin;%PATH%"
echo   OK - Java %JDK_VER% : %JDK_HOME%

echo Checking Node.js...
call :find_npm
if defined NPM_CMD goto :build_web
if exist "web\dist\index.html" goto :use_prebuilt_web
goto :no_node

:build_web
echo   OK - %NPM_CMD%
echo.
echo [1/3] Building web (React)...
pushd web
call "%NPM_CMD%" install || (popd & goto :fail)
call "%NPM_CMD%" run build || (popd & goto :fail)
popd
goto :build_backend

:use_prebuilt_web
echo   Node.js not found - using the prebuilt web files in web\dist
echo.
echo [1/3] Skipped web build.

:build_backend
echo.
echo [2/3] Packaging backend (Spring Boot, includes web)...
pushd backend
call mvnw.cmd -q -DskipTests package || (popd & goto :fail)
popd

echo.
echo [3/3] Starting server: http://localhost:%PORT%   (stop: Ctrl+C)
echo       login: writer / 1234
echo.
set "SERVER_PORT=%PORT%"
java -jar backend\target\food-cost-approval-0.1.0.jar
goto :eof


REM ------------------------------------------------------------
REM  find_npm : npm on PATH, Program Files\nodejs or C:\aondev\node*
REM ------------------------------------------------------------
:find_npm
set "NPM_CMD="
where npm >nul 2>nul && (set "NPM_CMD=npm" & exit /b 0)
if exist "%ProgramFiles%\nodejs\npm.cmd" call :use_node "%ProgramFiles%\nodejs"
if defined NPM_CMD exit /b 0
for /d %%n in ("C:\aondev\node*") do if not defined NPM_CMD if exist "%%~n\npm.cmd" call :use_node "%%~n"
exit /b 0

:use_node
set "NPM_CMD=%~1\npm.cmd"
set "PATH=%~1;%PATH%"
exit /b 0


:no_java
echo.
echo [ERROR] JDK 17 or later was not found.
if defined OLD_JAVA echo         Found only an older one: %OLD_JAVA%
echo.
echo   Install JDK 21 with ONE of the following:
echo     1. cmd:  winget install EclipseAdoptium.Temurin.21.JDK
echo     2. web:  https://adoptium.net  -  download "Temurin 21 LTS" .msi
echo.
echo   After installing, open a NEW cmd window and run run-local.bat again.
echo   If a JDK is already installed elsewhere, set JAVA_HOME to that folder.
goto :fail

:no_node
echo.
echo [ERROR] Node.js (npm) was not found and web\dist is missing.
echo   Install Node.js 20 LTS or later from https://nodejs.org
echo   then open a NEW cmd window and run run-local.bat again.
echo   Or use start.bat to run the prebuilt app with Java only.
goto :fail

:fail
echo.
echo [FAILED] See the messages above.
pause
exit /b 1
