# HYDRA Mesh — W0 Evidence Addendum, 5 October 2026

สถานะ W0: **OPEN**. เอกสารนี้เป็นบันทึกการตรวจหลักฐานเพิ่มเติม ไม่ใช่การ freeze, การปิด risk หรือ clinical sign-off และยังไม่ได้รวมเข้า Git repository ของผู้ใช้

ผู้ตรวจทางเทคนิค: Codex (AI). ผู้มีอำนาจตัดสินใจ: Tor; ยังไม่มี Human Decision ใหม่ในบันทึกนี้

## 1. เวอร์ชันที่ตรวจจากรายงานจริง

| รายการ | ค่า |
|---|---|
| Commit | `3f6d45ba7b28cee703d16c2eba6143cea7d5197d` |
| Tracked-source SHA-256 | `5301d431d7704efaabbdf75d89fa49cc47a16b1a1016a00a77c15eb2f48a27f6` |
| Lockfile SHA-256 | `83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0` |
| Node / npm | `v22.23.2` / `10.9.8` |
| Model ใน collector | `gemini-3.8-flash` |
| Environment ใน collector | SQLite synthetic, temporary keys, production build, demo auth disabled |
| Tags at HEAD ในทั้งสองรายงาน | ไม่มี |
| Deployment environment verified | `false` |

ค่าของ `sourceBefore` ในรายงานสองฉบับตรงกันทุกช่อง รายงาน non-live มี `sourceAfter` ตรงกับ `sourceBefore`, `clean=true` และ `sourceStable=true` ส่วนรายงาน live ที่ล้มไม่มี `sourceAfter` จึงไม่มีหลักฐานตรวจ source หลังจบจากรายงานฉบับนั้น

## 2. ชุดคำสั่ง non-live ที่ผ่านครบ

ไฟล์: `hydra-w0-nonlive-2026-10-05.json` (3,924 bytes)

SHA-256: `e383ab5224ed3a72ae95da31f95765b98b4422c628bde5e7eee37427d9330fde`

เวลา UTC: `2026-10-04T21:29:32.880Z` ถึง `2026-10-04T21:35:00.833Z` หรือ 5 October 2026, 04:29–04:35 Asia/Bangkok

ทั้ง 16 gates มี `exitCode=0`, `errorCode=null`, `failMarkers=0`, `pass=true`:

1. install (`npm ci`)
2. db:migrate
3. db:seed
4. test:db
5. test:patient-encryption
6. test:clinical-data-encryption
7. test:auth-and-security-queue
8. test:clinician-authorization
9. test:fallback
10. test:clinical
11. test:audit
12. test:fallback-integration
13. test:fallback-storage
14. test:clinical-summary-contract
15. typecheck
16. build

`commandGatesPassed=true`, `liveRequested=false`. ภาพ `1000018361.jpg` แสดง `EVIDENCE_EXIT=0` ตรงกับรายงาน รายงานนี้ไม่ใช่ผล suite ที่รวม Gemini live

## 3. ผล live ที่ล้ม — เก็บไว้เป็นหลักฐาน

ไฟล์: `hydra-w0-live-failed-2026-10-05.json` (3,502 bytes)

SHA-256: `c4406a120fdcbefb04582a34079c9a73b89de5c41de06c83af26ec32bfdd5ad8`

เวลา UTC: `2026-10-04T21:23:34.985Z` ถึง `2026-10-04T21:26:36.918Z` หรือ 5 October 2026, 04:23–04:26 Asia/Bangkok

14 gates แรกผ่าน ขั้น `test:clinical-summary-gemini` มี `exitCode=1`, `errorCode=null`, `failMarkers=1`, `durationMs=14428`, `pass=false`; collector จบก่อน typecheck/build และตั้ง `commandGatesPassed=false`

14.428 วินาทีเป็นเวลาของ process ทดสอบทั้งขั้น ไม่ใช่เวลาที่วัดเฉพาะ provider รายงานไม่มี HTTP status, finishReason หรือข้อความ error ของ agent จึงระบุสาเหตุไม่ได้ และไม่ควรสรุปว่าเป็น 503, MAX_TOKENS หรือ timeout จากข้อมูลนี้

