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


## Current-repository evidence update — 2026-10-05 (Asia/Bangkok)

**W0 OPEN — engineering evidence only; no freeze or Human Decision.** This appended update supersedes earlier statements that actual-repository non-live collection and all Gemini live verification are still pending. Earlier results remain historical and are not overwritten.

Candidate: `3f6d45ba7b28cee703d16c2eba6143cea7d5197d`, branch `fix/w0-reconciliation`. Non-live collector on Ubuntu Node v22.23.2/npm 10.9.8 passed 16 gates, with clean/stable tracked source. Tracked-source SHA-256 `5301d431d7704efaabbdf75d89fa49cc47a16b1a1016a00a77c15eb2f48a27f6`; lockfile SHA-256 `83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0`.

Gemini model `gemini-3.8-flash`: live collector failed at its live gate (exit 1; whole test-process duration 14.428s; cause unknown). Subsequent ordinary live test passed (`GEMINI_EXIT=0`, verification time 2026-10-04T21:27:45.291Z). These are separate runs, not one 17-gate live suite PASS. Diagnostic server separately observed HTTP 200 / STOP / 9.936s. UI showed source-data fallback and later available AI summary; screenshot 1000018374 shows generation 2026-10-05 06:12:32 Bangkok, disclaimer and complete section 4 displaying human-review count 0. That screenshot does not bind its request to the earlier diagnostic metadata or independently prove normal startup.

JSON evidence binds the tested code candidate above. This documentation-only patch creates a different tracked-source hash/commit; do not relabel the JSON as evidence collected on the later documentation commit. Review Git diff to establish unchanged executable source/config/lockfile. Tag/push and baseline decision still require actual evidence.

- Record deadline-alignment commit 0b59ec5 and unfinished-summary rejection commit 3f6d45b.
- Add EC-004/EC-005 and evidence supplements; preserve original entries and human-only fields.
- Import both collector JSONs byte-for-byte and a supplemental report.
- Preserve the uploaded Roadmap working content exactly before appending this update. No runtime changes, automatic staging/commit, freeze/tag/push.
