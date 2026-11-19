import test from 'node:test'
import assert from 'node:assert/strict'
import { headingsOf, lintOutline } from '../src/index.js'

const good = '# 报告\n\n## 结论\n\n做完了。\n\n## 复现\n\n```\nnpm test\n```\n'

test('a reviewable document passes', () => {
  const result = lintOutline(good)
  assert.deepEqual(result.findings, [])
  assert.equal(result.ok, true)
})

test('headings inside a fenced block are not headings', () => {
  const text = '# t\n\n```\n## not a heading\n```\n'
  assert.deepEqual(headingsOf(text).map(heading => heading.text), ['t'])
})

test('a lost heading level is reported with the line', () => {
  const result = lintOutline('# t\n\n#### deep\n\n## 结论\n\n好\n\n## 复现\n\n```\nnpm test\n```\n')
  const jump = result.findings.find(finding => finding.rule === 'heading-jump')
  assert.ok(jump)
  assert.match(jump.message, /line 3/)
})

test('no title and two titles are different defects', () => {
  assert.equal(lintOutline('## 结论\n\n好\n\n## 复现\n\n```\nnpm test\n```\n').findings[0].rule, 'no-title')
  const two = lintOutline('# a\n\n# b\n\n## 结论\n\n好\n\n## 复现\n\n```\nnpm test\n```\n')
  assert.equal(two.findings[0].rule, 'multiple-h1')
})

test('a conclusion paragraph without a heading also counts', () => {
  const result = lintOutline('# t\n\n结论：全部通过。\n\n## 复现\n\n```\nnpm test\n```\n')
  assert.equal(result.findings.some(finding => finding.rule === 'no-conclusion'), false)
})

test('a document with nothing to run fails', () => {
  const result = lintOutline('# t\n\n## 结论\n\n好\n')
  assert.equal(result.ok, false)
  assert.ok(result.findings.some(finding => finding.rule === 'no-reproduction'))
})

// Three rules had only ever been observed staying silent. A rule no test makes
// fire is a rule nobody has seen work.
test('a document with no level-1 heading is an error', () => {
  const result = lintOutline('## 结论\n\n做完了。\n')
  const finding = result.findings.find(f => f.rule === 'no-title')
  assert.ok(finding, JSON.stringify(result.findings.map(f => f.rule)))
  assert.equal(finding.level, 'error')
})

test('two level-1 headings are an error', () => {
  const result = lintOutline('# 报告\n\n# 另一个标题\n\n## 结论\n')
  assert.ok(result.findings.some(f => f.rule === 'multiple-h1'), JSON.stringify(result.findings.map(f => f.rule)))
})

test('a heading with no text is an error, and names the line', () => {
  const result = lintOutline('# 报告\n\n##\n\n正文。\n')
  const finding = result.findings.find(f => f.rule === 'empty-heading')
  assert.ok(finding, JSON.stringify(result.findings.map(f => f.rule)))
  assert.match(finding.message, /line 3/)
})
