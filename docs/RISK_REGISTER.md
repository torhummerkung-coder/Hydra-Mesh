# HYDRA Mesh — Risk Register

> ถามว่า "ถ้ามันผิด มันจะผิดไปทางไหน และผิดแบบไหนปลอดภัยกว่า"
> ไม่ใช่แค่ว่า happy path ใช้งานได้ไหม

**รูปแบบ:** `Possible Outcome → Risk/Impact → Boundary → Mitigation → Test → Evidence → Residual Risk → Human Decision`

| | |
|---|---|
| สถานะเอกสาร | SKELETON v0.1 |
| อ้างอิง | `PHASE_2_PLAN.md` (W3), `docs/EVIDENCE_CHAIN.md` |
| Owner | Tor |

---

## กติกา

1. **ทุก risk ต้องประกาศ Fail-safe Direction ล่วงหน้า** — ถ้าผิดได้ ยอมให้ผิดไปทางไหน (เช่น escalate เกินจำเป็นดีกว่าพลาดสัญญาณ crisis)
2. **AI ไม่ปิด risk เอง** — ช่อง `Residual Risk` และ `Human Decision` มนุษย์เป็นคนกรอกและลงวันที่เท่านั้น
3. **ทุก risk ต้องผูกกับ test** — ไม่มี test = Status ยังเป็น `open`
4. Mitigation ที่แก้โค้ดหรือ logic ต้องมี entry ใน `docs/EVIDENCE_CHAIN.md` อ้างกลับมา
5. Risk ใหม่ที่พบระหว่างทางเพิ่มได้ทุกเมื่อ แต่ห้ามลบของเดิม (ปิดด้วย Status + Human Decision)
6. ข้อมูลตัวอย่างใช้ synthetic / de-identified เท่านั้น

## Status

`open` → `mitigated` → `accepted (Human Decision)` | `closed (Human Decision)`

---

## Index

| Risk | ชื่อ | Fail-safe Direction | Test ID | Status |
|---|---|---|---|---|
| RISK-001 | Clinical Summary (Gemini) live integration | ล้มเหลว → fallback + disclaimer | `test:clinical-summary-contract`, `test:clinical-summary-gemini` | accepted |
| RISK-002 | Trace ที่ไม่มี patientId ถูกซ่อนจาก Doctor/Staff | ซ่อนไว้ (fail-closed) ดีกว่าเปิดเกินสิทธิ์ | `test-clinician-authorization` | accepted |
| RISK-003 | Risk Engine กับโมเดลจริงยังไม่เคยทดสอบครบ | _TBD (Tor ตัดสิน)_ | `test-security-pipeline` (ส่วน LLM) | accepted |

> RISK-001 ถึง 003 ร่างจากช่องว่างที่รู้อยู่แล้วจากปลาย Phase 1 — **DRAFT รอ Tor ทบทวน** ช่อง Residual Risk / Human Decision เว้นว่างไว้โดยตั้งใจ

---

## Entries

### RISK-001: Clinical Summary (Gemini) live integration
- **Possible Outcome:** การเรียก Gemini จริงล้มเหลว / คืน format ผิด / คืนข้อความว่าง / คืนเนื้อหาที่ไม่เหมาะสมทางคลินิก
- **Risk / Impact:** แพทย์ได้ summary ที่ผิดหรือไม่มี อาจตัดสินใจจากข้อมูลไม่ครบ
- **Fail-safe Direction:** เมื่อไม่แน่ใจ ต้องตกไปที่ fallback และไม่แสดง summary ที่ตรวจสอบไม่ได้
- **Boundary:** summary ต้องมี disclaimer เสมอ และห้ามถูกใช้เป็นการวินิจฉัย
- **Mitigation (ที่มีอยู่):** circuit breaker fallback ใน `patient-summary.ts`, disclaimer ถูกคงไว้, empty-response check, defensive type narrowing
- **Test:** `test:clinical-summary-contract` PASS; live `test:clinical-summary-gemini` PASS ด้วย Gemini 3.8 Flash วันที่ 2026-09-22
- **Evidence:** `EC-000`
- **Residual Risk:** ความถูกต้องเชิงคลินิกและ provider outage ยังอาจเกิดขึ้น แม้ contract และ Gemini live integration ผ่านแล้ว
- **Human Decision:** Tor — 2026-09-22 — ยอมรับสำหรับ Phase 1 MVP/Portfolio Demo เท่านั้น ไม่อนุญาตให้ใช้เป็นการวินิจฉัยหรือตัดสินใจทางคลินิก
- **Status:** accepted (Human Decision)

