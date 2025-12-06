# Events CRM - Deployment Guide

> Deploy to v2 Cloud SA (KSA-hosted infrastructure)

---

## Quick Reference

| Environment | Branch | Database | URL |
|-------------|--------|----------|-----|
| Development | `dev` | `events_crm_dev` | `https://dev.yourdomain.sa` |
| Staging | `test` | `events_crm_test` | `https://test.yourdomain.sa` |
| Production | `prod` | `events_crm_prod` | `https://yourdomain.sa` |

---

## 1. Database Migrations

### Schema Change Workflow

```bash
# 1. Edit schema files
#    server/db/schemas/*.ts

# 2. Generate migration
pnpm db:generate

# 3. Review generated SQL
cat server/db/migrations/*.sql

# 4. Test locally
pnpm db:migrate

# 5. Commit migration file
git add server/db/migrations/
git commit -m "Migration: add X to Y table"
```

### Key Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `pnpm db:generate` | Create migration from schema changes | After editing schemas |
| `pnpm db:migrate` | Apply pending migrations | On deploy (automatic) |
| `pnpm db:push` | Push schema directly (no migration) | **Local dev only** |
| `pnpm db:seed` | Seed roles/permissions | First deploy only |
| `pnpm db:studio` | Open Drizzle Studio GUI | Debugging |

### Golden Rules

1. **Always generate migrations** for schema changes
2. **Never modify existing migration files** - create new ones
3. **Never use `db:push` in test/prod** - it skips migration tracking
4. **Test migrations locally** before pushing

---

## 2. Git Branching Strategy

```
prod (production)
  ↑
test (staging)
  ↑
dev (development)
  ↑
feature/* (feature branches)
```

### Daily Workflow

```bash
# Feature development
git checkout dev && git pull
git checkout -b feature/my-feature
# ... make changes ...
pnpm db:generate  # if schema changed
git add . && git commit -m "Add feature"
git checkout dev && git merge feature/my-feature
git push origin dev  # → Deploys to DEV

# Promote to staging
git checkout test && git merge dev
git push origin test  # → Deploys to TEST

# Promote to production
git checkout prod && git merge test
git push origin prod  # → Deploys to PROD
```

---

## 3. Server Setup (One-Time)

### 3.1 Create Redis Node on PaaS

Create a managed Redis 7.x node in v2 Cloud SA (recommended over self-hosting):

1. Go to **NoSQL Databases** in v2 Cloud SA dashboard
2. Click **Create** and select **Redis 7.x**
3. Configure:
   - **Name**: `events-crm-redis` (or per environment: `events-crm-redis-dev`)
   - **Resources**: Start with 256MB RAM (scale as needed)
   - **Network**: Same VPC as app server (e.g., `10.100.2.x` range)
4. Note the **Private IP** and **Port** (default: 6379)
5. If password is required, note the **Auth Password**

**Verify connection** (from app server):
```bash
ssh user@10.100.2.248
redis-cli -h 10.100.2.XXX ping  # Replace XXX with Redis node IP
# Should return: PONG
```

**Why managed Redis?**
- Separation of concerns - app server focuses on running the application
- Easier maintenance - PaaS handles updates, monitoring, backups
- Better reliability - dedicated resources, no competition with app
- Scalability - upgrade Redis independently of app server

### 3.2 Install Dependencies

```bash
# Install pnpm and PM2 globally
npm install -g pnpm pm2

# Create logs directory
mkdir -p /opt/events-crm/logs
```

### 3.3 Create Databases

```sql
-- On PostgreSQL server (10.100.2.231)
CREATE DATABASE events_crm_dev;
CREATE DATABASE events_crm_test;
CREATE DATABASE events_crm_prod;

CREATE USER events_dev WITH PASSWORD 'xxx';
CREATE USER events_test WITH PASSWORD 'xxx';
CREATE USER events_prod WITH PASSWORD 'xxx';

GRANT ALL PRIVILEGES ON DATABASE events_crm_dev TO events_dev;
GRANT ALL PRIVILEGES ON DATABASE events_crm_test TO events_test;
GRANT ALL PRIVILEGES ON DATABASE events_crm_prod TO events_prod;
```

---

## 4. Environment Variables

Set these in v2 Cloud SA config panel (not in git):

