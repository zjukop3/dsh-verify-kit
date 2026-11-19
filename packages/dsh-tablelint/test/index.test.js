import test from 'node:test'
import assert from 'node:assert/strict'
import { lintTables, splitCells, tablesOf } from '../src/index.js'

test('cells are split on unescaped pipes only', () => {
  assert.deepEqual(splitCells('| a | b |'), ['a', 'b'])
  assert.deepEqual(splitCells('| a\\|b | c |'), ['a|b', 'c'])
  assert.deepEqual(splitCells('a | b'), ['a', 'b'])
})

test('a well-formed table produces no findings', () => {
  const result = lintTables('| 项 | 值 |\n| --- | ---: |\n| 一 | 2 |\n| 三 | 4 |\n')
  assert.equal(result.ok, true)
  assert.equal(result.tables, 1)
  assert.deepEqual(result.findings, [])
})

test('a row with the wrong number of cells is an error on its own line', () => {
  const result = lintTables('| a | b |\n| --- | --- |\n| 1 | 2 |\n| 1 | 2 | 3 |\n| only |\n')
  assert.equal(result.ok, false)
  const counts = result.findings.filter(finding => finding.rule === 'column-count')
  assert.equal(counts.length, 2)
  assert.match(counts[0].message, /line 4/)
  assert.match(counts[1].message, /line 5/)
})

test('a delimiter row that disagrees with the header is reported separately', () => {
  const result = lintTables('| a | b |\n| --- |\n| 1 | 2 |\n')
  assert.ok(result.findings.some(finding => finding.rule === 'delimiter-count'))
})

test('tables inside fenced code are not linted', () => {
  assert.equal(tablesOf('```\n| a | b |\n| --- | --- |\n| 1 |\n```\n').length, 0)
})

test('duplicate and empty headers are warnings, and a header-only table is flagged', () => {
  const result = lintTables('| 值 | 值 |  |\n| --- | --- | --- |\n')
  assert.equal(result.ok, true)
  const rules = result.findings.map(finding => finding.rule).sort()
  assert.deepEqual(rules, ['duplicate-header', 'empty-header', 'empty-table'])
})

// Four table rules had only a silent direction.
test('a one-column table is a list wearing a table', () => {
  const result = lintTables('| 项目 |\n| --- |\n| 甲 |\n')
  const finding = result.findings.find(f => f.rule === 'single-column')
  assert.ok(finding, JSON.stringify(result.findings.map(f => f.rule)))
  assert.equal(finding.level, 'warn')
})

test('two columns with the same name are reported', () => {
  const result = lintTables('| 名称 | 名称 |\n| --- | --- |\n| 甲 | 乙 |\n')
  assert.ok(result.findings.some(f => f.rule === 'duplicate-header'), JSON.stringify(result.findings.map(f => f.rule)))
})

test('a column with no header is reported', () => {
  const result = lintTables('| 名称 |  |\n| --- | --- |\n| 甲 | 乙 |\n')
  assert.ok(result.findings.some(f => f.rule === 'empty-header'), JSON.stringify(result.findings.map(f => f.rule)))
})

test('a header and delimiter with no rows is reported', () => {
  const result = lintTables('| 名称 | 数量 |\n| --- | --- |\n')
  assert.ok(result.findings.some(f => f.rule === 'empty-table'), JSON.stringify(result.findings.map(f => f.rule)))
})

test('a normal two-column table stays clean', () => {
  assert.deepEqual(lintTables('| 名称 | 数量 |\n| --- | --- |\n| 甲 | 1 |\n').findings, [])
})

// Two real third-party READMEs use a blank first header on purpose: one is a
// two-column layout card (`| | |`), the other puts bold row labels in column one.
// The rule fired on both, which is a false positive on correct documents.
test('a blank first header is a row-label or layout table, not a defect', () => {
  const layout = lintTables('| | |\n| --- | --- |\n| **文件管理**<br/>树 | **Git**<br/>提交图 |\n')
  assert.ok(!layout.findings.some(f => f.rule === 'empty-header'), JSON.stringify(layout.findings))

  const rowLabels = lintTables('| | 用什么 | 不接会怎样 |\n| --- | --- | --- |\n| **写脚本** | 已配好的模型 | 只能出草稿 |\n')
  assert.ok(!rowLabels.findings.some(f => f.rule === 'empty-header'), JSON.stringify(rowLabels.findings))
})

test('a blank header in any other column still warns', () => {
  const middle = lintTables('| 名称 |  | 说明 |\n| --- | --- | --- |\n| 甲 | 乙 | 丙 |\n')
  assert.ok(middle.findings.some(f => f.rule === 'empty-header'), JSON.stringify(middle.findings))
})
