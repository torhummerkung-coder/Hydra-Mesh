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
| Auditor (output) | `lib/security/output-auditor.ts` — **Claude Opus 5** + tool-forcing (เดิม Haiku 4.5 — เปลี่ยนแก้ cognitive diversity gap กับ Risk Engine ดู decision log) | เช็คครั้งเดียว ไม่มี multi-pass verification |
| Shield | `lib/hydra-crypto.ts` — AES-256-GCM + AAD, PBKDF2/HKDF | software crypto ล้วนๆ ไม่มี HSM/KMS จริง, XOR-split เป็น N-of-N ไม่ใช่ Shamir's threshold |
| Companion agent | `lib/agents/companion-agent.ts` — Claude Sonnet 5 | โมเดลเดียว ไม่มี RAG/knowledge base |
| Fallback (ไม่เงียบ) | `lib/agents/fallback-reply.ts` — zero-dependency | — (เขียนเสร็จสมบูรณ์ตั้งแต่ MVP นี้แล้ว) |
| Clinical Summary | `lib/agents/clinical-summary-agent.ts` — **Gemini 3.8 Flash (configured candidate; current live evidence pending)** (เดิม Sonnet 5 และทดลอง Mistral Small 4 — ดู decision log) | ไม่มี RAG ดึงประวัติเก่าไกลๆ, **รอ Live Verification** — ต้องรัน `npm run test:clinical-summary-gemini` ด้วย key จริงก่อนบันทึกว่า integration ผ่าน |
| Clinical Data (9Q/8Q) | `lib/clinical/screening-*.ts` — FHIR-aligned shape, 8Q/9Q verified เต็มกับต้นฉบับแล้ว (ก.ย. 2026 — ดู Clinical Content Verification Log) | ไม่ใช่ FHIR REST compliance จริง, verify โดย AI ไม่ใช่บุคลากรคลินิก |
| Human Review Gate | `lib/clinical/human-review-queue.ts` — Prisma/SQLite + assignment-scoped queue; เก็บผู้รับทราบและเวลา | ยังไม่มี notification ภายนอกหรือ SLA workflow |
| Clinic Command Center | `pages/dashboard.tsx` + `pages/api/doctor/*` — รายชื่อ/สรุป/คิวเฉพาะผู้ป่วยที่ได้รับมอบหมาย | ไม่มี real-time SSE (ใช้ polling), ยังไม่มี Doctor Decision Layer |
| Event Bus | เรียก function ต่อกันตรงๆ ใน API route | ไม่มี Kafka/NATS/Redis |
| Auth | JWT + credential login + `CareAssignment` + clinical capability map; admin API สำหรับ assign/revoke | capability ยังครอบคลุมเฉพาะ clinical slice, ไม่มี refresh token/OAuth/self-registration |

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

## เป้าหมาย UI/UX — 3 Surface แยกตามผู้ใช้ (จาก external consult — ยังไม่ implement)

หลักคิด: ผู้ใช้ 3 กลุ่มมี "งานหลัก" คนละแบบ ใช้ UX ชุดเดียวกันทั้งหมดจะรกเร็ว **Patient = Care, Doctor = Decision, Admin/Developer = Control** ทั้งสามใช้ design system ร่วมกัน (component/token เดียวกัน) แค่ temperament ต่างกันตามงาน

```
HYDRA MESH
                     │
        ┌────────────┼─────────────┐
        │            │             │
        ▼            ▼             ▼
   PATIENT APP   DOCTOR UI    CONTROL PLANE
   Calm / Soft   Clinical /   Technical /
                 dense        dense
        │            │             │
   Companion     Clinical       Operations
   Assessment    Decisions      AI Governance
   Privacy       Review         Security
   Support       Timeline       Developer
```

### 1) Patient App

| ปัจจุบันใน repo | เป้าหมาย (ยังไม่ทำ) |
|---|---|
| `companion.tsx` — chat เรียบง่าย + hotline banner persistent | หน้า home ไม่โชว์ "Risk Level / Clinical score / Agent" เลยตั้งแต่แรก — ภาษา backend ไม่ใช่ภาษาผู้ใช้ |
| `screening.tsx` — 9Q/8Q ทีละข้อ ไม่โชว์คะแนนระหว่างทำ (กัน bias ในการตอบ) | หน้าผลลัพธ์เปลี่ยนจาก "แจ้งคะแนน/ระดับความเสี่ยง" เป็น "ขอบคุณที่บอกเรา / เราอยากให้มีคนช่วยดูแลคุณเพิ่มเติม" — เลี่ยงคำที่ทำให้รู้สึกถูกตีตรา (ไม่ใช่ "YOU ARE HIGH RISK") |
| ไม่มีหน้าดูประวัติของตัวเอง | "บันทึกของฉัน" — ใช้ภาษาผู้ใช้ ไม่ใช้คำว่า clinical history |
| ไม่มี Privacy Center | หน้าที่โชว์ "ใครเปิดข้อมูลฉัน เมื่อไหร่ ด้วยเหตุผลอะไร" — ต่อยอดจาก event `clinical_data_decrypted` ที่ log ไว้แล้วใน `patient-summary.ts` (ข้อมูลพร้อมอยู่แล้ว แค่ยังไม่มี UI ให้ผู้ป่วยเห็น) |

### 2) Doctor UI — Clinical Command Center

| ปัจจุบันใน repo | เป้าหมาย (ยังไม่ทำ) |
|---|---|
| `dashboard.tsx` หน้าเดียว flat: assigned patient list + assigned review queue + summary modal (นำ raw cross-patient trace ออกแล้ว) | Sidebar nav แยก: Dashboard / Patients / Review Queue / Alerts / Follow-up / Reports |
| Modal สรุปคลินิกเดียวรวมทุกอย่าง (รวม trend chart แล้วจากรอบก่อน) | Patient detail แยก tabs: Overview / Conversation / Assessments / Timeline / Clinical Notes / Interventions / Audit |
| Trend chart + AI summary text รวมอยู่ในกล่องเดียว | แยก 3 ชั้นชัดเจนเสมอ: **FACT** (เช่น "8Q = 17") → **AI INTERPRETATION** ("Risk appears elevated") → **CLINICIAN DECISION** (ช่องให้หมอกรอกเอง) — กันไม่ให้ UI ทำให้ AI ดูเหมือนเป็นผู้วินิจฉัย |
| ไม่มี timeline แบบมนุษย์อ่านง่าย | Timeline เช่น "20:31 Patient message → Risk detected → 8Q escalation → Human review created" ไม่ใช่ raw event log |

### 3) Admin / Developer — Control Plane (ยังไม่มีหน้านี้เลยตอนนี้)

```
HYDRA CONTROL PLANE
Overview
SYSTEM     → Services / Agents / Models / Events / Queues / Infrastructure
SECURITY   → Sentinel / Threat Events / Policy Engine / Capabilities / Incidents
AI         → Model Routing / Prompt Versions / Evaluations / Token-Cost / Failover
CLINICAL SAFETY → Risk Engine Health / Auditor / Review Queue Metrics
DATA       → Database / Encryption / Audit Trail / Retention
DEVELOPER  → API / Logs / Traces / Feature Flags / Deployments
```

