# HYDRA-Mesh — Demo / Production Readiness

วันที่จัดทำ: 15 ตุลาคม 2026 · Asia/Bangkok · Revision R3

ชุดเอกสารนี้ใช้ทะเบียนข้อเท็จจริงกลาง แล้วสร้างรายงาน Demo และ Production Readiness ควบคู่กัน
Owner มอบหมายให้จัดทำและอัปเดตเอกสารใน GitHub เมื่อ 2026-10-15 16:35+07:00 ตามบริบทข้อความที่ได้รับ
นี่เป็น documentary authorization สำหรับงานเอกสาร ไม่ใช่ PKI identity verification หรือผลรับงานระบบ

## เอกสารหลัก

| ไฟล์ | วัตถุประสงค์ |
|---|---|
| [DEMO.md](DEMO.md) | สถานะและเกณฑ์รับ Demo พร้อมข้อจำกัด |
| [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) | ช่องว่างก่อน production และหลักฐานที่ต้องได้ |
| [DUAL-TRACK-POLICY.md](DUAL-TRACK-POLICY.md) | กฎข้อเท็จจริงร่วม การแก้ไข และสิทธิ์กล่าวอ้าง |
| [PLAN.md](PLAN.md) | แผนงาน ลำดับ dependency และเกณฑ์จบงาน |
| [D05-CLOSURE-DESIGN.md](D05-CLOSURE-DESIGN.md) | ทางแก้ H-01–H-06 และแบบ runner ที่ยังไม่ติดตั้ง |
| [HOST-EVIDENCE-PLAN.md](HOST-EVIDENCE-PLAN.md) | หลักฐานเครื่องรันที่ต้องเก็บจริง |
| [DECISIONS.md](DECISIONS.md) | สิ่งที่ Owner กำหนดแล้ว / สิ่งที่ยังเสนอ |
| [GITHUB-HANDOFF.md](GITHUB-HANDOFF.md) | ขอบเขตนำเข้า Repo และสิ่งที่ต้องตรวจจาก HEAD จริง |
| [registry/ledger.json](registry/ledger.json) | ทะเบียนกลางและสถานะสองขอบเขต |
| [registry/case-crosswalk.json](registry/case-crosswalk.json) | 24 methods พร้อม objective/oracle และข้อเสนอ mapping |
| [CHANGELOG.md](CHANGELOG.md) | ประวัติการเปลี่ยน revision |

## สถานะเริ่มต้น

Demo: PREPARATION / NOT_ACCEPTED. Production: NOT_READY. D05: NOT_RUN / admission HOLD.
Independent review ถูกเลื่อนสำหรับเป้าหมาย demo ตามทิศทาง Owner แต่ยังไม่ใช่ independent freeze
และไม่ทำให้ runner, budget หรือ environment ผ่านโดยอัตโนมัติ G03 / RISK008 / W0 คง OPEN

ส่วน D05 ในแพ็กนี้เป็นองค์ประกอบย่อย ไม่ใช่รายการความพร้อมของ Hydra-Mesh ทั้งโครงการ
R2 ตรวจ main base `295893a7e4cc6f32839eb8a90d1ced5cae963866` และ workflow แล้ว; การตรวจนี้เป็น docs/content inspection ไม่ใช่ runtime/CI PASS. G03/D05 ยังอยู่ใน Draft PR แยก ไม่อ้างว่า merged

## การอัปเดต

แก้ข้อเท็จจริงและสถานะที่ `registry/ledger.json` เพิ่ม correction event โดยไม่ลบประวัติเดิม
แล้วเรียก `python3 docs/assurance/tools/render_views.py` จาก root ของ Repo
ตรวจความสอดคล้องด้วย `python3 docs/assurance/tools/render_views.py --check`
ทั้งสองรายงานต้องเปลี่ยนใน commit เดียวกันเมื่อทะเบียนเปลี่ยน แม้สถานะขอบเขตหนึ่งจะไม่เปลี่ยน
คำสั่งนี้สร้าง/ตรวจเอกสารเท่านั้น ไม่ import candidate ไม่ dispatch tests และไม่เพิ่มสิทธิ์รัน

## R3 — งานกระทบยอดที่ทำต่อแล้ว

อ่าน [ผลค้นประวัติ](HISTORY-RECONCILIATION.md), [ข้อเสนอราย method](CASE-ADJUDICATION.md) และ [lineage บัญชี](registry/accounting-lineages.json)
ผลค้นไม่ใช่ authoritative balance; สถานะ H-01/H-02 ยังแยกจากความสำเร็จของงานค้นเอกสาร