```bash
# Database
DATABASE_URL=postgresql://user:pass@10.100.2.231:5432/events_crm_dev
DATABASE_SSL=true

# Redis (managed node on PaaS)
REDIS_URL=redis://10.100.2.XXX:6379
# Or with password: redis://:your-password@10.100.2.XXX:6379

# SMTP
SMTP_HOST=smtp.yourprovider.sa
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.sa

# Authentication
BETTER_AUTH_URL=https://yourdomain.sa
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Storage
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=me-south-1
S3_UPLOAD_BUCKET=your-bucket

# Public
NEXT_PUBLIC_APP_URL=https://yourdomain.sa
NODE_ENV=production

# Worker
WORKER_CONCURRENCY=5
SMTP_RATE_LIMIT=10
```

---

## 5. Git-Push-Deploy Setup

### 5.1 Install Add-On

1. Go to **Application Servers : Add-Ons** in v2 Cloud SA
2. Click **Install** on "Git-Push-Deploy Add-On"
3. Connect your GitHub/GitLab repository
4. Map branches to environments

### 5.2 Create Deploy Hook

Create `.deploy/post-receive` in project root:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

cd /opt/events-crm

# Install dependencies
pnpm install --frozen-lockfile

# Run database migrations
pnpm db:migrate

# Build application
pnpm build

# Restart services
pm2 restart ecosystem.config.js

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x .deploy/post-receive
```

---

## 6. First Deployment

```bash
# SSH into server
ssh user@10.100.2.248

# Clone and setup
git clone <your-repo> /opt/events-crm
cd /opt/events-crm
git checkout dev

# Install and build
pnpm install
pnpm db:migrate
pnpm db:seed  # First time only - creates roles/permissions
pnpm build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

---

## 7. PM2 Commands

```bash
pm2 status              # Check process status
pm2 logs                # View all logs
pm2 logs events-crm-web # View web logs only
pm2 monit               # Real-time monitoring
pm2 restart all         # Restart all processes
pm2 reload all          # Zero-downtime restart
pm2 stop all            # Stop all processes
```

---

## 8. Database Backups

```bash
# Create backup
pg_dump -h 10.100.2.231 -U events_prod events_crm_prod > backup_$(date +%Y%m%d).sql

# Restore backup
psql -h 10.100.2.231 -U events_prod events_crm_prod < backup_file.sql
```

### Automated Backup (cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -h 10.100.2.231 -U events_prod events_crm_prod > /backups/events_crm_$(date +\%Y\%m\%d).sql
```

---

## 9. Troubleshooting

### Migration Failed

```bash
# Check migration status
pnpm db:studio  # Opens GUI to inspect DB

# View migration history
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"
```

### App Won't Start

```bash
# Check PM2 logs
pm2 logs events-crm-web --lines 100

# Check if port is in use
lsof -i :3000

# Restart with fresh build
pm2 stop all
pnpm build
pm2 start ecosystem.config.js
```

### Worker Not Processing Jobs

```bash
# Check worker logs
pm2 logs events-crm-worker

# Verify Redis connection (use Redis node IP)
redis-cli -h 10.100.2.XXX ping

# Check queue status (in app code or Drizzle Studio)
```

---

## 10. Deployment Checklist

### Before First Deploy
- [ ] Redis 7.x node created on PaaS (same VPC as app server)
- [ ] Databases created (dev, test, prod)
- [ ] Environment variables configured
- [ ] Git-Push-Deploy add-on installed
- [ ] SSL certificate configured (Let's Encrypt add-on)

### For Each Release
- [ ] Schema changes have migration files
- [ ] Tested locally with fresh DB
- [ ] Migration files committed
- [ ] Pushed to dev → verified
- [ ] Merged to test → verified
- [ ] Merged to prod → verified

---

## Quick Commands Cheatsheet

```bash
# Local Development
docker-compose up -d          # Start local services
pnpm dev                      # Start dev server
pnpm db:studio                # Database GUI

# Schema Changes
pnpm db:generate              # Generate migration
pnpm db:migrate               # Apply migration

# Deployment
git push origin dev           # Deploy to dev
git checkout test && git merge dev && git push origin test  # Deploy to test
git checkout prod && git merge test && git push origin prod # Deploy to prod

# Server Management
pm2 status                    # Check status
pm2 logs                      # View logs
pm2 restart all               # Restart services
```
