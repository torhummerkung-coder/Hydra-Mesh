# ข้อเสนอ G-03 — ข้อจำกัด timeout สำหรับเดโม local

วันที่จัดทำ: 2026-10-05
**สถานะ: PROPOSED — ยังไม่ได้รับการอนุมัติ ไม่มีลายเซ็น และไม่เปลี่ยนสถานะความเสี่ยง**
ผู้มีอำนาจพิจารณา: นายศุภกร โคตะมา — เจ้าของโครงการและผู้ออกแบบระบบ / Project Owner & System Architect

## ข้อจำกัดที่เสนอให้พิจารณา

1. **งานยังทำต่อหลัง timeout ได้:** endpoint หยุดรอและตอบกลับ แต่ underlying query ไม่ถูกยกเลิก ในการทดสอบ conversation/9Q/8Q ยังเริ่ม lookup กุญแจถอดรหัสหลังตอบกลับ การตอบ timeout จึงไม่ใช่หลักฐานว่างานอ่าน/ถอดรหัสหยุดแล้ว
2. **ขณะอ่านข้อมูลช้า อาจไม่มีทั้ง source data และ summary:** clinical-read timeout คืน generic HTTP500 ต่างจาก Gemini 503 หลังอ่านข้อมูลสำเร็จที่มี source fallback ผู้สาธิตต้องยอมรับว่าการเปิด summary ครั้งนั้นอาจไม่สำเร็จ และห้ามแสดง/อ้างว่าได้ summary ใหม่สำเร็จ
3. **ยังไม่มีหลักฐานกำหนดเพดานงานค้างหรือประสิทธิภาพเมื่อเรียกซ้ำ/พร้อมกัน:** 9 sequential synthetic cases ไม่ได้ทดสอบโหลด การสะสม CPU/memory/DB work หรือรับรอง SLA ของ request ทั้งเส้นทาง ไม่มี technical concurrency/admission limit เพิ่มจากข้อเสนอนี้

## เหตุผลที่เสนอให้เจ้าของพิจารณา

EC-015 บน c286c18 ผ่านครบ 9 กรณี โดย auth timeout ไม่เปิดทางให้ clinical reads ผู้ป่วยที่ไม่ได้รับมอบหมายถูกปฏิเสธ และ clinical-read timeout ไม่ส่ง source/AI data หรือ raw injected error กลับมา ไม่มี response ซ้ำหรือ unhandled rejection ในช่วงที่ตรวจ Source ก่อน/หลัง clean และตรงกัน จึงมีหลักฐานพฤติกรรม timeout ที่เคยขาดแล้ว

แต่ cancellation ยังไม่ถูก implement และผลกระทบของงานค้างภายใต้โหลดจริงยังไม่ถูกวัด การตัดสินใจว่าเดโม local ใช้ข้อมูลจำลองภายใต้ข้อจำกัดเหล่านี้ดำเนินต่อได้หรือไม่ เป็นการตัดสิน intended use/residual risk ของเจ้าของ ไม่เกิดอัตโนมัติจาก test PASS

## ขอบเขตและเงื่อนไขที่เสนอ

