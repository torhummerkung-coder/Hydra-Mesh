# HYDRA W0 — Corrective verification

**วันที่:** 2026-10-04 (Bangkok), execution timestamp UTC: 2026-10-03T18:42:28.754Z
**สถานะ:** W0 OPEN — ยังไม่ใช่ VERIFIED / BASELINE FROZEN

## สิ่งที่แก้

1. Gemini contract ตั้ง 3.8 และตรวจ request URL เป็น 3.8 ตรงกันแล้ว; assertion ยังคงระบุ expected model โดยตรง ไม่อ่านค่าจาก implementation มาเทียบตัวเอง
2. Scoring assertion ล้มเหลวต้อง throw และคืน exit 1; ไม่มีการเปลี่ยน threshold หรือ scoring engine
3. Live script พิมพ์ effective model และเวลารัน แทนข้อความรุ่นตายตัวที่อาจผิดเมื่อ override
4. Roadmap ส่วนสถานะปัจจุบันตรงกับ configured candidate 3.8; decision log เดิมยังอยู่ และไม่สร้าง Human Decision เลือกรุ่นแทน Tor
5. เอกสาร Phase2 ใช้ schema จากแพ็ก v0.2 เดียวกัน พร้อม archive เอกสาร corrective เดิมและ ID migration; EC-002 เก็บ clinical cross-check, EC-003 engineering correction, RISK-008 deadline, RISK-009 false-green gate
6. Runbook ใช้ npm ci, โหลด environment ให้ standalone scripts, production build ปิด demo auth และใช้ NODE_ENV=production; runner ตรวจทั้ง exit code, spawn error และ FAIL markers
7. ยืนยันด้วย source inspection ว่า supplied endpoint มี 15s deadline ใน 4 clinical reads และ auth คง 3s; ยังไม่ได้ benchmark/controlled slow-read test เพื่อยืนยัน latency mitigation

## ขอบเขตหลักฐาน

ทดสอบบน reconstructed source ที่ประกอบจาก candidate ก่อนหน้า + corrective overlay ที่แนบมา ไม่ใช่ Git checkout ล่าสุดของผู้ใช้ ไม่มี commit/tag metadata ให้ตรวจ ยังคงใช้ dependencies ที่ติดตั้งไว้ในรอบก่อนหน้า ไม่ได้รัน npm ci ใหม่รอบนี้

Node v24.19.0; ใช้ synthetic SQLite/test accounts และ secret เฉพาะเครื่อง ไม่แนบ .env.local, database, node_modules, build output หรือ raw seed output

Model 3.8 เป็น config ที่ได้รับมา; mock pass ไม่ยืนยันว่า provider เปิดใช้รุ่นนี้ ไม่ได้เรียก Gemini/Anthropic live ในรอบนี้

| Gate | Exit | FAIL markers | ผล |
|---|---:|---:|---|
| `db:migrate` | 0 | 0 | PASS |
| `db:seed` | 0 | 0 | PASS |
| `test:db` | 0 | 0 | PASS |
| `test:patient-encryption` | 0 | 0 | PASS |
| `test:clinical-data-encryption` | 0 | 0 | PASS |
| `test:auth-and-security-queue` | 0 | 0 | PASS |
| `test:clinician-authorization` | 0 | 0 | PASS |
| `test:fallback` | 0 | 0 | PASS |
| `test:clinical` | 0 | 0 | PASS |
| `test:audit` | 0 | 0 | PASS |
| `test:fallback-integration` | 0 | 0 | PASS |
| `test:fallback-storage` | 0 | 0 | PASS |
| `test:clinical-summary-contract` | 0 | 0 | PASS |
| `typecheck` | 0 | 0 | PASS |
| `build` | 0 | 0 | PASS |

รวม 11 non-live test suites + migration/seed + typecheck/build = 15 gates ผ่านทั้งหมด การรันใช้ synthetic data; ไม่ใช่ clinical validation

### Negative controls

- Contract ก่อนแก้: exit 1 เพราะ request Gemini3.8 ไม่ตรง stale regex3.7 (`evidence/contract-before.log`)
- จงใจเปลี่ยน scoring expected total ของคำตอบศูนย์จาก 0 เป็น 1 ในสำเนา test ชั่วคราว: มี FAIL และ exit1 (`evidence/scoring-negative.log`); ไม่แก้ production scoring
- หลังปรับข้อความอธิบาย/comment ครั้งสุดท้าย: ตรวจ syntax runner และรัน clinical/contract ซ้ำ ผ่าน; production logic ไม่เปลี่ยนจาก full regression snapshot

## หลักฐานและสถานะที่ต้องเพิ่มก่อนปิด W0

