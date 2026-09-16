# Clinician Authorization — ขอบเขตสิทธิ์แพทย์ต่อผู้ป่วย

อัปเดต: 2026-09-16

## ปัญหาที่แก้

ระบบเดิมตรวจเพียงว่า session มี role เป็น `doctor` หรือ `staff` ดังนั้นผู้ใช้ที่มี role ถูกต้องและรู้ `patientId` สามารถเรียก Patient Summary ของผู้ป่วยคนอื่น หรือเห็นคิวตรวจสอบรวมของทั้งระบบได้

รุ่นนี้เปลี่ยนกติกาการเข้าถึงข้อมูลคลินิกเป็น:

```text
ยืนยันตัวตนแล้ว
+ มี capability สำหรับงานนั้น
+ มี CareAssignment ของผู้ป่วยคนนั้น
+ assignment ยัง active และยังไม่หมดอายุ
= อนุญาตให้เข้าถึง
```

ถ้าตรวจฐานสิทธิ์ไม่ได้ ระบบจะหยุดก่อนถอดรหัสข้อมูล (`fail closed`) ไม่ถือว่าความไม่แน่ใจคืออนุญาต

## โครงสร้างที่เพิ่ม

- `CareAssignment` ใน `prisma/schema.prisma` ผูก `patientId`, `clinicianId`, ผู้มอบหมาย, เวลาเริ่ม, เวลาหมดอายุ และเวลายกเลิก
- `lib/auth/clinical-authorization.ts` เก็บ capability map และฟังก์ชันตรวจ assignment จุดเดียว
- `pages/api/admin/care-assignments.ts` สำหรับ admin ดู สร้าง และยกเลิก assignment
- `ReviewQueueItem.acknowledgedById` และ `acknowledgedAt` เป็นหลักฐานว่าใครรับทราบเคสเมื่อใด
- `scripts/test-clinician-authorization.ts` ทดสอบแพทย์สองคน ผู้ป่วยสองคน staff, admin และ security กับ SQLite จริง

การยกเลิก assignment เปลี่ยนสถานะเป็น `revoked` แทนการลบ record เพื่อรักษาประวัติการมอบหมายไว้

## Capability ใน milestone นี้

| Capability | Doctor | Staff | Admin | Patient | Security |
|---|---:|---:|---:|---:|---:|
| `patient.list.assigned` | ✓ | ✓ | – | – | – |
| `patient.read.assigned` | ✓ | ✓ | – | – | – |
| `review.list.assigned` | ✓ | ✓ | – | – | – |
| `review.acknowledge.assigned` | ✓ | ✓ | – | – | – |
| `care_assignment.manage` | – | – | ✓ | – | – |

Role ให้สิทธิ์ทำ “ประเภทงาน” ส่วน CareAssignment จำกัดว่าใช้สิทธิ์นั้นกับ “ผู้ป่วยคนใด” จึงไม่ให้ role ใดมีอำนาจอ่านข้อมูลคลินิกทั้งระบบโดยอัตโนมัติ

## พฤติกรรมของ API

### Doctor / Staff

- `GET /api/doctor/patients` คืนเฉพาะผู้ป่วยที่ session ปัจจุบันได้รับมอบหมาย ไม่ใช้รายชื่อ mock แล้ว
- `POST /api/doctor/patient-summary` ตรวจ assignment ก่อนเข้า temporary-decrypt zone
- `GET /api/doctor/review-queue` คืนเฉพาะคิวของผู้ป่วยที่ได้รับมอบหมาย
- `POST /api/doctor/review-queue` รับทราบได้เฉพาะรายการในขอบเขต assignment และบันทึกผู้รับทราบกับเวลา
- role ใน JWT เป็น snapshot ตอน login จึงตรวจซ้ำกับบัญชีปัจจุบันในฐานข้อมูลทุกคำขอคลินิก หาก role ถูกเปลี่ยน token เดิมใช้สิทธิ์ต่อไม่ได้
- คำขอผู้ป่วยที่ไม่ได้รับมอบหมายตอบ `404` แบบเดียวกับไม่มีข้อมูล เพื่อลดการไล่เดา `patientId`
- ถ้าฐานข้อมูลสิทธิ์ใช้งานไม่ได้ ตอบ `503` และไม่ถอดรหัสข้อมูลต่อ

