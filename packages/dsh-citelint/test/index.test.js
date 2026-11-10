import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkNumbering, lintCitations, parseCitations } from '../src/index.js'

const report = (body, definitions) => `${body}\n\n${definitions}\n`

test('definitions and usages are read separately', () => {
  const { definitions, used } = parseCitations(report('见 [1] 和 [2]。', '[1]: https://a.example\n[2]: https://b.example'))
  assert.deepEqual(definitions.map(definition => definition.id), ['1', '2'])
  assert.ok(used.has('1') && used.has('2'))
})

test('a gap in the numbering is reported once, with the sequence', () => {
  const findings = checkNumbering([{ id: '1' }, { id: '2' }, { id: '4' }])
  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'numbering-gap')
  assert.match(findings[0].message, /1, 2, 4/)
  assert.deepEqual(checkNumbering([{ id: '1' }, { id: '2' }]), [])
})

test('a duplicate number is an error, a duplicate url is a warning', async () => {
  const result = await lintCitations(report('见 [1] 与 [2]。', '[1]: https://a.example\n[2]: https://a.example\n[1]: https://c.example'))
  assert.equal(result.ok, false)
  assert.ok(result.findings.some(finding => finding.rule === 'duplicate-number' && finding.level === 'error'))
  assert.ok(result.findings.some(finding => finding.rule === 'duplicate-url' && finding.level === 'warn'))
})

test('a source that is listed and never cited is called out', async () => {
  const result = await lintCitations(report('只用了 [1]。', '[1]: https://a.example\n[2]: https://b.example'))
  const unreferenced = result.findings.filter(finding => finding.rule === 'unreferenced')
  assert.equal(unreferenced.length, 1)
  assert.match(unreferenced[0].message, /\[2\]/)
})

test('a citation with no definition is an error, and local files must exist', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'citelint-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(join(directory, 'data.csv'), 'a,b\n')
  const missing = await lintCitations(report('见 [3]。', '[1]: data.csv\n[2]: nope.csv'), { baseDirectory: directory })
  assert.equal(missing.ok, false)
  assert.ok(missing.findings.some(finding => finding.rule === 'undefined'))
  assert.ok(missing.findings.some(finding => finding.rule === 'local-missing' && finding.message.includes('nope.csv')))
  assert.ok(!missing.findings.some(finding => finding.message.includes('data.csv') && finding.rule === 'local-missing'))
})

test('an http url is never checked against the filesystem', async () => {
  const result = await lintCitations(report('见 [1]。', '[1]: https://example.com/x'), { baseDirectory: '/nonexistent' })
  assert.equal(result.findings.some(finding => finding.rule === 'local-missing'), false)
})
