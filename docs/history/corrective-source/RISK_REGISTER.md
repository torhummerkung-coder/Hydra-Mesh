# HYDRA Mesh — Risk Register

> ถามว่า "ถ้ามันผิด มันจะผิดไปทางไหน และผิดแบบไหนปลอดภัยกว่า"
> ไม่ใช่แค่ว่า happy path ใช้งานได้ไหม

**รูปแบบ:** `Possible Outcome → Risk/Impact → Boundary → Mitigation → Test → Evidence → Residual Risk → Human Decision`

| | |
|---|---|
| Schema | **v0.2** |
| อ้างอิง | `PHASE_2_PLAN.md` (W3), `docs/EVIDENCE_CHAIN.md` |
| Owner | Tor |
| ผู้มีอำนาจตัดสินใจ | _TBD_ (Open Question #3 ใน `PHASE_2_PLAN.md`) |

---

## กติกา

1. **Fail-safe Direction ต้องประกาศล่วงหน้าและเป็น scenario-specific** — ระบุว่าในสถานการณ์ไหนยอมให้ผิดไปทางไหน พร้อม **ต้นทุนของทิศตรงข้าม** อย่าใช้กฎเดียวกับทั้งระบบเมื่อทั้ง false negative และ false positive มีต้นทุนจริง
2. **AI ไม่ปิด risk เอง** — ช่อง `Residual Risk` และ `Decision` มนุษย์เป็นคนกรอกและลงวันที่เท่านั้น แม้ test จะ PASS แล้ว Status จะไม่ขยับไป `mitigated` จนกว่า Residual Risk จะถูกประเมินโดยมนุษย์
3. **ทุก risk ต้องผูกกับ test** — ไม่มี test = Status ยังเป็น `open`
4. **ลิงก์สองทาง** — Mitigation ที่แก้โค้ดหรือ logic ต้องมี entry ใน `docs/EVIDENCE_CHAIN.md` และอ้างใน `Related Evidence`; EC ที่ถูกอ้างต้องอ้างกลับมาที่ risk นี้ใน `Related Risk(s)`
5. Risk ใหม่ที่พบระหว่างทางเพิ่มได้ทุกเมื่อ แต่**ห้ามลบของเดิม** (ปิดด้วย Status + Decision)
6. ข้อมูลตัวอย่างและ artifact ใช้ **synthetic / de-identified เท่านั้น**
7. **การเปลี่ยน Status ต้องลงบันทึกใน `Status history`** (วันที่ / จาก → ไป / โดยใคร / เหตุผลสั้นๆ) ห้ามเขียนทับ
8. **Evidence artifact** เก็บที่ `docs/evidence/RISK-XXX/` และระบุ path ใน entry

## Status — นิยาม

| Status | ความหมาย | ต้องมีก่อนเปลี่ยนมาเป็นสถานะนี้ |
|---|---|---|
| `open` | ระบุ risk แล้ว ยังไม่ mitigate หรือยังไม่มี test ที่ผ่าน | — |
| `mitigated` | Mitigation ถูก implement, test ผ่าน, มี evidence, ประเมิน residual risk แล้ว แต่**ยังไม่มีการตัดสินใจโดยมนุษย์** | test ID + evidence path + Residual Risk |
| `accepted` | **Risk ยังเหลืออยู่** แต่ผู้มีอำนาจยอมรับ residual risk นั้น | Decision (ใคร/วันที่) + **Re-review by** (วันที่ทบทวนซ้ำ หรือเงื่อนไขที่ต้องทบทวน) |
| `closed` | **Risk ถูกกำจัดหรือไม่ applicable แล้ว** | เหตุผล (`eliminated` หรือ `N/A`) + evidence path + Decision (ใคร/วันที่) |

- ต่างกันตรงที่ `accepted` = "ยังมีอยู่ แต่มีคนรับผิดชอบ" ส่วน `closed` = "ไม่มีแล้ว และพิสูจน์ได้" — เวลา audit สองอย่างนี้ห้ามปนกัน
- Risk ที่ `accepted` หรือ `closed` กลับไป `open` ได้เสมอเมื่อมีเหตุการณ์ใหม่ โดยเพิ่มบรรทัดใน `Status history`

---

## Index

| Risk | ชื่อ | Fail-safe (สรุป) | Related Evidence | Test ผ่านแล้ว? | Status |
|---|---|---|---|---|---|
| RISK-001 | Clinical Summary (Gemini) live integration | ล้มเหลว → fallback ไม่แสดง summary | EC-000 | ✅ 2026-09-22 | open — รอ Tor ประเมิน Residual Risk |
| RISK-002 | Trace ที่ไม่มี patientId ถูกซ่อนจาก Doctor/Staff | พิสูจน์ ownership ไม่ได้ → ซ่อน | EC-000 | ✅ 2026-09-22 | open — รอ Tor ประเมิน Residual Risk |
| RISK-003 | Risk Engine/Companion/Auditor (Anthropic live path) ยังไม่เคยทดสอบครบ | แยกตาม scenario (ดู entry) | EC-000, EC-001 | ❌ ยังไม่รัน (ต้องมี `ANTHROPIC_API_KEY`) | **accepted** (MVP/Portfolio Demo เท่านั้น — Tor, 2026-09-22) |
| RISK-004 | Clinical Summary "15 วินาที" deadline — เอกสารอ้างถึงแต่ตรวจโค้ดจริงไม่พบ | ห้ามเชื่อว่า mitigation นี้ทำแล้วจนกว่าจะยืนยันกับโค้ด/commit จริง | EC-000 | ⚠️ ยืนยันซ้ำโดย reconciliation review อิสระ (zip คนละไฟล์ ผลตรงกัน) — ยังไม่พบใน zip ใดเลย | open |
| RISK-005 | Gemini model config (`3.7-flash`) ไม่ตรงกับที่บันทึกว่า live-verified (`3.8-flash`) | ไม่ยืนยัน = ห้ามถือว่า production config ถูก live-verify แล้ว | EC-000 | ⚠️ ยืนยันซ้ำโดย reconciliation review อิสระ — `.env.example`/agent defaults/contract test/runbook ทุกจุดยังเป็น 3.7 | open |

> RISK-001 ถึง 003 มาจากรอบ skeleton ก่อนหน้า ตอนนี้มี test ผ่านจริงแล้วสำหรับ 001/002 (ยังขาดแค่ Residual Risk ที่ต้องเป็นมนุษย์กรอก) RISK-004/005 เป็น risk ใหม่ที่พบระหว่างตรวจ evidence ที่ Tor ส่งมารอบนี้ ยังไม่เคยผ่านสายตา Tor — **ทั้งคู่เป็น DRAFT รอ Tor ทบทวน**

---

## Entries

### RISK-001: Clinical Summary (Gemini) live integration
- **Possible Outcome:** การเรียก Gemini จริงล้มเหลว / คืน format ผิด / คืนข้อความว่าง / คืนเนื้อหาที่ไม่เหมาะสมทางคลินิก
- **Risk / Impact:** แพทย์ได้ summary ที่ผิดหรือไม่มี อาจตัดสินใจจากข้อมูลไม่ครบ
- **Fail-safe Direction**

  | Scenario | ให้ผิดไปทาง | ต้นทุนของทิศตรงข้าม |
  |---|---|---|
  | Gemini ล้มเหลว / คืนค่าผิดปกติ | ตกไป fallback และไม่แสดง summary ที่ตรวจสอบไม่ได้ | ถ้าแสดง summary ที่ผิด แพทย์อาจเชื่อข้อมูลที่ไม่จริง (ต้นทุนสูงกว่าการไม่มี summary) |

- **Boundary:** summary ต้องมี disclaimer เสมอ และห้ามถูกใช้เป็นการวินิจฉัย
- **Mitigation (ที่มีอยู่):** circuit breaker fallback ใน `patient-summary.ts`, disclaimer ถูกคงไว้, empty-response check, defensive type narrowing
- **Related Evidence:** EC-000
- **Test:** `test:clinical-summary-contract` PASS (mocked); `test:clinical-summary-gemini` (live) PASS 2026-09-22 — **แต่ดู RISK-005**: ยังไม่ยืนยันว่า model ที่ทดสอบตรงกับ config จริง
- **Evidence artifact:** `docs/evidence/RISK-001/` — _TBD_
- **Residual Risk:** _รอ Tor_ (ข้อเสนอสำหรับพิจารณา: live call ผ่านหนึ่งครั้งไม่ได้พิสูจน์ reliability ระยะยาว, ยังไม่มี live test ซ้ำหลายรอบหรือกับ input ที่หลากหลาย)
- **Decision:** Decided by: _รอ Tor_ · Date: _—_ · Outcome: _—_ · Re-review by: _—_
- **Status:** open
- **Status history:** _(ยังไม่มีการเปลี่ยนสถานะ — test ผ่านแล้ว 2026-09-22 แต่ Status คงเป็น open จนกว่า Tor จะกรอก Residual Risk)_

### RISK-002: Trace ที่ไม่มี patientId ถูกซ่อนจาก Doctor/Staff
- **Possible Outcome:** event ระดับระบบ (sentinel, circuit breaker) ไม่มี patientId จึงมองไม่เห็นสำหรับ Doctor/Staff
- **Risk / Impact:** ความโปร่งใสของ trace ฝั่งแพทย์ต่ำกว่าที่คาด แต่ไม่มีการรั่วข้ามผู้ป่วย
- **Fail-safe Direction**

  | Scenario | ให้ผิดไปทาง | ต้นทุนของทิศตรงข้าม |
  |---|---|---|
  | พิสูจน์ ownership ของ trace ไม่ได้ | ซ่อน (fail-closed) แทนที่จะเปิดไว้ก่อน | ถ้าเปิดเกินสิทธิ์ = ข้อมูลผู้ป่วยรั่วข้ามความสัมพันธ์การดูแล (ต้นทุนสูงกว่าการเห็นน้อยไป); ต้นทุนของการซ่อนคือ Doctor เห็น trace ไม่ครบและต้องพึ่ง Security role |

- **Boundary:** Doctor/Staff เห็นเฉพาะ trace ของผู้ป่วยที่มี active `CareAssignment`; Security เห็นทั้งหมด
- **Mitigation (ที่มีอยู่):** ownership derive จาก event แรกที่มี patientId, `event-trace.ts` กรองตาม CareAssignment (ยืนยันจากโค้ดจริงแล้ว — least-privilege pattern เดียวกับ `patient-summary.ts`, 404 เดียวกันทั้ง "ไม่มี trace" และ "trace ของคนอื่น" กัน enumeration)
- **Related Evidence:** EC-000
- **Test:** assertion ใน `test:clinician-authorization` PASS 2026-09-22 (ตรวจโค้ดจริงแล้วว่ามี assertion นี้อยู่จริง — บรรทัด 216)
- **Evidence artifact:** `docs/evidence/RISK-002/` — _TBD_
- **Residual Risk:** _รอ Tor_ (ข้อเสนอสำหรับพิจารณา: UI ที่เพิ่งต่อใหม่ใน `dashboard.tsx` ยังไม่ผ่าน manual test — โค้ด API ผ่านแล้ว แต่ end-to-end ผ่านตาแพทย์จริงยังไม่มี)
- **Decision:** Decided by: _รอ Tor_ · Date: _—_ · Outcome: _—_ · Re-review by: _—_
- **Status:** open
- **Status history:** _(ยังไม่มีการเปลี่ยนสถานะ — API test ผ่านแล้ว 2026-09-22, UI เพิ่งต่อรอ verify)_

### RISK-003: Risk Engine / Companion / Auditor (Anthropic live path) ยังไม่เคยทดสอบครบ
- **Possible Outcome:** พฤติกรรมของ LLM risk engine / companion / auditor ต่างจากที่ assertion คาดไว้ (ทั้ง false negative และ false positive)
- **Risk / Impact:** false negative อาจพลาดสัญญาณอันตราย; false positive มีต้นทุนจริงเช่นกัน — alert fatigue, review ที่ไม่จำเป็น, ความเชื่อมั่นของผู้ใช้ลดลง
- **Fail-safe Direction** (DRAFT ตามข้อเสนอของ Tor — รอยืนยัน)

  | Scenario | ให้ผิดไปทาง | ต้นทุนของทิศตรงข้าม |
  |---|---|---|
  | Explicit / imminent crisis | เอนไปทาง **escalation** (route ไป `review`) | พลาดสัญญาณ = ร้ายแรงและย้อนกลับไม่ได้ |
  | Ambiguous distress | เอนไปทาง **review / clarification** | escalate อัตโนมัติ → alert fatigue; ปล่อยผ่าน → พลาดสัญญาณ |
  | Low-risk uncertainty | **ไม่ escalate อัตโนมัติ** | escalate เกิน → review ที่ไม่จำเป็น, ความเชื่อมั่นลด |

  > โค้ดจริงใน `test-security-pipeline.ts` มี test case ที่ตรงกับ scenario นี้พอดี: ข้อความที่มีทั้ง prompt-injection pattern และสัญญาณวิกฤตรวมกัน ต้อง route เป็น `review` เท่านั้น (ห้าม `block`) — สอดคล้องกับ INV-01 (crisis ชนะ security block) แต่ **ยังไม่เคยรันจริงเพราะไม่มี `ANTHROPIC_API_KEY`** ทั้งใน sandbox และยังไม่มีรายงานว่า Tor รันแล้ว
  > เส้นแบ่งระหว่าง "explicit/imminent" กับ "ambiguous" เป็นคำถามทางคลินิก ต้องได้คำตอบจาก W1 — ห้ามกำหนดเองฝั่งวิศวกรรมแล้วถือเป็นข้อสรุป

- **Boundary:** crisis signal ชนะ security block เสมอ (INV-01, implement แล้วใน `orchestrator.ts` ตาม decision log)
- **Mitigation (ที่มีอยู่):** detector-only assertions ผ่านแล้ว (algorithm, ไม่ต้องใช้ API key)
- **Related Evidence:** EC-000, EC-001 (threshold ที่ใช้ตัดสิน crisis มาจาก 8Q/9Q ที่ยัง awaiting clinician review)
- **Test:** `npm run test:security` ส่วน orchestrator (3 cases ที่ต้องเรียก Anthropic จริง) — ยืนยันซ้ำโดย `PHASE1_FREEZE_RECONCILIATION_REVIEW.md`: `NOT RUN / NOT VERIFIED`
- **Evidence artifact:** `docs/evidence/RISK-003/` — แนบ `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` (2026-09-22) เป็นหลักฐานของ Human Decision นี้
- **Residual Risk:** Anthropic live behavior ของ Risk Engine/Companion/Auditor (การตัดสินใจจริงเมื่อเจอ input จริง ไม่ใช่แค่ detector algorithm) ไม่เคยถูกพิสูจน์เลย — เสี่ยงทั้ง false negative (พลาดสัญญาณวิกฤต) และ false positive โดยเฉพาะ scenario ที่ crisis signal ปนกับ attack pattern (ดู scenario table ด้านบน) — Tor ประเมินว่ายอมรับได้เฉพาะขอบเขต demo ที่ไม่มีผู้ป่วยจริงใช้งาน
- **Decision:** Decided by: **Tor** · Date: **2026-09-22** · Outcome: **accepted — ขอบเขต MVP/Portfolio Demo เท่านั้น ห้ามอ้าง readiness สำหรับ clinical deployment** · Re-review by: **ก่อนอ้าง clinical deployment readiness ใดๆ หรือก่อนมีผู้ป่วยจริงใช้งาน ต้องรัน `test:security` เต็มรูปแบบด้วย `ANTHROPIC_API_KEY` จริงก่อนเสมอ**
- **Status:** accepted
- **Status history:** 2026-09-22: `open` → `accepted`, โดย Tor, เหตุผล: "ยอมรับ residual risk นี้สำหรับ MVP/Portfolio Demo เท่านั้น" ตาม `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` § Human Decision ที่ต้องคงไว้ในเอกสาร

### RISK-004: Clinical Summary read-deadline "15 วินาที" ที่อ้างถึงในเอกสาร แต่ตรวจไม่พบในโค้ด
- **Possible Outcome:** `PHASE_2_PLAN.md` (W5) และโน้ตผลทดสอบอ้างว่าเพิ่ม deadline อ่าน/ถอดรหัสข้อมูล Clinical Summary เป็น 15 วินาทีเพื่อให้ `test:fallback-integration` ผ่าน — **แต่ Claude ตรวจ `lib/fallback/deadline.ts` (default `3000ms`) และทุกจุดที่เรียก `withDeadline()` ใน `pages/api/doctor/patient-summary.ts` แล้วไม่พบค่า 15000 ที่ไหนเลยในโค้ดที่ส่งมา** ถ้าโค้ด production จริงยังใช้ default 3s ต่างจากที่บันทึกไว้ว่า "แก้เป็น 15s" entry นี้คือ documentation drift ไม่ใช่ risk ด้าน timing จริง — แต่ถ้าโค้ดที่ส่งมาเป็นคนละ commit กับที่รัน `test:fallback-integration` ก็คือยังไม่รู้ deadline จริงที่ใช้งานอยู่คือค่าไหน
- **Risk / Impact:** ไม่รู้ค่า deadline จริงที่ใช้งานอยู่ = ประเมิน false-positive fallback (ตอนข้อมูลผู้ป่วยสะสมมาก) ไม่ได้เลย และ Evidence Chain มีข้อมูลที่ขัดกับโค้ดจริง
- **Fail-safe Direction**

  | Scenario | ให้ผิดไปทาง | ต้นทุนของทิศตรงข้าม |
  |---|---|---|
  | ไม่แน่ใจว่า deadline จริงคือค่าไหน | ห้ามถือว่า mitigation นี้ "ทำแล้ว" จนกว่าจะยืนยันกับโค้ด/commit จริง | ถ้าเชื่อเอกสารไปก่อนแล้วโค้ดจริงยังเป็น 3s = ประเมิน risk ผิดทั้งชุด |

- **Boundary:** ห้ามให้ data-read ของ 1 feature ทำให้ critical path (Detector+Risk → Orchestrator → Companion → Auditor) ช้าลงแบบไม่มีขอบเขต (หลักการนี้ถูกต้องไม่ว่าค่าจะเป็น 3s หรือ 15s)
- **Mitigation:** มี `withDeadline()` อยู่แล้วเป็นกลไก แต่ **ค่าที่ใช้งานจริงต้องยืนยันกับ Tor** — ถ้าตั้งใจเปลี่ยนเป็น 15s ต้องแก้โค้ดจริงและมี EC entry อ้างถึง commit ที่แก้ ไม่ใช่แค่บันทึกไว้ในแผน
- **Related Evidence:** EC-000
- **Test:** `test:fallback-integration` PASS 2026-09-22 — แต่ผ่านด้วย deadline เท่าไหร่กันแน่ยังไม่ยืนยัน (ไม่มี assertion เฉพาะเรื่องค่า deadline ในสิ่งที่ตรวจได้จากโค้ดที่ส่งมา)
- **การยืนยันซ้ำ (2026-09-22):** `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` ตรวจ zip คนละไฟล์ (`hydra-mesh-phase1-freeze-candidate(1).zip`) แล้วสรุปตรงกัน — ไม่พบ deadline 15 วินาที เกณฑ์ผ่านที่ระบุไว้: ต้องมี `CLINICAL_DATA_READ_DEADLINE_MS = 15_000` ใน `patient-summary.ts` ปรากฏ ≥5 จุด (1 ประกาศ + 4 จุดใช้กับ conversationHistory/nineQHistory/eightQHistory/reviewQueue) และ **auth deadline ต้องไม่ถูกขยายตาม** — `CHECK_PHASE1_FREEZE.sh` ตรวจข้อนี้ให้อัตโนมัติได้ถ้ารันกับ tag จริง
- **Evidence artifact:** `docs/evidence/RISK-004/` — แนบ `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` + ผลรัน `CHECK_PHASE1_FREEZE.sh`
- **Residual Risk:** _รอ Tor_
- **Decision:** Decided by: _รอ Tor_ · Date: _—_ · Outcome: _—_ · Re-review by: _—_
- **Status:** open (ยืนยันซ้ำแล้วว่ายังไม่แก้ — 2 แหล่งอิสระตรงกัน)
- **Status history:** 2026-09-22: สร้าง entry ใหม่ โดย Claude ตาม discrepancy ที่พบระหว่าง `PHASE_2_PLAN.md`/EC-000 กับ `lib/fallback/deadline.ts` จริง; 2026-09-22 (ต่อมา): ยืนยันซ้ำโดย `PHASE1_FREEZE_RECONCILIATION_REVIEW.md` (REC-001), สถานะยังคง `open`

### RISK-005: Gemini model version — config ไม่ตรงกับที่บันทึกว่า live-verified
- **Possible Outcome:** `.env.example`/โค้ด default ชี้ไป `gemini-3.7-flash` แต่บันทึกผลทดสอบ (`EC-000`) ระบุว่า live-verify ผ่านด้วย `Gemini 3.8 Flash` — ถ้าไม่ตรงกันจริง production อาจรันโมเดลที่ไม่เคย live-verify เลย
- **Risk / Impact:** claim "Gemini Clinical Summary Integration: LIVE VERIFIED" อาจไม่ครอบคลุมโมเดลที่ deploy จริง — กระทบความน่าเชื่อถือของ evidence ทั้งสาย ไม่ใช่แค่ของ feature นี้
- **Fail-safe Direction**

  | Scenario | ให้ผิดไปทาง | ต้นทุนของทิศตรงข้าม |
  |---|---|---|
  | ไม่แน่ใจว่า config ตรงกับที่ทดสอบ | ห้ามถือว่า live-verified จนกว่าจะยืนยัน | ถ้าเชื่อไปก่อนแล้วผิดจริง = evidence chain ทั้งสายไม่น่าเชื่อถือ (บทเรียนเดียวกับที่ decision log ของโปรเจกต์เคยบันทึกไว้ซ้ำหลายรอบ: "รายงานว่าแก้แล้ว" กับ "ไฟล์จริงถูกแก้" คนละเรื่องกัน) |

- **Boundary:** Version ที่บันทึกใน Evidence Chain ต้องตรงกับโมเดลที่ config จริงใช้งาน
- **Mitigation:** _ยังไม่มี_ — ต้องให้ Tor ตรวจว่า `.env.local` ตอนรัน live test ตั้ง `GEMINI_MODEL=gemini-3.8-flash` override ไว้หรือไม่ ถ้าใช่ ให้อัปเดต `.env.example`/`DEFAULT_GEMINI_MODEL` ให้ตรงกัน ถ้าไม่ใช่ ต้องรัน live test ซ้ำด้วย model ที่ config จริงชี้ไป
- **Related Evidence:** EC-000
- **Test:** _ยังไม่มี_ — ไม่ใช่สิ่งที่ automated test ตรวจจับได้เอง (เป็น config drift) ต้องเป็น manual verification
- **Evidence artifact:** `docs/evidence/RISK-005/` — _TBD_
- **Residual Risk:** _รอ Tor_
- **Decision:** Decided by: _รอ Tor_ · Date: _—_ · Outcome: _—_ · Re-review by: _—_
- **Status:** open (ใหม่ — Claude พบระหว่างเทียบ `.env.example` กับ `EC-000` ตอน reconcile evidence รอบนี้)
- **Status history:** 2026-09-22: สร้าง entry ใหม่ โดย Claude

<!-- Template สำหรับ risk ถัดไป: คัดลอกบล็อกด้านล่าง

### RISK-XXX: <ชื่อสั้น>
- **Possible Outcome:** <อะไรอาจเกิดขึ้น>
- **Risk / Impact:** <ใครได้รับผลกระทบ รุนแรงแค่ไหน — รวมต้นทุนของ false positive ถ้ามี>
- **Fail-safe Direction**

  | Scenario | ให้ผิดไปทาง | ต้นทุนของทิศตรงข้าม |
  |---|---|---|
  | <สถานการณ์> | <ทิศทาง> | <ต้นทุน> |

- **Boundary:** <ขอบเขตที่ระบบต้องไม่ข้าม>
- **Mitigation:** <มาตรการ>
- **Related Evidence:** <EC-XXX, ... หรือ none + เหตุผล>
- **Test:** <test ID>
- **Evidence artifact:** <docs/evidence/RISK-XXX/... path>
- **Residual Risk:** <ความเสี่ยงที่ยังเหลือ — มนุษย์กรอก>
- **Decision:** Decided by: <ใคร> · Date: <YYYY-MM-DD> · Outcome: <accepted | closed (eliminated | N/A)> · Re-review by: <วันที่/เงื่อนไข — บังคับถ้า accepted>
- **Status:** open | mitigated | accepted | closed
- **Status history:** <YYYY-MM-DD: จาก → ไป, โดยใคร, เหตุผล>
-->

---

## Schema changelog

| Schema | การเปลี่ยนแปลง |
|---|---|
| v0.1 | โครงแรก: outcome → impact → boundary → mitigation → test → evidence → residual → decision |
| v0.2 | `Fail-safe Direction` เป็นตาราง scenario-specific พร้อมต้นทุนทิศตรงข้าม; นิยาม `accepted` กับ `closed` ให้ต่างกันพร้อมเงื่อนไขที่ต้องมี; เพิ่ม `Related Evidence`, `Evidence artifact`, `Status history`; `Human Decision` เปลี่ยนเป็นบล็อก `Decision`; เติมผลทดสอบจริงของ RISK-001/002/003 (2026-09-22) และเพิ่ม RISK-004 (15s deadline patch), RISK-005 (Gemini model version mismatch) ที่พบระหว่าง reconcile evidence รอบนี้ |

> เปลี่ยน schema ครั้งต่อไปให้เพิ่มแถวที่นี่ และระบุวิธี migrate entry เก่า
