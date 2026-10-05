# HYDRA Mesh — Risk Register

> ถามว่า “ถ้ามันผิด มันจะผิดไปทางไหน และผิดแบบไหนปลอดภัยกว่า”
> ไม่ใช่แค่ว่า happy path ใช้งานได้ไหม

**รูปแบบ v0.2:**
`Possible Outcome → Risk/Impact → Fail-safe Direction → Boundary → Mitigation → Related Evidence → Test → Evidence → Residual Risk → Human Decision`

| | |
|---|---|
| สถานะเอกสาร | SKELETON v0.2 (2026-09-24) |
| อ้างอิง | `PHASE_2_PLAN.md` (W3/W4/W5/W7/W8/W9), `EVIDENCE_CHAIN.md` |
| Owner | Tor |

---

## กติกา

1. ทุก risk ต้องมี Fail-safe Direction **แบบ scenario-specific** เมื่อ risk มีหลายบริบท
2. AI ไม่ปิด risk เอง; Residual Risk + Human Decision เป็นของ authorized human
3. ไม่มี test/evidence = Status ยัง `open`
4. mitigation ที่แก้ code/logic ต้องมี Evidence Chain entry
5. risk ใหม่เพิ่มได้ แต่ห้ามลบประวัติเดิม
6. ใช้ synthetic/de-identified data ใน test artifact ที่แชร์
7. `accepted` ≠ `closed`
   - **accepted** = residual risk ยังอยู่ แต่มนุษย์ยอมรับภายใต้ขอบเขตที่ระบุ
   - **closed** = risk ถูกกำจัด/ไม่ applicable แล้ว พร้อม evidence

---

## Index

| Risk | ชื่อ | Fail-safe Direction | Related Evidence | Status |
|---|---|---|---|---|
| RISK-001 | Clinical Summary live/model-version drift | fail-closed to source/fallback | EC-001 | open |
| RISK-002 | Trace/role visibility leakage | fail-closed | EC-000 | open |
| RISK-003 | Risk Engine real-model behavior | scenario-specific proposal | TBD | open |
| RISK-004 | False delivery/clinician acknowledgement claim | never claim ack before ack | TBD | open |
| RISK-005 | Raw mental-health text leaks into telemetry/logs | minimize/redact/fail-closed | TBD | open |
| RISK-006 | Role Projection hard-coded/overexposure | deny when capability not proven | TBD | open |
| RISK-007 | Model/provider change without re-verification | hold promotion until verified | EC-001 | open |

---

## Entries

### RISK-001: Clinical Summary live/model-version drift
- **Possible Outcome:** provider/model version เปลี่ยนแล้ว behavior ต่างจากผล live เดิม; format/empty/refusal/disclaimer อาจเปลี่ยน
- **Risk / Impact:** clinician เห็น summary ผิด/ไม่ครบ หรือเข้าใจว่าผลยัง verified ทั้งที่ evidence คนละรุ่น
- **Fail-safe Direction:** ถ้า version/evidence ไม่ตรง → ไม่ถือว่า verified; fallback ไป source data/verified path และคง disclaimer
- **Boundary:** summary ไม่ใช่ diagnosis; irreversible clinical action ยังต้อง human
- **Mitigation:** contract + live verification ต่อ version; current runtime model ต้องตรงกับ evidence
- **Related Evidence:** EC-001
- **Test:** clinical-summary contract + live
- **Evidence:** _TBD current runtime reconciliation_
- **Residual Risk:** _รอ Tor_
- **Human Decision:** _รอ Tor_
- **Status:** open

### RISK-002: Trace ที่ไม่มี ownership proof / role visibility leakage
- **Possible Outcome:** Doctor/Staff เห็น event เกิน CareAssignment หรือ event ที่ไม่มี patient ownership ถูกฉายผิด role
- **Risk / Impact:** privacy breach / cross-patient disclosure
- **Fail-safe Direction:** fail-closed — พิสูจน์ ownership/capability ไม่ได้ = ไม่แสดง
- **Boundary:** Doctor/Staff เห็นเฉพาะ assigned patient; Security visibility แยกตาม capability
- **Mitigation:** ownership derive + CareAssignment + capability-driven projection
- **Related Evidence:** EC-000 + future W8 EC
- **Test:** positive + negative authorization tests
- **Evidence:** _TBD_
- **Residual Risk:** _รอ Tor_
- **Human Decision:** _รอ Tor_
- **Status:** open

