// The five checks, as data. Shared by the site builder and the examples test:
// the test re-runs every example through the real CLI and compares with what
// the site embeds, so a page cannot drift from the tool it documents.

export const ORIGIN = process.env.PUBLIC_ORIGIN || 'https://zjukop3.github.io/dsh-verify-kit'
export const REPO = 'https://github.com/zjukop3/dsh-verify-kit'
export const VERTICAL = 'https://zjukop3.github.io/dsh-vertical-kit/'

export const CHECKS = [
  {
    slug: 'hashcheck',
    npm: 'dsh-hashcheck',
    bin: 'dsh-hashcheck',
    pkgDir: 'dsh-hashcheck',
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
    example: {
      command: 'dsh-hashcheck build ./delivery && dsh-hashcheck verify ./delivery/hashcheck.json --dir ./delivery',
      fixture: 'delivery/\n├── report.md      ← 交付后有人改了一个字\n├── nested.csv\n└── hashcheck.json',
      output: '$ dsh-hashcheck build ./delivery\ndelivery/hashcheck.json: 2 files, sha256\n$ dsh-hashcheck verify delivery/hashcheck.json --dir ./delivery\nok: 2 checked, 0 errors, 1 warnings\n\n# 有人改了 report.md 之后再验：\n$ dsh-hashcheck verify delivery/hashcheck.json --dir ./delivery\nerror changed report.md changed: expected d2f56516fd6c…, found 99527e917f49…\nwarn unlisted hashcheck.json is on disk but not in the manifest\nfail: 2 checked, 1 errors, 1 warnings',
      exit: '改前 0，改后 1',
    },
  },
  {
    slug: 'citelint',
    npm: 'dsh-citelint',
    bin: 'citelint',
    pkgDir: 'dsh-citelint',
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
    example: {
      command: 'citelint report-cite.md',
      fixture: '## 结论\n\n见 [1] 与 [3]。\n\n[1]: https://example.com/a\n[2]: https://example.com/b\n[3]: ./missing-appendix.md',
      output: '$ citelint report-cite.md\nwarn unreferenced [2] is defined and never cited in the text\nerror local-missing [3] points at ./missing-appendix.md, which is not in the delivered directory\nfail: 1 errors, 1 warnings',
      exit: '1',
    },
  },
  {
    slug: 'outline-lint',
    npm: 'dsh-outline-lint',
    bin: 'outline-lint',
    pkgDir: 'dsh-outline-lint',
    noun: '文档结构检查 / 报告结构',
    title: '文档结构检查清单',
    description: '报告交付前的结构检查：有没有标题、有没有结论先行、有没有能跑的复现命令、标题有没有跳级。长度不重要，结构才重要。范围：结论规则针对报告类交付物；参考文档（README、手册）没有结论义务，域外提示不是缺陷。',
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
    example: {
      command: 'outline-lint report-outline.md',
      fixture: '# 数据管线报告\n\n#### 处理流程\n\n原始数据经清洗后入库。',
      output: '$ outline-lint report-outline.md\nwarn heading-jump line 3: "处理流程" is h4 directly under h1, which reads as a lost level\nerror no-conclusion no conclusion before the body: add a heading matching 结论/摘要 or open the first paragraph with 结论：\nerror no-reproduction nothing a reader can run: add a 复现 section or a fenced command\nfail: 2 errors, 1 warnings',
      exit: '1',
    },
  },
  {
    slug: 'tablelint',
    npm: 'dsh-tablelint',
    bin: 'tablelint',
    pkgDir: 'dsh-tablelint',
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
    example: {
      command: 'tablelint report-table.md',
      fixture: '| 项目 | 数量 |\n| --- | --- |\n| 一 | 2 |\n| 三 | 4 | 6 |',
      output: '$ tablelint report-table.md\nerror column-count line 4: 3 cells in a 2-column table\nfail: 1 errors, 0 warnings',
      exit: '1',
    },
  },
  {
    slug: 'numberlint',
    npm: 'dsh-numberlint',
    bin: 'numberlint',
    pkgDir: 'dsh-numberlint',
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
    example: {
      command: 'numberlint report-numbers.md',
      fixture: '目录 4,985 个条目，我们实测了 4985 个。命中率 58.6%，另一处写 58.6 %。',
      output: '$ numberlint report-numbers.md\nwarn thousands-inconsistent 4985 is written "4,985" and "4985" in the same document\nwarn percent-spacing 58.6% is written "58.6%" and "58.6 %"\nok: 0 errors, 2 warnings',
      exit: '0（警告不失败；--warnings-fail 时为 1）',
    },
  },
]
