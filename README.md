> **2026-09-16 — ปิดช่องสิทธิ์ข้อมูลระดับผู้ป่วยใน Phase 1 แล้ว**
> Doctor/Staff เห็นรายชื่อ สรุป และคิวเฉพาะผู้ป่วยที่ได้รับมอบหมายผ่าน `CareAssignment`
> พร้อม capability check, assignment expiry/revocation และหลักฐานว่าใครรับทราบเคสเมื่อใด
> อ่านแบบออกแบบและวิธีทดสอบที่ [Clinician Authorization](docs/CLINICIAN_AUTHORIZATION.md)

> **2026-09-15 — อัปเดต Fallback Mesh ที่เชื่อมเข้ากับ Demo แล้ว**
> เพิ่มการตอบสำรองตามบริบท เส้นทางความปลอดภัยที่แยกจากกัน คิวส่งซ้ำเข้ารหัส
> การคืนคำตอบเดิมเมื่อส่งข้อความซ้ำ และสถานะส่งต่อที่ตรงกับหลักฐานจริง
> เริ่มอ่านที่ [วิธีติดตั้ง สถาปัตยกรรม ผลทดสอบ และข้อจำกัด](docs/FALLBACK_MESH.md)
> อัปเกรดฐานข้อมูลด้วย `npx prisma db push` พร้อมตั้งค่าคิวพักถาวรและ worker ส่งซ้ำ

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
│   ├── auth/
│   │   ├── credential-login.ts       # ตรวจบัญชี/รหัสผ่านกับ User table
│   │   └── clinical-authorization.ts # capability + CareAssignment ระดับผู้ป่วย
│   ├── fallback/                 # Safety Lane, Response Coordinator, encrypted outbox
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
│   │   └── clinical-summary-agent.ts   # เรียก Gemini 3.7 Flash สรุปก่อนนัด
│   │
│   └── clinical/                 # === FHIR-aligned data + validated instruments ===
│       ├── screening-schema.ts   # FHIR-aligned types (QuestionnaireResponse, Observation)
│       ├── screening-9q.ts       # 9Q — verified ครบจากกรมสุขภาพจิต (คำถาม + เกณฑ์คะแนน)
│       ├── screening-8q.ts       # 8Q — verified ครบจากต้นฉบับ 2026-08-23 (yes/no ถ่วงน้ำหนัก, เกณฑ์ >=17)
│       ├── human-review-queue.ts # คิวรวม + หลักฐานผู้รับทราบ + assignment-scoped acknowledge
│       ├── system-health.ts      # ขับเคลื่อน indicator เดียวใน dashboard
│       ├── conversation-store.ts # เก็บบทสนทนาแบบเข้ารหัสต่อผู้ป่วย
│       └── screening-store.ts    # เก็บ 9Q/8Q แบบเข้ารหัสต่อผู้ป่วย
│
├── pages/
│   ├── _app.tsx                  # โหลด Tailwind global styles
│   ├── index.tsx                 # หน้าแรก: credential login + demo login แบบเปิดใช้เฉพาะ dev
│   ├── companion.tsx             # หน้าแชทผู้ป่วย ใช้ useCompanion
│   ├── dashboard.tsx             # Doctor dashboard: patient list (+ AI clinical summary), health indicator, review queue, specialist modal
│   └── api/
│       ├── auth/
│       │   ├── login.ts              # credential login จริง
│       │   ├── demo-login.ts         # demo-only ใช้ fixture/assignment จริงเมื่อเปิด flag
│       │   └── logout.ts
│       ├── admin/care-assignments.ts # admin สร้าง/ยกเลิกขอบเขตแพทย์–ผู้ป่วย
│       ├── hydra.ts                  # เข้ารหัส/ถอดรหัส (rate limited)
│       ├── companion/chat.ts         # คุยกับผู้ป่วย — ผ่าน orchestrator ก่อนเสมอ, ไม่เคยเงียบ
│       ├── screening/
│       │   ├── 9q.ts                 # submit 9Q → บอก requires8Q + item9Flag
│       │   └── 8q.ts                 # submit 8Q แบบ branching → auto-flag review ถ้า >= 17
│       └── doctor/
│           ├── patients.ts           # รายชื่อจริงเฉพาะผู้ป่วยที่ได้รับมอบหมาย
│           ├── review-queue.ts       # คิวเฉพาะ assignment + บันทึกผู้รับทราบ
│           ├── system-health.ts      # สถานะระบบจริง (ไม่ใช่ mock)
│           └── patient-summary.ts    # trigger Clinical summary agent ต่อผู้ป่วยหนึ่งคน
│
└── scripts/
    ├── seed-users.ts                    # บัญชีและ assignment สำหรับ dev/demo เท่านั้น
    ├── test-security-pipeline.ts        # เช็ค priority rule (เคส mixed-signal)
    ├── test-fallback.ts                 # ยืนยัน fallback โดยไม่พึ่ง network
    ├── test-clinical-scoring.ts         # เช็คคะแนน 9Q/8Q
    └── test-clinician-authorization.ts  # ทดสอบเปิดข้ามเคส/มอบหมาย/ยกเลิกสิทธิ์
