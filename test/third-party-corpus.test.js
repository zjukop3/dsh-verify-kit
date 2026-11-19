// The /corpus/ page makes a specific claim: tablelint read 100 real tables from
// 39 repositories nobody here wrote and reported nothing. A number on a page
// that nothing re-derives is a slogan, so this test re-derives it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { lintTables } from '../packages/dsh-tablelint/src/index.js'
import { lintNumbers } from '../packages/dsh-numberlint/src/index.js'
import { lintOutline } from '../packages/dsh-outline-lint/src/index.js'

const base = resolve(import.meta.dirname, '..', '..', 'dsh-ecosystem-research', 'sources', 'plugins')
const exists = async path => stat(path).then(() => true, () => false)

async function readmes() {
  if (!(await exists(base))) return []
  const out = []
  for (const repo of await readdir(base, { withFileTypes: true })) {
    if (!repo.isDirectory()) continue
    for (const name of await readdir(join(base, repo.name))) {
      if (/^readme.*\.md$/i.test(name)) out.push({ path: join(base, repo.name, name), text: await readFile(join(base, repo.name, name), 'utf8') })
    }
  }
  return out
}

test('the third-party corpus is present, so the numbers below mean something', async () => {
  const docs = await readmes()
  assert.ok(docs.length >= 30, `expected the third-party README corpus, found ${docs.length}`)
})

test('tablelint reads a hundred real tables without a single finding', async () => {
  const docs = await readmes()
  let tables = 0
  const findings = []
  for (const { path, text } of docs) {
    const result = lintTables(text)
    tables += result.tables
    for (const finding of result.findings) findings.push(`${path.split('/').pop()}: ${finding.rule}`)
  }
  assert.equal(tables, 100, `the claim on the page is 100 tables; found ${tables} — page and code have drifted`)
  assert.deepEqual(findings, [], 'tablelint must stay silent on real-world tables, including the deliberately headerless ones')
})

test('numberlint fires twice on the corpus, both are real, and nothing else', async () => {
  // An earlier draft of the /corpus/ page claimed zero findings here. The real
  // number is two, and both are a genuine defect in someone else's document: the
  // same quantity written "1,500" and "1500" in one file. Two, across thirty-nine
  // documents, all of them in one repository's two translations.
  const docs = await readmes()
  const findings = []
  for (const { path, text } of docs) {
    for (const finding of lintNumbers(text).findings) findings.push({ repo: path.split('/').slice(-2)[0], rule: finding.rule })
  }
  assert.equal(findings.length, 2, JSON.stringify(findings))
  for (const finding of findings) {
    assert.equal(finding.rule, 'thousands-inconsistent')
    assert.equal(finding.repo, 'ranxianglei__billion-context', 'one document in two languages, not a pattern of noise')
  }
})

test('outline-lint is a report checker, and its findings on READMEs are a mismatch, not a defect', async () => {
  // Documented on the page as a caller error. Pinned here so nobody "fixes" the
  // rule to make READMEs pass: that would lower the standard to nothing.
  const docs = await readmes()
  const conclusions = docs.map(({ text }) => lintOutline(text).findings.filter(f => f.rule === 'no-conclusion').length)
  const firedOn = conclusions.filter(count => count > 0).length
  assert.ok(firedOn >= 30, `expected no-conclusion on most READMEs, fired on ${firedOn}`)
  assert.equal(conclusions.reduce((a, b) => a + b, 0), firedOn, 'no-conclusion fires at most once per document')
})

test('the empty-heading dead rule stays reachable', async () => {
  const result = lintOutline('# 报告\n\n##\n\n正文。\n')
  assert.ok(result.findings.some(f => f.rule === 'empty-heading'))
})
