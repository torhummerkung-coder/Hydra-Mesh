# ข้อเสนอพิจารณา G-02 สำหรับเดโม local ด้วยข้อมูลจำลอง

วันที่จัดทำ: 2026-10-05 · ผู้จัดทำ: Codex

**สถานะ: PROPOSED — ยังไม่มีการอนุมัติ ไม่มีลายเซ็น และไม่มีผลเปลี่ยนสถานะความเสี่ยง**

ผู้มีอำนาจตัดสิน: นายศุภกร โคตะมา — เจ้าของโครงการและผู้ออกแบบระบบ / Project Owner & System Architect

## สิ่งที่เสนอให้พิจารณา และเหตุผล

ยอมรับข้อจำกัดด้านความพร้อมใช้งานของ Gemini และการระบุสาเหตุ failure ในอดีต เฉพาะเดโม local ที่ใช้บัญชีและข้อมูลจำลอง ภายใต้ขอบเขต MVP/Portfolio เดิม เมื่อ provider ไม่พร้อม ระบบต้องแสดงว่า summary unavailable พร้อมข้อมูลต้นทางตามสิทธิ์และคำอธิบายข้อจำกัด

การสอบสวนพบว่า key เคยมีอักขระควบคุมจนสร้าง header ไม่ผ่าน หลังแก้รูปแบบแล้วมีทั้งคำขอที่สำเร็จ HTTP 200 / STOP และคำขอที่ตอบ HTTP 503 / UNAVAILABLE ตัว collector รุ่นใหม่เก็บเหตุผลและ exit 1 ได้ตามจริง ขณะที่ชุดตรวจ non-live ล่าสุดผ่านครบ 16 gates รวม typecheck/build และ source ก่อน/หลังตรงกัน

สิ่งที่ยังรับรองไม่ได้คือความพร้อมใช้งานของ provider ในทุกครั้ง สาเหตุภายใน Google และสาเหตุของ failed collector ครั้งเก่า เพราะ metadata ของครั้งเก่าถูกทิ้งไป การรันใหม่ไม่สามารถสร้างหลักฐานย้อนหลังนั้นกลับมาได้ จึงเสนอให้เจ้าของพิจารณาว่าเดโมข้อมูลจำลองดำเนินต่อได้ภายใต้ข้อจำกัดเหล่านี้หรือไม่ ผลทดสอบไม่ได้อนุมัติ residual risk แทนมนุษย์

## หลักฐานและขอบเขต

| หลักฐาน | ผลจริง | ขอบเขต |
|---|---|---|
| EC-011 / HEAD 0ed5f52 | collector-env: 200/STOP/3 PASS; direct-env: 503/exit 1 | สอง standalone calls ไม่ใช่ full collector |
| EC-012 / HEAD 3f4b5cf | 14 gates PASS; Gemini 503 FAIL/exit 1 พร้อม diagnostics | typecheck/build ไม่ถึง และไม่มี sourceAfter ในรอบนี้ |
| EC-013 / HEAD b51d55d | 16 non-live gates PASS; source clean/stable; typecheck/build PASS | ไม่มี live generation ในรอบนี้ |
| Mocked endpoint regression | คืนเฉพาะข้อมูลของผู้ป่วยที่ได้รับมอบหมาย ไม่มี AI text/raw error; ปฏิเสธเคสที่ไม่ได้รับมอบหมาย | ไม่ใช่ live UI 503 หรือ clinical validation |

รายละเอียดและไฟล์ต้นฉบับอยู่ใน evidence/w0/2026-10-05/HYDRA_W0_G02_INVESTIGATION.md และ Evidence Chain ของ repo การเปลี่ยน 3f4b5cf → b51d55d แตะเฉพาะเอกสาร/หลักฐาน 5 paths; ข้อเสนอและหลักฐานรอบนี้ก็ไม่แก้ runtime, agent, endpoint, config หรือ dependencies

