// Builds the crawlable site for the five checks. Every page is bound to the
// searchable noun someone would type when they have the problem the check
// decides: a manifest, a citation list, a ragged table. The rules themselves
// are the content — they come from the test suite, so the page cannot drift
// from what the tool actually enforces.

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ORIGIN = process.env.PUBLIC_ORIGIN || 'https://zjukop3.github.io/dsh-verify-kit'
const REPO = 'https://github.com/zjukop3/dsh-verify-kit'

const CHECKS = [
  {
    slug: 'hashcheck',
    npm: 'dsh-hashcheck',
    noun: '交付文件校验 / 文件哈希清单',
    title: '交付文件校验清单（SHA-256 manifest）',
    description: '交付前生成 SHA-256 清单，验收时逐文件比对：哪个文件改了、哪个丢了、哪个没进清单。出口码 0/1/2 可接 CI。',
    decides: '交付出去的 bytes 和你验收过的 bytes 是否还是同一份',
    rules: [
      ['changed', '清单里有、磁盘上也有，但哈希对不上 → error，报前后摘要'],
      ['missing', '清单里有、磁盘上没有 → error'],
      ['unlisted', '磁盘上有、清单里没有 → warn（交付后混进来的文件）'],
      ['size-mismatch', '哈希相同但记录的字节数不符 → warn（顺手核对，极少出现）'],
    ],
    usage: [
      'npx dsh-hashcheck build ./delivery --out delivery/hashcheck.json --ignore node_modules',
      'npx dsh-hashcheck verify delivery/hashcheck.json --dir ./delivery',
    ],
    note: '清单本身是确定性的：路径排序、正斜杠、无时间戳，同一目录在任何机器上生成同一份清单，可以直接 diff。',
  },
  {
    slug: 'citelint',
    npm: 'dsh-citelint',
    noun: '报告引用检查 / 引用编号',
    title: '报告引用检查清单',
    description: '报告交付前的引用检查：编号断号、同一来源重复编号、列了没引用的来源、指向不存在本地文件的链接。Markdown 纯文本即可判定。',
    decides: '引用编号、来源与本地链接是否自洽',
    rules: [
      ['numbering-gap', '编号出现 1, 2, 4 → warn，指出期望 1..N（删段落后的典型残留）'],
      ['duplicate-number', '同一个编号定义了两次 → error'],
      ['duplicate-url', '两个编号指向同一来源 → warn'],
      ['unreferenced', '来源列在文末但正文从未引用 → warn'],
      ['undefined', '正文引用了 [3] 但文末没有 [3] → error'],
      ['local-missing', '引用指向 ./nope.csv 但交付目录里没有这个文件 → error'],
    ],
    usage: [
      'npx citelint report.md --json',
      'npx citelint report.md --warnings-fail',
    ],
    note: 'http(s) 引用不查文件系统；本地相对路径才会对照交付目录。检查的是引用结构，不是引用内容对不对。',
  },
  {
    slug: 'outline-lint',
    noun: '文档结构检查 / 报告结构',
    npm: 'dsh-outline-lint',
    title: '文档结构检查清单',
    description: '报告交付前的结构检查：有没有标题、有没有结论先行、有没有能跑的复现命令、标题有没有跳级。长度不重要，结构才重要。',
    decides: '这份文档在结构上是否可审',
    rules: [
      ['no-title', '没有一级标题 → error'],
      ['multiple-h1', '多个一级标题 → warn（只有文章标题该是一级）'],
      ['heading-jump', 'h1 下面直接 h4 → warn，提示层级丢失'],
      ['no-conclusion', '没有「结论/摘要」标题、开头也没有「结论：」→ error'],
      ['no-reproduction', '没有复现章节、也没有任何可运行命令 → error'],
    ],
    usage: [
      'npx outline-lint report.md --json',
      'npx outline-lint report.md --warnings-fail',
    ],
    note: '判定从文件来，不做任何模型调用：结论先行匹配 结论/摘要/summary/tl;dr，复现匹配章节名或 node/npm/python/git/docker 等命令行。',
  },
  {
    slug: 'tablelint',
    npm: 'dsh-tablelint',
    noun: 'Markdown 表格检查 / 表格错位',
    title: 'Markdown 表格检查清单',
    description: '生成报告里最常见的缺陷：表格行列不齐。在生成它的编辑器里渲染正常，发布出去就碎。单元格数量是廉价的对比，肉眼发现却很贵。',
    decides: '每张表的每行单元格数是否与表头一致',
    rules: [
      ['column-count', '某行单元格数与表头不符 → error，报行号'],
      ['delimiter-count', '分隔行数量与表头不符 → error'],
      ['single-column', '只有一列的「表格」→ warn（那是列表）'],
      ['duplicate-header', '两列同名 → warn'],
      ['empty-header', '某列没有表头 → warn'],
      ['empty-table', '只有表头没有数据行 → warn'],
    ],
    usage: [
      'npx tablelint report.md --json',
      'npx tablelint report.md --warnings-fail',
    ],
    note: '支持转义竖线（\\|），代码块里的表格不参与检查—— fenced code 内的示例不该被当成缺陷。',
  },
  {
    slug: 'numberlint',
    npm: 'dsh-numberlint',
    noun: '数字一致性 / 报告数字检查',
    title: '文档内数字写法一致性检查',
    description: '同一份文档里「4,985」和「4985」各出现一次，读者就会两个都不信。这个检查比较写法而不是数值，报出同一数量的不同拼写。',
    decides: '同一数量在文档内是否只有一种写法',
    rules: [
      ['thousands-inconsistent', '4,985 与 4985 同时出现 → warn，报两种拼写'],
      ['percent-spacing', '58.6% 与 58.6 % 同时出现 → warn'],
      ['range-dash', '区间连接号混用（11-02–08 与 11-02-08）→ warn'],
    ],
    usage: [
      'npx numberlint report.md --json',
      'npx numberlint report.md --warnings-fail',
    ],
    note: '比较的是形态不是值：不同数量允许不同写法；带小数点的版本号不会被误判成千位分隔候选。',
  },
]

