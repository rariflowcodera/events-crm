# Events CRM — Huawei Cloud (Saudi Arabia) Deployment Guide

> Minimal-footprint **production** deployment: **one ECS instance** running Postgres, Redis, the Next.js app, and the background workers. Sized for a real but modest production load — up to ~200 concurrent users, not a demo box.

This guide is written for *this* repo specifically: it uses `docker-compose.yml`, `ecosystem.config.js`, and the npm scripts already in `package.json`. It does not require the GitHub Actions/Jelastic pipeline described in `docs/DEPLOYMENT.md` — that's PaaS-specific and doesn't apply to a plain ECS box.

**Sizing note**: 200 concurrent users on a CRUD-heavy Next.js/tRPC app is a light-to-moderate load — a single well-specified ECS instance handles this comfortably. The real production risk at this scale isn't raw capacity, it's that **one box runs app + DB + cache + workers** — no redundancy. This guide sizes the instance with headroom and calls out the specific single-instance risks worth insuring against (backups, process supervision, disk monitoring, off-box DB dumps) even though it doesn't stand up HA infrastructure. If uptime SLAs matter, see the "upgrade later" section at the end.

---

## 0. Before you start

- **Region name**: Huawei Cloud's Saudi Arabia region is operated via the **SCCC joint venture** and may show up in the console as *"Saudi Arabia (Riyadh)"* or similar, depending on when your account was provisioned/whitelisted. Confirm the exact region code in **Huawei Cloud Console → top-left region selector** before provisioning — don't guess it from this doc.
- You need: a Huawei Cloud account with the KSA region enabled, a domain name you control (for TLS + `BETTER_AUTH_URL`), and SMTP credentials from a KSA-compliant email provider (Huawei doesn't provide SMTP itself).
- This app needs Node 20, PostgreSQL, and Redis at minimum (see `.env.example`).

---

## 1. Provision the ECS instance

In **Huawei Cloud Console → Elastic Cloud Server (ECS) → Buy ECS**:

| Setting | Recommended (200 concurrent users) |
|---|---|
| Region | Saudi Arabia region |
| AZ | Any available in that region |
| Image | Ubuntu 22.04 LTS (public image) |
| Flavor | 4 vCPU / 8 GB RAM (general-purpose family, e.g. `s6`/`c6` tier) |
| System disk | 80 GB SSD (EVS) — Postgres data + uploads + logs need room to grow |
| VPC | Create new (or reuse) — this is where Postgres/Redis will live privately |
| Security Group | Allow inbound 22 (SSH, restrict to your IP), 80, 443. Do **not** expose 5432/6379 publicly |
| EIP | Bind a new Elastic IP so you have a public address |
| Login | SSH key pair (download and keep the private key) |

Why 4 vCPU/8GB rather than the bare minimum: Postgres, Redis, the Next.js server, and two PM2 worker processes are all competing for RAM on one box. 8GB gives Postgres room for a reasonable `shared_buffers`/connection pool, leaves headroom for Next.js SSR under concurrent load, and avoids OOM-killing a worker mid-email-batch. You can start smaller and resize the ECS instance later if traffic stays light — Huawei ECS resizing is straightforward but requires a reboot, so right-sizing up front avoids a maintenance window.

Once running, note the EIP — you'll point DNS at it.

---

## 2. Point DNS

Create an `A` record for your domain (e.g. `events.yourdomain.sa`) pointing at the ECS EIP. TLS in step 6 depends on this resolving before you request a certificate.

---

## 3. Base server setup

SSH in (Ubuntu images typically use `root` or `ubuntu` on Huawei Cloud — check the image details):

```bash
ssh root@<EIP>

# System updates
apt update && apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# pnpm + PM2
npm install -g pnpm pm2

# Docker + Compose plugin (for Postgres/Redis)
apt install -y docker.io docker-compose-plugin
systemctl enable --now docker

# Nginx (reverse proxy) + Certbot (TLS)
apt install -y nginx certbot python3-certbot-nginx

# App directory
mkdir -p /opt/events-crm
```

---

## 4. Get the code onto the server

Simplest path for a single box — clone and pull on deploy:

```bash
cd /opt
git clone <your-repo-url> events-crm
cd events-crm
git checkout prod
```

If the repo is private, add a deploy key scoped to this server. **Don't reuse** `deploy_key`/`deploy_key.pub` that are already checked into this repo for the Jelastic pipeline — those are exposed in git history and shouldn't be trusted for a new production box. Generate a fresh key pair for this ECS instance.

---

## 5. Start Postgres + Redis (Docker Compose)

The repo's `docker-compose.yml` defines Postgres 16, Redis 7, and Mailpit for local dev. For production, drop Mailpit (you'll use real SMTP), set real passwords, and bind ports to localhost only. Create `docker-compose.prod.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: events-crm-postgres
    restart: unless-stopped
    shm_size: "256mb"
    environment:
      POSTGRES_USER: events_prod
      POSTGRES_PASSWORD: <strong-password>
      POSTGRES_DB: events_crm_prod
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: events-crm-redis
    restart: unless-stopped
    command: redis-server --requirepass <strong-redis-password>
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```bash
docker compose -f docker-compose.prod.yml up -d
```

Binding to `127.0.0.1` means Postgres/Redis are only reachable from the app on the same box — no need to touch the security group for them.

---

## 6. Configure environment variables

```bash
cd /opt/events-crm
cp .env.example .env.local
```

Edit `.env.local`:

```bash
DATABASE_URL=postgresql://events_prod:<strong-password>@localhost:5432/events_crm_prod
DATABASE_SSL=false

