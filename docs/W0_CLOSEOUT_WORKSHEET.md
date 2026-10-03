# W0 Closeout — แบบเก็บหลักฐานสำหรับ repo จริง

สถานะเริ่มต้น: **OPEN** — แบบฟอร์มนี้ยังไม่มี Human Decision และไม่มีการ freeze

## ขั้นตอนรัน

1. นำ corrective overlay เข้า branch ของ repo จริง ตรวจ diff และ commit งานให้เรียบร้อย
2. ใช้ disposable checkout ที่สะอาด รันจาก root ของ repo:

```bash
node scripts/collect-w0-evidence.mjs --inspect
node scripts/collect-w0-evidence.mjs
```

ตัว collector บันทึก commit, hash ของ tracked source/lockfile, Node/npm, npm ci, 11 non-live suites, migration/seed, typecheck และ production build ผลล้มเหลวหรือ FAIL marker ทำให้หยุด ใช้ DB/outbox และ key ชั่วคราวของ synthetic test โดย override config DB เดิม ผลนี้ไม่ใช่การตรวจ production startup config

สำหรับ Gemini live ให้ตั้ง key เฉพาะเครื่องและ GEMINI_MODEL ที่ต้องการพิสูจน์ก่อนรัน:

```bash
node scripts/collect-w0-evidence.mjs --live
```

live command ส่งเฉพาะ synthetic fixture ที่อยู่ใน test ให้ provider ผล JSON เก็บรุ่น เวลา และสถานะ assertion ไม่เก็บ key หรือ summary text ผู้ทดสอบยังต้องอ่านและตรวจ summary แยกจาก command gate ด้วยข้อมูล synthetic เท่านั้น ค่า model ใน config ยังไม่พิสูจน์ provider availability

เมื่อรันจบจะแสดง evidence directory; ส่งเฉพาะ `w0-evidence.json` พร้อมแบบฟอร์มนี้ที่กรอกแล้ว ห้ามส่งทั้ง directory เพราะมี synthetic DB/outbox ห้ามส่ง `.env.local` หรือ key

## Gemini human review

| รายการ | ผล / artifact |
|---|---|
| Commit ตรงกับ JSON | รอหลักฐาน |
| Provider / effective model | รอหลักฐาน |
| เวลารัน / command exit0 / 3 assertion | รอหลักฐาน |
| Summary ภาษาไทยอ่านรู้เรื่อง | รอผู้ตรวจ |
| ไม่มีข้อมูลแต่งเพิ่มจาก synthetic input | รอผู้ตรวจ |
| Disclaimer ไม่อ้างการวินิจฉัย | รอผู้ตรวจ |
| ผู้ตรวจ / วันที่ | รอผู้ตรวจ |

## Doctor UI — positive / negative / fallback

ใช้ synthetic accounts เท่านั้น

| Scenario | ผลที่ต้องเห็น | ผลจริง / artifact |
|---|---|---|
| Doctor มี active CareAssignment | อ่านข้อมูลผู้ป่วยที่ assigned และ trace ที่มี ownership proof ได้ | รอทดสอบ |
| Doctor ไม่ได้รับ assignment | ไม่มีข้อมูล/trace ข้ามผู้ป่วย; API ปฏิเสธ | รอทดสอบ |
| Session ไม่ถูกต้อง | เข้าถึงข้อมูลไม่ได้ | รอทดสอบ |
| Assignment ถูก revoke | request ถัดไปไม่ได้สิทธิ์จาก session เก่า | รอทดสอบ |
| Trace ไม่มี patient ownership | ไม่แสดงแก่ Doctor/Staff | รอทดสอบ |
| Summary/provider unavailable | แสดงสถานะตามจริง ไม่แสดง summary ที่ไม่ตรวจสอบ; ตรวจ source-data fallback ถ้ายังไม่มีให้บันทึก gap | รอทดสอบ |

บันทึก screenshot แบบ synthetic/de-identified, request status และ commit ที่ใช้ หาก UI ยังไม่เสร็จ อาจเสนอ accepted gap ต่อ Tor โดยต้องไม่ waive privacy/authorization failure

## Gap / Human Decision

| ID | Finding | BLOCKER / ACCEPTED GAP / DEFERRED | Owner | Scope/reason/residual risk | Human/date/re-review |
|---|---|---|---|---|---|
| TBD | TBD | รอจำแนก | TBD | TBD | รอตัดสินใจ |

Historical Anthropic acceptance ใช้ได้เฉพาะขอบเขต MVP/Portfolio Demo ตาม decision เดิม ต้องยืนยันว่าตรงกับ baseline นี้; Phase2 RISK-003 และ proposed scenario policy ยัง open ไม่ได้ปิดจากการใช้แบบฟอร์ม

## Git / environment / freeze decision

| รายการ | หลักฐาน |
|---|---|
| Baseline commit และ clean source | JSON จาก actual checkout |
| npm ci + regression + typecheck/build | JSON; ทุก gate pass และ sourceStable=true |
| Production startup ปิด demo auth | ตรวจ config/startup แยก โดยไม่แนบ secret |
| Tag ที่ชี้ baseline commit | actual tag และ resolved commit |
| Remote push / tag ตรงกัน | ผลตรวจ remote ref; ไม่เผย credential ใน URL |
| BLOCKER=0 / accepted gap signed | ตารางด้านบน |
| ผู้อนุมัติ baseline / วันที่ / intended-use | รอ Tor / authorized human |

หลังหลักฐานครบ ให้เพิ่ม Evidence Chain entry แบบ append-only อ้าง EC-000/EC-001 และ artifact จริง ก่อนประกาศ FROZEN collector ไม่สร้าง tag, ไม่ push และไม่อนุมัติแทนมนุษย์
