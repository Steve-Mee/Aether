# AETHER Restore Script (PowerShell)
# Restores from backup created by backup.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectRoot "backups" }

if ($args.Count -eq 0) {
    Write-Host "Usage: .\restore.ps1 <backup_name>"
    Write-Host ""
    Write-Host "Available backups:"
    Get-ChildItem "$BackupDir\*_manifest.txt" -ErrorAction SilentlyContinue | ForEach-Object {
        $_.BaseName -replace '_manifest$'
    }
    exit 1
}

$BackupName = $args[0]

Write-Host "=== AETHER Restore Script ===" -ForegroundColor Cyan
Write-Host ""

# Verify backup exists
function Test-Backup {
    if (-not (Test-Path "$BackupDir\${BackupName}_db.sql")) {
        Write-Host "ERROR: Backup not found: $BackupName" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Found backup: $BackupName"
    Write-Host ""
}

# Confirm restore
function Confirm-Restore {
    Write-Host "WARNING: This will overwrite your current data!" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Are you sure you want to restore from '$BackupName'? (yes/NO)"
    
    if ($response -ne "yes") {
        Write-Host "Restore cancelled"
        exit 0
    }
}

# Stop services
function Stop-Services {
    Write-Host "Stopping services..."
    Set-Location $ProjectRoot
    docker-compose down
    Write-Host "✓ Services stopped" -ForegroundColor Green
    Write-Host ""
}

# Restore database
function Restore-Database {
    Write-Host "Restoring database..."
    
    Set-Location $ProjectRoot
    
    # Start postgres only
    docker-compose up -d postgres
    Start-Sleep -Seconds 5
    
    # Drop and recreate database
    docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS aether_core;"
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE aether_core;"
    
    # Restore from backup
    Get-Content "$BackupDir\${BackupName}_db.sql" | docker-compose exec -T postgres psql -U postgres -d aether_core
    
    Write-Host "✓ Database restored" -ForegroundColor Green
    Write-Host ""
}

# Restore volumes
function Restore-Volumes {
    if (-not (Test-Path "$BackupDir\${BackupName}_volumes.tar.gz")) {
        Write-Host "⚠ Volume backup not found, skipping" -ForegroundColor Yellow
        Write-Host ""
        return
    }
    
    Write-Host "Restoring volumes..."
    
    Set-Location $ProjectRoot
    
    # Stop containers using volumes
    docker-compose down -v
    
    # Restore volumes
    docker run --rm `
        -v aether_core_postgres_data:/data/postgres `
        -v aether_core_redis_data:/data/redis `
        -v aether_core_ollama_data:/data/ollama `
        -v "${BackupDir}:/backup" `
        alpine sh -c "cd / && tar xzf /backup/${BackupName}_volumes.tar.gz"
    
    Write-Host "✓ Volumes restored" -ForegroundColor Green
    Write-Host ""
}

# Restore .env
function Restore-Environment {
    if (-not (Test-Path "$BackupDir\${BackupName}_env")) {
        Write-Host "⚠ .env backup not found, skipping" -ForegroundColor Yellow
        Write-Host ""
        return
    }
    
    Write-Host "Restoring environment configuration..."
    
    $envPath = Join-Path $ProjectRoot ".env"
    if (Test-Path $envPath) {
        $timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
        Move-Item $envPath "$envPath.backup.$timestamp"
    }
    
    Copy-Item "$BackupDir\${BackupName}_env" $envPath
    
    Write-Host "✓ .env restored (previous backed up)" -ForegroundColor Green
    Write-Host ""
}

# Start services
function Start-Services {
    Write-Host "Starting services..."
    Set-Location $ProjectRoot
    docker-compose up -d
    Write-Host "✓ Services started" -ForegroundColor Green
    Write-Host ""
}

# Show status
function Show-Status {
    Write-Host "=== Restore Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "AETHER has been restored from: $BackupName"
    Write-Host ""
    Write-Host "Services are running at:"
    Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
    Write-Host "  Backend:  http://localhost:9000" -ForegroundColor Yellow
    Write-Host ""
}

# Main restore flow
try {
    Test-Backup
    Confirm-Restore
    Stop-Services
    Restore-Database
    Restore-Volumes
    Restore-Environment
    Start-Services
    Show-Status
}
catch {
    Write-Host "Restore failed: $_" -ForegroundColor Red
    exit 1
}
