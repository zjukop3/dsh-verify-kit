import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildManifest, digestOf, listFiles, serializeManifest, verifyManifest } from '../src/index.js'
const { version: packageVersion } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

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
  assert.equal(first.packageVersion, packageVersion, 'the result carries the package version so a running route can be told apart from an old module')
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

test('a manifest size that disagrees with an identical file is reported', async t => {
  // size-mismatch had only a silent direction: the hash agrees, so this is a
  // warning about the manifest record itself, not about the file.
  const directory = await fixture()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const manifest = await buildManifest(directory, { ignore: ['node_modules'] })
  manifest.files['report.md'] = { ...manifest.files['report.md'], size: manifest.files['report.md'].size + 7 }
  const result = await verifyManifest(manifest, directory)
  const finding = result.findings.find(f => f.rule === 'size-mismatch')
  assert.ok(finding, JSON.stringify(result.findings.map(f => f.rule)))
  assert.equal(finding.level, 'warn')
  assert.equal(finding.path, 'report.md')
  assert.equal(result.ok, true, 'a size mismatch does not fail the verify')
})

// 端点契约：键名要与另外 30 个检查一致（`path`），而没有目录时必须 400。
// 这条测试来自一次真实调用：用 `path` 调 hashcheck，它不认这个键、退回 `.`，
// 于是把服务进程的整个仓库（37687 个文件，含 .git）哈希了回来。
test('the endpoint takes path as an alias and refuses to guess a directory', async () => {
  const { apply } = await import('../src/index.js')
  const { createServer } = await import('node:http')
  const state = {}
  apply({ webServer: { register(spec) { state.route = spec } }, effect(fn) { fn() }, logger: { info() {} } }, {})
  const server = createServer((req, res) => state.route.handler(req, res))
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  const { port } = server.address()
  const post = async body => {
    const response = await fetch(`http://127.0.0.1:${port}/hashcheck/api`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }
  try {
    const directory = await fixture()
    const keyed = await post({ action: 'build', directory })
    const aliased = await post({ action: 'build', path: directory })
    assert.equal(aliased.status, 200)
    assert.deepEqual(aliased.body, keyed.body, 'path 与 directory 必须给出同一份清单')
    const verified = await post({ action: 'verify', path: directory, manifest: aliased.body.manifest })
    assert.equal(verified.status, 200)
    assert.equal(verified.body.ok, true)
    const guessed = await post({ action: 'build' })
    assert.equal(guessed.status, 400, '没有目录时不许拿 cwd 顶替')
    assert.match(guessed.body.error, /directory \(or path\) is required/)
  } finally {
    await new Promise(done => server.close(done))
  }
})
