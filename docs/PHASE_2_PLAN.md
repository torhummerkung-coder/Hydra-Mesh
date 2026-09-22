# HYDRA Mesh — Phase 2 Plan

**Phase 2 = VERIFY WHAT WE BUILT**

| | |
|---|---|
| สถานะ | DRAFT v0.1 (2026-09-21) |
| Owner | Tor |
| Baseline | Phase 1 — freeze อย่างเป็นทางการเมื่อ Workstream 0 ผ่าน |
| ประเภทเอกสาร | แผน (scope, deliverable, exit criteria, dependency) — ไม่มีวันที่ deadline เพราะยังไม่ได้กำหนด |

---

## 1. หลักการ

> อย่าพิสูจน์แค่ว่าระบบทำสิ่งที่เราต้องการได้ — ต้องพิสูจน์ด้วยว่าเมื่อมันทำไม่ได้ มันจะไม่ทำสิ่งที่เราไม่ต้องการ
>
> *Build with responsibility for foreseeable consequences, not merely intended behavior.*

- Phase 2 ไม่ใช่การเพิ่มความสามารถ แต่คือการเปลี่ยนจาก "ระบบทำงานได้" → "ระบบอธิบายได้ พิสูจน์ได้ ทดสอบได้ และมีเหตุผลเพียงพอที่จะไว้ใจ"
- **Clinical threshold ห้ามแก้ระหว่าง Phase 2** (เช่น 8Q `>= 17`, 9Q item 9 flag) จนกว่าจะมีคำตอบจากผู้เชี่ยวชาญ และการแก้ทุกครั้งต้องผ่าน Evidence Chain (หัวข้อ 6.1)
- Invariant จาก Phase 1 ยังอยู่ครบ Phase 2 เพิ่ม "หลักฐานว่ามันทำงานจริง" ไม่ได้รื้อกฎ

## 2. Scope Gate (ตัวกรองงานใหม่)

ของใหม่ทุกอย่างต้องตอบข้อนี้ได้ก่อนเข้า Phase 2:

> **มันเพิ่มความน่าเชื่อถือ ความปลอดภัย การพิสูจน์ หรือ clinical validity ตรงไหน?**

ตอบไม่ได้ = ไม่ใช่งานหลักของ Phase 2 (ดูรายการที่เลื่อนไว้ในหัวข้อ 7)

## 3. ภาพรวม Workstreams

| ID | Workstream | พึ่งคนนอก? | Stage |
|---|---|---|---|
| W0 | Baseline Gate — ปิด Phase 1 ด้วยหลักฐาน | ไม่ | A |
| W1 | Clinical Verification (8Q/9Q) | **ใช่ (จิตแพทย์/นักจิตวิทยา)** | เริ่มติดต่อใน A, รีวิวใน B |
| W2 | Evidence Chain | ไม่ | A (framework) → ต่อเนื่อง |
| W3 | Risk / Safety Testing | ไม่ (residual risk ต้องมีคนตัดสิน) | A (template) → B |
| W4 | Companion Fallback Hardening | wording ต้องรีวิว | B |
| W5 | Fallback Degradation + Recovery Testing | ไม่ | B |
| W6 | Companion Behavioral Contract | ไม่ | B |
| W7 | Governance / Authority Boundary Evidence | ไม่ | B |
| W8 | Clinical Workflow / Clinician Co-design | **ใช่** | C |
| W9 | Ethics / Privacy / Regulatory Path | ควรมีผู้เชี่ยวชาญยืนยัน | intended-use ใน A, ที่เหลือ C |

---

## 4. รายละเอียดแต่ละ Workstream

### W0 — Baseline Gate (ปิด Phase 1 ด้วยหลักฐาน)

**เป้าหมาย:** "Phase 1 CLOSED" ต้องมีหลักฐาน ไม่ใช่แค่ประกาศ

**Deliverables**
- ผลรัน `npm install && npm run db:migrate && npm run db:seed` บนเครื่อง Tor
- ผลรัน `test:*` ทุกตัวที่ต้องใช้ DB / `node_modules` โดยเฉพาะ `test-clinician-authorization` (มี assertion ของ trace scoping ที่เพิ่มล่าสุด), `test-db-integration`, `test-clinical-data-encryption`, `test-auth-and-security-queue`, `test-fallback-integration`, `test-fallback-storage`
- ผลรัน live `npm run test:clinical-summary-gemini` ด้วย `GEMINI_API_KEY` จริง
- ต่อ Event Trace ให้ Doctor เห็นใน `dashboard.tsx` (ตอนนี้ทำแค่ฝั่ง API) หรือบันทึกเป็น known gap พร้อมเหตุผล
- บันทึกผลทั้งหมดใน `PRODUCTION_ROADMAP.md`

