# Hydra Mesh — Production Roadmap

เอกสารนี้คือวิสัยทัศน์ระยะยาวของ Hydra Mesh แนบคู่กับ demo ที่ใช้งานได้จริงใน repo นี้ ไม่ใช่ spec ที่ต้อง build ให้ครบก่อน — MVP ที่อยู่ใน repo คือ vertical slice แรกที่ยึดหลักการเดียวกับที่นี่ทุกข้อ แค่ตัด infra ระดับ enterprise ออกเพื่อให้ทันเวลา bootcamp

---

## วิสัยทัศน์: สองแกนหลักที่ไม่เปลี่ยนไม่ว่า scope จะขยายแค่ไหน

**แกน 1 — Companion agent คือสะพานตอนมนุษย์ไปไม่ถึง**
มนุษย์ (แพทย์ คนใกล้ชิด สายด่วน) มี capacity จำกัดตามเวลา แต่วิกฤตไม่รอเวลาทำการ ตี 1 ตี 2 ตี 3 หรือช่วงที่ระบบอื่นล่ม/ปิดทำการ คือช่วงที่อันตรายที่สุดพอดีกับช่วงที่มนุษย์พร้อมน้อยที่สุด Companion agent ต้องอยู่ตรงนั้นได้เสมอจนกว่าความช่วยเหลือจริงจะมารับช่วงต่อ

**แกน 2 — Security ครอบคลุมทุกจุดสัมผัส ไม่ใช่แค่ข้อความ**
Chat, ข้อมูลผู้ป่วย, ตัวระบบเอง จากภัยทั้งภายนอกภายใน ด้วย multi-agent ทำงานคู่ขนานกับ algorithm baseline ที่รันเสมอไม่สนใจว่า agent จะตัดสินใจว่ายังไง

---

## สถานะปัจจุบัน (MVP ใน repo นี้)

| Layer (จาก blueprint เต็ม) | MVP ที่ build แล้ว | ตัดอะไรออกเพื่อ demo |
|---|---|---|
| Detector | `lib/security/detector.ts` — algorithm ล้วนๆ (regex/pattern) | ไม่ใช้ Llama หรือ LLM ใดๆ เลย — เป็นการตัดสินใจ ไม่ใช่ scope-cut (ดู decision log) |
| Risk Engine | `lib/security/risk-engine.ts` — Claude Haiku 4.5 + tool-forcing | โมเดลเดียว ไม่มี ensemble |
| Orchestrator | `lib/security/orchestrator.ts` — รวมผลแบบ parallel, priority rule | rule-based ธรรมดา ไม่มี policy engine แยก |
| Auditor (output) | `lib/security/output-auditor.ts` — Claude Haiku 4.5 + tool-forcing | เช็คครั้งเดียว ไม่มี multi-pass verification |
| Shield | `lib/hydra-crypto.ts` — AES-256-GCM + AAD, PBKDF2/HKDF | software crypto ล้วนๆ ไม่มี HSM/KMS จริง, XOR-split เป็น N-of-N ไม่ใช่ Shamir's threshold |
| Companion agent | `lib/agents/companion-agent.ts` — Claude Sonnet 5 | โมเดลเดียว ไม่มี RAG/knowledge base |
| Fallback (ไม่เงียบ) | `lib/agents/fallback-reply.ts` — zero-dependency | — (เขียนเสร็จสมบูรณ์ตั้งแต่ MVP นี้แล้ว) |
| Clinical Summary | `lib/agents/clinical-summary-agent.ts` — Claude Sonnet 5 | ไม่มี RAG ดึงประวัติเก่าไกลๆ |
| Clinical Data (9Q/8Q) | `lib/clinical/screening-*.ts` — FHIR-aligned shape | ไม่ใช่ FHIR REST compliance จริง, 8Q verified แค่บางส่วน |
| Human Review Gate | `lib/clinical/human-review-queue.ts` | in-memory ไม่ใช่ database |
| Clinic Command Center | `pages/dashboard.tsx` + `pages/api/doctor/*` | patient list เป็น mock, ไม่มี real-time SSE (ใช้ polling), telemetry เหลือ indicator เดียวไม่ใช่ grid 5 แถว |
| Event Bus | เรียก function ต่อกันตรงๆ ใน API route | ไม่มี Kafka/NATS/Redis |
| Auth | `lib/session.ts` + `middleware.ts` (jose JWT) + `lib/auth/credential-login.ts` (credential จริงกับ `User` table, PBKDF2-SHA512) | ไม่มี refresh token, ไม่มี OAuth, ไม่มี self-registration (ตั้งใจ — ต้องมี HR/แอดมินสร้างบัญชีให้เท่านั้น) |

---

## สถาปัตยกรรมเป้าหมาย (ปรับจาก blueprint เดิม ให้ตรงกับสิ่งที่แก้ไปแล้ว)

