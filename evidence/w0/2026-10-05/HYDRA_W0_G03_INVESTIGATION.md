# EC-015 — G-03 controlled slow-read evidence on the phone

วันที่รับต้นฉบับ: 2026-10-05 21:08:47 Asia/Bangkok
ต้นฉบับ: `evidence/w0/2026-10-05/hydra-w0-g03-c286c18-2026-10-05.json` — 9386 bytes, SHA256 `76264914135efdd759318e8d3dd5b9fbe476c7237b5cc9d436d1239d7811ff89`; เก็บ bytes ตามต้นฉบับ
ช่วงรัน: 2026-10-05T13:49:36.758Z–13:51:15.648Z / 20:49:36–20:51:15 Asia/Bangkok
Source: `c286c186f71fb393cdb5a3caa6bb5019b199b2a5`; Node v22.23.2; isolated Ubuntu checkout `/tmp/hydra-g02-verify-lW8QX7`

ชุดตรวจที่ส่งให้เจ้าของ: `hydra-w0-g03-slow-read-diagnostic-2026-10-05.zip`, SHA256 `87405d00210b655953fa9fa599ed8894914521bd2b82f555c2814865581b1123`; เป็น external diagnostic ที่ไม่แก้ source ของ repo

## สิ่งที่ทดสอบและผลจริง

ใช้ endpoint/stores/schema จริงของ checkout กับ SQLite ข้อมูลเข้ารหัส บัญชีและกุญแจจำลองใน directory ชั่วคราว Middleware หน่วง query หนึ่งรายการก่อนเริ่มอ่าน SQLite จน endpoint ตอบ timeout แล้วจึงปล่อย query ค่า deadline เดิมไม่เปลี่ยน Provider fetch ใช้ผลจำลอง ไม่มี live provider request

| กรณี | HTTP | เวลา ms | ผล |
|---|---:|---:|---|
| ผู้ป่วยที่ไม่ได้รับมอบหมาย | 404 | 15 | ไม่เริ่ม clinical read/key lookup/provider call |
| Assigned fast positive control | 200 | 960 | mock summary available; ไม่ใช่ live generation |
| Current-role lookup timeout | 503 | 3002 | Authorization unavailable; ไม่เริ่ม clinical reads/decrypt-key lookup |
| Assignment lookup timeout | 503 | 3006 | Authorization unavailable; ไม่เริ่ม clinical reads/decrypt-key lookup |
| Conversation read timeout | 500 | 15018 | ไม่ส่ง source/AI data; query สำเร็จหลังตอบและเริ่ม late key lookup |
| 9Q read timeout | 500 | 15020 | ไม่ส่ง source/AI data; query สำเร็จหลังตอบและเริ่ม late key lookup |
| 8Q read timeout | 500 | 15020 | ไม่ส่ง source/AI data; query สำเร็จหลังตอบและเริ่ม late key lookup |
| Review-queue read timeout | 500 | 15027 | ไม่ส่ง source/AI data; query สำเร็จหลังตอบ |
| Late query rejection | 500 | 15025 | query ปฏิเสธหลังตอบ; ไม่พบ unhandled rejection ในช่วง drain |

ครบ 9 PASS / 0 FAIL, child exit0/signal null/errorCode null, commandChecksPassed=true; terminal G03_DIAGNOSTIC_EXIT=0 ผล PASS คือ assertions ตรงกับพฤติกรรมที่เกิดขึ้น ไม่ได้หมายความว่า cancellation ถูก implement

ทุก injected timeout ไม่มี data ใน response, ไม่เรียก provider และยังมี query ค้างตอนตอบกลับ Controlled query ทั้งหกกรณีที่ปล่อยให้สำเร็จจบหลัง response ส่วน late-rejection case จบด้วยการปฏิเสธ ตาม assertions ไม่มี response ที่สองหรือ unhandled rejection ในช่วง drain ที่ตรวจ และไม่พบ synthetic content/error/key canaries ใน saved audit metadata

Conversation/9Q/8Q มี lateKeyLookupCount=1 ต่อกรณี เป็นหลักฐานว่า decrypt-key path เริ่มต่อหลัง response ไม่รับรองเวลาเสร็จของการถอดรหัสทั้งหมด ไม่พิสูจน์ in-flight revocation behavior และไม่ใช่ system-wide privacy/audit certification

## Source integrity และการเก็บหลักฐาน

sourceBefore เท่ากับ sourceAfter ทั้ง object: clean=true, commit `c286c186f71fb393cdb5a3caa6bb5019b199b2a5`, trackedSourceSha256 `d1faf534b437425cb60ae798bd49b343dee907d79cfb9ac1866fba0e56a1d27f`, lockfileSha256 `83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0` และ targetHashes ทั้ง 6 ไฟล์ตรงกัน SourceStable=true ยืนยัน clean/stable ของ isolated checkout ที่ทดสอบ ไม่ได้ล้าง untracked files ใน Termux repo