| งานที่เหลือ | หลักฐานที่ต้องใช้ | ผู้ดำเนินการ/ตัดสินใจ |
|---|---|---|
| ใช้ patch กับ repo จริง | commit SHA, lockfile hash, npm ci exit0, regression/typecheck/build บน commit เดียวกัน | Tor / repo maintainer |
| Runtime Gemini ตรง live evidence | provider + effective model + timestamp + commit + redacted log, 3 assertions และตรวจ synthetic Thai summary | ผู้มี provider access; Tor ตัดสินใจ model |
| Environment sanity | production startup demo auth disabled; ตรวจ config โดยไม่เผย secret | repo maintainer |
| Doctor UI | assigned patient เข้าถึงได้; unassigned/ownership ไม่ชัดถูกปฏิเสธ; source/fallback เมื่อ summary unavailable หรือ accepted UI gap ที่ลงเหตุผลและ authority | Tor / tester |
| Deadline residual risk | หากใช้ deadline เป็น mitigation ที่ verified: controlled slow-read/timeout evidence; timeout ไม่ยกเลิกงานเบื้องหลังโดยอัตโนมัติ | repo maintainer + Tor ประเมิน |
| Gap classification | BLOCKER=0; accepted gap ต้อง owner, reason, scope, residual risk, Human Decision/date/re-review | Tor / authorized human |
| Freeze provenance | actual commit/tag + push/remote evidence + baseline decision | Tor / repo maintainer |

Historical legacy RISK-003 acceptance (Tor, 2026-09-22) ถูกเก็บตามเอกสารต้นทาง ใช้เฉพาะ MVP/Portfolio Demo ตามขอบเขตเดิม ไม่ใช่ Phase2 closure และไม่ใช่การอนุมัติ proposed fail-safe ใหม่ หาก baseline อยู่ในขอบเขตนี้ ให้มนุษย์ยืนยันการใช้ decision เดิม; หากใช้ clinical/production ต้องประเมิน live evidence และความเสี่ยงตามขอบเขตนั้นก่อน

`accepted` ไม่เท่ากับ `closed` และ test PASS ไม่แทน Human Decision ไม่มีการอ้างว่าระบบปลอดภัยทางคลินิกจากผลรอบนี้

## นำเข้า repo

แพ็กนี้เป็น **overlay ไม่ใช่ full repository** เปรียบเทียบกับ checkout จริงก่อนวางไฟล์ทับ เพื่อรักษางานใหม่ที่อาจมีหลัง source ZIP นำไฟล์ที่แก้เข้า working branch แล้วทำตาม PHASE1_FREEZE_RUNBOOK.md; ไม่ tag/freeze จากแพ็กนี้โดยอัตโนมัติ

Evidence metadata: `evidence/results.json`, `input-provenance.json`, `reconstructed-source-manifest.json`. Source manifest ใช้ระบุไฟล์ที่ประกอบไว้ ไม่ใช่ Git commit และไม่พิสูจน์ dependency/runtime provenance ทั้งหมด

## Follow-up evidence collection kit

`collect-w0-evidence.mjs` และ `docs/W0_CLOSEOUT_WORKSHEET.md` เพิ่มสำหรับเก็บหลักฐานใน repo จริง ตรวจ syntax และ control tests ด้วย synthetic Git/npm fixtures: clean checkout บันทึก commit/hash ได้, dirty checkout ถูกปฏิเสธ, npm exit0 แต่พิมพ์ FAIL ถูกนับเป็น failure และหยุดก่อน gate ถัดไป (`evidence/collector-verification.json`). ไม่ได้รัน collector เต็มชุดบน repo จริงของผู้ใช้ จึงไม่เพิ่มสถานะ W0 และผล regression เดิมยังคงมีขอบเขตตามรายงานข้างบน


## Current-repository evidence update — 2026-10-05 (Asia/Bangkok)

**W0 OPEN — engineering evidence only; no freeze or Human Decision.** This appended update supersedes earlier statements that actual-repository non-live collection and all Gemini live verification are still pending. Earlier results remain historical and are not overwritten.

Candidate: `3f6d45ba7b28cee703d16c2eba6143cea7d5197d`, branch `fix/w0-reconciliation`. Non-live collector on Ubuntu Node v22.23.2/npm 10.9.8 passed 16 gates, with clean/stable tracked source. Tracked-source SHA-256 `5301d431d7704efaabbdf75d89fa49cc47a16b1a1016a00a77c15eb2f48a27f6`; lockfile SHA-256 `83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0`.

Gemini model `gemini-3.8-flash`: live collector failed at its live gate (exit 1; whole test-process duration 14.428s; cause unknown). Subsequent ordinary live test passed (`GEMINI_EXIT=0`, verification time 2026-10-04T21:27:45.291Z). These are separate runs, not one 17-gate live suite PASS. Diagnostic server separately observed HTTP 200 / STOP / 9.936s. UI showed source-data fallback and later available AI summary; screenshot 1000018374 shows generation 2026-10-05 06:12:32 Bangkok, disclaimer and complete section 4 displaying human-review count 0. That screenshot does not bind its request to the earlier diagnostic metadata or independently prove normal startup.

JSON evidence binds the tested code candidate above. This documentation-only patch creates a different tracked-source hash/commit; do not relabel the JSON as evidence collected on the later documentation commit. Review Git diff to establish unchanged executable source/config/lockfile. Tag/push and baseline decision still require actual evidence.

Actual-repository evidence is now recorded separately from the reconstructed-source tests above. Full JSONs and report: `evidence/w0/2026-10-05/`. Do not replace historical results with later runs. EC-004 records deadline/completion fixes, EC-005 records actual candidate verification. Previous controlled slow-read, clinical review and baseline tag limitations still apply.
