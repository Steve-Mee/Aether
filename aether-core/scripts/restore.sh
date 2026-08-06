#!/usr/bin/env bash
set -euo pipefail

# AETHER Restore Script (Bash)
# Restores from backup created by backup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_name>"
    echo ""
    echo "Available backups:"
    ls -1 "$BACKUP_DIR"/*_manifest.txt 2>/dev/null | sed 's/_manifest.txt$//' | xargs -n1 basename || echo "  (none)"
    exit 1
fi

BACKUP_NAME="$1"

echo "=== AETHER Restore Script ==="
echo ""

# Verify backup exists
verify_backup() {
    if [ ! -f "$BACKUP_DIR/${BACKUP_NAME}_db.sql" ]; then
        echo "ERROR: Backup not found: $BACKUP_NAME"
        exit 1
    fi
    
    echo "Found backup: $BACKUP_NAME"
    echo ""
}

# Confirm restore
confirm_restore() {
    echo "WARNING: This will overwrite your current data!"
    echo ""
    read -p "Are you sure you want to restore from '$BACKUP_NAME'? (yes/NO) " -r
    echo ""
    
    if [ "$REPLY" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi
}

# Stop services
stop_services() {
    echo "Stopping services..."
    cd "$PROJECT_ROOT"
    docker-compose down
    echo "✓ Services stopped"
    echo ""
}

# Restore database
restore_database() {
    echo "Restoring database..."
    
    cd "$PROJECT_ROOT"
    
    # Start postgres only
    docker-compose up -d postgres
    sleep 5
    
    # Drop and recreate database
    docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS aether_core;"
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE aether_core;"
    
    # Restore from backup
    docker-compose exec -T postgres psql -U postgres -d aether_core < "$BACKUP_DIR/${BACKUP_NAME}_db.sql"
    
    echo "✓ Database restored"
    echo ""
}

# Restore volumes
restore_volumes() {
    if [ ! -f "$BACKUP_DIR/${BACKUP_NAME}_volumes.tar.gz" ]; then
        echo "⚠ Volume backup not found, skipping"
        echo ""
        return
    fi
    
    echo "Restoring volumes..."
    
    cd "$PROJECT_ROOT"
    
    # Stop containers using volumes
    docker-compose down -v
    
    # Restore volumes
    docker run --rm \
        -v aether_core_postgres_data:/data/postgres \
        -v aether_core_redis_data:/data/redis \
        -v aether_core_ollama_data:/data/ollama \
        -v "$BACKUP_DIR:/backup" \
        alpine sh -c "cd / && tar xzf /backup/${BACKUP_NAME}_volumes.tar.gz"
    
    echo "✓ Volumes restored"
    echo ""
}

# Restore .env
restore_env() {
    if [ ! -f "$BACKUP_DIR/${BACKUP_NAME}_env" ]; then
        echo "⚠ .env backup not found, skipping"
        echo ""
        return
    fi
    
    echo "Restoring environment configuration..."
    
    if [ -f "$PROJECT_ROOT/.env" ]; then
        mv "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.backup.$(date +%s)"
    fi
    
    cp "$BACKUP_DIR/${BACKUP_NAME}_env" "$PROJECT_ROOT/.env"
    
    echo "✓ .env restored (previous backed up)"
    echo ""
}

# Start services
start_services() {
    echo "Starting services..."
    cd "$PROJECT_ROOT"
    docker-compose up -d
    echo "✓ Services started"
    echo ""
}

# Show status
show_status() {
    echo "=== Restore Complete ==="
    echo ""
    echo "AETHER has been restored from: $BACKUP_NAME"
    echo ""
    echo "Services are running at:"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:9000"
    echo ""
}

# Main restore flow
main() {
    verify_backup
    confirm_restore
    stop_services
    restore_database
    restore_volumes
    restore_env
    start_services
    show_status
}

main "$@"