REDIS_URL=redis://:<strong-redis-password>@localhost:6379

SMTP_HOST=<your-smtp-provider-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass>
SMTP_FROM=noreply@yourdomain.sa

BETTER_AUTH_URL=https://events.yourdomain.sa
BETTER_AUTH_SECRET=<generate: openssl rand -base64 32>

# Local disk storage keeps this deploy minimal — avoids needing S3/OBS integration work
STORAGE_PROVIDER=local

NEXT_PUBLIC_APP_URL=https://events.yourdomain.sa

WORKER_CONCURRENCY=5
SMTP_RATE_LIMIT=10
```

Leave OAuth vars blank if you're only using magic-link auth initially.

> `lib/aws.ts` hardcodes the AWS SDK client with no custom `endpoint`, so Huawei OBS (S3-compatible) isn't plug-and-play — it would need a small code change to pass an `endpoint` override. `STORAGE_PROVIDER=local` is the right call for this scale; just make sure `uploads/` is included in backups (step 10).

---

## 7. Install, migrate, build

```bash
cd /opt/events-crm
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed        # first deploy only — creates roles/permissions
pnpm build
```

---

## 8. Run with PM2

`ecosystem.config.js` already defines the web process (port 8080) and two workers (email, suppression-sync). Start them:

```bash
mkdir -p /opt/events-crm/logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd    # follow the printed command to enable on boot
```

Verify:

```bash
pm2 status
pm2 logs events-crm-web --lines 50
```

At 200 concurrent users, keep `instances: 1` for `events-crm-web` as configured — Next.js on Node handles that concurrency fine single-process, and PM2's `max_memory_restart: "1G"` in the config gives you an automatic safety net if a leak creeps in. No changes needed here unless you see sustained CPU saturation in `pm2 monit`.

---

## 9. Nginx reverse proxy + TLS

`/etc/nginx/sites-available/events-crm`:

```nginx
server {
    listen 80;
    server_name events.yourdomain.sa;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/events-crm /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Issue + auto-configure TLS
certbot --nginx -d events.yourdomain.sa
```

Certbot sets up auto-renewal via a systemd timer by default — confirm with `systemctl list-timers | grep certbot`.

---

## 10. Backups (minimal, cron-based)

Since this is production data on a single box, backups aren't optional even at this scale:

```bash
mkdir -p /opt/backups
crontab -e
```

```
# Nightly Postgres dump, 2 AM
0 2 * * * docker exec events-crm-postgres pg_dump -U events_prod events_crm_prod | gzip > /opt/backups/db_$(date +\%Y\%m\%d).sql.gz

# Nightly uploads folder backup (STORAGE_PROVIDER=local)
0 2 * * * tar -czf /opt/backups/uploads_$(date +\%Y\%m\%d).tar.gz -C /opt/events-crm uploads

# Prune backups older than 14 days
0 3 * * * find /opt/backups -type f -mtime +14 -delete
```

**Copy `/opt/backups` off-box** on a schedule (e.g. to Huawei Cloud OBS, still within the KSA region, via `obsutil` or a small cron script) — a local-disk-only backup doesn't protect you if the instance or its EVS volume is lost.

---

## 11. Redeploying after changes

```bash
cd /opt/events-crm
git pull origin prod
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pm2 reload ecosystem.config.js   # zero-downtime reload for the web process
```

---

## What's genuinely minimal here vs. what to upgrade later

This single-box setup is right-sized for ~200 concurrent users in production, not a toy setup — but it is a single point of failure. Concretely, upgrade if/when:

- **You need uptime during OS patches/reboots or a hardware fault** → split into managed **RDS for PostgreSQL** + managed **DCS (Redis)** + a second ECS instance behind an **ELB**, so the app tier can restart independently of data. Not needed for capacity at 200 users — needed for availability.
- **You need file storage decoupled from the instance disk** → OBS, once `lib/aws.ts` supports a custom S3 endpoint.
- **You're scaling workers**, not just the web tier → the email/suppression workers assume a single instance (no distributed locking), so running more than one worker replica risks duplicate sends. Scale the web tier horizontally first; treat workers as a later, more careful change.
- **The app is public-facing with sensitive guest PII at higher traffic** → add a WAF in front of Nginx.

None of these are required to ship at 200 users — they're listed so today's setup doesn't quietly become a ceiling later.
