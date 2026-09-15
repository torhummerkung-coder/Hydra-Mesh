import type { NextApiRequest, NextApiResponse } from "next";
import { buildNineQResponse, scoreNineQ, NINE_Q_REQUIRES_8Q_THRESHOLD } from "../../../lib/clinical/screening-9q";
import { saveScreeningResponse } from "../../../lib/clinical/screening-store";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.role !== "patient") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { answers } = req.body as { answers?: number[] };
  if (!Array.isArray(answers) || answers.length !== 9 || answers.some((a) => a < 0 || a > 3)) {
    return res.status(400).json({ success: false, error: "answers ต้องมี 9 ข้อ ค่า 0-3" });
  }

  try {
    const response = buildNineQResponse(session.sub, answers);
    const { item9Flag } = scoreNineQ(answers);

    // v2 Phase 1: บันทึกผลแบบเข้ารหัสเสมอ (envelope encryption ผ่าน
    // screening-store.ts) — ไม่ throw ต่อถ้าพัง เพราะคะแนน 9Q ยังต้องส่งกลับให้
    // ผู้ป่วยเห็นตามปกติ ไม่ว่าการบันทึกประวัติจะสำเร็จหรือไม่ (9Q ไม่มี urgent
    // referral gate แบบ 8Q เลยไม่มี DB write ไหนที่ "ต้องรอ" ก่อนตอบกลับ)
    try {
      await saveScreeningResponse(session.sub, response);
    } catch (err) {
      console.error("[screening/9q] failed to persist encrypted response (non-fatal):", err);
    }

    return res.status(200).json({
      success: true,
      data: {
        response,
        requires8Q: response.totalScore >= NINE_Q_REQUIRES_8Q_THRESHOLD,
        item9Flag, // ข้อ 9 ผูกกับความเสี่ยงทำร้ายตนเองโดยตรง — เดิมคำนวณในเอนจิ้นแล้วแต่ API ไม่ส่งออก
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "Scoring failed",
    });
  }
}
