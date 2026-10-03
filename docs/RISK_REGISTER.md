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
