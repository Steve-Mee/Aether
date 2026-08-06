#!/usr/bin/env bash
set -euo pipefail

# AETHER Backup Script (Bash)
# Creates backup of database and volumes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="aether_backup_$TIMESTAMP"

echo "=== AETHER Backup Script ==="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
backup_database() {
    echo "Backing up PostgreSQL database..."
    
    cd "$PROJECT_ROOT"
    
    # Export database using pg_dump
    docker-compose exec -T postgres pg_dump -U postgres -d aether_core > "$BACKUP_DIR/${BACKUP_NAME}_db.sql"
    
    echo "✓ Database backed up to: ${BACKUP_NAME}_db.sql"
    echo ""
}

# Backup volumes
backup_volumes() {
    echo "Backing up Docker volumes..."
    
    cd "$PROJECT_ROOT"
    
    # Create tarball of volumes
    docker run --rm \
        -v aether_core_postgres_data:/data/postgres:ro \
        -v aether_core_redis_data:/data/redis:ro \
        -v aether_core_ollama_data:/data/ollama:ro \
        -v "$BACKUP_DIR:/backup" \
        alpine tar czf "/backup/${BACKUP_NAME}_volumes.tar.gz" /data
    
    echo "✓ Volumes backed up to: ${BACKUP_NAME}_volumes.tar.gz"
    echo ""
}

# Backup .env
backup_env() {
    echo "Backing up environment configuration..."
    
    if [ -f "$PROJECT_ROOT/.env" ]; then
        cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/${BACKUP_NAME}_env"
        echo "✓ .env backed up to: ${BACKUP_NAME}_env"
    else
        echo "⚠ No .env file found"
    fi
    
    echo ""
}

# Create manifest
create_manifest() {
    cat > "$BACKUP_DIR/${BACKUP_NAME}_manifest.txt" <<EOF
AETHER Backup Manifest
Created: $(date)
Backup name: $BACKUP_NAME

Files:
- ${BACKUP_NAME}_db.sql (PostgreSQL dump)
- ${BACKUP_NAME}_volumes.tar.gz (Docker volumes)
- ${BACKUP_NAME}_env (Environment configuration)

To restore:
./scripts/restore.sh $BACKUP_NAME

EOF
    
    echo "✓ Manifest created"
    echo ""
}

# Show summary
show_summary() {
    echo "=== Backup Complete ==="
    echo ""
    echo "Backup location: $BACKUP_DIR"
    echo "Backup name: $BACKUP_NAME"
    echo ""
    echo "Files created:"
    ls -lh "$BACKUP_DIR/${BACKUP_NAME}"*
    echo ""
    echo "To restore this backup:"
    echo "  ./scripts/restore.sh $BACKUP_NAME"
    echo ""
}

# Main backup flow
main() {
    backup_database
    backup_volumes
    backup_env
    create_manifest
    show_summary
}

main "$@"
