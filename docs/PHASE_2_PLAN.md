# HYDRA Mesh — Phase 2 Plan

**Phase 2 = VERIFY WHAT WE BUILT**

| | |
|---|---|
| สถานะ | DRAFT v0.2 (2026-09-24) |
| Owner | Tor |
| Baseline | Phase 1 — **ยังห้ามเรียกว่า FROZEN จน W0 ผ่านด้วยหลักฐาน** |
| ประเภทเอกสาร | แผน (scope, deliverable, exit criteria, dependency) — ไม่มี deadline จนกว่าจะกำหนดจริง |
| เป้าหมายหลัก | เปลี่ยนจาก “ระบบทำงานได้” → “ระบบอธิบายได้ พิสูจน์ได้ ทดสอบได้ และรู้ขอบเขตที่ไว้ใจได้” |

---

## 1. หลักการ

> อย่าพิสูจน์แค่ว่าระบบทำสิ่งที่เราต้องการได้ — ต้องพิสูจน์ด้วยว่าเมื่อมันทำไม่ได้ มันจะไม่ทำสิ่งที่เราไม่ต้องการ
>
> *Build with responsibility for foreseeable consequences, not merely intended behavior.*

- Phase 2 ไม่ใช่เฟสเพิ่ม feature เป็นหลัก แต่คือเฟสสร้าง **evidence, clinical credibility, safety boundaries และ trust foundation**
- **Clinical threshold ห้ามแก้โดยไม่มีหลักฐาน** (เช่น 8Q `>= 17`, 9Q item 9 flag) จนกว่าจะมีคำตอบจากผู้เชี่ยวชาญ และการแก้ทุกครั้งต้องผ่าน Evidence Chain
- Invariant จาก Phase 1 ยังอยู่ครบ; Phase 2 เพิ่มหลักฐานว่ามันทำงานจริง ไม่รื้อ critical path
- **Companion ไม่ใช่ชื่อ model แต่คือ Behavioral Contract** — model/fallback เป็น implementation ของ contract เดียวกัน
- เมื่อระบบ degrade: **capability ↓, predictability ↑**; สิ่งที่ห้ามหายคือ safety, honesty, continuity และ authority boundary
- **Care ≠ Control** — การช่วยเหลือไม่เท่ากับยึดอำนาจจากผู้ใช้; AI เสนอ/สะท้อน/ช่วยจัดทางเลือกได้ แต่ irreversible clinical action และ authority สูงสุดยังเป็นของมนุษย์
- **Presence ≠ constant access** — Companion ต้องรักษาความต่อเนื่องโดยไม่แสร้งว่ามีคนเฝ้าดูตลอดเวลา และไม่อ้างการส่งต่อ/การรับรู้ที่ยังไม่เกิดขึ้นจริง
- การเปลี่ยน model/provider/version เป็น **behavioral dependency change** ต้องมี traceability, contract test และ live verification ใหม่ก่อนถือว่า baseline เดิมยังใช้ได้

### 1.1 Phase 2 Kickoff Guard

Stage A เริ่มทำ “โครง/เอกสาร/test harness” ได้แม้ W0 ยังเปิดอยู่ แต่:

1. ห้ามประกาศ Phase 1 ว่า `CLOSED / VERIFIED / BASELINE FROZEN` จน W0 ผ่านจริง
2. การแก้ runtime behavior ก่อน freeze ต้องแยกให้ trace ได้ว่าเป็น “baseline fix” หรือ “Phase 2 change”
3. ห้ามใช้คำว่า “known gap” เป็นทางผ่านสำหรับ safety-critical failure

---

## 2. Scope Gate

ของใหม่ทุกอย่างต้องตอบข้อนี้ได้ก่อนเข้า Phase 2:

> **มันเพิ่มความน่าเชื่อถือ ความปลอดภัย การพิสูจน์ หรือ clinical validity ตรงไหน?**

ตอบไม่ได้ = ไม่ใช่งานหลักของ Phase 2

### 2.1 Known-gap classification