```
Patient (Mobile/Web/IoT)
        │
        ▼
Edge/API Security Layer (Gateway, RBAC, Rate Limit)
        │
        ▼
┌─────────────────────────────────────────────┐
│           HYDRA MESH CORE                    │
│                                               │
│   Detector (algorithm)   Risk Engine (LLM)   │
│         │                      │             │
│         └──────────┬───────────┘             │  ← ต้องรันพร้อมกันเสมอ (แก้จาก
│                     ▼                         │    เวอร์ชันแรกที่ gate ต่อกัน)
│               Orchestrator                    │
│   (สัญญาณวิกฤตชนะ security block เสมอ)        │
│         │           │            │            │
│      BLOCK        REVIEW       ALLOW          │
│      (soft,      (human      (Companion       │
│      auto —      กำหนด        agent ตอบ       │
│      account     ตัดสิน       ทันที)          │
│      ต้อง human  ทั้งหมด)                      │
│      review)                    │              │
│                                  ▼              │
│                          Output Auditor         │
│                        (เช็คก่อนถึงผู้ป่วยเสมอ)  │
└─────────────────────────────────────────────┘
        │
        ▼
Shield (encrypt-always, audited temporary-decrypt zones)
        │
        ▼
Clinical Data Plane (FHIR-aligned: Patient / Observation / QuestionnaireResponse)
        │
        ▼
Clinic Command Center (Patient list, Review queue, Clinical summary, System health)


Safety Model:
  HUMAN AUTHORITY ALWAYS ABOVE AI
        │
        ▼
  Clinical Decision
        │
        ▼
  Hydra Safety Gates (Orchestrator + Output Auditor)
        │
        ▼
  AI/LLM — bounded operation

  AI: Detect → Assess → Route → Protect → Verify → Alert
  Human: Review → Decide → Authorize → Act
```

---

## ส่วนขยาย v2.0 — Agent Governance Layer

Blueprint v2.0 เสนอ 4 plane ใหม่: Control Plane, Zero Trust Security Plane, Sentinel Plane, Immune System — ทั้งหมดคุม "ตัว AI agent เอง" เป็น touchpoint ใหม่ ขยายจากแกน 2 เดิม (security ครอบคลุมทุกจุดสัมผัส) ให้ครอบคลุม agent ไม่ใช่แค่ chat/patient data เหมือนที่มี แนวคิดถูกต้อง แต่ 2 draft แรกที่เสนอมาวาง diagram แบบ serial ทั้งหมด ซึ่งชนกับกติกาด้านล่าง

**กติกาที่ตกลงกันก่อนเพิ่ม 4 plane นี้ (ห้ามละเมิด — ดูหลักการข้อ 6):**
Critical path (Access Security → Detector+RiskEngine parallel → Orchestrator → Companion → Output Auditor) ต้องไม่มี stage บล็อกเพิ่มแทรกเข้าไปไม่ว่ากรณีใด นี่คือ regression class เดียวกับที่เจอมาแล้ว 2 ครั้ง (ดู decision log) — ดังนั้น governance layer ใหม่ทั้งหมด wrap รอบ critical path แบบ async/config-time เท่านั้น ไม่ gate แบบ inline:

```
                    PATIENT MESSAGE
                          │
                          ▼
        (critical path — เหมือนเดิมทุกจุด ไม่มี stage เพิ่ม)
   Access Security → Detector+RiskEngine → Orchestrator
        → Companion → Output Auditor → ผู้ป่วยเห็นคำตอบ
                          │
       ┌──────────────────┼────────────────────┐
       │ observe เท่านั้น   │ audit log ทุก event  │ compile-time check
       ▼                  ▼                    ▼
┌─────────────┐   ┌──────────────┐    ┌─────────────────────┐
│  SENTINEL   │   │  AUDIT LOG   │    │     ZERO TRUST       │
│ retry loop  │   │ correlationId│    │ Agent Identity →     │
│ goal drift  │   │ ต่อทุก event  │    │ Capability manifest  │
│ capability  │   └──────────────┘    │ (เช็คตอน deploy/     │
│ abuse       │                       │  startup ไม่ใช่      │
│             │                       │  per-message)        │
│ circuit     │                       └─────────────────────┘
│ breaker ────┼──────► fallback-reply.ts
└──────┬──────┘
       │ incident
       ▼
┌─────────────┐
│   IMMUNE    │  incident → threat DNA → memory
│   SYSTEM    │  → propose defense (เสนอเท่านั้น ไม่ auto-apply)
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────┐
│       CONTROL PLANE (มนุษย์ใช้งาน)        │
│  Policy config │ Review queue UI        │
│  Incident command │ Emergency Stop ⚠    │
└────────────────────────────────────────┘
```

**Human Review:** ยังคงเป็น escalation point เดิม (ปลายทางของ `decision: "review"` จาก Orchestrator) Control Plane คือ operator surface ที่มนุษย์ใช้ config/monitor/review ไม่ใช่ stage ที่ข้อความไหลผ่านก่อนถึง Detector/Risk Engine

**Human Review แบ่งระดับความเร่งด่วนได้ (refinement รอบล่าสุด):** LOW = ตรงกับ `decision: allow` ปัจจุบัน (Companion ตอบเลย + log). MEDIUM = ตรงกับ `decision: review` ปัจจุบันเป๊ะ เข้า queue ให้หมอดูทีหลัง ไม่ต้องแก้อะไร. HIGH/CRITICAL = เพิ่ม urgency flag ใน `human-review-queue.ts` ให้ Auditor + Policy Engine กำหนด priority การแจ้งเตือนหมอ (เช่น push แทนรอ queue ปกติ) — **ส่วนนี้เป็นคนละ flow กับที่ Companion ตอบผู้ป่วยเสมอ** Companion ตอบทันทีเหมือนเดิมทุกกรณี ไม่รอ Auditor/Policy Engine ตรงนี้ก่อน มันแค่กำหนดว่าหมอควรเห็นเคสนี้เร็วแค่ไหนเท่านั้น. แยกได้ 3 role: Clinical Review (หมอ, patient risk) / Security Review (security admin, เช่น Sentinel แจ้ง agent anomaly) / System-Policy Review (Immune System เสนอ defense ใหม่ → บันทึกเป็น proposal เท่านั้น ไม่ deploy จนกว่า authorized human จะ approve)