Home ตอบ 4 คำถามก่อนเสมอ (ไม่ใช่กราฟเต็มจอ): ระบบยังทำงานไหม? มีอะไรผิดปกติไหม? AI ตัวไหนมีปัญหา? Clinical safety ได้รับผลกระทบไหม?

หน้าเด่นที่ต้องมี: **Agent Topology** (diagram คลิก node ดู status/model/latency/error rate), **Event Trace** (ค้นด้วย correlation ID เห็นทั้ง pipeline ต่อยอดจาก `event-trace.ts` ที่มีอยู่แล้ว), **Model Routing UI** (ตรงกับ Model Router ใน Phase 4.x ด้านล่าง — เปลี่ยน model ผ่าน config ไม่ hardcode)

### Permission model — จาก role string เป็น capability-driven

เริ่ม implement แล้วใน clinical slice ผ่าน `lib/auth/clinical-authorization.ts`: role กำหนด capability ของงาน และ `CareAssignment` จำกัดผู้ป่วยที่ใช้สิทธิ์นั้นได้ ครอบคลุม `patient.list.assigned`, `patient.read.assigned`, `review.list.assigned`, `review.acknowledge.assigned` และ `care_assignment.manage` แล้ว Endpoint อื่นที่ไม่แตะข้อมูลคลินิกยังใช้ role check เดิมตาม scope ของ Phase 1 จึงยังไม่อ้างว่า migration ทั้งระบบเสร็จ เหตุผลที่ต้องไปต่อแบบทีละ slice คืออนาคตจะมี role เพิ่ม (Psychologist, Nurse, Supervisor, Researcher) และแต่ละ role ไม่ควรได้สิทธิ์ทั้งระบบเพียงเพราะชื่อ role ตรง

---

## ส่วนขยาย v2.0 — Agent Governance Layer

Blueprint v2.0 เสนอ 4 plane ใหม่: Control Plane, Zero Trust Security Plane, Sentinel Plane, Immune System — ทั้งหมดคุม "ตัว AI agent เอง" เป็น touchpoint ใหม่ ขยายจากแกน 2 เดิม (security ครอบคลุมทุกจุดสัมผัส) ให้ครอบคลุม agent ไม่ใช่แค่ chat/patient data เหมือนที่มี แนวคิดถูกต้อง แต่ 2 draft แรกที่เสนอมาวาง diagram แบบ serial ทั้งหมด ซึ่งชนกับกติกาด้านล่าง

**กติกาที่ตกลงกันก่อนเพิ่ม 4 plane นี้ (ห้ามละเมิด — ดูหลักการข้อ 5 ท้ายเอกสาร):**
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
- ✅ **DONE (2026-09-16)** — Clinician Authorization ระดับผู้ป่วย: เพิ่ม `CareAssignment` ที่มีสถานะ/วันหมดอายุ/การยกเลิก, capability map สำหรับ clinical slice และ admin API สำหรับ assign/revoke รายชื่อผู้ป่วยเปลี่ยนจาก mock เป็นฐานข้อมูลจริง Doctor/Staff เห็น Patient Summary และ Review Queue เฉพาะ assignment ของตัวเอง การรับทราบคิวบันทึก `acknowledgedById` + `acknowledgedAt` และตรวจสิทธิ์ร่วมกับการ update ใน transaction เดียว หากตรวจฐานสิทธิ์ไม่ได้จะ fail closed ก่อน decrypt ส่วน Message Trace ตอนแรกยังผูก patient ownership ไม่ได้จึงถูกนำออกจาก Doctor Dashboard ชั่วคราว — แก้แล้ว (2026-09-16, ดู decision log แถวถัดไป) `event-trace.ts` ตอนนี้ให้ Doctor/Staff เห็นเฉพาะ trace ของผู้ป่วยที่มี active CareAssignment เท่านั้น ทดสอบด้วยแพทย์สองคน/ผู้ป่วยสองคน/Staff/Admin/Security ผ่าน `npm run test:clinician-authorization` รายละเอียดใน `docs/CLINICIAN_AUTHORIZATION.md`
- ✅ **DONE** — Patient-facing UI สำหรับกรอก 9Q/8Q: `pages/screening.tsx` ทำ flow เต็ม intro → 9Q (ทีละข้อ) → 8Q แบบ branching (ถามข้อ 3.1 ต่อเนื่องเฉพาะตอบ "มี" ในข้อ 3) → หน้าผลลัพธ์ พร้อมโชว์สายด่วน 1323 เมื่อ 8Q ถึงเกณฑ์ urgent import คำถาม/ตัวเลือกจาก `lib/clinical/screening-{9q,8q}.ts` ตรงๆ (single source of truth ไม่พิมพ์คำถามซ้ำในหน้า UI) เพิ่มลิงก์เข้าถึงจาก `companion.tsx` ให้แล้ว (เดิมสร้างหน้าไว้ครบแต่ไม่มีทางกดเข้าไปถึงเลย)
- ✅ **DONE** — ตรวจสอบข้อคำถาม 8Q กับต้นฉบับกรมสุขภาพจิต: fetch PDF ต้นฉบับตรงจาก edu.vru.ac.th (อ้างอิงกรมสุขภาพจิต) เทียบทุกข้อ ทุกน้ำหนักคะแนน ทุก threshold — **ตรงเป๊ะทั้งหมด ไม่มีจุดที่ต้องแก้** ระหว่างตรวจเจอ bonus: 9Q ก็ verified ครบเช่นกัน (im.rmutt.ac.th) ตรงทุกข้อ/option/band และเจอเกณฑ์ใหม่ที่โค้ดไม่เคยมี — "9Q ≥ 13 → พิจารณาส่งพบจิตแพทย์" (verified จาก 2 แหล่งอิสระ: dsdw.go.th, vjlh.go.th) เพิ่ม `NINE_Q_PSYCHIATRIST_REFERRAL_THRESHOLD` เข้า `screening-9q.ts` แล้ว wire ผ่าน API และ `screening.tsx` ครบ พบ band ที่ต่างออกไปในอีกแหล่งหนึ่ง (udo.moph.go.th) แต่เป็นเอกสารเฉพาะบริบทผู้ป่วยยาเสพติด ไม่ใช่ 9Q ทั่วไป — ไม่นำมาแก้ตาม เพราะแหล่งหลักและมาตรฐาน PHQ-9 สากลตรงกับของเดิมอยู่แล้ว verify ด้วย `npm run test:clinical` (เพิ่ม boundary test case 12 vs 13 ด้วย)
- ✅ **DONE** — คิวสำหรับทีม security ตรวจ `requiresAccountReview` แยกจาก Doctor dashboard: `SecurityReviewItem` model ใหม่ (แยกจาก `ReviewQueueItem` ที่แพทย์เห็น — คนละทีม คนละวัตถุประสงค์ ทีม security ไม่เห็นข้อมูลคลินิกของผู้ป่วยเลย ตาม least privilege) `lib/security/security-review-queue.ts` (flag/list/acknowledge) เข้าคิวจาก `chat.ts` เมื่อ `orchestrator.ts` ตัดสิน `block_soft` (ซึ่ง `requiresAccountReview` เป็น true เสมอในเคสนั้น) `pages/api/security/review-queue.ts` เช็ค `role === "security"` เท่านั้น (แม้แพทย์ก็เข้าไม่ได้) `pages/security.tsx` เป็นแดชบอร์ดแยกต่างหาก — ไม่มีรายชื่อผู้ป่วย ไม่มีสรุปคลินิก เห็นเฉพาะ pattern การโจมตีและ pipeline trace เต็มระบบ (role `security` ไม่ถูกจำกัดด้วย CareAssignment เพราะต้องตรวจ attack pattern ข้ามผู้ป่วยได้) เพิ่ม `/security` และ `/api/security` เข้า `middleware.ts` PROTECTED list แล้ว verify ด้วย `npm run test:auth-and-security-queue`
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
- Multi-LLM split: General LLM / Clinical LLM แยกกัน + Embedding model + RAG engine + Vector database (รายละเอียดสถาปัตยกรรมเต็มอยู่ใน Phase 4.x — Model Governance & Cognitive Mesh ด้านล่าง)
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

