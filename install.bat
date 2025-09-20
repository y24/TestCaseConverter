@echo off
chcp 932 >nul 2>&1
echo Test Case Converter - Installation Script
echo ================================================

REM Python version check
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed.
    echo Please install Python 3.11 or higher.
    pause
    exit /b 1
)

echo Checking Python version...
python --version

REM Create virtual environment
echo.
echo Creating virtual environment...
if exist venv (
    echo Removing existing virtual environment...
    rmdir /s /q venv
)

python -m venv venv
if errorlevel 1 (
    echo Error: Failed to create virtual environment.
    pause
    exit /b 1
)

REM Activate virtual environment
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Failed to activate virtual environment.
    pause
    exit /b 1
)

REM Install dependencies
echo.
echo Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)

REM Create config directory
echo.
echo Creating config directory...
if not exist config mkdir config

REM Create logs directory
if not exist logs mkdir logs

echo.
echo ================================================
echo Installation completed!
echo.
echo Usage:
echo   1. Run run.bat to start the server
echo   2. Access http://localhost:8000 in your browser
echo.
echo Note: Browser will open automatically on first startup.
echo ================================================
pause
