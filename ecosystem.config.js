/**
 * PM2 Ecosystem Configuration
 *
 * Use PM2 to manage both the Next.js app and the email worker in production.
 *
 * Start all:     pm2 start ecosystem.config.js
 * Start web:     pm2 start ecosystem.config.js --only events-crm-web
 * Start worker:  pm2 start ecosystem.config.js --only events-crm-worker
 *
 * Logs:          pm2 logs
 * Status:        pm2 status
 * Restart:       deploypm2 restart all
 * Stop:          pm2 stop all
 */

module.exports = {
  apps: [
    {
      name: "events-crm-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/web-error.log",
      out_file: "./logs/web-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "events-crm-worker",
      script: "node --import tsx server/workers/email-worker.ts",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        WORKER_CONCURRENCY: 5,
        SMTP_RATE_LIMIT: 10,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "events-crm-suppression-worker",
      script: "node --import tsx server/workers/suppression-sync-worker.ts",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      error_file: "./logs/suppression-worker-error.log",
      out_file: "./logs/suppression-worker-out.log",
      merge_logs: true,
      time: true,
    },
  ],
}