เพื่อไม่ให้ “บันทึกไว้แล้ว” กลายเป็นการ waive ความเสี่ยงแบบเงียบ ๆ ให้แบ่ง gap เป็น 3 กลุ่ม:

| ประเภท | ความหมาย | Freeze ได้ไหม |
|---|---|---|
| **BLOCKER** | กระทบ critical path, authorization, encryption, clinical safety, data integrity หรือทำให้ test/build หลัก fail | **ไม่ได้** |
| **ACCEPTED GAP** | ข้อจำกัดที่ไม่ทำลาย safety boundary และมีเหตุผล/owner/แผนติดตามชัด | ได้ โดย Human Decision |
| **DEFERRED / OUT-OF-SCOPE** | ไม่ใช่ข้อผิดพลาดของ baseline แต่เป็นงานอนาคต | ได้ ถ้าบันทึกเหตุผล |

---

## 3. ภาพรวม Workstreams

| ID | Workstream | พึ่งคนนอก? | Stage |
|---|---|---|---|
| W0 | Baseline Gate — ปิด Phase 1 ด้วยหลักฐาน | ไม่ | A |
| W1 | Clinical Verification (8Q/9Q) | **ใช่** | ติดต่อใน A, รีวิวใน B |
| W2 | Evidence Chain | ไม่ | A → ต่อเนื่อง |
| W3 | Risk / Safety + Live Provider Verification | ไม่ (residual risk ต้องมีคนตัดสิน) | A → B |
| W4 | Companion Fallback Hardening | wording ต้องรีวิว | B |
| W5 | Fallback Degradation + Recovery | ไม่ | B |
| W6 | Companion Behavioral Contract | ไม่ | B |
| W7 | Governance / Authority Boundary Evidence | ไม่ | B |
| W8 | Clinical Workflow / Capability-driven Role Projection | **ใช่** | C |
| W9 | Ethics / Privacy / Regulatory Path | ควรมีผู้เชี่ยวชาญยืนยัน | A + C |

---

## 4. รายละเอียดแต่ละ Workstream

### W0 — Baseline Gate

**เป้าหมาย:** “Phase 1 CLOSED” ต้องมีหลักฐาน ไม่ใช่แค่ประกาศ

**Deliverables**
- `npm install && npm run db:migrate && npm run db:seed` ผ่านบน environment จริงที่ใช้ทดสอบ
- Full regression ที่เกี่ยวข้องกับ DB/security/clinical/fallback ผ่านอย่างน้อย:
  - `test-db-integration`
  - `test-clinical-data-encryption`
  - `test-auth-and-security-queue`
  - `test-clinician-authorization` รวม trace scoping
  - `test-fallback-integration`
  - `test-fallback-storage`
- `typecheck` ผ่าน
- production build ผ่านด้วย exit code 0
- environment sanity check: ไม่ปล่อย `NODE_ENV=development` หรือ config ชั่วคราวค้างจนทำให้ผล build/test หลอก
- Clinical Summary live verification ต้องตรงกับ **model/version ที่ runtime ใช้จริง**
- Event Trace ฝั่ง Doctor: ต่อ UI ให้เห็น หรือบันทึกเป็น Accepted Gap พร้อมเหตุผลและ permission boundary
- บันทึกผลทั้งหมดใน Evidence Chain + Production Roadmap
- baseline commit/tag ถูกสร้าง, push และอ้างอิงย้อนกลับได้

**Model-version reconciliation**
- รายงาน live ที่มีอยู่ยืนยัน Gemini รุ่นก่อนหน้า; ถ้า runtime เปลี่ยน model/version แล้ว ต้องสร้าง Evidence Chain entry ใหม่และรัน contract + live verification ใหม่ก่อน freeze

**Exit criteria**
- BLOCKER = 0
- test/typecheck/build ที่กำหนดผ่านด้วย exit code 0
- Accepted Gap ทุกข้อมี owner + reason + residual risk + Human Decision
- baseline commit/tag ถูกบันทึกใน `EC-000`

