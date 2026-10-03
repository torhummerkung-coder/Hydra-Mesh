# HYDRA Mesh — Phase 2 Kickoff Checklist

**วันที่เริ่มโครง:** 2026-09-24  
**หลัก:** VERIFY WHAT WE BUILT

## A. ก่อนแตะ runtime เพิ่ม

- [ ] Reconcile W0 จากหลักฐานล่าสุด
- [ ] แยก BLOCKER / ACCEPTED GAP / DEFERRED
- [ ] typecheck = pass
- [ ] production build = exit 0
- [ ] full regression ที่กำหนด = pass
- [ ] current Clinical Summary model/version ตรงกับ live evidence
- [ ] baseline commit/tag/push/record พร้อมอ้างอิง

## B. Evidence framework

- [ ] ใช้ `EVIDENCE_CHAIN.md`
- [ ] ใช้ `RISK_REGISTER.md`
- [ ] เปิด EC-001 สำหรับ model/version migration
- [ ] ทุก safety change เชื่อม EC ↔ RISK ↔ Test ↔ Artifact

## C. Live provider / Risk Engine

- [ ] ตัดสิน fail-safe direction ของ RISK-003 โดย Tor
- [ ] เตรียม Anthropic live test
- [ ] ถ้าใช้ GitHub Actions: ทำ WIF/OIDC smoke test ก่อน
- [ ] จากนั้น test token exchange → Hello Claude → Risk Engine live
- [ ] เก็บ evidence โดยไม่ expose token/secret

## D. Fallback / Companion

- [ ] นิยาม P0–P4 ให้ตรง code จริง
- [ ] Safety / Companion / Delivery lanes
- [ ] local safety floor: no-match ≠ safe
- [ ] pending / queued / acknowledged state machine
- [ ] false-delivery deliberate-fail test
- [ ] idempotency/reconnect/recovery tests
- [ ] Companion contract: safety + presence + honesty + Care ≠ Control

## E. Governance / Role / Privacy

- [ ] Security Constitution 15 rules → tested/design/deferred map
- [ ] capability-driven Role Projection
- [ ] positive + negative permission tests
- [ ] doctor source-data fallback เมื่อ AI summary unavailable
- [ ] privacy-safe telemetry / no unnecessary raw patient text
- [ ] intended-use + claims/non-claims + external-provider data flow

## F. Human review path

- [ ] ติดต่อ clinician สำหรับ 8Q/9Q
- [ ] เตรียม review package แบบ non-programmer
- [ ] ระบุ official 8Q/9Q source/version
- [ ] ระบุ Human Decision authority ต่อ residual-risk class
- [ ] reviewer ของ Thai fallback primitives
