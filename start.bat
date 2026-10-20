@echo off
setlocal
REM ============================================================
REM  Food Cost Approval - run the prebuilt app (Windows)
REM  needs : JDK 17+ only. No Node.js, no Maven, no internet.
REM  usage : start.bat          (port 8090)
REM          start.bat 9000     (custom port)
REM ============================================================
cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8090"

REM JDK to try first. Change this line if your JDK is somewhere else.
set "PREFERRED_JDK=C:\aondev\jdk-21"

set "APP_JAR=release\food-cost-approval.jar"
if not exist "%APP_JAR%" set "APP_JAR=backend\target\food-cost-approval-0.1.0.jar"
if not exist "%APP_JAR%" (
  echo [ERROR] No built jar found. Run run-local.bat once to build it.
  goto :fail
)

echo Checking Java (JDK 17 or later)...
call "%~dp0scripts\find-jdk.cmd"
if not defined JDK_HOME goto :no_java
echo   OK - Java %JDK_VER% : %JDK_HOME%

echo.
echo Starting server: http://localhost:%PORT%   (stop: Ctrl+C)
echo   login: writer / 1234
echo.
set "SERVER_PORT=%PORT%"
"%JDK_HOME%\bin\java.exe" -jar "%APP_JAR%"
goto :eof

:no_java
echo.
echo [ERROR] JDK 17 or later was not found.
if defined OLD_JAVA echo         Found only an older one: %OLD_JAVA%
echo.
echo   Install JDK 21 with ONE of the following:
echo     1. cmd:  winget install EclipseAdoptium.Temurin.21.JDK
echo     2. web:  https://adoptium.net  -  download "Temurin 21 LTS" .msi
echo.
echo   After installing, open a NEW cmd window and run start.bat again.
echo   If a JDK is already installed elsewhere, set JAVA_HOME to that folder.
goto :fail

:fail
echo.
echo [FAILED] See the messages above.
pause
exit /b 1
