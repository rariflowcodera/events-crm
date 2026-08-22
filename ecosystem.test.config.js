/**
 * PM2 Ecosystem Configuration — TEST environment
 *
 * Runs alongside ecosystem.config.js (production) on the SAME Huawei ECS box,
 * under a separate app directory (/opt/events-crm-test), on separate ports,
 * against a separate Postgres database and Redis keyspace. Process names,
 * ports, and log files are all suffixed "-test" so `pm2 status` / `pm2 logs`
 * never overlap with the prod processes defined in ecosystem.config.js.
 *
 * Start all:     pm2 start ecosystem.test.config.js
 * Reload (CI):   pm2 reload ecosystem.test.config.js --update-env
 * Logs:          pm2 logs events-crm-web-test
 * Status:        pm2 status
 *
 * IMPORTANT: never run `pm2 restart all` / `pm2 reload all` on this box —
 * that would bounce prod processes too. Always target this file explicitly,
 * or target processes by name (events-crm-web-test, etc.).
 */

module.exports = {
  apps: [
    {
      name: "events-crm-web-test",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 8081,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/web-test-error.log",
      out_file: "./logs/web-test-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "events-crm-worker-test",
      script: "node --env-file=.env.local --import tsx server/workers/email-worker.ts",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        WORKER_CONCURRENCY: 2,
        SMTP_RATE_LIMIT: 5,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "./logs/worker-test-error.log",
      out_file: "./logs/worker-test-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "events-crm-suppression-worker-test",
      script: "node --env-file=.env.local --import tsx server/workers/suppression-sync-worker.ts",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "./logs/suppression-worker-test-error.log",
      out_file: "./logs/suppression-worker-test-out.log",
      merge_logs: true,
      time: true,
    },
  ],
}
