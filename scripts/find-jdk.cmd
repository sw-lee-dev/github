@echo off
REM ============================================================
REM  find-jdk.cmd : find a JDK 17+ and set JDK_HOME / JDK_VER.
REM  Called from run-local.bat and start.bat (no setlocal here,
REM  so the variables are visible to the caller).
REM  Set PREFERRED_JDK before calling to try that folder first.
REM ============================================================
call :find_jdk
exit /b 0

REM ------------------------------------------------------------
REM  find_jdk : set JDK_HOME / JDK_VER to the first JDK 17+ found
REM    order  : PREFERRED_JDK , JAVA_HOME , java on PATH , common folders
REM ------------------------------------------------------------
:find_jdk
set "JDK_HOME="
set "JDK_VER="
set "OLD_JAVA="
if defined PREFERRED_JDK call :try_home "%PREFERRED_JDK%"
if defined JDK_HOME exit /b 0
if defined PREFERRED_JDK echo   [WARN] %PREFERRED_JDK% is not a usable JDK 17+ - searching other locations...
if defined JAVA_HOME call :try_home "%JAVA_HOME%"
if defined JDK_HOME exit /b 0
for /f "delims=" %%p in ('where java 2^>nul') do call :try_exe "%%~p"
if defined JDK_HOME exit /b 0
for %%d in ("C:\aondev" "%ProgramFiles%\Eclipse Adoptium" "%ProgramFiles%\Java" "%ProgramFiles%\Microsoft" "%ProgramFiles%\Amazon Corretto" "%ProgramFiles%\Zulu" "%ProgramFiles%\BellSoft" "%ProgramFiles%\OpenJDK" "%LOCALAPPDATA%\Programs\Eclipse Adoptium" "%USERPROFILE%\.jdks") do (
  if exist "%%~d" for /d %%j in ("%%~d\*") do call :try_home "%%~j"
)
exit /b 0

:try_exe
REM %1 = java.exe on PATH. Its JDK home is the parent of bin.
if defined JDK_HOME exit /b 0
for %%i in ("%~dp1..") do call :try_home "%%~fi"
exit /b 0

:try_home
REM %1 = candidate JDK folder. Needs bin\java.exe, bin\javac.exe and version 17+.
if defined JDK_HOME exit /b 0
if not exist "%~1\bin\java.exe" exit /b 0
if not exist "%~1\bin\javac.exe" exit /b 0
set "JV="
REM version from JDK\release : JAVA_VERSION="21.0.2"  (no need to run java)
if exist "%~1\release" for /f "usebackq tokens=1,* delims==" %%a in ("%~1\release") do if /i "%%a"=="JAVA_VERSION" set "JV=%%~b"
if not defined JV call :version_from_exe "%~1\bin\java.exe"
if not defined JV exit /b 0
set "JM="
for /f "delims=.-+_" %%m in ("%JV%") do set "JM=%%m"
set "JMN=0"
set /a JMN=JM 2>nul
if "%JM%"=="1" goto :try_home_old
if %JMN% LSS 17 goto :try_home_old
set "JDK_HOME=%~f1"
set "JDK_VER=%JV%"
exit /b 0
:try_home_old
if not defined OLD_JAVA set "OLD_JAVA=Java %JV% at %~f1"
exit /b 0

:version_from_exe
REM fallback: first line of "java -version" (stderr) , openjdk version "21" 2023-09-19
set "FCA_JV_TMP=%TEMP%\fca_java_version_%RANDOM%.txt"
"%~1" -version 2>"%FCA_JV_TMP%" >nul
for /f "usebackq tokens=3" %%v in ("%FCA_JV_TMP%") do if not defined JV set "JV=%%~v"
del "%FCA_JV_TMP%" >nul 2>nul
exit /b 0