**Exit criteria:** test ทุกตัวผ่าน (หรือมี known failure ที่บันทึกพร้อมเหตุผล) และ tag baseline ที่ freeze

### W1 — Clinical Verification (เริ่มจาก 8Q/9Q)

**เป้าหมาย:** ให้ผู้เชี่ยวชาญตรวจว่า wording, scoring, threshold, interpretation และ escalation ถูกต้อง

**Deliverables**
- Review package: แบบประเมิน + logic ที่ HYDRA ใช้ (wording, scoring, threshold, interpretation, escalation) ในรูปแบบที่ผู้ไม่ใช่โปรแกรมเมอร์อ่านได้
- อ้างอิง/เวอร์ชันทางการของ 8Q และ 9Q ที่ใช้เทียบ (ระบุแหล่งและปี)
- คำถามหลักสำหรับผู้เชี่ยวชาญ: *"ถ้าคะแนน 8Q/9Q เป็น input ให้ Risk Engine มีอะไรบ้างที่ไม่ควรให้ AI ตัดสินเองเด็ดขาด?"*
- Findings ทุกข้อบันทึกเป็น Evidence Chain entry (หัวข้อ 6.1)

**เงื่อนไข**
- ข้อมูลที่ส่งให้รีวิวใช้ **synthetic หรือ de-identified เท่านั้น**
- เริ่มติดต่อผู้รีวิวตั้งแต่ Stage A เพราะเวลาคุมไม่ได้ (critical path)

**Exit criteria:** ได้ความเห็นเป็นลายลักษณ์อักษร ทุก finding มีสถานะ (accepted / rejected + เหตุผล / deferred) และ change ที่ accept ถูก implement + test แล้ว

### W2 — Evidence Chain

**เป้าหมาย:** ทุก decision สำคัญย้อนตอบได้ว่า "ทำไม HYDRA ถึงทำแบบนี้"

**รูปแบบ:** `Clinical Finding → Source/Rationale → Required Change → Safety Impact → Implementation → Test → Version`

**Deliverables**
- `docs/EVIDENCE_CHAIN.md` — ตาราง traceability: entry ID ↔ finding ↔ commit/version ↔ test ID
- Template (หัวข้อ 6.1)

**Exit criteria:** decision ที่เกี่ยวกับ clinical logic, escalation, และ authority boundary ทุกข้อมี entry ครบทุกช่อง ไม่มีช่องว่างที่ไม่ได้ระบุเหตุผล

### W3 — Risk / Safety Testing

**เป้าหมาย:** ถามว่า "ถ้ามันผิด มันจะผิดไปทางไหน และผิดแบบไหนปลอดภัยกว่า" ไม่ใช่แค่ happy path

**รูปแบบ:** `Possible Outcome → Risk/Impact → Boundary → Mitigation → Test → Evidence → Residual Risk → Human Decision`

**Deliverables**
- `docs/RISK_REGISTER.md` (template หัวข้อ 6.2)
- ชุดทดสอบที่ผูกกับแต่ละ risk (false negative ของ crisis signal, false positive ที่ทำให้เกิด escalation เกินจำเป็น, ข้อความที่ให้ความมั่นใจเกินจริง, การรั่วไหลข้ามบทบาท ฯลฯ)
- ทุก risk มี **fail-safe direction** ที่ประกาศไว้ล่วงหน้า (ผิดทางไหนยอมรับได้)

**Exit criteria:** ทุก risk ใน register มี test + residual risk ที่มนุษย์ตัดสินและลงชื่อ (AI ไม่ปิด risk เอง)

### W4 — Companion Fallback Hardening

**เป้าหมาย:** Fallback เป็น *Minimum Viable Companion* ที่รักษา behavioral contract แม้ระบบหลักล้ม — ไม่ใช่ข้อความตายตัว และไม่ใช่ mini-LLM

**แกน:** Context-Aware Compositional Response

```
intent + topic + affect + conversational state + safety signal
        → เลือก response strategy
        → ประกอบคำตอบจาก controlled language primitives
        → safety / boundary check
```

**หลัก:** *คำพูดเปลี่ยนได้ พฤติกรรมต้องคงที่ — Compose the language. Constrain the behavior.*

