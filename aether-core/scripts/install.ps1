# AETHER Install Script (PowerShell)
# Self-hosted installation for Windows environments

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "=== AETHER Self-Hosted Installer ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
function Test-Prerequisites {
    Write-Host "Checking prerequisites..."
    
    $missing = @()
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        $missing += "docker"
    }
    
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue) -and 
        -not (docker compose version 2>$null)) {
        $missing += "docker-compose"
    }
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $missing += "node (v18+)"
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "ERROR: Missing required tools: $($missing -join ', ')" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install:"
        Write-Host "  - Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
        Write-Host "  - Node.js 18+: https://nodejs.org/"
        exit 1
    }
    
    Write-Host "✓ Prerequisites OK" -ForegroundColor Green
    Write-Host ""
}

# Generate random hex string
function New-RandomHex {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
}

# Generate .env if not exists
function Initialize-Environment {
    Write-Host "Setting up environment configuration..."
    
    Set-Location $ProjectRoot
    
    if (-not (Test-Path .env)) {
        if (Test-Path .env.example) {
            Copy-Item .env.example .env
            Write-Host "✓ Created .env from .env.example" -ForegroundColor Green
        } else {
            # Minimal .env template
            $envContent = @"
# AETHER Core Configuration
NODE_ENV=production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(New-RandomHex -Length 16)
POSTGRES_DB=aether_core
DATABASE_URL_DOCKER=postgresql://postgres:postgres@postgres:5432/aether_core?schema=public

# API Keys (generate secure values)
AETHER_API_KEY=$(New-RandomHex -Length 32)
HIVE_MIND_SALT=$(New-RandomHex -Length 32)

# Tenant
AETHER_DEFAULT_TENANT=tenant_default

# Ollama
OLLAMA_BASE_URL_DOCKER=http://ollama:11434
OLLAMA_EMBED_MODEL=nomic-embed-text

# Intelligence
INTELLIGENCE_EMBEDDING=ollama
INTELLIGENCE_VECTOR_BACKEND=pgvector
INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED=false

# Redis
REDIS_URL=redis://redis:6379

# Message Broker
MESSAGE_BROKER=none
EVENT_BUS_MODE=inprocess

# Observability (optional - add your Sentry DSN)
# VITE_SENTRY_DSN=
# SENTRY_DSN=
# OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces

# Frontend
VITE_API_URL=http://localhost:9000
VITE_AETHER_TENANT=tenant_default

# SSO (Enterprise - optional)
SSO_OIDC_ENABLED=false
# SSO_OIDC_ISSUER=
# SSO_OIDC_CLIENT_ID=
# SSO_OIDC_CLIENT_SECRET=
"@
            Set-Content -Path .env -Value $envContent
            Write-Host "✓ Created new .env with generated secrets" -ForegroundColor Green
        }
    } else {
        Write-Host "✓ .env already exists" -ForegroundColor Green
    }
    
    Write-Host ""
}

# Pull Docker images
function Get-DockerImages {
    Write-Host "Pulling Docker images..."
    Set-Location $ProjectRoot
    docker-compose pull
    Write-Host "✓ Images pulled" -ForegroundColor Green
    Write-Host ""
}

# Initialize database
function Initialize-Database {
    Write-Host "Initializing database..."
    Set-Location $ProjectRoot
    
    # Start postgres only
    docker-compose up -d postgres
    
    # Wait for postgres
    Write-Host "Waiting for PostgreSQL..."
    Start-Sleep -Seconds 5
    
    # Run migrations
    Set-Location backend
    npm install --production=false
    npx prisma generate
    npx prisma migrate deploy
    
    Write-Host "✓ Database initialized" -ForegroundColor Green
    Write-Host ""
}

# Start services
function Start-Services {
    Write-Host "Starting AETHER services..."
    Set-Location $ProjectRoot
    
    docker-compose up -d
    
    Write-Host ""
    Write-Host "✓ Services started" -ForegroundColor Green
    Write-Host ""
}

# Show status
function Show-Status {
    Write-Host "=== Installation Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "AETHER is running at:"
    Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
    Write-Host "  Backend:  http://localhost:9000" -ForegroundColor Yellow
    Write-Host "  Jaeger:   http://localhost:16686" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Database (PostgreSQL):"
    Write-Host "  Host:     localhost:15432"
    Write-Host "  User:     postgres"
    Write-Host "  Database: aether_core"
    Write-Host ""
    Write-Host "Useful commands:"
    Write-Host "  docker-compose ps        # Show service status"
    Write-Host "  docker-compose logs -f   # View logs"
    Write-Host "  docker-compose down      # Stop all services"
    Write-Host "  .\scripts\backup.ps1     # Backup data"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Open http://localhost:5173"
    Write-Host "  2. Review docs\observability-runbook.md for monitoring setup"
    Write-Host "  3. Review docs\backup-restore-runbook.md for backup procedures"
    Write-Host ""
}

# Main installation flow
try {
    Test-Prerequisites
    Initialize-Environment
    Get-DockerImages
    Initialize-Database
    Start-Services
    Show-Status
}
catch {
    Write-Host "Installation failed: $_" -ForegroundColor Red
    exit 1
}
