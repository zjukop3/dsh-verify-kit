# dsh-hashcheck

A manifest records the SHA-256 of every file you delivered. Verification says which bytes moved since — a changed file, a missing file, and a file that was delivered but never listed are three different failures, and only the first two get caught by eyeballing a folder.

```bash
npx dsh-hashcheck build ./delivery --out delivery/hashcheck.json --ignore node_modules
npx dsh-hashcheck verify delivery/hashcheck.json --dir ./delivery
```

Exit codes: `0` clean, `1` findings, `2` usage or read error. In CI, gate on the exit code; in DSH, the same two functions are behind `POST /hashcheck/api` with `{"action":"build"|"verify"}` so the panel and the pipeline cannot disagree.

Deterministic by construction: paths are sorted and normalized to forward slashes, no timestamps or mtimes enter the digest, so the same tree produces the same manifest on macOS, Linux and Windows.

MIT.
