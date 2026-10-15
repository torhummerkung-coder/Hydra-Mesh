# Demo-first — แผนปิดงาน R5

ทิศทาง Owner: ทำ Demo ให้สมบูรณ์ก่อน และพัฒนาโดยรักษาทางไป Production ตามข้อความ 2026-10-15 (ไม่สมมติเวลารับข้อความ)
สถานะ: แผนดำเนินงานและผลตรวจ source; Demo ยังไม่ ACCEPTED

## ผลส่งมอบที่ต้องได้

หนึ่งชุด Demo ที่เปิดตามคู่มือได้ มี source/version แน่นอน ข้อมูลสมมติ เส้นทางสาธิตครบตามรายการที่เลือก ผลตรวจจริงและข้อจำกัดที่มองเห็นได้ พร้อมรายงาน Production จากข้อเท็จจริงเดียวกัน
ความครบถ้วนหมายถึงจบเส้นทางที่ประกาศไว้ ไม่ใช้ภาพหน้าจอหรือผล CLI แทนการทำงานของแอป

## ลำดับงานใหม่

| ลำดับ | งานที่ต้องส่งมอบ | เกณฑ์จบ | สถานะปัจจุบัน |
|---|---|---|---|
| 1 | ผูกตัว Demo กับ source และ UI foundation ที่เลือกไว้ | ระบุ commit/archive hash, entrypoint และส่วนที่เชื่อม backend จริง; รักษา UI เดิม | main ใช้เป็นฐานตรวจวิศวกรรมได้; prototype สี่บทบาทยังไม่ยืนยันการ integrate |
| 2 | แก้ข้อบกพร่องที่กระทบ flow สาธิต | รายการแก้มีเหตุผลและ negative path; ไม่เปลี่ยน auth/clinical semantics โดยพลการ | เตรียมแบบแก้ summary/trace stale response แล้วใน DEMO-DEFECTS.md |
| 3 | จัด fixture และ walkthrough | ผู้ป่วยสมมติ A/B, ผู้ดูแลที่มี/ไม่มี assignment, expected outcomes และข้อจำกัดแต่ละ flow | ใช้ 12 scenarios เดิมเป็น coverage; ยังไม่รัน |
| 4 | ตรวจตัว Demo บน host ที่ระบุ | เตรียม source/env/isolated data และข้อกำหนดการรันที่ตรงงาน; เก็บ PASS/FAIL/INCONCLUSIVE จากการทำจริง | ยังไม่มีผล walkthrough สำหรับ artifact ที่จะรับงาน |
| 5 | ส่งมอบและรับงาน Demo | คู่มือเปิด/รีเซ็ต, walkthrough, evidence, known limitations และ Owner acceptance ของ artifact เดียวกัน | NOT_ACCEPTED |

งาน 1–3 เดินหน้าต่อได้ระหว่างที่ติดตาม D05 history/admission; ไม่ต้องปิดทุก Production gate ก่อนจัดทำหรือแก้แผน Demo
หาก flow ใดใช้ D05 dispatch จริง เงื่อนไข H-01–H-05 ยังคงใช้กับการ dispatch นั้น ต้องแก้ที่ operation ไม่ยก HOLD เป็นข้อห้ามครอบทั้งโครงการ
ข้อกำหนด test accounting เดิมยังใช้กับ workloads ที่อยู่ในขอบเขตนั้น; การจัดลำดับใหม่ไม่เพิ่ม cap หรือสิทธิ์เริ่มฟรี

## สิ่งที่ต้องพร้อมก่อนสาธิต กับสิ่งที่เลื่อนได้

