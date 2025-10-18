# Ticket Management System Startup Script
# This script starts both the server and client for the ticket management application

Write-Host "🎫 Starting Ticket Management System..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Check if we're in the correct directory
$currentDir = Get-Location
if ($currentDir.Path -notlike "*ITDB") {
    Write-Host "❌ Error: Please run this script from the ITDB directory" -ForegroundColor Red
    exit 1
}

# Check if ticket-app directory exists
if (-not (Test-Path "ticket-app")) {
    Write-Host "❌ Error: ticket-app directory not found" -ForegroundColor Red
    exit 1
}

# Check if database exists
if (-not (Test-Path "data\english_support_tickets.db")) {
    Write-Host "⚠️  Warning: Database not found at data\english_support_tickets.db" -ForegroundColor Yellow
    Write-Host "   You may need to run: python create_db.py" -ForegroundColor Yellow
    Write-Host ""
}

# Function to start server
function Start-Server {
    Write-Host "🚀 Starting Server (Port 3001)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir\ticket-app\server'; Write-Host '🔧 Server Terminal' -ForegroundColor Magenta; npm run dev"
}

# Function to start client
function Start-Client {
    Write-Host "🚀 Starting Client (Port 5173)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir\ticket-app\client'; Write-Host '💻 Client Terminal' -ForegroundColor Blue; npm run dev"
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if dependencies are installed
Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan

$serverPackageJson = "ticket-app\server\package.json"
$clientPackageJson = "ticket-app\client\package.json"
$serverNodeModules = "ticket-app\server\node_modules"
$clientNodeModules = "ticket-app\client\node_modules"

if (-not (Test-Path $serverNodeModules)) {
    Write-Host "⚠️  Server dependencies not installed. Installing..." -ForegroundColor Yellow
    Set-Location "ticket-app\server"
    npm install
    Set-Location $currentDir
}

if (-not (Test-Path $clientNodeModules)) {
    Write-Host "⚠️  Client dependencies not installed. Installing..." -ForegroundColor Yellow
    Set-Location "ticket-app\client"
    npm install
    Set-Location $currentDir
}

Write-Host "✅ Dependencies ready!" -ForegroundColor Green
Write-Host ""

# Start the applications
Write-Host "🎬 Launching applications..." -ForegroundColor Cyan
Write-Host ""

Start-Server
Start-Sleep -Seconds 2
Start-Client

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✨ Ticket Management System Started!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Server:  http://localhost:3001" -ForegroundColor Yellow
Write-Host "🌐 Client:  http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Two new terminal windows have been opened." -ForegroundColor Gray
Write-Host "Close those windows or press Ctrl+C in them to stop the services." -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit this script (services will continue running)..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "👋 Script finished. Services are still running in separate windows." -ForegroundColor Green
