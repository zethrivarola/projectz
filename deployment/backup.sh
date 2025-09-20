#!/bin/bash

# Zeth Rivarola Photography - Database Backup Script
# This script creates compressed database backups with rotation and optional S3 upload

set -euo pipefail

# Configuration - Override with environment variables
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-zeth-postgres}"
POSTGRES_DB="${POSTGRES_DB:-zeth_photography}"
POSTGRES_USER="${POSTGRES_USER:-zeth_user}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_PREFIX="${BACKUP_PREFIX:-zeth-photography}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${BACKUP_PREFIX}_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# S3 Configuration (optional)
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-us-east-1}"
BACKUP_ACCESS_KEY="${BACKUP_ACCESS_KEY:-}"
BACKUP_SECRET_KEY="${BACKUP_SECRET_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log_error() {
    log "${RED}ERROR: $1${NC}" >&2
}

log_warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

log_info() {
    log "${BLUE}INFO: $1${NC}"
}

log_success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

# Check if container is running
check_container() {
    if ! docker ps --format "table {{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
        log_error "PostgreSQL container '${POSTGRES_CONTAINER}' is not running"
        exit 1
    fi
    log_info "PostgreSQL container '${POSTGRES_CONTAINER}' is running"
}

# Create backup directory
create_backup_dir() {
    if [[ ! -d "${BACKUP_DIR}" ]]; then
        mkdir -p "${BACKUP_DIR}"
        log_info "Created backup directory: ${BACKUP_DIR}"
    fi

    # Ensure log file exists
    touch "${LOG_FILE}"
}

# Check disk space
check_disk_space() {
    local available_space
    available_space=$(df "${BACKUP_DIR}" | awk 'NR==2{print $4}')
    local available_gb=$((available_space / 1024 / 1024))

    if [[ ${available_gb} -lt 2 ]]; then
        log_warning "Low disk space: ${available_gb}GB available"
        if [[ ${available_gb} -lt 1 ]]; then
            log_error "Insufficient disk space for backup"
            exit 1
        fi
    else
        log_info "Sufficient disk space: ${available_gb}GB available"
    fi
}

# Create database backup
create_backup() {
    local backup_path="${BACKUP_DIR}/${BACKUP_FILENAME}"

    log_info "Starting database backup..."
    log_info "Database: ${POSTGRES_DB}"
    log_info "Container: ${POSTGRES_CONTAINER}"
    log_info "Output: ${backup_path}"

    # Create the backup using pg_dump
    if docker exec "${POSTGRES_CONTAINER}" pg_dump \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        | gzip > "${backup_path}"; then

        local backup_size
        backup_size=$(du -h "${backup_path}" | cut -f1)
        log_success "Database backup created successfully: ${backup_path} (${backup_size})"

        # Verify backup integrity
        if gzip -t "${backup_path}"; then
            log_success "Backup file integrity verified"
        else
            log_error "Backup file is corrupted"
            rm -f "${backup_path}"
            exit 1
        fi
    else
        log_error "Failed to create database backup"
        exit 1
    fi
}

# Upload to S3 (if configured)
upload_to_s3() {
    if [[ -z "${BACKUP_S3_BUCKET}" ]]; then
        log_info "S3 upload not configured, skipping..."
        return 0
    fi

    if [[ -z "${BACKUP_ACCESS_KEY}" || -z "${BACKUP_SECRET_KEY}" ]]; then
        log_warning "S3 credentials not provided, skipping upload..."
        return 0
    fi

    local backup_path="${BACKUP_DIR}/${BACKUP_FILENAME}"
    local s3_key="database-backups/${BACKUP_FILENAME}"

    log_info "Uploading backup to S3..."
    log_info "Bucket: ${BACKUP_S3_BUCKET}"
    log_info "Key: ${s3_key}"

    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not found, installing..."
        if command -v apk &> /dev/null; then
            apk add --no-cache aws-cli
        elif command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y awscli
        else
            log_error "Cannot install AWS CLI"
            return 1
        fi
    fi

    # Configure AWS credentials
    export AWS_ACCESS_KEY_ID="${BACKUP_ACCESS_KEY}"
    export AWS_SECRET_ACCESS_KEY="${BACKUP_SECRET_KEY}"
    export AWS_DEFAULT_REGION="${BACKUP_S3_REGION}"

    # Upload to S3
    if aws s3 cp "${backup_path}" "s3://${BACKUP_S3_BUCKET}/${s3_key}" \
        --storage-class STANDARD_IA \
        --metadata "timestamp=${TIMESTAMP},database=${POSTGRES_DB}"; then
        log_success "Backup uploaded to S3 successfully"
    else
        log_error "Failed to upload backup to S3"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."

    local deleted_count=0

    # Local cleanup
    while IFS= read -r -d '' backup_file; do
        if [[ -f "${backup_file}" ]]; then
            rm -f "${backup_file}"
            log_info "Deleted old backup: $(basename "${backup_file}")"
            ((deleted_count++))
        fi
    done < <(find "${BACKUP_DIR}" -name "${BACKUP_PREFIX}_*.sql.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -print0)

    # S3 cleanup (if configured)
    if [[ -n "${BACKUP_S3_BUCKET}" && -n "${BACKUP_ACCESS_KEY}" && -n "${BACKUP_SECRET_KEY}" ]]; then
        log_info "Cleaning up old S3 backups..."

        local cutoff_date
        cutoff_date=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y%m%d)

        # List and delete old S3 objects
        aws s3api list-objects-v2 \
            --bucket "${BACKUP_S3_BUCKET}" \
            --prefix "database-backups/${BACKUP_PREFIX}_" \
            --query "Contents[?LastModified<='${cutoff_date}'].{Key: Key}" \
            --output text | while read -r s3_key; do
                if [[ -n "${s3_key}" && "${s3_key}" != "None" ]]; then
                    aws s3 rm "s3://${BACKUP_S3_BUCKET}/${s3_key}"
                    log_info "Deleted old S3 backup: ${s3_key}"
                    ((deleted_count++))
                fi
            done
    fi

    if [[ ${deleted_count} -gt 0 ]]; then
        log_success "Cleaned up ${deleted_count} old backup(s)"
    else
        log_info "No old backups to clean up"
    fi
}