**Emergency Stop:** เมื่อกดจาก Control Plane ต้อง route ไป `fallback-reply.ts` เสมอ ไม่ใช่ตัด response ทิ้งเฉยๆ — สอดคล้องกับหลักการข้อ 5 แม้ในสถานการณ์ที่มนุษย์สั่งปิดระบบเอง

**Companion / Clinical / Fallback:** ไม่ใช่ 3 ทางเลือกที่ Orchestrator สุ่มเลือกเท่ากัน — Companion คือ live responder ปกติ, Fallback คือ backup เมื่อ pipeline ล่ม (ผูกกับ circuit breaker), Clinical Summary Agent เป็น async job แยกสำหรับหมอก่อน appointment ไม่ได้อยู่ใน routing ของข้อความแชทแบบ real-time

**Zero Trust ในทางปฏิบัติ:** ไม่ใช่ policy engine ที่ query ทุกข้อความ (คือ stage บล็อกที่ห้าม) แต่คือ capability manifest แบบ static ต่อ agent เช่น Risk Engine ประกาศชัดว่ามีสิทธิ์แค่ "วิเคราะห์ + เรียก `report_risk_assessment`" เท่านั้น เช็คตอน build/deploy ไม่ใช่ยิง call เพิ่มทุกข้อความ

---

## Production Roadmap แบ่งเป็นเฟส