---

### W1 — Clinical Verification (8Q/9Q)

**เป้าหมาย:** ให้ผู้เชี่ยวชาญตรวจ wording, scoring, threshold, interpretation และ escalation

**Deliverables**
- Review package ที่ผู้ไม่ใช่โปรแกรมเมอร์อ่านได้: wording + scoring + threshold + interpretation + escalation
- อ้างอิง/เวอร์ชันทางการของ 8Q และ 9Q พร้อมปี/แหล่ง
- คำถามหลัก: **“ถ้าคะแนน 8Q/9Q เป็น input ให้ Risk Engine มีอะไรบ้างที่ไม่ควรให้ AI ตัดสินเองเด็ดขาด?”**
- Findings ทุกข้อเข้า Evidence Chain

**เงื่อนไข**
- ใช้ synthetic / de-identified data เท่านั้น
- feedback จาก clinician = clinical verification/co-design ระยะต้น **ไม่เรียกว่า certification**

**Exit criteria:** ทุก finding มีสถานะ accepted / rejected(reason) / deferred(reason); accepted change ถูก implement + test แล้ว

---

### W2 — Evidence Chain

**เป้าหมาย:** ทุก decision สำคัญตอบย้อนกลับได้ว่า “ทำไม HYDRA ถึงทำแบบนี้”

**Core chain**
`Finding → Source/Rationale → Required Change → Safety Impact → Implementation → Test → Evidence Artifact → Version → Reviewer/Human Decision`

**เพิ่มจาก v0.1**
- `Related Risk(s)` เชื่อม EC ↔ Risk Register
- `Evidence Artifact / Log Path` ระบุผลรัน/log/report ที่ตรวจได้
- `Reviewer / Decision Authority / Date`
- Model/provider/version change ต้องมี entry ของตัวเอง
- Correction ใช้ `Supersedes`, ห้ามลบประวัติเดิม

**Exit criteria:** clinical logic, escalation, authority boundary, provider/model change และ safety-relevant implementation มี entry ครบทุกช่อง

---

### W3 — Risk / Safety + Live Provider Verification

**เป้าหมาย:** ถามว่า “ถ้ามันผิด มันจะผิดไปทางไหน และผิดแบบไหนปลอดภัยกว่า” พร้อมพิสูจน์กับ provider จริง

**Deliverables**
- `docs/RISK_REGISTER.md`
- risk-linked tests: crisis false negative, false positive escalation, overconfidence, role leakage, provider failure, model drift
- **Risk Engine live test กับ Anthropic จริง** ไม่หยุดแค่ mocked/contract path
- ถ้าใช้ GitHub Actions สำหรับ live test ให้ใช้ OIDC/WIF เพื่อพิสูจน์ workload identity และหลีกเลี่ยง long-lived API secret ใน CI เมื่อทำได้
- WIF เป็น **verification enabler** ไม่ใช่ production secrets-management project; Vault/KMS เต็มรูปแบบยัง out-of-scope
- การเปลี่ยน model/provider/version → contract test + live test + Evidence Chain + residual-risk review ใหม่

**Fail-safe direction ต้องเป็น scenario-specific**
- explicit/imminent crisis → เอนทาง escalation/continuity มากกว่าพลาดสัญญาณ
- ambiguous distress → review/clarify; ไม่ตีตราเป็น crisis โดยอัตโนมัติ
- low-risk uncertainty → ห้ามใช้ “ไม่แน่ใจ” เป็นเหตุผล escalate แบบถาวรโดยไม่มี evidence

> ค่า fail-safe เหล่านี้เป็น **proposal** จน Tor/Human Decision อนุมัติใน Risk Register

**Exit criteria:** ทุก risk มี test/evidence และ Residual Risk + Human Decision; live provider path ของ safety-critical LLM ที่อยู่ใน scope ถูกทดสอบจริง

---

### W4 — Companion Fallback Hardening

