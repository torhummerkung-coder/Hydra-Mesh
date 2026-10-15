# GitHub documentation delivery — R2

Repository: https://github.com/torhummerkung-coder/Hydra-Mesh (public)
Base branch: `main`
Base commit: `295893a7e4cc6f32839eb8a90d1ced5cae963866`
Documentation branch: `docs/demo-production-readiness-20261015`

GitHub connected and write permission confirmed. No AGENTS.md found in the complete inspected main tree.
`docs/assurance/` did not exist at this base. Existing documents are preserved with a navigation addendum
or appended traceability note. The only main workflow inspected is `HYDRA Live Test`, triggered by
`workflow_dispatch` only. This change does not dispatch it or modify workflows.

Publication state when this revision was prepared: DOCS_docs/demo-production-readiness-20261015_PREPARED. Actual commit and Draft PR
are verified in the external delivery receipt after publication to avoid a circular self-hash claim.
This document is not evidence that main was merged or that CI/runtime tests passed.

## Existing work retained

- PR #1: `g03/option-a-decrypt-once` -> `fix/w0-reconciliation`, Draft at inspection.
- PR #2: `feature/d05-ledger-integration-20261013` -> `main`, Draft at inspection.
- Their code is not merged or copied into this docs branch. Supplied v0.2.2 and bootstrap artifacts
  remain identified by their own hashes; source equivalence to either PR is not asserted here.

## Future update procedure

1. Read current branch/AGENTS/workflow rules; do not assume this base remains current.
2. Add shared evidence/event and assess demo + production impact together.
3. Run report generation and `--check`, inspect docs-only diff and private-data boundaries.
4. Publish a reviewable branch/PR; record actual commit/PR/status. No automatic merge or release.
5. If workflow triggers change, reassess governed execution before creating/updating the branch or PR.

Raw supplied archives, signatures, keys, host credentials and patient data are not included in this
public documentation change. Evidence references/hashes do not grant access to their original files.
