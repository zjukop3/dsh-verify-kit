# dsh-tablelint

A ragged table renders correctly in the editor that produced it and broken everywhere it is published. Cell counts are cheap to compare and expensive to notice by eye.

```bash
npx tablelint report.md            # human output, exit 1 on findings
npx tablelint report.md --json     # machine output for a pipeline
npx tablelint report.md --warnings-fail
```

生成报告的 Markdown 表格检查：行内单元格数与表头不一致、分隔行与表头数量不符、表头重名或为空、只有表头没有数据行。

Exit codes: `0` clean, `1` findings, `2` usage or read error. In DSH the same function is behind `POST /tablelint/api` with `{"text":"…"}` or `{"path":"…"}`, so the panel and CI agree by construction.

Part of [dsh-verify-kit](https://github.com/zjukop3/dsh-verify-kit): five small deterministic checks, each one verb, each runnable without DSH.

MIT.
