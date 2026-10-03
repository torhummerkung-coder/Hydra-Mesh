# Phase 1 W0 verification runbook — reconciled 2026-10-04

Current documents: `docs/PHASE_2_PLAN.md`, `docs/EVIDENCE_CHAIN.md`, `docs/RISK_REGISTER.md`. W0 is OPEN. This overlay must be applied to the actual repository and verified at a recorded commit before freeze.

## 1. Prepare isolated verification environment

Use a disposable checkout and synthetic database only. `db:seed` writes demo accounts. Do not use production/patient databases. Keep `.env.local`, secrets, DB files, raw seed output and provider credentials out of shared evidence.

Set `DATABASE_URL`, `PATIENT_DATA_MASTER_KEY`, `SESSION_SECRET` in trusted local configuration. Optional live verification additionally requires `GEMINI_API_KEY` and an explicit `GEMINI_MODEL`. Supplied default is `gemini-3.8-flash`; model availability/selection and matching current live evidence are still pending. Never treat a mocked contract test as proof of model availability.

Do not set `NODE_ENV=development` for production build. The runner loads local environment for standalone scripts and explicitly uses `NODE_ENV=production`, `DEMO_AUTH_ENABLED=false` for build. Production startup must separately use those values. `.env.example` demo defaults are for local development only.

```bash
npm ci
node scripts/run-w0-local.mjs
# Only when authorized provider access and explicit model are configured:
node scripts/run-w0-local.mjs --live
```

The runner records command exits and FAIL-marker counts in `evidence/w0-local-results.json`, without storing raw seed output or clinical text. It stops on failure. It does not create a baseline tag. Each command must exit 0 with no failed assertion. Installation must also exit 0. Capture exact checkout commit, lockfile hash, Node/npm versions, non-secret environment sanity and timestamp separately.

## 2. Evidence still required for W0

- Current repository regression, typecheck and production build, all on the same recorded source/environment.
- Clinical Summary effective provider/model equals current live evidence; three live assertions pass and human review checks synthetic Thai summary against input. Record model, date, commit and redacted artifact. This verifies integration, not clinical safety.
- Doctor UI manual assigned/unassigned tests or explicitly documented accepted gap with owner, reason, residual risk and authorized human decision. API authorization failures cannot be waived as a UI gap.
- BLOCKER count zero; accepted gaps/deferred work explicitly scoped and signed by the authorized human. Historical acceptance of Anthropic gap applies only within its documented demo scope; Phase2 RISK-003 remains open.
- Actual repository commit, clean working tree or fully accounted changes, agreed tag, push/remote evidence and Tor's baseline decision. Absence of `.git` in an uploaded ZIP says nothing about whether a remote tag exists.

Update EC-000/EC-001 by an append-only evidence entry. Never overwrite historical claims or mark VERIFIED/CLOSED/FROZEN from local engineering tests alone.

## 3. Anthropic live scope

`run-w0-local.mjs` deliberately does not include `test:security` (it invokes Anthropic live paths). Run it separately with real authorized provider access and synthetic cases, retaining exit and assertion evidence. A successful run alone does not close Phase2 RISK-003; scenario policy and residual risk require human review. WIF/OIDC is an optional CI enabler, not a W0 requirement unless chosen for this baseline.

## Actual-repository collector — added 2026-10-04

For current-commit W0 evidence, prefer `node scripts/collect-w0-evidence.mjs` in a clean committed disposable checkout. It records npm ci and source provenance, creates fresh synthetic DB/outbox/keys, and rejects source changes during the run. `--inspect` only collects metadata; `--live` additionally calls Gemini using the configured key/model and synthetic test fixture. See `docs/W0_CLOSEOUT_WORKSHEET.md`.

The older `run-w0-local.mjs` remains available for local command checking; it does not independently establish Git/install provenance. Neither script verifies production startup, manual UI, human decisions or remote push.
