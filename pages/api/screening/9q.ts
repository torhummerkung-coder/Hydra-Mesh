import { createHash } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { buildNineQResponse, scoreNineQ, NINE_Q_REQUIRES_8Q_THRESHOLD } from "../../../lib/clinical/screening-9q";
import { persistOrQueue } from "../../../lib/fallback/delivery";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.role !== "patient") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { answers, messageId: suppliedId, accountScope } = (req.body ?? {}) as { answers?: number[]; messageId?: unknown; accountScope?: unknown };
  if (suppliedId !== undefined && (typeof suppliedId !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(suppliedId))) return res.status(400).json({ success: false, error: "Invalid messageId" });
  if (accountScope !== undefined && accountScope !== createHash("sha256").update(`hydra-browser:${session.sub}`).digest("hex")) return res.status(409).json({ success: false, error: "account_changed" });
  const messageId = typeof suppliedId === "string" ? suppliedId : crypto.randomUUID();
  if (!Array.isArray(answers) || answers.length !== 9 || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) {
    return res.status(400).json({ success: false, error: "answers ต้องมี 9 ข้อ ค่า 0-3" });
  }

  try {
    const response = buildNineQResponse(session.sub, answers);
    const { item9Flag, requiresPsychiatristReferral } = scoreNineQ(answers);

    const persistenceState = await persistOrQueue({ kind: 'screening', patientId: session.sub, messageId, response });

    return res.status(200).json({
      success: true,
      data: {
        response,
        persistenceState,
        requires8Q: response.totalScore >= NINE_Q_REQUIRES_8Q_THRESHOLD,
        item9Flag, // ข้อ 9 ผูกกับความเสี่ยงทำร้ายตนเองโดยตรง — เดิมคำนวณในเอนจิ้นแล้วแต่ API ไม่ส่งออก
        // v2: คะแนนรวม >= 13 ให้พิจารณาส่งพบจิตแพทย์ (verified จากต้นฉบับรอบนี้ —
        // คนละเกณฑ์กับ requires8Q ด้านบน ไม่ใช่ urgent เท่า 8Q แต่ก็ควรแจ้งผู้ป่วย/
        // แสดงในระบบให้แพทย์เห็น ไม่ใช่แค่คำนวณเงียบๆ ในเอนจิ้นแล้วไม่ส่งออกมาเลย)
        requiresPsychiatristReferral,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "Scoring failed",
    });
  }
}
