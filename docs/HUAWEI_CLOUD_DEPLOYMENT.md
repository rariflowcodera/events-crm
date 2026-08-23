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

Create an `A` record for your domain (e.g. `guest-afc2027.com`) pointing at the ECS EIP. TLS in step 6 depends on this resolving before you request a certificate.

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

# Caddy (reverse proxy + automatic TLS — no separate certbot step needed)
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy

# App directory
mkdir -p /opt/events-crm
```

> **This is already done on the live box.** Caddy is installed and running as a
> single `/etc/caddy/Caddyfile` (not split into per-site files — see §9 for its
> actual current content). The steps above are here for standing up a *new* box
> from scratch; skip them if you're just changing the existing config.

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
SMTP_FROM=noreply@guest-afc2027.com

BETTER_AUTH_URL=https://guest-afc2027.com
BETTER_AUTH_SECRET=<generate: openssl rand -base64 32>

# Local disk storage keeps this deploy minimal — avoids needing S3/OBS integration work
STORAGE_PROVIDER=local

NEXT_PUBLIC_APP_URL=https://guest-afc2027.com

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

## 9. Caddy reverse proxy + TLS

Caddy issues and renews Let's Encrypt certificates itself — no certbot step, no cron
renewal job to babysit. Make sure DNS (step 2) has already propagated before pointing
a new hostname at it, since it needs to complete a challenge against the domain on
ports 80/443.

The live box runs a single `/etc/caddy/Caddyfile` (not split into per-site files —
that was an earlier draft of this doc; this is what's actually deployed). Real domain
is `guest-afc2027.com`, not the `guest-afc2027.com` placeholder used elsewhere in
this doc:

```caddyfile
{
    email a.uzair@techxoetic.com

    on_demand_tls {
        ask http://127.0.0.1:8080/api/domain/verify
    }
}

# Redirect any plain HTTP to HTTPS (main app + custom domains)
http:// {
    redir https://{host}{uri} permanent
}

guest-afc2027.com, www.guest-afc2027.com {
    reverse_proxy 127.0.0.1:8080
}

test.guest-afc2027.com {
    reverse_proxy 127.0.0.1:8081
}

# Custom event domains — certificates issued on demand
https:// {
    tls {
        on_demand
    }
    reverse_proxy 127.0.0.1:8080
}
```

Two things worth understanding before editing this file:

- **The `on_demand_tls` block is load-bearing for a real product feature**, not
  boilerplate — it's how guests can point their own custom domain at an event
  (`event.customDomain` / `event.customDomainVerified` in the schema). The catch-all
  `https://` block at the bottom issues a cert on demand for *any* hostname that
  reaches it over TLS, gated by the app confirming at `/api/domain/verify` that the
  domain is a verified `event.customDomain` before Caddy will issue a certificate for
  it — this is what stops it from being an open cert-issuance oracle for arbitrary
  domains someone points at the box.
- **Caddy matches the most specific `site block` for a given host**, so the explicit
  `guest-afc2027.com`/`test.guest-afc2027.com` blocks always win over the `https://`
  catch-all for those hostnames — the catch-all only ever fires for hostnames that
  don't match an explicit block, i.e. actual custom event domains.

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

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
- **The app is public-facing with sensitive guest PII at higher traffic** → add a WAF in front of Caddy.

None of these are required to ship at 200 users — they're listed so today's setup doesn't quietly become a ceiling later.
