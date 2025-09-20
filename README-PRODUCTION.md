# 🚀 Zeth Rivarola Photography - Production Deployment System

## 📋 Complete Production Infrastructure

This repository contains a **production-ready, enterprise-grade photography client gallery system** with comprehensive deployment infrastructure. The system has been designed for professional photographers who need a secure, scalable, and feature-rich client gallery solution.

---

## ✨ System Overview

### Core Application Features
- **🎨 Professional Photography Gallery** - Collections, photo management, client access
- **📸 RAW Photo Processing** - Professional-grade RAW file processing with real-time controls
- **❤️ Client Features** - Favorites, downloads with PIN security, watermarking
- **🔒 Secure Sharing** - Password-protected galleries, expiring links
- **👥 User Management** - Authentication, roles, client access control

### Production Infrastructure Features
- **🐳 Docker Containerization** - Multi-service orchestration with Docker Compose
- **🔐 Security Hardened** - Non-root containers, encrypted connections, security headers
- **⚡ Auto-Scaling Ready** - Load balancer support, external storage, caching layer
- **📊 Monitoring & Health Checks** - Comprehensive health endpoints, logging, metrics
- **💾 Automated Backups** - Database backups with S3 integration and encryption
- **🔧 Operations Tools** - Automated deployment, maintenance scripts, monitoring

---

## 🏛️ Architecture

### Technology Stack
```
Frontend:    Next.js 15 + TypeScript + TailwindCSS + shadcn/ui
Backend:     Next.js API Routes + Prisma ORM
Database:    PostgreSQL 16 with optimized configuration
Caching:     Redis 7 for sessions and application caching
Storage:     MinIO (S3-compatible) for photos and assets
Runtime:     Bun for optimal JavaScript performance
Proxy:       Nginx with SSL termination and security headers
```

### Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │ -> │   Next.js App   │ -> │   PostgreSQL    │
│    (Nginx)      │    │   (Gallery)     │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                v                       v
                       ┌─────────────────┐    ┌─────────────────┐
                       │      Redis      │    │     MinIO       │
                       │   (Caching)     │    │   (Storage)     │
                       └─────────────────┘    └─────────────────┘
```

---

## 📁 Production Files Structure

```
zeth-rivarola-photography/
├── 📁 src/                     # Application source code
│   ├── 📁 app/                 # Next.js 15 app directory
│   ├── 📁 components/          # React components
│   ├── 📁 lib/                 # Utilities and configurations
│   └── 📁 api/                 # API routes
├── 📁 deployment/              # Production configuration files
│   ├── 📄 .env.production      # Production environment template
│   ├── 📄 init-db.sql          # Database initialization script
│   ├── 📄 nginx.conf           # Reverse proxy configuration
│   ├── 🔧 backup.sh            # Database backup script
│   └── 🔧 restore.sh           # Database restore script
├── 📄 Dockerfile               # Multi-stage production build
├── 📄 docker-compose.yml       # Main orchestration
├── 📄 docker-compose.prod.yml  # Production overrides
├── 🔧 deploy.sh               # Automated deployment script
├── 🔧 maintenance.sh          # Operations management
└── 📄 DEPLOYMENT.md           # Detailed deployment docs
```

---

## 🚀 Quick Start Guide

### Option 1: Automated Production Deployment (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd zeth-rivarola-photography

# 2. Make scripts executable
chmod +x deploy.sh maintenance.sh

# 3. Deploy with domain and SSL (Let's Encrypt)
./deploy.sh -d yourdomain.com -e admin@yourdomain.com -l -n

# 4. Check deployment status
./maintenance.sh status

# 5. Access your gallery
# https://yourdomain.com
```

### Option 2: Development Deployment

```bash
# Quick development setup (no SSL)
./deploy.sh --dev

# Access at: http://localhost:3000
```

### Option 3: Manual Production Setup

```bash
# 1. Configure environment
cp deployment/.env.production .env.production
nano .env.production  # Edit with your settings

# 2. Deploy services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Check health
curl http://localhost:3000/api/health
```

---

## ⚙️ Configuration Options

### Core Environment Variables

