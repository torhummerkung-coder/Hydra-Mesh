# D05 H-01–H-06 — แบบปิดงานตามขอบเขต

Design only. ยังไม่มี code change, runner provisioning, dispatch หรือ exception ที่ถูก grant จากเอกสารนี้

| ID | Demo exit criterion | Production / original D05 exit criterion |
|---|---|---|
| H-01 | Owner adjudication พร้อม semantic rationale และ history search; self-adjudicated label | Registry authority/independent review ตามเกณฑ์ที่รับไว้; aliases/history ครบ |
| H-02 | ยอดและสิทธิ์เริ่มที่กระทบยอดได้; unknown ยัง HOLD จนแก้หรือมี policy amendment ที่เจาะจง | Authoritative shared accounting พร้อม concurrent reservations และ freshness |
| H-03 | เลื่อน independent review; Owner freeze ของชุดจริงเมื่อ prerequisites ครบ | Independent freeze โดยผู้ตรวจแยกจากผู้จัดทำ ผูก exact artifacts |
| H-04 | พิสูจน์ host/network/exclusive controls ที่เหมาะกับ synthetic workload จริง | Assessed deployment identity/IAM/network/runtime controls สำหรับ production workload |
| H-05 | เลือกและ grant route ที่ระบุจริง; manual ถ้าอนุมัติใช้ label MANUAL_BOOTSTRAP_NOT_D05_ATTESTATION | Trusted admission และ authenticated/fenced runner ที่ operationally verified |
| H-06 | คง G03/RISK008/W0 OPEN | ปิดแต่ละ gate ด้วยหลักฐาน/อำนาจของ gate นั้นแยกกัน |

## H-01: semantic adjudication

ตาราง `registry/case-crosswalk.json` มี 24 แถวจาก exact manifest และ external accounting amendment
ชื่อ group/class ในตารางเป็นข้อเสนอ; group เดียวไม่แปลว่า canonical case เดียว
ตัดสินจาก objective + setup + oracle + historical aliases ไม่ใช่ method name
ทุกคำตัดสินเก็บ decision reference และเหตุผล; genuine new case ต้องมีเหตุผลเชิงความหมายก่อน preregistration
ข้อดี: ป้องกัน duplicate free rights. ต้นทุน: ต้องค้นและอธิบายแต่ละ lineage. ไม่รับประกันกู้ history ที่หายได้

## H-02: accounting protocol ที่ต้องทำให้เกิดจริง

ต่อ group เก็บ class/cap (candidate base Major 5 / Minor 8 retry slots), per-case first entitlement,
prior starts, live reservations, unknown และ ledger snapshot time/source
อย่านับ UNKNOWN ซ้ำทั้ง started และ held: reservation ID เดียวมี accounting state เดียว
remaining retry = cap - retry_started - retry_held โดย unknown ที่ยังไม่ตัดสินคง held หรือ started ตามหลักฐานเดิม
สูตรนี้ใช้ได้เมื่อรายการและ cap ถูกยืนยันครบ; ไม่ใช้ null เป็น 0
ก่อน dispatch ตรวจ snapshot ยังใช้ได้และจองแบบ atomic; replay เดิมคืน reservation เดิมโดยไม่ launch ซ้ำ
แยก tranche ได้เพื่อลดจำนวนงาน แต่ไม่เพิ่ม budget หรือเปลี่ยน canonical lineage
ข้อดี: ตรวจสิทธิ์ย้อนกลับได้. ต้นทุน: global controller/history integration. Unknown budget ไม่หายเพราะทำ demo

## H-03: freeze record

บันทึก source/test/oracle/controller/child hashes, case identities, method order, bounds,
target environment, accounting snapshot/reservations, selected route, Owner decision และ exclusions
เก็บเป็น immutable revision พร้อมเก็บต้นฉบับเดิม; hash mismatch => HOLD ก่อน effect
Owner freeze ใน demo ไม่เรียก independent; hash ไม่ใช่ identity proof หรือ authenticated grant