ไม่เปลี่ยนผล FAIL เป็น PASS และไม่รวมกับผลรอบอื่นเป็นข้ออ้างว่า suite `--live` ผ่านครบ 17 gates

## 4. ผล live แยกและภาพ UI

| หลักฐาน | สิ่งที่เห็นจริง | ขอบเขต |
|---|---|---|
| `1000018356.jpg` | Ordinary live script: 3 assertions PASS, `TEST_EXIT=0`, สรุป 4 หัวข้อจาก fixed synthetic fixture | ไม่มี commit/hash พิมพ์ในภาพ; ยังไม่ใช่การรับรองทางคลินิก |
| `1000018360.jpg` | Ordinary live script เวลา `2026-10-04T21:27:45.291Z`: PASS, `GEMINI_EXIT=0`, สรุป 4 หัวข้อ | ผลคนละรอบกับ collector ที่ล้ม; ไม่ทำให้รายงานที่ล้มเปลี่ยนสถานะ |
| `1000018365.jpg`, `1000018366.jpg` | Doctor UI ผู้ป่วย A: AI unavailable มี disclaimer และข้อมูลต้นทาง user/assistant เดิมวันที่ 4 October, 18:37:41 | ชุดบทสนทนานี้ยังอ่านได้หลัง restart; ไม่ใช่การพิสูจน์ durability สำหรับทุก failure mode |
| `1000018367.jpg` | `/proc` ของ PID 21019: production/demo/model/database ตรง, key presence ใน environment ตอนเริ่ม process เป็น false | Next.js อาจโหลด env เพิ่มภายหลัง; ไม่ยืนยัน runtime key state ทุกช่วงเวลา และไม่พิสูจน์สาเหตุเดียวของ fallback |
| `1000018368.jpg`, `1000018369.jpg` | UI ยัง fallback เวลา generatedAt 05:08:59 และข้อมูลต้นทางยังอยู่ | ยังไม่มี provider metadata ที่ผูกกับคำขอนี้ |
| `1000018371.jpg` | UI แสดง AI summary และ disclaimer เวลา generatedAt 05:15:32; สรุปตรงเรื่องเหนื่อยจากงาน/อยากพัก; 9Q/8Q ไม่มีข้อมูล | เห็นหัวข้อ 1–3 และหัวข้อ 4 แต่ข้อความท้ายหัวข้อ 4 อยู่นอกส่วนที่จับภาพ ยังต้องเก็บภาพท้ายกรอบ |
| `1000018372.jpg` | Diagnostic server: `SERVER_KEY_PRESENT=true`, Next.js 15.5.27, `GEMINI_META={"http":200,"elapsedMs":9936,"finishReason":"STOP"}` | Provider request ที่สังเกตได้สำเร็จใน 9.936s; log ไม่มี correlation ID/timestamp จึงไม่ใช่การผูกคำขอกับภาพ UI แบบแน่นอน |

สรุป UI ที่เห็นไม่ได้เติมอาการนอนไม่หลับสองสัปดาห์หรือคะแนน 9Q=8 จาก CLI fixture ให้ผู้ป่วย A ในฐานข้อมูล UI คะแนน CLI เป็นข้อมูลที่ test ส่งให้ agent โดยตรง ไม่ใช่ข้อมูล screening ที่เขียนลงฐานข้อมูลของเว็บ

`STOP` ยืนยันว่าผู้ให้บริการรายงานการจบ generation ตามปกติ ไม่ใช่หลักฐานว่าเนื้อหาถูกต้องทางคลินิกหรือครบตามข้อกำหนดทุกข้อ

## 5. วิธีสังเกตและข้อจำกัด