## เงื่อนไขที่เสนอ

- ใช้เฉพาะเดโม local ด้วยข้อมูลจำลอง ไม่ขยายไปยังผู้ป่วยจริง ระบบสาธารณะ หรือการตัดสินใจทางคลินิก
- เก็บ live FAIL และ historical FAIL ตามจริง ไม่อ้างว่าผ่าน 17 live gates และไม่สรุปว่าสาเหตุครั้งเก่าเป็น 503 หรือ key format โดยไม่มีหลักฐาน
- คง model choice, auth/assignment/revocation boundaries, unavailable/source-data fallback, disclaimer และ human review ตามเดิม ไม่เพิ่ม retry หรือเปลี่ยน model เพื่อทำให้ผลผ่าน
- **คง G-02, RISK-001 และ RISK-007 OPEN** ตามข้อกำหนดเดิม ข้อเสนอไม่ยอมรับ defect จริงด้าน privacy, authorization หรือ safety และไม่รับรองความถูกต้องของทุก summary หรือ uptime ของ provider
- คง G-01/RISK-003 OPEN และ G-06 limited acceptance ตามคำตัดสินเดิม ไม่อนุมัติ G-03/G-04/G-05, การปิด W0, baseline/tag/freeze หรือ main merge
- เก็บ safe metadata สำหรับ failure ถัดไป และทบทวนเมื่อ failure เกิดซ้ำ, source/model/intended use เปลี่ยน, fallback หรือ boundary ผิดข้อกำหนด หรือก่อนใช้ข้อมูลจริง/เปิดภายนอก งานติดตามเดิมของ RISK-001/007 คงอยู่

## ข้อความตัดสินที่เสนอ — ยังไม่มีผลจนเจ้าของยืนยัน

> ผมอนุมัติยอมรับข้อจำกัด G-02 เฉพาะเดโม local ด้วยข้อมูลจำลองตามข้อเสนอฉบับนี้ โดยคง G-02/RISK-001/RISK-007 OPEN เก็บผล failed collector ตามจริง และไม่อ้างว่าผ่าน 17 live gates หรือยืนยันสาเหตุของ failure ครั้งเก่า

Human Decision: **PENDING** · วันที่อนุมัติ: ยังไม่มี · ไม่มีการใช้ signature asset ในข้อเสนอนี้


## G-02 temporary human acceptance — 2026-10-05 19:35:51 Asia/Bangkok

Human Decision **HD-W0-G02-TEMP-2026-10-05**: นายศุภกร โคตะมา — Project Owner & System Architect — explicitly approved the explained G-02 proposal within its existing local synthetic MVP/Portfolio demo scope, **temporarily and revocably**. Accepted limitations: intermittent Gemini summary availability and insufficient historical failure metadata. Full chat-authorized record: `docs/decisions/W0_G02_TEMPORARY_ACCEPTANCE_2026-10-05.md` (repository-root path).

The owner may reconsider the model, provider/affiliation or API-key access readiness and withdraw this temporary approval at that review to continue according to the Roadmap. No new model/provider choice or API-credit purchase/access request is authorized by this record. Record any withdrawal/superseding decision against HD-W0-G02-TEMP-2026-10-05; retain prior history and re-verify the actual model/provider/source before claiming verified behavior.

**G-02 / RISK-001 / RISK-007 and W0 OPEN.** Acceptance applies only to these demo limitations; existing risks and required follow-up stay open. Preserve live/historical FAIL, unavailable/assigned-source fallback, disclaimer and human review. No 17-live-gate PASS, uptime/clinical correctness guarantee or acceptance of actual privacy/auth/safety defects. G-01/G-06 decisions and other gaps unchanged; no W0 closure/baseline/tag/freeze/main merge. Re-review on recurring failures, source/model/intended-use change, boundary failure or before real-data/public use. Earlier PENDING statements remain historical and are supplemented by this explicit decision; no new test run is claimed.