```bash
# Application
NODE_ENV=production
APP_VERSION=1.0.0
PORT=3000

# Database
DATABASE_URL="postgresql://gallery_user:secure_password@postgres:5432/gallery_db"
POSTGRES_DB=gallery_db
POSTGRES_USER=gallery_user
POSTGRES_PASSWORD=secure_password

# Security
NEXTAUTH_SECRET="your-super-secure-secret-key"
JWT_SECRET="your-jwt-secret-key"

# Storage (MinIO/S3)
STORAGE_TYPE="s3"
S3_BUCKET="gallery-photos"
S3_ACCESS_KEY="minio_access_key"
S3_SECRET_KEY="minio_secret_key"
S3_ENDPOINT="http://minio:9000"

# Caching
REDIS_URL="redis://redis:6379"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

---

## 🔐 Security Features

### ✅ Implemented Security Measures

#### Container Security
- **Non-root users** in all containers
- **Minimal base images** (Alpine Linux)
- **Resource limits** to prevent DoS attacks
- **Health checks** for service monitoring

#### Network Security
- **Internal Docker networking** with service isolation
- **Rate limiting** on all public endpoints
- **SSL/TLS encryption** with strong cipher suites
- **Security headers** (HSTS, CSP, X-Frame-Options)

#### Application Security
- **JWT authentication** with secure token handling
- **CSRF protection** on all forms
- **XSS prevention** with Content Security Policy
- **SQL injection protection** via Prisma ORM

#### Data Security
- **Encrypted database connections**
- **Secure environment variable management**
- **Backup encryption** capabilities
- **Access control** and role-based permissions

---

## 📊 Operations & Monitoring

### Health Monitoring

```bash
# Check all services
./maintenance.sh status

# Monitor performance for 2 minutes
./maintenance.sh monitor 120

# View application logs
./maintenance.sh logs app 100

# Follow logs in real-time
./maintenance.sh follow app
```

### Application Health Endpoint

```bash
# Comprehensive health check
curl https://yourdomain.com/api/health | jq

# Returns:
# - Service status
# - Database connectivity
# - File system access
# - Memory usage
# - Response times
```

### Service Management

```bash
# Restart services
./maintenance.sh restart app
./maintenance.sh restart postgres
./maintenance.sh restart redis

# Update application
./maintenance.sh update

# Security scan
./maintenance.sh security

# System cleanup
./maintenance.sh cleanup
```

---

## 💾 Backup & Recovery

### Automated Backup System

```bash
# Manual backup
./deployment/backup.sh

# Backup with S3 upload
S3_BACKUP_BUCKET="your-backup-bucket" ./deployment/backup.sh

# Scheduled backups (add to crontab)
0 2 * * * /path/to/zeth-rivarola-photography/deployment/backup.sh
```

### Backup Features
- ✅ **Compressed SQL dumps** with gzip
- ✅ **S3 integration** for off-site storage
- ✅ **Backup verification** and integrity checks
- ✅ **Retention management** with automatic cleanup
- ✅ **Encryption support** for sensitive data

### Recovery Procedures

```bash
# List available backups
ls -la backups/

# Restore from local backup
./deployment/restore.sh backups/gallery_backup_2024-01-15_10-30-00.sql.gz

# Restore from S3
S3_BACKUP_BUCKET="your-backup-bucket" ./deployment/restore.sh latest
```

---

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### Application Won't Start
```bash
# Check service status
docker compose ps

# View logs
./maintenance.sh logs app 100

# Common fixes:
# - Verify environment variables
# - Check database connectivity
# - Ensure proper file permissions
```

#### Database Connection Issues
```bash
# Check PostgreSQL
docker compose exec postgres pg_isready

# Test connection
docker compose exec postgres psql -U gallery_user -d gallery_db -c "SELECT 1;"

# Reset database (CAUTION: DATA LOSS)
docker compose down
docker volume rm zeth-gallery_postgres_data
docker compose up -d
```

#### File Upload Problems
```bash
# Check permissions
ls -la uploads/

# Fix permissions
sudo chown -R 1001:1001 uploads/
sudo chmod -R 755 uploads/

# Check MinIO
curl http://localhost:9000/minio/health/live
```

#### SSL Certificate Issues
```bash
# Check certificate
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Renew certificate
sudo certbot renew

