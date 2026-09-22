# HYDRA Mesh — Evidence Chain

> ทุก decision สำคัญต้องย้อนตอบได้ว่า "ทำไม HYDRA ถึงทำแบบนี้"
> ไม่ใช่แค่ "เราออกแบบกันว่าแบบนี้น่าจะดี"

**รูปแบบ:** `Clinical Finding → Source/Rationale → Required Change → Safety Impact → Implementation → Test → Version`

| | |
|---|---|
| สถานะเอกสาร | SKELETON v0.1 |
| อ้างอิง | `PHASE_2_PLAN.md` (W2) |
| Owner | Tor |

---

## กติกา

1. **Append-only** — ไม่ลบหรือเขียนทับ entry เก่า ถ้าต้องแก้ ให้เพิ่ม entry ใหม่ที่ระบุ `Supersedes: EC-XXX`
2. **ทุก entry ต้องมี Test** — ถ้ายังไม่มี ให้ Status เป็น `open` และห้ามปิดจนกว่าจะมี test ID + ผลรัน
3. **ห้ามปล่อยช่องว่างเงียบๆ** — ช่องไหนไม่เกี่ยวให้เขียน `N/A` พร้อมเหตุผลสั้นๆ
4. **การแก้ clinical threshold** (เช่น 8Q `>= 17`, 9Q item 9 flag) ต้องมี entry ที่มี Source อ้างอิงเวอร์ชันทางการก่อนแก้โค้ดเสมอ
5. **Version** ใช้ commit hash หรือ tag ที่ตรวจสอบย้อนกลับได้จริง
6. ข้อมูลตัวอย่างใน entry ใช้ synthetic / de-identified เท่านั้น

## Status

`open` → `implemented` → `verified` | `rejected (เหตุผล)` | `deferred (เหตุผล)`

---

## Traceability Index

| Entry | ชื่อ | ที่มา | Test ID | Version | Status |
|---|---|---|---|---|---|
| EC-000 | Phase 1 baseline freeze | W0 | Phase 1 baseline suite | `phase1-freeze-v0.1.0` (planned) | verified |

---

## Entries

### EC-000: Phase 1 baseline freeze
- **Clinical Finding:** N/A — เป็น entry จุดอ้างอิงเริ่มต้นของ evidence trail
- **Source / Rationale:** `PHASE_2_PLAN.md` W0 — "Phase 1 CLOSED" ต้องมีหลักฐาน ไม่ใช่แค่ประกาศ
- **Required Change:** N/A
- **Safety Impact:** กำหนดจุดอ้างอิงที่ทุกการเปลี่ยนแปลงใน Phase 2 เทียบย้อนกลับได้
- **Implementation:** Freeze commit/tag `phase1-freeze-v0.1.0`
- **Test:** ผลรันจริงวันที่ 2026-09-22

  | Script | ผล | วันที่รัน |
  |---|---|---|
  | `npm install && npm run db:migrate && npm run db:seed` | PASS | 2026-09-22 |
  | `test-db-integration` | PASS | 2026-09-22 |
  | `test-clinical-data-encryption` | PASS | 2026-09-22 |
  | `test-auth-and-security-queue` | PASS | 2026-09-22 |
  | `test-clinician-authorization` (รวม trace scoping) | PASS | 2026-09-22 |
  | `test-fallback-integration` | PASS — หลังเพิ่ม deadline อ่านข้อมูลเฉพาะ Clinical Summary เป็น 15 วินาที | 2026-09-22 |
  | `test-fallback-storage` | PASS | 2026-09-22 |
  | `test:clinical-summary-contract` | PASS — request contract, multi-part parsing และ empty-response fail-closed | 2026-09-22 |
  | `test:clinical-summary-gemini` (live) | PASS — Gemini 3.8 Flash, summary ไม่ว่าง, disclaimer คงเดิม และ timestamp ถูกต้อง | 2026-09-22 |
  | `npm run typecheck` | PASS | 2026-09-22 |
  | `DEMO_AUTH_ENABLED=false npm run build` | PASS | 2026-09-22 |

- **Version:** `phase1-freeze-v0.1.0`
- **Known gaps ที่ Tor ยอมรับ:** Anthropic live path ไม่ได้ใช้หรือกล่าวอ้างว่า verified ใน Phase 1; Gemini summary ยังไม่ใช่ clinical validation; deadline อ่านข้อมูล 15 วินาทีเป็น Phase 1 mitigation และต้อง optimize ใน Phase 2
- **Status:** verified — baseline ผ่านและ known gaps ได้รับ Human Decision แล้ว

<!-- Template สำหรับ entry ถัดไป: คัดลอกบล็อกด้านล่าง

### EC-XXX: <ชื่อสั้น>
- **Clinical Finding:** <ผู้เชี่ยวชาญ/แหล่งพบอะไร>
- **Source / Rationale:** <อ้างอิง เวอร์ชัน ปี / เหตุผล>
- **Required Change:** <ต้องแก้อะไร หรือ "ไม่แก้" พร้อมเหตุผล>
- **Safety Impact:** <กระทบความปลอดภัยอย่างไร ทิศทางไหน>
- **Implementation:** <ไฟล์ / commit>
- **Test:** <test ID + ผลรัน>
- **Version:** <เวอร์ชันระบบที่มีผล>
- **Supersedes:** <EC-XXX หรือ none>
- **Status:** open | implemented | verified | rejected | deferred
-->
