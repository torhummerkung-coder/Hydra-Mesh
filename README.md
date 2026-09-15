# Hydra Mesh — MVP (bootcamp capstone demo)

Implement safety logic เดียวกับ enterprise blueprint ฉบับเต็ม (ดู `PRODUCTION_ROADMAP.md` — เอกสารวิสัยทัศน์ระยะยาว + engineering decision log แนบคู่กับ demo นี้) แค่ใช้ infra ที่เรียบง่ายกว่า — ไม่มี Kubernetes / Kafka / HSM จริงใน demo นี้ ส่วน FHIR ใช้แบบ **FHIR-aligned** (ยืม resource shape มาใช้ ไม่ implement REST API ตาม spec เต็มรูปแบบ)

## โครงสร้างโปรเจกต์

```
hydra-mesh/
├── package.json / tsconfig.json / .env.example / .gitignore
├── tailwind.config.js / postcss.config.js
├── middleware.ts                 # ป้องกัน route สำคัญด้วย session (jose/JWT) — API ได้ 401 JSON, page ได้ redirect
├── styles/globals.css
├── lib/
│   ├── session.ts                # สร้าง/verify session token
│   ├── hydra-crypto.ts           # AES-256-GCM + AAD-bound integrity, PBKDF2/HKDF, XOR shard
│   ├── useHydra.ts                # React hook เรียกใช้ hydra-crypto
│   ├── useCompanion.ts           # React hook คุยกับ Companion agent
│   │
│   ├── security/                 # === security pipeline: แยกจาก clinic agents เด็ดขาด ===
│   │   ├── detector.ts           # algorithm ล้วนๆ: prompt injection / abuse pattern
│   │   ├── risk-engine.ts        # LLM agent: ประเมินสัญญาณวิกฤตจากความหมาย/บริบท
│   │   ├── orchestrator.ts       # รวมผล Detector+Risk engine "พร้อมกัน" + priority routing
│   │   └── output-auditor.ts     # LLM agent: ตรวจคำตอบร่างของ Companion ก่อนถึงผู้ป่วย
│   │
│   ├── agents/
│   │   ├── companion-prompt.ts   # system prompt: เพื่อนที่รับฟัง ไม่ใช่ที่ปรึกษา
│   │   ├── companion-agent.ts    # เรียก Claude Sonnet 5 + เชื่อม output-auditor อัตโนมัติ
│   │   ├── fallback-reply.ts     # fallback สุดท้าย ไม่พึ่ง service ภายนอกใดๆ เลย
│   │   ├── clinical-summary-prompt.ts  # สรุปเชิงสังเกต ห้ามวินิจฉัย/แนะนำการรักษา
│   │   └── clinical-summary-agent.ts   # เรียก Claude Sonnet 5 สรุปก่อนนัด ปิด loop 3-agent เดิม
│   │
│   └── clinical/                 # === FHIR-aligned data + validated instruments ===
│       ├── screening-schema.ts   # FHIR-aligned types (QuestionnaireResponse, Observation)
│       ├── screening-9q.ts       # 9Q — verified ครบจากกรมสุขภาพจิต (คำถาม + เกณฑ์คะแนน)
│       ├── screening-8q.ts       # 8Q — verified ครบจากต้นฉบับ 2026-08-23 (yes/no ถ่วงน้ำหนัก, เกณฑ์ >=17)
│       ├── human-review-queue.ts # คิวรวม: chat risk engine + 8Q มาจบที่จุดเดียวกัน
│       ├── system-health.ts      # ขับเคลื่อน indicator เดียวใน dashboard
│       └── demo-clinical-data.ts # server-side lookup only — client ส่งแค่ patientId ไม่ส่ง raw clinical data
│
├── pages/
│   ├── _app.tsx                  # โหลด Tailwind global styles
│   ├── index.tsx                 # หน้าแรก: demo login (ต้อง DEMO_AUTH_ENABLED=true)
│   ├── companion.tsx             # หน้าแชทผู้ป่วย ใช้ useCompanion
│   ├── dashboard.tsx             # Doctor dashboard: patient list (+ AI clinical summary), health indicator, review queue, specialist modal
│   └── api/
│       ├── auth/
│       │   ├── demo-login.ts         # demo-only, gated behind DEMO_AUTH_ENABLED, ไม่ใช่ auth จริง
│       │   └── logout.ts
│       ├── hydra.ts                  # เข้ารหัส/ถอดรหัส (rate limited)
│       ├── companion/chat.ts         # คุยกับผู้ป่วย — ผ่าน orchestrator ก่อนเสมอ, ไม่เคยเงียบ
│       ├── screening/
│       │   ├── 9q.ts                 # submit 9Q → บอก requires8Q + item9Flag
│       │   └── 8q.ts                 # submit 8Q แบบ branching → auto-flag review ถ้า >= 17
│       └── doctor/
│           ├── patients.ts           # รายชื่อผู้ป่วย (mock — รอ database จริง)
│           ├── review-queue.ts       # คิวจริง: GET list + POST acknowledge
│           ├── system-health.ts      # สถานะระบบจริง (ไม่ใช่ mock)
│           └── patient-summary.ts    # trigger Clinical summary agent ต่อผู้ป่วยหนึ่งคน
│
└── scripts/
    ├── test-security-pipeline.ts # รันก่อน demo ทุกครั้ง — เช็ค priority rule (เคส mixed-signal)
    ├── test-fallback.ts          # ยืนยันว่า fallback ไม่มี network call แอบซ่อน
    └── test-clinical-scoring.ts  # เช็คคะแนน 9Q/8Q รวมถึงเคส boundary total=17 ต้อง trigger
```

