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
# Still on app server (Web SSH)

# Install Node.js 20 (or your preferred version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm and PM2 globally
npm install -g pnpm pm2

# Create app directory and logs folder
# NOTE: Jelastic/CloudSigma standard app path is /home/jelastic/ROOT
# We will use this path instead of /opt/events-crm
mkdir -p /home/jelastic/ROOT/logs
```

### Step 2.2b: Generate Deployment SSH Key

Since we are deploying via GitHub Actions, we need an SSH key pair specifically for deployment.

1. **Generate a new SSH key pair locally** (do not use your personal key):
   ```bash
   ssh-keygen -t ed25519 -C "deploy_key" -f deploy_key
   ```
   This creates `deploy_key` (private) and `deploy_key.pub` (public).

2. **Add Public Key to Server**:
   - Go to your CloudSigma/Jelastic dashboard.
   - Navigate to **Settings > SSH Access**.
   - Click **Add Public Key**.
   - Paste the contents of `deploy_key.pub`.

3. **Add Private Key to GitHub Secrets**:
   - Go to your GitHub Repo > **Settings > Secrets and variables > Actions**.
   - Create new Repository Secrets:
     - `SSH_PRIVATE_KEY`: Paste the contents of `deploy_key`.
     - `SSH_HOST`: Your environment domain (e.g., `node12345-env-123456.paas.v2.sa` or public IP).
     - `SSH_USER`: Usually `nodes` or specific ID (e.g., `7002` or `nodejs`). Check dashboard.
     - `SSH_PORT`: `22` (or `3022` if using the Gate).

### Step 2.3: Create Databases on PostgreSQL Server

Access the PostgreSQL database via **phpPgAdmin** (link in dashboard email) or Web SSH.

**Note:** If using phpPgAdmin, execute these commands **individually** to avoid "CREATE DATABASE cannot run inside a transaction block" errors.

```sql
-- 1. Create databases
CREATE DATABASE events_crm_dev;
CREATE DATABASE events_crm_test;
CREATE DATABASE events_crm_prod;

-- 2. Create users (replace 'your_secure_password' with actual passwords)
CREATE USER events_dev WITH PASSWORD 'your_secure_password';
CREATE USER events_test WITH PASSWORD 'your_secure_password';
CREATE USER events_prod WITH PASSWORD 'your_secure_password';

-- 3. Grant privileges
GRANT ALL PRIVILEGES ON DATABASE events_crm_dev TO events_dev;
GRANT ALL PRIVILEGES ON DATABASE events_crm_test TO events_test;
GRANT ALL PRIVILEGES ON DATABASE events_crm_prod TO events_prod;

-- 4. Grant schema ownership (Critical for migrations)
\c events_crm_prod
ALTER SCHEMA public OWNER TO events_prod;
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

## PHASE 3: First Deployment via GitHub Actions

We use GitHub Actions to build locally (saving server resources) and `rsync` artifacts to the server.

### Step 3.1: Verify Workflow Configuration

Ensure `.github/workflows/deploy.yml` is configured correctly. Key requirements for Jelastic/CloudSigma:

1.  **Target Directory**: Must be `/home/jelastic/ROOT/`.
2.  **Rsync Exclusions**: Crucial to prevent deleting logs and dependencies.
    ```yaml
    ARGS: "-rlgoDzvc -i --delete --exclude=logs --exclude=node_modules --exclude=.env.local"
    ```
3.  **Artifacts to Copy**:
    - `.next`, `public`, `package.json`, `pnpm-lock.yaml`, `ecosystem.config.js`, `next.config.ts`
    - **CRITICAL for Worker**: `server`, `lib`, `hooks`, `messages`, `i18n`, `types`, `env.ts`, `drizzle.config.ts`
    - *Note: `tsx` runs backend code directly from source, so these folders must exist on the server.*

### Step 3.2: Push to Production

```bash
git checkout prod
git merge dev
git push origin prod
```

This triggers the workflow:
1.  Installs dependencies & builds Next.js.
2.  Copies artifacts to `/home/jelastic/ROOT/`.
3.  Runs `pnpm install --frozen-lockfile` on the server (to get runtime deps).
4.  Restarts PM2.

### Step 3.3: Verify Deployment & Port

1.  **Check Logs**:
    ```bash
    cd /home/jelastic/ROOT
    pm2 logs events-crm-web --lines 50
    ```
2.  **Verify Port**:
    - Ensure the app is listening on **Port 8080**.
    - `ecosystem.config.js` should have: `PORT: 8080`.
    - Logs should show: `- Local: http://localhost:8080`.

### Step 3.4: Seed Database (First Time Only)

Once code is deployed:

```bash
# On server
cd /home/jelastic/ROOT
pnpm db:migrate
pnpm db:seed
```

---

## PHASE 4: Worker Configuration

The Email Worker runs as a separate process alongside the web app.

### Step 4.1: Check Worker Status

```bash
pm2 list
# events-crm-worker should be "online"
```

### Step 4.2: Troubleshooting Worker

If `events-crm-worker` is **errored**:
1.  Check error logs: `cat logs/worker-error.log`.
2.  Common issue: Missing source files (`lib`, `env.ts`) causing `Cannot find module` errors.
3.  Common issue: Path aliases (`@/`) failing if `tsconfig.json` is missing.

**Manual Test Command**:
```bash
# Run worker manually to see immediate errors
./node_modules/.bin/tsx server/workers/email-worker.ts
```

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

### App won't start / URL Unreachable?

1.  **Check Port**: App MUST listen on **8080** (CloudSigma default).
    ```bash
    pm2 logs events-crm-web
    # Should see: "Local: http://localhost:8080"
    ```
2.  **Check `ecosystem.config.js`**: Ensure `PORT: 8080` is set.

### Worker Error / "Cannot find module"?

The worker uses `tsx` to run TypeScript code directly. It requires all imported source files to be present on the server.

1.  **Check Files**: Verify `lib/`, `server/`, `hooks/`, `env.ts` exist in `/home/jelastic/ROOT/`.
2.  **Run Manually**:
    ```bash
    ./node_modules/.bin/tsx server/workers/email-worker.ts
    ```

### Logs missing or empty?

If `logs/` folder is missing, `rsync` might have deleted it.
- Check `deploy.yml`: Ensure `logs` is in `--exclude`.
- Recreate manually: `mkdir -p logs`.

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
