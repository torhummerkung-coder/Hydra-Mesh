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


## W0 follow-up and scoped G-06 approval — 2026-10-05

Normal production startup in the synthetic local demo was observed (Ready 3.6s). The targeted unowned-trace authorization test and typecheck passed on Ubuntu (AUTH_CHECKS_EXIT=0); current observed HEAD is `0ed5f52ab45daca58a9998d0abe38f82d2c852af`. Production-subset audit: 0 / exit0; full audit including dev: 5 high / exit1. Tailwind 3.4.19 uses static checked content globs; known braces risk remains.

At 2026-10-05 13:04:20 Asia/Bangkok, นายศุภกร โคตะมา, เจ้าของโครงการและผู้ออกแบบระบบ — Project Owner & System Architect, explicitly accepted **G-06 only within the current work context**. Keep the current Tailwind3 baseline for trusted local builds and synthetic MVP/Portfolio Demo on 127.0.0.1; no public/real-patient/untrusted-build expansion. Review by 2026-10-19 or earlier on scope/config/input/advisory change. The full scope, residual risk and selected signature are in `docs/decisions/W0_G06_ACCEPTANCE_2026-10-05.md`; observed evidence is in `evidence/w0/2026-10-05/HYDRA_W0_FOLLOWUP_EVIDENCE.md` (paths from repository root).

This supplements historical pending startup/trace/dependency statements without deleting failure history. Accepted is not closed: full audit remains 5 high. Existing RISK-001–009 and other gap/baseline decisions are not approved by this decision. **W0 OPEN**; no code/config/dependency change, new full collector/build/live run, tag/main merge or remote push is claimed.


## G-01 local synthetic demo limitation — 2026-10-05

นายศุภกร โคตะมา — เจ้าของโครงการและผู้ออกแบบระบบ / Project Owner & System Architect — explicitly approved the live-Anthropic verification limitation for local synthetic-data demo only, 2026-10-05 15:01:39 Asia/Bangkok. Decision: HD-W0-ANTHROPIC-2026-10-05. Signed-image record: `docs/decisions/W0_G01_LOCAL_DEMO_ACCEPTANCE_2026-10-05.md`; historical access evidence: `evidence/w0/2026-10-05/HYDRA_W0_ANTHROPIC_ACCESS_EVIDENCE.md` (paths from repo root).

**G-01 / RISK-003 remain OPEN under the original HydraMesh requirements**; W3 live/behavior follow-up remains. Historical Hydra-Mesh01 WIF exchange success followed by Messages API HTTP400 / low-credit / exit1 is not current Hydra-Mesh agent verification. No new PASS, clinical/public/real-patient approval, other-gap acceptance, final baseline/tag/freeze/main merge is implied. **W0 OPEN**.