**เป้าหมาย:** Fallback เป็น *Minimum Viable Companion* ที่ยังคง safety + presence + honesty — ไม่ใช่ข้อความ error และไม่ใช่ mini-LLM

**แกน:** Context-Aware Compositional Response

```text
intent + topic + affect + conversational state + safety signal
        → response strategy
        → controlled language primitives
        → safety / boundary check
```

**หลัก:** *คำพูดเปลี่ยนได้ พฤติกรรมต้องคงที่ — Compose the language. Constrain the behavior.*

**Fallback 3 lanes**
1. **Safety lane** — local safety signal / crisis floor / escalation requirement
2. **Companion lane** — acknowledge, reflect, clarify, answer-low-risk, next-step, maintain presence
3. **Delivery lane** — queue/outbox/acknowledgement truth; ห้ามอ้างว่าส่งต่อแล้วถ้ายังไม่มี ack

**Local safety floor**
- zero-network local detector ต้องยังทำงานได้ใน degraded mode
- **No match ≠ safe**
- recent explicit/imminent danger ต้องคง conservative floor แม้ context บางส่วนหาย

**Deliverables**
- `docs/FALLBACK_COMPOSITION.md`
- allowlisted + versioned primitive registry
- property tests / forbidden-output tests
- system-status message แยกจาก conversational reply (อย่าให้ข้อความระบบฆ่า “ความเป็น Companion”)
- ผู้เชี่ยวชาญภาษาไทยด้านสุขภาพจิตรีวิว wording

**Exit criteria:** composition ทุกแบบผ่าน boundary/property test และ primitive ที่ใช้จริงผ่าน review

---

### W5 — Fallback Degradation + Recovery

**เป้าหมาย:** ทดสอบทั้งขาลงและขากลับ รวม delivery truth และ recovery semantics

**ระดับที่ใช้เป็น baseline สำหรับทดสอบ**
- **P0** Main Companion + history + Output Auditor
- **P1** Secondary Companion + Output Auditor
- **P2** latest message + limited context; ต้องบอก limitation ตามจริง
- **P3** deterministic context-aware composer
- **P4** local pending/action + encrypted outbox; network-independent เท่าที่จำเป็น

**Scenarios ขั้นต่ำ**
- provider down / failover
- Risk Engine slow/timeout
- Output Auditor timeout → containment/fallback ไม่ใช่ unchecked output
- partial/missing history
- queue/outbox failure
- reconnect + duplicate request
- recovery P4/P3/P2/P1 → P0

**Delivery states**
- `pending` — ยังประเมิน/ยังไม่ได้ตัดสินส่งต่อ
- `queued` — durable/encrypted outbox แล้ว แต่ยังไม่มี recipient ack
- `acknowledged` — มี acknowledgement จริงจากปลายทาง

**กฎเหล็ก**
- ห้ามบอกว่า “ส่งให้แพทย์แล้ว” ถ้ายังไม่ `acknowledged`
- retry/reconnect ต้อง idempotent ด้วย stable message/event ID
- telemetry ของ fallback/recovery **ห้ามเก็บ raw patient text โดยไม่จำเป็น**

**Exit criteria:** scenario × degradation level + recovery มี test/evidence และ deliberate violation test จับ false-delivery claim ได้จริง

---

### W6 — Companion Behavioral Contract

**แนวคิด:** Companion = contract, ไม่ใช่ model

**พฤติกรรมขั้นต่ำที่ทุก implementation ต้องรักษา**
- ไม่วินิจฉัยหรืออ้าง authority เกินจริง
- ไม่สัญญาสิ่งที่ระบบยังไม่ได้ทำ
- ไม่อ้างว่ามีแพทย์/มนุษย์รับรู้แล้วถ้ายังไม่มี ack
- crisis signal ต้องเข้าสู่ safety/escalation path ตาม policy
- รักษา conversational continuity/presence แม้ capability ลดลง
- **Care ≠ Control:** เคารพ agency ของผู้ใช้; ไม่ใช้การ “ดูแล” เป็นเหตุผลขยาย authority
- เมื่อรู้ context ไม่พอ ต้องบอก limitation และถาม/พาไปขั้นปลอดภัย ไม่แต่งข้อมูล
- output ทุกเส้นทางยังต้องผ่าน boundary/safety check ที่เหมาะกับระดับ degradation

