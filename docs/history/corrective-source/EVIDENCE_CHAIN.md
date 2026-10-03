# HYDRA Mesh — Evidence Chain

> ทุก decision สำคัญต้องย้อนตอบได้ว่า "ทำไม HYDRA ถึงทำแบบนี้"
> ไม่ใช่แค่ "เราออกแบบกันว่าแบบนี้น่าจะดี"

**รูปแบบ:** `Clinical Finding → Source/Rationale → Required Change → Safety Impact → Implementation → Test → Version`
พร้อมลิงก์ไป Risk Register และ metadata ของผู้รีวิว/ผู้ตัดสินใจ (เพิ่มใน v0.2)

| | |
|---|---|
| Schema | **v0.2** |
| อ้างอิง | `PHASE_2_PLAN.md` (W2), `docs/RISK_REGISTER.md` |
| Owner | Tor |
| ผู้มีอำนาจตัดสินใจ | _TBD_ (Open Question #3 ใน `PHASE_2_PLAN.md`) |
| สถานะ freeze ล่าสุด | **CORRECTIVE VERIFICATION REQUIRED** (ตาม `PHASE1_FREEZE_RECONCILIATION_REVIEW.md`, 2026-09-22) — ดู EC-000 |

---

## กติกา

1. **Append-only** — ไม่ลบหรือเขียนทับ entry เก่า ถ้าต้องแก้ ให้เพิ่ม entry ใหม่ที่ระบุ `Supersedes: EC-XXX`
2. **ทุก entry ต้องมี Test** — ถ้ายังไม่มี Status ต้องเป็น `open` และห้ามปิดจนกว่าจะมี test ID + ผลรัน
3. **ห้ามปล่อยช่องว่างเงียบๆ** — ช่องไหนไม่เกี่ยวให้เขียน `N/A` พร้อมเหตุผลสั้นๆ
4. **การแก้ clinical threshold** (เช่น 8Q `>= 17`, 9Q item 9 flag, 9Q `>= 13` referral) ต้องมี entry ที่ Source อ้างอิงเวอร์ชันทางการก่อนแก้โค้ดเสมอ
5. **Version** ใช้ commit hash หรือ tag ที่ตรวจสอบย้อนกลับได้จริง
6. ข้อมูลตัวอย่างและ artifact ใช้ **synthetic / de-identified เท่านั้น** — ห้ามมีข้อมูลผู้ป่วยจริง
7. **ลิงก์สองทาง** — ทุก entry ต้องมี `Related Risk(s)` (หรือ `none` พร้อมเหตุผล) และทุก risk ที่ถูกอ้างต้องอ้างกลับมาที่ EC นี้ในช่อง `Related Evidence` ของ `docs/RISK_REGISTER.md`
8. **Review metadata ต้องครบก่อนเป็น `verified`** สำหรับ clinical finding — บันทึกว่าใครรีวิว เมื่อไร บนพื้นฐานอะไร และมนุษย์คนไหนรับผิดชอบ decision
   - **การตรวจสอบโดย AI (web search เทียบเอกสารทางการ) ไม่นับเป็น "reviewed by" ที่ปิด entry ได้** — ต้องระบุแยกเป็น `AI cross-check` และรอ `Clinician review` เป็นอีกบรรทัดก่อนตั้ง Status เป็น `verified`
   - ถ้าผู้รีวิวไม่ประสงค์เปิดชื่อ ให้ใช้บทบาท + รหัสอ้างอิงภายใน และเก็บการจับคู่รหัสกับตัวตนไว้ในที่ที่เหมาะสม
   - Entry ที่ไม่ใช่ clinical (เช่น EC-000) ให้ระบุผู้ตรวจทานภายใน หรือ `N/A` พร้อมเหตุผล
9. **Evidence artifact** เก็บที่ `docs/evidence/EC-XXX/` (ผลรัน, log, บันทึกการรีวิว) และระบุ path ใน entry

## Status

`open` → `implemented` → `verified` | `rejected (เหตุผล)` | `deferred (เหตุผล)`

---

## Traceability Index

| Entry | ชื่อ | Related Risk(s) | Test ID | Version | Status |
|---|---|---|---|---|---|
| EC-000 | Phase 1 baseline freeze | RISK-001, RISK-002, RISK-003 | Phase 1 baseline suite (11 scripts) | `phase1-freeze-v0.1.0` (tag ยังไม่สร้าง) | implemented |
| EC-001 | Clinical instrument verification (8Q/9Q) — AI cross-check | — (feeds W1) | `test-clinical-scoring` | รวมใน `phase1-freeze-v0.1.0` | implemented |

---

## Entries

### EC-000: Phase 1 baseline freeze
- **Clinical Finding:** N/A — เป็น entry จุดอ้างอิงเริ่มต้นของ evidence trail
- **Source / Rationale:** `PHASE_2_PLAN.md` W0 — "Phase 1 CLOSED" ต้องมีหลักฐาน ไม่ใช่แค่ประกาศ; รันตาม `PHASE1_FREEZE_RUNBOOK.md`
- **Required Change:** N/A
- **Safety Impact:** กำหนดจุดอ้างอิงที่ทุกการเปลี่ยนแปลงใน Phase 2 เทียบย้อนกลับได้
- **Related Risk(s):** RISK-001 (Clinical Summary live integration), RISK-002 (trace ownership fail-closed), RISK-003 (Anthropic live path ยังไม่ครบ)
- **Implementation:** Freeze candidate ผ่าน baseline suite ครบตาม runbook; **ยังไม่สร้าง commit/annotated tag `phase1-freeze-v0.1.0`** (ตรวจแล้วไม่มี `.git` ใน bundle ที่ส่งมา)
- **Test:** ผลรันจริงวันที่ 2026-09-22 (ยืนยันชื่อ script ตรงกับ `package.json` แล้ว)

  | Script | ผล | วันที่รัน | หมายเหตุ |
  |---|---|---|---|
  | `npm install && npm run db:migrate && npm run db:seed` | PASS | 2026-09-22 | — |
  | `npm run test:db` | PASS | 2026-09-22 | — |
  | `npm run test:clinical-data-encryption` | PASS | 2026-09-22 | — |
  | `npm run test:auth-and-security-queue` | PASS | 2026-09-22 | — |
  | `npm run test:clinician-authorization` | PASS | 2026-09-22 | บรรทัด `"event trace is patient-scoped for clinicians..."` ยืนยันแล้วว่ามีอยู่จริงใน script (บรรทัด 216) |
  | `npm run test:fallback-integration` | PASS | 2026-09-22 | โน้ตอ้างว่าเพิ่ม deadline อ่านข้อมูล Clinical Summary เป็น 15 วินาที แต่ **ตรวจโค้ดจริงใน `lib/fallback/deadline.ts` และ `pages/api/doctor/patient-summary.ts` แล้วไม่พบค่า 15 วินาทีที่ไหนเลย** — `withDeadline()` ใช้ default 3000ms ทุกจุดที่เรียก ต้องถามตัดสินหาว่า code ที่ zip มาไม่ใช่เวอร์ชันล่าสุดที่มีการแก้นี้ หรือโน้ตเขียนผิด ดู RISK-004 |
  | `npm run test:fallback-storage` | PASS | 2026-09-22 | — |
  | `npm run test:clinical-summary-contract` | PASS | 2026-09-22 | mocked-fetch, ไม่เรียก API จริง |
  | `npm run test:clinical-summary-gemini` (live) | PASS | 2026-09-22 | ⚠️ บันทึกไว้ว่าใช้ **Gemini 3.8 Flash** แต่ `.env.example` และ `clinical-summary-agent.ts` default เป็น `gemini-3.7-flash` — **ต้องยืนยันกับ Tor ว่า `GEMINI_MODEL` ถูก override ตอนรัน หรือโค้ด default ควรอัปเดตให้ตรงกับที่ live-verify จริง** ก่อนถือว่า Version ตรงกับที่ทดสอบ |
  | `npm run typecheck` | PASS | 2026-09-22 | — |
  | `DEMO_AUTH_ENABLED=false npm run build` | PASS | 2026-09-22 | — |
  | `npm run test:security` (ส่วน Anthropic live: Risk Engine/Companion/Auditor) | **ยังไม่รัน** | — | ต้องตั้ง `ANTHROPIC_API_KEY` แล้วรันบนเครื่อง Tor — ปิด RISK-003 |
  | Doctor Event Trace UI ใน `dashboard.tsx` | **โค้ดใหม่ส่งมาแล้ว** (`hydra-step4-doctor-trace-ui.zip`, 2026-09-22 07:49) | — | list + modal เรียก `/api/doctor/event-trace` ตรงกับ API ที่มีอยู่แล้ว, bracket-balance ผ่านการตรวจแบบ static — **ยังไม่ได้รัน `typecheck`/`build`/manual click-through กับไฟล์นี้จริง** |

- **Evidence artifact:** `docs/evidence/EC-000/` — _TBD_ (แนะนำเก็บ terminal output จริงของแต่ละ script ไว้ที่นี่ ไม่ใช่แค่สรุปว่า PASS)
- **Version:** `phase1-freeze-v0.1.0` (planned; ต้องยืนยันด้วย `git show` หลังสร้าง tag — ยังไม่มี commit ให้ผูก)
- **Known gaps ที่รอ Human Decision:**
  1. Anthropic live path ของ Risk Engine / Companion / Auditor ยังไม่ live-verified — **แก้ไขสถานะแล้ว**: Tor ตัดสินใจแล้ว 2026-09-22 ว่ายอมรับ residual risk นี้เฉพาะขอบเขต MVP/Portfolio Demo ห้ามอ้าง readiness สำหรับ clinical deployment (ดู RISK-003 → `accepted`)
  2. Doctor Event Trace UI — **สับสนระหว่าง 2 snapshot**: `hydra-step4-doctor-trace-ui.zip` มี wiring เข้า `/api/doctor/event-trace` ครบ แต่ `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` (ตรวจ zip อีกไฟล์ `hydra-mesh-phase1-freeze-candidate(1).zip`) รายงานว่า `dashboard.tsx` ในนั้น **ไม่มี** การอ้างถึง event-trace เลย ต้องยืนยันว่า commit ที่จะ tag รวม wiring นี้เข้าไปจริงหรือยัง
  3. Gemini model version — ยังไม่ยืนยัน; reconciliation review ยืนยันตรงกับที่พบไว้ว่า `.env.example`/agent defaults/contract test/runbook ใน zip ที่ตรวจยังเป็น `3.7-flash` ทั้งหมด ทั้งที่ live-verify ใช้ `3.8-flash` (override) — ต้องแก้ config ให้ตรงกันก่อน freeze (ดู RISK-005)
  4. "Data-read deadline 15 วินาที" — reconciliation review ยืนยันตรงกับที่พบไว้เช่นกัน: ไม่มีในทุก zip ที่ตรวจ **ระบุ constant name ที่ต้องมีแล้ว**: `CLINICAL_DATA_READ_DEADLINE_MS = 15_000` ใน `patient-summary.ts` ควรปรากฏ ≥5 จุด (ประกาศ + ใช้กับ 4 data read: conversationHistory, nineQHistory, eightQHistory, reviewQueue) — **auth deadline (`hasCurrentClinicalCapability`, `hasActiveCareAssignment`) ต้องไม่ถูกขยายตามไปด้วย** (ดู RISK-004)
  5. Clinical Summary เป็น *live integration verification* ไม่ใช่ *clinical validation* — ดู EC-001 (8Q/9Q verification) สำหรับสถานะ clinical review จริง
  6. **ไม่มี ZIP ใดที่ส่งมาเป็น snapshot หลังแก้ที่ตรวจสอบได้** — ทุกอย่างข้างบนต้องยืนยันจาก git tag จริง (`git show <tag>:<path>`) ไม่ใช่จาก zip เท่านั้น ตามที่ `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` ระบุไว้ชัดเจน
- **Review**
  - Reviewed by: N/A — entry นี้เป็น baseline freeze ไม่ใช่ clinical finding; ผลรันมาจาก Tor ตาม `PHASE1_FREEZE_RUNBOOK.md`
  - Review date: 2026-09-22 (ตรวจซ้ำอีกครั้งด้วย `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` วันเดียวกัน — ยืนยันผลตรงกัน + พบ gap เพิ่ม 1 ข้อ)
  - Review basis: ผลรันจริงที่ Tor รายงาน + Claude ตรวจ cross-reference ชื่อ script กับ `package.json`/เนื้อหา test file จริง + reconciliation review อิสระที่ตรวจ zip คนละไฟล์แล้วได้ข้อสรุปตรงกันในจุด deadline/Gemini version
  - Decision owner: Tor — ต้องรัน `CHECK_PHASE1_FREEZE.sh <tag>` กับ repo จริงก่อนถือว่า freeze สมบูรณ์ (checker ตรวจ tag/deadline constant/model string/dashboard wiring/เอกสาร v0.2/ไม่มี zip ถูก track — ครอบคลุม gap 2–4 และ 6 ข้างต้น แต่ไม่ครอบ typecheck/build/manual click-through ซึ่งต้องเก็บผลแยก)
  - Decision date: _TBD_ — รอผลรัน checker
- **Supersedes:** none
- **Status:** implemented — baseline suite ผ่านครบตาม runbook, **แต่สถานะ freeze โดยรวมคือ `CORRECTIVE VERIFICATION REQUIRED`** ตาม `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` จนกว่าจะรัน checker กับ tag จริงแล้วผ่านทุกข้อ

### EC-001: Clinical instrument verification (8Q / 9Q) — AI cross-check เบื้องต้น
- **Clinical Finding:**
  - 8Q: ตรงกับต้นฉบับทุกข้อ ทุกน้ำหนักคะแนน (1,2,6,8,8,9,4,10,4) ทุก threshold (`>= 17`)
  - 9Q: ตรงกับต้นฉบับทุกข้อ ทุก option (0-3) ทุก band (0-4/5-9/10-14/15-19/20-27), เกณฑ์ `requires8Q` (`>= 7`)
  - 9Q: พบเกณฑ์ใหม่ที่โค้ดไม่เคยมี — `>= 13` ควรพิจารณาส่งพบจิตแพทย์ — เพิ่มเข้าโค้ดแล้ว (`NINE_Q_PSYCHIATRIST_REFERRAL_THRESHOLD`)
  - 9Q: พบ band ทางเลือก (0-6/7-12/13-18/`>=19`) จากเอกสารบริบทผู้ป่วยยาเสพติดเฉพาะทาง — **ตัดสินใจไม่นำมาใช้** เพราะไม่ใช่แหล่งหลักสำหรับ 9Q ทั่วไป
- **Source / Rationale:**
  - 8Q: edu.vru.ac.th/km2/knowledge/03_8Q.pdf (อ้างอิงกรมสุขภาพจิต) — ตรวจ 2026-09-14
  - 9Q: im.rmutt.ac.th/9q — ตรวจ 2026-09-14
  - 9Q referral `>=13`: dsdw.go.th และ vjlh.go.th (ยืนยันตรงกัน 2 แหล่งอิสระ) — ตรวจ 2026-09-14
  - 9Q band ทางเลือก: udo.moph.go.th (บริบทเฉพาะ ไม่ใช่แหล่งหลัก — เหตุผลที่ไม่นำมาใช้)
- **Required Change:** เพิ่ม `NINE_Q_PSYCHIATRIST_REFERRAL_THRESHOLD` (`>= 13`) เข้า `lib/clinical/screening-9q.ts`
- **Safety Impact:** เพิ่มเส้นทาง escalation ที่ขาดหายไปก่อนหน้านี้ (คะแนนกลางค่อนสูงที่ควรส่งพบจิตแพทย์แต่โค้ดเดิมไม่เคย flag)
- **Related Risk(s):** ไม่ตรงกับ RISK-001/002/003 โดยตรง — เป็นรากของ RISK-003's fail-safe scenario table (ต้องรู้ threshold จริงก่อนแยก scenario) และเป็น input หลักของ W1 ใน `PHASE_2_PLAN.md`
- **Implementation:** `lib/clinical/screening-9q.ts`
- **Test:** `test-clinical-scoring.ts` — PASS ทุก boundary case (ตรวจแล้วว่าเป็น algorithm test ล้วนๆ รันได้โดยไม่ต้องมี DB/network)
- **Evidence artifact:** `docs/evidence/EC-001/` — _TBD_ (ควรเก็บ PDF/หน้าเว็บต้นฉบับที่ fetch มา ไม่ใช่แค่ลิงก์ที่อาจล่มภายหลัง)
- **Version:** รวมอยู่ใน `phase1-freeze-v0.1.0` (planned)
- **Review**
  - Reviewed by (AI cross-check): Claude — web search + web fetch เทียบเอกสารทางการ, 2026-09-14
  - Clinician review: **_ยังไม่มี_** — นี่คือ gap สำคัญที่สุดของ W1 ใน `PHASE_2_PLAN.md`; AI cross-check ยืนยันได้แค่ว่า "โค้ดตรงกับเอกสารสาธารณะ" ไม่ใช่ "ผู้เชี่ยวชาญยืนยันว่า logic การใช้คะแนนนี้ทางคลินิกถูกต้องและปลอดภัย"
  - Review basis: เอกสารสาธารณะของกรมสุขภาพจิต/หน่วยงานที่เกี่ยวข้อง (ดู Source/Rationale)
  - Decision owner: _TBD_ (ผู้เชี่ยวชาญที่ Tor จะติดต่อ ตาม W1)
  - Decision date: _TBD_
- **Supersedes:** none
- **Status:** implemented — เปลี่ยนเป็น `verified` ได้ก็ต่อเมื่อมี Clinician review ตามกติกาข้อ 8

<!-- Template สำหรับ entry ถัดไป: คัดลอกบล็อกด้านล่าง

### EC-XXX: <ชื่อสั้น>
- **Clinical Finding:** <ผู้เชี่ยวชาญ/แหล่งพบอะไร>
- **Source / Rationale:** <อ้างอิง เวอร์ชัน ปี / เหตุผล>
- **Required Change:** <ต้องแก้อะไร หรือ "ไม่แก้" พร้อมเหตุผล>
- **Safety Impact:** <กระทบความปลอดภัยอย่างไร ทิศทางไหน>
- **Related Risk(s):** <RISK-XXX, ... หรือ none + เหตุผล>
- **Implementation:** <ไฟล์ / commit>
- **Test:** <test ID + ผลรัน>
- **Evidence artifact:** <docs/evidence/EC-XXX/... path>
- **Version:** <เวอร์ชันระบบที่มีผล>
- **Review**
  - Reviewed by: <ชื่อ + บทบาท/วุฒิ หรือรหัสภายใน>
  - Review date: <YYYY-MM-DD>
  - Review basis: <เอกสาร/เวอร์ชัน/ชุดข้อมูลที่ผู้รีวิวเห็น>
  - Decision owner: <มนุษย์ผู้รับผิดชอบ decision นี้>
  - Decision date: <YYYY-MM-DD>
- **Supersedes:** <EC-XXX หรือ none>
- **Status:** open | implemented | verified | rejected | deferred
-->

---

## Schema changelog

| Schema | การเปลี่ยนแปลง |
|---|---|
| v0.1 | โครงแรก: finding → implementation → test → version |
| v0.2 | เพิ่ม `Related Risk(s)` (ลิงก์สองทางกับ Risk Register), `Evidence artifact`, บล็อก `Review` (ผู้รีวิว/วันที่/basis/decision owner/decision date, แยก AI cross-check กับ Clinician review), `Supersedes` เป็นฟิลด์บังคับ, กติกาข้อ 7–9; เติม EC-000 ด้วยผลรันจริง (2026-09-22) และเพิ่ม EC-001 (8Q/9Q AI cross-check) |

> เปลี่ยน schema ครั้งต่อไปให้เพิ่มแถวที่นี่ และระบุวิธี migrate entry เก่า