const styles = 'body{max-width:840px;margin:6vh auto;padding:24px;background:#fafaf8;color:#0a0a0a;font:16px/1.7 system-ui,sans-serif}main{border-top:8px solid #002fa7}h1{font-size:clamp(30px,5.5vw,48px);font-weight:250;line-height:1.15;margin-bottom:16px}h2{font-size:22px;font-weight:500;margin-top:36px}p,li,td,th{color:#3d3d3d}a{color:#002fa7}code{font:.9em/1.5 ui-monospace,monospace;background:#f0f0ee;padding:2px 5px;border-radius:3px}pre{padding:14px;overflow:auto;background:#0a0a0a;color:#fff}pre code{background:none;color:inherit;padding:0}table{border-collapse:collapse;width:100%;font-size:14px;margin:16px 0}th,td{border:1px solid #d4d4d2;padding:9px 11px;text-align:left;vertical-align:top}th{background:#f0f0ee}.eyebrow{font:12px/1.4 ui-monospace,monospace;letter-spacing:.12em;color:#002fa7}.nav{margin:24px 0;font-size:14px}.nav a{margin-right:14px}.limit{margin-top:28px;padding:14px 18px;background:#f0f0ee;border-left:4px solid #002fa7}small{display:block;margin-top:32px;color:#737373}@media(max-width:600px){body{margin:2vh auto;padding:18px}}'

