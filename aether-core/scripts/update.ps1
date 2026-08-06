# AETHER Update Script (PowerShell)
# Updates existing self-hosted installation

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "=== AETHER Update Script ===" -ForegroundColor Cyan
Write-Host ""

# Backup before update
function Backup-Data {
    Write-Host "Creating backup before update..."
    & "$ScriptDir\backup.ps1"
    Write-Host ""
}

# Pull latest changes
function Update-Code {
    Write-Host "Pulling latest code..."
    Set-Location $ProjectRoot
    
    if (Test-Path .git) {
        git pull
        Write-Host "✓ Code updated" -ForegroundColor Green
    } else {
        Write-Host "⚠ Not a git repository - skipping code pull" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Update Docker images
function Update-Images {
    Write-Host "Pulling latest Docker images..."
    Set-Location $ProjectRoot
    docker-compose pull
    Write-Host "✓ Images updated" -ForegroundColor Green
    Write-Host ""
}

# Update dependencies
function Update-Dependencies {
    Write-Host "Updating dependencies..."
    
    # Backend
    Set-Location "$ProjectRoot\backend"
    npm install
    Write-Host "✓ Backend dependencies updated" -ForegroundColor Green
    
    # Frontend
    Set-Location "$ProjectRoot\frontend"
    npm install
    Write-Host "✓ Frontend dependencies updated" -ForegroundColor Green
    
    Write-Host ""
}

# Run database migrations
function Update-Database {
    Write-Host "Running database migrations..."
    Set-Location "$ProjectRoot\backend"
    
    npx prisma generate
    npx prisma migrate deploy
    
    Write-Host "✓ Database migrations complete" -ForegroundColor Green
    Write-Host ""
}

# Restart services
function Restart-Services {
    Write-Host "Restarting services..."
    Set-Location $ProjectRoot
    
    docker-compose down
    docker-compose up -d
    
    Write-Host "✓ Services restarted" -ForegroundColor Green
    Write-Host ""
}

# Show status
function Show-Status {
    Write-Host "=== Update Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "AETHER has been updated and is running at:"
    Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
    Write-Host "  Backend:  http://localhost:9000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Check logs for any issues:"
    Write-Host "  docker-compose logs -f"
    Write-Host ""
}

# Main update flow
try {
    Write-Host "This will update your AETHER installation."
    Write-Host "A backup will be created automatically."
    Write-Host ""
    
    $response = Read-Host "Continue? (y/N)"
    
    if ($response -notmatch '^[Yy]$') {
        Write-Host "Update cancelled"
        exit 0
    }
    
    Backup-Data
    Update-Code
    Update-Images
    Update-Dependencies
    Update-Database
    Restart-Services
    Show-Status
}
catch {
    Write-Host "Update failed: $_" -ForegroundColor Red
    exit 1
}