Diagnostic server เปิดจาก build ที่มีอยู่ โดยใช้ wrapper ชั่วคราวใน process รอบ fetch ไปยัง Google เท่านั้น ส่ง arguments เดิม ใช้ timeout เดิม และคืน Response เดิม Wrapper อ่าน clone เพื่อแสดง HTTP status, elapsedMs และ finishReason โดยไม่พิมพ์ key, headers, URL เต็ม, request/response text หรือ raw patient payload ไม่มีการแก้ไฟล์ Git หรือเพิ่ม automatic retry

ผล provider 200/STOP ที่มี metadata เป็นผลจาก diagnostic process นี้ ยังต้องกลับไปใช้ startup ปกติและตรวจ UI อีกครั้ง หากต้องการอ้างว่า startup ปกติแสดงสรุปสำเร็จแล้ว การเพิ่ม key โดยตรงและ restart ก่อนผลสำเร็จเป็นหลักฐานด้าน configuration แต่ไม่อธิบายผล live ที่ล้มใน collector ย้อนหลัง

## 6. ข้อมูลสำหรับเติม Evidence Chain / Risk Register

เอกสารแนบ `EVIDENCE_CHAIN.md` และ `RISK_REGISTER.md` ที่อ่านในรอบนี้ยังเป็น SKELETON v0.1 ส่วนแผน reconciliation อ้าง schema v0.2 ที่มีอยู่ในชุดเอกสารอื่น จึงต้องตรวจเอกสารใน Git checkout จริงก่อนรวม addendum นี้ ห้ามเขียนทับ entry เดิม หรืออ้างว่าเอกสารแนบเก่าตรงกับ HEAD โดยไม่มีหลักฐาน

- EC-000: เติม commit, source/lock hashes, รายงาน non-live 16 PASS และผล live/UI รายรอบ; คงสถานะ open จน exit criteria W0 ครบ
- EC-001: บันทึก model/runtime `gemini-3.8-flash` และหลักฐานของรุ่นนี้ ไม่ยกผลคนละ model มาแทน
- RISK-001: ข้อความว่า Gemini “ยังไม่เคยยืนยัน live” ในเอกสารเก่าล้าสมัยเมื่อเทียบกับหลักฐานใหม่นี้ แต่ availability ไม่ได้ผ่านทุกครั้ง และยังไม่มี clinical sign-off; ไม่ปิด risk อัตโนมัติ
- RISK-002: automated authorization suite ผ่านบน commit นี้; manual paired trace allow/deny เก่าคงเป็นหลักฐานของรอบเดิม ไม่ใช่การทดสอบซ้ำบน build ล่าสุด
- RISK-003: Gemini summary success ไม่ใช่ Anthropic Risk/Companion/Auditor live verification

ช่อง Residual Risk, Human Decision และวันที่/ขอบเขตการยอมรับ ยังคงต้องให้ Tor กรอกและตัดสินตามกติกา Risk Register บันทึกนี้ไม่ได้กรอกแทนมนุษย์

## 7. งานที่ยังค้างก่อนพิจารณา freeze

1. เก็บภาพท้ายหัวข้อ 4 ของผล UI ที่มีอยู่ และกลับไป startup ปกติพร้อม key/config ที่ตรงกัน
2. ตรวจ UI/สิทธิ์ข้อมูลของ build ล่าสุดตามขอบเขต W0 หรือบันทึก Human Decision หากยอมรับช่องว่าง โดยไม่สรุปจาก healthy badge ที่ยัง unknown
3. รวมหลักฐานใน docs ของ repository จริงโดยรักษา entry เดิม และตรวจ canonical schema/version
4. Human review และ risk decisions: ความถูกต้องของ synthetic summary, live coverage ของ agent อื่น, dependency audit findings และข้อจำกัด deployment/auth ที่ค้างอยู่ ห้ามอ้างว่า high findings หายไปเพราะ build ผ่าน
5. ตรวจ commit/tag/remote refs ให้ตรงกันและมี push evidence; `tagsAtHead=[]` ในรายงานทั้งสองฉบับ ยังไม่มีหลักฐาน tagged freeze

