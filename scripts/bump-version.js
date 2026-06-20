import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const datetime = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
const version = `1.0.${datetime}`

writeFileSync(join(__dirname, '../src/version.js'), `export const APP_VERSION = '${version}'\n`, 'utf8')
console.log(`Version bumped to ${version}`)
