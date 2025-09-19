@echo off
chcp 932 >nul 2>&1
echo Test Case Converter - Startup Script
echo ================================================

REM Check virtual environment existence
if not exist venv (
    echo Error: Virtual environment not found.
    echo Please run install.bat first.
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Failed to activate virtual environment.
    pause
    exit /b 1
)

REM Check dependencies
echo Checking dependencies...
call venv\Scripts\activate.bat
python -c "import fastapi, uvicorn, openpyxl, pydantic, jinja2" >nul 2>&1
if errorlevel 1 (
    echo Error: Required dependencies are not installed.
    echo Please run install.bat again.
    pause
    exit /b 1
)

REM Start server
echo.
echo Starting server...
echo Please access http://localhost:8000 in your browser.
echo.
echo Press Ctrl+C to stop the server.
echo ================================================

REM Open browser after 5 seconds
start /b timeout /t 5 /nobreak >nul 2>&1
if not errorlevel 1 start http://localhost:8000

REM Start server
cd /d "%~dp0.."
call venv\Scripts\activate.bat
python -m app.server.main