รายชื่อผู้ป่วยคำนวณระดับสัญญาณจากคิวที่ยังไม่ถูกรับทราบ หากไม่มีหลักฐาน ระบบแสดง `unknown` ไม่แสดง `low` โดยเดาเอง

### Admin

`GET /api/admin/care-assignments` คืน assignment และรายชื่อผู้สมัครที่จำเป็นต่อการจัดการสิทธิ์

สร้างหรือเปิด assignment เดิมอีกครั้ง:

```json
{
  "action": "assign",
  "patientId": "USER_ID_OF_PATIENT",
  "clinicianId": "USER_ID_OF_DOCTOR_OR_STAFF",
  "expiresAt": "2026-12-31T17:00:00.000Z"
}
```

ยกเลิก:

```json
{
  "action": "revoke",
  "patientId": "USER_ID_OF_PATIENT",
  "clinicianId": "USER_ID_OF_DOCTOR_OR_STAFF"
}
```

เฉพาะ role `admin` ที่มี `care_assignment.manage` ใช้ endpoint นี้ได้ และฟังก์ชันชั้นฐานข้อมูลตรวจ role ของผู้สั่งซ้ำอีกชั้น

## การจำกัด Message Trace

Trace เดิมไม่ได้ผูก ownership ของผู้ป่วยไว้แน่นพอสำหรับกรองตาม CareAssignment จึงนำรายการ raw trace ออกจาก Doctor Dashboard และจำกัด endpoint เดิมให้ทีม `security` ใช้กับคิว security เท่านั้น

ฝั่งแพทย์ควรได้ timeline ทางคลินิกที่ผูก `patientId` และ assignment อย่างชัดเจนใน milestone Doctor Decision Layer ไม่ควรเปิด raw pipeline trace ทั้งระบบชั่วคราวเพียงเพราะยังทำ timeline ไม่เสร็จ

## อัปเกรดและทดสอบ

สำรองฐานข้อมูลก่อน แล้วรัน:

```bash
npx prisma db push
npm run db:seed
npm run test:clinician-authorization
npm run test:fallback-integration
npm run typecheck
npm run build
```

ไฟล์ `prisma/upgrade-clinician-authorization.sql` มีไว้สำหรับตรวจสอบหรืออัปเกรด SQLite รุ่นก่อนหน้าแบบ one-time แต่เส้นทางที่แนะนำสำหรับ Demo คือ `prisma db push`

`db:seed` สร้างบัญชี Demo สองคู่และ assignment แยกกัน เพื่อแสดงว่า `doctor1` เปิดได้เฉพาะ `patient1` ส่วน `doctor2` เปิดได้เฉพาะ `patient2` ปุ่ม Demo Login ใช้บัญชี fixture จริง ไม่สร้าง session subject ปลอมอีกต่อไป

## ข้อจำกัดที่ยังเหลือ

- ยังไม่มีหน้าจอ Admin สำหรับจัด assignment; รอบนี้มี API และ seed ที่ตรวจสอบได้ก่อน
- ยังไม่มี multi-clinic/tenant boundary, เหตุผลการเข้าถึง, consent scope หรือ break-glass workflow
- Audit log ยังอยู่ใน memory จึงยังไม่ใช่หลักฐานถาวรระดับ production
- การเปลี่ยนสิทธิ์มีผลกับคำขอใหม่ คำขอที่ผ่านการตรวจสิทธิ์และเริ่มทำงานแล้วไม่ได้ถูกยกเลิกกลางคัน
- ยังต้องทำ Privacy Center ให้ผู้ป่วยเห็นว่าใครเปิดข้อมูล เมื่อใด และด้วยเหตุผลใด

milestone นี้ปิดช่องว่าง patient-level authorization ใน Demo แต่ยังไม่ใช่การรับรอง compliance หรือความพร้อมใช้งานกับข้อมูลผู้ป่วยจริงโดยไม่มีการประเมินระบบรอบด้าน
