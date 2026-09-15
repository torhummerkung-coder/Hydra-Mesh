import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildEightQResponse,
  EIGHT_Q_URGENT_REFERRAL_THRESHOLD,
  type EightQAnswers,
} from "../../../lib/clinical/screening-8q";
import { flagForHumanReview } from "../../../lib/clinical/human-review-queue";
import { saveScreeningResponse } from "../../../lib/clinical/screening-store";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

function isValidAnswers(a: unknown): a is EightQAnswers {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  const bin = (v: unknown) => v === 0 || v === 1;
  const required = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8"];
  if (!required.every((k) => bin(o[k]))) return false;
  // item3Control จำเป็นก็ต่อเมื่อ item3 === 1 เท่านั้น
  if (o.item3 === 1 && !bin(o.item3Control)) return false;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.role !== "patient") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { answers } = req.body as { answers?: unknown };
  if (!isValidAnswers(answers)) {
    return res.status(400).json({
      success: false,
      error: "answers ไม่ถูกต้อง — แต่ละข้อต้องเป็น 0 หรือ 1, ต้องมี item3Control ถ้า item3 = 1",
    });
  }

  try {
    const response = buildEightQResponse(session.sub, answers);

    // v2 Phase 1: บันทึกผลแบบเข้ารหัสเสมอ (envelope encryption ผ่าน
    // screening-store.ts) รันคู่กับการ flag review ด้านล่างแทนที่จะรอตามลำดับ —
    // ไม่ throw ต่อถ้าพัง เพราะคะแนน 8Q ยังต้องส่งกลับให้ผู้ป่วยเห็นตามปกติ ไม่ว่า
    // การบันทึกประวัติจะสำเร็จหรือไม่ (ต่างจาก flagForHumanReview ที่เป็น safety gap)
    const persistPromise = saveScreeningResponse(session.sub, response).catch((err) => {
      console.error("[screening/8q] failed to persist encrypted response (non-fatal):", err);
    });

    if (response.totalScore >= EIGHT_Q_URGENT_REFERRAL_THRESHOLD) {
      // เกณฑ์ยืนยันแล้ว: >= 17 = ส่งต่อด่วน (แก้จาก > เป็น >= ตามต้นฉบับ)
      //
      // v2 Phase 1: await จริง (DB write) — ต้องรับประกันว่าเขียนสำเร็จก่อนตอบกลับ
      // ด้วยเหตุผลเดียวกับ chat.ts — ไม่ throw ต่อถ้าพัง เพราะคะแนน 8Q ยังต้อง
      // ส่งกลับให้ผู้ป่วยเห็นตามปกติ
      try {
        await flagForHumanReview({
          patientId: session.sub,
          source: "screening_8q",
          reason: `8Q score ${response.totalScore} ถึงเกณฑ์ ${EIGHT_Q_URGENT_REFERRAL_THRESHOLD} — ส่งต่อด่วนตามเกณฑ์กรมสุขภาพจิต`,
          riskLevel: "critical",
        });
      } catch (err) {
        console.error("[screening/8q] SAFETY: flagForHumanReview failed —", err);
      }
    }

    await persistPromise;

    return res.status(200).json({ success: true, data: { response } });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "Scoring failed",
    });
  }
}
