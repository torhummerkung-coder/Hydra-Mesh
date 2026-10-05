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


## Current-repository evidence update — 2026-10-05 (Asia/Bangkok)

**W0 OPEN — engineering evidence only; no freeze or Human Decision.** This appended update supersedes earlier statements that actual-repository non-live collection and all Gemini live verification are still pending. Earlier results remain historical and are not overwritten.

Candidate: `3f6d45ba7b28cee703d16c2eba6143cea7d5197d`, branch `fix/w0-reconciliation`. Non-live collector on Ubuntu Node v22.23.2/npm 10.9.8 passed 16 gates, with clean/stable tracked source. Tracked-source SHA-256 `5301d431d7704efaabbdf75d89fa49cc47a16b1a1016a00a77c15eb2f48a27f6`; lockfile SHA-256 `83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0`.

Gemini model `gemini-3.8-flash`: live collector failed at its live gate (exit 1; whole test-process duration 14.428s; cause unknown). Subsequent ordinary live test passed (`GEMINI_EXIT=0`, verification time 2026-10-04T21:27:45.291Z). These are separate runs, not one 17-gate live suite PASS. Diagnostic server separately observed HTTP 200 / STOP / 9.936s. UI showed source-data fallback and later available AI summary; screenshot 1000018374 shows generation 2026-10-05 06:12:32 Bangkok, disclaimer and complete section 4 displaying human-review count 0. That screenshot does not bind its request to the earlier diagnostic metadata or independently prove normal startup.

JSON evidence binds the tested code candidate above. This documentation-only patch creates a different tracked-source hash/commit; do not relabel the JSON as evidence collected on the later documentation commit. Review Git diff to establish unchanged executable source/config/lockfile. Tag/push and baseline decision still require actual evidence.

### Evidence reconciliation (engineering fields only)

| Area | Evidence received | Still pending |
|---|---|---|
| Candidate / source | Exact JSON commit/source/lock hashes; non-live clean=true/sourceStable=true | Later docs/tag provenance must not replace the tested candidate identity |
| Commands | Non-live 16 PASS including npm ci, migrate/seed, 11 suites, typecheck/build | No passing complete --live collector run is claimed; failed result retained |
| Google live | Ordinary script PASS, model 3.8, 3 assertions/exit0 in screenshot 1000018360 | Tor content review and current model decision; screenshot lacks standalone commit/hash binding |
| UI summary | Fallback/source readback in 1000018366/8369; AI available in 1000018371; new generation 06:12:32 with complete section 4 in 1000018374 | Screenshot 1000018374 does not independently prove normal startup or inspect every line of that generation |
| Runtime | Diagnostic SERVER_KEY_PRESENT=true, Next 15.5.27, 200/STOP/9.936s | This metadata belongs to diagnostic process; no exact join to later UI result |
| Rights | Current automated suite PASS; older manual paired allow/deny trace evidence | Reconcile existing manual scope or perform only genuinely missing cases; do not waive privacy failure |
| Human authority | No new Human Decision supplied | Model choice, synthetic-content review, gap classification, intended-use and baseline approval |
| Git | Termux screenshot 1000018376: HEAD 3f6d45b; Roadmap modified; evidence/w0 and odd prisma path untracked | Review working changes; actual baseline tag/push/remote refs not evidenced |

### Human review queue — unapproved

1. Confirm intended use of this baseline (MVP/Portfolio Demo or another scope) and chosen Google model; prior Anthropic acceptance is not silently reapplied.
2. Review synthetic Thai summary against its input; distinguish fixture 9Q=8 in CLI from absent screening values in the UI database.
3. Classify Anthropic live gap, manual UI gaps, dependency findings and local deployment limits with owner/reason/scope/re-review where permitted. Safety/authorization failures cannot be waived merely as known gaps.
4. Assess timeout limitations and evidence sufficiency; STOP and one successful request are not clinical/availability certification.
5. Record baseline approval only after criteria are reconciled, then create/check/push actual tag and record remote hashes.

**Human Decision / Residual Risk / decision dates remain pending.** This queue does not populate them or assert BLOCKER=0. Do not rerun the entire non-live suite solely for this append-only docs patch; inspect that code/config/lockfile diff is empty, retain candidate provenance, and run additional checks only for actual changes or unresolved failures.


## Human model-selection decision — 2026-10-05

| Decision item | Human decision now received | Remaining review |
|---|---|---|
| Google / effective model for the synthetic MVP/Portfolio Demo baseline | Tor selects gemini-3.8-flash instead of 3.7 on 2026-10-05; owner reports 3.7 could not run in his environment | Separate synthetic-content review, residual-risk/gap decisions and baseline approval remain pending |