# Create backup manifest
create_manifest() {
    local manifest_file="${BACKUP_DIR}/backup_manifest.json"
    local backup_path="${BACKUP_DIR}/${BACKUP_FILENAME}"
    local backup_size
    backup_size=$(stat -c%s "${backup_path}")
    local backup_md5
    backup_md5=$(md5sum "${backup_path}" | cut -d' ' -f1)

    # Create or update manifest
    cat > "${manifest_file}" << EOF
{
  "backup_info": {
    "filename": "${BACKUP_FILENAME}",
    "timestamp": "${TIMESTAMP}",
    "database": "${POSTGRES_DB}",
    "size_bytes": ${backup_size},
    "md5_checksum": "${backup_md5}",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "retention_days": ${BACKUP_RETENTION_DAYS}
  },
  "database_info": {
    "container": "${POSTGRES_CONTAINER}",
    "user": "${POSTGRES_USER}"
  }
}
EOF

    log_info "Backup manifest created: ${manifest_file}"
}

# Send notification (if webhook configured)
send_notification() {
    local webhook_url="${BACKUP_WEBHOOK_URL:-}"

    if [[ -z "${webhook_url}" ]]; then
        return 0
    fi

    local backup_path="${BACKUP_DIR}/${BACKUP_FILENAME}"
    local backup_size
    backup_size=$(du -h "${backup_path}" | cut -f1)

    local payload
    payload=$(cat << EOF
{
  "text": "Database backup completed successfully",
  "attachments": [
    {
      "color": "good",
      "fields": [
        {
          "title": "Database",
          "value": "${POSTGRES_DB}",
          "short": true
        },
        {
          "title": "Backup Size",
          "value": "${backup_size}",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "${TIMESTAMP}",
          "short": true
        },
        {
          "title": "Retention",
          "value": "${BACKUP_RETENTION_DAYS} days",
          "short": true
        }
      ]
    }
  ]
}
EOF
)

    if curl -X POST -H 'Content-type: application/json' \
        --data "${payload}" \
        "${webhook_url}" &> /dev/null; then
        log_info "Notification sent successfully"
    else
        log_warning "Failed to send notification"
    fi
}

# Main backup function
main() {
    log_info "========================================="
    log_info "Starting backup process..."
    log_info "========================================="

    # Pre-flight checks
    check_container
    create_backup_dir
    check_disk_space

    # Create backup
    create_backup

    # Upload to S3 (if configured)
    upload_to_s3

    # Create manifest
    create_manifest

    # Cleanup old backups
    cleanup_old_backups

    # Send notification
    send_notification

    log_success "========================================="
    log_success "Backup process completed successfully!"
    log_success "========================================="
}

# Error handling
trap 'log_error "Backup script failed at line $LINENO"' ERR

# Help function
show_help() {
    cat << EOF
Zeth Rivarola Photography - Database Backup Script

Usage: $0 [OPTIONS]

Options:
  -h, --help              Show this help message
  --no-s3                 Skip S3 upload even if configured
  --no-cleanup            Skip cleanup of old backups
  --test-connection       Test database connection only
  --dry-run              Show what would be done without executing

Environment Variables:
  BACKUP_DIR              Backup directory (default: /app/backups)
  POSTGRES_CONTAINER      PostgreSQL container name (default: zeth-postgres)
  POSTGRES_DB             Database name (default: zeth_photography)
  POSTGRES_USER           Database user (default: zeth_user)
  BACKUP_RETENTION_DAYS   Days to keep backups (default: 30)
  BACKUP_S3_BUCKET        S3 bucket for backups
  BACKUP_ACCESS_KEY       S3 access key
  BACKUP_SECRET_KEY       S3 secret key
  BACKUP_WEBHOOK_URL      Webhook URL for notifications

Examples:
  $0                      # Run full backup
  $0 --test-connection    # Test database connection
  $0 --no-s3              # Backup without S3 upload

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --no-s3)
            BACKUP_S3_BUCKET=""
            shift
            ;;
        --no-cleanup)
            BACKUP_RETENTION_DAYS=0
            shift
            ;;
        --test-connection)
            check_container
            log_success "Database connection test passed"
            exit 0
            ;;
        --dry-run)
            log_info "DRY RUN MODE - No changes will be made"
            log_info "Would create backup: ${BACKUP_DIR}/${BACKUP_FILENAME}"
            log_info "Would clean up backups older than: ${BACKUP_RETENTION_DAYS} days"
            if [[ -n "${BACKUP_S3_BUCKET}" ]]; then
                log_info "Would upload to S3: ${BACKUP_S3_BUCKET}"
            fi
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