### RISK-003: Risk Engine กับโมเดลจริงยังไม่ยืนยันครบ
- **Possible Outcome:** false negative พลาด crisis / false positive escalate เกินจำเป็น / provider behavior ต่างจาก mock
- **Risk / Impact:** safety miss, user distress, unnecessary escalation
- **Fail-safe Direction:** **PROPOSAL — รอ Tor approve**
  - explicit/imminent crisis → bias toward escalation/continuity
  - ambiguous distress → review/clarify, ไม่ auto-label crisis
  - low-risk uncertainty → ไม่ auto-escalate ถาวรเพียงเพราะ model ไม่มั่นใจ
- **Boundary:** crisis signal ชนะ security block; AI ไม่มี authority ทำ irreversible clinical action
- **Mitigation:** local detector + live Anthropic test + structured output/contract + human review
- **Related Evidence:** _TBD_
- **Test:** `test-security-pipeline` LLM path + adversarial/synthetic cases
- **Evidence:** _TBD_; WIF/OIDC path ใช้เป็น CI identity ได้เมื่อพร้อม
- **Residual Risk:** _รอ Tor_
- **Human Decision:** _รอ Tor_
- **Status:** open

### RISK-004: False delivery / clinician acknowledgement claim
- **Possible Outcome:** fallback บอกผู้ใช้ว่า “ส่งให้แพทย์แล้ว” ทั้งที่ยัง pending/queued
- **Risk / Impact:** ผู้ใช้อาจหยุดหาความช่วยเหลือเพราะเชื่อว่ามีคนรับช่วงแล้ว
- **Fail-safe Direction:** ถ้าไม่มี ack จริง = ห้ามอ้างว่า acknowledged
- **Boundary:** `pending != queued != acknowledged`
- **Mitigation:** durable/encrypted outbox + explicit state machine + stable idempotency key
- **Related Evidence:** _TBD W5_
- **Test:** deliberate violation test ต้อง fail
- **Evidence:** _TBD_
- **Residual Risk:** _รอ Tor_
- **Human Decision:** _รอ Tor_
- **Status:** open

### RISK-005: Raw mental-health text leakage in telemetry/logs
- **Possible Outcome:** degraded/recovery/error telemetry เก็บ raw patient message โดยไม่จำเป็น
- **Risk / Impact:** sensitive-data exposure, privacy/regulatory risk
- **Fail-safe Direction:** metadata/minimal structured signal ก่อน; raw text only when explicitly justified and protected
- **Boundary:** logs/metrics ไม่ใช่ clinical record store
- **Mitigation:** redaction/minimization + retention/access rules
- **Related Evidence:** _TBD W9_
- **Test:** log snapshot/privacy test
- **Evidence:** _TBD_
- **Residual Risk:** _รอ Tor_
- **Human Decision:** _รอ Tor_
- **Status:** open

### RISK-006: Role Projection hard-coded / overexposure
- **Possible Outcome:** UI ผูก role name ตายตัวจน role ใหม่ inherit สิทธิ์ผิด หรือเห็นข้อมูลเกิน capability
- **Risk / Impact:** authorization drift / privacy breach
- **Fail-safe Direction:** capability ไม่ชัด = deny projection
- **Boundary:** Event → Policy → Capability → Role Projection
- **Mitigation:** capability-driven UI + positive/negative permission tests + CareAssignment
- **Related Evidence:** _TBD W8_
- **Test:** projection matrix tests
- **Evidence:** _TBD_
- **Residual Risk:** _รอ Tor_
- **Human Decision:** _รอ Tor_
- **Status:** open

### RISK-007: Model/provider change without re-verification
- **Possible Outcome:** เปลี่ยน model/provider/version แต่ใช้ evidence/test result เก่าอ้างต่อ
- **Risk / Impact:** hidden behavioral regression / invalid baseline claim
- **Fail-safe Direction:** hold promotion/freeze claim จน contract + live verification ของ version ใหม่ผ่าน
- **Boundary:** model substitution ไม่เท่ากับ implementation-equivalent โดยอัตโนมัติ
- **Mitigation:** mandatory EC entry + model/version pin + re-test
- **Related Evidence:** EC-001
- **Test:** change-control checklist + contract/live test
- **Evidence:** _TBD_
- **Residual Risk:** _รอ Tor_
- **Human Decision:** _รอ Tor_
- **Status:** open

