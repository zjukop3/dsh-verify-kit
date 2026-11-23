// Builds the crawlable site for the five checks. Every page is bound to the
// searchable noun someone would type when they have the problem the check
// decides: a manifest, a citation list, a ragged table. The rules themselves
// are the content — they come from the test suite, so the page cannot drift
// from what the tool actually enforces.

import { mkdir, writeFile } from 'node:fs/promises'
import { readIndexNowConfig } from './indexnow-config.mjs'
import { resolve } from 'node:path'

import { CHECKS, ORIGIN, REPO, VERTICAL } from "./checks-data.mjs"
// ORIGIN/REPO/VERTICAL come from checks-data (env-aware there)

const styles = 'body{max-width:840px;margin:6vh auto;padding:24px;background:#fafaf8;color:#0a0a0a;font:16px/1.7 system-ui,sans-serif}main{border-top:8px solid #002fa7}h1{font-size:clamp(30px,5.5vw,48px);font-weight:250;line-height:1.15;margin-bottom:16px}h2{font-size:22px;font-weight:500;margin-top:36px}p,li,td,th{color:#3d3d3d}a{color:#002fa7}code{font:.9em/1.5 ui-monospace,monospace;background:#f0f0ee;padding:2px 5px;border-radius:3px}pre{padding:14px;overflow:auto;background:#0a0a0a;color:#fff}pre code{background:none;color:inherit;padding:0}table{border-collapse:collapse;width:100%;font-size:14px;margin:16px 0}th,td{border:1px solid #d4d4d2;padding:9px 11px;text-align:left;vertical-align:top}th{background:#f0f0ee}.eyebrow{font:12px/1.4 ui-monospace,monospace;letter-spacing:.12em;color:#002fa7}.nav{margin:24px 0;font-size:14px}.nav a{margin-right:14px}.limit{margin-top:28px;padding:14px 18px;background:#f0f0ee;border-left:4px solid #002fa7}small{display:block;margin-top:32px;color:#737373}@media(max-width:600px){body{margin:2vh auto;padding:18px}}'

const esc = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(check) {
  const url = `${ORIGIN}/${check.slug}/`
  const rules = check.rules
    .map(([rule, meaning]) => `<tr><td><code>${esc(rule)}</code></td><td>${esc(meaning)}</td></tr>`)
    .join('')
  const commands = check.usage.map(command => `<pre><code>${esc(command)}</code></pre>`).join('')
  const example = check.example ? `<h2>真实输入输出</h2>
<details><summary>输入</summary><pre><code>${esc(check.example.fixture)}</code></pre></details>
<pre><code>${esc(check.example.output)}</code></pre>
<p>出口码：${esc(check.example.exit)}。输出为真实 CLI 运行的逐字结果，由测试与工具保持同步。</p>` : ''
  const nav = CHECKS.map(entry => `<a href="../${entry.slug}/">${entry.slug}</a>`).join('') + '<a href="https://zjukop3.github.io/dsh-review-outbox/ecosystem/">生态月报</a>'
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
${example}
<p>出口码：<code>0</code> 干净、<code>1</code> 有发现、<code>2</code> 用法或读文件错误。<code>--json</code> 输出机器可读结果，<code>--warnings-fail</code> 让警告也算失败。DSH 内同样的函数在 <code>POST /${check.slug}/api</code>（<code>{"text":"…"}</code> 或 <code>{"path":"…"}</code>），面板与 CI 调同一实现，不可能不一致。</p>
<div class="limit"><strong>这是清单，不是专业人士。</strong>每条发现都是文件里可判定的结构缺陷，带行号或路径；它从不说「内容好不好」。</div>
<small>${esc(check.note)} · <a href="${REPO}#readme">dsh-verify-kit 全部 ${CHECKS.length} 个检查</a></small>
</main></body></html>`
}

function home() {
  const rows = CHECKS.map(check => {
    const url = `${ORIGIN}/${check.slug}/`
    return `<tr><td><a href="${esc(url)}">${esc(check.title)}</a></td><td>${esc(check.npm)}</td><td>${esc(check.decides)}</td></tr>`
  }).join('')
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>dsh-verify-kit · ${CHECKS.length} 个确定性交付检查</title><meta name="description" content="Agent 产出、人工验收前的 ${CHECKS.length} 个确定性检查：文件哈希、引用编号、文档结构、表格行列、数字写法。每个一个动词，出口码可接 CI，离线可跑。"><meta name="robots" content="index,follow"><link rel="canonical" href="${esc(`${ORIGIN}/`)}"><style>${styles}</style></head><body><main>
<p class="eyebrow">DSH VERIFY KIT</p>
<h1>${CHECKS.length} 个确定性交付检查</h1>
<p>Agent 已经产出结果、人准备验收的那一刻，这 ${CHECKS.length} 个检查各自决定一件事。每个都是单个命令，从文件本身判定，不调用任何模型。</p>
<table><tr><th>检查清单</th><th>npm 包</th><th>它决定什么</th></tr>${rows}</table>
<h2>为什么拆成 ${CHECKS.length} 个独立的包</h2>
<p>一份交付通常只需要其中一两个。装 ${CHECKS.length} 个用一个，和装一个用 ${CHECKS.length} 个，是两种不同的依赖负担。每个包：主函数 + CLI + host 路由，出口码 <code>0/1/2</code>，<code>--json</code> 出机器结果。规则与测试一一对应，页面上的规则表来自测试套件，不会漂移。</p>
<p>垂直行业的检查（合同、发票、电商）在 <a href="${VERTICAL}">dsh-vertical-kit</a>。</p>
<section class="install"><h2>在 DSH 中安装</h2><p>八件作品都在同一个 format 1 索引源里，从 npm registry 解析，装完即用。在「插件」启用「自定义插件索引」，添加 <code>https://zjukop3.github.io/dsh-review-outbox/plugins.json</code>，按名字搜索安装（本仓库 ${CHECKS.length} 个：${CHECKS.map(check => check.cli).join(" / ")}）。</p><p><a href="https://zjukop3.github.io/dsh-review-outbox/">索引源与全部收录说明</a></p></section>
<small><a href="${REPO}">github.com/zjukop3/dsh-verify-kit</a> · MIT · 28 tests</small>
</main></body></html>`
}