# Test SSL
curl -I https://yourdomain.com
```

---

## 📈 Scaling & Performance

### Performance Optimization

```bash
# Database maintenance
./maintenance.sh db maintenance

# Update statistics
docker compose exec postgres psql -U gallery_user -d gallery_db -c "ANALYZE;"

# Redis optimization
docker compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Horizontal Scaling

The system supports scaling through:
- **Load balancer integration** (Nginx upstream)
- **Database connection pooling**
- **Stateless application design**
- **External storage** (MinIO/S3)
- **Cache layer separation** (Redis)

---

## 🔄 Complete Rebuild Instructions

### Scenario 1: Fresh Server Deployment

```bash
# 1. Prepare server
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git curl

# 2. Clone and configure
git clone <repository-url>
cd zeth-rivarola-photography
cp deployment/.env.production .env.production
# Edit .env.production with your settings

# 3. Deploy with SSL
./deploy.sh -d yourdomain.com -e admin@yourdomain.com -l -n

# 4. Restore data (if needed)
./deployment/restore.sh /path/to/backup.sql.gz
```

### Scenario 2: Disaster Recovery

```bash
# 1. Fresh system setup
# (same as above)

# 2. Restore from backup
./deployment/restore.sh latest

# 3. Verify restoration
./maintenance.sh status
curl https://yourdomain.com/api/health
```

### Scenario 3: Migration to New Server

```bash
# On OLD server:
./deployment/backup.sh

# On NEW server:
# 1. Follow fresh deployment steps
# 2. Restore data and files
# 3. Update DNS to new server
```

---

## 🎯 Production Readiness Checklist

### ✅ Security
- [ ] All default passwords changed
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] Security headers configured in Nginx
- [ ] Regular security updates scheduled

### ✅ Performance
- [ ] Database optimized and indexed
- [ ] Redis caching configured
- [ ] File storage optimized (CDN ready)
- [ ] Load testing completed
- [ ] Resource limits configured

### ✅ Monitoring
- [ ] Health checks responding correctly
- [ ] Log aggregation configured
- [ ] Backup procedures tested
- [ ] Monitoring alerts configured
- [ ] Performance baselines established

### ✅ Operations
- [ ] Documentation updated and accessible
- [ ] Team trained on deployment procedures
- [ ] Incident response plan documented
- [ ] Backup and recovery procedures tested
- [ ] Maintenance schedules established

---

## 📞 Support & Maintenance

### Key Documentation Files
- **📄 DEPLOYMENT.md** - Detailed deployment documentation
- **📄 README-PRODUCTION.md** - This production guide (you are here)
- **📄 database/schema.sql** - Complete database schema
- **📄 .env.production** - Production environment template

### Essential Commands

```bash
# Service Management
./maintenance.sh status          # Check all services
./maintenance.sh restart app     # Restart application
./maintenance.sh update         # Update to latest version

# Database Operations
./maintenance.sh db status      # Database statistics
./maintenance.sh db backup      # Create backup
./maintenance.sh db maintenance # Run maintenance

# System Operations
./maintenance.sh monitor 120    # Monitor for 2 minutes
./maintenance.sh security       # Security scan
./maintenance.sh cleanup        # System cleanup
```

### Emergency Procedures

```bash
# Service failures
docker compose restart <service-name>

# Database issues
./maintenance.sh db status
./deployment/restore.sh latest_backup.sql.gz

# Application issues
./maintenance.sh logs app 200
./maintenance.sh restart app

# Security incidents
./maintenance.sh security
docker compose down  # If needed
```

---

## 🎉 Success!

**Your Zeth Rivarola Photography gallery system is now production-ready with:**

- ✅ **Enterprise-grade security** and monitoring
- ✅ **Automated deployment** and maintenance tools
- ✅ **Comprehensive backup** and recovery systems
- ✅ **Professional RAW processing** capabilities
- ✅ **Scalable infrastructure** ready for growth
- ✅ **Complete documentation** for operations

The system is designed to handle professional photography workflows with the reliability and security required for client-facing services.

---

**🚀 Ready to serve your photography clients with a world-class gallery experience!**
