# Events CRM - First-Time Deployment Guide

> Step-by-step guide for deploying Events CRM to v2 Cloud SA (KSA-hosted infrastructure)

---

## Current State Assessment

### What Exists

**One migration exists**: `0000_flippant_blue_marvel.sql` - contains only the **base template tables**:
- user, account, session, verification (auth)
- workspace, workspace_member, invitation (multi-tenancy)
- permission, role, role_permission (RBAC)
- notification, subscription, item, email_verification, ratelimit

### What's Missing from Migrations

These were added via `db:push` and need to be captured in a migration:
- event, guest_category, guest, rsvp_response, rsvp_form_template
- email_template, email_log, bulk_email_job
- guest_import_batch
- inventory_type, inventory_item, guest_inventory_allocation
- itinerary_template, itinerary_item, guest_itinerary
- workflow, workflow_step, approval_request
- communication
- Plus: workspace.branding column, new enums, indexes

### Files Status

| File | Status |
|------|--------|
| `ecosystem.config.js` | Exists |
| `.deploy/post-receive` | Needs to be created on server |
| `server/db/migrations/0001_*.sql` | Will be generated in Phase 1 |

---

## PHASE 1: Generate & Test Migrations (Local)

### Step 1.1: Generate the migration

```bash
# From your project root
pnpm db:generate
```

This will create a new migration file (e.g., `0001_xxx.sql`) containing all the Events CRM tables that were added via `db:push`.

### Step 1.2: Review what was generated

```bash
# List migration files
ls -la server/db/migrations/

# Review the new migration (look for CREATE TABLE statements)
cat server/db/migrations/0001_*.sql
```

You should see CREATE TABLE for: event, guest, guest_category, rsvp_response, email_template, email_log, bulk_email_job, etc.

### Step 1.3: Test migrations on fresh database

```bash
# Destroy and recreate local DB
docker-compose down -v
docker-compose up -d

# Wait a few seconds for PostgreSQL to start, then:
pnpm db:migrate   # Apply both migrations (0000 + 0001)
pnpm db:seed      # Create roles/permissions
```

### Step 1.4: Verify it worked

```bash
pnpm db:studio    # Open Drizzle Studio, check all tables exist
```

### Step 1.5: Commit the migration

```bash
git add server/db/migrations/
git status  # Verify only migration files are staged
git commit -m "Migration: add Events CRM domain schema (events, guests, RSVP, emails)"
git push origin dev
```

---

## PHASE 2: Server Infrastructure Setup

### Step 2.1: Create Redis Node on PaaS

Create a managed Redis 7.x node in v2 Cloud SA (recommended over self-hosting on app server):

1. Go to **NoSQL Databases** in v2 Cloud SA dashboard
2. Click **Create** and select **Redis 7.x**
3. Configure:
   - **Name**: `events-crm-redis-dev` (create separate nodes for test/prod)
   - **Resources**: Start with 256MB RAM (scale as needed)
   - **Network**: Same VPC as app server (e.g., `10.100.2.x` range)
4. Note the **Private IP** (e.g., `10.100.2.XXX`) and **Port** (default: 6379)
5. If password is required, note the **Auth Password**

**Verify connection** (from app server):
```bash
ssh user@10.100.2.248
redis-cli -h 10.100.2.XXX ping  # Replace XXX with your Redis node IP
# Should return: PONG
```

**Why managed Redis?**
- Separation of concerns - app server focuses on running the application
- Easier maintenance - PaaS handles updates, monitoring, backups
- Better reliability - dedicated resources, no competition with app processes
- Scalability - upgrade Redis independently of app server

### Step 2.2: Install Node.js, pnpm, PM2

```bash
# Still on app server (10.100.2.248)

# Install Node.js 20 (or your preferred version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm and PM2 globally
npm install -g pnpm pm2

# Create app directory and logs folder
sudo mkdir -p /opt/events-crm/logs
sudo chown -R $USER:$USER /opt/events-crm
```

### Step 2.3: Create Databases on PostgreSQL Server

```bash
ssh user@10.100.2.231

# Connect to PostgreSQL (may need sudo -u postgres psql)
psql -U postgres
```

```sql
-- Create databases
CREATE DATABASE events_crm_dev;
CREATE DATABASE events_crm_test;
CREATE DATABASE events_crm_prod;

-- Create users (replace 'your_secure_password' with actual passwords)
CREATE USER events_dev WITH PASSWORD 'your_secure_password';
CREATE USER events_test WITH PASSWORD 'your_secure_password';
CREATE USER events_prod WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE events_crm_dev TO events_dev;
GRANT ALL PRIVILEGES ON DATABASE events_crm_test TO events_test;
GRANT ALL PRIVILEGES ON DATABASE events_crm_prod TO events_prod;

-- Also grant schema permissions (PostgreSQL 15+ requirement)
\c events_crm_dev
GRANT ALL ON SCHEMA public TO events_dev;
\c events_crm_test
GRANT ALL ON SCHEMA public TO events_test;
\c events_crm_prod
GRANT ALL ON SCHEMA public TO events_prod;

\q
```

