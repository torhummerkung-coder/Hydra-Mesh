# แผนงานคู่ขนาน — Demo และ Production Readiness

## ขอบเขตรอบนี้

Docs-only: สร้างเอกสาร/ทะเบียน/เครื่องมือสร้างรายงานใน `docs/assurance/` พร้อมข้อเสนอเชื่อม README หลังตรวจ Repo จริง
ไม่ย้ายหรือเขียนทับ source/evidence/governance เดิม ไม่แก้ CI ไม่ติดตั้ง dependency
การตรวจ JSON/hash/การสร้างรายงานเป็น document QA ไม่ใช่การรัน D05 test suite

## ลำดับส่งมอบและจุดจบที่วัดได้

| Work package | งาน | Definition of Done | ขึ้นกับ |
|---|---|---|---|
| WP-01 | ทะเบียนกลาง + เอกสารคู่ | ทั้งสองรายงานมี revision และ hash เดียวกัน; H-01–H-06 และ gap D05 ครบ | ทำใน R1 |
| WP-02 | เทียบ 24 methods กับประวัติ | ทุกแถวมี objective/oracle/hash/crosswalk/decision; unknown ไม่เติมศูนย์ | source + historical evidence |
| WP-03 | กระทบยอดบัญชี | ต่อ case/group มี known starts, reservations, unknown, cap และ balance พร้อมเวลาหรือระบุ unknown | WP-02 + ประวัติครบตามขอบเขต |
| WP-04 | กำหนด demo walkthrough | รายการหน้าจอ/flow/data/expected behavior/mock boundaries กับ Owner acceptance | current Repo + ขอบเขตฟังก์ชัน |
| WP-05 | หลักฐานเครื่อง | exact pin, storage/network controls, operator, exclusive execution และผลตรวจจริง | เครื่องเป้าหมาย; HOST-EVIDENCE-PLAN |
| WP-06 | ตัดสิน route และ freeze | tranche ที่ชัด source/env/order/bounds/accounting และ Owner decision ครบ | WP-02/03/05 + reviewed route design |
| WP-07 | bounded validation | รันเมื่อ prerequisites ผ่าน เก็บ stdout/stderr/events และ failures; no auto-retry | WP-06 + authorization |
| WP-08 | Demo acceptance | walkthrough ผ่านตามเกณฑ์ล่วงหน้า ข้อผิดพลาดที่กระทบ demo ปิด/ตัดขอบเขตอย่างเปิดเผย | WP-04/07 |
| WP-09 | Production evidence backlog | deferred reviews, real integration, operations, security/clinical และ release decision มีเจ้าของ/หลักฐาน | เดินคู่ขนาน; ไม่สืบทอด Demo PASS |

## สิ่งที่เสร็จในรอบเอกสาร R1 และการปรับ R2

- เตรียมทะเบียนกลาง รายงานสองฉบับและ event history
- เทียบ identity fields ทั้ง 24 แถวระหว่าง manifest กับ accounting ที่ส่งกลับ และตรวจ source file hashes
- จัดทำ objective/oracle crosswalk 24 แถว; canonical และ balance ยัง null เพราะยังไม่ adjudicate
- ออกแบบขั้นตอน host/admission/recovery และหลักฐานรับงาน; ยังไม่ติดตั้งหรือพิสูจน์ runtime
- R1 เตรียม overlay; R2 ตรวจ main HEAD และสร้าง docs-only change set จาก base ที่ระบุ พร้อมเชื่อมเอกสารเดิม

## Historical accounting reconciliation

อ่านประวัติใน supplied archives และชุดผลปัจจุบันอย่างคง bytes ไม่รันซ้ำเพื่อสร้างประวัติใหม่
ระบุ corpus ที่ค้น วันตัดยอด ความครบถ้วนของเครื่อง/runner/alias และรายการที่เข้าถึงไม่ได้
Owner-reported 0 prior starts สำหรับงาน D05 รอบนี้เป็น self-report; ไม่เท่ากับ global history 0
ข้อมูล G03 อยู่คนละ lineage และไม่ใช่หลักฐานว่า D05 มีสิทธิ์เริ่มฟรี
ถ้าประวัติขาด ให้ออก missing-evidence record และเสนอ policy decision แยกจากผลกระทบยอด

## Demo walkthrough ที่ต้องยืนยันจาก source ที่เลือก

ยืนยันรายการ Login/Patient/Clinician/Admin ที่มีจริงใน source เป้าหมาย ระบุส่วน mock/stub
เส้นทางสำเร็จ เส้นทางปฏิเสธ เส้นทาง fallback/timeout และกลับสู่หน้าจอเดิม
แสดง synthetic/demo label และขอบเขต clinical interpretation; ข้อมูลต้องไม่ทับคนไข้เมื่อเปลี่ยนบริบท
บันทึก source identity, environment, steps, expected/observed, reviewer และ evidence refs
R2 tree/README พบ index/login, companion และ dashboard; ยังไม่พบหลักฐานว่า prototype สี่บทบาทถูก integrate แล้ว จึงไม่เพิ่ม feature scope โดยอัตโนมัติ

## Stop conditions

พบ secret/PHI, source/manifest mismatch, unknown accounting, isolation failure หรือสิทธิ์ไม่ตรง operation
ให้หยุดเฉพาะ lane ที่ได้รับผลและเก็บเหตุการณ์ งานเอกสาร/วิเคราะห์ที่ได้รับอนุญาตยังเดินต่อได้

## R3 continuation — completed preparation work

WP-02: bounded corpus search completed; 24 method rows now carry search references and proposed adjudication rationale.
WP-03: supplied G03 record index deduplicated and four accounting lineages separated; authoritative budget acceptance remains pending.
Current standalone r4 artifact recovered from stored original; exact receipt hash/size and CRC of 889 members verified. Damaged copy preserved; no reruns.
Next: obtain identified legacy identity/raw-accounting evidence, finalize Owner semantic decisions, and select exact demo walkthrough/host controls.
