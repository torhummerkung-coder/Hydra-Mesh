# กติกาเอกสารคู่ — R1

## หลักการที่ Owner ยอมรับ

เป้าหมายระยะนี้คือ demo ที่ทำงานครบ; production readiness เดินคู่ขนาน
Independent review เลื่อนได้สำหรับ demo โดยระบุความจริง และต้องกลับมาตรวจให้ครบก่อน production
ทุกเหตุการณ์บันทึกครั้งเดียวในทะเบียนกลาง แล้วสะท้อนสองรายงานใน revision เดียวกัน
ข้อเท็จจริง ผลรัน source hashes และเหตุการณ์ต้องตรงกัน เกณฑ์รับและสิทธิ์กล่าวอ้างแยกกันได้

## ความหมายของสถานะ

- VERIFIED_ARTIFACT: อ่านและตรวจ supplied bytes ได้ ไม่รับรองเหตุการณ์บนเครื่องแบบอิสระ
- REPORTED: มีผู้รายงาน แต่ยังไม่มีหลักฐานพอให้ยืนยันข้ออ้างนั้น
- NOT_RUN / NOT_TESTED: ยังไม่มีผลรันตามขอบเขตนั้น
- HOLD: ยังไม่มีสิทธิ์หรือหลักฐานที่ต้องมีก่อน operation นั้น
- DEFERRED: เลื่อนข้อกำหนดอย่างเปิดเผย มีเงื่อนไขกลับมาตรวจ ไม่เท่ากับ PASS
- PASS: ใช้ได้เฉพาะเกณฑ์ที่กำหนดก่อนรัน มี evidence จริงตรง version/environment และอำนาจรับผล
- OUT_OF_SCOPE: ไม่ได้ประเมินในขอบเขตนั้น ต้องบันทึกเหตุผลและผลกระทบต่อสิ่งที่กำลังสาธิต

## ขอบเขตสิทธิ์

Owner เป็นผู้ตัดสิน internal demo acceptance และ case adjudication ภายใต้เกณฑ์ที่ยอมรับ
assistant จัดทำ source/เอกสาร/ตารางตามงานจริง; AI reviewer เป็นการตรวจเสริม ไม่ประกาศเป็น human independent certification
บันทึกบทบาทต่อ artifact ไม่เหมารวม Owner ว่าเป็นผู้เขียนทุกชิ้น ห้ามใช้ภาพลายเซ็นเดิมกับเอกสารนี้
Deferred independent review ไม่อนุมัติ trusted admission, exception, budget reset หรือเพิ่ม retry cap
เกณฑ์ D05 เดิมคงมีสถานะอ้างอิงเดิม ผล demo ไม่เปลี่ยนผลประเมินย้อนหลัง

## การเปลี่ยนข้อมูล

1. เพิ่ม event_id, เวลาที่ทราบจริง, แหล่งหลักฐาน/แฮช, ผู้รายงาน/ผู้จัดทำ, ผลและข้อจำกัด
2. ประเมิน demo_impact และ production_impact ทุกครั้ง; ถ้าไม่กระทบให้ระบุเหตุผล
3. แก้ current finding ด้วย event อ้าง correction ของเดิม ไม่ลบ failure หรือ rewrite ประวัติ
4. สร้างทั้งสองรายงานจากทะเบียนเดียวกัน ตรวจ revision และ ledger hash ตรงกัน
5. เปลี่ยนเกณฑ์รับงานต้องแยก decision จากผลรัน ห้ามเปลี่ยนเกณฑ์ย้อนหลังเพื่อให้ PASS
6. เก็บ evidence จาก source เก่าเป็น historical ถ้ารัน source ใหม่ต้องระบุ applicability ไม่สืบทอด PASS เอง

## สิ่งที่ยังจำเป็นสำหรับ demo

Synthetic data, isolation, authorization/revocation/crypto/clinical invariants ที่เกี่ยวข้องกับสิ่งสาธิต
การคง FAIL/UNKNOWN, การกัน rerun และ accounting ยังคงต้องทำ
Safety หรือ cross-patient defect ที่กระทบ demo เป็น blocker แม้ production review จะเลื่อนอยู่
ข้อมูลนอกขอบเขตต้องประกาศ mock/stub/unavailable อย่างชัดเจน

## การกลับมาตรวจ production

ก่อนเริ่ม release preparation: ทบทวน deferred register ทุกข้อ ระบุผู้มีความสามารถและ independence basis
ผูกการตรวจใหม่กับ version ปัจจุบัน ประเมินหลักฐานเดิมว่าใช้ได้แค่ไหน และรันใหม่เมื่อจำเป็น
เหตุการณ์ที่ไม่ได้เก็บไว้พิสูจน์ย้อนหลังอาจไม่ได้ ต้องบันทึกข้อจำกัด ไม่สร้างหลักฐานย้อนหลัง
