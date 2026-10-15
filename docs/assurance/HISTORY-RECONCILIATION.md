# R3 — ผลค้นประวัติและแยก lineage

## งานที่ทำจริง

อ่าน supplied local inputs 40 ไฟล์ รวม recovered copy และ artifacts ที่ดึงจาก pinned PR #2; ตรวจ archive directories
75 ชุดที่ bytes ไม่ซ้ำ (รวม ZIP ชั้นใน) และอ่านข้อความที่เลือก 2,838 members รวม 39,622,907 bytes
ไม่มี candidate import, package install, workload dispatch หรือการรันทดสอบเพื่อสร้างประวัติใหม่
รายละเอียดขอบเขตและ limits อยู่ใน [ผลค้น](registry/history-reconciliation.json)

## สิ่งที่ยืนยันได้จาก bytes / metadata

| รายการ | ผล | ความหมายที่ใช้ได้ |
|---|---|---|
| G03 start records | 139 occurrences ยุบเป็น 49 record keys; same-key payload conflict 0 | ลดการนับซ้ำจาก export/history copies; ไม่ใช่ยอดเริ่มทั้ง mission |
| B1 group ordinal สูงสุดที่พบ | 44 | ค่าสูงสุดที่ records รายงาน ไม่ใช่ 44 retries หรือยอดคงเหลือ |
| Runner accounting group สูงสุดที่พบ | 39 | คนละ lineage กับ D05 bootstrap; ไม่โอนมาใช้เป็น budget |
| Exact test-source match v0.2.1 | 5 methods แรกอยู่ในไฟล์ test source bytes เดียวกัน | ยืนยัน source ancestry; ไม่พิสูจน์ว่าเคยรันหรือไม่เคยรัน |
| 19 methods ที่เหลือ | พบชื่อใน review metadata แต่ไม่พบ exact source hash ใน corpus ประวัติที่เลือก | ผลค้นที่จำกัด; ไม่สร้าง first-free entitlement |
| Legacy gateway v1.0.40 | ZIP จาก pinned PR2 ตรง SHA-256 ที่เอกสารอ้าง | เป็น FastAPI/SQLite คนละ implementation กับ Postgres candidate |
| Legacy reported tests | 55 / 13 / 9 / 9 / 15 ตามหมวดในรายงาน PR2 | เป็นรายงานเดิม; ไม่บวกเป็น actual-start หรือ canonical budget |

PR2 source archive มี 5 members (source package + requirements) แต่ไม่มี source ชุด pytest 55 tests
และการตรวจรอบนี้ยังไม่มี raw execution/accounting transcripts ของชุดดังกล่าว จึงยังตัดสิน alias กับ 24 methods ไม่ครบ
รายงาน PR2 ที่เขียนว่า synthetic tests ไม่ถูก billed เป็นถ้อยคำในรายงาน ไม่ใช่ waiver ใหม่ของ Owner ใน R3

## ปัญหาสำเนา evidence ปัจจุบัน

`G03_HTTP_HEAVY_RETRY_RESULT_20261014T084516423639Z.zip` ในพื้นที่งานรอบนี้มีขนาด
10,707,968 bytes / SHA-256 `9d0d4f885f89aa8b332a245e7cd4a4255c8659980952397e6fc74498c3d7f06c`
เปิด ZIP ไม่ได้ (`BadZipFile`) ต่างจาก receipt เดิมที่รายงาน 41,874,399 bytes /
`42bbbad61bb181fd7e505e2d4fa2467936a503585da2f583bd072285e13bc234`

เก็บสำเนา CURRENT_COPY_UNREADABLE ไว้แยก ไม่ลบ ไม่เขียนทับ และไม่สรุปว่าไฟล์ต้นฉบับเดิมเสีย
จากนั้นกู้ standalone ZIP จาก original stored artifact ได้จริง: 41,874,399 bytes / SHA-256 ตรง receipt เดิม
`42bbbad61bb181fd7e505e2d4fa2467936a503585da2f583bd072285e13bc234`
ตรวจ unique member names และ CRC ผ่านครบ 889 members พร้อมค้นประวัติจากสำเนาที่กู้ได้เพิ่มแล้ว
ผลหลัง recovery มี start-record occurrences เพิ่ม 99 -> 139 แต่ distinct keys ยัง 49; ไม่มี payload conflict
ปิดปัญหาความพร้อมใช้ของสำเนาตาม bytes ได้ ไม่จำเป็นต้อง rerun workload เพื่อทดแทนหลักฐานนี้
การกู้ไฟล์ไม่เปลี่ยนข้อจำกัดด้าน applicability, authority หรือ production assurance ของผลเดิม

## ผลต่อ Demo และ Production

- Demo: งานเตรียมประวัติและลดการนับซ้ำเสร็จสำหรับ corpus นี้; Owner adjudication ยังต้องมีเหตุผลราย case
- Production: independent/global accounting authority ยังไม่เกิดจากการค้นไฟล์; H-01/H-02 ยัง HOLD; original r4 artifact กลับมาใช้ตรวจต่อได้
- รักษา Owner-reported zero สำหรับงานเฉพาะรอบ แยกจาก global unknown ตามจริง
- แยก 4 lineages ใน [accounting-lineages.json](registry/accounting-lineages.json); ห้ามเอา fixture START หรือ report counts มารวมโดยไม่มีคำตัดสิน
- พบข้อมูลจริงแทนช่องว่างบางส่วนแล้ว แต่ไม่เติม null เป็น 0 และไม่ทำให้ H-04/H-05 ผ่านเอง

## หลักฐานที่ต้องใช้แก้ช่องว่างเฉพาะจุด

1. Source/preregistered identities และ raw logs ของ legacy Python 55 tests พร้อม scope/start accounting เดิม
2. Historical Manual Skill canonical registry และ provisional +4 Minor decision/evidence ที่ใช้ตัดยอดได้
3. Host/runner coverage declaration: เครื่องใด/ช่วงใดถูกค้นครบ และแหล่งใดยังเข้าไม่ถึง
4. Owner adjudication ตาม [ตารางเสนอคำตัดสิน](CASE-ADJUDICATION.md) หลังดูความเทียบเท่าของ objective

ไม่ขอให้รันชุดเก่าซ้ำเพื่อเติมประวัติ การรันใหม่ไม่พิสูจน์สิ่งที่เกิดในอดีต