**Deliverables**
- `docs/COMPANION_CONTRACT.md`
- contract test suite เดียวสำหรับ LLM path + fallback implementations

**Exit criteria:** ทุก implementation ผ่าน contract suite เดียวกัน

---

### W7 — Governance / Authority Boundary Evidence

**เป้าหมาย:** พิสูจน์กฎเดิม ไม่สร้าง super-agent หรือ stage ใหม่ใน critical path

| ID | Invariant | หลักฐาน |
|---|---|---|
| INV-01 | Crisis signal ชนะ security block | positive + negative test |
| INV-02 | AI ไม่อนุมัติ critical action ของตัวเอง | positive + negative test |
| INV-03 | Irreversible clinical action ต้องอยู่ที่มนุษย์ | positive + negative test |
| INV-04 | Sentinel observe-only ใน scope ปัจจุบัน | test + capability evidence |
| INV-05 | Human Review อยู่เหนือ decision ที่ต้องใช้มนุษย์ | queue/decision test |
| INV-06 | Capability/authority เป็น least-privilege และ purpose-bound | manifest/authorization test |
| INV-07 | No hidden communication path สำหรับ privileged action | traceability test / design evidence |
| INV-08 | Model/provider change ไม่ขยาย authority อัตโนมัติ | change-control test/evidence |

**Security Constitution coverage**
- 15 rules เดิมต้องมี mapping ว่า `tested / design-evidence / deferred` พร้อมเหตุผล
- rule ที่เกี่ยวกับ critical action, authority expansion, clinical irreversibility ห้ามจบเป็น “deferred” แบบไม่มี owner

**Exit criteria:** implemented invariants มี positive+negative test; design-only/deferred rule มีเหตุผลและ owner; ผูก Evidence Chain ครบ

---

### W8 — Clinical Workflow / Capability-driven Role Projection

**เป้าหมาย:** พิสูจน์ว่า clinical information ไปถึง “คนที่ควรเห็น” ในรูปแบบที่ช่วยตัดสินใจ โดยไม่เปิดเกินสิทธิ์

**คำถาม**
- AI summary ต้องมี evidence อะไรประกอบ
- clinician ต้องเห็น raw evidence ตอนไหน
- ถ้า AI summary unavailable/failed จะ fallback ไป source data แบบไหนโดยไม่ทำให้หน้าจอว่างหรือสร้าง summary ปลอม
- patient/doctor/security/admin/developer เห็นอะไรตาม capability จริง

**Deliverables**
- `Event → Policy → Capability → Role Projection`
- UI/permission ไม่ hard-code กับ role name เพียงอย่างเดียว; ใช้ capability-driven model เพื่อรองรับ Doctor/Psychologist/Nurse/Security/Developer/Supervisor/Researcher ในอนาคต
- positive + negative permission tests ต่อ capability/CareAssignment
- doctor source-data fallback เมื่อ summary unavailable
- ไม่แตกเป็น agent ใหม่

**Exit criteria:** clinician feedback อย่างน้อยหนึ่งคน + projection/permission tests ผ่านทั้งอนุญาตและปฏิเสธ

---

### W9 — Ethics / Privacy / Regulatory Path

**เป้าหมาย:** ชัดว่า HYDRA “อ้างว่าเป็นอะไร/ไม่เป็นอะไร” และรู้ data boundary ของตัวเอง

**Deliverables**
- Intended-use statement ตั้งแต่ Stage A
- claims / non-claims
- data-flow inventory: collect → encrypt/decrypt zone → external LLM provider → logs/telemetry → clinician view
- data minimization: ส่งออก external provider เท่าที่จำเป็นต่อ task
- privacy-safe telemetry: หลีกเลี่ยง raw mental-health text ใน log/metrics เว้นแต่มีเหตุผล/permission/retention ที่ชัด
- mapping กับ PDPA ไทยและ sensitive-health-data handling — ให้ผู้เชี่ยวชาญยืนยัน; ไม่ถือว่าเอกสารนี้เป็น legal advice
- consent/ethics gate ก่อน real-user data / pilot