ไม่มีผลครบ 17 gates ใน suite `--live` ที่ผ่านทั้งรอบในหลักฐานชุดนี้ การใช้ non-live suite และ live รายรอบแยกกันต้องระบุรูปแบบนี้ตามจริง และยังต้อง reconcile กับ exit criteria ของ W0

**W0 remains OPEN. ไม่มีการ freeze/tag/push หรือปิดความเสี่ยงโดยเอกสารนี้**

## 8. หลักฐาน UI เพิ่มเติม — 5 October 2026, 06:12 Asia/Bangkok

ภาพ `1000018374.jpg` ส่งมาหลังคำแนะนำให้กลับไป startup ปกติ แสดง Doctor dashboard ที่ `127.0.0.1:3000` และเวลาใน UI `สร้างเมื่อ 5/10/2569 06:12:32` เป็นผลใหม่จากผล 05:15:32 ไม่ใช่ภาพท้ายของ generation เดิม

สิ่งที่ตรวจได้จากภาพโดยตรง:

- มีคำชี้แจงว่าสรุปสร้างโดย AI ไม่ใช่การวินิจฉัยทางการแพทย์ และใช้ประกอบดุลยพินิจของแพทย์เท่านั้น
- ท้ายหัวข้อ 1 ระบุว่ามีข้อมูลเพียง 1 ข้อความ ยังไม่พอสรุปแนวโน้ม
- หัวข้อ 2 ระบุว่าข้อมูลยังไม่พอระบุประเด็นที่พูดถึงซ้ำ
- หัวข้อ 3 ระบุว่าไม่มีคะแนน 9Q และ 8Q ในช่วงนี้ สอดคล้องกับกราฟที่ยังไม่มีข้อมูล
- หัวข้อ 4 แสดงครบถึงท้ายข้อความ: จำนวนครั้งที่ถูก flag เข้า human review ช่วงนี้ `0 ครั้ง` ไม่เห็นประโยคค้างท้ายในส่วนนี้

ภาพนี้สนับสนุนการแสดงผล AI summary ที่มีท้ายหัวข้อ 4 ครบบน UI และแก้ช่องว่างเรื่องภาพท้ายกรอบในข้อ 7.1 อย่างไรก็ตาม ส่วนต้นหัวข้อ 1 อยู่เหนือพื้นที่ที่จับภาพ ไม่ใช่การตรวจเนื้อหาทั้ง generation แบบครบทุกบรรทัด และค่า 0 ครั้งเป็นข้อความที่สรุปแสดง ไม่ใช่การตรวจนับฐานข้อมูลอิสระ

ภาพไม่มี terminal startup, PID, commit/hash หรือ provider metadata ของ generation 06:12:32 จึงยังไม่ยืนยันโดยลำพังว่ากระบวนการนี้เปิดด้วยคำสั่งปกติแล้ว และห้ามนำ HTTP 200/STOP 9.936s ของภาพ `1000018372.jpg` มาอ้างเป็น metadata ของผลใหม่นี้ ไม่ต้องเรียก provider ซ้ำเพื่อเก็บภาพส่วนท้ายอีก

ขั้นถัดไป: ตรวจชื่อและเนื้อหาเอกสารที่ติดตามใน Termux repository จริงก่อนรวมหลักฐาน โดยรักษา entry เดิม ผล collector FAIL เดิม และ Human Decision ที่ยัง pending ไว้ สถานะ W0 ยังคง OPEN


## Repository-document reconciliation update

Uploaded current-docs ZIP confirms canonical schema v0.2 and existing EC-002/EC-003, RISK-008/RISK-009. The earlier section 6 statement about SKELETON v0.1 refers only to older attachments. This package appends EC-004/EC-005 and updates to all seven supplied documents without deleting prior content. Human fields remain pending. Screenshot 1000018376 shows Termux HEAD 3f6d45b with Roadmap working changes and untracked paths; the installer accepts only the exact supplied Roadmap bytes and preserves them. Images are referenced observations from the conversation; their binaries are not packaged. Package application, docs commit, normal-startup proof, tag/push and risk decisions are not claimed completed. W0 OPEN.
