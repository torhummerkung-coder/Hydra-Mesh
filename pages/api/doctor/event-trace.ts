import type { NextApiRequest, NextApiResponse } from "next";
import { getRecentTraces } from "../../../lib/audit/audit-log";
import { buildEventChain } from "../../../lib/audit/event-chain";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

// GET /api/doctor/event-trace          → list ล่าสุด (TraceSummary[])
// GET /api/doctor/event-trace?correlationId=xxx → full chain ของ trace นั้น
//
// ข้อมูลตรงนี้มาจาก in-memory audit log (lib/audit/audit-log.ts) เหมือน
// human-review-queue.ts และ system-health.ts — หายเมื่อ restart server,
// ย้ายไป persistent store ใน Phase 2 เดียวกับของสองไฟล์นั้น

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  // security team เห็น trace ได้ด้วย — ใช้สืบสวนเคสในคิวของตัวเอง (correlationId
  // เดียวกับที่ SecurityReviewItem เก็บไว้) ข้อมูล trace เป็น pipeline reasoning
  // ล้วนๆ ไม่ใช่ข้อมูลคลินิกของผู้ป่วย จึงแชร์ endpoint เดียวกับแพทย์ได้โดยไม่ขัด
  // หลัก least privilege ที่ตั้งไว้ตอนแยกคิว security ออกจาก human-review-queue.ts
  if (!session || !["doctor", "staff", "security"].includes(session.role)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { correlationId } = req.query as { correlationId?: string };

  if (correlationId) {
    const chain = buildEventChain(correlationId);
    if (!chain) return res.status(404).json({ success: false, error: "ไม่พบ trace นี้" });
    return res.status(200).json({ success: true, data: chain });
  }

  return res.status(200).json({ success: true, data: getRecentTraces() });
}
