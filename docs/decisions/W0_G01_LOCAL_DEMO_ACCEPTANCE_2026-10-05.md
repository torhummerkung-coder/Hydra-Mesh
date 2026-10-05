# HD-W0-ANTHROPIC-2026-10-05 — G-01 local synthetic demo limitation

- ผู้อนุมัติ: **นายศุภกร โคตะมา**.
- บทบาท: **เจ้าของโครงการและผู้ออกแบบระบบ — Project Owner & System Architect**.
- เวลาข้อความอนุมัติ: **2026-10-05 15:01:39 Asia/Bangkok** (2026-10-05T08:01:39Z).
- ข้อความอนุมัติจริง: “ผมขออนุมัติพิจรณาข้อจำกัดสำหรับเดโมข้อมูลจำลองแบบlocal โดยยังคงไว้ซึ่ง G-01/RISK-003 จะยังคงเปิดไว้ตามข้อกำหนดเดิมของHydraMesh”.
- ขอบเขต: เดโม local ด้วยข้อมูลจำลองเท่านั้น.
- สถานะ: อนุมัติข้อจำกัดสำหรับขอบเขตนี้; **G-01 / RISK-003 OPEN และ W0 OPEN**.
- Git reference ก่อนเพิ่มบันทึก: `e2c449cdfe697e9d9ca83da13e9bb624536f76f9`, `fix/w0-reconciliation`. ไม่ใช่ commit ที่รัน Anthropic agents ผ่านแล้ว.

## เหตุผลและหลักฐาน

ยังไม่มี current live coverage ครบของ Anthropic Companion, Risk Engine และ Output Auditor ใน baseline HYDRA ปัจจุบัน. Gemini summary, non-live tests และ fallback ไม่ยืนยันแทน live behavior ของ agents เหล่านี้.

หลักฐานจากอีก repo Hydra-Mesh01 / wif-oidc-smoke แสดง OIDC smoke job และ WIF exchange job ผ่านตามสถานะ workflow. รอบ #3 แลก token step ผ่าน แต่ Claude API smoke test ตอบ HTTP400 / invalid_request_error โดยระบุ credit balance too low และ exit1. เครดิตเป็นสาเหตุของรอบนี้; ไม่ใช่ข้อสรุปพฤติกรรมโมเดลหรือสาเหตุของ failure อื่น. ไม่มีการนำผลอีก repo มารับรอง authentication/runtime ของ Hydra-Mesh ปัจจุบัน. รายละเอียด: `evidence/w0/2026-10-05/HYDRA_W0_ANTHROPIC_ACCESS_EVIDENCE.md` (จาก root repo).

## ข้อจำกัดและความเสี่ยงคงเหลือ

รับเฉพาะข้อจำกัดหลักฐาน live Anthropic สำหรับ local synthetic MVP/Portfolio Demo. ไม่เปลี่ยนผล FAIL เป็น PASS. ยังไม่ยืนยัน model access, tool-use behavior หรือ integrated safety behavior ในสถานการณ์ที่ยังไม่ได้ทดสอบ. คงข้อกำหนดเดิมของ HydraMesh; การอนุมัตินี้ไม่เปลี่ยน safety policy, ไม่อนุญาต bypass authorization และไม่ใช้กลบ safety-critical defect ที่ตรวจพบจริง.

**G-01 และ RISK-003 ยังคง OPEN**. งานติดตาม live/behavior verification คงอยู่ตามแผนเดิม W3. ต้องตรวจและทบทวนใหม่ก่อนขยาย intended use นอกเดโม local ข้อมูลจำลอง; เมื่อเข้าถึง API ได้ให้เก็บหลักฐานใหม่ผูกกับ repo/commit/model/runtime จริงก่อนอ้างผลผ่าน.

ไม่อนุมัติ public deployment, ข้อมูลผู้ป่วยจริง, clinical sign-off, G-02 ถึง G-05, final baseline, tag, freeze หรือ main merge. G-06 คงตามการอนุมัติเดิมแยกต่างหาก. **W0 OPEN**.

## ลายเซ็นประกอบการตัดสินใจ

![ลายเซ็นแบบ 3 ที่เจ้าของเลือก](../assets/project-owner-signature-v3.png)

**นายศุภกร โคตะมา**

เจ้าของโครงการและผู้ออกแบบระบบ — Project Owner & System Architect

ใช้ภาพลายเซ็นที่เจ้าของส่งและเลือกไว้ประกอบการอนุมัติ G-01 ตามข้อความและเวลาข้างต้นเท่านั้น. ไม่ใช่การลงนามเข้ารหัสหรือการรับรองการตัดสินใจที่ยังไม่อนุมัติ.
