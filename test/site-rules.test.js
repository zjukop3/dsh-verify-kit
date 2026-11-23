import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { CHECKS } from '../scripts/checks-data.mjs'

// 站点上「N 个检查 / M 条规则」这两个数字必须等于数据，而不是等于上个月的手写值。
//
// 2026-11-23：首页写着「五个检查」（对），语料页却写着「192 条规则」和「22 个场景检查」——
// 前者是本仓规则数的旧值（实际 25），后者是隔壁仓的检查数（实际 28），两边各自过期在不同
// 月份。跨仓的数字尤其危险：它没法从本仓推导，只能过期。
//
// 判据：站点页里的数字由 build-site 从 CHECKS 推出；本仓的规则总数还要与代码里真实存在的
// 规则集合对得上——页面少列一条规则，与少写一个数字是同一种谎。
const root = resolve(import.meta.dirname, '..')

test('站点上的检查数与规则总数等于数据', async () => {
  const home = await readFile(resolve(root, 'site/index.html'), 'utf8')
  const corpus = await readFile(resolve(root, 'site/corpus/index.html'), 'utf8')
  assert.match(home, new RegExp(`<h1>${CHECKS.length} 个确定性交付检查`))
  assert.match(corpus, new RegExp(`这 ${CHECKS.length} 个检查跑过什么`))
  assert.match(corpus, new RegExp(`回到 ${CHECKS.length} 个检查一览`))
  const rules = CHECKS.reduce((sum, check) => sum + check.rules.length, 0)
  assert.match(corpus, new RegExp(`这 ${rules} 条规则怎么验证`), '语料页的规则数与 checks-data 不一致，改完要重跑 build-site')
})

test('页面列的规则与代码里真实的规则集合一一对应（少列一条就是少一条）', async () => {
  const { auditRules } = await import('../scripts/audit-rules.mjs')
  const rows = await auditRules()
  const byPackage = new Map()
  for (const row of rows) {
    if (!byPackage.has(row.package)) byPackage.set(row.package, new Set())
    byPackage.get(row.package).add(row.rule)
  }
  const failures = []
  for (const check of CHECKS) {
    const inCode = byPackage.get(check.npm) ?? new Set()
    const listed = new Set(check.rules.flatMap(([rule]) => rule.split(',').map(part => part.trim())).filter(Boolean))
    for (const rule of inCode) if (!listed.has(rule)) failures.push(`${check.slug}: 代码里有规则 ${rule}，页面上没列`)
    for (const rule of listed) if (!inCode.has(rule)) failures.push(`${check.slug}: 页面列了 ${rule}，代码里找不到`)
  }
  assert.deepEqual(failures, [], failures.join('\n'))
})
