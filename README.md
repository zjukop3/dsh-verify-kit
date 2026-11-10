# dsh-verify-kit

Five small deterministic checks for deliverables that an agent produced and a person is about to accept. Each is one verb, each runs without DSH, each returns the same JSON whether you call the CLI or the host route.

| package | what it decides |
| --- | --- |
| [dsh-hashcheck](packages/dsh-hashcheck) | which bytes moved since the manifest was written |
| [dsh-citelint](packages/dsh-citelint) | whether the citation numbers, sources and local links hold together |
| [dsh-outline-lint](packages/dsh-outline-lint) | whether the document has a title, a conclusion up front, and something to run |
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