### Phase 1 — ทำให้ demo กลายเป็นระบบใช้งานได้จริง (ระยะใกล้ที่สุด)
- ✅ **DONE (บางส่วน)** — Database จริงสำหรับ review queue: `prisma/schema.prisma` + `lib/db.ts` (Prisma + SQLite) `human-review-queue.ts` ย้ายจาก in-memory มาเขียน/อ่าน DB จริงแล้ว ชื่อฟังก์ชัน export เดิมทุกตัวแต่เป็น async แล้ว (แก้ call site 3 จุด: `chat.ts` ใช้ `Promise.all` คู่กับ `generateCompanionReply` กัน latency, `screening/8q.ts`, `doctor/review-queue.ts`) verify ด้วย `npm run test:db` (ต้อง `npm install` + `npm run db:migrate` ก่อน — sandbox ที่เขียนโค้ดนี้ไม่มี network รันให้ดูเองไม่ได้)
- ✅ **DONE** — เข้ารหัส DB จริงสำหรับ conversation history + 9Q/8Q: เพิ่ม `ConversationMessage`/`ScreeningResponse` model ใน schema + `lib/clinical/conversation-store.ts`/`screening-store.ts` (wire `encryptForPatient`/`decryptForPatient` เข้ากับการอ่าน/เขียนจริงแล้ว) `chat.ts` เปลี่ยนจากรับ `history` จาก client มาเป็น query จาก DB เอง (ปิด trust-boundary gap เดียวกับที่แก้ใน `patient-summary.ts` ไปแล้วรอบก่อน — ดู decision log ด้านล่าง) `screening/8q.ts`/`9q.ts` บันทึกผลแบบเข้ารหัสหลังคำนวณคะแนนเสร็จ `patient-summary.ts` เปลี่ยนจากอ่าน mock (`demo-clinical-data.ts` — ลบไฟล์นี้ทิ้งแล้ว) มาอ่านจาก DB จริง พร้อม log `clinical_data_decrypted` ทุกครั้งที่แพทย์เปิดดู (audited temporary-decrypt zone) ระหว่างทางเจอ bug เดิมที่ `patient-summary.ts` เรียก `getReviewQueue()` ขาด `await` (ตกหล่นตอนย้าย DB รอบก่อน) แก้ไปด้วย verify ด้วย `npm run test:clinical-data-encryption` (ต้อง `npm run db:migrate` ใหม่ก่อนเพราะ schema เปลี่ยน)
- ✅ **DONE** — Login endpoint จริง: `lib/auth/credential-login.ts` (`verifyCredentials` เช็คกับ `User` table จริง ใช้ `hashPassword`/`verifyPassword` PBKDF2-SHA512 310,000 iterations จาก `hydra-crypto.ts` ที่สร้างไว้รอตั้งแต่ก่อนหน้านี้แต่ไม่มีจุดไหนเรียกจนถึงตอนนี้) + `pages/api/auth/login.ts` (error message เดียวกันไม่ว่า username ไม่มีจริงหรือ password ผิด กัน user enumeration) + timing-safe dummy hash กัน timing attack บอกใบ้ว่า username มีอยู่จริงไหม `scripts/seed-users.ts` สร้างบัญชีทดสอบ (`npm run db:seed`) ไม่มี self-registration endpoint โดยตั้งใจ (ต้องมี HR/แอดมินยืนยันตัวตนก่อนสร้างบัญชีเสมอ) `pages/index.tsx` เพิ่มฟอร์ม login จริงคู่กับปุ่ม demo เดิม (ไม่ลบของเดิม เผื่อ dev ยังอยากทดสอบเร็วๆ) verify ด้วย `npm run test:auth-and-security-queue`
- ✅ **DONE** — Patient-facing UI สำหรับกรอก 9Q/8Q: `pages/screening.tsx` ทำ flow เต็ม intro → 9Q (ทีละข้อ) → 8Q แบบ branching (ถามข้อ 3.1 ต่อเนื่องเฉพาะตอบ "มี" ในข้อ 3) → หน้าผลลัพธ์ พร้อมโชว์สายด่วน 1323 เมื่อ 8Q ถึงเกณฑ์ urgent import คำถาม/ตัวเลือกจาก `lib/clinical/screening-{9q,8q}.ts` ตรงๆ (single source of truth ไม่พิมพ์คำถามซ้ำในหน้า UI) เพิ่มลิงก์เข้าถึงจาก `companion.tsx` ให้แล้ว (เดิมสร้างหน้าไว้ครบแต่ไม่มีทางกดเข้าไปถึงเลย)
- ตรวจสอบข้อคำถาม 8Q ที่เหลือ 6 ข้อกับต้นฉบับกรมสุขภาพจิตให้ครบก่อนใช้กับผู้ป่วยจริง
- ✅ **DONE** — คิวสำหรับทีม security ตรวจ `requiresAccountReview` แยกจาก Doctor dashboard: `SecurityReviewItem` model ใหม่ (แยกจาก `ReviewQueueItem` ที่แพทย์เห็น — คนละทีม คนละวัตถุประสงค์ ทีม security ไม่เห็นข้อมูลคลินิกของผู้ป่วยเลย ตาม least privilege) `lib/security/security-review-queue.ts` (flag/list/acknowledge) เข้าคิวจาก `chat.ts` เมื่อ `orchestrator.ts` ตัดสิน `block_soft` (ซึ่ง `requiresAccountReview` เป็น true เสมอในเคสนั้น) `pages/api/security/review-queue.ts` เช็ค `role === "security"` เท่านั้น (แม้แพทย์ก็เข้าไม่ได้) `pages/security.tsx` เป็นแดชบอร์ดแยกต่างหาก เรียบง่ายกว่า Doctor dashboard มาก — ไม่มีรายชื่อผู้ป่วย ไม่มีสรุปคลินิก เห็นแค่ pattern การโจมตี + pipeline trace (ใช้ endpoint เดียวกับแพทย์ `event-trace.ts` เพราะข้อมูลนี้เป็น pipeline reasoning ล้วนๆ ไม่ใช่ข้อมูลคลินิก) เพิ่ม `/security` และ `/api/security` เข้า `middleware.ts` PROTECTED list ด้วย (เดิมตกหล่น ทั้งที่ `/dashboard` ซึ่งเป็นบทบาทลักษณะเดียวกันฝั่งแพทย์ถูก protect อยู่แล้ว) verify ด้วย `npm run test:auth-and-security-queue`
- ✅ **DONE** — 9Q/8Q trend chart ใน Clinical intelligence panel: `ScoreTrendChart` ใน `dashboard.tsx` เป็น SVG มือเขียนล้วนๆ ไม่เพิ่ม chart library ใหม่ (ตรงกับที่โปรเจกต์นี้ไม่มี dependency เกินจำเป็นมาตลอด) แสดงในหน้า modal "สรุปคลินิก" เดิม (จุดเดียวกับที่ audited decrypt อยู่แล้ว ไม่ต้องเพิ่ม endpoint ใหม่ — `patient-summary.ts` แค่ส่ง `nineQScores`/`eightQScores` เพิ่มมาในผลลัพธ์เดิม) มีเส้น threshold ประกอบ (9Q ที่ 7 = ควรทำ 8Q ต่อ, 8Q ที่ 17 = เกณฑ์ส่งต่อด่วน)
- ✅ **DONE** — ปุ่ม/ลิงก์สายด่วนสุขภาพจิต 1323 แบบมองเห็นตลอดในหน้าแชท: แถบ `tel:1323` ใต้ header ของ `companion.tsx` กดโทรได้ทันทีบนมือถือ (เดิมโผล่แค่ตอนจบแบบประเมิน 8Q ที่ถึงเกณฑ์ urgent ใน `screening.tsx` เท่านั้น ตอนนี้เห็นตลอดเวลาไม่ว่าจะทำแบบประเมินหรือไม่)

#### คำถามเปิด: encryption key management สำหรับ conversation history / 9Q/8Q — ✅ ตัดสินใจแล้ว

**เลือกแบบที่ 3 (envelope encryption)** เพราะโปรเจกต์มีคนจริงทดลองใช้ตั้งแต่ demo และมี production จริงรออยู่แน่นอน ไม่ใช่ synthetic data ล้วนๆ — ความเสี่ยงสูงพอที่จะคุ้มกับความซับซ้อนที่เพิ่มขึ้น และเลี่ยง re-encryption migration ที่แพงกว่าถ้าเลือกแบบง่ายไปก่อนแล้วค่อยอัปเกรดทีหลัง

**สร้างแล้ว:** `lib/patient-encryption.ts` — DEK (data encryption key) สุ่มอิสระต่อผู้ป่วย 1 คน ห่อด้วย `PATIENT_DATA_MASTER_KEY` จาก env ก่อนเก็บ (`PatientDataKey` model ใหม่ใน schema) ใช้ `hydra-crypto.ts` เดิมทั้งสำหรับห่อกุญแจและเข้ารหัสข้อมูลจริง ไม่เขียน crypto ใหม่เลย