- เฉพาะ local synthetic MVP/Portfolio demo ที่ผู้สาธิตควบคุมและใช้งานโหลดต่ำ ไม่ขยายเป็นบริการหลายผู้ใช้ ข้อมูลผู้ป่วยจริง ระบบสาธารณะ หรือการตัดสินใจทางคลินิก
- ในขั้นตอนสาธิต ให้รอการเปิดข้อมูลแต่ละครั้งจบก่อนเริ่มครั้งใหม่ ไม่กดเรียกซ้ำ/สลับเคสรัวเมื่อ timeout และหยุดการสาธิตส่วนที่เกิด timeout ซ้ำเพื่อตรวจงานค้างก่อนดำเนินต่อ เงื่อนไขนี้เป็นวิธีใช้งานโดยผู้สาธิต ไม่ใช่ concurrency cap ที่ระบบ enforce แล้ว
- คง auth/assignment/revocation และ fail-closed boundaries ตามเดิม ไม่ใช้ timeout เป็นเหตุ bypass สิทธิ์ ไม่เพิ่ม retry หรือขยาย deadline เพื่อซ่อน failure
- ไม่ใช้ข้ออนุมัตินี้อ้างว่า query/decrypt ถูกยกเลิก มี source fallback สำหรับ read timeout หรือผ่าน UI/SLA/load/cancellation verification แล้ว เก็บสถานะ failure และข้อจำกัดตามจริง
- **คง G-03/RISK-008 และ W0 OPEN** การยอมรับจะครอบคลุมเฉพาะข้อจำกัดด้าน availability/งานค้างของเดโม ไม่ยอมรับ defect จริงด้าน authorization/privacy/safety ผลนี้ไม่ได้ทดสอบ in-flight revocation; ถ้าพบ defect ต้องแก้ก่อนดำเนินส่วนที่ได้รับผลกระทบ
- รักษางานติดตามตาม Roadmap/RISK-008: ตรวจทาง cancellation/งานที่หยุดไม่ได้, repeated/concurrent resource use และขอบเขต UI ตามขั้นที่เกี่ยวข้องก่อนขยาย intended use ไม่อ้างว่างานเหล่านี้ผ่านแล้ว
- ทบทวนเมื่อ timeout เกิดซ้ำหรือมีงานค้าง/ทรัพยากรเพิ่ม, source/deadline/data volume/รูปแบบการเรียกเปลี่ยน หรือก่อนเปิดหลายผู้ใช้/ข้อมูลจริง/ภายนอก ข้ออนุมัติจำกัดตามเงื่อนไขที่เจ้าของตกลงและถอน/แทนที่ได้
- G-01/G-02/G-06 และความเสี่ยงเดิมคงตามคำตัดสินนั้น ไม่อนุมัติ G-04/G-05, การปิด W0, baseline/tag/freeze หรือ main merge

## ข้อความตัดสินที่เสนอ — ยังไม่มีผลจนเจ้าของยืนยัน

> ผมยอมรับข้อจำกัด G-03 เฉพาะเดโม local ด้วยข้อมูลจำลองและวิธีใช้งานโหลดต่ำตามข้อเสนอ โดยรับทราบว่า timeout ไม่ได้ยกเลิกงานเบื้องหลัง และ clinical-read timeout อาจไม่มี source/summary ให้แสดง พร้อมคง G-03/RISK-008 และ W0 OPEN และงานติดตามตาม Roadmap

Human Decision: **PENDING** · วันที่อนุมัติ: ยังไม่มี · ไม่มีการใช้ signature asset
หลักฐาน: EC-015 / evidence/w0/2026-10-05/HYDRA_W0_G03_INVESTIGATION.md และ JSON ต้นฉบับที่อ้างในเอกสารนั้น


## G-03 temporary owner acceptance with mandatory Phase 2 correction — 2026-10-05 21:55:43 Asia/Bangkok

Human Decision **HD-W0-G03-TEMP-2026-10-05**: นายศุภกร โคตะมา — Project Owner & System Architect — approved the explained G-03 proposal for controlled local synthetic demo only. Demo/testing may continue; this is **not certification that the system is ready for real-world use**. Preserve low-load operator conditions, authorization/assignment/revocation boundaries and truthful read-timeout failure. No source/summary on clinical-read timeout is claimed; timeout does not cancel underlying work.

**Mandatory correction within Phase 2:** use this period to diagnose, fix and verify G-03 code/work-control behavior under the existing Phase 2 scope and procedures. Other work may proceed first, but this item is not indefinitely deferred. The temporary acceptance **ends with Phase 2 closure and must not extend beyond it**. Phase 2 must not be declared closed on the strength of this exception while G-03 correction/verification remains unfinished; record acceptance expiry and the actual verified disposition at closeout. No calendar deadline was supplied; preserve the event-bound Phase 2 deadline without inventing a date.

Owner distinguishes G-03 code debugging from the Agent-model/provider-access limitation. Current source and controlled results show non-cancellation in code; the exact final remedy remains to be selected and tested. Do not attribute this issue to model quality or solve the recorded code issue merely by changing a model. G-02 temporary model/provider/API-access decision remains separate and unchanged.

**G-03/RISK-008 and W0 OPEN.** Nine current-phone synthetic checks are retained as bounded evidence, not cancellation/load/UI/in-flight-revocation or production readiness proof. No actual authorization/privacy/safety defect waiver, new runtime change, additional test/API run, signature image, W0 closure, baseline/tag/freeze/main merge. Prior PENDING G-03 statements are historical and supplemented by this explicit owner decision; full conditions and verbatim authorization: `docs/decisions/W0_G03_TEMPORARY_ACCEPTANCE_2026-10-05.md`.