```

## กติกาความปลอดภัย 5 ข้อที่ห้ามแก้โดยไม่คุยกันก่อน

1. **สัญญาณวิกฤตชนะ security block เสมอ** — `orchestrator.ts` เช็ค risk level ก่อนดู threat ของ Detector เสมอ และ Detector กับ Risk engine ต้องรันพร้อมกัน (`Promise.all`) ห้าม gate ต่อกัน
2. **Block บัญชีถาวรต้องมี human review เสมอ** — โค้ดคืนแค่ `requiresAccountReview: true` ไม่ทำการ block เอง
3. **ทุกคำตอบของ Companion ต้องผ่าน Output auditor** ก่อนออกจากระบบ ไม่มีข้อยกเว้น
4. **AI ไม่ตัดสินใจทางคลินิกเอง** — REVIEW path (ทั้งจากแชทและจาก 8Q >= 17) ต้องมี human (แพทย์) ตัดสินใจสุดท้ายเสมอ ผ่านคิวเดียวกันใน `human-review-queue.ts` — **สำคัญ: human review นี้เป็นแบบ risk-proportionate ไม่ใช่ universal gate** REVIEW path เท่านั้นที่รอแพทย์แบบ synchronous ส่วน ALLOW path (ข้อความทั่วไป) Companion agent ต้องตอบทันทีเสมอ ไม่รอ human อนุมัติทุกข้อความ — ถ้าเห็น diagram หรือโค้ดที่ไหนแสดง Human Review Gate คั่นกลางระหว่าง Risk engine กับ Companion agent สำหรับ**ทุก**ข้อความ นั่นคือ regression กลับไปที่บั๊กซึ่งแก้ไปแล้วตั้งแต่รอบรีวิว blueprint แรก
5. **Companion agent ต้องไม่เงียบ ไม่ว่า backend จะล่มด้วยเหตุผลอะไรก็ตาม** — Safety Lane และ Response Coordinator แยกความล้มเหลวของ history, risk, review, generation และ persistence ออกจากกัน หากโมเดลตอบไม่ได้จะใช้ Safe Composer ที่ไม่พึ่ง network พร้อมรายงานสถานะจริงผ่าน `system-health.ts`

## Setup

```bash
npm install                  # postinstall จะรัน `prisma generate` ให้อัตโนมัติ
cp .env.example .env.local   # ใส่ ANTHROPIC_API_KEY, SESSION_SECRET จริง, DEMO_AUTH_ENABLED=true
npm run db:migrate           # สร้าง prisma/dev.db + apply schema (ครั้งแรกเท่านั้น หรือหลังแก้ schema.prisma)
npm run db:seed              # สร้างบัญชีและ CareAssignment สำหรับ dev/demo เท่านั้น
npm run test:security        # เช็ค pipeline ก่อนเริ่ม dev — โดยเฉพาะเคส mixed-signal
npm run test:fallback        # เช็คว่า offline fallback ทำงานได้โดยไม่พึ่ง network เลย
npm run test:clinical        # เช็คคะแนน 9Q/8Q — โดยเฉพาะเคส total=17 ต้อง trigger urgent
npm run test:audit           # เช็ค audit log/circuit breaker/sentinel/policy engine (v2)
npm run test:db              # เช็ค review queue ที่ต่อ SQLite จริงแล้ว (ต้องรัน db:migrate ก่อน)
npm run test:clinician-authorization # เช็คว่าแพทย์เปิด/รับทราบเคสข้าม assignment ไม่ได้
npm run dev                  # เปิด http://localhost:3000 เลือก demo login เป็นผู้ป่วยหรือแพทย์
```

## สถานะ Phase 1 หลังปิด Clinician Authorization

- [x] Credential login และ session จริง; demo login เปิดได้เฉพาะ flag และใช้บัญชี fixture จริง
- [x] Review queue, conversation history และ 9Q/8Q อยู่ใน SQLite โดยข้อมูลคลินิกถูกเข้ารหัสต่อผู้ป่วย
- [x] Patient-facing 9Q/8Q, trend chart, คิว security แยก และลิงก์ 1323
- [x] Fallback Mesh: Safety Lane, Safe Composer, การส่งซ้ำเข้ารหัส และสถานะส่งต่อที่ตรงกับหลักฐาน
- [x] `CareAssignment` + capability สำหรับรายชื่อ สรุป คิว และการรับทราบระดับผู้ป่วย
- [x] รายชื่อผู้ป่วยจริงจากฐานข้อมูล ไม่ใช้ mock และไม่ตีความ `unknown` เป็น `low`
- [ ] Doctor Decision Layer: บันทึกข้อเท็จจริง, AI interpretation และคำตัดสินของแพทย์แยกกัน
- [ ] Startup configuration validation, Secure cookie ใน production และ scheduler ของ outbox worker
- [ ] Privacy Center, Admin UI และ clinical/language validation โดยผู้เชี่ยวชาญ

รายละเอียดสถานะระยะยาวและสิ่งที่ตัดออกจาก Demo อยู่ใน `PRODUCTION_ROADMAP.md`

## รอบตรวจสอบ 2026-08-23

ได้รับรายงานจากเครื่องมือภายนอกที่รีวิว zip รอบก่อน ตรวจสอบทุกข้อที่อ้างแยกกับสิ่งที่อยู่ในไฟล์จริง (ไม่เชื่อคำอธิบายเฉยๆ):

**ยืนยันแล้วว่าจริงและมีอยู่ในไฟล์จริง (4 จุด)**: (1) **8Q เดิมใช้สเกล 0-3 ทุกข้อผิด** — ของจริง fetch ตรงจากต้นฉบับยืนยันแล้ว (2026-08-23) เป็น yes/no ถ่วงน้ำหนักต่างกันต่อข้อ [1,2,6,+8 conditional,8,9,4,10,4] เกณฑ์ส่งต่อด่วนคือ **>= 17** ไม่ใช่ > 17 (2) API 9Q ไม่ส่ง `item9Flag` ออกมาทั้งที่เอนจิ้นคำนวณไว้แล้ว — แก้แล้ว (3) middleware redirect API route ที่ไม่ auth ไปหน้า `/` แทน JSON 401 ทำให้ fetch() client parse พัง — แก้แล้ว (4) ไม่มี login entry point ให้ทดสอบระบบจริง — เพิ่ม demo auth (gated ด้วย `DEMO_AUTH_ENABLED`) แล้ว

**อ้างว่าแก้แล้วแต่ตรวจสอบไฟล์จริงพบว่ายังไม่ได้แก้ (1 จุด)**: clinical-summary trust boundary — เอกสารบอกว่าเปลี่ยนเป็น server-side lookup แล้ว แต่ `patient-summary.ts` และ `dashboard.tsx` ที่พบในไฟล์จริงยังเป็นเวอร์ชันเดิมที่รับ raw data จาก client ตรงๆ ไม่ตรงกับที่อธิบาย — แก้ให้เองแล้วในรอบนี้ (`demo-clinical-data.ts` ใหม่ + `patient-summary.ts` รับแค่ `patientId`)

**ไม่ได้รับมาโดยไม่ตรวจสอบ**: diagram ที่แนบมาแสดง Human Review Gate คั่นกลางทุกข้อความก่อนถึง Companion agent ซึ่งขัดกับกติกาข้อ 4 — ไม่มีการเปลี่ยน orchestrator/companion-agent logic ตามนั้น

เพิ่ม `scripts/test-clinical-scoring.ts` ครอบคลุมทั้ง 9Q และ 8Q โดยเฉพาะเคส boundary total=17 ที่เป็นจุดสำคัญที่สุดของการแก้ครั้งนี้
