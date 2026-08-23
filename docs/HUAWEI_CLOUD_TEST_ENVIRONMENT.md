# Events CRM — Test Environment on the Production Huawei ECS Box

> Adds an isolated **test** environment alongside the existing production deployment
> described in `docs/HUAWEI_CLOUD_DEPLOYMENT.md`, on the **same ECS instance** — no
> new server to provision. Isolation is at the app/DB/Redis/Caddy level, not the
> hardware level.

Naming follows the convention already documented in `docs/DEPLOYMENT.md`:
branch `test`, database `events_crm_test`, subdomain `test.guest-afc2027.com`.

| | Production (existing) | Test (this doc) |
|---|---|---|
| Branch | `prod` | `test` |
| App directory | `/opt/events-crm` | `/opt/events-crm-test` |
| App port | 8080 | 8081 |
| PM2 apps | `events-crm-web`, `events-crm-worker`, `events-crm-suppression-worker` | `events-crm-web-test`, `events-crm-worker-test`, `events-crm-suppression-worker-test` |
| PM2 config | `ecosystem.config.js` | `ecosystem.test.config.js` |
| Postgres DB | `events_crm_prod` (existing container) | `events_crm_test` (**same** Postgres container, new DB) |
| Redis keyspace | DB index `0` (default) | DB index `1` (same Redis container) |
| Caddy site block | `guest-afc2027.com` block in `/etc/caddy/Caddyfile` | `test.guest-afc2027.com` block in the **same** `/etc/caddy/Caddyfile` — **already present**, see §7 |
| SMTP | real provider | **Mailpit (sandboxed, no real sends)** — see §5 |
| GitHub Actions | `.github/workflows/deploy-huawei-ecs.yml` | `.github/workflows/deploy-huawei-ecs-test.yml` |

**No new GitHub secrets are needed.** Both workflows deploy to the same box, so they
reuse `HUAWEI_SSH_HOST` / `HUAWEI_SSH_USER` / `HUAWEI_SSH_PORT` / `HUAWEI_SSH_PRIVATE_KEY` —
only the `TARGET` path differs.

I don't have SSH or Huawei Cloud console access from this environment, so steps 1–6
below need to be run by you (or someone with access) directly on the box. Everything
in the repo (workflow file, PM2 config) is already committed.

---

## 1. Create the test database (reuses the existing Postgres container)

```bash
ssh root@<EIP>

docker exec -it events-crm-postgres psql -U events_prod -d events_crm_prod
```

```sql
CREATE DATABASE events_crm_test;
CREATE USER events_test WITH PASSWORD '<generate-a-strong-password>';
GRANT ALL PRIVILEGES ON DATABASE events_crm_test TO events_test;
\q
```

Reusing the existing `events-crm-postgres` container (rather than a second Postgres
container) avoids doubling memory pressure on the box — Postgres handles multiple
databases fine, and `events_test` has no access to `events_crm_prod`'s data (separate
DB + separate role).

---

## 2. Reserve a Redis keyspace for test

No new container needed. Redis supports 16 logical databases (index `0`–`15`) in one
instance; production already uses index `0` implicitly. Test will connect with
`redis://:<password>@localhost:6379/1` — same auth, different index, keys never collide.

---

## 3. Clone the app into its own directory

```bash
cd /opt
git clone <your-repo-url> events-crm-test
cd events-crm-test
git checkout test   # create this branch from `dev` if it doesn't exist yet
```

If `test` doesn't exist yet in the repo:

```bash
git checkout dev
git checkout -b test
git push -u origin test
```

---

## 4. Configure `.env.local` for test

```bash
cd /opt/events-crm-test
cp .env.example .env.local
```

Edit `.env.local`:

```bash
DATABASE_URL=postgresql://events_test:<test-db-password>@localhost:5432/events_crm_test
DATABASE_SSL=false

REDIS_URL=redis://:<same-redis-password-as-prod>@localhost:6379/1

# See §5 — do not point this at a real SMTP provider
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@test.guest-afc2027.com

BETTER_AUTH_URL=https://test.guest-afc2027.com
BETTER_AUTH_SECRET=<generate a DIFFERENT secret: openssl rand -base64 32>

STORAGE_PROVIDER=local

NEXT_PUBLIC_APP_URL=https://test.guest-afc2027.com

WORKER_CONCURRENCY=2
SMTP_RATE_LIMIT=5
```