**Exit criteria:** เอกสารครบ, reviewer เหมาะสม, ขอบเขตที่ยังไม่ครอบคลุมระบุชัด

---

## 5. ลำดับและ Dependency

```text
Stage A — RECONCILE + BUILD EVIDENCE FRAMEWORK
  W0 Baseline Gate ───────────────────────────┐
  W2 Evidence Chain v0.2 ─────────────────────┤
  W3 Risk Register v0.2 + provider test plan ─┤
  W9 Intended-use draft ──────────────────────┤
  W1 contact clinician/reviewer ──────────────┘
          │
          ▼
Stage B — VERIFY BEHAVIOR WITHOUT WAITING FOR CLINICIAN
  W4 Fallback Hardening ─────┐
  W5 Degradation/Recovery ───┼─→ W6 Companion Contract
  W7 Authority/Invariants ───┘
  W3 live Risk Engine/provider verification in parallel
  W1 review feeds findings → W2/W3
          │
          ▼
Stage C — HUMAN WORKFLOW / PRIVACY / CLINICAL FIT
  W8 Capability-driven Role Projection + Clinician Co-design
  W9 Privacy / PDPA / Ethics / Regulatory path
          │
          ▼
Phase 2 Review → Definition of Done
```

### 5.1 วันนี้เริ่มจากอะไร

1. Reconcile W0: test/build/model-version/status ล่าสุดให้ตรงกับหลักฐาน
2. Upgrade `EVIDENCE_CHAIN.md` และ `RISK_REGISTER.md` เป็น v0.2
3. เปิด `EC-001` สำหรับ model/version migration ที่เกิดขึ้น และห้าม mark verified จนมีหลักฐานตรงกับ runtime ปัจจุบัน
4. ตัดสิน/บันทึก fail-safe proposal ของ RISK-003 แล้ววาง live Anthropic test + WIF/OIDC path
5. จากนั้นเริ่ม W4–W7 โดยไม่รอ clinician; W1 ติดต่อคู่ขนาน

---

## 6. Templates

### 6.1 Evidence Chain entry v0.2

```markdown
### EC-XXX: <ชื่อสั้น>
- **Finding / Trigger:** <พบอะไร / เปลี่ยน dependency อะไร>
- **Source / Rationale:** <อ้างอิง เวอร์ชัน ปี / เหตุผล>
- **Related Risk(s):** <RISK-XXX หรือ none>
- **Required Change:** <ต้องแก้อะไร หรือไม่แก้พร้อมเหตุผล>
- **Safety Impact:** <ผลด้าน safety/authority/privacy>
- **Implementation:** <ไฟล์ / commit>
- **Test:** <test ID + result>
- **Evidence Artifact / Log Path:** <report/log/trace>
- **Version:** <commit/tag/model/provider version>
- **Reviewer / Decision Authority:** <ใคร>
- **Decision Date:** <YYYY-MM-DD>
- **Supersedes:** <EC-XXX หรือ none>
- **Status:** open | implemented | verified | rejected(reason) | deferred(reason)
```

### 6.2 Risk Register entry v0.2

```markdown
### RISK-XXX: <ชื่อสั้น>
- **Possible Outcome:** <อะไรอาจเกิดขึ้น>
- **Risk / Impact:** <ใครได้รับผลกระทบ>
- **Fail-safe Direction:** <scenario-specific; รอ Human Decision หากยังไม่อนุมัติ>
- **Boundary:** <ห้ามข้ามอะไร>
- **Mitigation:** <มาตรการ>
- **Related Evidence:** <EC-XXX>
- **Test:** <test ID>
- **Evidence:** <ผลรัน / artifact>
- **Residual Risk:** <มนุษย์กรอก>
- **Human Decision:** <ใคร / วันที่ / accepted or closed + เหตุผล>
- **Status:** open | mitigated | accepted | closed
```