**verify ได้แล้ว** (ไม่ต้องมี DB เพราะ hydra-crypto ใช้ Web Crypto API ล้วนๆ) ผ่าน `npm run test:patient-encryption`: wrap/unwrap DEK ได้ค่าเดิม, master key ผิด unwrap ไม่ได้, shard ของคนละคนผสมกันไม่ได้ (AAD บล็อก), flow เต็ม wrap→encrypt→decrypt ได้ข้อความเดิม — ผ่านหมด 5/5

**เสร็จแล้ว:** wire `encryptForPatient`/`decryptForPatient` เข้ากับการเก็บ conversation history/9Q/8Q จริงใน DB แล้ว — ดู `lib/clinical/conversation-store.ts`/`screening-store.ts` และ model `ConversationMessage`/`ScreeningResponse` ใน schema (รายละเอียดเต็มอยู่ใน Phase 1 ด้านบน)

**ข้อจำกัดที่ยังจริงอยู่ (ต้องบอกตรงๆ):** ป้องกันได้แค่กรณี DB หลุดเฉยๆ ไม่ป้องกัน server ทั้งระบบถูกเจาะ (master key อยู่ใน env ของ process เดียวกัน) — ต้องมี KMS/HSM ภายนอกจริงถึงจะกันได้ เก็บไว้ Phase 3 ตามเดิม

### Phase 2 — Scale และ Observability (ระยะกลาง)
- Message broker (Redis/NATS) แทนการเรียก function ตรงๆ เมื่อ traffic เริ่มสูง
- Full observability stack: Prometheus (metrics), OpenTelemetry (traces), structured logs → แทนที่ `console.error` + in-memory health flag ปัจจุบัน
- Real-time SSE telemetry แทน polling
- Prompt caching บน system prompt ทั้ง 4 agent (Companion, Risk engine, Output auditor, Clinical summary) เมื่อ volume สูงพอให้คุ้มความซับซ้อน
- Rate limiting ย้ายจาก in-memory ไป Redis (รองรับหลาย instance)
- Canary token ใน system prompt เพื่อตรวจ prompt-extraction attack

### Phase 3 — Enterprise infrastructure (ระยะไกล)
- Kubernetes cluster สำหรับ API pods, AI workers, SSE gateway
- KMS/HSM จริงสำหรับ key management (แทน software crypto)
- FHIR compliance เต็มรูปแบบ: REST API ตาม spec, validate ตาม FHIR profile, integrate กับ FHIR server จริง
- Multi-LLM split: General LLM / Clinical LLM แยกกัน + Embedding model + RAG engine + Vector database
- AIoT/Edge data plane: smartwatch, wearable, IoT device integration
- Shamir's Secret Sharing แทน XOR-split (รองรับ shard หายบางส่วนได้)
- Session isolation แบบเต็มรูปแบบสำหรับ flagged conversation
- พิจารณา self-host open-source model เฉพาะงาน classification แคบๆ (Risk engine/Output auditor) เมื่อ volume สูงพอให้ hosting cost คุ้มกว่า API — ไม่ใช่ Companion agent ซึ่งความเสี่ยงด้านคุณภาพสูงเกินไป
- CI/CD pipeline (build/test/deploy อัตโนมัติ)
- Secrets management จริง (Vault/cloud secret manager แทน `.env` ตรงๆ)
- Backup / disaster recovery plan สำหรับ database และ encryption key
- Testing pyramid ให้ครบกว่าที่มี: ตอนนี้มีแค่ unit-test-style script (`scripts/test-*.ts`) ยังไม่มี API integration test, security/penetration test, หรือ load test

### Phase 4 — Agent Governance Layer (ไกลกว่า Phase 3, จาก blueprint v2.0)
- ✅ **DONE** — Standardized event model (`lib/types/event.ts`, `lib/audit/audit-log.ts`, `lib/audit/event-chain.ts`) trace ทั้ง pipeline ด้วย correlationId เดียว ยิง event แบบ fire-and-forget ไม่กระทบ critical path
- ✅ **DONE** — Zero Trust identity/capability: static manifest ต่อ agent (`lib/security/identity.ts`, `lib/security/capabilities.ts`) documentation-as-code เท่านั้น ยังไม่มี runtime enforcement
- ✅ **DONE** — Circuit breaker (`lib/security/circuit-breaker.ts`) ห่อ LLM call ของ risk-engine/companion/output-auditor → fail fast เมื่อ trip ให้ path เดิมไป `fallback-reply.ts` เหมือนเดิมทุกประการ (verify ด้วย `npm run test:audit`)
- ✅ **DONE** — Sentinel v1 observe-mode (`lib/sentinel/sentinel.ts`): capability check เทียบกับ manifest (log เฉพาะตอนไม่ตรง) + breaker instability detection (trip ≥3 ครั้งใน 5 นาที = incident) ไม่ block อะไรทั้งสิ้น — goal-drift/retry-loop ยังไม่ทำเพราะไม่มี signal จริงให้เกาะ (ไม่ fabricate)
- ✅ **DONE** — Human review queue severity tier: `lib/security/policy-engine.ts` (scope แคบตามตกลง) คำนวณ severity จาก riskLevel string เดิม ไม่ต้องแก้ call site เก่า (`chat.ts`, `screening/8q.ts`) เลย คิวเรียง notifyImmediately ขึ้นก่อนเสมอ
- ⏳ Immune System: incident → threat DNA → memory เก็บ pattern ไว้เทียบ ยังไม่ auto-apply defense — เสนอให้ Control Plane เท่านั้น ตัดสินใจสุดท้ายเป็นของมนุษย์ — ยังไม่เริ่ม
- ⏳ Control Plane: UI สำหรับ policy config, incident command, emergency stop — human-operated surface ไม่ใช่ pipeline stage — ยังไม่เริ่ม