Use a **different** `BETTER_AUTH_SECRET` than prod — sharing it would let a session
token from one environment be replayed on the other.

---

## 5. SMTP safety — do not let test send real guest email

This is a guest-invitation CRM: an email worker running against real SMTP with test
data (or a copy of prod data) **will email real guests**. Two safe options, pick one:

**Option A — Mailpit (recommended for a true test env):**

```bash
docker run -d --name events-crm-mailpit-test --restart unless-stopped \
  -p 127.0.0.1:1025:1025 -p 127.0.0.1:8026:8025 \
  axllent/mailpit
```

Leave `SMTP_HOST=localhost` / `SMTP_PORT=1025` as in §4. View caught mail at
`http://<EIP>:8026` (or tunnel it — don't expose 8026 publicly). Nothing ever reaches
a real inbox.

**Option B — real SMTP provider's sandbox/test mode**, if your provider has one
(e.g. an allowlist-only test API key). Only do this if you've confirmed with the
provider that test-mode sends cannot reach arbitrary recipients.

**Do not** point test's `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` at the same production
SMTP credentials "just to try it" — there's no environment check in the worker code
that would stop it from emailing real guests.

---

## 5a. Optional: replicate production data instead of an empty seed

If you want the test DB to start from a real copy of prod (exact row-for-row copy,
not sanitized) rather than an empty `db:seed`, do this **before** step 6, on the same
box, using the existing `events-crm-postgres` container — both databases live in it,
so this never leaves localhost:

```bash
ssh root@<EIP>

# 1. Dump prod
docker exec events-crm-postgres pg_dump -U events_prod -d events_crm_prod -Fc -f /tmp/prod.dump

# 2. Drop + recreate the test DB fresh (wipes anything already in it)
#    Run these as three SEPARATE `-c` calls, not one multi-statement string —
#    Postgres treats a multi-statement simple-query as an implicit transaction,
#    and DROP DATABASE/CREATE DATABASE cannot run inside a transaction block.
docker exec -it events-crm-postgres psql -U events_prod -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'events_crm_test';"
docker exec -it events-crm-postgres psql -U events_prod -d postgres -c "DROP DATABASE IF EXISTS events_crm_test;"
docker exec -it events-crm-postgres psql -U events_prod -d postgres -c "CREATE DATABASE events_crm_test OWNER events_prod;"

# 3. Restore prod's dump into the fresh test DB
docker exec events-crm-postgres pg_restore -U events_prod -d events_crm_test /tmp/prod.dump

# 4. Give events_test owner-equivalent rights on what events_prod just restored.
#    (The dump was restored as events_prod, since it owns the cluster; the app
#    connects as events_test and needs to ALTER/DROP, not just SELECT/INSERT —
#    which requires ownership, not just a GRANT.)
#
#    REASSIGN OWNED BY events_prod fails here ("required by the database
#    system") because events_prod is the cluster's bootstrap superuser —
#    Postgres won't let you reassign away from that role. Role membership
#    sidesteps it entirely: a member of the owning role automatically gets
#    that role's ownership-equivalent privileges (ALTER/DROP included) on
#    everything it owns, present and future, with no reassignment needed.
docker exec -it events-crm-postgres psql -U events_prod -d events_crm_test -c "GRANT events_prod TO events_test;"

# 5. Clean up the dump file
docker exec events-crm-postgres rm /tmp/prod.dump
```

If you do this, **skip `pnpm db:seed` in step 6** — the copied data already includes
prod's roles/permissions. Still run `pnpm db:migrate` in step 6 afterward: that applies
any migrations that exist on the `test` branch but haven't shipped to `prod` yet,
which is usually the entire point of testing against real data.

To refresh later (pull a newer prod snapshot), just re-run steps 1–5 above — it's
fully destructive to whatever is currently in `events_crm_test`, by design.

**This is an exact copy — it contains real guest PII (names, emails, phone numbers)
and live `rsvpToken` values, not synthetic data.** Two things become hard requirements
once you do this, not just good practice:

- **§5's Mailpit-only SMTP rule is now non-negotiable.** Any workflow in test that
  triggers a bulk send, reminder, or confirmation email — manually, via a script, or
  by someone testing the "send invitation" button — will attempt to email real guests
  if `SMTP_HOST` in test's `.env.local` points at a real provider. Double-check step 5
  is in place before restoring.
- **Restrict who can reach `test.guest-afc2027.com`** for as long as it holds a copy
  of real guest data (e.g. HTTP basic auth or an IP allowlist added to its block in
  `/etc/caddy/Caddyfile` — see §7) — it now carries the same sensitivity as prod, just
  with weaker operational hardening around it (fewer eyes on it, likely a wider set of
  people testing on it).

---

## 6. Install, migrate, build, start

```bash
cd /opt/events-crm-test
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed        # SKIP this if you restored real data in §5a — it's already seeded
pnpm build

mkdir -p logs
pm2 start ecosystem.test.config.js
pm2 save
```

Verify:

```bash
pm2 status                              # should show both -test and prod processes, all online
pm2 logs events-crm-web-test --lines 50
```

---

## 7. Caddy site + TLS for test.guest-afc2027.com

**Already done** — the live `/etc/caddy/Caddyfile` (see `docs/HUAWEI_CLOUD_DEPLOYMENT.md`
§9 for its full current content) already has this block, pointing at the same port
(8081) `ecosystem.test.config.js` uses:

```caddyfile
test.guest-afc2027.com {
    reverse_proxy 127.0.0.1:8081
}
```

It's a single `/etc/caddy/Caddyfile` on this box, not split into per-site files (an
earlier draft of these docs assumed a `sites/*.caddy` import layout that isn't what's
actually deployed). Caddy issued the TLS certificate for `test.guest-afc2027.com`
automatically on first request — no certbot step needed. Nothing further to do here
unless you want to add access restrictions per §5a's PII warning (e.g. `basic_auth`
inside this block), in which case:

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

