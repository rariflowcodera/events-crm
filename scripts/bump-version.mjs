#!/usr/bin/env node
/**
 * Version bump script for semantic versioning
 * Usage: node scripts/bump-version.mjs [major|minor|patch]
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const packagePath = resolve(__dirname, "../package.json")

const bumpType = process.argv[2]

if (!["major", "minor", "patch"].includes(bumpType)) {
  console.error("Usage: node scripts/bump-version.mjs [major|minor|patch]")
  console.error("")
  console.error("Examples:")
  console.error("  node scripts/bump-version.mjs patch  # Bug fixes (0.1.0 -> 0.1.1)")
  console.error("  node scripts/bump-version.mjs minor  # New features (0.1.0 -> 0.2.0)")
  console.error("  node scripts/bump-version.mjs major  # Breaking changes (0.1.0 -> 1.0.0)")
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(packagePath, "utf8"))
const currentVersion = pkg.version
const [major, minor, patch] = currentVersion.split(".").map(Number)

let newVersion
switch (bumpType) {
  case "major":
    newVersion = `${major + 1}.0.0`
    break
  case "minor":
    newVersion = `${major}.${minor + 1}.0`
    break
  case "patch":
    newVersion = `${major}.${minor}.${patch + 1}`
    break
}

pkg.version = newVersion
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n")

console.log(`Version bumped: ${currentVersion} -> ${newVersion}`)
