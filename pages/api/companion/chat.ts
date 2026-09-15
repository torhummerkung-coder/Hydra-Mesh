import type { NextApiRequest, NextApiResponse } from "next";
import { generateCompanionReply } from "../../../lib/agents/companion-agent";
import { runOrchestrator } from "../../../lib/security/orchestrator";
import { getFallbackReply } from "../../../lib/agents/fallback-reply";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";
import { flagForHumanReview } from "../../../lib/clinical/human-review-queue";
import { flagForSecurityReview } from "../../../lib/security/security-review-queue";
import { markDegraded } from "../../../lib/clinical/system-health";
import { logEvent } from "../../../lib/audit/audit-log";
import { getConversationHistory, saveTurn } from "../../../lib/clinical/conversation-store";

// จำนวนข้อความล่าสุดที่ดึงมาให้ Risk engine/Companion agent เห็นเป็น context —
// กันไม่ให้ context โตไม่มีที่สิ้นสุดตามความยาวบทสนทนา (เดียวกับแนวทางที่
// clinical-summary-agent.ts ใช้ตัดที่ 30 ข้อความล่าสุดฝั่งแพทย์)
const HISTORY_CONTEXT_LIMIT = 40;

// บันทึกบทสนทนารอบนี้แบบเข้ารหัสเสมอ (ผ่าน conversation-store.ts) — ห้าม throw
// ออกไปนอกฟังก์ชันนี้เด็ดขาด พลาดแล้วแค่บทสนทนารอบนี้ไม่ถูกบันทึก ไม่ใช่ safety
// gap แบบเดียวกับ flagForHumanReview ที่พลาดแล้วผู้ป่วยเสี่ยง (ผู้ป่วยยังได้คำตอบ
// ตามปกติเสมอไม่ว่าฟังก์ชันนี้จะสำเร็จหรือไม่)
async function persistTurnSafely(
  patientId: string,
  userMessage: string,
  assistantReply: string,
  correlationId: string
): Promise<void> {
  try {
    await saveTurn(patientId, userMessage, assistantReply);
  } catch (err) {
    console.error("[companion/chat] conversation persistence failed (non-fatal):", err);
    logEvent("pipeline_fallback", "fallback", correlationId, {
      error: "saveTurn failed: " + (err instanceof Error ? err.message : String(err)),
      note: "การตอบกลับผู้ป่วยไม่ได้รับผลกระทบ แต่บทสนทนารอบนี้ไม่ถูกบันทึกลง DB",
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.role !== "patient") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { message } = req.body as { message?: string };

  if (!message || typeof message !== "string" || message.length > 4000) {
    return res.status(400).json({ success: false, error: "message ไม่ถูกต้อง" });
  }

  // v2: correlationId เดียวใช้ trace ข้อความนี้ตลอด pipeline ผ่าน lib/audit/audit-log.ts
  // (Detector → Risk engine → Orchestrator → Companion → Output auditor)
  const correlationId = crypto.randomUUID();
  logEvent("message_received", "orchestrator", correlationId, { length: message.length });

  // ตั้งแต่บรรทัดนี้ลงไป: ไม่ว่า Orchestrator, Risk engine, Companion agent, หรือ
  // Output auditor ตัวไหนพังก็ตาม ผู้ป่วยต้องได้คำตอบกลับมาเสมอ ไม่ใช่ error เปล่าๆ
  // นี่คือ invariant สำคัญที่สุดของทั้งระบบ — ห้ามแก้ scope ของ try block นี้ให้แคบลง
  try {
    // v2 Phase 1: history มาจาก DB เสมอ ไม่รับจาก client อีกต่อไป — เดิม endpoint
    // นี้เชื่อ history ที่ client ส่งมาตรงๆ ซึ่งเป็น trust-boundary gap แบบเดียวกับ
    // ที่แก้ไปแล้วใน doctor/patient-summary.ts (ผู้ป่วยส่ง history ปลอม/บางส่วนมา
    // ได้ ทำให้ Risk engine เห็นบริบทไม่ครบตอนประเมินความเสี่ยง) ตอนนี้ server
    // query เองจาก DB ที่เข้ารหัสไว้เสมอ ผลพลอยได้: บทสนทนาไม่หายแม้ผู้ป่วย
    // refresh หน้าเว็บ (เดิมอยู่แค่ React state ฝั่ง client เท่านั้น)
    const history = await getConversationHistory(session.sub, HISTORY_CONTEXT_LIMIT);
    const historyForContext = history.map(({ role, content }) => ({ role, content }));

    const routing = await runOrchestrator(message, historyForContext, correlationId);

    if (routing.decision === "block_soft") {
      const reply = "ขอโทษนะ ตอนนี้ไม่สามารถประมวลผลข้อความนี้ได้ ลองพิมพ์ใหม่อีกครั้งได้ไหม";

      // requiresAccountReview เป็น true เสมอในเคสนี้ (ดูกติกาข้อ 3 ใน orchestrator.ts)
      // เข้าคิวแยกของทีม security (คนละคิวจาก flagForHumanReview ที่แพทย์เห็น) —
      // ไม่ throw ต่อถ้าพัง ผู้ป่วยต้องได้คำตอบตามปกติเสมอไม่ว่าการเข้าคิวจะสำเร็จหรือไม่
      if (routing.requiresAccountReview) {
        try {
          await flagForSecurityReview({
            patientId: session.sub,
            correlationId,
            riskLevel: routing.riskLevel,
            threatReasons: routing.threatReasons,
          });
        } catch (err) {
          console.error("[companion/chat] SAFETY: flagForSecurityReview failed —", err);
          logEvent("pipeline_fallback", "fallback", correlationId, {
            error: "flagForSecurityReview failed: " + (err instanceof Error ? err.message : String(err)),
            note: "companion reply ยังส่งต่อปกติ แต่ security review flag เข้าคิวไม่สำเร็จ",
          });
        }
      }

      await persistTurnSafely(session.sub, message, reply, correlationId);
      return res.status(200).json({ success: true, data: { reply } });
    }

    // คิวเดียวกับที่ 8Q >= 17 ใช้ — แพทย์เห็นทุกเคสที่จุดเดียวไม่ว่าจะมาจากไหน
    //
    // v2 Phase 1: DB write จริงตอนนี้ (ก่อนหน้านี้เป็น in-memory sync, fire-and-forget
    // ได้เพราะไม่มีทางหาย) — เขียนคิวต้อง "รับประกันว่าเขียนจริง" ก่อน response จบ
    // ไม่งั้นถ้า deploy บน serverless แล้ว process ถูกฆ่าทันทีหลัง response ส่งออกไป
    // promise ที่ยังไม่ resolve อาจไม่ได้รันจนจบ = review flag หายเงียบๆ ซึ่งเป็นเรื่อง
    // patient safety รับไม่ได้ (ต่างจาก logEvent ที่หายได้เพราะเป็นแค่ observability)
    //
    // แต่ก็ห้ามรอ "ตามลำดับ" ก่อน generateCompanionReply เพราะจะเพิ่มเวลาที่ผู้ป่วย
    // รอคำตอบโดยไม่จำเป็น — เลยรันคู่กันด้วย Promise.all แทน (DB insert เร็วกว่า
    // LLM call เสมออยู่แล้ว จึงไม่เพิ่ม latency ที่ผู้ป่วยรู้สึกได้เลย)
    const reviewFlagPromise =
      routing.decision === "review"
        ? flagForHumanReview({
            patientId: session.sub,
            source: "chat_risk_engine",
            reason: `Risk engine ประเมินระดับ ${routing.riskLevel} จากบทสนทนา`,
            riskLevel: routing.riskLevel,
          }).catch((err) => {
            // สำคัญ: ไม่ throw ต่อ (ไม่งั้นคำตอบดีๆ ที่ Companion สร้างไว้แล้วจะถูก
            // ทิ้งไปเป็น fallback โดยไม่จำเป็น) แต่ต้อง log ให้เห็นชัด เพราะนี่คือ
            // safety gap จริงถ้าเกิดขึ้น ไม่ใช่แค่ observability เสีย
            console.error("[companion/chat] SAFETY: flagForHumanReview failed —", err);
            logEvent("pipeline_fallback", "fallback", correlationId, {
              error: "flagForHumanReview failed: " + (err instanceof Error ? err.message : String(err)),
              note: "companion reply ยังส่งต่อปกติ แต่ human review flag เข้าคิวไม่สำเร็จ",
            });
          })
        : Promise.resolve();

    const [result] = await Promise.all([
      generateCompanionReply({
        history: historyForContext,
        newMessage: message,
        routingDecision: routing.decision,
        correlationId,
      }),
      reviewFlagPromise,
    ]);

    // บันทึกบทสนทนารอบนี้แบบเข้ารหัส (ต้องรอ result.reply ก่อน จึงมาทีหลัง
    // Promise.all ด้านบนไม่ได้ — encrypt+insert เร็วกว่า LLM call มาก ไม่เพิ่ม
    // latency ที่รู้สึกได้)
    await persistTurnSafely(session.sub, message, result.reply, correlationId);

    return res.status(200).json({ success: true, data: { reply: result.reply } });
  } catch (err) {
    // จับทุกความล้มเหลวของ pipeline ไว้ที่นี่ที่เดียว แล้วส่ง fallback ที่ไม่พึ่ง
    // service ภายนอกใดๆ กลับไปแทน — ผู้ป่วยไม่เห็นความพังนี้เลย
    // TODO: ต่อเข้า real observability/alerting (Sentry หรือเทียบเท่า) แทน console.error
    console.error("[companion/chat] pipeline failure, serving offline fallback:", err);
    markDegraded(); // แสดงผลใน Doctor dashboard เป็น indicator เดียว
    logEvent("pipeline_fallback", "fallback", correlationId, {
      error: err instanceof Error ? err.message : String(err),
    });

    const fallbackReply = getFallbackReply();
    // Fire-and-forget ตรงนี้ตั้งใจ (ไม่ await): เส้นทางนี้คือ fallback ของ pipeline
    // ที่พังไปแล้วชั้นหนึ่ง ต้องเร็วและพังไม่ได้อีกชั้น ถ้า persist ไม่สำเร็จก็แค่
    // ไม่มี record ของรอบสนทนานี้ ไม่กระทบคำตอบที่ส่งกลับไปแล้ว
    void persistTurnSafely(session.sub, message, fallbackReply, correlationId);

    return res.status(200).json({
      success: true,
      data: { reply: fallbackReply },
      degraded: true,
    });
  }
}
