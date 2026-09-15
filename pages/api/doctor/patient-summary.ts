import type { NextApiRequest, NextApiResponse } from "next";
import { generateClinicalSummary } from "../../../lib/agents/clinical-summary-agent";
import { getConversationHistory } from "../../../lib/clinical/conversation-store";
import { getScreeningHistory } from "../../../lib/clinical/screening-store";
import { getReviewQueue } from "../../../lib/clinical/human-review-queue";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";
import { logEvent } from "../../../lib/audit/audit-log";

// แก้จาก trust-boundary gap ที่เจอ: เดิม endpoint นี้รับ conversationHistory/
// nineQHistory/eightQHistory จาก client (dashboard.tsx) ตรงๆ ซึ่งแปลว่าใครก็ตาม
// ที่ยิง request มาที่ endpoint นี้ (แม้ authenticated เป็นแพทย์แล้ว) ส่งข้อมูล
// ปลอมมาแทนของจริงได้ เช่นส่ง "9Q = 0" ให้ AI เชื่อทั้งที่ไม่ใช่ ตอนนี้รับแค่
// patientId แล้ว query ข้อมูลฝั่ง server เท่านั้น
//
// v2 Phase 1: getDemoClinicalData (mock) ถูกแทนที่ด้วยการ query จริงจาก DB ที่
// เข้ารหัสไว้เสมอ (conversation-store.ts / screening-store.ts) แล้ว — จุดนี้คือ
// "audited temporary-decrypt zone" ตาม hybrid encryption model ที่วางไว้ ต้อง log
// ทุกครั้งที่แพทย์เปิดดูข้อมูล sensitive ของผู้ป่วยคนหนึ่ง (ดู logEvent ด้านล่าง)
//
// TODO: ยังไม่มี authorization ว่าแพทย์คนนี้ (session.sub) มีสิทธิ์ดูผู้ป่วยคนนี้
// จริงหรือไม่ — เช็คแค่ role === "doctor" | "staff" เฉยๆ (ต้องทำก่อนขึ้น production
// จริง ตาม PRODUCTION_ROADMAP.md Phase 1)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || (session.role !== "doctor" && session.role !== "staff")) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { patientId } = req.body as { patientId?: string };
  if (!patientId || typeof patientId !== "string") {
    return res.status(400).json({ success: false, error: "patientId is required" });
  }

  const correlationId = crypto.randomUUID();

  try {
    const [conversationHistory, nineQHistory, eightQHistory, reviewQueue] = await Promise.all([
      getConversationHistory(patientId),
      getScreeningHistory(patientId, "9Q"),
      getScreeningHistory(patientId, "8Q"),
      // แก้ bug เดิม: getReviewQueue() เปลี่ยนเป็น async ตอนย้ายจาก in-memory ไป
      // Prisma แล้ว (ดู lib/clinical/human-review-queue.ts) แต่จุดนี้ไม่ได้ตามไป
      // เติม await — เดิมเรียก .filter() บน Promise ตรงๆ ซึ่ง throw runtime error
      // ทุกครั้งที่ endpoint นี้ถูกเรียก (Promise ไม่มี .filter) แก้แล้วที่นี่
      getReviewQueue(),
    ]);

    // audited temporary-decrypt zone — แพทย์คนไหน เปิดดูผู้ป่วยคนไหน เมื่อไหร่
    logEvent("clinical_data_decrypted", "clinical-summary", correlationId, {
      patientId,
      reviewedBy: session.sub,
      role: session.role,
      messageCount: conversationHistory.length,
    });

    const reviewFlagCount = reviewQueue.filter((q) => q.patientId === patientId).length;
    // แยกจาก nineQHistory/eightQHistory เต็มก้อนที่ส่งให้ AI ด้านล่าง — ส่งกลับ
    // เฉพาะ {authored, totalScore} ให้ dashboard.tsx พล็อต trend chart ได้ตรงๆ
    // ไม่ต้องส่ง item รายข้อ (เนื้อหาคำตอบละเอียด) ออกไปโดยไม่จำเป็น
    const nineQScores = nineQHistory.map((r) => ({ authored: r.authored, totalScore: r.totalScore }));
    const eightQScores = eightQHistory.map((r) => ({ authored: r.authored, totalScore: r.totalScore }));

    const result = await generateClinicalSummary({
      patientId,
      conversationHistory,
      nineQHistory: nineQScores,
      eightQHistory: eightQScores,
      reviewFlagCount,
    });
    return res.status(200).json({
      success: true,
      data: { ...result, nineQScores, eightQScores },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Clinical summary generation failed",
      ...(process.env.NODE_ENV === "development"
        ? { detail: err instanceof Error ? err.message : "" }
        : {}),
    });
  }
}