See EC-006 and `decisions/W0_MODEL_DECISION_2026-10-05.md`. The model-choice portion of human review queue item 1 is now resolved. Do not interpret this as an approval of real-patient use, all agent live coverage, risk acceptance or a freeze. W0 OPEN.


## W0 follow-up and scoped G-06 approval — 2026-10-05

Normal production startup in the synthetic local demo was observed (Ready 3.6s). The targeted unowned-trace authorization test and typecheck passed on Ubuntu (AUTH_CHECKS_EXIT=0); current observed HEAD is `0ed5f52ab45daca58a9998d0abe38f82d2c852af`. Production-subset audit: 0 / exit0; full audit including dev: 5 high / exit1. Tailwind 3.4.19 uses static checked content globs; known braces risk remains.

At 2026-10-05 13:04:20 Asia/Bangkok, นายศุภกร โคตะมา, เจ้าของโครงการและผู้ออกแบบระบบ — Project Owner & System Architect, explicitly accepted **G-06 only within the current work context**. Keep the current Tailwind3 baseline for trusted local builds and synthetic MVP/Portfolio Demo on 127.0.0.1; no public/real-patient/untrusted-build expansion. Review by 2026-10-19 or earlier on scope/config/input/advisory change. The full scope, residual risk and selected signature are in `docs/decisions/W0_G06_ACCEPTANCE_2026-10-05.md`; observed evidence is in `evidence/w0/2026-10-05/HYDRA_W0_FOLLOWUP_EVIDENCE.md` (paths from repository root).

This supplements historical pending startup/trace/dependency statements without deleting failure history. Accepted is not closed: full audit remains 5 high. Existing RISK-001–009 and other gap/baseline decisions are not approved by this decision. **W0 OPEN**; no code/config/dependency change, new full collector/build/live run, tag/main merge or remote push is claimed.


## G-01 local synthetic demo limitation — 2026-10-05

นายศุภกร โคตะมา — เจ้าของโครงการและผู้ออกแบบระบบ / Project Owner & System Architect — explicitly approved the live-Anthropic verification limitation for local synthetic-data demo only, 2026-10-05 15:01:39 Asia/Bangkok. Decision: HD-W0-ANTHROPIC-2026-10-05. Signed-image record: `docs/decisions/W0_G01_LOCAL_DEMO_ACCEPTANCE_2026-10-05.md`; historical access evidence: `evidence/w0/2026-10-05/HYDRA_W0_ANTHROPIC_ACCESS_EVIDENCE.md` (paths from repo root).

**G-01 / RISK-003 remain OPEN under the original HydraMesh requirements**; W3 live/behavior follow-up remains. Historical Hydra-Mesh01 WIF exchange success followed by Messages API HTTP400 / low-credit / exit1 is not current Hydra-Mesh agent verification. No new PASS, clinical/public/real-patient approval, other-gap acceptance, final baseline/tag/freeze/main merge is implied. **W0 OPEN**.


## G-03 temporary owner acceptance with mandatory Phase 2 correction — 2026-10-05 21:55:43 Asia/Bangkok

Human Decision **HD-W0-G03-TEMP-2026-10-05**: นายศุภกร โคตะมา — Project Owner & System Architect — approved the explained G-03 proposal for controlled local synthetic demo only. Demo/testing may continue; this is **not certification that the system is ready for real-world use**. Preserve low-load operator conditions, authorization/assignment/revocation boundaries and truthful read-timeout failure. No source/summary on clinical-read timeout is claimed; timeout does not cancel underlying work.

**Mandatory correction within Phase 2:** use this period to diagnose, fix and verify G-03 code/work-control behavior under the existing Phase 2 scope and procedures. Other work may proceed first, but this item is not indefinitely deferred. The temporary acceptance **ends with Phase 2 closure and must not extend beyond it**. Phase 2 must not be declared closed on the strength of this exception while G-03 correction/verification remains unfinished; record acceptance expiry and the actual verified disposition at closeout. No calendar deadline was supplied; preserve the event-bound Phase 2 deadline without inventing a date.

Owner distinguishes G-03 code debugging from the Agent-model/provider-access limitation. Current source and controlled results show non-cancellation in code; the exact final remedy remains to be selected and tested. Do not attribute this issue to model quality or solve the recorded code issue merely by changing a model. G-02 temporary model/provider/API-access decision remains separate and unchanged.

**G-03/RISK-008 and W0 OPEN.** Nine current-phone synthetic checks are retained as bounded evidence, not cancellation/load/UI/in-flight-revocation or production readiness proof. No actual authorization/privacy/safety defect waiver, new runtime change, additional test/API run, signature image, W0 closure, baseline/tag/freeze/main merge. Prior PENDING G-03 statements are historical and supplemented by this explicit owner decision; full conditions and verbatim authorization: `docs/decisions/W0_G03_TEMPORARY_ACCEPTANCE_2026-10-05.md`.
