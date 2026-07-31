import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const scanRoots = ['front/src', 'backend/src', 'backend/test', 'shared']
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.vue'])
const ignoredSegments = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.cache',
  '.tmp',
  'generated'
])

const explicitAnyPatterns = [
  { name: 'type annotation', pattern: /:\s*any(?:\b|\[\])/g },
  { name: 'type assertion', pattern: /\bas\s+any(?:\b|\[\])/g },
  { name: 'generic argument', pattern: /[<,]\s*any(?:\b|\[\])/g },
  { name: 'default generic', pattern: /=\s*any(?:\b|\[\])/g }
]

const shouldIgnore = (filePath) =>
  filePath
    .split(path.sep)
    .some((segment) => ignoredSegments.has(segment))

const isSourceFile = (filePath) => sourceExtensions.has(path.extname(filePath))

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (shouldIgnore(entryPath)) {
      continue
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)))
      continue
    }

    if (entry.isFile() && isSourceFile(entryPath)) {
      files.push(entryPath)
    }
  }

  return files
}

const lineAndColumnFor = (content, index) => {
  const before = content.slice(0, index)
  const lines = before.split(/\r?\n/)

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

const findExplicitAny = (content) => {
  const findings = []

  for (const { name, pattern } of explicitAnyPatterns) {
    pattern.lastIndex = 0

    for (const match of content.matchAll(pattern)) {
      if (match.index === undefined) {
        continue
      }

      findings.push({
        name,
        match: match[0].trim(),
        ...lineAndColumnFor(content, match.index)
      })
    }
  }

  return findings.sort((first, second) => first.line - second.line || first.column - second.column)
}

const existingScanRoots = []

for (const scanRoot of scanRoots) {
  try {
    existingScanRoots.push(path.join(root, scanRoot))
  } catch {
    // Keep the command usable in partial checkouts.
  }
}

const files = (
  await Promise.all(
    existingScanRoots.map(async (scanRoot) => {
      try {
        return await collectFiles(scanRoot)
      } catch {
        return []
      }
    })
  )
).flat()

const allFindings = []

for (const file of files) {
  const content = await readFile(file, 'utf8')
  const findings = findExplicitAny(content)

  for (const finding of findings) {
    allFindings.push({
      file: path.relative(root, file),
      ...finding
    })
  }
}

if (allFindings.length > 0) {
  console.error('Explicit TypeScript any usage found:')

  for (const finding of allFindings) {
    console.error(
      `${finding.file}:${finding.line}:${finding.column} ${finding.name}: ${finding.match}`
    )
  }

  process.exit(1)
}

console.log(`No explicit TypeScript any usage found in ${files.length} source files.`)