---

## Template

```markdown
### RISK-XXX: <ชื่อสั้น>
- **Possible Outcome:** <อะไรอาจเกิดขึ้น>
- **Risk / Impact:** <ใครได้รับผลกระทบ>
- **Fail-safe Direction:** <scenario-specific / pending human approval>
- **Boundary:** <ห้ามข้ามอะไร>
- **Mitigation:** <มาตรการ>
- **Related Evidence:** <EC-XXX>
- **Test:** <test ID>
- **Evidence:** <artifact/log/result>
- **Residual Risk:** <human only>
- **Human Decision:** <who/date/decision/reason>
- **Status:** open | mitigated | accepted | closed
```

## Reconciliation additions — 2026-10-04

| Added Risk | Related Evidence | Status |
|---|---|---|
| RISK-008 | EC-003 | open |
| RISK-009 | EC-003 | open |

Historical MVP/Portfolio Demo acceptance of legacy RISK-003 is preserved in `history/corrective-source/RISK_REGISTER.md`. It does not close current Phase2 RISK-003 or approve its proposed scenario policy. Current human decisions remain pending.

### RISK-008: Scoped clinical-read deadline / historical corrective RISK-004
- **Possible Outcome:** Reads/decryption exceed wait bounds; UI loses timely response.
- **Risk / Impact:** Clinical data or summary unavailable; timeout may not cancel underlying work.
- **Fail-safe Direction:** Return existing unavailable/fallback path; never bypass authorization on timeout.
- **Boundary:** Auth remains 3s; only four clinical reads use 15s.
- **Mitigation:** Supplied patient-summary endpoint contains `CLINICAL_DATA_READ_DEADLINE_MS = 15_000`; do not claim a latency benchmark justified this value.
- **Related Evidence:** EC-003.
- **Test:** Authorization regression and source inspection; controlled slow-data end-to-end evidence pending.
- **Evidence:** `../W0_CORRECTIVE_VERIFICATION.md`.
- **Residual Risk:** Human assessment pending.
- **Human Decision:** Pending.
- **Status:** open.

### RISK-009: Test gate falsely succeeds
- **Possible Outcome:** Clinical assertion logs FAIL but exits zero, or model contract expects stale configuration.
- **Risk / Impact:** Invalid baseline promotion.
- **Fail-safe Direction:** Assertion failure must produce nonzero exit; block freeze.
- **Boundary:** Test passes do not validate clinical thresholds or live provider behavior.
- **Mitigation:** Clinical failure counter throws; explicit Gemini3.8 URL assertion; runner also rejects FAIL markers.
- **Related Evidence:** EC-003.
- **Test:** Contract before/after; scoring pass and deliberate wrong expectation exit1.
- **Evidence:** `../evidence/results.json`, `../W0_CORRECTIVE_VERIFICATION.md`.
- **Residual Risk:** Human assessment pending.
- **Human Decision:** Pending.
- **Status:** open.


## Current-repository evidence update — 2026-10-05 (Asia/Bangkok)

**W0 OPEN — engineering evidence only; no freeze or Human Decision.** This appended update supersedes earlier statements that actual-repository non-live collection and all Gemini live verification are still pending. Earlier results remain historical and are not overwritten.

Candidate: `3f6d45ba7b28cee703d16c2eba6143cea7d5197d`, branch `fix/w0-reconciliation`. Non-live collector on Ubuntu Node v22.23.2/npm 10.9.8 passed 16 gates, with clean/stable tracked source. Tracked-source SHA-256 `5301d431d7704efaabbdf75d89fa49cc47a16b1a1016a00a77c15eb2f48a27f6`; lockfile SHA-256 `83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0`.

Gemini model `gemini-3.8-flash`: live collector failed at its live gate (exit 1; whole test-process duration 14.428s; cause unknown). Subsequent ordinary live test passed (`GEMINI_EXIT=0`, verification time 2026-10-04T21:27:45.291Z). These are separate runs, not one 17-gate live suite PASS. Diagnostic server separately observed HTTP 200 / STOP / 9.936s. UI showed source-data fallback and later available AI summary; screenshot 1000018374 shows generation 2026-10-05 06:12:32 Bangkok, disclaimer and complete section 4 displaying human-review count 0. That screenshot does not bind its request to the earlier diagnostic metadata or independently prove normal startup.

