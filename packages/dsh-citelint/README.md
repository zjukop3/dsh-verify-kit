# dsh-citelint

A report cites the same source twice under two numbers, drops number 4 when a paragraph is deleted, or lists a source that no sentence ever uses. Each one is decidable from the markdown, so this checks it before a reviewer has to.

```bash
npx citelint report.md            # human output, exit 1 on findings
npx citelint report.md --json     # machine output for a pipeline
npx citelint report.md --warnings-fail
```

交付报告的引用检查：编号断号、同一来源重复编号、列了却没被引用的来源、指向不存在本地文件的链接。

Exit codes: `0` clean, `1` findings, `2` usage or read error. In DSH the same function is behind `POST /citelint/api` with `{"text":"…"}` or `{"path":"…"}`, so the panel and CI agree by construction.

Part of [dsh-verify-kit](https://github.com/zjukop3/dsh-verify-kit): five small deterministic checks, each one verb, each runnable without DSH.

MIT.