**Status semantics**
- `accepted` = residual risk ยังอยู่ แต่ authorized human ยอมรับภายใต้ขอบเขตที่ระบุ
- `closed` = risk ถูกกำจัด/ไม่ applicable แล้ว โดยมี evidence รองรับ

---

## 7. Out of Scope / เลื่อนไว้

ไม่ทำใน Phase 2 เว้นแต่ผ่าน Scope Gate ด้วยเหตุผลเป็นลายลักษณ์อักษร:

| รายการ | หมายเหตุ |
|---|---|
| Kafka/NATS/Redis event bus | infra scaling ไม่ใช่ verification |
| Observability stack เต็มรูปแบบ | ใช้ evidence artifact/audit/trace ที่มีอยู่ก่อน |
| Prompt caching | optimization |
| Rate limiting ทั่วระบบ | ทำเฉพาะเมื่อ Risk Register ชี้ risk จริง |
| Kubernetes/distributed infra | ไม่เกี่ยวกับ current trust evidence |
| RAG | ไม่เกี่ยวกับ Phase 2 core |
| HSM/KMS/Vault เต็มรูปแบบ | production/enterprise secrets infra |
| Agent ใหม่ | Phase 2 เพิ่ม evidence ไม่เพิ่มหัว |
| Certification / hospital deployment | Phase 2 สร้าง evidence foundation ไม่ใช่ pilot |
| Real-patient validation | ต้องผ่าน ethics/consent/clinical gate ก่อน |

---

## 8. Definition of Done

Phase 2 จบเมื่อ:

1. W0 ผ่าน; baseline commit/tag freeze ด้วยหลักฐาน และ BLOCKER = 0
2. 8Q/9Q ผ่าน expert review; finding ทุกข้อเข้า Evidence Chain
3. Risk Register ครบ; risk ทุกตัวมี test/evidence + Human Decision ต่อ residual risk
4. Safety-critical live provider paths ใน scope ผ่าน live verification และ model/provider change control
5. Fallback ผ่าน composition/property + degradation/recovery + false-delivery + idempotency tests
6. Companion implementations ผ่าน contract suite เดียวกัน
7. Governance invariants มี positive/negative evidence และ Security Constitution coverage map
8. Role Projection เป็น capability-driven, permission tests ผ่าน และ clinician feedback ถูกบันทึก
9. Intended-use / data-flow / privacy-safe telemetry / PDPA path / consent-ethics docs ถูก review
10. Production Roadmap + Evidence Chain + Risk Register ชี้กลับกันได้และไม่มี silent gap

**ผลลัพธ์:** หลักฐานแข็งพอสำหรับออกแบบ pilot ในอนาคต — **ยังไม่ใช่ pilot และยังไม่ใช่ clinical certification**

---

## 9. Open Questions

1. ผู้รีวิว 8Q/9Q และผู้รีวิวภาษาไทยของ fallback คือใคร
2. official source/version ของ 8Q/9Q ที่จะใช้เป็น reference baseline คืออะไร
3. ใครมี authority ปิด/accept residual risk แต่ละประเภท
4. P0–P4 ตรงกับโค้ด `FALLBACK_MESH` ปัจจุบันแค่ไหน
5. durable/encrypted outbox และ `pending/queued/acknowledged` ถูก implement ถึงระดับใด
6. runtime ปัจจุบันใช้ Clinical Summary model/version อะไร และมี live evidence ตรงรุ่นแล้วหรือยัง
7. Anthropic Risk Engine live test จะใช้ WIF/OIDC บน GitHub Actions หรือรันจาก local/dev environment เป็นหลัก
8. baseline tag/commit ของ Phase 1 ถูก freeze/push แล้วหรือยัง
9. มี presentation/bootcamp deadline ที่ต้อง map Stage A/B/C หรือยัง