JSON evidence binds the tested code candidate above. This documentation-only patch creates a different tracked-source hash/commit; do not relabel the JSON as evidence collected on the later documentation commit. Review Git diff to establish unchanged executable source/config/lockfile. Tag/push and baseline decision still require actual evidence.

### Evidence supplement to existing risks (no human fields overwritten)

| Risk | New engineering evidence | Remaining evidence or judgment |
|---|---|---|
| RISK-001 / RISK-007 | EC-004/EC-005: 3.8 contract PASS, ordinary live PASS, diagnostic 200/STOP, UI available; failed collector retained | Model selection/acceptance by Tor; semantic/clinical review; availability is not proven for every request |
| RISK-002 | Latest automated authorization suite PASS; earlier paired Doctor allow/deny trace screenshots | Reconcile manual evidence scope/current UI and revocation/ownership cases; no waiver of authorization failure |
| RISK-003 | Gemini summary evidence only | Anthropic Risk/Companion/Auditor live coverage remains unevidenced here; legacy acceptance requires current intended-use confirmation |
| RISK-004 | Fallback integration/storage suites PASS; prior manual outbox retry delivered=1/failed=0/remaining=0 | One delivery recovery is not proof of clinician acknowledgement or all recovery modes |
| RISK-005 | Diagnostic observer logged only provider metadata; no text/key in that observer output | Not a system-wide log privacy/retention audit |
| RISK-006 | No additional general role-projection evidence | Existing risk remains open |
| RISK-008 | Provider/browser deadline alignment; normal diagnostic request returned in 9.936s | Normal latency is not controlled slow-read evidence; timed-out work may continue |
| RISK-009 | STOP guard plus negative contract cases; failed collector preserved | Existing scoring/gate controls remain necessary; passing tests do not establish clinical validity |

All RISK-001 through RISK-009 remain **open**. Existing Residual Risk/Human Decision fields remain exactly as supplied. Engineering observations above are inputs for review, not official residual-risk acceptance.

Additional findings for human classification (not automatically accepted): npm ci output reports 5 high vulnerabilities; no remediation or current production audit result is claimed. Local HTTP/auth deployment limits and unknown/degraded health badges remain distinct from successful build. Intended use, owner, reason, scope and re-review date must be supplied by the authorized human if any gap is accepted. BLOCKER=0 is not asserted.


## Human model-selection decision — 2026-10-05

Human Decision supplement for RISK-001/RISK-007: Tor selects Google `gemini-3.8-flash` instead of `gemini-3.7-flash` for the MVP/Portfolio Demo baseline using synthetic data, on 2026-10-05 07:57:53 Asia/Bangkok. Reason: Tor reports that 3.7 had problems and could not run in his environment. See EC-006 and `decisions/W0_MODEL_DECISION_2026-10-05.md`.

This supersedes only the earlier pending model-selection item. It is not residual-risk acceptance or risk closure: RISK-001/RISK-007 remain **open**, and existing Residual Risk fields remain pending. Other risks and decisions are unchanged. No claim about 3.7 failing globally is made. W0 OPEN.


## Current scoped acceptance supplement — G-06 / RISK-010

| Added Risk | Related Evidence | Current status |
|---|---|---|
| RISK-010: braces availability risk in Tailwind development toolchain | EC-009 / HD-W0-DEPS-2026-10-05 | accepted within current work context; residual risk remains |

### RISK-010: Development/build toolchain stack exhaustion
- Possible Outcome: untrusted nested brace patterns reach vulnerable tooling and crash its Node process.
- Risk/Impact: development/build availability loss; high advisory severity retained.
- Fail-safe Direction: stop affected build/watch work; review source/config inputs before rerunning. Do not widen demo scope on the strength of this acceptance.
- Boundary: trusted local source/config/build and synthetic MVP/Portfolio Demo on 127.0.0.1 only. No public deployment, real-patient use or shared build service accepting untrusted input/PRs.
- Mitigation: fixed checked globs; owner-controlled inputs; no request/untrusted-automation-supplied patterns; no public development/watch server. Operational conditions, not a claim that code enforcement is complete.
- Related Evidence/Test: EC-009; production-subset audit0/exit0, full audit5high/exit1; dependency graph/config in 1000018418. Known findings were not fixed or removed.
- Residual Risk (accepted by owner per section17): nested untrusted patterns may still crash build/development tooling; audit is not comprehensive and future findings may differ. No comprehensive data-flow proof or claim exploit is impossible.
- Human Decision: นายศุภกร โคตะมา — Project Owner & System Architect — “อนุมัติ G-06 ตามส่วน 17 ตามขอบเขตบริบทของหน้างานเท่านั้น”, 2026-10-05 13:04:20 Asia/Bangkok. Full signed-image record: docs/decisions/W0_G06_ACCEPTANCE_2026-10-05.md.
- Re-review: by 2026-10-19 or before scope/config/build-input change, external PR/CI input, public/real-patient use, patched release/advisory update, whichever comes first.
- Status: **accepted**, not closed. RISK-001–009 remain as previously recorded. W0 OPEN.


