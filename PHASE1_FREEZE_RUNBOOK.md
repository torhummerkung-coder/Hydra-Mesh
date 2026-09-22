# HYDRA Mesh — Phase 1 Freeze Runbook

อ้างอิง: `PHASE_2_PLAN.md` Workstream W0, `EVIDENCE_CHAIN.md` entry EC-000 และ `RISK_REGISTER.md` RISK-001/RISK-003

## 1. เตรียม secret เฉพาะเครื่อง

สร้าง `.env.local` ที่ root ของโปรเจกต์ (ไฟล์นี้ถูก `.gitignore` แล้ว):

```env
DATABASE_URL="file:./dev.db"
PATIENT_DATA_MASTER_KEY=<base64 key 32 bytes>
SESSION_SECRET=<random secret อย่างน้อย 32 ตัวอักษร>
GEMINI_API_KEY=<Google Gemini API key จริง>
GEMINI_MODEL=gemini-3.8-flash
DEMO_AUTH_ENABLED=true
```

ห้าม commit, zip, screenshot หรือส่ง `.env.local` และ API key ผ่านแชต

## 2. รัน Baseline Gate

```bash
npm install
npm run db:migrate
npm run db:seed
npm run test:clinician-authorization
npm run test:auth-and-security-queue
npm run test:db
npm run test:clinical-data-encryption
npm run test:fallback-integration
npm run test:fallback-storage
npm run test:clinical-summary-contract
npm run test:clinical-summary-gemini
npm run typecheck
DEMO_AUTH_ENABLED=false npm run build
```

## 3. เกณฑ์ปิด Phase 1

- ทุกคำสั่งจบด้วย exit code `0`
- `test:clinician-authorization` ต้อง PASS บรรทัด `event trace is patient-scoped for clinicians ...`
- `test:clinical-summary-gemini` ต้อง PASS ทั้ง 3 assertion และ summary ภาษาไทยอ่านรู้เรื่อง
- ห้ามบันทึกว่า Clinical Summary “ปลอดภัยทางคลินิก” จาก live call เพียงครั้งเดียว ให้ใช้คำว่า `Gemini Clinical Summary Integration: LIVE VERIFIED`
- บันทึกผลจริงและวันที่ลง `EVIDENCE_CHAIN.md` entry `EC-000`
- ถ้ามี FAIL ห้าม tag/freeze และห้ามเปลี่ยน `_TBD_` เป็น `verified`

## 4. ขอบเขตของ full-system live test

คำสั่งข้างต้นปิด W0 ตามรายการสำคัญ แต่ยังไม่ live-test Anthropic path ของ Risk Engine, Companion และ Output Auditor หากต้องการปิด `RISK-003` ด้วย ต้องตั้ง `ANTHROPIC_API_KEY` และรัน `npm run test:security` โดยผลต้องไม่มี `[FAIL]` และ exit code ต้องเป็น `0`
