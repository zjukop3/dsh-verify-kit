import test from 'node:test'
import assert from 'node:assert/strict'
import { lintNumbers } from '../src/index.js'

test('one document, one spelling of the same quantity', () => {
  const clean = lintNumbers('目录 4,985 个条目，其中 58.6% 停在底部。窗口 2026-11-02–11-08。')
  assert.deepEqual(clean.findings, [])
  assert.equal(clean.ok, true)
})

test('4,985 and 4985 in the same document is the defect worth catching', () => {
  const result = lintNumbers('目录 4,985 个条目，我们实测了 4985 个。')
  const finding = result.findings.find(entry => entry.rule === 'thousands-inconsistent')
  assert.ok(finding)
  assert.match(finding.message, /4,985/)
  assert.match(finding.message, /4985/)
})

test('percent spacing is compared per value, not globally', () => {
  const result = lintNumbers('命中率 58.6%，另一处写 58.6 %，还有一处 12%。')
  const findings = result.findings.filter(entry => entry.rule === 'percent-spacing')
  assert.equal(findings.length, 1)
  assert.match(findings[0].message, /58\.6/)
})

test('different numbers are allowed to be spelled differently', () => {
  assert.deepEqual(lintNumbers('一共 1,200 个，另外 3400 个没测。').findings, [])
})

test('a plain four-digit number next to a decimal is not a thousands candidate', () => {
  assert.deepEqual(lintNumbers('版本 1.4985 与 0.2026。').findings, [])
})
