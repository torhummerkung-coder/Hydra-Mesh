# W0 correction — 2026-10-04

- Fix explicit Gemini3.8 contract URL expectation.
- Add scoring failure propagation (no scoring thresholds changed).
- Log effective live model/time.
- Reconcile current model documentation while preserving decision history.
- Preserve original corrective docs byte-for-byte; adopt canonical Phase2 v0.2 and source-qualified ID crosswalk.
- Add reproducible local gate runner and production environment runbook.
- Include local regression results and negative controls.

W0 stays open. See W0_CORRECTIVE_VERIFICATION.md for actual evidence and missing gates.

## Follow-up — actual-repository evidence kit

- Add built-in Node collector with clean Git/commit/source/lockfile capture, npm ci evidence and source-stability check.
- Use fresh synthetic DB/outbox and temporary local keys; do not retain raw subprocess output.
- Add Doctor UI, Gemini human review, gap classification and freeze decision worksheet.
- Verify collector clean/dirty Git handling and exit0-with-FAIL negative control in synthetic fixtures.
- Actual user-repo collector run remains pending; no new live/UI/remote evidence is claimed.