## W0 follow-up and scoped G-06 approval — 2026-10-05

Normal production startup in the synthetic local demo was observed (Ready 3.6s). The targeted unowned-trace authorization test and typecheck passed on Ubuntu (AUTH_CHECKS_EXIT=0); current observed HEAD is `0ed5f52ab45daca58a9998d0abe38f82d2c852af`. Production-subset audit: 0 / exit0; full audit including dev: 5 high / exit1. Tailwind 3.4.19 uses static checked content globs; known braces risk remains.

At 2026-10-05 13:04:20 Asia/Bangkok, นายศุภกร โคตะมา, เจ้าของโครงการและผู้ออกแบบระบบ — Project Owner & System Architect, explicitly accepted **G-06 only within the current work context**. Keep the current Tailwind3 baseline for trusted local builds and synthetic MVP/Portfolio Demo on 127.0.0.1; no public/real-patient/untrusted-build expansion. Review by 2026-10-19 or earlier on scope/config/input/advisory change. The full scope, residual risk and selected signature are in `docs/decisions/W0_G06_ACCEPTANCE_2026-10-05.md`; observed evidence is in `evidence/w0/2026-10-05/HYDRA_W0_FOLLOWUP_EVIDENCE.md` (paths from repository root).

This supplements historical pending startup/trace/dependency statements without deleting failure history. Accepted is not closed: full audit remains 5 high. Existing RISK-001–009 and other gap/baseline decisions are not approved by this decision. **W0 OPEN**; no code/config/dependency change, new full collector/build/live run, tag/main merge or remote push is claimed.


## G-01 local synthetic demo limitation — 2026-10-05

นายศุภกร โคตะมา — เจ้าของโครงการและผู้ออกแบบระบบ / Project Owner & System Architect — explicitly approved the live-Anthropic verification limitation for local synthetic-data demo only, 2026-10-05 15:01:39 Asia/Bangkok. Decision: HD-W0-ANTHROPIC-2026-10-05. Signed-image record: `docs/decisions/W0_G01_LOCAL_DEMO_ACCEPTANCE_2026-10-05.md`; historical access evidence: `evidence/w0/2026-10-05/HYDRA_W0_ANTHROPIC_ACCESS_EVIDENCE.md` (paths from repo root).

**G-01 / RISK-003 remain OPEN under the original HydraMesh requirements**; W3 live/behavior follow-up remains. Historical Hydra-Mesh01 WIF exchange success followed by Messages API HTTP400 / low-credit / exit1 is not current Hydra-Mesh agent verification. No new PASS, clinical/public/real-patient approval, other-gap acceptance, final baseline/tag/freeze/main merge is implied. **W0 OPEN**.


### RISK-003 follow-up — scoped G-01 human decision
- Residual Risk: current live Anthropic agent coverage remains incomplete; access/model/tool-use/integrated behavior in untested scenarios remains unverified.
- Human Decision: นายศุภกร โคตะมา — Project Owner & System Architect — approved this limitation for local synthetic demo only at 2026-10-05 15:01:39 Asia/Bangkok. HD-W0-ANTHROPIC-2026-10-05.
- Status: **OPEN**, expressly retained by owner for both G-01 and RISK-003; approval of a demo limitation does not close the risk or change the original requirements.
- Follow-up: existing W3 live/behavior verification; reassess before intended-use expansion. Verify the current repo/commit/model/runtime when API access becomes available. Actual safety-critical defects still require correction.


