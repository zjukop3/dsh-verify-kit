// The examples embedded in the site pages must be what the tools actually
// print. This re-runs every example through the real CLI and compares, so a
// page cannot drift from the tool it documents.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { CHECKS } from '../scripts/checks-data.mjs'

const root = resolve(import.meta.dirname, '..')

test('every embedded site example matches a fresh CLI run', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'verify-kit-examples-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const delivery = join(directory, 'delivery')
  await mkdir(delivery, { recursive: true })
  await writeFile(join(delivery, 'report.md'), '# report\n')
  await writeFile(join(delivery, 'nested.csv'), 'a,b\n1,2\n')

  for (const check of CHECKS) {
    assert.ok(check.example, `${check.slug} has an example`)
    const cli = resolve(root, 'packages', check.pkgDir, 'bin', 'cli.js')
    const target = check.slug === 'hashcheck'
      ? undefined
      : join(directory, `${check.slug}-input.md`)
    if (target) await writeFile(target, check.example.fixture.replace(/\\n/g, '\n').replace(/\\t/g, '\t'))
    const args = target ? [cli, target] : [cli, 'build', delivery, '--out', join(delivery, 'hashcheck.json')]
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' })
    const normalize = text => text.replaceAll(directory + '/', '').replaceAll(directory, '.')
    const lines = normalize(`${first.stdout}${first.stderr}`).trim().split('\n')
    if (check.slug === 'hashcheck') {
      const verify = spawnSync(process.execPath, [cli, 'verify', join(delivery, 'hashcheck.json'), '--dir', delivery], { encoding: 'utf8' })
      lines.push(...normalize(`${verify.stdout}${verify.stderr}`).trim().split('\n'))
      // the embedded example also shows the run after someone edits a delivered file
      await writeFile(join(delivery, 'report.md'), '# report, edited\n')
      const after = spawnSync(process.execPath, [cli, 'verify', join(delivery, 'hashcheck.json'), '--dir', delivery], { encoding: 'utf8' })
      lines.push(...normalize(`${after.stdout}${after.stderr}`).trim().split('\n'))
    }
    const embedded = check.example.output.split('\n').filter(line => line && !line.startsWith('$'))
    for (const line of embedded) {
      assert.ok(lines.some(actual => actual.trim() === line.trim()),
        `${check.slug}: embedded line not produced by the CLI\n  embedded: ${line}\n  actual:   ${lines.join(' | ')}`)
    }
  }
})