| หัวข้อ | Demo | Production |
|---|---|---|
| Patient / clinician journey | ทำงานครบตาม flow ที่เลือก รวม error/empty/loading/logout | ตรวจ workflow และ operational evidence เพิ่มตามการใช้งานจริง |
| Context switching / data access | ห้ามข้อมูลผิดคนหรือ stale response ทับบริบทใหม่; mock ต้องติดป้าย | ทดสอบ authorization/revocation/concurrency จริงและ independent review |
| Provider / summary | แสดง mock/fallback/unavailable ตรงจริง; ไม่อ้าง diagnosis หรือ handoff ที่ไม่ได้เกิด | พิสูจน์ provider, safety/clinical review และ monitoring |
| Admin / four-role UI | รักษา foundation ที่ Owner เลือก; ส่วนยังไม่เชื่อมต้องแจ้งชัด ไม่ตัด requirement เอง | ทำ role/permission/integration ให้ครบก่อนใช้จริง |
| D05 trusted admission | ไม่เลือกเป็นสิ่งที่ต้องสาธิตในรอบแรกโดยปริยาย; ถ้าจะใช้จริงต้องผ่าน gate ของมัน | ยังต้องแก้ registry/budget/freeze/host/admission ตามเดิม |
| Independent review | เลื่อนตามทิศทาง Owner; เปิดเผยว่าเป็นผู้จัดทำตรวจเอง | ต้องทำก่อน release; การตรวจภายหลังอาจพบสิ่งที่ต้องแก้และทดสอบใหม่ |
| G03 / RISK008 / W0 | ประเมินว่าข้อค้างใดกระทบ flow ที่เลือก; ห้ามนำ flow ที่ไม่ปลอดภัยมาสาธิต | คง OPEN จนมีหลักฐานและมติที่ตรงเกณฑ์ |

## Walkthrough ที่ใช้เตรียมงาน

1. เข้าสู่ระบบด้วยบัญชีสมมติและแสดง role ที่เลือกจริง
2. Patient ส่งข้อความ ดูสถานะตอบกลับ/fallback และทำ screening ตาม contract เดิม
3. Clinician เปิดผู้ป่วยที่ได้รับ assignment ดู source/summary และ review queue
4. ปิด summary ระหว่างโหลดแล้วเปิดผู้ป่วยอีกคน: response เก่าต้องไม่ทับข้อมูลคนใหม่
5. แสดง denial, provider unavailable และ health unknown โดยไม่ซ่อนความล้มเหลว
6. ออกจากระบบ; การเปิดข้อมูลที่ป้องกันไว้ต้องทำตาม contract session/authorization
7. แสดงส่วน Admin/prototype พร้อมสถานะ integration จริง หากเป็นส่วนของ artifact ที่เลือก

รายการนี้กำหนดงานเตรียม ไม่ใช่ผลรัน และไม่ลด 12 scenarios เดิมโดยเงียบ ๆ
การรับ Demo ต้องมีรายการ included/deferred พร้อมเหตุผลก่อนรัน ไม่เลือกเฉพาะสิ่งที่ผ่านหลังเห็นผล

## สิ่งที่ไม่ใช่ Demo acceptance evidence

`npm run demo:tier1` ใน main เรียก `scripts/demo-tier1-walkthrough.ts` ซึ่งสร้าง audit events จำลอง, จำลอง callback ล้มเหลวสำหรับ circuit breaker และพิมพ์ manifests
ไม่ได้เปิดหน้าเว็บหรือเรียกครบ patient/clinician journey และไม่มี assertions ที่พิสูจน์ acceptance matrix
จึงใช้เป็นตัวอย่าง trace ได้โดยติดป้าย simulation แต่ใช้ปิด Demo ทั้งระบบไม่ได้ (รอบนี้อ่าน source เท่านั้น ไม่ได้เรียกคำสั่ง)

## การบันทึกคู่กัน

ทุกการแก้/ผลตรวจลง event ใน registry/ledger.json แล้วสร้าง DEMO.md และ PRODUCTION-READINESS.md ใน commit เดียวกัน
ผลจริงไม่เปลี่ยนตามฉบับ; ต่างกันที่เกณฑ์รับและสิทธิ์กล่าวอ้าง Demo accepted ไม่แปลว่า Production ready