## H-04: containment

ใช้ HOST-EVIDENCE-PLAN. Crypto 47 อยู่ในช่วง >=44,<48 จาก setup artifact; ไม่ต้อง reinstall เพราะ range mismatch
PRoot/venv/Python audit hooks อย่างเดียวไม่พิสูจน์ OS sandbox หรือ network containment
ถ้า host เดิมทำตาม control ไม่ได้ ให้เสนอ environment delta ก่อนติดตั้ง/ย้ายระบบ

## H-05: ตัวเลือกและฐานความเชื่อถือ

| Route | สิ่งที่ต้องมี | ข้อดี | ข้อจำกัด |
|---|---|---|---|
| Manual bootstrap | explicit Owner-scoped exception ผูก tranche/frozen hashes/env/budget; control operator + journal | ลดภาระระบบภายนอกสำหรับ bounded demo | local decision JSON เป็น documentary; ไม่ใช่ D05 attestation; ยังมี crash/UNKNOWN และต้องแก้ accounting |
| Trusted external | externally controlled issuer/verifier, authoritative ledger, revocation, authenticated launcher/fencing | พิสูจน์ admission boundary ได้ใกล้เป้าหมาย D05 | ต้อง provision และมี operational evidence; เพิ่งสร้างระบบไม่ได้ทำให้ trusted โดยอัตโนมัติ |

Owner ต้องเลือกบนแบบที่ทำได้จริงหลังทราบ host และ budget; ข้อความว่าเป้าหมาย demo ไม่ได้ grant manual exception
อย่าเปลี่ยน candidate runner ที่ hard-HOLD ให้กลายเป็น bypass เพื่อให้ชุดทดสอบผ่าน

## State transitions และ failure semantics ที่เสนอ

1. PREREGISTERED: identity/manifest/environment/decision verified ก่อน effect
2. RESERVED: authoritative account จอง entitlement/slot ด้วย unique intent และ reservation; snapshot นี้ต้อง durable
3. DISPATCH_INTENT: durable journal ระบุ method/source/env/fence/reservation ก่อน Popen
4. LAUNCH_ATTEMPTED: หลังเข้าสู่การสร้าง process ให้ถือว่ามีความเป็นไปได้เริ่มแล้ว
5. START_OBSERVED: เก็บ PID พร้อม process-start identity/run-id; PID อย่างเดียว reuse ได้
6. FINISHED: stdout/stderr hashes, exit/wallwatchdog/result และ resource observations
7. UNKNOWN_START: crash/lost ACK ระหว่าง 4–6 => stop tranche, no auto-retry/refund; preserve original account hold

`Popen` กับ journal ไม่ atomic; ย้าย START ไว้ก่อน Popen จะสร้าง false-start evidence ไม่ใช่แก้ปัญหา
current controller ไม่ได้พิสูจน์ global atomic reservation หรือ cross-host lock ต้องไม่โฆษณาว่าทำแล้ว
lock ต่อ host ป้องกันได้เฉพาะ host; cross-host ต้องใช้ shared authoritative reservation/fencing
ก่อนกลับมารันหลัง crash ต้องพิสูจน์ process quiescence และมี adjudication event; ไม่เปิดใหม่เพราะ lock เก่าหาย
source hashes ต้องตรง ณ effect boundary; การกัน TOCTOU และ trusted revocation check ต้องออกแบบ/พิสูจน์ตาม selected route

## ลำดับอนุมัติและการเปลี่ยน source

รอบนี้จัดทำ design เท่านั้น. implementation work package ต้องระบุ path allowlist, exact host,
dependencies/no-install, bounded verification, accounting และ acceptance criteria ก่อนเปลี่ยน runtime controls
การแก้ source ทำให้ frozen hashes เปลี่ยน ต้องออก revision ใหม่ ไม่แก้ manifest เดิมย้อนหลัง
Runtime acceptance ต้องมี negative/replay/crash/timeout/isolation evidence ตาม scope ที่อนุมัติ