### Phase 4.x — Model Governance & Cognitive Mesh (ต่อยอด Phase 4, จาก external consult — concept ทั้งหมด ยังไม่เริ่ม implement)

**สถานะ:** ล็อกแล้ว 4 จาก 10 role — Companion = Claude Sonnet 5 (ตั้งแต่ MVP), Output Auditor = Claude Opus 5, Risk Engine = Claude Haiku 4.5 (ของเดิม ยืนยันแล้วว่าคงไว้), Clinical Summarizer = Gemini 3.8 Flash (configured candidate; current live evidence pending) (เปลี่ยนจาก Sonnet 5 และย้ายต่อจาก Mistral หลัง live call ถูกบล็อกด้วย 429; รอ Gemini Live Verification) — ดู decision log สำหรับรายละเอียด โมเดลที่เหลือ (Security Sentinel, Clinical Interpreter, Memory/Context, Evidence, System Observer, Red-Team) ยังเป็นแค่ concept ไม่มีโค้ดเลย รอ Phase 4.x ตัวเต็ม

**หลักการใหม่ที่เพิ่มจากรอบ consult นี้ (ต่อยอด constitution ท้ายเอกสาร):**
- **Assume one model will eventually be compromised** — design ให้ compromise ของ model ตัวหนึ่งไม่ลากทั้งระบบไปด้วย ไม่ใช่พยายามหา "โมเดลที่ปลอดภัยที่สุด" ตัวเดียว
- **Model Diversity ≠ Cognitive Diversity** — ใช้หลาย model แต่ prompt/context/objective เหมือนกันหมด = หลาย copy ของ failure mode เดียวกัน ไม่ใช่ independent agent จริง **✅ แก้ครบทั้งสองจุดแล้ว:** (1) Risk Engine + Output Auditor เดิมใช้ Haiku 4.5 ซ้ำกัน → Auditor ย้ายไป Opus 5 (2) Companion + Clinical Summary เดิมใช้ Sonnet 5 ซ้ำกัน → Summary แยกไป Gemini 3.8 Flash (configured candidate; current live evidence pending) (Google) ตอนนี้ 4 LLM ใน MVP ใช้คนละ model และ Summary ข้าม provider จาก Companion จริง: Haiku(Risk)/Sonnet(Companion)/Opus(Auditor)/Gemini(Summary) — Gemini integration ต้องผ่าน live verification ก่อนขึ้น production
- **More intelligence ≠ more authority** — System Observer เห็นเยอะที่สุดในระบบ แต่มีอำนาจแค่ observe/analyze/correlate/recommend/escalate เท่านั้น ไม่มีปุ่ม override ระบบ ไม่ต่างจาก human ที่ยังคงมี authority สูงสุดเสมอ (กฎ 10)

**Cognitive Mesh — 10 model role (target architecture เต็มรูปแบบ):**

| # | Role | สถานะใน MVP ตอนนี้ | Authority |
|---|---|---|---|
| 01 Companion | คุยกับผู้ป่วย, continuity | ✅ มีแล้ว — `companion-agent.ts`, Claude Sonnet 5 🔒 | ต่ำ |
| 02 Risk Assessor | ประเมิน crisis signal | ✅ มีแล้ว — `risk-engine.ts`, Haiku 4.5 🔒 (ของเดิม ยืนยันคงไว้) | ต่ำ |
| 03 Security Sentinel | ตรวจ prompt injection/manipulation | 🟡 บางส่วน — `detector.ts` เป็น algorithm ล้วนๆ ไม่มี LLM sentinel แยก | ต่ำ |
| 04 Output Auditor | ตรวจก่อนส่งผู้ป่วย | ✅ มีแล้ว — `output-auditor.ts`, Claude Opus 5 🔒 (เดิม Haiku 4.5) | ต่ำ |
| 05 Clinical Interpreter | raw clinical data → structured insight | ❌ ยังไม่มี (แยกจาก Summarizer) | ต่ำ |
| 06 Clinical Summarizer | สรุปให้แพทย์อ่าน | ✅ มีแล้ว — `clinical-summary-agent.ts`, Gemini 3.8 Flash (configured candidate; current live evidence pending) 🔒 (เดิม Sonnet 5/Mistral Small 4, รอ live verification) | ต่ำ |
| 07 Context/Memory Analyst | คัดกรอง context ที่ส่งให้ Companion | ❌ ยังไม่มี — ตอนนี้ตัดแค่ N ข้อความล่าสุดแบบ hard limit ไม่ใช่ relevance-based | ต่ำ |
| 08 Evidence/Knowledge Agent | RAG/medical guideline retrieval | ❌ ยังไม่มี — ไม่มี RAG เลยตอนนี้ | ต่ำ |
| 09 System Observer | มองภาพรวมพฤติกรรมทั้งระบบ | ❌ ยังไม่มี — Sentinel v1 ปัจจุบันเป็น rule-based observe ไม่ใช่ LLM reasoning | ต่ำมาก |
| 10 Red-Team/Adversarial | ทดสอบโจมตีระบบตัวเอง | ❌ ยังไม่มี | ไม่มี production authority |

Model Router / Policy-Decision Engine (2 component เสริมนอกเหนือ 10 role ข้างบน) **ตั้งใจไม่ทำเป็น LLM** — ตรงกับที่ตัดสินใจไว้แล้วสำหรับ Detector/Orchestrator (ดู decision log แถว "ควรใช้ agent หรือ algorithm") หลักการเดียวกันขยายมาใช้ตรงนี้พอดี ไม่ใช่ของใหม่ที่ขัดกัน

**MVP เป้าหมายถัดไป (ไม่ใช่ครบ 10 — 4 LLM + 1 Observer = 5 model slot):**

```
                SYSTEM OBSERVER
                       │
                 observe only
                       │
                 CONTROL PLANE
                       │
                 MODEL ROUTER
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
  COMPANION        RISK MODEL      SECURITY MODEL
  (Sonnet 5 🔒)                          │
       │                                 ▼
       ▼                           OUTPUT AUDITOR (Opus 5 🔒)
   ผู้ป่วย                               │
                                         ▼
                                   HUMAN GATE
```

