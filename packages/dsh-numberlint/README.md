# dsh-numberlint

Comparing forms rather than values is the point: 4,985 and 4985 are the same number spelled two ways, and a reader who sees both stops trusting either.

```bash
npx numberlint report.md            # human output, exit 1 on findings
npx numberlint report.md --json     # machine output for a pipeline
npx numberlint report.md --warnings-fail
```

同一文档内的数字写法一致性：同一个数量既写 4,985 又写 4985、同一百分比加了空格与没加空格、区间混用不同的连接号。

Exit codes: `0` clean, `1` findings, `2` usage or read error. In DSH the same function is behind `POST /numberlint/api` with `{"text":"…"}` or `{"path":"…"}`, so the panel and CI agree by construction.

Part of [dsh-verify-kit](https://github.com/zjukop3/dsh-verify-kit): five small deterministic checks, each one verb, each runnable without DSH.

MIT.