### Step 2.4: Configure Environment Variables

Set these in v2 Cloud SA config panel (NOT in git):

```bash
# Database (adjust for each environment)
DATABASE_URL=postgresql://events_dev:password@10.100.2.231:5432/events_crm_dev
DATABASE_SSL=false  # or true if using SSL between servers

# Redis (managed node on PaaS - use the private IP from Step 2.1)
REDIS_URL=redis://10.100.2.XXX:6379
# Or with password: redis://:your-password@10.100.2.XXX:6379

# SMTP (get from your provider)
SMTP_HOST=smtp.yourprovider.sa
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.sa

# Authentication
BETTER_AUTH_URL=https://dev.yourdomain.sa
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>

# Storage (S3 Bahrain region)
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=me-south-1
S3_UPLOAD_BUCKET=your-bucket

# Public
NEXT_PUBLIC_APP_URL=https://dev.yourdomain.sa
NODE_ENV=production

# Worker
WORKER_CONCURRENCY=5
SMTP_RATE_LIMIT=10
```

---

## PHASE 3: First Deployment to DEV

### Step 3.1: Clone repository on app server

```bash
ssh user@10.100.2.248
cd /opt
git clone <your-repo-url> events-crm
cd events-crm
git checkout dev
```

### Step 3.2: Install dependencies

```bash
pnpm install --frozen-lockfile
```

### Step 3.3: Run migrations and seed

```bash
pnpm db:migrate   # Apply all migrations to remote DB
pnpm db:seed      # Create roles/permissions (first time only)
```

### Step 3.4: Build the application

```bash
pnpm build
```

### Step 3.5: Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions it outputs to enable on boot
```

### Step 3.6: Verify everything is running

```bash
pm2 status              # Both processes should be "online"
pm2 logs --lines 50     # Check for errors
curl http://localhost:3000  # Should return HTML
```

---

## PHASE 4: Set Up Git-Push-Deploy (Optional but Recommended)

### Step 4.1: Create deploy hook directory

```bash
# On app server
mkdir -p /opt/events-crm/.deploy
```

### Step 4.2: Create post-receive hook

Create `/opt/events-crm/.deploy/post-receive`:

```bash
#!/bin/bash
set -e

echo "Starting deployment..."

cd /opt/events-crm

# Install dependencies
pnpm install --frozen-lockfile

# Run database migrations
pnpm db:migrate

# Build application
pnpm build

# Restart services
pm2 restart ecosystem.config.js

echo "Deployment complete!"
```

Make it executable:

```bash
chmod +x /opt/events-crm/.deploy/post-receive
```

### Step 4.3: Configure in v2 Cloud SA

1. Go to **Application Servers > Add-Ons**
2. Install "Git-Push-Deploy Add-On"
3. Connect your GitHub/GitLab repository
4. Map branches: `dev` > dev server, `test` > staging, `prod` > production

---

## PHASE 5: Promote to Staging & Production

### When dev is verified working

```bash
# Promote to staging
git checkout test
git merge dev
git push origin test  # Auto-deploys to TEST environment

# Verify staging works, then:
git checkout prod
git merge test
git push origin prod  # Auto-deploys to PROD environment
```

---

## Quick Troubleshooting

### Migration failed?

```bash
pnpm db:studio  # Inspect database state
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"
```

### App won't start?

```bash
pm2 logs events-crm-web --lines 100
lsof -i :3000  # Check if port is in use
```

### Worker not processing emails?

```bash
pm2 logs events-crm-worker
redis-cli -h 10.100.2.XXX ping  # Verify Redis connection (use your Redis node IP)
```

---

## Deployment Checklist

### Before First Deploy

- [ ] Redis 7.x node created on PaaS (same VPC as app server)
- [ ] Databases created (dev, test, prod)
- [ ] Environment variables configured in v2 Cloud SA
- [ ] Git-Push-Deploy add-on installed (optional)
- [ ] SSL certificate configured (Let's Encrypt add-on)
- [ ] Migration generated and committed

### For Each Release

- [ ] Schema changes have migration files
- [ ] Tested locally with fresh DB
- [ ] Migration files committed
- [ ] Pushed to dev and verified
- [ ] Merged to test and verified
- [ ] Merged to prod and verified

---

## Quick Reference

| Environment | Branch | Database | URL |
|-------------|--------|----------|-----|
| Development | `dev` | `events_crm_dev` | `https://dev.yourdomain.sa` |
| Staging | `test` | `events_crm_test` | `https://test.yourdomain.sa` |
| Production | `prod` | `events_crm_prod` | `https://yourdomain.sa` |

---

## See Also

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Ongoing deployment reference
- [ecosystem.config.js](../ecosystem.config.js) - PM2 configuration
