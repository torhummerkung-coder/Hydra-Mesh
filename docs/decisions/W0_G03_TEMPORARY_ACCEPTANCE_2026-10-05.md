# G-03 — การอนุมัติชั่วคราว พร้อมข้อผูกพันแก้ไขภายใน Phase 2

Human Decision: **HD-W0-G03-TEMP-2026-10-05**
วันที่และเวลาของคำอนุมัติ: **2026-10-05 21:55:43 Asia/Bangkok**
ผู้อนุมัติ: **นายศุภกร โคตะมา — เจ้าของโครงการและผู้ออกแบบระบบ / Project Owner & System Architect**
สถานะคำตัดสิน: **อนุมัติชั่วคราวภายใต้เงื่อนไข** · สถานะงาน: **G-03/RISK-008 และ W0 OPEN**
หลักฐานการอนุมัติ: ข้อความตรงจากเจ้าของในบทสนทนา ไม่ใช่การลงลายเซ็นรูปภาพหรือการแก้โดย AI ให้กลายเป็นคำอนุมัติ

## ข้อความเจ้าของ — เก็บตามต้นฉบับ

> ผมอนุมัติคำขอของข้อเสนอนี้ คือ demo จะยังใบ้ข้อมูลจำลองในการทดสอบสาทิตได้ แต่จะไม่ถือว่าเป็นการรับรองว่าระบบใช้งานได้จริง และภายใต้การอนุมัตินี้ ระหว่างที่คำอนุมัตินี้ดำเนินอยู่ จะต้องดำเนินการแก้ไขให้ระบบมาใช้งานได้จริง ภายในกรอบเวลาทำงานของ pheas 2 ไม่เกินเวลานี้ คำอนุมัตินะต้องถูกยกเลิกพร้อมกับปิดงานของ pheas 2 และข้อนี้ แตกต่างจาก กรณีของ Agent model ซึ่งมีความเป็นไปได้ที่จะเกิดจาก code debug ไม่น่าจะใช่ข้อผิดพลาดของmodel จึงต้อง focus แก้ไขให้เรียบร้อย แต่ยังอนุญาติให้สามารถ ดำเนินงานอื่นต่อก่อนได้แล้วจึงกลับมาแก้ไขให้ถูกต้องตามระเบียบเดิม

## ความหมายและขอบเขตที่มีผล

1. ดำเนินเดโม local ด้วยข้อมูลจำลองตามข้อเสนอที่อธิบายแล้วได้ ภายใต้การใช้งานโหลดต่ำโดยผู้สาธิตควบคุม ไม่ใช่การรับรองว่าระบบพร้อมใช้งานจริง ไม่ขยายเป็นข้อมูลผู้ป่วยจริง บริการสาธารณะ หลายผู้ใช้ หรือการตัดสินใจทางคลินิก
2. เจ้าของรับทราบว่า timeout หยุดรอแต่ไม่ยกเลิกงานเบื้องหลัง, clinical-read timeout อาจไม่มี source/summary ให้แสดง และยังไม่มีหลักฐานเพดานงานค้างจากการเรียกซ้ำ/พร้อมกัน ให้รอการเปิดข้อมูลครั้งหนึ่งจบก่อนเริ่มครั้งใหม่ ไม่เรียกซ้ำรัวเมื่อ timeout และหยุดส่วนที่เกิด timeout ซ้ำเพื่อตรวจงานค้าง วิธีใช้งานนี้ไม่ใช่ concurrency cap ที่ระบบบังคับแล้ว
3. ระหว่างคำอนุมัติมีผล **ต้องดำเนินการวิเคราะห์ แก้ไขและตรวจยืนยัน G-03 ภายในกรอบงาน Phase 2 ไม่เกินการปิด Phase 2** งานอื่นดำเนินต่อก่อนได้ แต่ต้องกลับมาแก้ตามระเบียบเดิม ไม่ใช่ defer โดยไม่มีกำหนด
4. **คำอนุมัติชั่วคราวสิ้นสุดและต้องถูกบันทึกว่ายกเลิกพร้อมการปิด Phase 2** ห้ามใช้คำอนุมัตินี้เป็นเหตุปิด Phase 2 ถ้างานแก้ไข/ตรวจยืนยัน G-03 ยังไม่ครบ ต้องมีหลักฐานและ disposition จริงก่อนปิดงาน ไม่ต่ออายุโดยปริยาย
5. แผนเดิมยังไม่ได้กำหนดวันสิ้นสุด Phase 2 และเจ้าของไม่ได้ระบุวันปฏิทินในข้อความนี้ จึงผูก deadline กับ Phase 2 closeout โดยไม่สร้างวันขึ้นเอง หากมีการกำหนดกำหนดการ Phase 2 ภายหลัง ต้องผูกงานนี้ไว้ภายในกำหนดการนั้น
6. เจ้าของแยกกรณีนี้จาก Agent model และให้ focus code debugging ปัจจุบัน source/controlled evidence ยืนยันว่า deadline ไม่ยกเลิก underlying work; ไม่มีหลักฐานว่า model ทำให้ปัญหานี้เกิด และยังไม่ได้ยืนยันวิธีแก้สุดท้าย การเปลี่ยน model อย่างเดียวไม่ถือว่าปิด G-03
7. คง auth/assignment/revocation และ fail-closed เดิม ไม่ bypass สิทธิ์ ไม่เพิ่ม retry/ขยาย deadlineเพื่อซ่อน failure; ไม่ยอมรับ defect จริงด้าน authorization/privacy/safety ถ้าพบต้องแก้ก่อนดำเนินส่วนที่ได้รับผลกระทบ คำอนุมัติไม่รับรอง in-flight revocation ที่ยังไม่ได้ทดสอบ

