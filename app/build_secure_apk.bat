@echo off
echo =========================================================================
echo Building CarQConnect Secure Release APK
echo Obfuscation: ENABLED (--obfuscate)
echo Symbols Directory: build/app/outputs/symbols
echo =========================================================================

:: Clean any orphaned Windows Gradle lock files before building
if exist "android\.gradle\noVersion\buildLogic.lock" del /f /q "android\.gradle\noVersion\buildLogic.lock" 2>nul
for /r "android\.gradle" %%f in (*.lock) do del /f /q "%%f" 2>nul

flutter build apk --release --obfuscate --split-debug-info=build/app/outputs/symbols %*

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Secure APK successfully built at:
    echo build\app\outputs\flutter-apk\app-release.apk
    echo Obfuscation symbols saved at:
    echo build\app\outputs\symbols
) else (
    echo.
    echo [ERROR] Build failed with error code %ERRORLEVEL%
)

