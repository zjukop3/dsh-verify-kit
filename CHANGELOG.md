# Changelog

## [0.1.6] — 2026-11-19

拿 39 份**别人写的** README 喂这五个检查，`tablelint` 报出一个误报。

- **dsh-tablelint 0.2.0**：`empty-header` 对**故意的无表头表格**误报。真实文档里两种形状是合法的：`| | |` 做的两列视觉分栏，以及第一列放粗体行标签（`| | 用什么 | 不接会怎样 |`）。两种都豁免，其余列的空表头仍然报。37 份 README、100 张真实表格，修前 4 条误报，修后 0。
- `numberlint` 在同批语料上报 2 条 `thousands-inconsistent`——**都是真发现**：同一份文档的两种译文里同一个数量写成 `1,500` 和 `1500`。三十九份文档只报两次，且集中在同一个仓库的两份译文。
- `outline-lint` 在同批语料上报 `no-conclusion` 39 次——**那不是缺陷，是我点错了检查器**：它判的是"研究报告有没有先给结论"，README 不是研究报告。强行让 README 通过，等于把标准降到没有意义。
- 站点新增 `/corpus/`：每个数字都由 `test/third-party-corpus.test.js` 重新推导，页面上写的东西和代码做的事只能是一件事。第一版页面写"tablelint 零 finding"，实测是 4——所以它被改成了现在这份。

**升级路径**：`tablelint` 只会少报误报。若你的 CI 依赖 `empty-header` 拦住第一列空表头，需要改用其它规则。

## [0.1.5] — 2026-11-19

审计加了第三类报告：**嫌疑守卫**，以及一条明确说「审计分不出死规则与未测」的措辞。

- 某条规则若藏在 `if (` 后、而条件里有**能匹配空字符串的正则字面量**，这条规则可能永不执行。判定交给引擎：`new RegExp(body).test('')`，不是靠文本猜——第一版靠文本猜，把 `/^https?:\/\//` 里的 `//` 误判成空正则，正是"用拼写代替性质"的又一次复发。
- 整行注释掉的 `add(...)` 不再算规则（否则会报出不存在的缺口）；行尾注释有意保留——这个扫描器分不清字符串里的 `//` 和注释，漏掉一条活规则比多报一条注释更糟。
- 审计自身补了 9 条测试，并接进 `npm test`（此前 `packages/*/test` 的 glob 扫不到根 `test/`）。

**升级路径**：只影响 `npm run check` 的输出与阻断条件，不影响任何已发布包的运行时。

## [0.1.4] — 2026-11-19

把 vertical-kit 的规则双向审计复制过来，接进 `npm run check`，第一次跑出 10/26。

- **dsh-outline-lint 0.1.4**：`empty-heading` 是死规则——标题正则要求 `#{1,6}\s+` 后再有非空文本，而「标题文字被删空」正是这条规则存在的理由，它永远看不到。改成允许空标题后 `##` 单独一行会报 `empty-heading`。
- 十条规则原本只有静默方向（从没在测试里触发过）：outline-lint 3 条（`no-title`、`multiple-h1`、`empty-heading`）、tablelint 4 条（`single-column`、`duplicate-header`、`empty-header`、`empty-table`）、numberlint 1 条（`range-dash`）、hashcheck 1 条（`size-mismatch`）；citelint 则完全没有"干净文档产出零 finding"的用例。全部补齐，现在 25/25 双向。

**升级路径**：`outline-lint` 只会新报 `empty-heading`，不会改变已有的判定。

## [0.1.2/0.1.3] - 2026-11-15

- dsh-agreement-check 0.1.3: the cordis.patch.yml and route prefix compose under the package's own name — the rename from dsh-contract-check had left the published patch stale, so installs composed as dsh-contract-check and the README's /agreement-check/api 404ed.
- dsh-outline-lint 0.1.3: the README and site page document the conclusion rule's scope — it targets report-like deliverables; reference docs (READMEs, handbooks) have no conclusion obligation, so a no-conclusion finding there is an out-of-domain hint, not a defect. Found by the first CLI dogfood run on this repository's own files.
- dsh-hashcheck 0.1.3 / dsh-citelint 0.1.3: republish wave with `engines.dsh` declared and icons shipped in-repo (the catalog listing requires icon assets).
- 0.1.1 versions across the wave were gap-fills published while latest had already moved on; the dist-tags lesson from that is recorded in review-outbox's RELEASE-RUNBOOK.

## [0.1.0] - 2026-11-10

- Initial publication wave: five packages (hashcheck, citelint, outline-lint, tablelint, numberlint), each with a main function, CLI, and host route; 28 tests covering real files and exit codes.