**Deliverables**
- `docs/FALLBACK_COMPOSITION.md` — strategy set, กติกาการเลือก, กติกาการประกอบ
- Primitives registry แบบ **allowlist + versioned** (ไม่มี primitive ที่ไม่ผ่านรีวิวหลุดเข้า output)
- Property tests: ทุกผลลัพธ์ที่ประกอบได้ต้องผ่าน boundary check, เป็น deterministic เมื่อ input เดียวกัน, และไม่มีข้อความต้องห้าม
- รีวิว primitives โดยผู้ที่เชี่ยวชาญภาษาไทยด้านสุขภาพจิต (wording ละเอียดอ่อน)

**Exit criteria:** ผลลัพธ์ทุกแบบที่ประกอบได้ผ่าน property test และ primitives ทั้งหมดผ่านรีวิว

### W5 — Fallback Degradation + Recovery Testing

**เป้าหมาย:** ทดสอบทั้งขาลงและขากลับ ไม่ใช่แค่ว่า fallback ตอบได้

**Deliverables**
- Test matrix ครอบ **P0 → P1 → P2 → P3 → P4** และขากลับสู่ปกติ (ให้ map ระดับเหล่านี้กับนิยามใน `docs/FALLBACK_MESH.md`)
- Scenarios ขั้นต่ำ: provider down, Risk Engine ช้า, Auditor timeout, history หายบางส่วน, queue fail, reconnect แล้ว message ซ้ำ
- Clinical Summary data path: วัดเวลาอ่าน/ถอดรหัสจริงภายใต้ deadline 15 วินาที และปรับเป็น batch decrypt หรือ reuse unwrapped DEK ต่อ request โดยไม่ขยาย auth deadline
- นิยามสถานะการส่งต่อแพทย์ให้ชัด (ร่างเบื้องต้น — ต้องตรวจกับโค้ดจริงก่อนยืนยัน):
  - **pending** — ระบบยังประเมิน/ยังไม่ได้ตัดสินใจส่งต่อ
  - **queued** — อยู่ในคิวส่ง (durable outbox) แต่ยังไม่มีปลายทางรับ
  - **acknowledged** — มี acknowledgement จริงจากปลายทาง
- **กฎเหล็ก:** ห้ามข้อความที่บอกผู้ใช้ว่า "ส่งให้แพทย์แล้ว" ถ้าสถานะยังไม่ใช่ acknowledged — เขียนเป็น test ที่ fail ได้จริง
- Idempotency: reconnect / retry ต้องไม่ทำให้ message หรือ escalation ซ้ำ

**Exit criteria:** ทุก scenario × ทุกระดับมีผลทดสอบ และกฎเหล็กมี test ที่พิสูจน์ว่าจับการฝ่าฝืนได้ (ทดสอบด้วยการจงใจทำให้ผิดแล้วต้อง fail)

### W6 — Companion Behavioral Contract

**แนวคิด:** Companion ไม่ใช่ชื่อโมเดล มันคือ contract — Sonnet เป็น implementation ที่ capability สูง ส่วน deterministic fallback เป็นอีก implementation ของ contract เดียวกัน เมื่อระบบ degrade: capability ↓ predictability ↑

**Deliverables**
- `docs/COMPANION_CONTRACT.md` — พฤติกรรมที่ทุก implementation ต้องรักษา (เช่น ไม่วินิจฉัย, ไม่สัญญาสิ่งที่ระบบยังไม่ทำ, crisis signal ต้องนำไปสู่ escalation path เสมอ)
- **Contract test suite เดียว** ที่รันกับทุก implementation (LLM path และ fallback path)

**Exit criteria:** ทุก implementation ผ่าน contract suite ชุดเดียวกัน

### W7 — Governance / Authority Boundary Evidence

**เป้าหมาย:** กฎเดิมเป็น invariant พิสูจน์ว่าทำงานจริง ไม่เพิ่ม agent ใหม่

| ID | Invariant | หลักฐานที่ต้องมี |
|---|---|---|
| INV-01 | Crisis signal ชนะ security block | test ID: _TBD_ |
| INV-02 | AI ไม่อนุมัติ critical action ของตัวเอง | test ID: _TBD_ |
| INV-03 | Irreversible clinical action ต้องอยู่ที่มนุษย์ | test ID: _TBD_ |
| INV-04 | Sentinel observe-only | test ID: _TBD_ |
| INV-05 | Human Review อยู่เหนือ decision ที่ต้องใช้มนุษย์ | test ID: _TBD_ |

**Exit criteria:** ทุก invariant มี test ที่ผ่านและมี negative test (พยายามละเมิดแล้วต้องถูกปฏิเสธ) และผูกกลับเข้า Evidence Chain

### W8 — Clinical Workflow / Clinician Co-design