## งานแก้ไขที่ผูกกับ Phase 2 — ยังไม่สำเร็จ

Owner: นายศุภกร โคตะมา / Project Owner & System Architect · ผูกงานติดตาม W3/W5/W7 ตามแผนเดิม · ใช้ workflow แก้โค้ด/ทดสอบ/Evidence Chain เดิม

- ตรวจทั้งเส้นทาง deadline, database read/decrypt continuation และงานที่ยังเดินต่อหลังตอบ เพื่อเลือกวิธีแก้ที่ทำได้จริงใน stack ปัจจุบัน ไม่สมมติว่าครอบ Promise.race หรือเพิ่มเวลาเท่ากับ cancellation
- Implement และทดสอบการหยุดขั้นตอนต่อเนื่อง/ยกเลิกงานที่รองรับ หรือวิธีควบคุมงานที่ยกเลิกไม่ได้ พร้อมแสดงขอบเขตที่พิสูจน์ได้ของทางแก้จริง การยกเลิกและการจำกัดงานเป็นทางเลือกออกแบบที่ยังต้องตรวจ ไม่ใช่ implementation ที่ผ่านแล้ว
- ทดสอบ slow read, late completion/rejection, repeated/concurrent requests ภายใต้ขอบเขตใช้งานที่กำหนด วัดงานค้าง/ทรัพยากร และทดสอบ authorization/assignment/revocation ตามทางที่แก้ ไม่อ้างตัวเลข load/SLA ที่ยังไม่ทดสอบ
- รัน regression ที่เกี่ยวข้อง บันทึก source/commit/test/ผลจริงและ residual risk กลับสู่ EC/Risk Register ให้เจ้าของตรวจ disposition ตามระเบียบเดิม ก่อน Phase 2 closeout; รายการนี้ไม่แทน exit criteria อื่นของ Phase 2
- ก่อนปิด Phase 2 ตรวจว่างานแก้/verification ครบและบันทึกการยกเลิก HD-W0-G03-TEMP-2026-10-05 คำอนุมัติสิ้นสุดไม่ได้ทำให้ risk ปิดอัตโนมัติ; ห้ามบันทึก acceptance นี้เป็น production approval หรือใช้ชดเชยหลักฐานที่ขาด

## หลักฐานและข้อจำกัด

EC-015: original phone JSON `evidence/w0/2026-10-05/hydra-w0-g03-c286c18-2026-10-05.json`, 9386 bytes, SHA256 `76264914135efdd759318e8d3dd5b9fbe476c7237b5cc9d436d1239d7811ff89`; nine PASS / zero FAIL, source stable on c286c18, no live provider call. Tests use real handler/stores with synthetic SQLite and injected holds before query execution. No HTTP/UI, in-engine lock/load benchmark, full-decryption completion, cancellation or in-flight-revocation proof. Investigation: `evidence/w0/2026-10-05/HYDRA_W0_G03_INVESTIGATION.md`.

The earlier proposal at `docs/decisions/W0_G03_LOCAL_DEMO_PROPOSAL_2026-10-05.md` is preserved with a supplement; this later owner decision supplies the binding Phase 2 obligation/expiry. **G-01/G-02/G-06 decisions unchanged; G-03/RISK-008 and W0 OPEN.** No G-04/G-05 acceptance, W0 closure, baseline/tag/freeze/main merge or system/clinical certification. No runtime fix/test/API call is claimed by this documentation package.
