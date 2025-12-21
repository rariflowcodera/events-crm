#!/usr/bin/env node
/**
 * Interactive deployment script
 * Bumps version, merges dev to prod, and pushes to trigger GitHub Actions
 *
 * Usage: node scripts/deploy.mjs
 */

import { execSync } from "child_process"
import { readFileSync, writeFileSync } from "fs"
import { createInterface } from "readline"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const packagePath = resolve(__dirname, "../package.json")

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
}

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe", ...options })
  } catch (error) {
    if (options.ignoreError) return ""
    throw error
  }
}

function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase().trim())
    })
  })
}

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"))
  return pkg.version
}

function bumpVersion(type) {
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"))
  const [major, minor, patch] = pkg.version.split(".").map(Number)

  let newVersion
  switch (type) {
    case "major":
      newVersion = `${major + 1}.0.0`
      break
    case "minor":
      newVersion = `${major}.${minor + 1}.0`
      break
    case "patch":
      newVersion = `${major}.${minor}.${patch + 1}`
      break
    default:
      return pkg.version
  }

  pkg.version = newVersion
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n")
  return newVersion
}

function checkCleanWorkingDirectory() {
  const status = exec("git status --porcelain")
  // Allow only package.json changes (from version bump we're about to do)
  const lines = status.trim().split("\n").filter(Boolean)
  const nonPackageChanges = lines.filter((line) => !line.includes("package.json"))
  return nonPackageChanges.length === 0
}

async function main() {
  console.log("")
  log("========================================", "blue")
  log("  Events CRM - Production Deployment", "blue")
  log("========================================", "blue")
  console.log("")

  // Check we're on dev branch
  const currentBranch = exec("git branch --show-current").trim()
  if (currentBranch !== "dev") {
    log(`Error: You must be on the 'dev' branch to deploy.`, "red")
    log(`Current branch: ${currentBranch}`, "dim")
    log(`Run: git checkout dev`, "dim")
    process.exit(1)
  }

  // Check for uncommitted changes (except package.json)
  const hasChanges = !checkCleanWorkingDirectory()
  if (hasChanges) {
    log("Error: You have uncommitted changes.", "red")
    log("Please commit or stash your changes before deploying.", "dim")
    exec("git status --short", { stdio: "inherit" })
    process.exit(1)
  }

  const currentVersion = getCurrentVersion()
  log(`Current version: v${currentVersion}`, "dim")
  console.log("")

  // Prompt for version bump
  log("Version bump options:", "yellow")
  log("  patch - Bug fixes (0.1.0 -> 0.1.1)", "dim")
  log("  minor - New features (0.1.0 -> 0.2.0)", "dim")
  log("  major - Breaking changes (0.1.0 -> 1.0.0)", "dim")
  log("  none  - No version change", "dim")
  console.log("")

  const bumpType = await prompt("Version bump? (patch/minor/major/none): ")

  if (!["patch", "minor", "major", "none"].includes(bumpType)) {
    log("Invalid option. Aborting.", "red")
    process.exit(1)
  }

  let newVersion = currentVersion
  if (bumpType !== "none") {
    newVersion = bumpVersion(bumpType)
    log(`Version bumped: v${currentVersion} -> v${newVersion}`, "green")

    // Commit version bump
    exec("git add package.json")
    exec(`git commit -m "chore: bump version to ${newVersion}"`)
    log("Committed version bump", "green")
  }

  console.log("")
  log("Deploying to production...", "yellow")

  // Checkout prod branch (create if doesn't exist)
  try {
    exec("git checkout prod", { stdio: "pipe" })
    log("Switched to prod branch", "dim")
  } catch {
    exec("git checkout -b prod")
    log("Created and switched to prod branch", "dim")
  }

  // Merge dev into prod
  try {
    exec("git merge dev -m \"Merge dev into prod for release v" + newVersion + "\"")
    log("Merged dev into prod", "green")
  } catch (error) {
    log("Error: Merge conflict detected!", "red")
    log("Please resolve conflicts manually, then run:", "dim")
    log("  git add . && git commit", "dim")
    log("  git push origin prod", "dim")
    log("  git checkout dev", "dim")
    process.exit(1)
  }

  // Push to origin
  try {
    exec("git push origin prod", { stdio: "inherit" })
    log("Pushed to origin/prod", "green")
  } catch (error) {
    log("Error: Failed to push to origin.", "red")
    log("You may need to set up the remote or authenticate.", "dim")
    process.exit(1)
  }

  // Switch back to dev
  exec("git checkout dev")
  log("Switched back to dev branch", "dim")

  console.log("")
  log("========================================", "green")
  log("  Deployment successful!", "green")
  log(`  Version: v${newVersion}`, "green")
  log("  GitHub Actions is now building...", "dim")
  log("========================================", "green")
  console.log("")
}

main().catch((error) => {
  log(`Error: ${error.message}`, "red")
  process.exit(1)
})
