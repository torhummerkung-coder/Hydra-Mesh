// Policy engine — scope แคบมากตามที่ตกลงไว้ใน PRODUCTION_ROADMAP.md (ส่วนขยาย v2.0):
// ใช้แค่กำหนด severity tier ของ human review queue notification เท่านั้น
// (จุดที่สอง — อนุมัติ defense proposal จาก Immune System — ยังทำไม่ได้เพราะ
// Immune System เองยังไม่มี ตัดออกจาก scope รอบนี้)
//
// เรียกจาก lib/clinical/human-review-queue.ts เท่านั้น — เป็น "หลังจาก" Orchestrator
// ตัดสินใจ decision:"review" (หรือ 8Q ถึงเกณฑ์ urgent) แล้ว ไม่ใช่ก่อน Companion
// จะตอบผู้ป่วย ไม่มีทางเรียกจากจุดไหนที่กระทบเวลาที่ผู้ป่วยได้รับคำตอบเลย —
// ห้ามเปลี่ยนให้กลายเป็น per-message gate เด็ดขาด

import type { ReviewSeverity, PolicyDecision } from "../types/policy";

export function decideReviewSeverity(riskLevel: string): PolicyDecision {
  let severity: ReviewSeverity;
  if (riskLevel === "critical") severity = "critical";
  else if (riskLevel === "high") severity = "high";
  else if (riskLevel === "moderate") severity = "medium";
  else severity = "low"; // "none" | "low" | ค่าอื่นที่ไม่รู้จัก — default ปลอดภัยไว้ก่อน

  return {
    severity,
    notifyImmediately: severity === "high" || severity === "critical",
    reason: `riskLevel="${riskLevel}" → severity="${severity}"`,
  };
}
