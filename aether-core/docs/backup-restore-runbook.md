# Backup & Restore Runbook — AETHER

Guide for backing up and restoring self-hosted AETHER installations.

## Overview

AETHER backups include:
- **PostgreSQL database** (schemas, data, migrations)
- **Docker volumes** (Ollama models, Redis data, PostgreSQL data)
- **Environment configuration** (.env file with secrets)

## Prerequisites

- Running AETHER installation (docker-compose stack)
- Disk space for backups (database + volumes can be several GB)
- Docker and docker-compose installed

## Quick Start

### Create Backup

**Linux/macOS:**
```bash
cd aether-core
./scripts/backup.sh
```

**Windows:**
```powershell
cd aether-core
.\scripts\backup.ps1
```

### Restore from Backup

**Linux/macOS:**
```bash
cd aether-core
./scripts/restore.sh aether_backup_20260801_120000
```

**Windows:**
```powershell
cd aether-core
.\scripts\restore.ps1 aether_backup_20260801_120000
```

## Backup Strategy

### Recommended Schedule

| Environment | Frequency | Retention |
|-------------|-----------|-----------|
| **Production** | Daily (automated) | 30 days |
| **Staging** | Weekly | 14 days |
| **Development** | Manual before updates | 3 backups |

### Automated Backups (Linux/macOS)

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/aether-core && ./scripts/backup.sh >> /var/log/aether-backup.log 2>&1
```

**Windows Task Scheduler:**

```powershell
# Create scheduled task (run as Administrator)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\aether-core\scripts\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "AETHER Backup" -Description "Daily AETHER backup"
```

### Custom Backup Location

```bash
# Linux/macOS
export BACKUP_DIR=/mnt/backups/aether
./scripts/backup.sh

# Windows
$env:BACKUP_DIR = "D:\Backups\AETHER"
.\scripts\backup.ps1
```

## Backup Contents

Each backup creates 4 files:

```
backups/
├── aether_backup_20260801_120000_db.sql          # PostgreSQL dump
├── aether_backup_20260801_120000_volumes.tar.gz  # Docker volumes
├── aether_backup_20260801_120000_env             # Environment config
└── aether_backup_20260801_120000_manifest.txt    # Backup metadata
```

### Database Backup (`_db.sql`)

- Full PostgreSQL dump (pg_dump format)
- Includes all schemas, tables, data
- Human-readable SQL format
- Can be inspected with text editor

### Volumes Backup (`_volumes.tar.gz`)

- Compressed tarball of Docker volumes:
  - `postgres_data` — PostgreSQL data files
  - `redis_data` — Redis persistence
  - `ollama_data` — Ollama models (largest component)

### Environment Backup (`_env`)

- Copy of `.env` file
- Contains secrets (API keys, passwords)
- **Secure this file** — do not commit to version control

## Restore Process

### Pre-Restore Checklist

- [ ] Verify backup files exist and are not corrupted
- [ ] Backup current installation before restore (if possible)
- [ ] Ensure no active user sessions
- [ ] Notify users of maintenance window

### Restore Steps

The restore script performs these operations:

1. **Stop services** — shuts down all containers
2. **Restore database** — drops and recreates DB, imports SQL
3. **Restore volumes** — extracts volume data
4. **Restore .env** — replaces environment config (backs up current)
5. **Start services** — brings stack back online

### Restore Safety

- Restore script requires explicit confirmation (`yes`)
- Current `.env` is backed up before replacement
- Process can be interrupted before confirmation

## Advanced Operations

### Partial Restore (Database Only)

```bash
cd aether-core

# Start postgres
docker-compose up -d postgres

# Restore database manually
docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS aether_core;"
docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE aether_core;"
docker-compose exec -T postgres psql -U postgres -d aether_core < backups/aether_backup_20260801_120000_db.sql

# Run migrations (if upgrading)
cd backend
npx prisma migrate deploy
```

### Cross-Server Migration

To migrate AETHER to a new server:

1. Create backup on old server
2. Copy backup files to new server:
   ```bash
   scp -r backups/aether_backup_* user@newserver:/path/to/aether-core/backups/
   ```
3. Install AETHER on new server (see `scripts/install.sh`)
4. Restore from backup on new server
5. Update DNS/load balancer to point to new server

### Disaster Recovery

If only database backup exists (no volumes):

1. Restore database using restore script
2. Ollama will re-download models on first use (time-consuming)
3. Redis will rebuild cache from database queries

## Backup Verification

### Test Restore (Staging)

Periodically test restores in staging:

```bash
# Create backup
./scripts/backup.sh