---

## บันทึกการตัดสินใจทางวิศวกรรม (Engineering Decision Log)

จุดประสงค์ของตารางนี้คือบันทึกว่า "ทำไมถึงเลือกแบบนี้" ไม่ใช่แค่ "ทำอะไรไปแล้ว" — มีประโยชน์ตอนอธิบายโปรเจกต์ในการสัมภาษณ์งานพอๆ กับตอน onboard คนใหม่เข้าโปรเจกต์

| ปัญหาที่เจอ | การตัดสินใจ |
|---|---|
| HMAC key เก็บอยู่ในก้อนเดียวกับ ciphertext ที่มันปกป้อง | เปลี่ยนไปใช้ AES-GCM AAD ผูก metadata เข้ากับ ciphertext โดยตรง ไม่ต้องมี key แยกให้จัดการ |
| Session middleware เช็คแค่ความยาว token | เปลี่ยนเป็น JWT sign/verify จริงผ่าน `jose` (Edge-compatible) |
| Zero-knowledge encryption ขัดกับ AI ที่ต้องอ่าน plaintext เพื่อวิเคราะห์ความเสี่ยง | เลือก hybrid model: เข้ารหัสเสมอ มีโซนที่ decrypt ชั่วคราวได้พร้อม audit log แทน all-or-nothing |
| Detector (security) กับ Risk engine (clinical) เดิม gate ต่อกัน — เจอปัญหาเดียวกันซ้ำสองรอบในสองเวอร์ชันของ blueprint | บังคับให้รันพร้อมกันเสมอ (`Promise.all`) แล้วให้สัญญาณวิกฤตชนะ security block ในทุกกรณี ไม่มีข้อยกเว้น |
| ควรใช้ agent (LLM) หรือ algorithm สำหรับตรวจภัยคุกคาม | Hybrid: algorithm สำหรับ pattern-based threat (เร็ว, ตรวจจับตัวเองไม่ได้ถูก inject), LLM agent สำหรับงานที่ต้องเข้าใจความหมาย (crisis signal, output safety) |
| Honeypot/sandbox (แนวคิด infra-security) ไม่ตรงกับ threat model ของ chat app | แปลงเป็น canary token (ตรวจ prompt extraction) และ session isolation แทน |
| STRIKER block user ถาวรจาก heuristic อัตโนมัติ เสี่ยง false positive กระทบผู้ป่วยจริง | แยก: kill session (ข้อความนี้) = automatic ได้, block บัญชีถาวร = ต้อง human review เสมอ |
| Companion agent ไม่มีคำตอบสำรองถ้า backend ทั้ง pipeline ล่ม | สร้าง fallback แบบ zero network dependency แยกไฟล์ชัดเจน ห่อทั้ง pipeline ด้วย try/catch ชั้นเดียว |
| ใช้ชื่อ "PHQ-9" ทั้งที่ context เป็นไทย | เปลี่ยนเป็น "9Q" ตามคำที่กรมสุขภาพจิตใช้ พร้อมค้นพบ protocol 9Q→8Q ที่ผูกกับ threshold ส่งต่อด่วนอยู่แล้ว นำมาต่อเข้ากับ human review queue เดียวกับฝั่งแชท |
| อยากได้ FHIR แต่ full compliance คือ scope ระดับ specialist | แยกเป็น FHIR-aligned data modeling (ยืม resource shape ใช้ได้ตอนนี้) กับ FHIR compliance เต็มรูป (roadmap Phase 3) |
| พิจารณา train/host open-source model เอง | วิเคราะห์แล้วไม่คุ้มที่ scale demo — ต้นทุน 24 ชม. hosting (~$360-1,080/เดือน fixed) แพงกว่า API มาก (~$0.007/ข้อความ) ที่ volume ระดับนี้ |
| ได้รับรายงานรีวิวจากเครื่องมือภายนอก อ้างว่าแก้ 8Q scoring ผิด, ขาด item9Flag, มี trust-boundary gap, ไม่มี login flow | ตรวจสอบทุกข้อแยกกับไฟล์จริงก่อนเชื่อ — 4 จุดยืนยันจริงและมีอยู่ในไฟล์ (8Q scoring คือจุดสำคัญสุด, verified คำต่อคำจากต้นฉบับ), 1 จุด (trust boundary) ที่อ้างว่าแก้แล้วแต่ไฟล์จริงไม่ตรง แก้ให้เองเพิ่ม — บทเรียน: "รายงานว่าแก้แล้ว" กับ "ไฟล์จริงถูกแก้" เป็นคนละเรื่องกัน ต้องตรวจ diff จริงเสมอ โดยเฉพาะกับ clinical instrument ที่ผิดแล้วอันตราย |
| ได้รับรีวิวรอบสองที่อ้างว่า "ยังไม่มี AI จริง" และต้องมี dataset/accuracy evaluation | ตรวจสอบแล้วไม่ตรงกับความจริง — มี LLM integration จริง 4 จุด (Companion, Risk engine, Output auditor, Clinical summary) ไม่ใช่ mock และสถาปัตยกรรมเลือกใช้ API-based LLM ไม่ใช่ train เองอยู่แล้ว (ตัดสินใจไปแล้วก่อนหน้านี้ด้วยเหตุผลด้าน cost) ไม่รับ framing นี้ แต่ดึงส่วนที่ยังใช้ได้จริงมาเก็บ (CI/CD, secrets management, backup/DR, testing pyramid ที่กว้างขึ้น) — บทเรียนเพิ่ม: รีวิวจากภายนอกต้องประเมินความน่าเชื่อถือเป็นรายครั้ง ไม่ใช่ยอมรับทุกรอบเท่ากันหมด |
| คำอธิบายเพิ่มเติมจาก AI ตัวเดิมเรื่อง Human Review (รอบสี่) ยืนยันว่าไม่ควรบล็อกทุกข้อความ แต่เสนอ tier ความเร่งด่วน (LOW/MEDIUM/HIGH) โดย HIGH มี Auditor→Policy Engine ก่อน escalate | สอดคล้องกับที่สรุปไว้แล้วด้านบน ไม่ใช่ข้อขัดแย้งใหม่ — รับส่วน tier มาใช้ แต่ระบุชัดว่า Auditor/Policy Engine ตรงนี้กำหนดแค่ priority การแจ้งเตือนหมอ ไม่ใช่เงื่อนไขก่อน Companion จะตอบผู้ป่วย |
| Blueprint v2.0 (draft แรก) วาง Human Review ใน Control Plane เหนือ Access Security และ Hydra Mesh core ทั้งหมด — คลุมเครือว่าเป็น pre-filter gate ทุกข้อความ หรือเป็น escalation point เดิม | ยืนยันว่าต้องเป็น escalation point เดิมเท่านั้น (ปลายทางของ `decision: "review"` จาก Orchestrator) Control Plane คือ operator surface ที่มนุษย์ใช้ config/monitor ไม่ใช่ stage ที่ข้อความไหลผ่านก่อนถึง Detector/Risk Engine |
| รีวิวรอบสาม (จาก AI อีกตัว) เสนอเปลี่ยน orchestrator เป็น "Plan Generator" (Action Plan → Policy Engine → Capability Check → Execute) และอ้างว่า Risk Engine "ไม่มีสิทธิ์ CALL TOOLS" | ปฏิเสธการแทรก stage — เป็น regression class เดียวกับแถวด้านบน (เจอครั้งที่ 3 แล้ว) ส่วนคำอ้างเรื่อง tool คือความเข้าใจผิด: `report_risk_assessment` ใน `risk-engine.ts` คือ structured-output forcing ล้วนๆ ไม่มี side effect อยู่แล้ว ไม่มีอะไรต้อง restrict เพิ่ม เก็บเฉพาะส่วนที่ดีจริง (event model, circuit breaker ผูกกับ `fallback-reply.ts` ที่มีอยู่) ไปไว้ Phase 4 |
| Conversation history / 9Q/8Q ต้อง encrypt ก่อนเก็บ DB แต่ `hydraEncrypt`/`hydraDecrypt` ต้องการ `password` — ยังไม่รู้มาจากไหน มี 3 ทางเลือก (master secret เดียว / per-patient derived key / envelope encryption เต็มรูปแบบ) | เลือก envelope encryption (DEK สุ่มอิสระต่อผู้ป่วย ห่อด้วย master key จาก env) เพราะยืนยันแล้วว่ามีคนจริงทดลองใช้ตั้งแต่ demo ไม่ใช่ synthetic data ล้วนๆ และมี production จริงรออยู่แน่นอน — ความเสี่ยงสูงพอจะคุ้มความซับซ้อนที่เพิ่ม และเลี่ยง re-encryption migration แพงๆ ถ้าเลือกง่ายไปก่อนแล้วอัปเกรดทีหลัง |
| ตอน wire DB encryption เข้า `chat.ts` จริง พบว่า endpoint นี้ยังเชื่อ `history` ที่ client ส่งมาตรงๆ เพื่อสร้าง context ให้ Risk engine/Companion — trust-boundary gap แบบเดียวกับที่เคยแก้ใน `patient-summary.ts` (ฝั่งแพทย์) แต่ฝั่งผู้ป่วยยังไม่ได้แก้ | เปลี่ยนให้ `chat.ts` query history จาก DB เอง (`getConversationHistory`) แทนการรับจาก client เสมอ — ปิด gap เดียวกันทั้งสองฝั่ง และได้ผลพลอยได้คือบทสนทนาไม่หายตอนผู้ป่วย refresh หน้าเว็บ (เดิมอยู่แค่ React state) เพิ่ม `GET /api/companion/history` ให้ผู้ป่วยโหลดของตัวเองกลับมาแสดงตอนเปิดหน้า |
| ระหว่างเขียน `patient-summary.ts` ใหม่ให้อ่านจาก DB จริง พบว่าโค้ดเดิมเรียก `getReviewQueue().filter(...)` โดยไม่มี `await` — ฟังก์ชันนี้เปลี่ยนเป็น async ตอนย้าย DB ไป Prisma ในรอบก่อน แต่ call site นี้ตกหล่น ทำให้ throw runtime error ทุกครั้งที่แพทย์กด "สรุปคลินิก" (`.filter` ไม่มีอยู่บน Promise) | แก้ให้ครบตอนแก้ไฟล์นี้พอดี — บทเรียนเดียวกับที่บันทึกไว้ก่อนหน้า: เปลี่ยน signature ของฟังก์ชันที่ใช้ร่วมกันหลายที่ (sync→async) ต้องไล่ grep หา call site ทุกจุดจริงๆ ไม่ใช่แก้แค่จุดที่กำลังทำงานอยู่ตรงหน้า |

