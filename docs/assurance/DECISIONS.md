# Decision record — documentary

เวลาระบุจากบริบทข้อความ Asia/Bangkok ไม่ใช่ trusted timestamp authority

| ID | เวลา | สิ่งที่ได้รับทิศทาง / มอบหมาย | ผลและข้อจำกัด |
|---|---|---|---|
| DEC-01 | 2026-10-15 16:23+07 | Owner ระบุเป้าหมาย demo และให้เลื่อน independent review ไปก่อน โดยระบุความจริง | DEFERRED สำหรับ demo; ยังต้องทบทวนก่อน production; ไม่รับรองย้อนหลังว่าจะไร้ผลกระทบ |
| DEC-02 | 2026-10-15 16:30+07 | Owner เสนอเอกสาร demo และ production ที่อัปเดตคู่กัน | ใช้ facts ร่วมและ acceptance แยกกัน; ไม่ให้ผลรันขัดกัน |
| DEC-03 | 2026-10-15 16:35+07 | “โอเคเลยครับ แบบนี้ งั้นผมมอบให้คุ๋จัดทำทั้งแผนการ เอกสารต่างๆ และอัพเดททุกอย่าง ลงในไฟล์ project Hydra-Mesh ใน Repo Github เลย คิดว่าโอเคไหมครับ” | อนุญาตจัดทำและอัปเดตแผน/เอกสารที่เกี่ยวข้อง; เตรียม branch/PR เอกสารได้เมื่อเข้าถึง Repo จริง; ไม่ตีความเป็น deployment, source integration หรือ merge ทุกอย่าง |

## ยังไม่เกิดคำอนุมัติจากเอกสารนี้

- Scoped manual-bootstrap authority exception สำหรับ tranche ที่ระบุจริง
- ยกเว้น unknown budget / เพิ่ม cap / เปลี่ยน case เป็น case ใหม่เพื่อได้ free start
- แก้ protected source, ติดตั้งระบบ host, secrets, DB, CI dispatch หรือ production
- กำหนด final demo acceptance checklist ทั้งโครงการโดยยังไม่ตรวจ current Repo

## ข้อเสนอที่ต้องทำให้เป็นรูปธรรมก่อนตัดสิน

DEMO-FREEZE: Owner freeze ได้ใน demo lane หลังกรอก source/env/order/bounds/case/budget/route ครบ;
สถานะตอนนี้ OWNER_FREEZE_PENDING ไม่ใช่ FROZEN

DEMO-ROUTE: เปรียบเทียบ manual documentary กับ trusted external path ใน D05-CLOSURE-DESIGN;
ไม่มี route ไหนถูก grant จากข้อความว่าทำ demo อย่างเดียว

รายการนี้ไม่ขอ microapproval สำหรับการจัดทำเอกสารที่ได้รับมอบหมายแล้ว

## R2 repository observation

GitHub connected in the continuation of DEC-03. Docs branch publication is within the Owner's existing
instruction to update project plans/documents in this repository. The app connection notice itself is
not a new authorization. Repository is public; only reviewed documentation/metadata is included.
Base main: `295893a7e4cc6f32839eb8a90d1ced5cae963866`. No runtime source, workflow, credential or production changes are included.