# In staging environment
./scripts/restore.sh <backup_name>

# Verify:
# - Frontend loads (http://localhost:5173)
# - Login works
# - Products/orders visible
# - Commands can be executed
```

### Backup Size Monitoring

```bash
# Linux/macOS
du -sh backups/

# Windows
Get-ChildItem backups | Measure-Object -Property Length -Sum
```

Expected sizes:
- Database: 10 MB - 1 GB (depends on data volume)
- Volumes: 2 GB - 10 GB (Ollama models are largest)
- Total: 2-11 GB per backup

## Retention & Cleanup

### Manual Cleanup

```bash
# Remove backups older than 30 days (Linux/macOS)
find backups/ -name "aether_backup_*" -mtime +30 -delete

# Windows
Get-ChildItem backups -Filter "aether_backup_*" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item
```

### Automated Retention Script

**Linux/macOS** (`scripts/cleanup-backups.sh`):

```bash
#!/usr/bin/env bash
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS=${RETENTION_DAYS:-30}

find "$BACKUP_DIR" -name "aether_backup_*" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"
```

Add to crontab:
```bash
# Weekly cleanup on Sunday at 3 AM
0 3 * * 0 cd /path/to/aether-core && ./scripts/cleanup-backups.sh
```

## Off-Site Backup

For production deployments, store backups off-site:

### Cloud Storage (AWS S3)

```bash
# Install AWS CLI
# Configure: aws configure

# Sync backups to S3
aws s3 sync backups/ s3://my-aether-backups/ --exclude "*" --include "aether_backup_*"
```

### Encrypted Remote Backup

```bash
# Create encrypted backup
tar czf - backups/aether_backup_20260801_120000* | \
  openssl enc -aes-256-cbc -pbkdf2 -out aether_backup_20260801_120000.tar.gz.enc

# Transfer to remote server
scp aether_backup_20260801_120000.tar.gz.enc backup-server:/backups/

# Restore (on target):
openssl enc -d -aes-256-cbc -pbkdf2 -in aether_backup_20260801_120000.tar.gz.enc | tar xzf -
```

## Troubleshooting

### Backup Script Fails

**Error: "Cannot connect to Docker daemon"**
- Ensure Docker is running: `docker ps`
- Check user permissions: add user to `docker` group

**Error: "pg_dump: connection failed"**
- Ensure postgres container is running: `docker-compose ps postgres`
- Check DATABASE_URL in `.env`

### Restore Script Fails

**Error: "Backup not found"**
- Verify backup files exist in `backups/` directory
- Check backup name format: `aether_backup_YYYYMMDD_HHMMSS`

**Error: "Database restore failed"**
- Check PostgreSQL logs: `docker-compose logs postgres`
- Verify backup file is not corrupted: `head backups/aether_backup_*_db.sql`

### Incomplete Restore

If restore partially completes:

1. Stop services: `docker-compose down -v`
2. Clean volumes: `docker volume prune`
3. Re-run restore script
4. Check logs for specific errors

## Security Considerations

1. **Encrypt backups** — especially `.env` files containing secrets
2. **Secure backup storage** — restrict access to backup directory
3. **Rotate secrets** — after restoring to new environment, regenerate API keys
4. **Audit backup access** — log who creates/restores backups

## Monitoring

Add monitoring for backup health:

```bash
# Check last backup age
last_backup=$(ls -t backups/aether_backup_*_manifest.txt | head -1)
age_hours=$(( ($(date +%s) - $(stat -c %Y "$last_backup")) / 3600 ))

if [ $age_hours -gt 36 ]; then
  echo "WARNING: Last backup is $age_hours hours old"
  # Alert via email/Slack/PagerDuty
fi
```

## Related Documentation

- `scripts/install.sh` — Initial installation
- `scripts/update.sh` — Update existing installation
- `observability-runbook.md` — Monitoring setup
- `monitoring-dashboard-guide.md` — Dashboard configuration

## Support

For backup issues:
1. Check script logs
2. Verify disk space: `df -h`
3. Review Docker logs: `docker-compose logs`
4. Consult AETHER documentation