ต่างจาก MVP ปัจจุบันตรงที่เพิ่ม **Security Sentinel เป็น model แยก** (ตอนนี้เป็น algorithm ล้วนๆ) และเพิ่ม **System Observer** (ยังไม่มีเลย) — ส่วน Companion/Risk/Auditor มีอยู่แล้ว Auditor แก้ cognitive diversity กับ Risk เรียบร้อยแล้ว (Opus 5 ด้านบน) เหลือ Risk Engine เองที่ยังเป็น Haiku 4.5 ตัวเดียวไม่มี ensemble ให้เทียบ

**Model candidate shortlist (จาก Tor — 🔒 ล็อกแล้ว 4/10: Companion, Auditor, Risk Engine, Summarizer — ที่เหลือยังเป็น candidate ทุกชื่อรุ่นตรวจสอบผ่าน web search แล้วว่ามีอยู่จริง ณ ก.ย. 2026):**

| Role | Candidate ที่เสนอ | หมายเหตุ |
|---|---|---|
| 🧠 Companion | **Claude Sonnet 5** 🔒 LOCK | ตัวเดียวที่ล็อกแล้ว |
| 🚨 Risk | **Claude Haiku 4.5** 🔒 LOCK (เดิม candidate: Gemini 3.7-3.8 Flash / DeepSeek V4.1 Flash / Qwen3.5) | ล็อกแล้ว — Tor เลือกคงของเดิมไว้ (ไม่ได้ระบุเหตุผลเจาะจง) แทนที่จะเปลี่ยนเป็น Gemini ตามที่ AI เสนอไว้ก่อนหน้า |
| 🛡️ Security | Mistral Small 4 / Gemma 4 / DeepSeek V4.1 Flash | ตั้งใจเลี่ยง frontier model — งานนี้ต้องการเร็ว+isolation มากกว่า intelligence สูงสุด |
| 🔍 Auditor | **Claude Opus 5** 🔒 LOCK (เดิม candidate: GPT-6 Astra / DeepSeek V4-Pro / Mistral Large 3) | ล็อกแล้ว — safety-critical, ไม่ optimize cost ก่อน, อยู่ใน Anthropic API เดิมไม่ต้องเพิ่ม provider |
| 🩺 Clinical Interpreter | MedGemma 27B (candidate หลัก) / Gemini 3.1 Pro / GPT-5.6 Sol | MedGemma ต้องผ่าน independent verification เสมอ ตรงกับ philosophy Hydra พอดี (ไม่ใช่ autonomous decision maker) |
| 📋 Summarizer | **Gemini 3.8 Flash (configured candidate; current live evidence pending)** 🔒 LOCK (เดิมทดลอง Mistral Small 4) | เลือกใช้งานผ่าน Google API หลัง Mistral live call ถูกบล็อกด้วย 429; ต้อง benchmark คุณภาพภาษาไทย/การไม่สร้างข้อมูลเกิน input และคง Human Authority เหนือ AI |
| 🧩 Memory/Context | Gemini Flash / Mistral Small 4 / Qwen3.5 | งานนี้ไม่ต้องการ intelligence สูงสุด |
| 🔬 Evidence | ยังไม่เลือก — retrieval quality สำคัญกว่าตัว model | ต้องออกแบบ RAG ก่อน |
| 👁️ System Observer | GPT-6 Astra / Claude Opus 5 / DeepSeek V4-Pro | อยาก benchmark 3 ตัวจริงเพื่อให้เกิด cognitive diversity |
| 🧪 Red-Team | DeepSeek V4-Pro | ต้องเป็นคนละตัวกับ Observer |

**Model Registry / Router / Trust Boundary (concept, ยังไม่เขียนโค้ด):**

```
MODEL INSTANCE
Identity   → provider, model, version, instance_id
Trust      → trust_level, capability_scope, authority_scope, expiration
Isolation  → context_boundary, memory_boundary, tool_boundary, network_boundary
Security   → detector, anomaly_score, behavioral_baseline, compromise_status
```