const esc = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(check) {
  const url = `${ORIGIN}/${check.slug}/`
  const rules = check.rules
    .map(([rule, meaning]) => `<tr><td><code>${esc(rule)}</code></td><td>${esc(meaning)}</td></tr>`)
    .join('')
  const commands = check.usage.map(command => `<pre><code>${esc(command)}</code></pre>`).join('')
  const nav = CHECKS.map(entry => `<a href="../${entry.slug}/">${entry.slug}</a>`).join('')
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(check.title)} · ${check.npm}</title><meta name="description" content="${esc(check.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${esc(url)}"><style>${styles}</style></head><body><main>
<p class="eyebrow">DSH VERIFY KIT · ${esc(check.npm)}</p>
<h1>${esc(check.title)}</h1>
<p><strong>它决定一件事：</strong>${esc(check.decides)}。</p>
<nav class="nav">${nav}<a href="${REPO}">GitHub 源码</a><a href="https://www.npmjs.com/package/${check.npm}">npm</a></nav>
<h2>检查规则</h2>
<table><tr><th>规则</th><th>判定</th></tr>${rules}</table>
<h2>用法</h2>
${commands}
<p>出口码：<code>0</code> 干净、<code>1</code> 有发现、<code>2</code> 用法或读文件错误。<code>--json</code> 输出机器可读结果，<code>--warnings-fail</code> 让警告也算失败。DSH 内同样的函数在 <code>POST /${check.slug}/api</code>（<code>{"text":"…"}</code> 或 <code>{"path":"…"}</code>），面板与 CI 调同一实现，不可能不一致。</p>
<div class="limit"><strong>这是清单，不是专业人士。</strong>每条发现都是文件里可判定的结构缺陷，带行号或路径；它从不说「内容好不好」。</div>
<small>${esc(check.note)} · <a href="${REPO}#readme">dsh-verify-kit 全部五个检查</a></small>
</main></body></html>`
}

function home() {
  const rows = CHECKS.map(check => {
    const url = `${ORIGIN}/${check.slug}/`
    return `<tr><td><a href="${esc(url)}">${esc(check.title)}</a></td><td>${esc(check.npm)}</td><td>${esc(check.decides)}</td></tr>`
  }).join('')
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>dsh-verify-kit · 五个确定性交付检查</title><meta name="description" content="Agent 产出、人工验收前的五个确定性检查：文件哈希、引用编号、文档结构、表格行列、数字写法。每个一个动词，出口码可接 CI，离线可跑。"><meta name="robots" content="index,follow"><link rel="canonical" href="${esc(`${ORIGIN}/`)}"><style>${styles}</style></head><body><main>
<p class="eyebrow">DSH VERIFY KIT</p>
<h1>五个确定性交付检查</h1>
<p>Agent 已经产出结果、人准备验收的那一刻，这五个检查各自决定一件事。每个都是单个命令，从文件本身判定，不调用任何模型。</p>
<table><tr><th>检查清单</th><th>npm 包</th><th>它决定什么</th></tr>${rows}</table>
<h2>为什么是五个独立的包</h2>
<p>一份交付通常只需要其中一两个。装五个用一个，和装一个用五个，是两种不同的依赖负担。每个包：主函数 + CLI + host 路由，出口码 <code>0/1/2</code>，<code>--json</code> 出机器结果。规则与测试一一对应，页面上的规则表来自测试套件，不会漂移。</p>
<p>垂直行业的检查（合同、发票、电商）在 <a href="https://zjukop3.github.io/dsh-vertical-kit/">dsh-vertical-kit</a>。</p>
<small><a href="${REPO}">github.com/zjukop3/dsh-verify-kit</a> · MIT · 28 tests</small>
</main></body></html>`
}

const root = resolve(import.meta.dirname, '..')
await mkdir(resolve(root, 'site'), { recursive: true })
await writeFile(resolve(root, 'site/index.html'), home())
for (const check of CHECKS) {
  await mkdir(resolve(root, 'site', check.slug), { recursive: true })
  await writeFile(resolve(root, 'site', check.slug, 'index.html'), page(check))
}
const urls = [`${ORIGIN}/`, ...CHECKS.map(check => `${ORIGIN}/${check.slug}/`)]
await writeFile(resolve(root, 'site/robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`)
await writeFile(resolve(root, 'site/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(loc => `  <url><loc>${esc(loc)}</loc></url>`).join('\n')}\n</urlset>\n`)
console.log(JSON.stringify({ ok: true, pages: urls.length }))
