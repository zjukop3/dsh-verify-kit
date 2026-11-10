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