### RISK-001 / RISK-007 — G-02 investigation update, 2026-10-05
- Evidence EC-011: unchanged synthetic test with matching request bodies got 200/STOP in collector-env and 503/UNAVAILABLE in direct-env; provider availability failure observed, environment causality unproven. Separate earlier malformed-key/header failure corrected privately.
- Residual Risk: live provider may be unavailable; historical failed collector exact cause remains unrecoverable from its retained metadata. New success does not guarantee availability or clinical validity.
- Mitigation verification: existing assignment-scoped fallback passed local injected-503 probe; permanent targeted tests and safe collector evidence capture added for verification on Ubuntu. No automatic retries or runtime policy changes.
- Human Decision / Status: no new acceptance or closure. Owner requested deeper investigation; G-02 / RISK-001 / RISK-007 OPEN. Existing G-01/G-06 decisions and other risks remain as previously recorded.


## G-02 investigation follow-up — 2026-10-05 (EC-012)

Current clean-source collector at 3f4b5cf retained a real live failure: 14 gates PASS, Gemini HTTP503 / UNAVAILABLE / child exit1, correct effective model and accepted credential format. Updated safe metadata capture worked in the actual collector. Existing authorization regression for mocked provider503 passed on the phone by owner report; this is not live UI503 coverage.

RISK-001 / RISK-007 and G-02 remain OPEN. Historical exact failure cause remains unknown; latest503 cannot establish it retroactively. Provider internal cause is unverified. No new generated-summary correctness/availability guarantee, automatic retries or human risk acceptance. Remaining typecheck/build were not reached in this collector run; prior targeted typecheck is separate.

Evidence: evidence/w0/2026-10-05/hydra-w0-live-503-3f4b5cf-2026-10-05.json (4490 bytes, SHA256 7a931f0d1732b1222a964b78a97271873f3c43bdcd9cffc1d756fd224ffb3d05) and evidence/w0/2026-10-05/HYDRA_W0_G02_INVESTIGATION.md. Review before expanding beyond local synthetic demo, on repeated provider failure, or on source/model changes. Preserve the unavailable/source-data fallback and existing human authority. All preceding risk statuses and G-01/G-06 decisions unchanged; W0 OPEN, no baseline/tag/freeze approval.


## G-02 non-live verification completed; human review pending — 2026-10-05 (EC-013)

Current b51d55d non-live collector passed all16gates including typecheck/build with source-before/after clean and identical. Live current collector at3f4b5cf still records HTTP503/UNAVAILABLE/exit1, and historical exact cause remains unrecoverable from retained metadata. Existing assigned-only unavailable fallback and unassigned denial are covered by mocked endpoint regression; not live UI fault injection or generalized clinical validation.

Original3967-byte JSON SHA256 6c1104c884414f2800cf3751a2b29e444e486ab55ca89e07c0cb293a88d38130 at evidence/w0/2026-10-05/hydra-w0-nonlive-b51d55d-2026-10-05.json. Proposed human review: docs/decisions/W0_G02_LOCAL_DEMO_PROPOSAL_2026-10-05.md. Proposed scope only local synthetic-demo provider-availability/history-evidence limitations; do not waive actual safety/privacy/authorization defects or change earlier human decisions. **No acceptance recorded: G-02/RISK-001/RISK-007 and W0 OPEN**. No new signature, risk closure or baseline/tag/freeze/main merge.


## G-02 temporary human acceptance — 2026-10-05 19:35:51 Asia/Bangkok

Human Decision **HD-W0-G02-TEMP-2026-10-05**: นายศุภกร โคตะมา — Project Owner & System Architect — explicitly approved the explained G-02 proposal within its existing local synthetic MVP/Portfolio demo scope, **temporarily and revocably**. Accepted limitations: intermittent Gemini summary availability and insufficient historical failure metadata. Full chat-authorized record: `docs/decisions/W0_G02_TEMPORARY_ACCEPTANCE_2026-10-05.md` (repository-root path).

The owner may reconsider the model, provider/affiliation or API-key access readiness and withdraw this temporary approval at that review to continue according to the Roadmap. No new model/provider choice or API-credit purchase/access request is authorized by this record. Record any withdrawal/superseding decision against HD-W0-G02-TEMP-2026-10-05; retain prior history and re-verify the actual model/provider/source before claiming verified behavior.