tracked-source fingerprint นี้ใช้ algorithm ของ external diagnostic runner ให้เทียบ before/after ภายในรอบนี้ ไม่ใช้ค่าที่ต่างจาก full collector มาอนุมาน source drift โดยตรง เวลารับไฟล์และเวลารันแยกกันตามที่บันทึกด้านบน

## ข้อจำกัดที่ยืนยันและสิ่งที่ยังไม่ทดสอบ

- withDeadline จำกัดเวลารอแต่ไม่ยกเลิก controlled underlying query งานอ่านและ decrypt-key lookup อาจทำต่อหลัง response
- Clinical-read timeout คืน generic HTTP500; ไม่มี source-data fallback ในกรณีนี้ ต่างจาก provider-error fallback หลังอ่านข้อมูลสำเร็จ ส่วน auth timeout fail closed ด้วย HTTP503
- 3s/15s เป็น deadline ของขั้นที่ตรวจ ไม่ใช่ SLA ของ request ทั้งเส้นทาง และรอบนี้ไม่ได้ใช้ live provider
- การหน่วงก่อน query ไม่ใช่ SQLite in-engine lock test, controlled full decryption-duration test, HTTP/UI fault injection, repeated/concurrent load benchmark หรือ clinical validation ไม่มีการพิสูจน์เพดาน CPU/memory/DB work หลัง timeout
- ไม่ทดสอบ revoke assignment ระหว่างงานที่ค้างอยู่ จึงไม่ใช้ผลนี้รับรองการเพิกถอนสิทธิ์ระหว่าง in-flight read ข้อบกพร่องจริงด้าน authorization/privacy/safety ต้องแก้ ไม่อยู่ในข้อเสนอให้ยอมรับ

## สถานะและการติดตาม

ช่องว่างเดิมเรื่อง controlled synthetic slow-read execution มีหลักฐานบนมือถือแล้วภายใต้ขอบเขตนี้ งานเรื่อง cancellation/ทรัพยากรและการประเมิน residual risk ยังเหลือ ข้อเสนอที่ `docs/decisions/W0_G03_LOCAL_DEMO_PROPOSAL_2026-10-05.md` เป็น PROPOSED; ไม่มี Human Decision หรือลายเซ็น G-03/RISK-008 และ W0 OPEN คำอนุมัติ G-01/G-02/G-06 เดิมไม่เปลี่ยน

เก็บต้นฉบับ ผล error และข้อจำกัดตามจริง ไม่เพิ่ม deadline/retry หรือเปลี่ยน runtime เพื่อให้ผ่าน รอบนี้เป็น documentation/evidence update เท่านั้น ไม่มี test/provider call ใหม่ ไม่มีการปิด W0/baseline/tag/freeze/main merge


## G-03 temporary owner acceptance with mandatory Phase 2 correction — 2026-10-05 21:55:43 Asia/Bangkok

Human Decision **HD-W0-G03-TEMP-2026-10-05**: นายศุภกร โคตะมา — Project Owner & System Architect — approved the explained G-03 proposal for controlled local synthetic demo only. Demo/testing may continue; this is **not certification that the system is ready for real-world use**. Preserve low-load operator conditions, authorization/assignment/revocation boundaries and truthful read-timeout failure. No source/summary on clinical-read timeout is claimed; timeout does not cancel underlying work.

**Mandatory correction within Phase 2:** use this period to diagnose, fix and verify G-03 code/work-control behavior under the existing Phase 2 scope and procedures. Other work may proceed first, but this item is not indefinitely deferred. The temporary acceptance **ends with Phase 2 closure and must not extend beyond it**. Phase 2 must not be declared closed on the strength of this exception while G-03 correction/verification remains unfinished; record acceptance expiry and the actual verified disposition at closeout. No calendar deadline was supplied; preserve the event-bound Phase 2 deadline without inventing a date.

Owner distinguishes G-03 code debugging from the Agent-model/provider-access limitation. Current source and controlled results show non-cancellation in code; the exact final remedy remains to be selected and tested. Do not attribute this issue to model quality or solve the recorded code issue merely by changing a model. G-02 temporary model/provider/API-access decision remains separate and unchanged.

**G-03/RISK-008 and W0 OPEN.** Nine current-phone synthetic checks are retained as bounded evidence, not cancellation/load/UI/in-flight-revocation or production readiness proof. No actual authorization/privacy/safety defect waiver, new runtime change, additional test/API run, signature image, W0 closure, baseline/tag/freeze/main merge. Prior PENDING G-03 statements are historical and supplemented by this explicit owner decision; full conditions and verbatim authorization: `docs/decisions/W0_G03_TEMPORARY_ACCEPTANCE_2026-10-05.md`.
