#!/usr/bin/env bash
set -euo pipefail

# AETHER Install Script (Bash)
# Self-hosted installation for Linux/macOS environments

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== AETHER Self-Hosted Installer ==="
echo ""

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    local missing=()
    
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing+=("docker-compose")
    fi
    
    if ! command -v node &> /dev/null; then
        missing+=("node (v18+)")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        echo "ERROR: Missing required tools: ${missing[*]}"
        echo ""
        echo "Please install:"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        echo "  - Node.js 18+: https://nodejs.org/"
        exit 1
    fi
    
    echo "✓ Prerequisites OK"
    echo ""
}

# Generate .env if not exists
setup_env() {
    echo "Setting up environment configuration..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo "✓ Created .env from .env.example"
        else
            # Minimal .env template
            cat > .env <<EOF
# AETHER Core Configuration
NODE_ENV=production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=aether_core
DATABASE_URL_DOCKER=postgresql://postgres:postgres@postgres:5432/aether_core?schema=public

# API Keys (generate secure values)
AETHER_API_KEY=$(openssl rand -hex 32)
HIVE_MIND_SALT=$(openssl rand -hex 32)

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
EOF
            echo "✓ Created new .env with generated secrets"
        fi
    else
        echo "✓ .env already exists"
    fi
    
    echo ""
}

# Pull Docker images
pull_images() {
    echo "Pulling Docker images..."
    cd "$PROJECT_ROOT"
    docker-compose pull
    echo "✓ Images pulled"
    echo ""
}

# Initialize database
init_database() {
    echo "Initializing database..."
    cd "$PROJECT_ROOT"
    
    # Start postgres only
    docker-compose up -d postgres
    
    # Wait for postgres
    echo "Waiting for PostgreSQL..."
    sleep 5
    
    # Run migrations
    cd backend
    npm install --production=false
    npx prisma generate
    npx prisma migrate deploy
    
    echo "✓ Database initialized"
    echo ""
}

# Start services
start_services() {
    echo "Starting AETHER services..."
    cd "$PROJECT_ROOT"
    
    docker-compose up -d
    
    echo ""
    echo "✓ Services started"
    echo ""
}

# Show status
show_status() {
    echo "=== Installation Complete ==="
    echo ""
    echo "AETHER is running at:"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:9000"
    echo "  Jaeger:   http://localhost:16686"
    echo ""
    echo "Database (PostgreSQL):"
    echo "  Host:     localhost:15432"
    echo "  User:     postgres"
    echo "  Database: aether_core"
    echo ""
    echo "Useful commands:"
    echo "  docker-compose ps        # Show service status"
    echo "  docker-compose logs -f   # View logs"
    echo "  docker-compose down      # Stop all services"
    echo "  ./scripts/backup.sh      # Backup data"
    echo ""
    echo "Next steps:"
    echo "  1. Open http://localhost:5173"
    echo "  2. Review docs/observability-runbook.md for monitoring setup"
    echo "  3. Review docs/backup-restore-runbook.md for backup procedures"
    echo ""
}

# Main installation flow
main() {
    check_prerequisites
    setup_env
    pull_images
    init_database
    start_services
    show_status
}

main "$@"