**เป้าหมาย:** ดูว่าแพทย์ใช้ข้อมูลแบบไหนจริง หลังจาก clinical content ผ่านการตรวจแล้ว

**คำถามที่ต้องได้คำตอบ**
- AI summary ต้องมีหลักฐานอะไรประกอบจึงจะน่าไว้ใจ
- Clinician ต้องเห็น raw evidence ตอนไหน
- ข้อมูลไหนที่ patient / doctor / security เห็น

**Deliverables**
- ตาราง Role Projection (Event → Policy → Role Projection) ระบุชัดว่าแต่ละบทบาทเห็นอะไร
- ข้อกำหนดของ AI summary (evidence ที่ต้องแนบ, disclaimer)
- **ไม่แตกเป็น agent ใหม่** ในเฟสนี้

**Exit criteria:** ได้ feedback จากแพทย์อย่างน้อยหนึ่งคน และ Role Projection ถูกยืนยันด้วย test ตามสิทธิ์จริง (ต่อยอด `CareAssignment`)

### W9 — Ethics / Privacy / Regulatory Path

**เป้าหมาย:** ชัดว่า HYDRA "อ้างว่าเป็นอะไร" และ "ไม่อ้างว่าเป็นอะไร" (ไม่ใช่การขอ certification หรือ deploy ในโรงพยาบาลจริง)

**Deliverables**
- **Intended-use statement** ฉบับสั้น (ร่างตั้งแต่ Stage A เพราะกำหนด claim ของทุกอย่างที่เหลือ) เช่น ช่วยคัดกรอง/สนับสนุน ไม่ใช่วินิจฉัย
- รายการ claims / non-claims
- Data-flow inventory: ข้อมูลอะไรถูกเก็บ เข้ารหัสอย่างไร และ **อะไรถูกส่งออกไปยัง LLM provider ภายนอก** (Anthropic, Gemini)
- Mapping กับ PDPA ของไทย (ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหว) — *เอกสารนี้ไม่ใช่คำแนะนำทางกฎหมาย ควรให้ผู้เชี่ยวชาญยืนยัน*
- ข้อกำหนดด้าน consent/ethics ก่อนใช้ข้อมูลผู้ใช้จริงในการทดสอบหรือ pilot

**Exit criteria:** เอกสารครบและมีคนที่เหมาะสมรีวิว โดยระบุขอบเขตที่ยังไม่ครอบคลุมอย่างตรงไปตรงมา

---

## 5. ลำดับและ Dependency

```
Stage A — วางรากฐาน
  W0 Baseline Gate ─────────────┐
  W2 Evidence Chain (framework) ─┤
  W3 Risk template ─────────────┤
  W9 Intended-use (ร่าง) ────────┤
  W1 เริ่มติดต่อผู้รีวิว ──────────┘
            │
            ▼
Stage B — ทำได้โดยไม่ต้องรอแพทย์
  W4 Fallback Hardening ─┐
  W5 Degradation/Recovery ├─→ W6 Contract suite
  W7 Invariant evidence ──┘
  W1 รีวิวเกิดขึ้นขนานกัน (ผลป้อนกลับเข้า W2)
            │
            ▼
Stage C — ต้องการ feedback จากมนุษย์
  W8 Clinician Co-design
  W9 Privacy / Regulatory path (ส่วนที่เหลือ)
            │
            ▼
Phase 2 Review — ประเมินตาม Definition of Done (หัวข้อ 8)
```

**ทำไมเรียงแบบนี้**
- W0 ก่อน เพราะ "verify what we built" ต้องเริ่มจากยืนยันว่าสิ่งที่สร้างผ่านจริง
- W2/W3 ก่อน เพราะทุก workstream ที่เหลือต้องบันทึกหลักฐานลงโครงสร้างเดียวกัน
- W1 เริ่มติดต่อเร็วเพราะพึ่งเวลาคนอื่น ระหว่างรอ W4–W7 ไปต่อได้
- ถ้า W1 ยังไม่เสร็จ **W4 ยังไม่ประกาศ final** — wording ที่ผ่าน property test แล้วยังต้องรอรีวิว

---

## 6. Templates

### 6.1 Evidence Chain entry

```markdown
### EC-XXX: <ชื่อสั้น>
- **Clinical Finding:** <ผู้เชี่ยวชาญ/แหล่งพบอะไร>
- **Source / Rationale:** <อ้างอิง เวอร์ชัน ปี / เหตุผล>
- **Required Change:** <ต้องแก้อะไร หรือ "ไม่แก้" พร้อมเหตุผล>
- **Safety Impact:** <กระทบความปลอดภัยอย่างไร ทิศทางไหน>
- **Implementation:** <ไฟล์ / commit>
- **Test:** <test ID + ผลรัน>
- **Version:** <เวอร์ชันระบบที่มีผล>
- **Status:** accepted | rejected (เหตุผล) | deferred
```

