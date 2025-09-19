@echo off
echo 🚀 Starting Proctoring System Development Environment...

echo 📋 Checking prerequisites...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install it first.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install it first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed!

REM Create .env files if they don't exist
echo 📝 Setting up environment files...

if not exist "server\.env" (
    copy "server\env.example" "server\.env"
    echo ✅ Created server\.env
)

if not exist "app\.env" (
    copy "app\env.example" "app\.env"
    echo ✅ Created app\.env
)

REM Install dependencies
echo 📦 Installing dependencies...

echo Installing backend dependencies...
cd server
call npm install
cd ..

echo Installing Python dependencies...
cd app
call pip install -r requirements.txt
cd ..

echo Installing frontend dependencies...
cd client
call npm install
cd ..

echo 🎉 Setup complete!
echo.
echo To start the development environment, open 3 separate command prompts:
echo.
echo Command Prompt 1 - Backend:
echo   cd server ^&^& npm run dev
echo.
echo Command Prompt 2 - Python ML Service:
echo   cd app ^&^& uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
echo Command Prompt 3 - Frontend:
echo   cd client ^&^& npm run dev
echo.
echo Then open http://localhost:5173 in your browser
echo.
echo Or use Docker Compose for easier setup:
echo   docker-compose up -d
echo.
pause