## กติกาความปลอดภัย 5 ข้อที่ห้ามแก้โดยไม่คุยกันก่อน

1. **สัญญาณวิกฤตชนะ security block เสมอ** — `orchestrator.ts` เช็ค risk level ก่อนดู threat ของ Detector เสมอ และ Detector กับ Risk engine ต้องรันพร้อมกัน (`Promise.all`) ห้าม gate ต่อกัน
2. **Block บัญชีถาวรต้องมี human review เสมอ** — โค้ดคืนแค่ `requiresAccountReview: true` ไม่ทำการ block เอง
3. **ทุกคำตอบของ Companion ต้องผ่าน Output auditor** ก่อนออกจากระบบ ไม่มีข้อยกเว้น
4. **AI ไม่ตัดสินใจทางคลินิกเอง** — REVIEW path (ทั้งจากแชทและจาก 8Q >= 17) ต้องมี human (แพทย์) ตัดสินใจสุดท้ายเสมอ ผ่านคิวเดียวกันใน `human-review-queue.ts` — **สำคัญ: human review นี้เป็นแบบ risk-proportionate ไม่ใช่ universal gate** REVIEW path เท่านั้นที่รอแพทย์แบบ synchronous ส่วน ALLOW path (ข้อความทั่วไป) Companion agent ต้องตอบทันทีเสมอ ไม่รอ human อนุมัติทุกข้อความ — ถ้าเห็น diagram หรือโค้ดที่ไหนแสดง Human Review Gate คั่นกลางระหว่าง Risk engine กับ Companion agent สำหรับ**ทุก**ข้อความ นั่นคือ regression กลับไปที่บั๊กซึ่งแก้ไปแล้วตั้งแต่รอบรีวิว blueprint แรก
5. **Companion agent ต้องไม่เงียบ ไม่ว่า backend จะล่มด้วยเหตุผลอะไรก็ตาม** — `pages/api/companion/chat.ts` ห่อทั้ง pipeline ด้วย try/catch ชั้นเดียว ถ้าตัวไหนพังจะได้ `getFallbackReply()` ที่ไม่มี network call กลับไปเสมอ พร้อม log เข้า `system-health.ts` ให้แพทย์เห็นใน dashboard

## Setup

```bash
npm install                  # postinstall จะรัน `prisma generate` ให้อัตโนมัติ
cp .env.example .env.local   # ใส่ ANTHROPIC_API_KEY, SESSION_SECRET จริง, DEMO_AUTH_ENABLED=true
npm run db:migrate           # สร้าง prisma/dev.db + apply schema (ครั้งแรกเท่านั้น หรือหลังแก้ schema.prisma)
npm run test:security        # เช็ค pipeline ก่อนเริ่ม dev — โดยเฉพาะเคส mixed-signal
npm run test:fallback        # เช็คว่า offline fallback ทำงานได้โดยไม่พึ่ง network เลย
npm run test:clinical        # เช็คคะแนน 9Q/8Q — โดยเฉพาะเคส total=17 ต้อง trigger urgent
npm run test:audit           # เช็ค audit log/circuit breaker/sentinel/policy engine (v2)
npm run test:db              # เช็ค review queue ที่ต่อ SQLite จริงแล้ว (ต้องรัน db:migrate ก่อน)
npm run dev                  # เปิด http://localhost:3000 เลือก demo login เป็นผู้ป่วยหรือแพทย์
```

## ยังไม่ได้ต่อ (มี TODO comment กำกับไว้ในโค้ดแล้ว)

