# Demo defect preparation — R5

ฐานตรวจ: main `295893a7e4cc6f32839eb8a90d1ced5cae963866`
ไฟล์ `pages/dashboard.tsx`, Git blob `5f51dd916ee1c7ca131c5b6192f8b399f4783e8b`
วิธีตรวจ: อ่าน source; ยังไม่ได้ reproduce ใน browser หรือแก้ runtime source

## DEMO-UI-01 — summary request ไม่มีการผูก completion กับบริบทล่าสุด

หลักฐาน: viewSummary บรรทัด 203–219 ตั้ง patient/loading แล้ว await fetch/json ก่อน setSummaryResult โดยไม่ตรวจ request generation; finally เปลี่ยน loading เสมอ
ปุ่มปิดบรรทัด 527–528 ล้าง patient/result แต่ไม่ invalidate request ที่ค้าง
AbortSignal.timeout(15000) จำกัดเวลาเท่านั้น ไม่ invalidate เมื่อปิดหรือเปลี่ยน patient

ลำดับที่ต้องตรวจ: เปิด A → ปิดขณะ A pending → เปิด B → B ตอบก่อน → A ตอบทีหลัง
ตาม control flow completion ของ A ยังเรียก setter ได้ จึงมีความเสี่ยงผล A ปรากฏใต้บริบท B หรือ loading ถูกปิดก่อนคำขอปัจจุบันเสร็จ
นี่เป็น source-level defect candidate ที่ต้องแก้ก่อนรับ summary flow; ไม่กล่าวอ้างว่าเห็น PHI leak จริงหรือ bypass server authorization

แบบแก้พร้อมนำไป implement:
- ให้แต่ละ request มี generation token; invalidate ก่อนคำขอใหม่ เมื่อปิด modal และ unmount
- ใช้ AbortController ยกเลิกคำขอเดิม และคง timeout 15 วินาทีพร้อม cleanup
- result, error และ finally ต้องเปลี่ยน state ได้เฉพาะ generation ที่ยัง active; abort อย่างเดียวไม่พอ เพราะ response/JSON อาจสำเร็จไปแล้ว
- ตรวจ HTTP status และ success ก่อนรับ result; failure ของคำขอล่าสุดแสดง unavailable ตาม UI เดิม
- คง endpoint, body ที่มี patientId เท่านั้น, server authorization, clinical values และ layout เดิม

เกณฑ์ตรวจที่เตรียม: A/B ตอบสลับลำดับ, close/reopen, stale finally, unmount, timeout, HTTP failure และ success ล่าสุด
ใช้ synthetic fixtures และ controlled completion; ลงผล/ข้อผิดพลาดจริงทุกครั้งตาม accounting ที่ใช้กับงาน

## DEMO-UI-02 — trace มี lifecycle pattern เดียวกัน

viewTrace บรรทัด 222–243 เขียน selectedTrace/error/loading หลัง await โดยไม่มี generation check
ปุ่มปิดบรรทัด 476 ล้าง selectedTrace อย่างเดียว คำขอที่ค้างอาจกลับมาเปิด modal หรือทับ trace ล่าสุด
แนวแก้เหมือน summary แต่มี token/controller แยกกันและคง timeout 5 วินาที ไม่ใช้ controller ร่วมจนสอง feature ยกเลิกกัน
ต้องตรวจ trace A/B ตอบสลับ, ปิดระหว่าง pending, stale error และ stale finally

## DEMO-EVIDENCE-01 — CLI simulation ไม่ได้พิสูจน์ end-to-end demo

`scripts/demo-tier1-walkthrough.ts`, Git blob `de2b1655ed06e1455025cb3f9bf7e8bff14fcfad`
scenario1/2 เรียก logEvent ด้วย payload ที่กำหนดไว้ล่วงหน้า ไม่ใช่การสังเกตการตัดสินใจจาก UI/orchestrator จริง
scenario3 ใช้ callback ที่ throw จำลอง failure; ข้อความ output ไม่ใช่หลักฐานว่า chat.ts/fallback ทำงานครบ
แก้ในขั้นส่งมอบโดยกำกับ simulation และแยกหลักฐาน walkthrough จริง ไม่ยกระดับข้อความ log เป็น PASS

## ขอบเขตลงมือ

แผนนี้ทำให้ review และ implementation ต่อได้จาก source เดียวกัน ไม่มี code patch หรือ workload run ซ่อนอยู่ใน PR เอกสาร
การแก้ summary/trace กระทบความถูกต้องของบริบทผู้ป่วย จัดเป็น T2 ตาม AOC ไม่ลดเป็น T1 เพียงเพราะอยู่ใน Demo
ก่อนทดสอบต้องผูก exact candidate/fixture/host และบัญชีการรันที่เกี่ยวข้อง; independent production certification ยังเลื่อนได้สำหรับ Demo ตาม Owner direction