### RISK-002: Trace ที่ไม่มี patientId ถูกซ่อนจาก Doctor/Staff
- **Possible Outcome:** event ระดับระบบ (sentinel, circuit breaker) ไม่มี patientId จึงมองไม่เห็นสำหรับ Doctor/Staff และ UI ฝั่ง Doctor ยังไม่ต่อกับ trace
- **Risk / Impact:** ความโปร่งใสของ trace ฝั่งแพทย์ต่ำกว่าที่คาด แต่ไม่มีการรั่วข้ามผู้ป่วย
- **Fail-safe Direction:** ซ่อนเมื่อพิสูจน์ความเป็นเจ้าของไม่ได้ (fail-closed) — เลือกเห็นน้อยไปมากกว่าเห็นเกินสิทธิ์
- **Boundary:** Doctor/Staff เห็นเฉพาะ trace ของผู้ป่วยที่มี active `CareAssignment`; Security เห็นทั้งหมด
- **Mitigation (ที่มีอยู่):** ownership derive จาก event แรกที่มี patientId, `event-trace.ts` กรองตาม CareAssignment
- **Test:** assertion ใน `test-clinician-authorization` PASS วันที่ 2026-09-22
- **Evidence:** `EC-000`
- **Residual Risk:** trace แบบ in-memory หายเมื่อ restart และ trace ที่พิสูจน์ patient ownership ไม่ได้จะถูกซ่อนแบบ fail-closed
- **Human Decision:** Tor — 2026-09-22 — ยอมรับสำหรับ Phase 1 Demo; persistent trace storage ย้ายไป Phase 2
- **Status:** accepted (Human Decision)

### RISK-003: Risk Engine กับโมเดลจริงยังไม่เคยทดสอบครบ
- **Possible Outcome:** พฤติกรรมของ LLM risk engine ต่างจากที่ assertion คาดไว้ (ทั้ง false negative และ false positive)
- **Risk / Impact:** false negative อาจพลาดสัญญาณอันตราย, false positive อาจ escalate เกินจำเป็น
- **Fail-safe Direction:** _รอ Tor ประกาศ_ (ข้อเสนอเริ่มต้น: ยอมให้ escalate เกินจำเป็นมากกว่าพลาดสัญญาณ crisis)
- **Boundary:** crisis signal ชนะ security block เสมอ (INV-01)
- **Mitigation (ที่มีอยู่):** detector-only assertions ผ่านแล้ว
- **Test:** `test-security-pipeline` ส่วน LLM — 2 assertions ยังไม่ผ่านใน sandbox เพราะไม่มี `ANTHROPIC_API_KEY` และ network (ไม่ใช่ regression) ต้องรันบนเครื่อง Tor
- **Evidence:** `EC-000`
- **Residual Risk:** พฤติกรรม Anthropic live ยังไม่ได้ยืนยัน เพราะ Phase 1 ไม่ได้เปิดใช้หรือกล่าวอ้างเส้นทางนี้
- **Human Decision:** Tor — 2026-09-22 — ยอมรับให้อยู่นอกขอบเขต Phase 1; ต้องทดสอบก่อนเปิดใช้จริงใน Phase 2
- **Status:** accepted (Human Decision)

<!-- Template สำหรับ risk ถัดไป: คัดลอกบล็อกด้านล่าง

### RISK-XXX: <ชื่อสั้น>
- **Possible Outcome:** <อะไรอาจเกิดขึ้น>
- **Risk / Impact:** <ใครได้รับผลกระทบ รุนแรงแค่ไหน>
- **Fail-safe Direction:** <ถ้าผิด ยอมให้ผิดไปทางไหน>
- **Boundary:** <ขอบเขตที่ระบบต้องไม่ข้าม>
- **Mitigation:** <มาตรการ>
- **Test:** <test ID>
- **Evidence:** <ผลรัน / log>
- **Residual Risk:** <ความเสี่ยงที่ยังเหลือ — มนุษย์กรอก>
- **Human Decision:** <ใคร / วันที่ / ตัดสินว่าอย่างไร — มนุษย์กรอก>
- **Status:** open | mitigated | accepted | closed
-->