**G-02 / RISK-001 / RISK-007 and W0 OPEN.** Acceptance applies only to these demo limitations; existing risks and required follow-up stay open. Preserve live/historical FAIL, unavailable/assigned-source fallback, disclaimer and human review. No 17-live-gate PASS, uptime/clinical correctness guarantee or acceptance of actual privacy/auth/safety defects. G-01/G-06 decisions and other gaps unchanged; no W0 closure/baseline/tag/freeze/main merge. Re-review on recurring failures, source/model/intended-use change, boundary failure or before real-data/public use. Earlier PENDING statements remain historical and are supplemented by this explicit decision; no new test run is claimed.


## G-03 controlled slow-read verification — 2026-10-05 (EC-015)

Original phone JSON received 21:08:47 Asia/Bangkok: 9386 bytes, SHA256 76264914135efdd759318e8d3dd5b9fbe476c7237b5cc9d436d1239d7811ff89; stored byte-identically at `evidence/w0/2026-10-05/hydra-w0-g03-c286c18-2026-10-05.json`. c286c18, Node v22.23.2, 20:49:36–20:51:15 Bangkok: nine cases PASS, exit0, commandChecksPassed=true; clean sourceBefore/sourceAfter objects identical, sourceStable=true. Full scope and measurements: `evidence/w0/2026-10-05/HYDRA_W0_G03_INVESTIGATION.md`.

Auth timeouts return503 at3002/3006ms without clinical reads/key lookup/provider calls; four separate clinical-read timeouts return500 at15018–15027ms without source/AI response. Controlled query work remains after response and completes when released; three encrypted-store cases start a late key lookup. No second response or unhandled rejection in the controlled drain window. Provider uses a local fetch replacement; no live generation, UI/in-engine lock/concurrent-load/SLA or full-decryption completion proof.

Clarification of earlier unavailable/source-fallback wording: clinical-read timeout itself returns generic500 with no data; provider-error source fallback applies after reads succeed. Controlled synthetic slow-read evidence is now available; cancellation/background resource limits and residual-risk review remain open. Proposed review at `docs/decisions/W0_G03_LOCAL_DEMO_PROPOSAL_2026-10-05.md`; **no G-03 owner acceptance/signature**, G-03/RISK-008 and W0 OPEN. Prior G-01/G-02/G-06 decisions unchanged. No runtime/deadline/retry/model change or new tests/provider calls from this docs/evidence update; no baseline/tag/freeze/main merge.


## G-03 temporary owner acceptance with mandatory Phase 2 correction — 2026-10-05 21:55:43 Asia/Bangkok

Human Decision **HD-W0-G03-TEMP-2026-10-05**: นายศุภกร โคตะมา — Project Owner & System Architect — approved the explained G-03 proposal for controlled local synthetic demo only. Demo/testing may continue; this is **not certification that the system is ready for real-world use**. Preserve low-load operator conditions, authorization/assignment/revocation boundaries and truthful read-timeout failure. No source/summary on clinical-read timeout is claimed; timeout does not cancel underlying work.

**Mandatory correction within Phase 2:** use this period to diagnose, fix and verify G-03 code/work-control behavior under the existing Phase 2 scope and procedures. Other work may proceed first, but this item is not indefinitely deferred. The temporary acceptance **ends with Phase 2 closure and must not extend beyond it**. Phase 2 must not be declared closed on the strength of this exception while G-03 correction/verification remains unfinished; record acceptance expiry and the actual verified disposition at closeout. No calendar deadline was supplied; preserve the event-bound Phase 2 deadline without inventing a date.

Owner distinguishes G-03 code debugging from the Agent-model/provider-access limitation. Current source and controlled results show non-cancellation in code; the exact final remedy remains to be selected and tested. Do not attribute this issue to model quality or solve the recorded code issue merely by changing a model. G-02 temporary model/provider/API-access decision remains separate and unchanged.

**G-03/RISK-008 and W0 OPEN.** Nine current-phone synthetic checks are retained as bounded evidence, not cancellation/load/UI/in-flight-revocation or production readiness proof. No actual authorization/privacy/safety defect waiver, new runtime change, additional test/API run, signature image, W0 closure, baseline/tag/freeze/main merge. Prior PENDING G-03 statements are historical and supplemented by this explicit owner decision; full conditions and verbatim authorization: `docs/decisions/W0_G03_TEMPORARY_ACCEPTANCE_2026-10-05.md`.