`systemctl reload caddy` is zero-downtime for the already-running prod site.

---

## 8. Ongoing deploys

Pushing to the `test` branch now triggers `.github/workflows/deploy-huawei-ecs-test.yml`,
which rsyncs to `/opt/events-crm-test/` and reloads only `ecosystem.test.config.js` —
it never touches the prod PM2 processes or `/opt/events-crm/`.

```bash
git checkout test
git merge dev
git push origin test   # → deploys to https://test.guest-afc2027.com
```

---

## Blast-radius notes (what's actually shared with prod)

Since this reuses the production box rather than a second instance, isolation is at
the app/DB/Redis/Caddy level — not the OS/hardware level. Concretely:

- **CPU/RAM/disk are shared.** A runaway test build, a heavy `pnpm install`, or a bad
  test-data migration competing for resources can still slow down prod on the same
  box. The existing prod sizing guide (`docs/HUAWEI_CLOUD_DEPLOYMENT.md` §1) assumed
  the whole box for prod — running test alongside it permanently eats into that
  headroom. Watch `pm2 monit` / `htop` after standing this up.
- **The EVS disk, and therefore backups, are shared.** Test data lives on the same
  volume as prod data. It's a separate Postgres database, but a full-disk event (disk
  fills up) affects both.
- **A single `docker exec ... psql` or `pm2` typo can hit the wrong environment** if
  you're not careful about which container/process name you're targeting — that's why
  every PM2 process and Docker container name above is explicitly `-test` suffixed.
  Never run `pm2 restart all` / `pm2 reload all` on this box; always target by name or
  by the `-test` config file.

If test traffic grows, or you want hardware-level isolation, the original "same ECS
box" tradeoff can be revisited later by moving `/opt/events-crm-test` to its own ECS
instance — the app-level setup (branch, DB name, env vars) carries over unchanged.