Router **ไม่มีอำนาจ grant capability ให้ตัวเอง** — เลือก model ได้ แต่ authorization ยังผ่าน Policy Engine เหมือนเดิม (กัน Router กลายเป็น single point of failure ถ้าถูกเจาะ — compromise ที่ Router = compromise ทั้งระบบ)

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
| Companion agent ไม่มีคำตอบสำรองถ้า backend ทั้ง pipeline ล่ม | เริ่มจาก fallback แบบ zero-network แล้วพัฒนาเป็น Fallback Mesh ที่แยก Safety Lane, Response Coordinator, Safe Composer และ durable outbox เพื่อไม่ให้ความล้มเหลวจุดเดียวกลืนสถานะจริงของทุกส่วน |
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
| Tor ส่งเอกสาร 4 ไฟล์จาก external AI consultation (security constitution, agent model architecture, model selection ตามงาน, UI/UX 3-surface) — มีชื่อโมเดลเฉพาะเจาะจงมาก (GPT-6 Astra, GPT-5.6 Sol/Terra/Luna, Gemini 3.7/3.8 Flash, Qwen3.5 397B, DeepSeek-V4-Pro, Mistral Small 4/Large 3, Gemma 4, MedGemma) ซึ่งอยู่หลัง knowledge cutoff ของ Claude (ม.ค. 2026) เลยตรวจสอบจากความจำอย่างเดียวไม่ได้ | เช็คทุกชื่อด้วย web search ก่อนเชื่อ ไม่ปฏิเสธหรือยอมรับเฉยๆ ตาม pattern ชื่อที่ "ฟังดูแปลก" — ผลคือถูกต้องจริงทั้งหมด ยืนยันด้วยหลายแหล่งอิสระต่อชื่อ (official vendor blog + third-party benchmark/tracker sites) บทเรียน: ระยะห่างจาก knowledge cutoff ถึงปัจจุบันมีของจริงเกิดขึ้นได้เยอะกว่าที่คาด อย่าใช้ "ชื่อฟังดูไม่คุ้น" เป็นสัญญาณ hallucination โดยไม่เช็คก่อน |
| เนื้อหาทั้ง 4 ไฟล์ใหญ่กว่า Phase 2 เดิมมาก (Message broker/Observability) และไม่ fit ตรงกับ phase ไหนตรงๆ | ไม่สร้าง Phase ใหม่ทับของเดิม — ต่อยอดเป็น "Phase 4.x — Model Governance & Cognitive Mesh" (ชื่อที่ Tor เสนอเองในเอกสาร) และเพิ่ม section ใหม่ "เป้าหมาย UI/UX 3 Surface" แยกต่างหาก เพราะ UI ไม่ใช่ concern เฉพาะ phase เดียว เป็น cross-cutting ตาม backend ที่โตขึ้นเรื่อยๆ ยังไม่เขียนโค้ดใดๆ ตามที่ Tor เลือก (planning ก่อน) และ model ยังไม่ล็อกยกเว้น Companion |
| Tor ให้แก้ cognitive diversity gap ก่อน (เปลี่ยน Auditor หรือ Summary ให้คนละ model) — มี 2 gap จริง: Risk Engine+Auditor ใช้ Haiku 4.5 ซ้ำกัน, Companion+Summary ใช้ Sonnet 5 ซ้ำกัน แก้พร้อมกันทั้งคู่ไม่ได้ในรอบเดียวอย่างมีคุณภาพเท่ากัน | เลือกแก้ Auditor ก่อน (Haiku 4.5 → Opus 5) เพราะ (1) Risk Engine+Auditor เป็นด่านตรวจสองชั้นที่ควร independent จากกันมากที่สุด — เป็น safety-critical pairing โดยตรง ต่างจาก Companion+Summary ที่ไม่ใช่ double-check กัน (Summary มีหมอ review ทับอีกชั้นอยู่แล้ว) (2) แก้ได้ทันทีด้วย model string เดียวในโค้ดเดิม ไม่ต้องเพิ่ม provider/SDK/API key ใหม่ ตรงข้ามกับ Summary ที่ roadmap เสนอเป็น Gemini/Mistral (ต้อง provider ใหม่ทั้งหมด ยังไม่มี key ให้ทดสอบในนี้) แก้ Summary ทิ้งไว้เป็นงานถัดไปที่ต้องตัดสินใจเรื่อง provider ก่อนจะลงมือ ไม่ใช่แค่เปลี่ยนบรรทัดเดียวแบบนี้ ผลข้างเคียงที่ยอมรับ: Opus 5 แพงกว่า Haiku 4.5 มาก และ Auditor เรียกทุก reply ของ Companion (ไม่ใช่แค่ตอน flag) ต้นทุนต่อ conversation เพิ่มขึ้นจริง แลกกับความปลอดภัยของด่านสุดท้ายก่อนถึงผู้ป่วย ระหว่างทางเจอ `lib/security/identity.ts` (agent registry ที่ event/capability system อ้างอิง) ก็ยังอ้าง Haiku 4.5 ให้ output-auditor อยู่ — แก้ให้ตรงกันด้วย ไม่งั้น registry จะโกหกเกี่ยวกับ model ที่ใช้จริง |
| Tor ให้ตรวจสอบ 8Q กับต้นฉบับ — comment ในโค้ดเดิมอ้างว่า verified แล้วตั้งแต่ 2026-08-23 แต่ roadmap เองก็ยังบอกว่าเป็น item ค้าง ("ต้องมีคนที่มีสิทธิ์เข้าถึงเอกสารและมีพื้นฐานคลินิก") ไม่แน่ใจว่า comment เชื่อได้แค่ไหน | ไม่เชื่อ comment เฉยๆ — fetch PDF ต้นฉบับเองจริงๆ ผ่าน web_search + web_fetch เทียบทุกข้อ ทุกน้ำหนัก ทุก threshold คำต่อคำ (ตรงหมด) แล้วขยายไปตรวจ 9Q ด้วยเพราะอยู่ในไฟล์เดียวกันตามธรรมชาติของงาน เจอเกณฑ์ใหม่ที่ไม่เคยมีในโค้ด (9Q≥13→ส่งพบจิตแพทย์) ยืนยันด้วย 2 แหล่งอิสระก่อนเพิ่มเข้าโค้ด และเจอ band ที่ต่างจากแหล่งหนึ่ง (บริบทผู้ป่วยยาเสพติดเฉพาะทาง) แต่เลือกไม่แก้ตามเพราะแหล่งหลักและมาตรฐานสากลยืนยันของเดิม บทเรียน: comment ในโค้ดที่อ้าง "verified" เป็นการอ้างเหตุการณ์ภายนอกที่ยืนยันได้ ต้องตรวจสอบเองเสมอโดยเฉพาะเนื้อหาคลินิกที่ผิดพลาดมีผลถึงชีวิต ไม่ใช่แค่ตรวจโค้ด/logic แบบไฟล์ทั่วไป |
| Tor ยืนยันผล scoring: Risk = Haiku 4.5 (คงเดิม), Clinical Summary = Mistral Small 4 (เปลี่ยนจาก Sonnet 5) สั่งให้เขียนโค้ดแก้เลย | Risk ไม่ต้องแก้อะไร (คงเดิมอยู่แล้ว) Summary ต้องเปลี่ยน provider จริง — เขียน `clinical-summary-agent.ts` ใหม่ทั้งไฟล์เรียก Mistral chat completions API (OpenAI-compatible format: system อยู่ใน messages array ไม่ใช่ top-level param แบบ Anthropic, response อ่านจาก `choices[0].message.content`) ยืนยัน model id `mistral-small-2603` ผ่าน docs.mistral.ai โดยตรงก่อนใช้ ไม่เดาเอง เพิ่ม `provider` field ใน `AgentIdentity` interface (`lib/security/identity.ts`) เพราะตอนนี้มี 2 vendor จริงแล้ว ไม่ใช่ Anthropic ล้วนเหมือนตอนออกแบบไฟล์นี้ครั้งแรก — ถือเป็นก้าวเล็กๆ ของ Model Registry concept ใน Phase 4.x เพิ่ม circuit breaker ห่อ call นี้ด้วย (เดิมไม่มี) เพราะ provider ใหม่ยังไม่เคยพิสูจน์ reliability ในสภาพจริง ต่างจาก Anthropic ที่ agent อื่นใช้มาตลอด **ข้อจำกัดสำคัญที่ต้องบอกตรงๆ: โค้ดนี้ไม่เคยถูกเรียกจริงเลยสักครั้ง** sandbox ที่เขียนไม่มี MISTRAL_API_KEY และไม่มี network ให้ทดสอบ live เขียนตาม docs ที่ยืนยันผ่าน web search แล้วแต่ยังเป็นความเสี่ยงที่ integration อาจพังตอนใช้จริง (เช่น response shape ต่างจากที่คาด, model id เปลี่ยนก่อนได้ใช้งาน) เพิ่ม `scripts/test-clinical-summary-mistral.ts` ให้ Tor รันเองพร้อม key จริงเป็นการ verify ครั้งแรก ห้ามถือว่า "เขียนเสร็จ" เท่ากับ "ใช้ได้จริง" สำหรับไฟล์นี้โดยเฉพาะ |
| Doctor/Staff มี role ถูกต้องแล้วเปิด `patient-summary` ด้วย `patientId` ใดก็ได้ และเห็น review queue รวมทั้งระบบ | แยก authorization เป็นสองแกน: capability ตอบว่า role นี้ทำงานประเภทใดได้ และ `CareAssignment` ตอบว่าทำกับผู้ป่วยคนใดได้ เพิ่มวันหมดอายุ/การยกเลิกและ fail closed ก่อน decrypt นำ raw trace ออกจาก Doctor UI จนกว่าจะผูก patient ownership ได้จริง เพราะ “ยังกรองไม่ได้” ไม่ใช่เหตุผลให้เปิดเห็นทั้งระบบ |
| Tor สั่งให้เริ่มขั้น ① ของ post-Phase-1 sequence: verify Mistral integration ก่อนไปขั้นถัดไป | ตรวจซ้ำ `mistral-small-2603` ผ่าน web search อีกครั้ง (2026-09-16, 2 วันหลัง verify รอบแรก) — ยังเป็น GA/Apache 2.0, endpoint `/v1/chat/completions`, response shape `choices[0].message.content` ตรงกับโค้ดทุกจุด ไม่ต้องแก้ model id หรือ request/response shape ตรวจ bracket-balance ทั้งสองไฟล์ (`clinical-summary-agent.ts`, `test-clinical-summary-mistral.ts`) ผ่านหมด เทียบ error-handling/timeout (8s) กับอีก 3 agent (`risk-engine.ts`, `output-auditor.ts`, `companion-agent.ts`) — เหมือนกันทุกจุด ไม่ใช่จุดบกพร่องเฉพาะไฟล์นี้ จึงไม่แก้เพื่อไม่ให้ inconsistent กับ pattern ที่เหลือโดยไม่ถูกขอ **ข้อจำกัดยังเดิม: sandbox นี้ไม่มี `node_modules` และ network ปิดอยู่ (bash tool) จึงรัน `npm install`, `tsc`, หรือเรียก Mistral API จริงไม่ได้เลยแม้แต่ครั้งเดียว** การ verify ที่ทำได้จริงในรอบนี้คือ static review + เอกสารภายนอกเท่านั้น ไม่ใช่ live call — ยังต้องให้ Tor รัน `npm run test:clinical-summary-mistral` เองพร้อม key จริงก่อนเชื่อว่า integration ใช้งานได้ ไม่มีทางลัดอื่น |
| Tor ทดลอง Mistral live verification ผ่าน Termux แล้ว API ตอบ `429 rate_limited` ต่อเนื่อง จากนั้นยืนยันให้เปลี่ยน Clinical Summary เป็น Gemini 3.7 Flash | เปลี่ยน `clinical-summary-agent.ts` ไปใช้ Gemini `generateContent`, `systemInstruction`, `x-goog-api-key` และ parse `candidates[0].content.parts[]`; เปลี่ยน registry/config/test/documentation เป็น Gemini ทั้งหมด โดยคง `MISTRAL_API_KEY` ไว้เฉพาะ optional Fallback Mesh ซึ่งเป็นคนละบทบาท สถานะใหม่คือ **Gemini code path ready / Live Verification pending** และห้ามอ้างว่า clinical safety ผ่านจาก live call ครั้งเดียว |
| ขั้น ② ของ post-Phase-1 sequence: `event-trace.ts` ยังปิดให้ role `security` เท่านั้น เพราะตอนแก้ Clinician Authorization รอบก่อนยังไม่มีทางผูก event เข้ากับผู้ป่วยคนใดคนหนึ่งได้ (HydraEvent ไม่มี field patientId) — Doctor/Staff เข้าไม่ได้เลยแม้เป็นผู้ป่วยของตัวเอง | เพิ่ม `patientId?: string` (optional) เข้า `HydraEvent` (`lib/types/event.ts`) และ `logEvent()` รับ parameter ที่ 5 เป็น patientId เลือกผูกที่ `chat.ts` เท่านั้น (จุดเดียวที่รู้ตัวตนผู้ป่วยแน่นอนตั้งแต่ต้น pipeline) สำหรับ `message_received`/`companion_reply` — ไม่แก้ signature ของ `runOrchestrator()` หรือเพิ่ม logEvent ใน `orchestrator.ts` เพื่อไม่แตะ critical path เกินจำเป็น (event อื่นในสาย เช่น detector_result/risk_result ไม่ต้องผูกก็ได้ เพราะแค่ event เดียวในสาย correlationId เดียวกันที่มี patientId ก็พอให้ระบุเจ้าของทั้ง chain ได้) `buildEventChain()`/`getRecentTraces()` derive เจ้าของจาก event แรกในสายที่มี patientId `event-trace.ts` เขียนใหม่ตาม pattern เดียวกับ `patient-summary.ts` เป๊ะ: capability check (`patient.read.assigned`) + `hasCurrentClinicalCapability` re-verify + `hasActiveCareAssignment` ต่อ correlationId เดียว หรือ `getActiveAssignedPatientIds` กรองรายการ ก่อน trace ที่ไม่ผูก patientId เลย (เช่น sentinel/circuit breaker ระดับระบบ) จะไม่โชว์ให้ Doctor/Staff เห็นเลย — fail closed เพราะพิสูจน์เจ้าของไม่ได้ ไม่ใช่เพราะเป็นความลับ ผลลัพธ์ 404 เดียวกันทั้งกรณี "ไม่มี trace นี้จริง" และ "มีแต่ไม่ใช่ของผู้ป่วยตัวเอง" กัน enumeration แก้ regression test เดิมใน `test-clinician-authorization.ts` ที่ assert ไว้ว่า doctor ต้องได้ 403 เสมอ (เขียนไว้ตอน trace ยังปิดทั้งหมด) เป็น assert ว่าเห็นเฉพาะ trace ของผู้ป่วยตัวเอง (200 + filtered) ข้าม patient อื่นไม่ได้ (404) ส่วน security ยังเห็นทุก trace เหมือนเดิมไม่เปลี่ยน — ยังไม่ได้ต่อ UI ใน `dashboard.tsx` ให้ Doctor เห็น trace จริง (เขียนไว้เฉพาะ backend/API รอบนี้ ตาม scope ที่ตกลงไว้) |
| ขั้น ③ Full Integration Test Suite — ก่อนหน้านี้ทุกรอบสรุปว่า sandbox "รัน npm install/tsc/test จริงไม่ได้เลยแม้แต่ครั้งเดียว" เพราะไม่มี `node_modules` และ network ปิด | พบว่าข้อสรุปนั้นกว้างเกินจริง — `tsx`/`tsc` ติดตั้งแบบ global อยู่แล้วในนี้ (ไม่ผ่าน `npm install`) สคริปต์ทดสอบใดที่ไม่ import `next`/`@prisma/client`/`../lib/db` **รันได้จริง** ไม่ใช่แค่ static review: `test-clinical-summary-gemini-contract.ts` (mock fetch ตรวจ request/response shape ของ Gemini agent จริง — 2/2 PASS), `test-clinical-scoring.ts` (9Q/8Q ทุก boundary case — PASS), `test-audit-and-resilience.ts` (ยืนยันว่าแก้ patientId ใน audit-log.ts/event-chain.ts ของขั้น ② ไม่ทำให้ audit log/event chain/circuit breaker/sentinel/policy engine พังตาม — PASS ทั้งหมด), `test-fallback.ts` (52 checks — PASS), `test-patient-encryption.ts` (ส่วน envelope encryption ล้วนๆ — PASS) ส่วน `test-security-pipeline.ts` PASS เฉพาะ detector (algorithm, ไม่ใช้ API) แต่ FAIL 2 จุดที่ต้องเรียก risk engine ผ่าน LLM จริงเพราะไม่มี `ANTHROPIC_API_KEY`/network ในนี้ — ไม่ใช่ regression เป็นข้อจำกัดเดียวกับที่เจอตอน verify Gemini/Mistral ทุกสคริปต์ที่แตะ Prisma (`test-db-integration`, `test-clinical-data-encryption`, `test-auth-and-security-queue`, `test-clinician-authorization` — รวม assertion ใหม่ของขั้น ②, `test-fallback-integration`) หรือ `fake-indexeddb` (`test-fallback-storage`) ยัง hard-fail ที่ module resolution เหมือนเดิม ต้องรอ Tor รัน `npm install` เองอยู่ดี บทเรียน: แยก "รันไม่ได้เพราะไม่มี dependency ของไฟล์นั้นๆ" ออกจาก "รันไม่ได้เพราะ sandbox นี้ไม่มี runtime เลย" ให้ชัด — เป็นคนละสาเหตุ ไม่ควรสรุปรวมเป็นข้อจำกัดเดียวแบบที่ทำมาตลอด |
| Independent reconciliation review (`PHASE1_FREEZE_RECONCILIATION_REVIEW.md`, 2026-09-22) ตรวจ freeze-candidate ZIP คนละไฟล์แล้วยืนยันตรงกับที่ตรวจไว้ก่อนหน้า: (1) ไม่มี scoped data-read deadline ใดๆ ใน `patient-summary.ts` ทั้งที่บันทึกไว้ว่าเพิ่ม "15 วินาที" แล้ว (2) `.env.example`/agent default/identity registry/contract test/live test/runbook ยังอ้าง `gemini-3.7-flash` ทั้งหมด ทั้งที่ live-verify จริงใน EC-000 ใช้ `gemini-3.8-flash` (override) — checker script (`CHECK_PHASE1_FREEZE.sh`) ที่แนบมาถือว่า `3.8-flash` คือค่าที่ถูกต้อง | เพิ่ม `CLINICAL_DATA_READ_DEADLINE_MS = 15_000` ใน `patient-summary.ts` ผูกเฉพาะ 4 จุดอ่านข้อมูลทางคลินิก (conversationHistory, 9Q, 8Q, reviewQueue) โดยตั้งใจไม่แตะ deadline ของการเช็ค auth (`hasCurrentClinicalCapability`/`hasActiveCareAssignment`) เพราะเป็นคนละงานกัน — deadline ยาวกว่าเพราะเป็น envelope decrypt จริงที่ช้ากว่า lookup สิทธิ์ และมีแนวโน้มช้าขึ้นตามประวัติผู้ป่วยที่สะสม; แก้ config ให้ตรงกับที่ live-verify จริงทั้ง 6 จุดที่ checker ตรวจ (`clinical-summary-agent.ts` default, `identity.ts` registry, `test-clinical-summary-gemini-contract.ts`, `test-clinical-summary-gemini.ts`, `PHASE1_FREEZE_RUNBOOK.md`, `.env.example`) เป็น `gemini-3.8-flash` ทั้งหมด พร้อมอัปเดตเอกสารประกอบ (`README.md`, `GEMINI_LIVE_VERIFICATION.md`) ให้ตรงกัน — **หมายเหตุสำคัญ:** การเลือก 3.8 (ไม่ใช่แก้กลับเป็น 3.7 ตามที่ตาราง model roster ด้านบนเคย 🔒 LOCK ไว้) อิงตามสมมติฐานว่า live-verification คือความจริงภาคสนามและ checker script ที่ Tor ส่งมาเข้ารหัส 3.8 ไว้เป็นเกณฑ์ผ่านแล้ว — **ยังไม่ใช่การยืนยันจาก Tor โดยตรงว่าตั้งใจเปลี่ยน locked model** ถ้าที่จริงต้องการคงไว้ที่ 3.7 และ live test รอบก่อนใช้ 3.8 โดยไม่ตั้งใจ ต้อง revert 6 จุดนี้กลับและรัน live-verify ใหม่ด้วย 3.7 แทน (ดู `docs/RISK_REGISTER.md` RISK-004/RISK-005) |