### 6.2 Risk Register entry

```markdown
### RISK-XXX: <ชื่อสั้น>
- **Possible Outcome:** <อะไรอาจเกิดขึ้น>
- **Risk / Impact:** <ใครได้รับผลกระทบ รุนแรงแค่ไหน>
- **Fail-safe Direction:** <ถ้าผิด ยอมให้ผิดไปทางไหน>
- **Boundary:** <ขอบเขตที่ระบบต้องไม่ข้าม>
- **Mitigation:** <มาตรการ>
- **Test:** <test ID>
- **Evidence:** <ผลรัน / log>
- **Residual Risk:** <ความเสี่ยงที่ยังเหลือ>
- **Human Decision:** <ใครตัดสิน / วันที่ / ตัดสินว่าอย่างไร>
```

---

## 7. Out of Scope / เลื่อนไว้

ไม่ทำใน Phase 2 เว้นแต่ผ่าน Scope Gate (หัวข้อ 2) ด้วยเหตุผลที่เขียนไว้เป็นลายลักษณ์อักษร:

| รายการ | หมายเหตุ |
|---|---|
| Message broker (Kafka ฯลฯ) | infra ยังไม่ตอบคำถามเรื่องความน่าเชื่อถือ/clinical validity |
| Observability stack เต็มรูปแบบ | ใช้ event chain / audit log ที่มีอยู่เป็นหลักฐานก่อน |
| Prompt caching | optimization ไม่ใช่ verification |
| Rate limiting | ถ้า Risk Register ชี้ว่าเป็น risk จริง (เช่น brute-force ที่ login) ให้เข้าผ่าน Scope Gate เป็นรายกรณี |
| Kubernetes / distributed infra | ไม่เกี่ยวกับ scope |
| RAG | ไม่เกี่ยวกับ scope |
| HSM / KMS | ไม่เกี่ยวกับ scope ตอนนี้ |
| Agent ใหม่ | เฟสนี้เพิ่ม "หลักฐาน" ไม่ใช่ agent |
| Certification / deploy ในโรงพยาบาลจริง | Phase 2 สร้างราก evidence ไม่ใช่ pilot |

---

## 8. Definition of Done ของ Phase 2

Phase 2 จบเมื่อ:

1. W0 ผ่าน และ Phase 1 baseline ถูก freeze ด้วยหลักฐาน
2. Clinical logic ของ 8Q/9Q ผ่านการรีวิวโดยผู้เชี่ยวชาญ และทุก finding มี Evidence Chain entry
3. Risk Register ครบ ทุก risk มี test และ residual risk ที่มนุษย์ตัดสินแล้ว
4. Fallback ผ่าน property tests, degradation/recovery matrix และ contract suite
5. ทุก invariant (INV-01…05) มีทั้ง positive และ negative test
6. Role Projection ยืนยันกับแพทย์และทดสอบตามสิทธิ์จริง
7. Intended-use, data-flow inventory และแนวทาง PDPA จัดทำและมีผู้รีวิว
8. `PRODUCTION_ROADMAP.md` บันทึกการตัดสินใจครบ

**ผลลัพธ์ที่ต้องการ:** หลักฐานที่แข็งพอสำหรับ pilot ในอนาคต (ไม่ใช่ตัว pilot)

---

## 9. Open Questions (ต้องตัดสินก่อน/ระหว่าง Stage A)

1. มีผู้เชี่ยวชาญ (จิตแพทย์/นักจิตวิทยา) ที่ติดต่อได้แล้วหรือยัง และผู้รีวิว primitives ภาษาไทยเป็นใคร
2. ได้เอกสาร/เวอร์ชันทางการของ 8Q และ 9Q ที่ใช้อ้างอิงแล้วหรือยัง
3. ใครคือ "มนุษย์ผู้ตัดสิน" สำหรับ Residual Risk และ Human Decision ในทะเบียนความเสี่ยง
4. ระดับ P0–P4 ใน `docs/FALLBACK_MESH.md` ตรงกับที่ใช้ใน W5 หรือไม่ และนิยาม pending/queued/acknowledged ตรงกับ durable outbox ปัจจุบันหรือไม่
5. มี deadline ของโปรเจกต์ (เช่น วัน present) ที่ต้องกำหนด Stage A/B/C ให้พอดีหรือไม่
