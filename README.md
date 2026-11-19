# dsh-verify-kit

Five small deterministic checks for deliverables that an agent produced and a person is about to accept. Each is one verb, each runs without DSH, each returns the same JSON whether you call the CLI or the host route.

Listed in [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) — catalog pages: [dsh-hashcheck](https://awesome-dsh-plugin.com/p/zjukop3/dsh-verify-kit--packages-dsh-hashcheck/) · [dsh-citelint](https://awesome-dsh-plugin.com/p/zjukop3/dsh-verify-kit--packages-dsh-citelint/) · [dsh-outline-lint](https://awesome-dsh-plugin.com/p/zjukop3/dsh-verify-kit--packages-dsh-outline-lint/) · [dsh-tablelint](https://awesome-dsh-plugin.com/p/zjukop3/dsh-verify-kit--packages-dsh-tablelint/) · [dsh-numberlint](https://awesome-dsh-plugin.com/p/zjukop3/dsh-verify-kit--packages-dsh-numberlint/).

| package | what it decides |
| --- | --- |
| [dsh-hashcheck](packages/dsh-hashcheck) | which bytes moved since the manifest was written |
| [dsh-citelint](packages/dsh-citelint) | whether the citation numbers, sources and local links hold together |
| [dsh-outline-lint](packages/dsh-outline-lint) | whether the document has a title, a conclusion up front, and something to run (the conclusion rule targets report-like deliverables; reference docs are out of domain) |
| [dsh-tablelint](packages/dsh-tablelint) | whether every table row has the column count its header claims |
| [dsh-numberlint](packages/dsh-numberlint) | whether one quantity is spelled two ways in one document |

```bash
npm test          # 28 tests, no network, no fixtures to download
```

Design rules these follow, and the reason they are separate packages rather than one:

- **A check must be decidable from the file.** No model calls, no heuristics dressed as findings. If a rule cannot be stated as a comparison, it is not in here.
- **A finding names a line or a path.** "Something may be wrong" is not a result.
- **Exit codes are the interface.** `0` clean, `1` findings, `2` usage error. A check that cannot fail a pipeline is decoration.
- **The route and the CLI call the same function**, so the panel and CI cannot disagree.

MIT.


## 前置要求

Node.js ≥ 22.19，就是 `package.json` 里 `engines.node` 写的那一条；CLI 只依赖 Node，别的不装也能跑。想在对话里用同一个检查，需要 DSH `>=0.2.2-rc.1 <0.3.0-0`。装之前 `node -v` 看一眼，比装完再猜为什么报错快。

跑通大概 2 分钟。卡住了在仓库开 issue，别自己啃。

## 在 DSH 中安装（索引源）

全部八件作品都在一个 format 1 索引源里，从 npm registry 解析，装完即用：

1. 打开「插件」，启用实验性「自定义插件索引」。
2. 「发现 → 添加索引源」，添加：`https://zjukop3.github.io/dsh-review-outbox/plugins.json`
3. 按名字搜索安装（本仓库的五个：`hashcheck` / `citelint` / `outline-lint` / `tablelint` / `numberlint`；二十个行业场景检查在 [dsh-vertical-kit](https://github.com/zjukop3/dsh-vertical-kit)，按你手上的文件选（合同 / 发票 / 商品信息 / 会议纪要 / 简历 / 周报 / 发布说明 / 缺陷报告 / 接口文档 / 测试报告 / 提交信息 / PR 描述 / 需求文档 / 架构决策 / Dockerfile / .env 示例 / LICENSE / 事故复盘 / 运维手册 / 上手指南），对照表见 [compare](https://zjukop3.github.io/dsh-vertical-kit/compare/)）。

不装 DSH 也可以：`npx <名字> --help` 直接用，或按下面的 CLI 说明。
