import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const specPath = fileURLToPath(
  new URL('../specs/web-mobile-completeness-spec.md', import.meta.url),
)
const source = readFileSync(specPath, 'utf8')
const ledgerMarker = '## Implementation ledger'
const markerIndex = source.indexOf(ledgerMarker)

if (markerIndex < 0) throw new Error('Implementation ledger heading is missing')

const requirementsSource = source.slice(0, markerIndex)
const ledgerSource = source.slice(markerIndex)
const expectedFamilies = {
  G: 7,
  AUTH: 9,
  PUBLIC: 25,
  ADMIN: 14,
  CORE: 246,
  TRADE: 30,
  X: 34,
}
const requirementPattern = /\b(G|AUTH|PUBLIC|ADMIN|CORE|TRADE|X)-(\d{3})\b/g

function collectIds(text) {
  const ids = new Set()
  for (const match of text.matchAll(requirementPattern)) ids.add(`${match[1]}-${match[2]}`)
  return ids
}

const declared = collectIds(requirementsSource)
const errors = []

for (const [family, count] of Object.entries(expectedFamilies)) {
  const actual = [...declared].filter(id => id.startsWith(`${family}-`)).length
  if (actual !== count) errors.push(`${family}: expected ${count} declared IDs, found ${actual}`)
  for (let index = 1; index <= count; index += 1) {
    const id = `${family}-${String(index).padStart(3, '0')}`
    if (!declared.has(id)) errors.push(`Missing declared requirement ${id}`)
  }
}

const ledgerRows = new Map()
for (const line of ledgerSource.split(/\r?\n/)) {
  const match = /^\|\s*((?:G|AUTH|PUBLIC|ADMIN|CORE|TRADE|X)-\d{3})\s*\|/.exec(line)
  if (!match) continue
  const id = match[1]
  if (ledgerRows.has(id)) errors.push(`Duplicate ledger row ${id}`)
  ledgerRows.set(id, line)
  const cells = line
    .slice(1, -1)
    .split('|')
    .map(cell => cell.trim())
  if (cells.length !== 5) errors.push(`${id}: expected five ledger columns, found ${cells.length}`)
  if (cells.some(cell => cell.length === 0)) errors.push(`${id}: ledger cells must not be blank`)
}

for (const id of declared) {
  if (!ledgerRows.has(id)) errors.push(`Missing ledger row ${id}`)
}
for (const id of ledgerRows.keys()) {
  if (!declared.has(id)) errors.push(`Ledger contains undeclared requirement ${id}`)
}

const totalExpected = Object.values(expectedFamilies).reduce((sum, count) => sum + count, 0)
if (declared.size !== totalExpected) {
  errors.push(`Expected ${totalExpected} unique requirements, found ${declared.size}`)
}
if (ledgerRows.size !== totalExpected) {
  errors.push(`Expected ${totalExpected} unique ledger rows, found ${ledgerRows.size}`)
}

if (errors.length > 0) {
  console.error(`Completeness spec validation failed (${errors.length}):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Completeness spec valid: ${declared.size} requirements and ${ledgerRows.size} unique ledger rows.`,
  )
}
