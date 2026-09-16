// Policy types — ใช้แค่ 2 จุดที่ตกลงกันไว้ใน PRODUCTION_ROADMAP.md (ส่วนขยาย v2.0):
// 1. severity tier ของ human review queue notification (Phase 4, ยังไม่ implement)
// 2. อนุมัติ defense proposal จาก Immune system (Phase 4, ยังไม่ implement)
//
// ห้ามใช้ query ต่อข้อความแชทเด็ดขาด — จะกลายเป็น blocking stage ที่ตกลงกันแล้ว
// ว่าไม่ทำ ยังไม่มี policy engine จริงที่ใช้ type พวกนี้ตอนนี้ — ประกาศไว้ก่อน
// เพื่อให้ audit-log.ts และโมดูลอนาคตอ้างอิงได้แบบ type-safe ตั้งแต่ต้น

export type ReviewSeverity = "low" | "medium" | "high" | "critical";

export interface PolicyDecision {
  severity: ReviewSeverity;
  notifyImmediately: boolean; // true = high/critical ควร push แทนรอ queue ปกติ
  reason: string;
}