| ระหว่างไล่ทำ Phase 1 ต่อ (patient-facing 9Q/8Q UI) เจอว่า `pages/screening.tsx` มีอยู่แล้วในโปรเจกต์แบบสมบูรณ์ (ไม่ได้อยู่ใน zip ต้นฉบับที่ผู้ใช้อัพโหลด แต่ถูกสร้างไว้แล้วในเซสชันนี้ช่วงก่อนหน้าที่ context ถูกสรุปตัดไป) ตรวจโค้ดแล้วตรงกับ backend ทุกจุด แต่ grep หา `"screening"` ใน `companion.tsx`/`index.tsx`/`dashboard.tsx` แล้วไม่เจอที่ไหนลิงก์มาหน้านี้เลย — สร้างเสร็จแต่ไม่มีทางกดเข้าถึง | เพิ่มลิงก์จาก `companion.tsx` ไปหน้า `/screening` บทเรียน: "ไฟล์มีอยู่และโค้ดถูกต้อง" กับ "ผู้ใช้จริงเข้าถึงฟีเจอร์นั้นได้" เป็นคนละเรื่องกัน ต้องเช็ค entry point เสมอ ไม่ใช่แค่เช็คว่าไฟล์มีอยู่ในโปรเจกต์ |
| ตอนไล่ทำ Login จริง + คิว security แยก (คำขอถัดไปในเซสชันเดียวกัน) เจอ pattern เดียวกันซ้ำอีกรอบ: `lib/auth/credential-login.ts`, `pages/api/auth/login.ts`, `scripts/seed-users.ts`, `lib/security/security-review-queue.ts`, `pages/api/security/review-queue.ts`, `pages/security.tsx`, และ model `User`/`SecurityReviewItem` ใน schema มีอยู่แล้วครบ แม้แต่ `chat.ts` ก็ wire `flagForSecurityReview` เข้า block_soft path ไว้แล้วจริง — ทั้งหมดสร้างไว้ก่อนหน้าในเซสชันนี้เช่นกัน แต่ตรวจแล้วเจอ 3 gap ของจริง: (1) `package.json` ไม่มี `db:seed` script ทั้งที่ `seed-users.ts` comment อ้างถึง (2) `middleware.ts` ไม่มี `/security`/`/api/security` ใน PROTECTED ทั้งที่ `/dashboard` (บทบาทลักษณะเดียวกันฝั่งแพทย์) ถูก protect อยู่แล้ว (3) `pages/index.tsx` ยังมีแค่ปุ่ม demo login ไม่มีฟอร์ม credential จริงเลย | แก้ทั้ง 3 จุด ไม่สร้างของซ้ำ บทเรียนเสริมจากรอบ `screening.tsx`: ต้อง grep/ตรวจทุกไฟล์ที่เกี่ยวข้องอย่างละเอียดก่อนเริ่มเขียนโค้ดใหม่ทุกครั้งที่ session ยาว เพราะ "งานทำไปแล้วบางส่วน" มีโอกาสสูงกว่าที่คิด และ "ไฟล์มีอยู่" ก็ยังต้องไล่เช็ค wiring ให้ครบ (ไม่ใช่แค่ entry point แบบรอบก่อน แต่รวมถึง config ที่อ้างอิงไขว้กัน เช่น script ใน package.json, matcher ใน middleware) |
| Trend chart ต้องการ raw score history (`{authored, totalScore}[]`) แต่ endpoint เดิม (`patient-summary.ts`) ส่งแค่ AI summary กลับไป ไม่ส่ง raw data | ไม่สร้าง endpoint ใหม่แยกต่างหาก — เพิ่ม `nineQScores`/`eightQScores` เข้าไปใน response เดิมของ `patient-summary.ts` เพราะ endpoint นี้ query ข้อมูลเดียวกันอยู่แล้ว (audited decrypt zone เดียวกัน) เพิ่ม field ออกไปถูกกว่า round-trip ใหม่ทั้งหมด และ chart วาดด้วย SVG มือเขียนแทนการเพิ่ม chart library ใหม่ ให้ตรงกับ zero-dependency-เกินจำเป็น ที่ยึดมาตลอดทั้งโปรเจกต์ |

---

## หลักการที่ยึดไว้เสมอ ไม่ว่า scope จะเปลี่ยนแค่ไหน

1. สัญญาณวิกฤตชนะ security block เสมอ
2. Block บัญชีถาวรต้องมี human review เสมอ ไม่ทำอัตโนมัติ
3. ทุกคำตอบของ Companion ต้องผ่าน Output auditor ก่อนถึงผู้ป่วย
4. AI ไม่ตัดสินใจทางคลินิกเอง — human ตัดสินใจสุดท้ายเสมอ
5. Companion agent ต้องไม่เงียบ ไม่ว่า backend จะล่มด้วยเหตุผลอะไรก็ตาม