- [ ] Login endpoint จริง (ตอนนี้มีแค่ demo login ที่ไม่เช็ค credential ใดๆ — ดู `DEMO_AUTH_ENABLED`)
- [x] ~~Review queue: DB จริง~~ — ย้ายไป Prisma + SQLite แล้ว (`prisma/schema.prisma`, `lib/db.ts`) ดู `PRODUCTION_ROADMAP.md` Phase 1
- [ ] เชื่อม `hydra-crypto` เข้ากับการบันทึก/อ่าน **conversation history + 9Q/8Q responses** จริงใน database — ยังไม่ทำ เพราะต้องตกลงเรื่อง encryption key management ก่อน (ดู `PRODUCTION_ROADMAP.md` หัวข้อ "คำถามเปิด" ใน Phase 1 — มี 3 ทางเลือกเปรียบเทียบไว้แล้ว) `patient-summary.ts` รับแค่ `patientId` แล้ว query ผ่าน `getDemoClinicalData()` ฝั่ง server เท่านั้นแล้ว เหลือแค่เปลี่ยน mock lookup เป็น database query จริง + authorization ว่าแพทย์มีสิทธิ์ดูผู้ป่วยคนนี้
- [ ] คิวสำหรับ security team ตรวจ `requiresAccountReview` (แยกจาก Doctor dashboard ตามที่ตกลงกันไว้ — "UX ฝั่ง backend" เป็นอีก milestone)
- [ ] Patient-facing UI สำหรับกรอก 9Q/8Q จริง (ตอนนี้มีแค่ backend + API)
- [ ] 9Q/8Q trend chart ใน Clinical intelligence panel (รอมี response สะสมจากข้อด้านบนก่อน)
- [ ] UI: ปุ่ม/ลิงก์สายด่วนสุขภาพจิต 1323 ที่มองเห็นได้เสมอในหน้าแชท ไม่ใช่แค่ตอนโดน flag
- [ ] README นี้ยังไม่ได้อัปเดตโครงสร้างโปรเจกต์ให้รวมไฟล์ v2 (`lib/audit/`, `lib/sentinel/`, `lib/types/`, `lib/security/{identity,capabilities,circuit-breaker,policy-engine}.ts`, `prisma/`) — โครงสร้างด้านบนเป็นของก่อน v2 blueprint ยังไม่ sync

## รอบตรวจสอบ 2026-08-23

ได้รับรายงานจากเครื่องมือภายนอกที่รีวิว zip รอบก่อน ตรวจสอบทุกข้อที่อ้างแยกกับสิ่งที่อยู่ในไฟล์จริง (ไม่เชื่อคำอธิบายเฉยๆ):

**ยืนยันแล้วว่าจริงและมีอยู่ในไฟล์จริง (4 จุด)**: (1) **8Q เดิมใช้สเกล 0-3 ทุกข้อผิด** — ของจริง fetch ตรงจากต้นฉบับยืนยันแล้ว (2026-08-23) เป็น yes/no ถ่วงน้ำหนักต่างกันต่อข้อ [1,2,6,+8 conditional,8,9,4,10,4] เกณฑ์ส่งต่อด่วนคือ **>= 17** ไม่ใช่ > 17 (2) API 9Q ไม่ส่ง `item9Flag` ออกมาทั้งที่เอนจิ้นคำนวณไว้แล้ว — แก้แล้ว (3) middleware redirect API route ที่ไม่ auth ไปหน้า `/` แทน JSON 401 ทำให้ fetch() client parse พัง — แก้แล้ว (4) ไม่มี login entry point ให้ทดสอบระบบจริง — เพิ่ม demo auth (gated ด้วย `DEMO_AUTH_ENABLED`) แล้ว

**อ้างว่าแก้แล้วแต่ตรวจสอบไฟล์จริงพบว่ายังไม่ได้แก้ (1 จุด)**: clinical-summary trust boundary — เอกสารบอกว่าเปลี่ยนเป็น server-side lookup แล้ว แต่ `patient-summary.ts` และ `dashboard.tsx` ที่พบในไฟล์จริงยังเป็นเวอร์ชันเดิมที่รับ raw data จาก client ตรงๆ ไม่ตรงกับที่อธิบาย — แก้ให้เองแล้วในรอบนี้ (`demo-clinical-data.ts` ใหม่ + `patient-summary.ts` รับแค่ `patientId`)

**ไม่ได้รับมาโดยไม่ตรวจสอบ**: diagram ที่แนบมาแสดง Human Review Gate คั่นกลางทุกข้อความก่อนถึง Companion agent ซึ่งขัดกับกติกาข้อ 4 — ไม่มีการเปลี่ยน orchestrator/companion-agent logic ตามนั้น

เพิ่ม `scripts/test-clinical-scoring.ts` ครอบคลุมทั้ง 9Q และ 8Q โดยเฉพาะเคส boundary total=17 ที่เป็นจุดสำคัญที่สุดของการแก้ครั้งนี้