---

## บันทึกการตรวจสอบเนื้อหาคลินิก (Clinical Content Verification Log)

การตรวจสอบนี้ทำโดย AI (Claude) ผ่าน web search/fetch เทียบกับเอกสารที่เผยแพร่สาธารณะ **ไม่ใช่การตรวจสอบโดยผู้เชี่ยวชาญทางคลินิก** ควรให้บุคลากรทางการแพทย์ยืนยันอีกชั้นก่อนใช้งานจริงกับผู้ป่วย โดยเฉพาะจุดที่มีการตัดสินใจเลือก (เช่น band ที่ไม่นำมาใช้)

| วันที่ | เครื่องมือ | ผลตรวจสอบ | แหล่งอ้างอิง |
|---|---|---|---|
| 2026-09-14 | 8Q | ✅ ตรงทุกข้อ ทุกน้ำหนักคะแนน (1,2,6,8,8,9,4,10,4) ทุก threshold (≥17) | edu.vru.ac.th/km2/knowledge/03_8Q.pdf (อ้างอิงกรมสุขภาพจิต) |
| 2026-09-14 | 9Q | ✅ ตรงทุกข้อ ทุก option (0-3) ทุก band (0-4/5-9/10-14/15-19/20-27) เกณฑ์ requires8Q (≥7) | im.rmutt.ac.th/9q |
| 2026-09-14 | 9Q (ใหม่) | ⚠️ พบเกณฑ์ที่โค้ดไม่เคยมี: 9Q≥13 → พิจารณาส่งพบจิตแพทย์ — เพิ่มเข้าโค้ดแล้ว (`NINE_Q_PSYCHIATRIST_REFERRAL_THRESHOLD`) | dsdw.go.th/Data/Doc/Files/20220613162342.pdf, vjlh.go.th/booking/upload_file2/2450661385f86a43f9e92d.pdf (ยืนยันตรงกัน 2 แหล่ง) |
| 2026-09-14 | 9Q band (ไม่นำมาใช้) | ⚠️ เจอ band อื่น (0-6/7-12/13-18/≥19) แต่เป็นเอกสารบริบทผู้ป่วยยาเสพติดเฉพาะทาง ไม่ใช่ 9Q ทั่วไป — ตัดสินใจไม่แก้ตาม | udo.moph.go.th (บริบทเฉพาะ ไม่ใช่แหล่งหลัก) |

