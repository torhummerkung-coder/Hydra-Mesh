import { createHash } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildEightQResponse,
  EIGHT_Q_URGENT_REFERRAL_THRESHOLD,
  type EightQAnswers,
} from "../../../lib/clinical/screening-8q";
import { requestEscalation, persistOrQueue } from "../../../lib/fallback/delivery";
import { escalationNotice, type EscalationState } from "../../../lib/fallback/composer";

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

  const { answers, messageId: suppliedId, accountScope } = (req.body ?? {}) as { answers?: unknown; messageId?: unknown; accountScope?: unknown };
  if (suppliedId !== undefined && (typeof suppliedId !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(suppliedId))) return res.status(400).json({ success: false, error: "Invalid messageId" });
  if (accountScope !== undefined && accountScope !== createHash("sha256").update(`hydra-browser:${session.sub}`).digest("hex")) return res.status(409).json({ success: false, error: "account_changed" });
  const messageId = typeof suppliedId === "string" ? suppliedId : crypto.randomUUID();
  if (!isValidAnswers(answers)) {
    return res.status(400).json({
      success: false,
      error: "answers ไม่ถูกต้อง — แต่ละข้อต้องเป็น 0 หรือ 1, ต้องมี item3Control ถ้า item3 = 1",
    });
  }

  try {
    const response = buildEightQResponse(session.sub, answers);

    // Signal action is independent of the total score. Past-month answers do
    // not assert present imminent danger; UI asks about current safety.
    const safetyAction = answers.item3 === 1 || answers.item4 === 1 || answers.item5 === 1 || answers.item7 === 1;
    let escalationStatus: EscalationState = 'not_required';
    if (response.totalScore >= EIGHT_Q_URGENT_REFERRAL_THRESHOLD || safetyAction) {
      escalationStatus = await requestEscalation({ kind: 'review', patientId: session.sub, messageId,
        source: 'screening_8q', reason: '8Q safety review: score threshold or explicit answer signal',
        riskLevel: response.totalScore >= EIGHT_Q_URGENT_REFERRAL_THRESHOLD ? 'critical' : 'high' });
    }
    const persistenceState = await persistOrQueue({ kind: 'screening', patientId: session.sub, messageId, response });
    return res.status(200).json({ success: true, data: { response, safetyAction, escalationStatus, persistenceState, statusNotice: escalationNotice(escalationStatus) } });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "Scoring failed",
    });
  }
}
