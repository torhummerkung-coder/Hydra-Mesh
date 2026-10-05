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
