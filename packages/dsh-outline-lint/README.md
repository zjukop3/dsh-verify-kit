# dsh-outline-lint

Length is not the failure mode; shape is. This reports the five defects that make a document unreviewable regardless of how good the reasoning is.

```bash
npx outline-lint report.md            # human output, exit 1 on findings
npx outline-lint report.md --json     # machine output for a pipeline
npx outline-lint report.md --warnings-fail
```

交付文档结构检查：缺标题、多个一级标题、标题跳级、开头没有结论、没有任何可复现命令。

Exit codes: `0` clean, `1` findings, `2` usage or read error. In DSH the same function is behind `POST /outline-lint/api` with `{"text":"…"}` or `{"path":"…"}`, so the panel and CI agree by construction.

Part of [dsh-verify-kit](https://github.com/zjukop3/dsh-verify-kit): five small deterministic checks, each one verb, each runnable without DSH.

MIT.
