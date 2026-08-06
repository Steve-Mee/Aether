#!/usr/bin/env bash
set -euo pipefail

# AETHER Update Script (Bash)
# Updates existing self-hosted installation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== AETHER Update Script ==="
echo ""

# Backup before update
backup_data() {
    echo "Creating backup before update..."
    "$SCRIPT_DIR/backup.sh"
    echo ""
}

# Pull latest changes
pull_code() {
    echo "Pulling latest code..."
    cd "$PROJECT_ROOT"
    
    if [ -d .git ]; then
        git pull
        echo "✓ Code updated"
    else
        echo "⚠ Not a git repository - skipping code pull"
    fi
    
    echo ""
}

# Update Docker images
update_images() {
    echo "Pulling latest Docker images..."
    cd "$PROJECT_ROOT"
    docker-compose pull
    echo "✓ Images updated"
    echo ""
}

# Update dependencies
update_dependencies() {
    echo "Updating dependencies..."
    
    # Backend
    cd "$PROJECT_ROOT/backend"
    npm install
    echo "✓ Backend dependencies updated"
    
    # Frontend
    cd "$PROJECT_ROOT/frontend"
    npm install
    echo "✓ Frontend dependencies updated"
    
    echo ""
}

# Run database migrations
migrate_database() {
    echo "Running database migrations..."
    cd "$PROJECT_ROOT/backend"
    
    npx prisma generate
    npx prisma migrate deploy
    
    echo "✓ Database migrations complete"
    echo ""
}

# Restart services
restart_services() {
    echo "Restarting services..."
    cd "$PROJECT_ROOT"
    
    docker-compose down
    docker-compose up -d
    
    echo "✓ Services restarted"
    echo ""
}

# Show status
show_status() {
    echo "=== Update Complete ==="
    echo ""
    echo "AETHER has been updated and is running at:"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:9000"
    echo ""
    echo "Check logs for any issues:"
    echo "  docker-compose logs -f"
    echo ""
}

# Main update flow
main() {
    echo "This will update your AETHER installation."
    echo "A backup will be created automatically."
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Update cancelled"
        exit 0
    fi
    
    backup_data
    pull_code
    update_images
    update_dependencies
    migrate_database
    restart_services
    show_status
}

main "$@"
