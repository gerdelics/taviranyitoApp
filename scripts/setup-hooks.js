import { writeFileSync, chmodSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const hookPath = join(__dirname, '../.git/hooks/pre-commit')
const hookContent = '#!/bin/sh\nnode scripts/bump-version.js\ngit add src/version.js\n'

writeFileSync(hookPath, hookContent, 'utf8')
try { chmodSync(hookPath, 0o755) } catch {}
console.log('Git pre-commit hook installed.')