const root = resolve(import.meta.dirname, '..')
const indexNow = await readIndexNowConfig(root).catch(() => null)
await mkdir(resolve(root, 'site'), { recursive: true })
// What these five checks were actually run against, and what that found. The
// interesting number here is not "5 checks"; it is "tablelint read 100 real
// tables from 39 repositories nobody here wrote and reported nothing".
const corpus = () => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>这 ${CHECKS.length} 个检查跑过什么 · dsh-verify-kit</title><meta name="description" content="${CHECKS.length} 个通用检查的语料与缺陷记录：tablelint 在 39 个第三方仓库的 100 张真实表上零误报，numberlint 同样为零；outline-lint 有一条死规则已修。说清楚哪些验证过、哪些没有。"><meta name="robots" content="index,follow"><link rel="canonical" href="${esc(`${ORIGIN}/corpus/`)}"><style>${styles}</style></head><body><main>
<p class="eyebrow">DSH VERIFY KIT · EVIDENCE</p>
<h1>这 ${CHECKS.length} 个检查跑过什么</h1>
<nav class="nav"><a href="./">首页</a><a href="https://zjukop3.github.io/dsh-vertical-kit/defects/">22 个场景检查的缺陷台账</a><a href="https://github.com/zjukop3/dsh-verify-kit">GitHub 源码</a></nav>
<p>规则在测试里被观察到两个方向，只说明"我想到的情况它判对了"。真正的证据是把检查指向<strong>别人写的文件</strong>，看它会不会误报、能不能抓到真错。下面是实测——每个数字都由 <code>test/third-party-corpus.test.js</code> 重新推导，页面上写的东西和代码做的事只能是一件事。</p>

<h2>第三方语料（别人写的 39 份 README）</h2>
<table>
<tr><th>检查</th><th>看了什么</th><th>报了什么</th><th>怎么解读</th></tr>
<tr><td><code>tablelint</code></td><td>37 份 README 里的 <strong>100 张真实表格</strong></td><td>0（修掉一个误报之后）</td><td>它一开始报了 4 次 <code>empty-header</code>，全部是<strong>故意的无表头表格</strong>：一类是 <code>| | |</code> 做的视觉分栏，一类是第一列放粗体行标签。已改成豁免这两种形状，其余列仍报</td></tr>
<tr><td><code>numberlint</code></td><td>39 份 README 的全部数字写法</td><td>2 条 <code>thousands-inconsistent</code></td><td><strong>两条都是真发现</strong>：同一份文档的两种译文里，同一个数量写成 <code>1,500</code> 和 <code>1500</code>。三十九份文档只报两次，且集中在同一个仓库的两份译文——这是精确，不是噪音</td></tr>
<tr><td><code>outline-lint</code></td><td>39 份 README</td><td><code>no-conclusion</code> 39 次</td><td><strong>不是缺陷，是我点错了检查器</strong>：它判的是"研究报告有没有先给结论"，而 README 不是研究报告。强行让 README 通过这条，等于把标准降到没有意义</td></tr>
<tr><td><code>citelint</code></td><td>本仓库文档</td><td>—</td><td>没有第三方语料。别人的 README 里没有引用编号体系</td></tr>
<tr><td><code>hashcheck</code></td><td>本仓库交付文件</td><td>—</td><td>针对清单与磁盘的比对，第三方语料不适用</td></tr>
</table>