---

## HYDRA Security Constitution (หลักการที่ยึดไว้เสมอ ไม่ว่า scope จะเปลี่ยนแค่ไหน)

จาก external consult รอบล่าสุด — เดิมมี 5 ข้อ (ยังถูกต้องทุกข้อ ไม่มีอะไรถูกยกเลิก) ตอนนี้จัดเป็น constitution เต็ม 12 ข้อ ให้ของเก่า-ใหม่อยู่ในกรอบเดียวกัน แต่ละข้อระบุว่า implement แล้วหรือยังเป็นแค่หลักการ:

**กฎ 01 — No Agent is Fully Trusted.** ไม่มี Agent ใดได้รับความไว้วางใจ 100% — แม้ไม่มีเจตนาร้ายก็ผิดพลาดได้เสมอ ตรวจสอบเท่าที่จำเป็นต่อระดับความเสี่ยง ไม่ใช่ทุก agent ต้องตรวจทุกอย่างทุกครั้ง

**กฎ 02 — Every Agent Has a Bounded Role.** ทุก Agent มีขอบเขตหน้าที่และสิทธิ์ชัดเจน — *implement แล้ว:* `lib/security/identity.ts`, `capabilities.ts`

**กฎ 03 — No Self-Escalation.** Agent ห้ามเพิ่มอำนาจ/สิทธิ์ให้ตัวเอง คำขอ permission เพิ่มต้องผ่าน authority ที่สูงกว่าเสมอ (Agent → Security/Policy → Human → Approve/Deny)

