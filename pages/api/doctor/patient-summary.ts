import { withDeadline } from "../../../lib/fallback/deadline";
import type { NextApiRequest, NextApiResponse } from "next";
import { generateClinicalSummary } from "../../../lib/agents/clinical-summary-agent";
import {
  hasActiveCareAssignment,
  hasClinicalCapability,
  hasCurrentClinicalCapability,
} from "../../../lib/auth/clinical-authorization";
import { getConversationHistory } from "../../../lib/clinical/conversation-store";
import { getScreeningHistory } from "../../../lib/clinical/screening-store";
import { getReviewQueue } from "../../../lib/clinical/human-review-queue";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";
import { logEvent } from "../../../lib/audit/audit-log";
import { callWithCircuitBreaker } from "../../../lib/security/circuit-breaker";
const CLINICAL_DATA_READ_DEADLINE_MS = 15_000;

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
// Phase 1 access boundary: role/capability เพียงอย่างเดียวไม่พอ ต้องมี CareAssignment
// ที่ active และยังไม่หมดอายุก่อนแตะ temporary-decrypt zone ทุกครั้ง

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
  if (!hasClinicalCapability(session, "patient.read.assigned"))
    return res.status(403).json({ success: false, error: "Forbidden" });

  const { patientId } = req.body as { patientId?: string };
  if (!patientId || typeof patientId !== "string") {
    return res.status(400).json({ success: false, error: "patientId is required" });
  }

  const correlationId = crypto.randomUUID();

  try {
    if (!(await withDeadline(hasCurrentClinicalCapability(session, "patient.read.assigned")))) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const assigned = await withDeadline(hasActiveCareAssignment(session.sub, patientId));
    if (!assigned) {
      logEvent("clinical_access_denied", "clinical-access", correlationId, {
        patientId,
        requestedBy: session.sub,
        role: session.role,
        reason: "no_active_assignment",
      });
      // ไม่แยกว่า patient มีจริงหรือไม่ เพื่อลดการไล่เดา patientId
      return res.status(404).json({ success: false, error: "Patient not found" });
    }
  } catch {
    // ระบบยืนยันสิทธิ์ไม่ได้ต้อง fail closed ห้าม decrypt ต่อ
    return res.status(503).json({ success: false, error: "Authorization unavailable" });
  }

  try {
    const [conversationHistory, nineQHistory, eightQHistory, reviewQueue] = await Promise.all([
      withDeadline(
            getConversationHistory(patientId),
                CLINICAL_DATA_READ_DEADLINE_MS
                  ),
                    withDeadline(
                        getScreeningHistory(patientId, "9Q"),
                            CLINICAL_DATA_READ_DEADLINE_MS
                              ),
                                withDeadline(
                                    getScreeningHistory(patientId, "8Q"),
                                        CLINICAL_DATA_READ_DEADLINE_MS
                                          ),
      // แก้ bug เดิม: getReviewQueue() เปลี่ยนเป็น async ตอนย้ายจาก in-memory ไป
      // Prisma แล้ว (ดู lib/clinical/human-review-queue.ts) แต่จุดนี้ไม่ได้ตามไป
      // เติม await — เดิมเรียก .filter() บน Promise ตรงๆ ซึ่ง throw runtime error
      // ทุกครั้งที่ endpoint นี้ถูกเรียก (Promise ไม่มี .filter) แก้แล้วที่นี่
    withDeadline(
          getReviewQueue([patientId]),
              CLINICAL_DATA_READ_DEADLINE_MS
                ),
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

    const result = await callWithCircuitBreaker("clinical-summary", correlationId, () =>
      generateClinicalSummary({
        patientId,
        conversationHistory,
        nineQHistory: nineQScores,
        eightQHistory: eightQScores,
        reviewFlagCount,
      })
    ).then(result => ({ ...result, summaryStatus: 'available' as const }))
      .catch(() => ({ summary: 'AI summary unavailable — ใช้ข้อมูลต้นทางประกอบการพิจารณา', generatedAt: new Date().toISOString(), disclaimer: 'ไม่มีผลสรุปจาก AI ในครั้งนี้ ข้อมูลด้านล่างเป็นข้อมูลต้นทาง', summaryStatus: 'unavailable' as const }));
    return res.status(200).json({
      success: true,
      data: { ...result, nineQScores, eightQScores, ...(result.summaryStatus === 'unavailable' ? { sourceMessages: conversationHistory.slice(-30) } : {}) },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Clinical summary generation failed",

    });
  }
}
