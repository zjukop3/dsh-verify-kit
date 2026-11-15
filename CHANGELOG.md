# Changelog

## [0.1.2/0.1.3] - 2026-11-15

- dsh-agreement-check 0.1.3: the cordis.patch.yml and route prefix compose under the package's own name — the rename from dsh-contract-check had left the published patch stale, so installs composed as dsh-contract-check and the README's /agreement-check/api 404ed.
- dsh-outline-lint 0.1.3: the README and site page document the conclusion rule's scope — it targets report-like deliverables; reference docs (READMEs, handbooks) have no conclusion obligation, so a no-conclusion finding there is an out-of-domain hint, not a defect. Found by the first CLI dogfood run on this repository's own files.
- dsh-hashcheck 0.1.3 / dsh-citelint 0.1.3: republish wave with `engines.dsh` declared and icons shipped in-repo (the catalog listing requires icon assets).
- 0.1.1 versions across the wave were gap-fills published while latest had already moved on; the dist-tags lesson from that is recorded in review-outbox's RELEASE-RUNBOOK.

## [0.1.0] - 2026-11-10

- Initial publication wave: five packages (hashcheck, citelint, outline-lint, tablelint, numberlint), each with a main function, CLI, and host route; 28 tests covering real files and exit codes.
