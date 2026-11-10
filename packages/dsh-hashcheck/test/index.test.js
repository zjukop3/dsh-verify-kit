import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildManifest, digestOf, listFiles, serializeManifest, verifyManifest } from '../src/index.js'

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'hashcheck-'))
  await mkdir(join(directory, 'nested'), { recursive: true })
  await mkdir(join(directory, 'node_modules'), { recursive: true })
  await writeFile(join(directory, 'report.md'), '# report\n')
  await writeFile(join(directory, 'nested', 'data.csv'), 'a,b\n1,2\n')
  await writeFile(join(directory, 'node_modules', 'noise.js'), 'ignored\n')
  return directory
}

test('a manifest is stable across builds and ignores what it is told to', async t => {
  const directory = await fixture()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const first = await buildManifest(directory, { ignore: ['node_modules'] })
  const second = await buildManifest(directory, { ignore: ['node_modules'] })
  assert.deepEqual(first, second)
  assert.deepEqual(Object.keys(first.files).sort(), ['nested/data.csv', 'report.md'])
  assert.equal(first.files['report.md'].sha256, digestOf(Buffer.from('# report\n')))
  assert.equal(first.algorithm, 'sha256')
})

test('verification finds a changed file, a missing file and an unlisted one separately', async t => {
  const directory = await fixture()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const manifest = await buildManifest(directory, { ignore: ['node_modules'] })
  await writeFile(join(directory, 'report.md'), '# report, edited\n')
  await rm(join(directory, 'nested', 'data.csv'))
  await writeFile(join(directory, 'later.txt'), 'delivered after the manifest\n')

  const result = await verifyManifest(manifest, directory)
  assert.equal(result.ok, false)
  assert.equal(result.checked, 2)
  const rules = result.findings.map(finding => `${finding.rule}:${finding.path}`).sort()
  assert.deepEqual(rules, ['changed:report.md', 'missing:nested/data.csv', 'unlisted:later.txt'])
  const changed = result.findings.find(finding => finding.rule === 'changed')
  assert.notEqual(changed.expected, changed.actual)
})

test('a clean verify passes and extra files can be excluded from the check', async t => {
  const directory = await fixture()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const manifest = await buildManifest(directory, { ignore: ['node_modules'] })
  assert.equal((await verifyManifest(manifest, directory)).ok, true)
  await writeFile(join(directory, 'later.txt'), 'x')
  assert.equal((await verifyManifest(manifest, directory, { reportExtra: false })).ok, true)
})

test('the serialized manifest is sorted, so a diff shows what actually moved', async t => {
  const directory = await fixture()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const text = serializeManifest(await buildManifest(directory, { ignore: ['node_modules'] }))
  assert.ok(text.indexOf('nested/data.csv') < text.indexOf('report.md'))
  assert.ok(text.endsWith('\n'))
  assert.deepEqual(JSON.parse(text).version, 1)
})

test('the ignore list matches a directory prefix, not a substring', async t => {
  const directory = await fixture()
  t.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(join(directory, 'node_modules.md'), 'kept\n')
  const files = await listFiles(directory, { ignore: ['node_modules'] })
  assert.deepEqual(files.sort(), ['nested/data.csv', 'node_modules.md', 'report.md'])
})