<h2>缺陷记录</h2>
<table>
<tr><th>#</th><th>检查 / 规则</th><th>问题</th><th>修复</th></tr>
<tr><td>1</td><td><code>outline-lint</code> / <code>empty-heading</code></td><td><strong>死规则</strong>：标题正则要求 <code>#{1,6}\s+</code> 后还有非空文本，而"标题文字被删空"正是这条规则存在的理由，它永远看不到。我为证明它会触发而写的测试，证明了它触发不了</td><td>0.1.4，<code>##</code> 单独一行现在报 <code>empty-heading</code></td></tr>
<tr><td>2</td><td>十条规则</td><td><strong>只有单向测试</strong>：outline-lint 3 条、tablelint 4 条、numberlint 1 条、hashcheck 1 条从没在测试里被触发过；citelint 则完全没有"干净文档产出零 finding"的用例</td><td>全部补齐，现在 25/25 双向</td></tr>
</table>
<p>第 1 条是 <code>scripts/audit-rules.mjs</code> 找出来的——这个审计要求每条规则都被观察到两个方向。第 2 条是它第一次跑出来的结果：<strong>10/26</strong>。</p>

<h2>这个审计本身</h2>
<p>审计不是万能的：它<strong>分不出"死规则"和"没人写触发测试"</strong>。一条没有触发测试的规则，两种情况的症状完全一样，只有人去写那条测试才会知道是哪一种。第 1 条就是写测试的人写了测试、然后发现它不会红。</p>

<p>相关的两份：<a href="https://zjukop3.github.io/dsh-review-outbox/handover/">项目交接单</a>（谁接手、这 ${CHECKS.reduce((sum, check) => sum + check.rules.length, 0)} 条规则怎么验证、为什么采纳指标是 0）与 <a href="https://zjukop3.github.io/dsh-vertical-kit/defects/">场景检查的缺陷台账</a>（那边的数字由它自己的台账算，这里不抄）。</p>
<p><a href="./">← 回到 ${CHECKS.length} 个检查一览</a></p>
</main></body></html>`
await mkdir(resolve(root, 'site', 'corpus'), { recursive: true })
await writeFile(resolve(root, 'site/corpus/index.html'), corpus())
await writeFile(resolve(root, 'site/index.html'), home())
for (const check of CHECKS) {
  await mkdir(resolve(root, 'site', check.slug), { recursive: true })
  await writeFile(resolve(root, 'site', check.slug, 'index.html'), page(check))
}
const urls = [`${ORIGIN}/`, `${ORIGIN}/corpus/`, ...CHECKS.map(check => `${ORIGIN}/${check.slug}/`)]
await writeFile(resolve(root, 'site/robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`)
if (indexNow) await writeFile(resolve(root, `site/${indexNow.key}.txt`), `${indexNow.key}\n`)
await writeFile(resolve(root, 'site/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(loc => `  <url><loc>${esc(loc)}</loc></url>`).join('\n')}\n</urlset>\n`)
const llms = [
  `# dsh-verify-kit`,
  ``,
  `> Generic deliverable-defect checks for DeepSeek Harness: hashes, citations, structure, tables, numbers. Each is one verb, each runs without DSH, each returns the same JSON from the CLI and the host route.`,
  ``,
  ...CHECKS.map(check => `- ${ORIGIN}/${check.slug}/: ${check.title} — ${check.description}`),
  ``,
  `- ${REPO}: Public source code, ${CHECKS.length} packages, one implementation per check shared by the CLI and the host route.`,
].join('\n')
await writeFile(resolve(root, 'site/llms.txt'), llms)
console.log(JSON.stringify({ ok: true, pages: urls.length }))
