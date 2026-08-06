# AETHER Backup Script (PowerShell)
# Creates backup of database and volumes

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectRoot "backups" }
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupName = "aether_backup_$Timestamp"

Write-Host "=== AETHER Backup Script ===" -ForegroundColor Cyan
Write-Host ""

# Create backup directory
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# Backup database
function Backup-Database {
    Write-Host "Backing up PostgreSQL database..."
    
    Set-Location $ProjectRoot
    
    # Export database using pg_dump
    docker-compose exec -T postgres pg_dump -U postgres -d aether_core | Out-File -FilePath "$BackupDir\${BackupName}_db.sql" -Encoding UTF8
    
    Write-Host "✓ Database backed up to: ${BackupName}_db.sql" -ForegroundColor Green
    Write-Host ""
}

# Backup volumes
function Backup-Volumes {
    Write-Host "Backing up Docker volumes..."
    
    Set-Location $ProjectRoot
    
    # Create tarball of volumes
    docker run --rm `
        -v aether_core_postgres_data:/data/postgres:ro `
        -v aether_core_redis_data:/data/redis:ro `
        -v aether_core_ollama_data:/data/ollama:ro `
        -v "${BackupDir}:/backup" `
        alpine tar czf "/backup/${BackupName}_volumes.tar.gz" /data
    
    Write-Host "✓ Volumes backed up to: ${BackupName}_volumes.tar.gz" -ForegroundColor Green
    Write-Host ""
}

# Backup .env
function Backup-Environment {
    Write-Host "Backing up environment configuration..."
    
    $envPath = Join-Path $ProjectRoot ".env"
    if (Test-Path $envPath) {
        Copy-Item $envPath "$BackupDir\${BackupName}_env"
        Write-Host "✓ .env backed up to: ${BackupName}_env" -ForegroundColor Green
    } else {
        Write-Host "⚠ No .env file found" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Create manifest
function New-Manifest {
    $manifestContent = @"
AETHER Backup Manifest
Created: $(Get-Date)
Backup name: $BackupName

Files:
- ${BackupName}_db.sql (PostgreSQL dump)
- ${BackupName}_volumes.tar.gz (Docker volumes)
- ${BackupName}_env (Environment configuration)

To restore:
.\scripts\restore.ps1 $BackupName

"@
    
    Set-Content -Path "$BackupDir\${BackupName}_manifest.txt" -Value $manifestContent
    
    Write-Host "✓ Manifest created" -ForegroundColor Green
    Write-Host ""
}

# Show summary
function Show-Summary {
    Write-Host "=== Backup Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Backup location: $BackupDir"
    Write-Host "Backup name: $BackupName"
    Write-Host ""
    Write-Host "Files created:"
    Get-ChildItem "$BackupDir\${BackupName}*" | Format-Table Name, Length
    Write-Host ""
    Write-Host "To restore this backup:"
    Write-Host "  .\scripts\restore.ps1 $BackupName"
    Write-Host ""
}

# Main backup flow
try {
    Backup-Database
    Backup-Volumes
    Backup-Environment
    New-Manifest
    Show-Summary
}
catch {
    Write-Host "Backup failed: $_" -ForegroundColor Red
    exit 1
}