**กฎ 04 — Goal Does Not Justify Unauthorized Action.** บรรลุเป้าหมายไม่ใช่ข้ออ้างละเมิดขอบเขต — ต้องถามทั้ง "ผลลัพธ์ถูกไหม" และ "ไปถึงผลลัพธ์นั้นด้วยวิธีที่ได้รับอนุญาตหรือไม่"

**กฎ 05 — Security Must Not Destroy the Clinical Critical Path.** Critical path (Detector+Risk parallel → Orchestrator → Companion → Auditor) ห้ามมี stage บล็อกเพิ่มแทรกเข้าไป — ดู "ส่วนขยาย v2.0" ด้านบน

**กฎ 06 — Clinical Safety Has Priority During Crisis.** = สัญญาณวิกฤตชนะ security block เสมอ — *implement แล้ว:* `orchestrator.ts` เช็คสัญญาณวิกฤตก่อน threat ของ Detector เสมอ ไม่ใช่ bypass security ทั้งหมด แต่เปลี่ยนวิธีตอบสนองเพื่อรักษา safety path ไว้

**กฎ 07 — Output Must Be Independently Auditable.** ทุกคำตอบของ Companion ต้องผ่าน Output Auditor ก่อนถึงผู้ป่วยเสมอ ไม่มีข้อยกเว้น และ Auditor ต้องเป็น independent check ไม่ใช่ agent เดียวกับที่สร้างคำตอบ — *implement แล้ว:* `output-auditor.ts`

**กฎ 08 — Observe Before Enforce.** ระบบตรวจจับใหม่เริ่มจาก observe → detect → log → score ก่อนเสมอ ยังไม่ restrict/quarantine/revoke จนกว่าจะมั่นใจ — *implement แล้ว:* Sentinel v1 observe-mode

**กฎ 09 — Security Failure Must Not Become Clinical Silence.** Companion ต้องไม่เงียบไม่ว่า backend จะล่มด้วยเหตุผลอะไร (LLM unavailable, timeout, circuit breaker, emergency stop) — Emergency Stop ของ AI ≠ Emergency Stop ของการช่วยเหลือผู้ใช้ — *implement แล้ว:* `fallback-reply.ts` zero-dependency

**กฎ 10 — Human Authority Overrides Autonomous Authority.** AI เสนอ/flag/วิเคราะห์ได้ (Detect, Analyze, Recommend, Flag, Propose) แต่เปลี่ยน policy สำคัญ/เพิ่มสิทธิ์ตัวเอง/ปิดระบบความปลอดภัย/เปลี่ยนกฎ clinical เป็นของมนุษย์เท่านั้น — รวม "AI ไม่ตัดสินใจทางคลินิกเอง" และ "block บัญชีถาวรต้องมี human review เสมอ ไม่ทำอัตโนมัติ" ที่ *implement แล้ว* ในทั้ง 2 จุด

**กฎ 11 — Learn, But Do Not Self-Empower.** ระบบเรียนรู้จาก incident ได้ (Immune System แผนอนาคต: incident → threat DNA → memory → defense proposal) แต่ defense proposal ≠ auto deployment เสมอ ต้องผ่าน human/authorized review → approve → deploy

**กฎ 12 — Everything Important Must Be Traceable.** correlationId + event ID + agent identity + timestamp + policy version เพื่อตอบได้ว่า "เกิดอะไรขึ้น ใครทำอะไร เพราะอะไร" — *implement แล้ว:* `lib/audit/audit-log.ts`, `event-chain.ts`

**แก่นที่สุดของทั้งหมด:** Security ต้องไม่พยายามทำให้ระบบ "ไม่ผิดพลาด" เพราะเป็นไปไม่ได้ — ต้องทำให้เมื่อระบบผิดพลาด มันมีขอบเขต มีสัญญาณเตือน มีทางหยุด และมีทางกลับมาได้ ความปลอดภัยที่ดีไม่ใช่ระบบที่ไม่มีความยืดหยุ่น แต่คือระบบที่มีความยืดหยุ่นภายใต้ขอบเขตที่ควบคุมได้ — ไม่ใช่แนวคิด "ล็อกทุกอย่างให้แน่นที่สุด"

*หมายเหตุ: constitution ทั้ง 12 ข้อคือ North Star ไม่ใช่ทุกข้อต้อง implement พร้อมกัน — หยิบเฉพาะที่ตรงกับ phase ปัจจุบันมาทำทีละก้าว เพื่อรักษาแก่นเดิมและความเสถียรของ Core ไว้ (เช่นเดียวกับที่ทำมาตลอดทั้งโปรเจกต์นี้)*


## 2026-09-15 — อัปเดตการพัฒนา Fallback Mesh (ใช้แทนสถานะ Fallback ก่อนหน้านี้)

Engineering fallback เชื่อมกับ Safe Composer ที่ตอบตามบริบทแล้ว พร้อมตัวตรวจสัญญาณในเครื่องที่รักษาความปลอดภัยเมื่อส่วนอื่นล่ม ทางเลือกใช้โมเดลสำรองต่างผู้ให้บริการ สถานะ `queued`/`acknowledged` ที่ตรงกับหลักฐานจริง คิวพักถาวรเข้ารหัสฝั่ง server และ outbox ฝั่งเบราว์เซอร์ หลักฐานตอบกลับสำหรับคืนคำตอบเดิม การกู้ร่างแบบประเมิน และสถานะแยกตามองค์ประกอบ ดูพฤติกรรมโดยละเอียดและวิธีทดสอบซ้ำได้ใน `docs/FALLBACK_MESH.md`

**สถานะ:** ลงมือทำและทดสอบความล้มเหลวด้วยข้อมูลจำลองภายใน Demo เดิมแล้ว และเพิ่ม patient-scoped Clinician Authorization ใน 2026-09-16 ส่วนการตรวจทางคลินิก การเปรียบเทียบโมเดลจริง การทดสอบวงจรแอป Android การติดตั้ง worker ความคงทนของข้อมูลและการติดตามสถานะทุกเครื่อง การแจ้งทีมดูแลผ่านช่องทางภายนอก และ access control นอก clinical slice ยังไม่ถือว่าเสร็จ

## Engineering reconciliation — 2026-10-04

Current code defaults to `gemini-3.8-flash`; this is the supplied corrective configuration, not a new human model-selection decision. Contract URL expectation is now consistent. Live availability and integration for the effective runtime model still require provider evidence. Historical decision rows above remain unchanged; old RISK-004/RISK-005 references are source-qualified in `docs/ID_MIGRATION.md`. No clinical thresholds were changed. W0 remains open pending current-repo regression, environment, live, UI and Git evidence.
