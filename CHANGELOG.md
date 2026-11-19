# Changelog

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
